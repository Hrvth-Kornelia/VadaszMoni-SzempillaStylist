import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";


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


// =========================
// HTML ELEMEK
// =========================

const kezdoNapInput =
  document.getElementById("kezdoNap");

const utolsoNapInput =
  document.getElementById("utolsoNap");

const uzenetInput =
  document.getElementById("tavolletUzenet");

const karakterSzam =
  document.getElementById("karakterSzam");

const mentesGomb =
  document.getElementById("mentesKuldes");

const lista =
  document.getElementById("felvittTavolletek");


// =========================
// TÁVOLLÉT NEVE
// =========================

function tavolletNev(kod) {

  if (kod === "szabadsag") {
    return "Szabadság";
  }

  if (kod === "betegseg") {
    return "Betegség";
  }

  if (kod === "tovabbkepzes") {
    return "Továbbképzés";
  }

  return "Távollét";
}


// =========================
// TÁVOLLÉT IKON
// =========================

function tavolletIkon(kod) {

  if (kod === "szabadsag") {
    return "bi-calendar2-minus";
  }

  if (kod === "betegseg") {
    return "bi-heart-pulse";
  }

  if (kod === "tovabbkepzes") {
    return "bi-mortarboard";
  }

  return "bi-calendar4";
}


// =========================
// DÁTUM FORMÁZÁS
// =========================

function datumFormazas(datum) {

  if (!datum) {
    return "";
  }

  const [ev, honap, nap] =
    datum.split("-");

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

  return `${ev}. ${honapok[Number(honap) - 1]} ${Number(nap)}.`;
}


// =========================
// KARAKTERSZÁMLÁLÓ
// =========================

if (uzenetInput && karakterSzam) {

  uzenetInput.addEventListener(
    "input",
    () => {

      karakterSzam.textContent =
        uzenetInput.value.length;

    }
  );

}


// =========================
// ADMIN BEJELENTKEZÉS
// =========================

onAuthStateChanged(
  auth,
  (user) => {

    if (!user) {

      window.location.href =
        "admin-login-tavollet.html";

    }

  }
);


// =========================
// TÁVOLLÉT MENTÉSE
// =========================

if (mentesGomb) {

  mentesGomb.addEventListener(
    "click",
    async () => {

      const kijeloltOk =
        document.querySelector(
          'input[name="tavolletOka"]:checked'
        );

      const ok =
        kijeloltOk
          ? kijeloltOk.value
          : "";

      const kezdoNap =
        kezdoNapInput.value;

      const utolsoNap =
        utolsoNapInput.value;

      const uzenet =
        uzenetInput.value.trim();


      if (!ok) {

        alert(
          "Válaszd ki a távollét okát."
        );

        return;

      }


      if (!kezdoNap || !utolsoNap) {

        alert(
          "Add meg a kezdő és az utolsó napot."
        );

        return;

      }


      if (utolsoNap < kezdoNap) {

        alert(
          "Az utolsó nap nem lehet korábbi a kezdő napnál."
        );

        return;

      }


      try {

        mentesGomb.disabled = true;


        await addDoc(
          collection(
            db,
            "tavolletek"
          ),
          {
            ok: ok,
            okNev: tavolletNev(ok),
            kezdoNap: kezdoNap,
            utolsoNap: utolsoNap,
            uzenet: uzenet,
            createdAt: serverTimestamp()
          }
        );


        alert(
          "A távollét sikeresen elmentve."
        );


        kezdoNapInput.value = "";

        utolsoNapInput.value = "";

        uzenetInput.value = "";


        if (karakterSzam) {

          karakterSzam.textContent = "0";

        }


      } catch (error) {

        console.error(
          "Távollét mentési hiba:",
          error
        );

        alert(
          "Nem sikerült elmenteni a távollétet."
        );


      } finally {

        mentesGomb.disabled = false;

      }

    }
  );

}


// =========================
// FELVITT TÁVOLLÉTEK
// =========================

if (lista) {

  const q =
    query(
      collection(
        db,
        "tavolletek"
      ),
      orderBy(
        "kezdoNap",
        "asc"
      )
    );


  onSnapshot(
    q,
    (snapshot) => {

      lista.innerHTML = "";


      if (snapshot.empty) {

        lista.innerHTML = `
          <div class="ures-felvitt-lista">
            Még nincs felvitt távollét.
          </div>
        `;

        return;

      }


      snapshot.forEach(
        (dokumentum) => {

          const adat =
            dokumentum.data();


          const sor =
            document.createElement(
              "div"
            );


          sor.className =
            "felvitt-tavollet-sor";


          let uzenetResz = "";


          if (adat.uzenet) {

            uzenetResz = `
              <p class="felvitt-uzenet">
                ${adat.uzenet}
              </p>
            `;

          }


          sor.innerHTML = `
            <div class="felvitt-tavollet-adat">

              <div class="felvitt-tavollet-fej">

                <i class="bi ${tavolletIkon(adat.ok)}"></i>

                <strong>
                  ${adat.okNev || tavolletNev(adat.ok)}
                </strong>

              </div>

              <div class="felvitt-datum">
                ${datumFormazas(adat.kezdoNap)}
                –
                ${datumFormazas(adat.utolsoNap)}
              </div>

              ${uzenetResz}

            </div>

            <button
              type="button"
              class="tavollet-torles"
              data-id="${dokumentum.id}"
            >
              ×
            </button>
          `;


          lista.appendChild(
            sor
          );

        }
      );

    },

    (error) => {

      console.error(
        "Távollétek betöltési hibája:",
        error
      );

      lista.innerHTML = `
        <div class="ures-felvitt-lista">
          Nem sikerült betölteni a távolléteket.
        </div>
      `;

    }
  );

}


// =========================
// TÖRLÉS
// =========================

if (lista) {

  lista.addEventListener(
    "click",
    async (event) => {

      const gomb =
        event.target.closest(
          ".tavollet-torles"
        );


      if (!gomb) {
        return;
      }


      const biztos =
        confirm(
          "Biztosan törölni szeretnéd ezt a távollétet?"
        );


      if (!biztos) {
        return;
      }


      try {

        await deleteDoc(
          doc(
            db,
            "tavolletek",
            gomb.dataset.id
          )
        );


      } catch (error) {

        console.error(
          "Távollét törlési hiba:",
          error
        );

        alert(
          "Nem sikerült törölni a távollétet."
        );

      }

    }
  );

}