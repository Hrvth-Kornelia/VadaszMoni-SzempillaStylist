/* ========================================
   FIREBASE IMPORTOK
======================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-functions.js";

/* ========================================
   FIREBASE BEÁLLÍTÁSOK
======================================== */

const firebaseConfig = {
  apiKey: "AIzaSyCsVHd8SfN0YzU3qB8dbOMQrdWBkZpLkjw",
  authDomain: "vadasz-monika-szempillastylist.firebaseapp.com",
  projectId: "vadasz-monika-szempillastylist",
  storageBucket: "vadasz-monika-szempillastylist.firebasestorage.app",
  messagingSenderId: "107835480232",
  appId: "1:107835480232:web:15ed130fd4c696d3b9ca9d",
  measurementId: "G-YYHW07BS7L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");

/* ========================================
   FIREBASE FÜGGVÉNYEK
======================================== */

const checkReminderFunction = httpsCallable(functions, "checkAppointmentReminder");
const responseFunction = httpsCallable(functions, "appointmentResponse");
const updateTokenFunction = httpsCallable(functions, "updateAppointmentToken");
const lateReminderFunction = httpsCallable(functions, "sendLateAppointmentReminder");

/* ========================================
   PWA MÓD
======================================== */

function isRunningAsPWA() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

const isPWA = isRunningAsPWA();

/* ========================================
   HTML ELEMEK
======================================== */

const form = document.getElementById("appointmentForm");
const guestName = document.getElementById("guestName");
const dateInput = document.getElementById("appointmentDate");
const timeInput = document.getElementById("appointmentTime");
const saveButton = document.getElementById("saveButton");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const appointmentList = document.getElementById("savedAppointmentsList");

const confirmationPanel = document.getElementById("appointmentConfirmationPanel");
const confirmArrivalButton = document.getElementById("confirmArrivalButton");
const declineArrivalButton = document.getElementById("declineArrivalButton");

/* ========================================
   PUSH TOKEN
======================================== */

function getActivePushToken() {
  if (localStorage.getItem("pushNotificationsEnabled") !== "true") {
    return null;
  }

  return localStorage.getItem("fcmToken") || null;
}

function getPreviousPushToken() {
  return localStorage.getItem("luxoriaPreviousFcmToken") || null;
}

/* ========================================
   MENTETT IDŐPONTOK
======================================== */

let savedAppointments = [];

try {
  const stored = localStorage.getItem("luxoriaAppointments");
  const parsed = stored ? JSON.parse(stored) : [];

  if (Array.isArray(parsed)) {
    savedAppointments = parsed.filter(appointment =>
      appointment &&
      typeof appointment.id === "string" &&
      typeof appointment.date === "string" &&
      typeof appointment.time === "string"
    );
  }
} catch (error) {
  console.error("Mentett időpontok betöltési hibája:", error);
}

function saveAppointments() {
  localStorage.setItem("luxoriaAppointments", JSON.stringify(savedAppointments));
}

/* ========================================
   RÉGI IDŐPONT ÁTVÉTELE
======================================== */

function migrateOldAppointment() {
  const id = localStorage.getItem("luxoriaAppointmentId");
  const date = localStorage.getItem("luxoriaAppointmentDate");
  const time = localStorage.getItem("luxoriaAppointmentTime");

  if (!id || !date || !time) return;

  if (!savedAppointments.some(appointment => appointment.id === id)) {
    savedAppointments.push({ id, date, time });
    saveAppointments();
  }

  localStorage.removeItem("luxoriaAppointmentId");
  localStorage.removeItem("luxoriaAppointmentDate");
  localStorage.removeItem("luxoriaAppointmentTime");
}

migrateOldAppointment();

/* ========================================
   DÁTUMKEZELÉS
======================================== */

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  const date = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

if (dateInput) {
  dateInput.min = getToday();
}

/* ========================================
   HIBAÜZENETEK
======================================== */

function showError(message) {
  if (!errorMessage || !errorText) return;

  errorText.textContent = message;
  errorMessage.classList.add("visible");
}

function hideError() {
  if (errorMessage) {
    errorMessage.classList.remove("visible");
  }
}

/* ========================================
   IDŐPONTOK MEGJELENÍTÉSE
======================================== */

function sortAppointments() {
  savedAppointments.sort((a, b) => {
    const first = `${a.date}T${a.time}`;
    const second = `${b.date}T${b.time}`;
    return first.localeCompare(second);
  });
}

function renderAppointments() {
  if (!appointmentList) return;

  appointmentList.innerHTML = "";
  sortAppointments();

  savedAppointments.forEach(appointment => {
    const item = document.createElement("div");
    item.className = "message success-message visible";
    item.dataset.appointmentId = appointment.id;

    const checkIcon = document.createElement("i");
    checkIcon.className = "bi bi-check-circle";

    const textBox = document.createElement("div");
    textBox.className = "message-text";

    const title = document.createElement("strong");
    title.textContent = "Időpont rögzítve";

    const appointmentText = document.createElement("span");
    appointmentText.textContent = `${formatDate(appointment.date)} · ${appointment.time}`;

    textBox.appendChild(title);
    textBox.appendChild(appointmentText);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-appointment";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", "Időpont törlése");
    deleteButton.setAttribute("title", "Időpont törlése");
    deleteButton.innerHTML = '<i class="bi bi-x-lg"></i>';

    deleteButton.addEventListener("click", () => {
      deleteAppointment(appointment.id, deleteButton);
    });

    item.appendChild(checkIcon);
    item.appendChild(textBox);
    item.appendChild(deleteButton);
    appointmentList.appendChild(item);
  });
}

/* ========================================
   IDŐPONT TÖRLÉSE
======================================== */

async function deleteAppointment(id, button) {
  hideError();

  if (!isPWA) {
    showError("Időpontot csak a telepített Luxória alkalmazásban törölhetsz.");
    return;
  }

  if (!confirm("Biztosan törölni szeretnéd ezt az időpontot?")) {
    return;
  }

  if (button) button.disabled = true;

  try {
    await deleteDoc(doc(db, "appointments", id));

    savedAppointments = savedAppointments.filter(appointment =>
      appointment.id !== id
    );

    saveAppointments();
    renderAppointments();

    if (activeReminderAppointmentId === id) {
      hideConfirmationPanel();
    }
  } catch (error) {
    console.error("Időpont törlési hiba:", error);
    showError("Nem sikerült az időpont törlése.");

    if (button) button.disabled = false;
  }
}

/* ========================================
   HOLNAP VÁRLAK PANEL
======================================== */

let activeReminderAppointmentId = null;
let responseInProgress = false;

function getDismissedReminderKey(id) {
  return  `luxoriaReminderDismissed_${id}`;
}

function hideConfirmationPanel() {
  if (confirmationPanel) {
    confirmationPanel.hidden = true;
  }

  activeReminderAppointmentId = null;
}

function showConfirmationPanel(id) {
  if (!confirmationPanel || !id) return;

  activeReminderAppointmentId = id;
  confirmationPanel.hidden = false;
}

function setResponseButtonsDisabled(disabled) {
  if (confirmArrivalButton) {
    confirmArrivalButton.disabled = disabled;
  }

  if (declineArrivalButton) {
    declineArrivalButton.disabled = disabled;
  }
}

/* ========================================
   JÖVÖK / NEM JÖVÖK VÁLASZ
======================================== */

async function submitAppointmentResponse(response) {
  if (responseInProgress || !activeReminderAppointmentId) return;

  const pushToken = getActivePushToken();

  if (!pushToken) {
    showError("A válasz elküldéséhez kapcsold be az értesítéseket.");
    return;
  }

  const appointmentId = activeReminderAppointmentId;

  responseInProgress = true;
  setResponseButtonsDisabled(true);
  hideError();

  try {
    const result = await responseFunction({
      appointmentId,
      pushToken,
      response
    });

    if (result.data?.success !== true) {
      throw new Error("A válasz mentése nem sikerült.");
    }

    localStorage.setItem(getDismissedReminderKey(appointmentId), "true");
    hideConfirmationPanel();

  } catch (error) {
    console.error("Időpontválasz mentési hiba:", error);
    showError("Nem sikerült elküldeni a választ. Kérlek, próbáld újra.");

  } finally {
    responseInProgress = false;
    setResponseButtonsDisabled(false);
  }
}

if (confirmArrivalButton) {
  confirmArrivalButton.addEventListener("click", () => {
    submitAppointmentResponse("confirmed");
  });
}

if (declineArrivalButton) {
  declineArrivalButton.addEventListener("click", () => {
    submitAppointmentResponse("declined");
  });
}

/* ========================================
   MENTETT IDŐPONTOK AZONOSÍTÓI
======================================== */

function getSavedAppointmentIds() {
  return [...new Set(
    savedAppointments
      .map(appointment => appointment.id)
      .filter(id => typeof id === "string" && /^[A-Za-z0-9]{20}$/.test(id))
  )].slice(0, 10);
}

/* ========================================
   EMLÉKEZTETŐ ELLENŐRZÉSE
======================================== */

async function checkAndShowReminderPanel() {
  if (!isPWA || !confirmationPanel || responseInProgress) return;

  const pushToken = getActivePushToken();
  const appointmentIds = getSavedAppointmentIds();

  if (!pushToken || appointmentIds.length === 0) return;

  try {
    const result = await checkReminderFunction({
      appointmentIds,
      pushToken
    });

    const reminderIds = result.data?.reminderAppointmentIds;

    if (!Array.isArray(reminderIds)) return;

    const reminderId = reminderIds.find(id =>
      appointmentIds.includes(id) &&
      localStorage.getItem(getDismissedReminderKey(id)) !== "true"
    );

    if (reminderId) {
      showConfirmationPanel(reminderId);
    } else {
      hideConfirmationPanel();
    }

  } catch (error) {
    console.error("Emlékeztető ellenőrzési hiba:", error);
  }
}

/* ========================================
   18:00 UTÁNI EMLÉKEZTETŐ PÓTLÁSA
======================================== */

let lateReminderInProgress = false;

async function sendLateReminderIfNeeded() {
  if (!isPWA || lateReminderInProgress) return;

  const pushToken = getActivePushToken();
  const appointmentIds = getSavedAppointmentIds();

  if (!pushToken || appointmentIds.length === 0) return;

  lateReminderInProgress = true;

  try {
    const result = await lateReminderFunction({
      appointmentIds,
      pushToken
    });

    if (result.data?.success !== true) {
      throw new Error("Az emlékeztető pótlása nem sikerült.");
    }

    await checkAndShowReminderPanel();

  } catch (error) {
    console.error("Késői emlékeztető hiba:", error);

  } finally {
    lateReminderInProgress = false;
  }
}

/* ========================================
   PUSH TOKEN FRISSÍTÉSE
======================================== */

let tokenSyncInProgress = false;

async function syncAppointmentTokens() {
  if (!isPWA || tokenSyncInProgress) return;

  const newToken = getActivePushToken();
  const appointmentIds = getSavedAppointmentIds();

  if (!newToken || appointmentIds.length === 0) return;

  tokenSyncInProgress = true;

  try {
    const oldToken = getPreviousPushToken();

    const result = await updateTokenFunction({
      appointmentIds,
      oldToken,
      newToken
    });

    if (result.data?.success !== true) {
      throw new Error("A tokenfrissítés nem sikerült.");
    }

    if (oldToken) {
      localStorage.removeItem("luxoriaPreviousFcmToken");
    }

    await sendLateReminderIfNeeded();
    await checkAndShowReminderPanel();

  } catch (error) {
    console.error("Időpontok tokenfrissítési hibája:", error);

  } finally {
    tokenSyncInProgress = false;
  }
}

/* ========================================
   TOKENVÁLTOZÁS FIGYELÉSE
======================================== */

window.addEventListener("luxoriaPushTokenReady", () => {
  syncAppointmentTokens();
});

/* ========================================
   BÖNGÉSZŐS HASZNÁLAT TILTÁSA
======================================== */

function disableBrowserAppointmentForm() {
  if (isPWA) return;

  if (guestName) guestName.disabled = true;
  if (dateInput) dateInput.disabled = true;
  if (timeInput) timeInput.disabled = true;

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = `
      <i class="bi bi-phone"></i>
      <span>CSAK AZ ALKALMAZÁSBAN</span>
    `;
  }

  if (form && !document.getElementById("pwaOnlyNotice")) {
    const notice = document.createElement("div");
    notice.id = "pwaOnlyNotice";
    notice.className = "info-box pwa-only-notice";
    notice.innerHTML = `
      <i class="bi bi-phone"></i>
      <p>Az időpont-emlékeztető a telepített Luxória alkalmazásban használható.</p>
    `;

    form.insertAdjacentElement("afterend", notice);
  }
}

/* ========================================
   IDŐPONT RÖGZÍTÉSE
======================================== */

if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    hideError();

    if (!isPWA) {
      showError("Időpontot csak a telepített Luxória alkalmazásban rögzíthetsz.");
      return;
    }

    const name = guestName.value.trim();
    const date = dateInput.value;
    const time = timeInput.value;

    if (!name || !date || !time) {
      showError("Kérlek, tölts ki minden mezőt.");
      return;
    }

    const appointmentDate = new Date(`${date}T${time}:00`);

    if (Number.isNaN(appointmentDate.getTime())) {
      showError("Érvénytelen dátum vagy időpont.");
      return;
    }

    if (appointmentDate <= new Date()) {
      showError("Kérlek, jövőbeli időpontot adj meg.");
      return;
    }

    const pushToken = getActivePushToken();

    saveButton.disabled = true;
    saveButton.innerHTML = `
      <i class="bi bi-hourglass-split"></i>
      <span>MENTÉS...</span>
    `;

    const appointmentData = {
      guestName: name,
      date,
      time,
      status: "pending",
      reminderSent: false,
      createdAt: serverTimestamp()
    };

    if (pushToken) {
      appointmentData.pushToken = pushToken;
    }

    try {
      const docRef = await addDoc(
        collection(db, "appointments"),
        appointmentData
      );

      savedAppointments.push({
        id: docRef.id,
        date,
        time
      });

      saveAppointments();
      renderAppointments();
      form.reset();

      dateInput.min = getToday();

      const savedItem = [...appointmentList.children].find(item =>
        item.dataset.appointmentId === docRef.id
      );

      if (savedItem) {
        savedItem.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }

      if (pushToken) {
        await syncAppointmentTokens();
      }

    } catch (error) {
      console.error("Időpont mentési hiba:", error);
      showError("Nem sikerült az időpont mentése.");

    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = `
        <i class="bi bi-calendar2-plus"></i>
        <span>IDŐPONT RÖGZÍTÉSE</span>
      `;
    }
  });
}

/* ========================================
   INDÍTÁS
======================================== */

renderAppointments();
disableBrowserAppointmentForm();

if (isPWA) {
  syncAppointmentTokens();
}