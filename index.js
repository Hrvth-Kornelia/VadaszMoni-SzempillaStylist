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
   KÖZÖS BEÁLLÍTÁSOK
===================================================== */

const SITE_URL =
  "https://hrvth-kornelia.github.io/VadaszMoni-SzempillaStylist/";

const PUSH_ICON =
  `${SITE_URL}icon.512.jfif`;

const PUSH_BADGE =
  `${SITE_URL}192favicon.jfif`;


/* =====================================================
   FELSZABADULT IDŐPONT PUSH BEÁLLÍTÁSOK
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
   FELSZABADULT IDŐPONT PUSH KÜLDÉSE
===================================================== */

exports.sendAvailableAppointmentPush =
  onCall(async (request) => {

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
                  SITE_URL

              },

              webpush: {

                notification: {

                  title:
                    PUSH_TITLE,

                  body:
                    PUSH_BODY,

                  icon:
                    PUSH_ICON,

                  badge:
                    PUSH_BADGE

                },

                fcmOptions: {

                  link:
                    SITE_URL

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


/* =====================================================
   TÁVOLLÉT PUSH BEÁLLÍTÁSOK
===================================================== */

const TAVOLLET_HAVI_LIMIT = 2;

const TAVOLLET_PUSH_TITLE =
  "Luxória Beauty Art";


/* =====================================================
   TÁVOLLÉT PUSH HAVI FELHASZNÁLÁS
===================================================== */

exports.getAbsencePushUsage =
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
        .collection(
          "absencePushMonthlyLimits"
        )
        .doc(
          `${uid}_${monthKey}`
        );

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
            TAVOLLET_HAVI_LIMIT - used,
            0
          ),

        limit:
          TAVOLLET_HAVI_LIMIT,

        month:
          monthKey

      };

    } catch (error) {

      console.error(
        "Távollét push felhasználás lekérési hiba:",
        error
      );

      throw new HttpsError(
        "internal",
        "Nem sikerült lekérni a havi távollét push felhasználást."
      );

    }

  });


/* =====================================================
   TÁVOLLÉT PUSH KÜLDÉSE
===================================================== */

exports.sendAbsencePush =
  onCall(async (request) => {

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

    const okNev =
      String(
        request.data?.okNev ||
        "Távollét"
      ).trim();

    const kezdoNap =
      String(
        request.data?.kezdoNap ||
        ""
      ).trim();

    const utolsoNap =
      String(
        request.data?.utolsoNap ||
        ""
      ).trim();

    const uzenet =
      String(
        request.data?.uzenet ||
        ""
      ).trim();


    if (
      !kezdoNap ||
      !utolsoNap
    ) {

      throw new HttpsError(
        "invalid-argument",
        "Hiányzik a távollét dátuma."
      );

    }


    let pushBody =
      `${okNev}: ${kezdoNap} – ${utolsoNap}.`;


    if (uzenet) {

      pushBody +=
        `${uzenet}`;

    } else {

      pushBody +=
        " Nézd meg a részleteket.";

    }


    if (
      pushBody.length > 180
    ) {

      pushBody =
        pushBody.substring(
          0,
          177
        ) + "...";

    }


    const counterRef =
      db
        .collection(
          "absencePushMonthlyLimits"
        )
        .doc(
          `${uid}_${monthKey}`
        );

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
          currentCount >=
          TAVOLLET_HAVI_LIMIT
        ) {

          throw new HttpsError(
            "resource-exhausted",
            `Elérted a havi ${TAVOLLET_HAVI_LIMIT} távollét értesítési limitet.`
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
              TAVOLLET_HAVI_LIMIT,

            updatedAt:
              FieldValue.serverTimestamp()

          },
          {
            merge: true
          }
        );

      }
    );


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
            TAVOLLET_HAVI_LIMIT -
            (newCount - 1),

          limit:
            TAVOLLET_HAVI_LIMIT,

          month:
            monthKey,

          message:
            "Nincs aktív értesítési feliratkozó."

        };

      }


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
                  TAVOLLET_PUSH_TITLE,

                body:
                  pushBody

              },

              data: {

                title:
                  TAVOLLET_PUSH_TITLE,

                body:
                  pushBody,

                url:
                  SITE_URL

              },

              webpush: {

                notification: {

                  title:
                    TAVOLLET_PUSH_TITLE,

                  body:
                    pushBody,

                  icon:
                    PUSH_ICON,

                  badge:
                    PUSH_BADGE

                },

                fcmOptions: {

                  link:
                    SITE_URL

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


      return {

        success: true,

        sent:
          successCount,

        failed:
          failureCount,

        used:
          newCount,

        remaining:
          TAVOLLET_HAVI_LIMIT -
          newCount,

        limit:
          TAVOLLET_HAVI_LIMIT,

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
        "Távollét push küldési hiba:",
        error
      );

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
          "Távollét számláló visszaállítási hiba:",
          rollbackError
        );

      }

      throw new HttpsError(
        "internal",
        "Nem sikerült elküldeni a távollét push értesítést."
      );

    }

  });