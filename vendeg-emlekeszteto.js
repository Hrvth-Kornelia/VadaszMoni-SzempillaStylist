/* ========================================
   FIREBASE IMPORTOK
======================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";


/* ========================================
   FIREBASE BEÁLLÍTÁSOK
======================================== */

const firebaseConfig = {
  apiKey: "AIzaSyCsVHd8SfN0YzU3qB8dbOMQrdWBkZpLkjw",
  authDomain: "vadasz-monika-szempillastylist.firebaseapp.com",
  projectId: "vadasz-monika-szempillastylist",
  storageBucket: "vadasz-monika-szempillastylist.firebasestorage.app",
  messagingSenderId: "107835480232",
  appId: "G-YYHW07BS7L",
  measurementId: "G-YYHW07BS7L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


/* ========================================
   HTML ELEMEK
======================================== */

const form = document.getElementById("appointmentForm");
const guestName = document.getElementById("guestName");
const dateInput = document.getElementById("appointmentDate");
const timeInput = document.getElementById("appointmentTime");

const saveButton = document.getElementById("saveButton");

const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

const errorText = document.getElementById("errorText");


/* ========================================
   MENTETT IDŐPONTOK
======================================== */

let savedAppointments = JSON.parse(
  localStorage.getItem("luxoriaAppointments") || "[]"
);


/* ========================================
   IDŐPONTOK MENTÉSE A TELEFONON
======================================== */

function saveAppointments() {
  localStorage.setItem(
    "luxoriaAppointments",
    JSON.stringify(savedAppointments)
  );
}


/* ========================================
   RÉGI EGY IDŐPONTOS ADAT ÁTVÉTELE
======================================== */

function migrateOldAppointment() {
  const oldId =
    localStorage.getItem("luxoriaAppointmentId");

  const oldDate =
    localStorage.getItem("luxoriaAppointmentDate");

  const oldTime =
    localStorage.getItem("luxoriaAppointmentTime");

  if (!oldId || !oldDate || !oldTime) {
    return;
  }

  const alreadySaved =
    savedAppointments.some(
      appointment => appointment.id === oldId
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
   MAI DÁTUM LEKÉRÉSE
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


/* ========================================
   DÁTUM SZÉP FORMÁZÁSA
   2026-11-21 → 2026. november 21.
======================================== */

function formatDate(value) {
  if (!value) {
    return "";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const date = new Date(
    year,
    month - 1,
    day
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


/* ========================================
   HIBAÜZENET MEGJELENÍTÉSE
======================================== */

function showError(text) {
  errorText.textContent = text;

  errorMessage.classList.add(
    "visible"
  );
}


/* ========================================
   HIBAÜZENET ELREJTÉSE
======================================== */

function hideError() {
  errorMessage.classList.remove(
    "visible"
  );
}


/* ========================================
   MÚLTBELI DÁTUM TILTÁSA
======================================== */

dateInput.min = getToday();


/* ========================================
   IDŐPONTLISTA LÉTREHOZÁSA
======================================== */

let appointmentList =
  document.getElementById(
    "savedAppointmentsList"
  );

if (!appointmentList) {
  appointmentList =
    document.createElement("div");

  appointmentList.id =
    "savedAppointmentsList";

  successMessage.insertAdjacentElement(
    "afterend",
    appointmentList
  );
}


/* ========================================
   RÉGI EGYDARABOS SIKERÜZENET ELREJTÉSE
======================================== */

successMessage.classList.remove(
  "visible"
);


/* ========================================
   MENTETT IDŐPONTOK MEGJELENÍTÉSE
======================================== */

function renderAppointments() {

  appointmentList.innerHTML = "";

  savedAppointments.forEach(
    appointment => {

      const item =
        document.createElement("div");

      item.className =
        "message success-message visible";


      /* ========================================
         PIPA IKON
      ======================================== */

      const checkIcon =
        document.createElement("i");

      checkIcon.className =
        "bi bi-check-circle";


      /* ========================================
         IDŐPONT SZÖVEGE
      ======================================== */

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


      /* ========================================
         X TÖRLÉS GOMB
      ======================================== */

      const deleteButton =
        document.createElement("button");

      deleteButton.className =
        "delete-appointment";

      deleteButton.type =
        "button";

      deleteButton.setAttribute(
        "aria-label",
        "Időpont törlése"
      );

      deleteButton.innerHTML =
        '<i class="bi bi-x-lg"></i>';


      /* ========================================
         X GOMB MŰKÖDÉSE
      ======================================== */

      deleteButton.addEventListener(
        "click",
        async () => {

          await deleteAppointment(
            appointment.id
          );
        }
      );


      /* ========================================
         BLOKK ÖSSZEÁLLÍTÁSA
      ======================================== */

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
   EGY IDŐPONT TÖRLÉSE
======================================== */

async function deleteAppointment(id) {

  hideError();

  const confirmed = confirm(
    "Biztosan törölni szeretnéd ezt az időpontot?"
  );

  if (!confirmed) {
    return;
  }


  /* ========================================
     TÖRLÉS FIRESTORE-BÓL
  ======================================== */

  try {

    await deleteDoc(
      doc(
        db,
        "appointments",
        id
      )
    );


    /* ========================================
       TÖRLÉS A HELYI LISTÁBÓL
    ======================================== */

    savedAppointments =
      savedAppointments.filter(
        appointment =>
          appointment.id !== id
      );

    saveAppointments();


    /* ========================================
       LISTA ÚJRARAJZOLÁSA
    ======================================== */

    renderAppointments();

  } catch (error) {

    console.error(
      "Időpont törlési hiba:",
      error
    );

    showError(
      "Nem sikerült az időpont törlése."
    );
  }
}


/* ========================================
   IDŐPONT RÖGZÍTÉSE
======================================== */

form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    hideError();


    /* ========================================
       BEÍRT ADATOK
    ======================================== */

    const name =
      guestName.value.trim();

    const date =
      dateInput.value;

    const time =
      timeInput.value;


    if (!name || !date || !time) {
      return;
    }


    /* ========================================
       DÁTUM ÉS IDŐ ELLENŐRZÉSE
    ======================================== */

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


    /* ========================================
       MENTÉS GOMB ÁLLAPOTA
    ======================================== */

    saveButton.disabled = true;

    saveButton.innerHTML = `
      <i class="bi bi-hourglass-split"></i>
      <span>MENTÉS...</span>
    `;


    /* ========================================
       MENTÉS FIRESTORE-BA
    ======================================== */

    try {

      const docRef =
        await addDoc(
          collection(
            db,
            "appointments"
          ),
          {
            guestName: name,
            date: date,
            time: time,
            status: "pending",
            reminderSent: false,
            createdAt:
              serverTimestamp()
          }
        );


      /* ========================================
         ÚJ IDŐPONT HOZZÁADÁSA
      ======================================== */

      savedAppointments.push({
        id: docRef.id,
        date: date,
        time: time
      });

      saveAppointments();


      /* ========================================
         LISTA FRISSÍTÉSE
      ======================================== */

      renderAppointments();


      /* ========================================
         ŰRLAP KIÜRÍTÉSE
      ======================================== */

      form.reset();

      dateInput.min =
        getToday();


      /* ========================================
         ÚJ IDŐPONTHOZ GÖRGETÉS
      ======================================== */

      if (
        appointmentList.lastElementChild
      ) {

        appointmentList
          .lastElementChild
          .scrollIntoView({
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


      /* ========================================
         MENTÉS GOMB VISSZAÁLLÍTÁSA
      ======================================== */

      saveButton.disabled = false;

      saveButton.innerHTML = `
        <i class="bi bi-calendar2-plus"></i>
        <span>IDŐPONT RÖGZÍTÉSE</span>
      `;
    }
  }
);


/* ========================================
   MENTETT IDŐPONTOK BETÖLTÉSE
   OLDALNYITÁSKOR
======================================== */

renderAppointments();