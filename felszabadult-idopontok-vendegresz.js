import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot
} from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

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

const lista =
  document.getElementById("vendegIdopontLista");

const honapok = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December"
];

function datumReszekreBontas(datum) {
  const [ev, honap, nap] = datum.split("-");

  return {
    nap: String(Number(nap)),
    honap: honapok[Number(honap) - 1],
    ev: ev
  };
}

if (lista) {

  const q = query(
    collection(db, "felszabadultIdopontok"),
    orderBy("datum", "asc")
  );

  onSnapshot(
    q,
    (snapshot) => {

      lista.innerHTML = "";

      if (snapshot.empty) {
        lista.innerHTML = `
          <div class="nincs-idopont-allapot">
            <div class="naptar-ikon">
              <i class="bi bi-calendar4"></i>
              <i class="bi bi-clock"></i>
            </div>

            <h2>
              Jelenleg nincs<br>
              felszabadult időpont.
            </h2>

            <p>
              Érdemes később visszanézni.
            </p>
          </div>
        `;
        return;
      }

      snapshot.forEach((dokumentum) => {

        const adat = dokumentum.data();
        const datum = datumReszekreBontas(adat.datum);

        const sor = document.createElement("div");
        sor.className = "vendeg-idopont-sor";

        sor.innerHTML = `
          <div class="idopont-bal">
            <i class="bi bi-calendar4 idopont-kis-ikon"></i>

            <div class="idopont-datum-blokk">
              <span class="idopont-nap">${datum.nap}</span>
              <span class="idopont-honap">${datum.honap}</span>
              <span class="idopont-ev">${datum.ev}</span>
            </div>
          </div>

          <span class="idopont-elvalaszto"></span>

          <span class="idopont-ora">${adat.ido}</span>
        `;

        lista.appendChild(sor);

      });

    },
    (error) => {

      console.error(
        "Időpontok figyelési hibája:",
        error
      );

      lista.innerHTML = `
        <p class="ures-lista">
          Nem sikerült betölteni az időpontokat.
        </p>
      `;

    }
  );

}