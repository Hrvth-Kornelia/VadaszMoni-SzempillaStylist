/* ========================================
   LUXÓRIA – VENDÉG EMLÉKEZTETŐ
   GYORSÍTOTT VÁLTOZAT
======================================== */

/* ========================================
   FIREBASE IMPORTOK
======================================== */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

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

const functions = getFunctions(
  app,
  "us-central1"
);

/* ========================================
   FIREBASE FÜGGVÉNYEK
======================================== */

const checkReminderFunction = httpsCallable(
  functions,
  "checkAppointmentReminder"
);

const responseFunction = httpsCallable(
  functions,
  "appointmentResponse"
);

const updateTokenFunction = httpsCallable(
  functions,
  "updateAppointmentToken"
);

const lateReminderFunction = httpsCallable(
  functions,
  "sendLateAppointmentReminder"
);

/* ========================================
   PWA MÓD
======================================== */

function isRunningAsPWA() {
  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true
  );
}

const isPWA = isRunningAsPWA();

/* ========================================
   HTML ELEMEK
======================================== */

const form = document.getElementById(
  "appointmentForm"
);

const guestName = document.getElementById(
  "guestName"
);

const dateInput = document.getElementById(
  "appointmentDate"
);

const timeInput = document.getElementById(
  "appointmentTime"
);

const saveButton = document.getElementById(
  "saveButton"
);

const errorMessage = document.getElementById(
  "errorMessage"
);

const errorText = document.getElementById(
  "errorText"
);

const appointmentList = document.getElementById(
  "savedAppointmentsList"
);

const confirmationPanel = document.getElementById(
  "appointmentConfirmationPanel"
);

const confirmArrivalButton = document.getElementById(
  "confirmArrivalButton"
);

const declineArrivalButton = document.getElementById(
  "declineArrivalButton"
);

/* ========================================
   PUSH TOKEN
======================================== */

function getActivePushToken() {
  if (
    localStorage.getItem(
      "pushNotificationsEnabled"
    ) !== "true"
  ) {
    return null;
  }

  return localStorage.getItem(
    "fcmToken"
  ) || null;
}

function getPreviousPushToken() {
  return localStorage.getItem(
    "luxoriaPreviousFcmToken"
  ) || null;
}

/* ========================================
   PUSH ELLENŐRZÉS
======================================== */

function canSaveWithPush() {
  if (!getActivePushToken()) {
    return false;
  }

  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  return true;
}

/* ========================================
   PUSH FIGYELMEZTETÉS
======================================== */

let pushWarningTimer = null;
let pushWarning = null;

function showPushWarning() {
  if (
    !saveButton ||
    !saveButton.parentNode
  ) {
    return;
  }

  if (!pushWarning) {
    pushWarning = document.createElement(
      "div"
    );

    pushWarning.id = "luxoriaPushWarning";

    pushWarning.setAttribute(
      "role",
      "status"
    );

    pushWarning.setAttribute(
      "aria-live",
      "polite"
    );

    pushWarning.style.cssText = `
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translate(-50%, 6px);
      width: max-content;
      max-width: min(320px, 90vw);
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 14px;
      background: #ffffff;
      color: #111111;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      box-shadow: 0 5px 18px rgba(0,0,0,0.15);
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
      text-align: center;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition:
        opacity 0.25s ease,
        transform 0.25s ease,
        visibility 0.25s ease;
      z-index: 1000;
    `;

    const bell = document.createElement(
      "span"
    );

    bell.textContent = "🔔";

    bell.style.cssText = `
      font-size: 21px;
      flex-shrink: 0;
    `;

    const message = document.createElement(
      "span"
    );

    message.textContent =
      "Először kapcsold be az értesítéseket az időpont rögzítéséhez!";

    pushWarning.appendChild(bell);
    pushWarning.appendChild(message);

    const wrapper = document.createElement(
      "div"
    );

    wrapper.id =
      "luxoriaSaveButtonWrapper";

    wrapper.style.cssText = `
      position: relative;
      width: 100%;
    `;

    saveButton.parentNode.insertBefore(
      wrapper,
      saveButton
    );

    wrapper.appendChild(saveButton);
    wrapper.appendChild(pushWarning);
  }

  clearTimeout(pushWarningTimer);

  pushWarning.style.visibility =
    "visible";

  pushWarning.style.opacity = "1";

  pushWarning.style.transform =
    "translate(-50%, 0)";

  pushWarningTimer = setTimeout(() => {
    pushWarning.style.opacity = "0";

    pushWarning.style.transform =
      "translate(-50%, 6px)";

    pushWarning.style.visibility =
      "hidden";
  }, 3000);
}

/* ========================================
   MENTETT IDŐPONTOK
======================================== */

let savedAppointments = [];

try {
  const stored = localStorage.getItem(
    "luxoriaAppointments"
  );

  const parsed = stored
    ? JSON.parse(stored)
    : [];

  if (Array.isArray(parsed)) {
    savedAppointments = parsed.filter(
      appointment =>
        appointment &&
        typeof appointment.id === "string" &&
        typeof appointment.date === "string" &&
        typeof appointment.time === "string"
    );
  }

} catch (error) {
  console.error(
    "Mentett időpontok betöltési hibája:",
    error
  );
}

function saveAppointments() {
  localStorage.setItem(
    "luxoriaAppointments",
    JSON.stringify(savedAppointments)
  );
}

/* ========================================
   RÉGI IDŐPONT ÁTVÉTELE
======================================== */

function migrateOldAppointment() {
  const id = localStorage.getItem(
    "luxoriaAppointmentId"
  );

  const date = localStorage.getItem(
    "luxoriaAppointmentDate"
  );

  const time = localStorage.getItem(
    "luxoriaAppointmentTime"
  );

  if (!id || !date || !time) {
    return;
  }

  if (
    !savedAppointments.some(
      appointment => appointment.id === id
    )
  ) {
    savedAppointments.push({
      id,
      date,
      time
    });

    saveAppointments();
  }

  localStorage.removeItem(
    "luxoriaAppointmentId"
  );

  localStorage.removeItem(
    "luxoriaAppointmentDate"
  );

  localStorage.removeItem(
    "luxoriaAppointmentTime"
  );
}

migrateOldAppointment();

/* ========================================
   DÁTUMKEZELÉS
======================================== */

function getToday() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  const date = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "hu-HU",
    {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  ).format(date);
}

if (dateInput) {
  dateInput.min = getToday();
}

/* ========================================
   HIBAÜZENETEK
======================================== */

function showError(message) {
  if (!errorMessage || !errorText) {
    return;
  }

  errorText.textContent = message;

  errorMessage.classList.add(
    "visible"
  );
}

function hideError() {
  if (errorMessage) {
    errorMessage.classList.remove(
      "visible"
    );
  }
}

/* ========================================
   IDŐPONTOK RENDEZÉSE
======================================== */

function sortAppointments() {
  savedAppointments.sort((a, b) => {
    const first =
      `${a.date}T${a.time}`;

    const second =
      `${b.date}T${b.time}`;

    return first.localeCompare(second);
  });
}

/* ========================================
   IDŐPONTOK MEGJELENÍTÉSE
======================================== */

function renderAppointments() {
  if (!appointmentList) {
    return;
  }

  appointmentList.innerHTML = "";

  sortAppointments();

  const fragment =
    document.createDocumentFragment();

  savedAppointments.forEach(appointment => {
    const item = document.createElement(
      "div"
    );

    item.className =
      "message success-message visible";

    item.dataset.appointmentId =
      appointment.id;

    const checkIcon =
      document.createElement("i");

    checkIcon.className =
      "bi bi-check-circle";

    const textBox =
      document.createElement("div");

    textBox.className =
      "message-text";

    const title =
      document.createElement("strong");

    title.textContent =
      "Időpont rögzítve";

    const appointmentText =
      document.createElement("span");

    appointmentText.textContent =
      `${formatDate(appointment.date)} · ${appointment.time}`;

    textBox.appendChild(title);

    textBox.appendChild(
      appointmentText
    );

    const deleteButton =
      document.createElement("button");

    deleteButton.className =
      "delete-appointment";

    deleteButton.type = "button";

    deleteButton.setAttribute(
      "aria-label",
      "Időpont törlése"
    );

    deleteButton.setAttribute(
      "title",
      "Időpont törlése"
    );

    deleteButton.innerHTML =
      '<i class="bi bi-x-lg"></i>';

    deleteButton.addEventListener(
      "click",
      () => {
        deleteAppointment(
          appointment.id,
          deleteButton
        );
      }
    );

    item.appendChild(checkIcon);
    item.appendChild(textBox);
    item.appendChild(deleteButton);

    fragment.appendChild(item);
  });

  appointmentList.appendChild(fragment);
}

/* ========================================
   EMLÉKEZTETŐ ÁLLAPOT
======================================== */

let activeReminderAppointmentId = null;

let responseInProgress = false;

let reminderCheckInProgress = false;

let reminderCheckQueued = false;

// Megakadályozza, hogy egy régebbi
// hálózati válasz felülírja az új állapotot.
let reminderStateVersion = 0;

/* ========================================
   EMLÉKEZTETŐ SEGÉDFÜGGVÉNYEK
======================================== */

function getDismissedReminderKey(id) {
  return `luxoriaReminderDismissed_${id}`;
}

function isReminderDismissed(id) {
  return localStorage.getItem(
    getDismissedReminderKey(id)
  ) === "true";
}

function hideConfirmationPanel() {
  reminderStateVersion++;

  if (confirmationPanel) {
    confirmationPanel.hidden = true;
  }

  activeReminderAppointmentId = null;
}

function showConfirmationPanel(id) {
  if (
    !confirmationPanel ||
    !id ||
    isReminderDismissed(id) ||
    responseInProgress
  ) {
    return;
  }

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
   IDŐPONT TÖRLÉSE
======================================== */

async function deleteAppointment(id, button) {
  hideError();

  if (!isPWA) {
    showError(
      "Időpontot csak a telepített Luxória alkalmazásban törölhetsz."
    );
    return;
  }

  if (
    !confirm(
      "Biztosan törölni szeretnéd ezt az időpontot?"
    )
  ) {
    return;
  }

  if (button) {
    button.disabled = true;
  }

  try {
    await deleteDoc(
      doc(db, "appointments", id)
    );

    savedAppointments =
      savedAppointments.filter(
        appointment => appointment.id !== id
      );

    saveAppointments();
    renderAppointments();

    // A folyamatban lévő ellenőrzések
    // régi eredményeit érvénytelenítjük.
    reminderStateVersion++;

    if (
      activeReminderAppointmentId === id
    ) {
      hideConfirmationPanel();
    }

  } catch (error) {
    console.error(
      "Időpont törlési hiba:",
      error
    );

    showError(
      "Nem sikerült az időpont törlése."
    );

    if (button) {
      button.disabled = false;
    }
  }
}

/* ========================================
   GYORS JÖVÖK / NEM JÖVÖK VÁLASZ
======================================== */

async function submitAppointmentResponse(response) {
  if (
    responseInProgress ||
    !activeReminderAppointmentId
  ) {
    return;
  }

  const pushToken = getActivePushToken();

  if (!pushToken) {
    showError(
      "A válasz elküldéséhez kapcsold be az értesítéseket."
    );
    return;
  }

  const appointmentId =
    activeReminderAppointmentId;

  responseInProgress = true;

  // Az esetleg futó ellenőrzések
  // ne módosítsák közben a panelt.
  reminderStateVersion++;

  setResponseButtonsDisabled(true);

  hideError();

  const selectedButton =
    response === "confirmed"
      ? confirmArrivalButton
      : declineArrivalButton;

  const originalContent =
    selectedButton?.innerHTML;

  // AZONNALI VISSZAJELZÉS
  if (selectedButton) {
    selectedButton.innerHTML = `
      <i class="bi bi-hourglass-split"></i>
      <span>Küldés...</span>
    `;

    selectedButton.setAttribute(
      "aria-busy",
      "true"
    );
  }

  try {
    const result = await responseFunction({
      appointmentId,
      pushToken,
      response
    });

    if (
      result.data?.success !== true
    ) {
      throw new Error(
        "A válasz mentése nem sikerült."
      );
    }

    // Ha a szerver már korábban
    // másik választ tárolt, azt
    // nem tekintjük az új válasz
    // sikeres mentésének.
    if (
      result.data?.status !== response
    ) {
      throw new Error(
        "Az időponthoz már eltérő válasz van rögzítve."
      );
    }

    // Csak sikeres mentés után
    // jelöljük megválaszoltnak.
    localStorage.setItem(
      getDismissedReminderKey(
        appointmentId
      ),
      "true"
    );

    hideConfirmationPanel();

  } catch (error) {
    console.error(
      "Időpontválasz mentési hiba:",
      error
    );

    showError(
      "Nem sikerült elküldeni a választ. Kérlek, próbáld újra."
    );

  } finally {
    if (
      selectedButton &&
      originalContent !== undefined
    ) {
      selectedButton.innerHTML =
        originalContent;

      selectedButton.removeAttribute(
        "aria-busy"
      );
    }

    responseInProgress = false;

    setResponseButtonsDisabled(false);

    // Ha közben új ellenőrzésre
    // volt szükség, most elindulhat.
    if (reminderCheckQueued) {
      reminderCheckQueued = false;

      checkAndShowReminderPanel();
    }
  }
}

/* ========================================
   VÁLASZGOMBOK
======================================== */

if (confirmArrivalButton) {
  confirmArrivalButton.addEventListener(
    "click",
    () => {
      submitAppointmentResponse(
        "confirmed"
      );
    }
  );
}

if (declineArrivalButton) {
  declineArrivalButton.addEventListener(
    "click",
    () => {
      submitAppointmentResponse(
        "declined"
      );
    }
  );
}

/* ========================================
   MENTETT IDŐPONT AZONOSÍTÓK
======================================== */

function getSavedAppointmentIds() {
  return [
    ...new Set(
      savedAppointments
        .map(
          appointment => appointment.id
        )
        .filter(
          id =>
            typeof id === "string" &&
            /^[A-Za-z0-9]{20}$/.test(id)
        )
    )
  ].slice(0, 10);
}

/* ========================================
   GYORSÍTOTT EMLÉKEZTETŐ ELLENŐRZÉS
======================================== */

async function checkAndShowReminderPanel() {
  if (
    !isPWA ||
    !confirmationPanel
  ) {
    return;
  }

  if (
    responseInProgress ||
    reminderCheckInProgress
  ) {
    reminderCheckQueued = true;
    return;
  }

  const pushToken =
    getActivePushToken();

  const appointmentIds =
    getSavedAppointmentIds();

  if (
    !pushToken ||
    appointmentIds.length === 0
  ) {
    return;
  }

  reminderCheckInProgress = true;

  const checkVersion =
    reminderStateVersion;

  try {
    const result =
      await checkReminderFunction({
        appointmentIds,
        pushToken
      });

    // Ha közben választ küldtek,
    // időpontot töröltek vagy a
    // panel állapota megváltozott,
    // a régi eredményt eldobjuk.
    if (
      checkVersion !== reminderStateVersion ||
      responseInProgress
    ) {
      return;
    }

    const reminderIds =
      result.data?.reminderAppointmentIds;

    if (!Array.isArray(reminderIds)) {
      return;
    }

    const currentIds =
      getSavedAppointmentIds();

    const reminderId =
      reminderIds.find(
        id =>
          appointmentIds.includes(id) &&
          currentIds.includes(id) &&
          !isReminderDismissed(id)
      );

    if (reminderId) {
      showConfirmationPanel(
        reminderId
      );

    } else if (
      activeReminderAppointmentId
    ) {
      hideConfirmationPanel();
    }

  } catch (error) {
    console.error(
      "Emlékeztető ellenőrzési hiba:",
      error
    );

  } finally {
    reminderCheckInProgress = false;

    // Ha a lekérés közben újabb
    // ellenőrzés érkezett, azt
    // csak egyszer futtatjuk le.
    if (
      reminderCheckQueued &&
      !responseInProgress
    ) {
      reminderCheckQueued = false;

      checkAndShowReminderPanel();
    }
  }
}

/* ========================================
   18:00 UTÁNI EMLÉKEZTETŐ PÓTLÁSA
======================================== */

let lateReminderInProgress = false;

async function sendLateReminderIfNeeded() {
  if (
    !isPWA ||
    lateReminderInProgress
  ) {
    return;
  }

  const pushToken =
    getActivePushToken();

  const appointmentIds =
    getSavedAppointmentIds();

  if (
    !pushToken ||
    appointmentIds.length === 0
  ) {
    return;
  }

  lateReminderInProgress = true;

  try {
    const result =
      await lateReminderFunction({
        appointmentIds,
        pushToken
      });

    if (
      result.data?.success !== true
    ) {
      throw new Error(
        "Az emlékeztető pótlása nem sikerült."
      );
    }

    // A pótlás után újra
    // ellenőrizzük a panelt.
    await checkAndShowReminderPanel();

  } catch (error) {
    console.error(
      "Késői emlékeztető hiba:",
      error
    );

  } finally {
    lateReminderInProgress = false;
  }
}

/* ========================================
   PUSH TOKEN FRISSÍTÉSE
======================================== */

let tokenSyncInProgress = false;

let tokenSyncQueued = false;

async function syncAppointmentTokens() {
  if (!isPWA) {
    return;
  }

  if (tokenSyncInProgress) {
    tokenSyncQueued = true;
    return;
  }

  const newToken =
    getActivePushToken();

  const appointmentIds =
    getSavedAppointmentIds();

  if (
    !newToken ||
    appointmentIds.length === 0
  ) {
    return;
  }

  tokenSyncInProgress = true;

  try {
    const oldToken =
      getPreviousPushToken();

    const result =
      await updateTokenFunction({
        appointmentIds,
        oldToken,
        newToken
      });

    if (
      result.data?.success !== true
    ) {
      throw new Error(
        "A tokenfrissítés nem sikerült."
      );
    }

    if (oldToken) {
      localStorage.removeItem(
        "luxoriaPreviousFcmToken"
      );
    }

    // A tokenfrissítés utáni
    // feladatok nem blokkolják
    // egymást.
    await Promise.allSettled([
      sendLateReminderIfNeeded(),
      checkAndShowReminderPanel()
    ]);

  } catch (error) {
    console.error(
      "Időpontok tokenfrissítési hibája:",
      error
    );

  } finally {
    tokenSyncInProgress = false;

    if (tokenSyncQueued) {
      tokenSyncQueued = false;

      syncAppointmentTokens();
    }
  }
}

/* ========================================
   TOKENVÁLTOZÁS FIGYELÉSE
======================================== */

window.addEventListener(
  "luxoriaPushTokenReady",
  () => {
    // Az új tokenhez tartozó
    // emlékeztető ellenőrzése
    // azonnal elindul.
    checkAndShowReminderPanel();

    syncAppointmentTokens();
  }
);

/* ========================================
   BÖNGÉSZŐS HASZNÁLAT TILTÁSA
======================================== */

function disableBrowserAppointmentForm() {
  if (isPWA) {
    return;
  }

  if (guestName) {
    guestName.disabled = true;
  }

  if (dateInput) {
    dateInput.disabled = true;
  }

  if (timeInput) {
    timeInput.disabled = true;
  }

  if (saveButton) {
    saveButton.disabled = true;

    saveButton.innerHTML = `
      <i class="bi bi-phone"></i>
      <span>CSAK AZ ALKALMAZÁSBAN</span>
    `;
  }

  if (
    form &&
    !document.getElementById(
      "pwaOnlyNotice"
    )
  ) {
    const notice =
      document.createElement("div");

    notice.id = "pwaOnlyNotice";

    notice.className =
      "info-box pwa-only-notice";

    notice.innerHTML = `
      <i class="bi bi-phone"></i>
      <p>
        Az időpont-emlékeztető a telepített
        Luxória alkalmazásban használható.
      </p>
    `;

    form.insertAdjacentElement(
      "afterend",
      notice
    );
  }
}

/* ========================================
   IDŐPONT RÖGZÍTÉSE
======================================== */

if (form) {
  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      hideError();

      if (!isPWA) {
        showError(
          "Időpontot csak a telepített Luxória alkalmazásban rögzíthetsz."
        );
        return;
      }

      if (!canSaveWithPush()) {
        showPushWarning();
        return;
      }

      const name =
        guestName.value.trim();

      const date =
        dateInput.value;

      const time =
        timeInput.value;

      if (
        !name ||
        !date ||
        !time
      ) {
        showError(
          "Kérlek, tölts ki minden mezőt."
        );
        return;
      }

      const appointmentDate =
        new Date(
          `${date}T${time}:00`);

      if (
        Number.isNaN(
          appointmentDate.getTime()
        )
      ) {
        showError(
          "Érvénytelen dátum vagy időpont."
        );
        return;
      }

      if (
        appointmentDate <= new Date()
      ) {
        showError(
          "Kérlek, jövőbeli időpontot adj meg."
        );
        return;
      }

      const pushToken =
        getActivePushToken();

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
        createdAt: serverTimestamp(),
        pushToken
      };

      try {
        const docRef = await addDoc(
          collection(
            db,
            "appointments"
          ),
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

        dateInput.min =
          getToday();

        const savedItem = [
          ...appointmentList.children
        ].find(
          item =>
            item.dataset.appointmentId ===
            docRef.id
        );

        if (savedItem) {
          savedItem.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });
        }

        // GYORSÍTÁS:
        // A sikeres időpontmentés után
        // nem várjuk meg a teljes
        // tokenfrissítési folyamatot.
        syncAppointmentTokens();

      } catch (error) {
        console.error(
          "Időpont mentési hiba:",
          error
        );

        showError(
          "Nem sikerült az időpont mentése."
        );

      } finally {
        saveButton.disabled = false;

        saveButton.innerHTML = `
          <i class="bi bi-calendar2-plus"></i>
          <span>IDŐPONT RÖGZÍTÉSE</span>
        `;
      }
    }
  );
}

/* ========================================
   GYORSÍTOTT INDÍTÁS
======================================== */

// A mentett időpontokat rögtön
// megjelenítjük.
renderAppointments();

// Böngészős használat ellenőrzése.
disableBrowserAppointmentForm();

if (isPWA) {

  // 1. EMLÉKEZTETŐ AZONNAL
  // Nem várunk a tokenfrissítésre.
  checkAndShowReminderPanel();

  // 2. TOKENFRISSÍTÉS KÜLÖN
  // A háttérben indul.
  syncAppointmentTokens();

}