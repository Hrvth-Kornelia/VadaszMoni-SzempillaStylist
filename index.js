const { setGlobalOptions } = require("firebase-functions/v2");

const {
  onCall,
  HttpsError
} = require("firebase-functions/v2/https");

const {
  initializeApp
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

const {
  getMessaging
} = require("firebase-admin/messaging");


/* =====================================================
   FIREBASE ADMIN INDÍTÁSA
===================================================== */

initializeApp();

const db = getFirestore();

setGlobalOptions({
  maxInstances: 10
});


/* =====================================================
   BEÁLLÍTÁSOK
===================================================== */

const HAVI_LIMIT = 25;

const PUSH_TITLE =
  "Luxória Beauty Art";

const PUSH_BODY =
  "Felszabadult egy időpont! Nézd meg az elérhető időpontokat.";


/* =====================================================
   AKTUÁLIS HÓNAP KULCSA
===================================================== */

function getCurrentMonthKey() {

  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  return `${year}-${month}`;
}


/* =====================================================
   HAVI PUSH FELHASZNÁLÁS LEKÉRÉSE

   Ezzel az adminoldal ki tudja írni:
   például 1 / 25
===================================================== */

exports.getPushUsage =
  onCall(async (request) => {

    if (!request.auth) {

      throw new HttpsError(
        "unauthenticated",
        "A havi push felhasználás megtekintéséhez be kell jelentkezni."
      );

    }


    const uid =
      request.auth.uid;

    const monthKey =
      getCurrentMonthKey();


    const counterRef =
      db
        .collection("pushMonthlyLimits")
        .doc(`${uid}_${monthKey}`);


    try {

      const snapshot =
        await counterRef.get();


      let used = 0;


      if (snapshot.exists) {

        const data =
          snapshot.data();

        used =
          Number(data.count) || 0;

      }


      if (used < 0) {
        used = 0;
      }


      return {

        success: true,

        used: used,

        remaining:
          Math.max(
            HAVI_LIMIT - used,
            0
          ),

        limit:
          HAVI_LIMIT,

        month:
          monthKey

      };


    } catch (error) {

      console.error(
        "Push felhasználás lekérési hiba:",
        error
      );


      throw new HttpsError(
        "internal",
        "Nem sikerült lekérni a havi push felhasználást."
      );

    }

  });


/* =====================================================
   PUSH ÉRTESÍTÉS KÜLDÉSE
===================================================== */

exports.sendAvailableAppointmentPush =
  onCall(async (request) => {

    /* -------------------------------------------------
       1. BEJELENTKEZÉS ELLENŐRZÉSE
    ------------------------------------------------- */

    if (!request.auth) {

      throw new HttpsError(
        "unauthenticated",
        "A push értesítés küldéséhez be kell jelentkezni."
      );

    }


    const uid =
      request.auth.uid;

    const monthKey =
      getCurrentMonthKey();


    const counterRef =
      db
        .collection("pushMonthlyLimits")
        .doc(`${uid}_${monthKey}`);


    /* -------------------------------------------------
       2. HAVI LIMIT ELLENŐRZÉSE ÉS LEFOGLALÁSA
    ------------------------------------------------- */

    let newCount = 0;


    await db.runTransaction(
      async (transaction) => {

        const snapshot =
          await transaction.get(
            counterRef
          );


        let currentCount = 0;


        if (snapshot.exists) {

          const data =
            snapshot.data();

          currentCount =
            Number(data.count) || 0;

        }


        if (
          currentCount >= HAVI_LIMIT
        ) {

          throw new HttpsError(
            "resource-exhausted",
            `Elérted a havi ${HAVI_LIMIT} értesítési limitet.`
          );

        }


        newCount =
          currentCount + 1;


        transaction.set(
          counterRef,
          {

            uid: uid,

            month:
              monthKey,

            count:
              newCount,

            limit:
              HAVI_LIMIT,

            updatedAt:
              FieldValue.serverTimestamp()

          },
          {
            merge: true
          }
        );

      }
    );


    /* -------------------------------------------------
       3. AKTÍV PUSH FELIRATKOZÓK LEKÉRÉSE
    ------------------------------------------------- */

    try {

      const subscribersSnapshot =
        await db
          .collection(
            "pushSubscribers"
          )
          .where(
            "active",
            "==",
            true
          )
          .get();


      const tokens = [];


      subscribersSnapshot.forEach(
        (document) => {

          const data =
            document.data();


          if (
            data.token &&
            typeof data.token === "string"
          ) {

            tokens.push(
              data.token
            );

          }

        }
      );


      /* -------------------------------------------------
         HA NINCS AKTÍV FELIRATKOZÓ
      ------------------------------------------------- */

      if (
        tokens.length === 0
      ) {

        await counterRef.set(
          {

            count:
              FieldValue.increment(-1),

            updatedAt:
              FieldValue.serverTimestamp()

          },
          {
            merge: true
          }
        );


        return {

          success: true,

          sent: 0,

          failed: 0,

          used:
            newCount - 1,

          remaining:
            HAVI_LIMIT -
            (newCount - 1),

          limit:
            HAVI_LIMIT,

          month:
            monthKey,

          message:
            "Nincs aktív értesítési feliratkozó."

        };

      }


      /* -------------------------------------------------
         4. PUSH KÜLDÉSE
      ------------------------------------------------- */

      const CHUNK_SIZE = 500;

      let successCount = 0;

      let failureCount = 0;

      const invalidTokens = [];


      for (
        let i = 0;
        i < tokens.length;
        i += CHUNK_SIZE
      ) {

        const tokenChunk =
          tokens.slice(
            i,
            i + CHUNK_SIZE
          );


        const response =
          await getMessaging()
            .sendEachForMulticast({

              tokens:
                tokenChunk,

              notification: {

                title:
                  PUSH_TITLE,

                body:
                  PUSH_BODY

              },

              data: {

                title:
                  PUSH_TITLE,

                body:
                  PUSH_BODY,

                url:
                  "/"

              },

              webpush: {

                fcmOptions: {

                  link:
                    "/"

                }

              }

            });


        successCount +=
          response.successCount;

        failureCount +=
          response.failureCount;


        response.responses.forEach(
          (result, index) => {

            if (
              result.success
            ) {

              return;

            }


            const errorCode =
              result.error?.code;


            if (
              errorCode ===
                "messaging/registration-token-not-registered" ||
              errorCode ===
                "messaging/invalid-registration-token"
            ) {

              invalidTokens.push(
                tokenChunk[index]
              );

            }

          }
        );

      }


      /* -------------------------------------------------
         5. ÉRVÉNYTELEN TOKENEK TÖRLÉSE
      ------------------------------------------------- */

      for (
        const invalidToken
        of invalidTokens
      ) {

        const documentId =
          encodeURIComponent(
            invalidToken
          );


        try {

          await db
            .collection(
              "pushSubscribers"
            )
            .doc(
              documentId
            )
            .delete();


        } catch (error) {

          console.error(
            "Érvénytelen token törlési hiba:",
            error
          );

        }

      }


      /* -------------------------------------------------
         6. HA EGYETLEN KÉSZÜLÉKRE SEM SIKERÜLT
      ------------------------------------------------- */

      if (
        successCount === 0
      ) {

        await counterRef.set(
          {

            count:
              FieldValue.increment(-1),

            updatedAt:
              FieldValue.serverTimestamp()

          },
          {
            merge: true
          }
        );


        throw new HttpsError(
          "internal",
          "Az értesítést egyik készülékre sem sikerült elküldeni."
        );

      }


      /* -------------------------------------------------
         7. SIKERES VÁLASZ
      ------------------------------------------------- */

      return {

        success: true,

        sent:
          successCount,

        failed:
          failureCount,

        used:
          newCount,

        remaining:
          HAVI_LIMIT - newCount,

        limit:
          HAVI_LIMIT,

        month:
          monthKey

      };


    } catch (error) {


      if (
        error instanceof HttpsError
      ) {

        throw error;

      }


      console.error(
        "Push küldési hiba:",
        error
      );


      /* -------------------------------------------------
         HIBA ESETÉN A LEFOGLALT KÜLDÉS VISSZAADÁSA
      ------------------------------------------------- */

      try {

        await counterRef.set(
          {

            count:
              FieldValue.increment(-1),

            updatedAt:
              FieldValue.serverTimestamp()

          },
          {
            merge: true
          }
        );


      } catch (rollbackError) {

        console.error(
          "Számláló visszaállítási hiba:",
          rollbackError
        );

      }


      throw new HttpsError(
        "internal",
        "Nem sikerült elküldeni a push értesítést."
      );

    }

  });