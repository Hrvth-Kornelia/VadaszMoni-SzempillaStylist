const { randomUUID } = require("node:crypto");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();

const SITE_URL = "https://hrvth-kornelia.github.io/VadaszMoni-SzempillaStylist/";
const PUSH_TITLE = "Luxória – Vadász Mónika";
const PUSH_BODY = "Holnap időpontod van! Kérjük, jelezd vissza, hogy érkezel-e.";
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;
const PUSH_TTL_SECONDS = 30 * 60 * 60;

/* ========================================
   MAGYAR DÁTUM ÉS IDŐ
======================================== */

function getBudapestParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  return Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );
}

function getTomorrowInBudapest() {
  const values = getBudapestParts();

  const tomorrow = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day) + 1
  ));

  return tomorrow.toISOString().slice(0, 10);
}

function isAfterSixInBudapest() {
  const values = getBudapestParts();
  return Number(values.hour) >= 18;
}

/* ========================================
   ADATELLENŐRZÉS
======================================== */

function validAppointmentId(value) {
  return typeof value === "string" &&
    /^[A-Za-z0-9]{20}$/.test(value);
}

function validPushToken(value) {
  return typeof value === "string" &&
    value.length >= 20 &&
    value.length <= 4096;
}

function validAppointmentIds(value) {
  return Array.isArray(value) &&
    value.length <= 10 &&
    value.every(validAppointmentId) &&
    new Set(value).size === value.length;
}

/* ========================================
   AKTÍV PUSH-FELIRATKOZÁS
======================================== */

async function isActiveSubscriber(token) {
  const snapshot = await db
    .collection("pushSubscribers")
    .doc(encodeURIComponent(token))
    .get();

  return snapshot.exists &&
    snapshot.data()?.active === true &&
    snapshot.data()?.token === token;
}

/* ========================================
   EMLÉKEZTETŐ ZÁROLÁSA
======================================== */

async function claimReminder(appointmentRef, date, token) {
  const claimId = randomUUID();
  const now = Date.now();

  const claimed = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(appointmentRef);

    if (!snapshot.exists) return false;

    const appointment = snapshot.data();

    if (
      appointment.date !== date ||
      appointment.reminderSent === true ||
      appointment.pushToken !== token ||
      appointment.status !== "pending"
    ) {
      return false;
    }

    const previousClaimAt = Number(
      appointment.reminderProcessingAt || 0
    );

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

/* ========================================
   KÜLDÉS LEZÁRÁSA
======================================== */

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

/* ========================================
   KÖZÖS EMLÉKEZTETŐ-KÜLDÉS
======================================== */

async function sendReminder(appointmentRef, date, token) {
  if (!validPushToken(token)) return "skipped";

  const active = await isActiveSubscriber(token);
  if (!active) return "skipped";

  const claimId = await claimReminder(
    appointmentRef,
    date,
    token
  );

  if (!claimId) return "skipped";

  try {
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
        headers: {
          TTL: String(PUSH_TTL_SECONDS)
        },

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

    await finishReminder(appointmentRef, claimId);
    return "sent";

  } catch (error) {
    try {
      await releaseReminder(appointmentRef, claimId);
    } catch (releaseError) {
      console.error("Zárolás feloldási hiba:", releaseError);
    }

    throw error;
  }
}

/* ========================================
   NAPI AUTOMATIKUS KÜLDÉS
======================================== */

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
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date !== getTomorrowInBudapest()
    ) {
      res.status(400).json({
        error: "Csak a holnapi dátum engedélyezett."
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

        if (
          appointment.reminderSent === true ||
          appointment.status !== "pending"
        ) {
          skippedCount++;
          continue;
        }

        const token = typeof appointment.pushToken === "string"
          ? appointment.pushToken.trim()
          : "";

        try {
          const result = await sendReminder(
            appointmentDoc.ref,
            date,
            token
          );

          if (result === "sent") sentCount++;
          else skippedCount++;

        } catch (error) {
          failedCount++;

          console.error("Emlékeztető küldési hiba:", {
            appointmentId: appointmentDoc.id,
            code: error.code || "unknown"
          });
        }
      }

      console.log("Luxória napi emlékeztető:", {
        date,
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
      console.error("Időpontlekérdezési hiba:", error);

      res.status(500).json({
        error: "Az emlékeztetők feldolgozása sikertelen."
      });
    }
  }
);

/* ========================================
   PÓTLÁS 18:00 UTÁNI BEKAPCSOLÁSKOR
======================================== */

exports.sendLateAppointmentReminder = onCall(
  {
    region: "us-central1",
    maxInstances: 1
  },
  async request => {
    const appointmentIds = request.data?.appointmentIds;
    const pushToken = request.data?.pushToken;

    if (
      !validAppointmentIds(appointmentIds) ||
      !validPushToken(pushToken)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Érvénytelen emlékeztetőadatok."
      );
    }

    if (!isAfterSixInBudapest() || appointmentIds.length === 0) {
      return {
        success: true,
        sent: 0
      };
    }

    const active = await isActiveSubscriber(pushToken);

    if (!active) {
      return {
        success: true,
        sent: 0
      };
    }

    const tomorrow = getTomorrowInBudapest();
    let sent = 0;

    for (const appointmentId of appointmentIds) {
      const appointmentRef = db
        .collection("appointments")
        .doc(appointmentId);

      try {
        const result = await sendReminder(
          appointmentRef,
          tomorrow,
          pushToken
        );

        if (result === "sent") sent++;

      } catch (error) {
        console.error("Késői emlékeztető hiba:", {
          appointmentId,
          code: error.code || "unknown"
        });
      }
    }

    return {
      success: true,
      sent
    };
  }
);