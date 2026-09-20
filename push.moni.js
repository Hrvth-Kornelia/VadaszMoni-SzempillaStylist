import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  isSupported
} from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";

import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";


/* =====================================================
   FIREBASE BEÁLLÍTÁSOK
===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyCsVHd8SfN0YzU3qB8dbOMQrdWBkZpLkjw",
  authDomain: "vadasz-monika-szempillastylist.firebaseapp.com",
  projectId: "vadasz-monika-szempillastylist",
  storageBucket: "vadasz-monika-szempillastylist.firebasestorage.app",
  messagingSenderId: "107835480232",
  appId: "1:107835480232:web:15ed130fd4c696d3b9ca9d",
  measurementId: "G-YYHW07BS7L"
};


const VAPID_KEY =
  "BHFV1phencVGPHON15Mikz3X0tixvXlj0HPt5npjQWdSo7zIyqDpdPZ7_33uz6Gadp-Zct613mLSZBRbiO-a21I";


/* =====================================================
   ALAPVÁLTOZÓK
===================================================== */

const button =
  document.getElementById("pushupbutton");

const app =
  initializeApp(firebaseConfig);

const db =
  getFirestore(app);

let messaging = null;
let swRegistration = null;


if (!button) {
  console.error(
    "A pushupbutton gomb nem található."
  );
}


/* =====================================================
   TOKEN DOKUMENTUM AZONOSÍTÓ
===================================================== */

/*
  Az FCM tokenből készítünk Firestore-ban
  használható dokumentumazonosítót.
*/

function getTokenDocumentId(token) {

  return encodeURIComponent(token);

}


/* =====================================================
   TOKEN MENTÉSE FIRESTORE-BA
===================================================== */

async function saveTokenToFirestore(token) {

  if (!token) {
    return;
  }

  await setDoc(
    doc(
      db,
      "pushSubscribers",
      getTokenDocumentId(token)
    ),
    {
      token: token,
      active: true,
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );

  console.log(
    "FCM token elmentve Firestore-ba."
  );

}


/* =====================================================
   TOKEN TÖRLÉSE FIRESTORE-BÓL
===================================================== */

async function removeTokenFromFirestore(token) {

  if (!token) {
    return;
  }

  await deleteDoc(
    doc(
      db,
      "pushSubscribers",
      getTokenDocumentId(token)
    )
  );

  console.log(
    "FCM token törölve Firestore-ból."
  );

}


/* =====================================================
   GOMB KINÉZETE
===================================================== */

function showEnabledState() {

  if (!button) return;

  button.classList.add("is-active");

  const icon =
    button.querySelector("i");

  const text =
    button.querySelector("span");


  if (icon) {
    icon.className =
      "bi bi-bell-fill";
  }

  if (text) {
    text.textContent =
      "Bekapcsolva";
  }


  button.setAttribute(
    "aria-label",
    "Értesítések kikapcsolása"
  );

}


function showDisabledState() {

  if (!button) return;

  button.classList.remove("is-active");

  const icon =
    button.querySelector("i");

  const text =
    button.querySelector("span");


  if (icon) {
    icon.className =
      "bi bi-bell";
  }

  if (text) {
    text.textContent =
      "Bekapcsolás";
  }


  button.setAttribute(
    "aria-label",
    "Értesítések bekapcsolása"
  );

}


/* =====================================================
   SERVICE WORKER + FIREBASE ELŐKÉSZÍTÉS
===================================================== */

async function prepareMessaging() {

  if (
    !("serviceWorker" in navigator)
  ) {

    throw new Error(
      "Ez a böngésző nem támogatja az értesítéseket."
    );

  }


  const supported =
    await isSupported();


  if (!supported) {

    throw new Error(
      "Ez az eszköz nem támogatja a Firebase értesítéseket."
    );

  }


  if (!messaging) {

    messaging =
      getMessaging(app);

  }


  if (!swRegistration) {

    swRegistration =
      await navigator
        .serviceWorker
        .register(
          "./service-worker.js",
          {
            scope: "./"
          }
        );


    await navigator
      .serviceWorker
      .ready;

  }


  return swRegistration;

}


/* =====================================================
   ÉRTESÍTÉSEK BEKAPCSOLÁSA
===================================================== */

async function enableNotifications() {

  if (!button) return;


  button.disabled = true;

  const text =
    button.querySelector("span");


  if (text) {

    text.textContent =
      "Bekapcsolás…";

  }


  try {

    await prepareMessaging();


    const permission =
      await Notification
        .requestPermission();


    if (
      permission !== "granted"
    ) {

      throw new Error(
        "Az értesítési engedély nem lett megadva."
      );

    }


    /*
      Firebase token létrehozása.
    */

    const token =
      await getToken(
        messaging,
        {

          vapidKey:
            VAPID_KEY,

          serviceWorkerRegistration:
            swRegistration

        }
      );


    if (!token) {

      throw new Error(
        "Nem sikerült létrehozni az értesítési azonosítót."
      );

    }


    console.log(
      "FCM token:",
      token
    );


    /*
      FONTOS:
      A tokent elmentjük Firestore-ba is.

      Ebből a pushSubscribers gyűjteményből
      fogja később a Cloud Function megtudni,
      hogy mely készülékeknek kell értesítést
      küldenie.
    */

    await saveTokenToFirestore(
      token
    );


    /*
      Helyi állapot mentése.
    */

    localStorage.setItem(
      "pushNotificationsEnabled",
      "true"
    );


    localStorage.setItem(
      "fcmToken",
      token
    );


    showEnabledState();


  } catch (error) {

    console.error(
      "Bekapcsolási hiba:",
      error
    );


    localStorage.removeItem(
      "pushNotificationsEnabled"
    );


    localStorage.removeItem(
      "fcmToken"
    );


    showDisabledState();


    alert(
      error?.message ||
      "Nem sikerült bekapcsolni az értesítéseket."
    );


  } finally {

    button.disabled = false;

  }

}


/* =====================================================
   ÉRTESÍTÉSEK KIKAPCSOLÁSA
===================================================== */

async function disableNotifications() {

  if (!button) return;


  button.disabled = true;


  const text =
    button.querySelector("span");


  if (text) {

    text.textContent =
      "Kikapcsolás…";

  }


  /*
    Még a localStorage törlése előtt
    elmentjük a jelenlegi tokent.
  */

  const savedToken =
    localStorage.getItem(
      "fcmToken"
    );


  try {

    await prepareMessaging();


    /*
      Firebase Messaging token törlése.
    */

    const deleted =
      await deleteToken(
        messaging
      );


    console.log(
      "Firebase token törölve:",
      deleted
    );


    /*
      Ha volt elmentett token,
      a Firestore pushSubscribers
      gyűjteményéből is töröljük.
    */

    if (savedToken) {

      await removeTokenFromFirestore(
        savedToken
      );

    }


    localStorage.removeItem(
      "pushNotificationsEnabled"
    );


    localStorage.removeItem(
      "fcmToken"
    );


    showDisabledState();


  } catch (error) {

    console.error(
      "Kikapcsolási hiba:",
      error
    );


    await restoreButtonState();


    alert(
      "Nem sikerült kikapcsolni az értesítéseket."
    );


  } finally {

    button.disabled = false;

  }

}


/* =====================================================
   GOMB KATTINTÁS
===================================================== */

if (button) {

  button.addEventListener(
    "click",
    async () => {

      const enabled =
        localStorage.getItem(
          "pushNotificationsEnabled"
        ) === "true";


      if (enabled) {

        await disableNotifications();

      } else {

        await enableNotifications();

      }

    }
  );

}


/* =====================================================
   GOMB ÁLLAPOTÁNAK VISSZAÁLLÍTÁSA
===================================================== */

async function restoreButtonState() {

  if (!button) return;


  try {

    const savedEnabled =
      localStorage.getItem(
        "pushNotificationsEnabled"
      ) === "true";


    if (!savedEnabled) {

      showDisabledState();

      return;

    }


    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {

      localStorage.removeItem(
        "pushNotificationsEnabled"
      );


      localStorage.removeItem(
        "fcmToken"
      );


      showDisabledState();

      return;

    }


    await prepareMessaging();


    const subscription =
      await swRegistration
        .pushManager
        .getSubscription();


    if (subscription) {

      /*
        Ha a feliratkozás továbbra is aktív,
        megpróbáljuk újra lekérni az aktuális
        Firebase tokent.

        Ha a Firebase időközben új tokent adott,
        az is bekerül Firestore-ba.
    */

      const token =
        await getToken(
          messaging,
          {

            vapidKey:
              VAPID_KEY,

            serviceWorkerRegistration:
              swRegistration

          }
        );


      if (token) {

        const oldToken =
          localStorage.getItem(
            "fcmToken"
          );


        /*
          Ha megváltozott a token,
          a régi Firestore dokumentumot
          eltávolítjuk.
        */

        if (
          oldToken &&
          oldToken !== token
        ) {

          try {

            await removeTokenFromFirestore(
              oldToken
            );

          } catch (error) {

            console.warn(
              "Régi token törlése nem sikerült:",
              error
            );

          }

        }


        /*
          Aktuális token biztos mentése.
        */

        await saveTokenToFirestore(
          token
        );


        localStorage.setItem(
          "fcmToken",
          token
        );

      }


      showEnabledState();


    } else {

      /*
        Nincs tényleges PushSubscription.
      */

      const oldToken =
        localStorage.getItem(
          "fcmToken"
        );


      if (oldToken) {

        try {

          await removeTokenFromFirestore(
            oldToken
          );

        } catch (error) {

          console.warn(
            "Inaktív token törlése nem sikerült:",
            error
          );

        }

      }


      localStorage.removeItem(
        "pushNotificationsEnabled"
      );


      localStorage.removeItem(
        "fcmToken"
      );


      showDisabledState();

    }


  } catch (error) {

    console.error(
      "Állapotellenőrzési hiba:",
      error
    );


    showDisabledState();

  }

}


/* =====================================================
   OLDAL BETÖLTÉSEKOR ÁLLAPOT ELLENŐRZÉS
===================================================== */

restoreButtonState();


/* =====================================================
   ÉRTESÍTÉS, HA AZ OLDAL NYITVA VAN
===================================================== */

(async () => {

  try {

    const supported =
      await isSupported();


    if (!supported) {

      return;

    }


    if (!messaging) {

      messaging =
        getMessaging(app);

    }


    onMessage(
      messaging,
      async (payload) => {

        console.log(
          "Értesítés érkezett:",
          payload
        );


        const title =
          payload.notification?.title ||
          payload.data?.title ||
          "Luxória Beauty Art";


        const options = {

          body:
            payload.notification?.body ||
            payload.data?.body ||
            "",

          icon:
            "./icon.192.jfif",

          badge:
            "./192favicon.jfif",

          data: {

            url:
              payload.data?.url ||
              window.location.href

          }

        };


        const registration =
          await navigator
            .serviceWorker
            .getRegistration();


        if (registration) {

          await registration
            .showNotification(
              title,
              options
            );

        }

      }
    );


  } catch (error) {

    console.error(
      "Foreground értesítési hiba:",
      error
    );

  }

})();