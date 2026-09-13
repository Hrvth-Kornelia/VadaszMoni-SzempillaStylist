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

let messaging = null;
let swRegistration = null;


if (!button) {
  console.error(
    "A pushupbutton gomb nem található."
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


    /*
      iOS-on a PWA értesítéshez
      engedély szükséges.
    */

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

      FONTOS:
      ugyanazt a saját service workert
      adjuk át a Firebase-nek.
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
      Eltároljuk, hogy ezen az eszközön
      a felhasználó bekapcsolta.
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


  try {

    await prepareMessaging();


    /*
      EZ A FONTOS RÉSZ.

      Firebase esetében nem kézzel
      unsubscribe-oljuk a PushSubscriptiont,
      hanem a Firebase saját tokenjét töröljük.
    */

    const deleted =
      await deleteToken(
        messaging
      );


    console.log(
      "Firebase token törölve:",
      deleted
    );


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


    /*
      Ha hiba történt, újra megnézzük,
      valójában aktív-e még.
    */

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

    /*
      Ha nincs elmentve, hogy a vendég
      bekapcsolta, akkor kikapcsolt állapot.
    */

    const savedEnabled =
      localStorage.getItem(
        "pushNotificationsEnabled"
      ) === "true";


    if (!savedEnabled) {

      showDisabledState();

      return;

    }


    /*
      Ha a rendszerengedély már nincs meg,
      akkor nem tekintjük aktívnak.
    */

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


    /*
      Megnézzük, van-e tényleges
      böngészős push feliratkozás.
    */

    const subscription =
      await swRegistration
        .pushManager
        .getSubscription();


    if (subscription) {

      showEnabledState();

    } else {

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