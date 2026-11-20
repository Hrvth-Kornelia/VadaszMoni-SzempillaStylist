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
const deleteButton = document.getElementById("deleteAppointment");

const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

const savedAppointment = document.getElementById("savedAppointment");
const errorText = document.getElementById("errorText");


/* ========================================
   AKTUÁLIS IDŐPONT ADATAI
======================================== */

let currentAppointmentId =
  localStorage.getItem("luxoriaAppointmentId");

let currentAppointmentDate =
  localStorage.getItem("luxoriaAppointmentDate");

let currentAppointmentTime =
  localStorage.getItem("luxoriaAppointmentTime");


/* ========================================
   MAI DÁTUM LEKÉRÉSE
======================================== */

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/* ========================================
   DÁTUM SZÉP FORMÁZÁSA
   2026-11-21 → 2026. november 21.
======================================== */

function formatDate(value) {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length !== 3) return value;

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

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}


/* ========================================
   HIBAÜZENET MEGJELENÍTÉSE
======================================== */

function showError(text) {
  errorText.textContent = text;
  errorMessage.classList.add("visible");
}


/* ========================================
   ÜZENETEK ELREJTÉSE
======================================== */

function hideMessages() {
  successMessage.classList.remove("visible");
  errorMessage.classList.remove("visible");
}


/* ========================================
   MENTETT IDŐPONT MEGJELENÍTÉSE
======================================== */

function showSavedAppointment() {

  if (
    !currentAppointmentId ||
    !currentAppointmentDate ||
    !currentAppointmentTime
  ) {
    return;
  }

  savedAppointment.textContent =
    `${formatDate(currentAppointmentDate)} · ${currentAppointmentTime}`;

  successMessage.classList.add("visible");
}


/* ========================================
   MENTETT IDŐPONT VISSZATÖLTÉSE
   OLDALFRISSÍTÉS UTÁN
======================================== */

showSavedAppointment();


/* ========================================
   MÚLTBELI DÁTUM TILTÁSA ÚJ RÖGZÍTÉSNÉL
======================================== */

dateInput.min = getToday();


/* ========================================
   IDŐPONT RÖGZÍTÉSE
======================================== */

form.addEventListener("submit", async (event) => {

  event.preventDefault();

  hideMessages();

  const name = guestName.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;

  if (!name || !date || !time) {
    return;
  }


  /* ========================================
     DÁTUM ÉS IDŐ ELLENŐRZÉSE
  ======================================== */

  const appointmentDate =
    new Date(`${date}T${time}:00`);

  if (Number.isNaN(appointmentDate.getTime())) {
    showError(
      "Érvénytelen dátum vagy időpont."
    );

    return;
  }

  if (appointmentDate <= new Date()) {
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

    const docRef = await addDoc(
      collection(db, "appointments"),
      {
        guestName: name,
        date: date,
        time: time,
        status: "pending",
        reminderSent: false,
        createdAt: serverTimestamp()
      }
    );


    /* ========================================
       IDŐPONT ADATAINAK MEGJEGYZÉSE
    ======================================== */

    currentAppointmentId = docRef.id;
    currentAppointmentDate = date;
    currentAppointmentTime = time;

    localStorage.setItem(
      "luxoriaAppointmentId",
      currentAppointmentId
    );

    localStorage.setItem(
      "luxoriaAppointmentDate",
      currentAppointmentDate
    );

    localStorage.setItem(
      "luxoriaAppointmentTime",
      currentAppointmentTime
    );


    /* ========================================
       SIKERES MENTÉS KIÍRÁSA
    ======================================== */

    savedAppointment.textContent =
      `${formatDate(date)} · ${time}`;

    successMessage.classList.add("visible");

    form.reset();


    /* ========================================
       SIKERÜZENETHEZ GÖRGETÉS
    ======================================== */

    successMessage.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });

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
});


/* ========================================
   IDŐPONT TÖRLÉSE AZ X GOMBBAL
======================================== */

deleteButton.addEventListener("click", async () => {

  if (!currentAppointmentId) {

    showError(
      "Nem található törölhető időpont."
    );

    return;
  }


  /* ========================================
     TÖRLÉS MEGERŐSÍTÉSE
  ======================================== */

  const confirmed = confirm(
    "Biztosan törölni szeretnéd ezt az időpontot?"
  );

  if (!confirmed) {
    return;
  }

  deleteButton.disabled = true;


  /* ========================================
     TÖRLÉS FIRESTORE-BÓL
  ======================================== */

  try {

    await deleteDoc(
      doc(
        db,
        "appointments",
        currentAppointmentId
      )
    );


    /* ========================================
       HELYI ADATOK TÖRLÉSE
    ======================================== */

    currentAppointmentId = null;
    currentAppointmentDate = null;
    currentAppointmentTime = null;

    localStorage.removeItem(
      "luxoriaAppointmentId"
    );

    localStorage.removeItem(
      "luxoriaAppointmentDate"
    );

    localStorage.removeItem(
      "luxoriaAppointmentTime"
    );


    /* ========================================
       IDŐPONT ELTÜNTETÉSE A KÉPERNYŐRŐL
    ======================================== */

    successMessage.classList.remove(
      "visible"
    );

  } catch (error) {

    console.error(
      "Időpont törlési hiba:",
      error
    );

    showError(
      "Nem sikerült az időpont törlése."
    );

  } finally {

    deleteButton.disabled = false;
  }
});