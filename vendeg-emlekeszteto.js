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
   PWA MÓD ELLENŐRZÉSE
======================================== */

function isRunningAsPWA() {
  const standaloneMode =
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

  const iosStandalone =
    window.navigator.standalone === true;

  return standaloneMode || iosStandalone;
}

const isPWA = isRunningAsPWA();


/* ========================================
   HTML ELEMEK
======================================== */

const form =
  document.getElementById("appointmentForm");

const guestName =
  document.getElementById("guestName");

const dateInput =
  document.getElementById("appointmentDate");

const timeInput =
  document.getElementById("appointmentTime");

const saveButton =
  document.getElementById("saveButton");

const successMessage =
  document.getElementById("successMessage");

const errorMessage =
  document.getElementById("errorMessage");

const errorText =
  document.getElementById("errorText");


/* ========================================
   HOLNAP VÁRLAK PANEL ELEMEI
======================================== */

const confirmationPanel =
  document.getElementById(
    "appointmentConfirmationPanel"
  );

const confirmArrivalButton =
  document.getElementById(
    "confirmArrivalButton"
  );

const declineArrivalButton =
  document.getElementById(
    "declineArrivalButton"
  );


/* ========================================
   PUSH TOKEN LEKÉRÉSE
======================================== */

function getActivePushToken() {
  const notificationsEnabled =
    localStorage.getItem(
      "pushNotificationsEnabled"
    );

  const token =
    localStorage.getItem("fcmToken");

  console.log(
    "Luxória token ellenőrzés:",
    {
      ertesitesBekapcsolva:
        notificationsEnabled,
      vanToken: Boolean(token)
    }
  );

  if (
    notificationsEnabled === "true" &&
    token
  ) {
    return token;
  }

  return null;
}


/* ========================================
   MENTETT IDŐPONTOK BETÖLTÉSE
======================================== */

let savedAppointments = [];

try {
  const storedAppointments =
    localStorage.getItem(
      "luxoriaAppointments"
    );

  if (storedAppointments) {
    const parsedAppointments =
      JSON.parse(storedAppointments);

    if (
      Array.isArray(
        parsedAppointments
      )
    ) {
      savedAppointments =
        parsedAppointments;
    }
  }

} catch (error) {
  console.error(
    "Mentett időpontok betöltési hibája:",
    error
  );

  savedAppointments = [];
}


/* ========================================
   IDŐPONTOK HELYI MENTÉSE
======================================== */

function saveAppointments() {
  localStorage.setItem(
    "luxoriaAppointments",
    JSON.stringify(
      savedAppointments
    )
  );
}


/* ========================================
   RÉGI EGY-IDŐPONTOS ADAT ÁTVÉTELE
======================================== */

function migrateOldAppointment() {
  const oldId =
    localStorage.getItem(
      "luxoriaAppointmentId"
    );

  const oldDate =
    localStorage.getItem(
      "luxoriaAppointmentDate"
    );

  const oldTime =
    localStorage.getItem(
      "luxoriaAppointmentTime"
    );

  if (
    !oldId ||
    !oldDate ||
    !oldTime
  ) {
    return;
  }

  const alreadySaved =
    savedAppointments.some(
      appointment =>
        appointment.id === oldId
    );

  if (!alreadySaved) {
    savedAppointments.push({
      id: oldId,
      date: oldDate,
      time: oldTime
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
   MAI DÁTUM
======================================== */

function getToday() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/* ========================================
   DÁTUM FORMÁZÁSA
======================================== */

function formatDate(value) {
  if (!value) {
    return "";
  }

  const parts =
    value.split("-");

  if (
    parts.length !== 3
  ) {
    return value;
  }

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  const day =
    Number(parts[2]);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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


/* ========================================
   HIBAÜZENETEK
======================================== */

function showError(text) {
  if (
    !errorMessage ||
    !errorText
  ) {
    return;
  }

  errorText.textContent =
    text;

  errorMessage.classList.add(
    "visible"
  );
}

function hideError() {
  if (!errorMessage) {
    return;
  }

  errorMessage.classList.remove(
    "visible"
  );
}


/* ========================================
   MÚLTBELI DÁTUM TILTÁSA
======================================== */

if (dateInput) {
  dateInput.min =
    getToday();
}


/* ========================================
   IDŐPONTLISTA
======================================== */

let appointmentList =
  document.getElementById(
    "savedAppointmentsList"
  );

if (
  !appointmentList &&
  successMessage
) {
  appointmentList =
    document.createElement("div");

  appointmentList.id =
    "savedAppointmentsList";

  successMessage.insertAdjacentElement(
    "afterend",
    appointmentList
  );
}

if (successMessage) {
  successMessage.classList.remove(
    "visible"
  );
}


/* ========================================
   RENDEZÉS
======================================== */

function sortAppointments() {
  savedAppointments.sort(
    (a, b) => {
      const first =
        `${a.date || ""}T${a.time || ""}`;

      const second =
        `${b.date || ""}T${b.time || ""}`;

      return first.localeCompare(
        second
      );
    }
  );
}


/* ========================================
   IDŐPONTOK MEGJELENÍTÉSE
======================================== */

function renderAppointments() {
  if (!appointmentList) {
    return;
  }

  appointmentList.innerHTML =
    "";

  sortAppointments();

  savedAppointments.forEach(
    appointment => {
      const item =
        document.createElement(
          "div"
        );

      item.className =
        "message success-message visible";

      const checkIcon =
        document.createElement(
          "i"
        );

      checkIcon.className =
        "bi bi-check-circle";

      const textBox =
        document.createElement(
          "div"
        );

      textBox.className =
        "message-text";

      const title =
        document.createElement(
          "strong"
        );

      title.textContent =
        "Időpont rögzítve";

      const appointmentText =
        document.createElement(
          "span"
        );

      appointmentText.textContent =
        `${formatDate(appointment.date)} · ${appointment.time}`;

      textBox.appendChild(
        title
      );

      textBox.appendChild(
        appointmentText
      );

      const deleteButton =
        document.createElement(
          "button"
        );

      deleteButton.className =
        "delete-appointment";

      deleteButton.type =
        "button";

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
        async () => {
          await deleteAppointment(
            appointment.id,
            deleteButton
          );
        }
      );

      item.appendChild(
        checkIcon
      );

      item.appendChild(
        textBox
      );

      item.appendChild(
        deleteButton
      );

      appointmentList.appendChild(
        item
      );
    }
  );
}


/* ========================================
   IDŐPONT TÖRLÉSE
======================================== */

async function deleteAppointment(
  id,
  button
) {
  hideError();

  if (!isPWA) {
    showError(
      "Időpontot csak a telepített Luxória alkalmazásban törölhetsz."
    );

    return;
  }

  const confirmed =
    confirm(
      "Biztosan törölni szeretnéd ezt az időpontot?"
    );

  if (!confirmed) {
    return;
  }

  if (button) {
    button.disabled = true;
  }

  try {
    await deleteDoc(
      doc(
        db,
        "appointments",
        id
      )
    );

    savedAppointments =
      savedAppointments.filter(
        appointment =>
          appointment.id !== id
      );

    saveAppointments();

    renderAppointments();

    /*
     * Ha egy időpontot törölnek,
     * a hozzá tartozó panelt is elrejtjük.
     */

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
   HOLNAP VÁRLAK PANEL – ÁLLAPOT
======================================== */

let activeReminderAppointmentId =
  null;

/*
 * Egy időpont paneljének bezárását
 * a telefon helyi tárhelyén őrizzük meg.
 */

function getDismissedReminderKey(
  appointmentId
) {
  return (
    "luxoriaReminderDismissed_" +
    appointmentId
  );
}


/* ========================================
   PANEL ELREJTÉSE
======================================== */

function hideConfirmationPanel() {
  if (confirmationPanel) {
    confirmationPanel.hidden =
      true;
  }

  activeReminderAppointmentId =
    null;
}


/* ========================================
   PANEL MEGJELENÍTÉSE
======================================== */

function showConfirmationPanel(
  appointmentId
) {
  if (
    !confirmationPanel ||
    !appointmentId
  ) {
    return;
  }

  activeReminderAppointmentId =
    appointmentId;

  confirmationPanel.hidden =
    false;
}


/* ========================================
   PANEL BEZÁRÁSA

   MOST MÉG NEM MENTÜNK
   JÖVÖK / NEM JÖVÖK VÁLASZT.

   MINDKÉT GOMB UGYANAZT CSINÁLJA:
   BEZÁRJA A PANELT.
======================================== */

function dismissConfirmationPanel() {
  if (
    !activeReminderAppointmentId
  ) {
    return;
  }

  const key =
    getDismissedReminderKey(
      activeReminderAppointmentId
    );

  try {
    localStorage.setItem(
      key,
      "true"
    );

  } catch (error) {
    console.error(
      "Panel bezárás mentési hiba:",
      error
    );

    showError(
      "Nem sikerült megjegyezni a panel bezárását."
    );

    return;
  }

  hideConfirmationPanel();
}


/* ========================================
   JÖVÖK GOMB
======================================== */

if (confirmArrivalButton) {
  confirmArrivalButton.addEventListener(
    "click",
    () => {
      dismissConfirmationPanel();
    }
  );
}


/* ========================================
   NEM JÖVÖK GOMB
======================================== */

if (declineArrivalButton) {
  declineArrivalButton.addEventListener(
    "click",
    () => {
      dismissConfirmationPanel();
    }
  );
}


/* ========================================
   EMLÉKEZTETŐ ELLENŐRZÉSE

   A FIREBASE-TŐL CSAK AZT KÉRDEZZÜK:
   VAN-E MÁR KIKÜLDÖTT EMLÉKEZTETŐ
   A TELEFONON MENTETT IDŐPONTOKHOZ?

   NEM KÉRÜNK LE VENDÉGNEVEKET
   VAGY MÁS SZEMÉLYES ADATOKAT.
======================================== */

async function checkAndShowReminderPanel() {
  hideConfirmationPanel();

  if (
    !isPWA ||
    !confirmationPanel
  ) {
    return;
  }

  const pushToken =
    getActivePushToken();

  if (!pushToken) {
    return;
  }

  /*
   * A Cloud Function legfeljebb
   * 10 különböző időpontot fogad.
   */

  const appointmentIds =
    [
      ...new Set(
        savedAppointments
          .map(
            appointment =>
              appointment.id
          )
          .filter(
            id =>
              typeof id === "string" &&
              /^[A-Za-z0-9]{20}$/.test(id)
          )
      )
    ].slice(0, 10);

  if (
    appointmentIds.length === 0
  ) {
    return;
  }

  try {
    const checkAppointmentReminder =
      httpsCallable(
        functions,
        "checkAppointmentReminder"
      );

    const result =
      await checkAppointmentReminder({
        appointmentIds,
        pushToken
      });

    const reminderIds =
      result.data
        ?.reminderAppointmentIds;

    if (
      !Array.isArray(reminderIds)
    ) {
      return;
    }

    /*
     * Csak olyan ID jelenhet meg,
     * amelyet a készülék is ismer,
     * és amelyhez még nem zárták
     * be a panelt.
     */

    const reminderId =
      reminderIds.find(
        id => {
          if (
            !appointmentIds.includes(id)
          ) {
            return false;
          }

          const dismissed =
            localStorage.getItem(
              getDismissedReminderKey(id)
            );

          return dismissed !== "true";
        }
      );

    if (reminderId) {
      showConfirmationPanel(
        reminderId
      );
    }

  } catch (error) {
    console.error(
      "Emlékeztető ellenőrzési hiba:",
      error
    );

    /*
     * Hiba esetén a panel rejtve marad.
     * Az időpontrögzítés tovább működik.
     */
  }
}


/* ========================================
   BÖNGÉSZŐS HASZNÁLAT TILTÁSA
======================================== */

function disableBrowserAppointmentForm() {
  if (isPWA) {
    return;
  }

  if (guestName) {
    guestName.disabled =
      true;
  }

  if (dateInput) {
    dateInput.disabled =
      true;
  }

  if (timeInput) {
    timeInput.disabled =
      true;
  }

  if (saveButton) {
    saveButton.disabled =
      true;

    saveButton.innerHTML = `
      <i class="bi bi-phone"></i>
      <span>CSAK AZ ALKALMAZÁSBAN</span>
    `;
  }

  const existingNotice =
    document.getElementById(
      "pwaOnlyNotice"
    );

  if (
    !existingNotice &&
    form
  ) {
    const browserNotice =
      document.createElement(
        "div"
      );

    browserNotice.id =
      "pwaOnlyNotice";

    browserNotice.className =
      "info-box pwa-only-notice";

    browserNotice.innerHTML = `
      <i class="bi bi-phone"></i>

      <p>
        Az időpont-emlékeztető a telepített
        Luxória alkalmazásban használható.
      </p>
    `;

    form.insertAdjacentElement(
      "afterend",
      browserNotice
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
          `${date}T${time}:00`
        );

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

      saveButton.disabled =
        true;

      saveButton.innerHTML = `
        <i class="bi bi-hourglass-split"></i>
        <span>MENTÉS...</span>
      `;

      const appointmentData = {
        guestName: name,
        date: date,
        time: time,
        status: "pending",
        reminderSent: false,
        createdAt: serverTimestamp()
      };

      if (pushToken) {
        appointmentData.pushToken =
          pushToken;
      }

      try {
        const docRef =
          await addDoc(
            collection(
              db,
              "appointments"
            ),
            appointmentData
          );

        savedAppointments.push({
          id: docRef.id,
          date: date,
          time: time
        });

        saveAppointments();

        renderAppointments();

        form.reset();

        dateInput.min =
          getToday();

        const savedItem =
          [...appointmentList.children]
            .find(
              item =>
                item.textContent.includes(
                  `${formatDate(date)} · ${time}`
                )
            );

        if (savedItem) {
          savedItem.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });
        }

      } catch (error) {
        console.error(
          "Időpont mentési hiba:",
          error
        );

        showError(
          "Nem sikerült az időpont mentése."
        );

      } finally {
        saveButton.disabled =
          false;

        saveButton.innerHTML = `
          <i class="bi bi-calendar2-plus"></i>
          <span>IDŐPONT RÖGZÍTÉSE</span>
        `;
      }
    }
  );
}


/* ========================================
   INDÍTÁS
======================================== */

renderAppointments();

disableBrowserAppointmentForm();

/*
 * A panel alapból rejtve marad.
 * Csak az ellenőrzés sikeres
 * eredménye után jelenhet meg.
 */

checkAndShowReminderPanel();