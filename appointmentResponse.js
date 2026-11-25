const {
  onCall,
  HttpsError
} = require("firebase-functions/v2/https");

const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

const db = getFirestore();

/* ========================================
   HOLNAPI DÁTUM – MAGYAR IDŐ SZERINT
======================================== */

function getTomorrowInBudapest() {
  const parts = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Europe/Budapest",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).formatToParts(new Date());

  const year = Number(
    parts.find(part => part.type === "year").value
  );

  const month = Number(
    parts.find(part => part.type === "month").value
  );

  const day = Number(
    parts.find(part => part.type === "day").value
  );

  const tomorrow = new Date(
    Date.UTC(year, month - 1, day + 1)
  );

  return tomorrow.toISOString().slice(0, 10);
}

/* ========================================
   ADATELLENŐRZÉS
======================================== */

function validAppointmentId(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9]{20}$/.test(value)
  );
}

function validPushToken(value) {
  return (
    typeof value === "string" &&
    value.length >= 20 &&
    value.length <= 4096
  );
}

function validAppointmentIds(value) {
  return (
    Array.isArray(value) &&
    value.length <= 10 &&
    value.every(validAppointmentId) &&
    new Set(value).size === value.length
  );
}

/* ========================================
   EMLÉKEZTETŐ ELLENŐRZÉSE
======================================== */

exports.checkAppointmentReminder = onCall(
  {
    region: "us-central1",
    maxInstances: 1
  },
  async (request) => {
    const appointmentIds =
      request.data?.appointmentIds;

    const pushToken =
      request.data?.pushToken;

    if (
      !validAppointmentIds(appointmentIds) ||
      !validPushToken(pushToken)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Érvénytelen emlékeztető-ellenőrzési adatok."
      );
    }

    if (appointmentIds.length === 0) {
      return {
        success: true,
        reminderAppointmentIds: []
      };
    }

    const tomorrow = getTomorrowInBudapest();

    try {
      const references = appointmentIds.map(
        id => db.collection("appointments").doc(id)
      );

      const snapshots = await db.getAll(...references);

      const reminderAppointmentIds = [];

      for (const snapshot of snapshots) {
        if (!snapshot.exists) continue;

        const appointment = snapshot.data();

        if (
          appointment.pushToken === pushToken &&
          appointment.date === tomorrow &&
          appointment.reminderSent === true &&
          appointment.status === "pending"
        ) {
          reminderAppointmentIds.push(snapshot.id);
        }
      }

      return {
        success: true,
        reminderAppointmentIds
      };
    } catch (error) {
      console.error("Emlékeztető ellenőrzési hiba:", error);

      throw new HttpsError(
        "internal",
        "Nem sikerült ellenőrizni az emlékeztetőt."
      );
    }
  }
);

/* ========================================
   VENDÉG VISSZAJELZÉSE
======================================== */

exports.appointmentResponse = onCall(
  {
    region: "us-central1",
    maxInstances: 1
  },
  async (request) => {
    const appointmentId =
      request.data?.appointmentId;

    const pushToken =
      request.data?.pushToken;

    const response =
      request.data?.response;

    if (
      !validAppointmentId(appointmentId) ||
      !validPushToken(pushToken) ||
      !["confirmed", "declined"].includes(response)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Érvénytelen visszajelzés."
      );
    }

    const appointmentRef = db
      .collection("appointments")
      .doc(appointmentId);

    const tomorrow = getTomorrowInBudapest();

    try {
      return await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(appointmentRef);

        if (!snapshot.exists) {
          throw new HttpsError(
            "not-found",
            "Az időpont nem található."
          );
        }

        const appointment = snapshot.data();

        if (
          appointment.pushToken !== pushToken
        ) {
          throw new HttpsError(
            "permission-denied",
            "Erről a készülékről nem igazolható az időpont."
          );
        }

        if (
          appointment.date !== tomorrow ||
          appointment.reminderSent !== true
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Ehhez az időponthoz még nem válaszolhatsz."
          );
        }

        if (
          appointment.status === "confirmed" ||
          appointment.status === "declined"
        ) {
          return {
            success: true,
            status: appointment.status,
            alreadyAnswered: true
          };
        }

        if (appointment.status !== "pending") {
          throw new HttpsError(
            "failed-precondition",
            "Ez az időpont már nem vár visszajelzésre."
          );
        }

        transaction.update(appointmentRef, {
          status: response,
          respondedAt: FieldValue.serverTimestamp()
        });

        return {
          success: true,
          status: response,
          alreadyAnswered: false
        };
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      console.error("Visszajelzés mentési hiba:", error);

      throw new HttpsError(
        "internal",
        "Nem sikerült elmenteni a visszajelzést."
      );
    }
  }
);

/* ========================================
   PUSH-TOKEN FRISSÍTÉSE
   A TELEFONON MENTETT IDŐPONTOKHOZ
======================================== */

exports.updateAppointmentToken = onCall(
  {
    region: "us-central1",
    maxInstances: 1
  },
  async (request) => {
    const appointmentIds =
      request.data?.appointmentIds;

    const oldToken =
      request.data?.oldToken;

    const newToken =
      request.data?.newToken;

    if (
      !validAppointmentIds(appointmentIds) ||
      !validPushToken(newToken) ||
      (
        oldToken != null &&
        !validPushToken(oldToken)
      )
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Érvénytelen tokenfrissítési adatok."
      );
    }

    if (appointmentIds.length === 0) {
      return {
        success: true,
        updated: 0
      };
    }

    let updated = 0;

    try {
      for (const appointmentId of appointmentIds) {
        const appointmentRef = db
          .collection("appointments")
          .doc(appointmentId);

        const changed = await db.runTransaction(
          async transaction => {
            const snapshot = await transaction.get(appointmentRef);

            if (!snapshot.exists) return false;

            const appointment = snapshot.data();

            if (
              appointment.reminderSent === true ||
              appointment.status !== "pending"
            ) {
              return false;
            }

            /*
             * Ha az időponthoz már tartozik token,
             * akkor annak egyeznie kell a régi tokennel.
             *
             * Token nélküli régi időpontot is
             * frissíthetünk, ha a készülék ismeri az ID-ját.
             */

            if (
              appointment.pushToken &&
              appointment.pushToken !== oldToken &&
              appointment.pushToken !== newToken
            ) {
              return false;
            }

            transaction.update(appointmentRef, {
              pushToken: newToken,
              tokenUpdatedAt: FieldValue.serverTimestamp()
            });

            return true;
          }
        );

        if (changed) updated++;
      }

      return {
        success: true,
        updated
      };
    } catch (error) {
      console.error("Push-token frissítési hiba:", error);

      throw new HttpsError(
        "internal",
        "Nem sikerült frissíteni az időpontok értesítési azonosítóját."
      );
    }
  }
);