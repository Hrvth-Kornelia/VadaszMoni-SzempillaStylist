import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

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

const lista = document.getElementById("vendegTavolletLista");

const honapok = [
  "január",
  "február",
  "március",
  "április",
  "május",
  "június",
  "július",
  "augusztus",
  "szeptember",
  "október",
  "november",
  "december"
];

function datumFormazas(datum) {
  if (!datum) return "";

  const [ev, honap, nap] = datum.split("-");

  return `${ev}. ${honapok[Number(honap) - 1]} ${Number(nap)}.`;
}

function tavolletIkon(ok) {
  if (ok === "szabadsag") {
    return "bi-calendar2-minus";
  }

  if (ok === "betegseg") {
    return "bi-heart-pulse";
  }

  if (ok === "tovabbkepzes") {
    return "bi-mortarboard";
  }

  return "bi-calendar4";
}

function tavolletNev(ok) {
  if (ok === "szabadsag") {
    return "Szabadság";
  }

  if (ok === "betegseg") {
    return "Betegség";
  }

  if (ok === "tovabbkepzes") {
    return "Továbbképzés";
  }

  return "Távollét";
}

function maiDatum() {
  const most = new Date();

  const ev = most.getFullYear();

  const honap = String(
    most.getMonth() + 1
  ).padStart(2, "0");

  const nap = String(
    most.getDate()
  ).padStart(2, "0");

  return `${ev}-${honap}-${nap}`;
}

function uresAllapot() {
  lista.innerHTML = `
    <div class="nincs-tavollet-allapot">
      <div class="naptar-ikon">
        <i class="bi bi-calendar4"></i>
        <i class="bi bi-check-circle"></i>
      </div>

      <h2>
        Jelenleg nincs<br>
        tervezett távollét.
      </h2>

      <p>
        Minden a megszokott rend szerint működik.
      </p>
    </div>
  `;
}

if (lista) {
  const q = query(
    collection(db, "tavolletek"),
    orderBy("kezdoNap", "asc")
  );

  onSnapshot(
    q,

    (snapshot) => {
      lista.innerHTML = "";

      const ma = maiDatum();

      const aktualisTavolletek = [];

      snapshot.forEach((dokumentum) => {
        const adat = dokumentum.data();

        if (
          adat.utolsoNap &&
          adat.utolsoNap >= ma
        ) {
          aktualisTavolletek.push(adat);
        }
      });

      if (aktualisTavolletek.length === 0) {
        uresAllapot();
        return;
      }

      aktualisTavolletek.forEach((adat) => {
        const kartya = document.createElement("div");

        kartya.className = "tavollet-kartya";

        const kezdo = datumFormazas(adat.kezdoNap);
        const utolso = datumFormazas(adat.utolsoNap);

        let datumSzoveg = "";

        if (adat.kezdoNap === adat.utolsoNap) {
          datumSzoveg = kezdo;
        } else {
          datumSzoveg = `${kezdo} – ${utolso}`;
        }

        let uzenetResz = "";

        if (adat.uzenet) {
          uzenetResz = `
            <p class="tavollet-uzenet">
              ${adat.uzenet}
            </p>
          `;
        }

        kartya.innerHTML = `
          <div class="tavollet-ikon">
            <i class="bi ${tavolletIkon(adat.ok)}"></i>
          </div>

          <div class="tavollet-tartalom">
            <h2 class="tavollet-tipus">
              ${adat.okNev || tavolletNev(adat.ok)}
            </h2>

            <p class="tavollet-datum">
              ${datumSzoveg}
            </p>

            ${uzenetResz}
          </div>
        `;

        lista.appendChild(kartya);
      });
    },

    (error) => {
      console.error(
        "Távollétek figyelési hibája:",
        error
      );

      lista.innerHTML = `
        <p class="ures-lista">
          Nem sikerült betölteni a távolléteket.
        </p>
      `;
    }
  );
}