import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported
} from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";


const firebaseConfig = {
   apiKey : "AIzaSyCsVHd8SfN0YzU3qB8dbOMQrdWBkZpLkjw" , 
  authDomain : "vadasz-monika-szempillastylist.firebaseapp.com" , 
  projectId : "vadasz-monika-szempillastylist" , 
  storageBucket : "vadasz-monika-szempillastylist.firebasestorage.app" , 
  messagingSenderId : "107835480232" , 
  appId : "1:107835480232:web:15ed130fd4c696d3b9ca9d" , 
  measurmentId : "G-YYHW07BS7L" 
};

const VAPID_KEY =
  "BIFDs2CCbnr_zVYY7nY_EmU8Q4N2_uP7TNAjhR53XtvKiyztIor-Ag1QUoXAhl1JDjBHfWm-lK14BGAexMPuCCA";

const button = document.getElementById("pushupbutton");
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);


/* =========================
   GOMB ÁLLAPOTA
========================= */

function showEnabledState() {
  button.classList.add("is-active");
  button.querySelector("i").className = "bi bi-bell-fill";
  button.querySelector("span").textContent = "Bekapcsolva";
}

function showDisabledState() {
  button.classList.remove("is-active");
  button.querySelector("i").className = "bi bi-bell";
  button.querySelector("span").textContent = "Értesítések";
}


/* =========================
   BEKAPCSOLÁS
========================= */

async function enableNotifications() {
  button.disabled = true;
  button.querySelector("span").textContent = "Bekapcsolás…";

  try {
    if (!("serviceWorker" in navigator)) {
      throw new Error(
        "Ez a böngésző nem támogatja a service workert."
      );
    }

    if (!(await isSupported())) {
      throw new Error(
        "Ez a böngésző nem támogatja a Firebase értesítéseket."
      );
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error(
        "Az értesítési engedély nem lett megadva."
      );
    }

    const registration =
      await navigator.serviceWorker.register(
        "./service-worker.js"
      );

    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      throw new Error(
        "Nem sikerült létrehozni az értesítési azonosítót."
      );
    }

    console.log("FCM token:", token);

    localStorage.setItem(
      "pushNotificationsEnabled",
      "true"
    );

    showEnabledState();

  } catch (error) {
    console.error("Bekapcsolási hiba:", error);

    localStorage.removeItem(
      "pushNotificationsEnabled"
    );

    showDisabledState();
    alert(error.message);

  } finally {
    button.disabled = false;
  }
}


/* =========================
   KIKAPCSOLÁS
========================= */

async function disableNotifications() {
  button.disabled = true;
  button.querySelector("span").textContent = "Kikapcsolás…";

  try {
    const registration =
      await navigator.serviceWorker.getRegistration();

    if (!registration) {
      throw new Error(
        "A service worker nem található."
      );
    }

    const subscription =
      await registration.pushManager.getSubscription();

    if (subscription) {
      const success = await subscription.unsubscribe();

      if (!success) {
        throw new Error(
          "Nem sikerült megszüntetni a feliratkozást."
        );
      }
    }

    localStorage.removeItem(
      "pushNotificationsEnabled"
    );

    showDisabledState();

    alert("Az értesítések kikapcsolva.");

  } catch (error) {
    console.error("Kikapcsolási hiba:", error);

    showEnabledState();

    alert(
      "Nem sikerült kikapcsolni az értesítéseket."
    );

  } finally {
    button.disabled = false;
  }
}


/* =========================
   GOMB KATTINTÁS
========================= */

button.addEventListener("click", async () => {
  const enabled =
    localStorage.getItem(
      "pushNotificationsEnabled"
    ) === "true";

  if (enabled) {
    await disableNotifications();
  } else {
    await enableNotifications();
  }
});


/* =========================
   ÁLLAPOT ELLENŐRZÉSE
========================= */

async function restoreButtonState() {
  try {
    if (
      Notification.permission !== "granted" ||
      localStorage.getItem(
        "pushNotificationsEnabled"
      ) !== "true"
    ) {
      showDisabledState();
      return;
    }

    const registration =
      await navigator.serviceWorker.getRegistration();

    const subscription =
      await registration?.pushManager.getSubscription();

    if (subscription) {
      showEnabledState();
    } else {
      localStorage.removeItem(
        "pushNotificationsEnabled"
      );

      showDisabledState();
    }

  } catch (error) {
    console.error(
      "Állapot-ellenőrzési hiba:",
      error
    );

    showDisabledState();
  }
}

restoreButtonState();


/* =========================
   ÉRTESÍTÉS NYITOTT OLDALNÁL
========================= */

if (await isSupported()) {
  onMessage(messaging, (payload) => {
    console.log(
      "Értesítés érkezett:",
      payload
    );

    const title =
      payload.notification?.title ||
      "Vadász-Mónika-szempillastylist";

    const options = {
      body:
        payload.notification?.body || "",
      icon: "./icon.192.jfif"
    };

    new Notification(title, options);
  });
}