// =========================
// FELSZABADULT IDŐPONT MENTÉSE
// =========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyCsVHd8SfN0YzU3qB8dbOMQrdWBkZpLkjw",
  authDomain: "vadasz-monika-szempillastylist.firebaseapp.com",
  projectId: "vadasz-monika-szempillastylist",
  storageBucket: "vadasz-monika-szempillastylist.firebasestorage.app",
  messagingSenderId: "107835480232",
  appId: "1:107835480232:web:15ed130fd4c696d3b9ca9d",
  measurementID: "G-YYHW07BS7L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app, "us-central1");

const sendAvailableAppointmentPush = httpsCallable(
  functions,
  "sendAvailableAppointmentPush"
);

const getPushUsage = httpsCallable(
  functions,
  "getPushUsage"
);

// =========================
// HTML ELEMEK
// =========================

const kuldesGomb = document.getElementById("kuldes");
const hozzaadGomb = document.getElementById("hozzaad");
const datumInput = document.getElementById("datum");
const idoInput = document.getElementById("ido");
const kivalasztottLista = document.getElementById("kivalasztottLista");
const adminLista = document.getElementById("adminIdopontLista");
const pushUsage = document.getElementById("pushUsage");

let kivalasztottIdopontok = [];

// =========================
// HAVI PUSH FELHASZNÁLÁS
// =========================

async function frissitPushUsage() {
  if (!pushUsage) return;

  try {
    const eredmeny = await getPushUsage();
    const adat = eredmeny.data;

    pushUsage.textContent =
      `Havi push értesítések: ${adat.used} / ${adat.limit}`;
  } catch (error) {
    console.error(
      "Push felhasználás lekérési hiba:",
      error
    );

    pushUsage.textContent =
      "Havi push értesítések: – / 25";
  }
}

// =========================
// ADMIN BEJELENTKEZÉS ELLENŐRZÉSE
// =========================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "admin-bejelentkezes.html";
    return;
  }

  await frissitPushUsage();
});

// =========================
// LISTA BETÖLTÉSE
// =========================

async function betoltIdopontok() {
  if (!adminLista) return;

  try {
    const q = query(
      collection(db, "felszabadultIdopontok"),
      orderBy("datum", "asc")
    );

    const snapshot = await getDocs(q);

    adminLista.innerHTML = "";

    if (snapshot.empty) {
      adminLista.innerHTML =
        `<p class="ures-lista">Nincs felvitt időpont.</p>`;
      return;
    }

    snapshot.forEach((dokumentum) => {
      const adat = dokumentum.data();
      const sor = document.createElement("div");

      sor.className = "idopont-sor";

      sor.innerHTML = `
        <div>
          <strong>${adat.datum}</strong>
          <span>${adat.ido}</span>
        </div>
        <button
          class="torles-gomb"
          data-id="${dokumentum.id}"
          type="button">
          ×
        </button>
      `;

      adminLista.appendChild(sor);
    });
  } catch (error) {
    console.error(
      "Lista betöltési hiba:",
      error
    );
  }
}

// =========================
// KIVÁLASZTOTT IDŐPONTOK
// =========================

function kirajzolKivalasztottIdopontok() {
  if (!kivalasztottLista) return;

  kivalasztottLista.innerHTML = "";

  if (kivalasztottIdopontok.length === 0) {
    kivalasztottLista.innerHTML =
      `<p class="ures-lista">Még nincs kiválasztott időpont.</p>`;
    return;
  }

  kivalasztottIdopontok.forEach((idopont, index) => {
    const sor = document.createElement("div");

    sor.className = "kivalasztott-sor";

    sor.innerHTML = `
      <div class="kivalasztott-adat">
        <strong>${idopont.datum}</strong>
        <span>${idopont.ido}</span>
      </div>
      <button
        type="button"
        class="kivalasztott-torles"
        data-index="${index}">
        ×
      </button>
    `;

    kivalasztottLista.appendChild(sor);
  });
}

// =========================
// IDŐPONT HOZZÁADÁSA
// =========================

if (hozzaadGomb && datumInput && idoInput) {
  hozzaadGomb.addEventListener("click", () => {
    const datum = datumInput.value;
    const ido = idoInput.value;

    if (!datum || !ido) {
      alert("Adj meg dátumot és időpontot.");
      return;
    }

    const marVan = kivalasztottIdopontok.some(
      idopont =>
        idopont.datum === datum &&
        idopont.ido === ido
    );

    if (marVan) {
      alert("Ez az időpont már ki van választva.");
      return;
    }

    kivalasztottIdopontok.push({
      datum,
      ido
    });

    kirajzolKivalasztottIdopontok();
    idoInput.value = "";
  });
}

// =========================
// KIVÁLASZTOTT IDŐPONT TÖRLÉSE
// =========================

if (kivalasztottLista) {
  kivalasztottLista.addEventListener("click", (event) => {
    const gomb = event.target.closest(
      ".kivalasztott-torles"
    );

    if (!gomb) return;

    const index = Number(gomb.dataset.index);

    kivalasztottIdopontok.splice(index, 1);

    kirajzolKivalasztottIdopontok();
  });
}

// =========================
// ÖSSZES KIVÁLASZTOTT IDŐPONT MENTÉSE
// + PUSH ÉRTESÍTÉS KÜLDÉSE
// =========================

if (kuldesGomb) {
  kuldesGomb.addEventListener("click", async () => {
    if (kivalasztottIdopontok.length === 0) {
      alert(
        "Először adj hozzá legalább egy időpontot."
      );
      return;
    }

    try {
      kuldesGomb.disabled = true;
      kuldesGomb.textContent = "Mentés...";

      // =========================
      // IDŐPONTOK MENTÉSE
      // =========================

      await Promise.all(
        kivalasztottIdopontok.map((idopont) =>
          addDoc(
            collection(
              db,
              "felszabadultIdopontok"
            ),
            {
              datum: idopont.datum,
              ido: idopont.ido,
              createdAt: serverTimestamp()
            }
          )
        )
      );

      // =========================
      // PUSH ÉRTESÍTÉS KÜLDÉSE
      // =========================

      kuldesGomb.textContent =
        "Értesítés küldése...";

      try {
        const eredmeny =
          await sendAvailableAppointmentPush();

        const adat = eredmeny.data;

        console.log(
          "Push küldés eredménye:",
          adat
        );

        if (pushUsage) {
          pushUsage.textContent =
            `Havi push értesítések: ${adat.used} / ${adat.limit}`;
        }

        if (adat.sent > 0) {
          alert(
           `Az időpontok elmentve!\n\n` +
            `A push értesítés elküldve ${adat.sent} készülékre.\n `+
           `Havi felhasználás: ${adat.used} / ${adat.limit}`
          );
        } else {
          alert(
            "Az időpontok elmentve, de jelenleg nincs aktív push értesítésre feliratkozott készülék."
          );
        }
      } catch (pushError) {
        console.error(
          "Push értesítési hiba:",
          pushError
        );

        if (
          pushError.code ===
          "functions/resource-exhausted"
        ) {
          alert(
            "Az időpontok elmentve, de a havi 25 push értesítési limitet már elérted."
          );
        } else if (
          pushError.code ===
          "functions/unauthenticated"
        ) {
          alert(
            "Az időpontok elmentve, de a push értesítéshez újra be kell jelentkezned az admin felületre."
          );
        } else {
          alert(
            "Az időpontok elmentve, de a push értesítést nem sikerült elküldeni."
          );
        }

        await frissitPushUsage();
      }

      // =========================
      // ŰRLAP ÜRÍTÉSE
      // =========================

      kivalasztottIdopontok = [];

      kirajzolKivalasztottIdopontok();

      datumInput.value = "";
      idoInput.value = "";

      await betoltIdopontok();
      await frissitPushUsage();

    } catch (error) {
      console.error(
        "Mentési hiba:",
        error
      );

      alert(
        "Nem sikerült elmenteni az időpontokat."
      );
    } finally {
      kuldesGomb.disabled = false;
      kuldesGomb.textContent = "+ Mentés";
    }
  });
}

// =========================
// TÖRLÉS
// =========================

if (adminLista) {
  adminLista.addEventListener("click", async (event) => {
    const gomb = event.target.closest(
      ".torles-gomb"
    );

    if (!gomb) return;

    const biztos = confirm(
      "Biztosan törölni szeretnéd ezt az időpontot?"
    );

    if (!biztos) return;

    try {
      await deleteDoc(
        doc(
          db,
          "felszabadultIdopontok",
          gomb.dataset.id
        )
      );

      await betoltIdopontok();
    } catch (error) {
      console.error(
        "Törlési hiba:",
        error
      );

      alert(
        "Nem sikerült törölni az időpontot."
      );
    }
  });
}

// =========================
// ELSŐ BETÖLTÉS
// =========================

kirajzolKivalasztottIdopontok();
betoltIdopontok();