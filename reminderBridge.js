const { randomUUID } = require("node:crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();

const SITE_URL =
  "https://hrvth-kornelia.github.io/VadaszMoni-SzempillaStylist/";

const PUSH_TITLE = "Luxória – Vadász Mónika";

const PUSH_BODY =
  "Holnap időpontod van! Kérjük, jelezd vissza, hogy érkezel-e.";

const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

function getTomorrowInBudapest() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );

  const tomorrow = new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day) + 1
    )
  );

  return tomorrow.toISOString().slice(0, 10);
}

async function isActiveSubscriber(token) {
  const tokenDocumentId = encodeURIComponent(token);

  const tokenDocument = await db
    .collection("pushSubscribers")
    .doc(tokenDocumentId)
    .get();

  return (
    tokenDocument.exists &&
    tokenDocument.data()?.active === true &&
    tokenDocument.data()?.token === token
  );
}

async function claimReminder(appointmentRef, date, token) {
  const claimId = randomUUID();
  const now = Date.now();

  const claimed = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(appointmentRef);

    if (!snapshot.exists) {
      return false;
    }

    const appointment = snapshot.data();

    if (
      appointment.date !== date ||
      appointment.reminderSent === true ||
      appointment.pushToken !== token ||
      appointment.status !== "pending"
    ) {
      return false;
    }

    const previousClaimAt =
      Number(appointment.reminderProcessingAt || 0);

    if (
      appointment.reminderProcessingId &&
      now - previousClaimAt < PROCESSING_TIMEOUT_MS
    ) {
      return false;
    }

    transaction.update(appointmentRef, {
      reminderProcessingId: claimId,
      reminderProcessingAt: now
    });

    return true;
  });

  return claimed ? claimId : null;
}

async function finishReminder(appointmentRef, claimId) {
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(appointmentRef);

    if (
      !snapshot.exists ||
      snapshot.data()?.reminderProcessingId !== claimId
    ) {
      return;
    }

    transaction.update(appointmentRef, {
      reminderSent: true,
      reminderSentAt: new Date(),
      reminderProcessingId: null,
      reminderProcessingAt: null
    });
  });
}

async function releaseReminder(appointmentRef, claimId) {
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(appointmentRef);

    if (
      !snapshot.exists ||
      snapshot.data()?.reminderProcessingId !== claimId
    ) {
      return;
    }

    transaction.update(appointmentRef, {
      reminderProcessingId: null,
      reminderProcessingAt: null
    });
  });
}

exports.reminderBridge = onRequest(
  {
    region: "us-central1",
    invoker: "976115419862-compute@developer.gserviceaccount.com",
    maxInstances: 1,
    concurrency: 1,
    cors: false
  },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method not allowed");
      return;
    }

    const date = req.query.date;

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      res.status(400).json({
        error: "Érvénytelen dátum"
      });
      return;
    }

    if (date !== getTomorrowInBudapest()) {
      res.status(400).json({
        error: "Csak a holnapi időpontok dolgozhatók fel."
      });
      return;
    }

    try {
      const snapshot = await db
        .collection("appointments")
        .where("date", "==", date)
        .get();

      let sentCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (const appointmentDoc of snapshot.docs) {
        const appointment = appointmentDoc.data();

        const token =
          typeof appointment.pushToken === "string"
            ? appointment.pushToken.trim()
            : "";

        if (
          appointment.reminderSent === true ||
          appointment.status !== "pending" ||
          !token
        ) {
          skippedCount++;
          continue;
        }

        let claimId = null;

        try {
          const active = await isActiveSubscriber(token);

          if (!active) {
            skippedCount++;
            continue;
          }

          claimId = await claimReminder(
            appointmentDoc.ref,
            date,
            token
          );

          if (!claimId) {
            skippedCount++;
            continue;
          }

          await getMessaging().send({
            token,

            notification: {
              title: PUSH_TITLE,
              body: PUSH_BODY
            },

            data: {
              title: PUSH_TITLE,
              body: PUSH_BODY,
              url: SITE_URL + "vendeg-emlekeszteto.html"
            },

            webpush: {
              notification: {
                title: PUSH_TITLE,
                body: PUSH_BODY,
                icon: SITE_URL + "icon.512.jfif",
                badge: SITE_URL + "badge-96.png"
              },

              fcmOptions: {
                link: SITE_URL + "vendeg-emlekeszteto.html"
              }
            }
          });

          await finishReminder(
            appointmentDoc.ref,
            claimId
          );

          sentCount++;

        } catch (error) {
          failedCount++;

          console.error(
            "Személyes emlékeztető küldési hiba:",
            {
              appointmentId: appointmentDoc.id,
              code: error.code || "unknown"
            }
          );

          if (claimId) {
            try {
              await releaseReminder(
                appointmentDoc.ref,
                claimId
              );
            } catch (releaseError) {
              console.error(
                "Emlékeztető zárolásának feloldása sikertelen:",
                releaseError
              );
            }
          }
        }
      }

      console.log("Luxória napi emlékeztető eredmény:", {
        date,
        appointmentCount: snapshot.size,
        sentCount,
        skippedCount,
        failedCount
      });

      res.json({
        success: failedCount === 0,
        date,
        appointmentCount: snapshot.size,
        sentCount,
        skippedCount,
        failedCount
      });

    } catch (error) {
      console.error(
        "Időpontlekérdezési hiba:",
        error
      );

      res.status(500).json({
        error: "Az emlékeztetők feldolgozása sikertelen."
      });
    }
  }
);