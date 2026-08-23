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
  apiKey : "AIzaSyCsVHd8SfN0YzU3qB8dbOMQrdWBkZpLkjw" , 
  authDomain : "vadasz-monika-szempillastylist.firebaseapp.com" , 
  projectId : "vadasz-monika-szempillastylist" , 
  storageBucket : "vadasz-monika-szempillastylist.firebasestorage.app" , 
  messagingSenderId: "107835480232" , 
  appId : "1:107835480232:web:15ed130fd4c696d3b9ca9d" , 
  measurementID : "G-YYHW07BS7L" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const lista =
  document.getElementById("vendegIdopontLista");

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
          <p class="ures-lista">
            Jelenleg nincs felszabadult időpont.
          </p>
        `;
        return;
      }

      snapshot.forEach((dokumentum) => {

        const adat =
          dokumentum.data();

        const sor =
          document.createElement("div");

        sor.className =
          "vendeg-idopont-sor";

        sor.innerHTML = `
          <strong>${adat.datum}</strong>
          <span>${adat.ido}</span>
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