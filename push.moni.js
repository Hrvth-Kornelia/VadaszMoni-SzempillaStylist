import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ========================================
   FIREBASE BEÁLLÍTÁSOK
======================================== */

const firebaseConfig = {
  apiKey: "AIzaSyCsVHd8SfN0YzU3qB8dbOMQrdWBkZpLkjw",
  authDomain: "vadasz-monika-szempillastylist.firebaseapp.com",
  projectId: "vadasz-monika-szempillastylist",
  storageBucket: "vadasz-monika-szempillastylist.firebasestorage.app",
  messagingSenderId: "107835480232",
  appId: "1:107835480232:web:15ed130fd4c696d3b9ca9d",
  measurementId: "G-YYHW07BS7L"
};

const VAPID_KEY = "BHFV1phencVGPHON15Mikz3X0tixvXlj0HPt5npjQWdSo7zIyqDpdPZ7_33uz6Gadp-Zct613mLSZBRbiO-a21I";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let messaging = null;
let swRegistration = null;

let actionVersion = 0;
let buttonBusy = false;

const button = document.getElementById("pushupbutton");

if (!button) {
  console.error("A pushupbutton gomb nem található.");
}

/* ========================================
   ÁLLAPOT ÉS TOKEN
======================================== */

function isEnabled() {
  return localStorage.getItem("pushNotificationsEnabled") === "true";
}

function tokenDocumentId(token) {
  return encodeURIComponent(token);
}

async function setTokenActive(token, active) {
  if (!token) return;

  await setDoc(
    doc(db, "pushSubscribers", tokenDocumentId(token)),
    {
      token,
      active,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

function saveToken(oldToken, newToken) {
  if (oldToken && oldToken !== newToken) {
    if (!localStorage.getItem("luxoriaPreviousFcmToken")) {
      localStorage.setItem("luxoriaPreviousFcmToken", oldToken);
    }
  }

  localStorage.setItem("fcmToken", newToken);

  window.dispatchEvent(
    new CustomEvent("luxoriaPushTokenReady", {
      detail: {
        oldToken: oldToken || null,
        newToken
      }
    })
  );
}

/* ========================================
   HARANG MEGJELENÍTÉSE
======================================== */

function showEnabledState() {
  if (!button) return;

  button.classList.add("is-active");
  button.setAttribute("aria-pressed", "true");
  button.setAttribute("aria-label", "Értesítések kikapcsolása");

  const icon = button.querySelector("i");
  const text = button.querySelector("span");

  if (icon) icon.className = "bi bi-bell-fill";
  if (text) text.textContent = "Aktív";
}

function showDisabledState() {
  if (!button) return;

  button.classList.remove("is-active");
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-label", "Értesítések bekapcsolása");

  const icon = button.querySelector("i");
  const text = button.querySelector("span");

  if (icon) icon.className = "bi bi-bell";
  if (text) text.textContent = "Inaktív";
}

function refreshButton() {
  if (isEnabled()) {
    showEnabledState();
  } else {
    showDisabledState();
  }
}

/* ========================================
   FIREBASE ELŐKÉSZÍTÉSE
======================================== */

async function prepareMessaging() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Ez a böngésző nem támogatja az értesítéseket.");
  }

  if (!(await isSupported())) {
    throw new Error("Ez az eszköz nem támogatja a Firebase értesítéseket.");
  }

  if (!messaging) {
    messaging = getMessaging(app);
  }

  if (!swRegistration) {
    swRegistration = await navigator.serviceWorker.register(
      "./service-worker.js",
      { scope: "./" }
    );

    await navigator.serviceWorker.ready;
  }

  return swRegistration;
}

async function readCurrentToken() {
  await prepareMessaging();

  return getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swRegistration
  });
}

/* ========================================
   BEKAPCSOLÁS
======================================== */

async function enableNotifications() {
  if (!button || buttonBusy) return;

  buttonBusy = true;
  ++actionVersion;
  button.disabled = true;

  const text = button.querySelector("span");
  if (text) text.textContent = "Bekapcsolás…";

  try {
    await prepareMessaging();

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error("Az értesítési engedély nem lett megadva.");
    }

    const newToken = await readCurrentToken();

    if (!newToken) {
      throw new Error("Nem sikerült létrehozni az értesítési azonosítót.");
    }

    const oldToken = localStorage.getItem("fcmToken");

    await setTokenActive(newToken, true);

    saveToken(oldToken, newToken);

    localStorage.setItem("pushNotificationsEnabled", "true");
    showEnabledState();

    if (oldToken && oldToken !== newToken) {
      try {
        await setTokenActive(oldToken, false);
      } catch (error) {
        console.warn("Régi token letiltási hiba:", error);
      }
    }

  } catch (error) {
    console.error("Bekapcsolási hiba:", error);
    alert(error?.message || "Nem sikerült bekapcsolni az értesítéseket.");

  } finally {
    buttonBusy = false;
    button.disabled = false;
    refreshButton();
  }
}

/* ========================================
   KIKAPCSOLÁS
======================================== */

async function disableNotifications() {
  if (!button || buttonBusy) return;

  buttonBusy = true;
  ++actionVersion;
  button.disabled = true;

  const savedToken = localStorage.getItem("fcmToken");

  // Azonnal kikapcsoljuk az értesítéseket
  // a helyi beállításban.
  // A push-tokent megtartjuk.
  localStorage.setItem("pushNotificationsEnabled", "false");
  showDisabledState();

  // Amíg a Firebase mentése tart,
  // a felirat: Kikapcsolás…
  const text = button.querySelector("span");
  if (text) text.textContent = "Kikapcsolás…";

  try {
    if (savedToken) {
      await setTokenActive(savedToken, false);
    }

  } catch (error) {
    console.error("Firebase kikapcsolási hiba:", error);

    alert(
      "A harang kikapcsolt állapotba került, " +
      "de a Firebase-ben nem sikerült menteni. " +
      "Az értesítések még megérkezhetnek."
    );

  } finally {
    buttonBusy = false;
    button.disabled = false;

    // A folyamat végén: Inaktív
    refreshButton();
  }
}

/* ========================================
   GOMB KATTINTÁS
======================================== */

if (button) {
  button.addEventListener("click", async event => {
    event.preventDefault();

    if (buttonBusy) return;

    if (isEnabled()) {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  });
}

/* ========================================
   INDULÁSKORI ÁLLAPOTELLENŐRZÉS
======================================== */

async function restoreButtonState() {
  if (!button) return;

  const startedVersion = actionVersion;

  refreshButton();

  if (!isEnabled()) return;

  try {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      if (startedVersion === actionVersion) {
        localStorage.setItem("pushNotificationsEnabled", "false");
        showDisabledState();
      }
      return;
    }

    const currentToken = await readCurrentToken();

    if (
      startedVersion !== actionVersion ||
      !isEnabled() ||
      !currentToken
    ) {
      return;
    }

    const oldToken = localStorage.getItem("fcmToken");

    await setTokenActive(currentToken, true);

    // Ha időközben kikapcsolták,
    // ne aktiválja újra a tokent.
    if (startedVersion !== actionVersion || !isEnabled()) {
      await setTokenActive(currentToken, false);
      return;
    }

    saveToken(oldToken, currentToken);
    showEnabledState();

    if (oldToken && oldToken !== currentToken) {
      try {
        await setTokenActive(oldToken, false);
      } catch (error) {
        console.warn("Régi token letiltási hiba:", error);
      }
    }

  } catch (error) {
    console.error("Állapotellenőrzési hiba:", error);

  } finally {
    if (startedVersion === actionVersion) {
      refreshButton();
    }
  }
}

refreshButton();
restoreButtonState();

/* ========================================
   ÉRTESÍTÉS NYITOTT OLDALON
======================================== */

(async () => {
  try {
    if (!(await isSupported())) return;

    if (!messaging) {
      messaging = getMessaging(app);
    }

    onMessage(messaging, async payload => {
      if (!isEnabled()) return;

      const title =
        payload.notification?.title ||
        payload.data?.title ||
        "Luxória";

      const options = {
        body:
          payload.notification?.body ||
          payload.data?.body ||
          "",
        icon: "./icon.192.jfif",
        badge: "./192favicon.jfif",
        data: {
          url: payload.data?.url || window.location.href
        }
      };

      const registration =
        await navigator.serviceWorker.getRegistration();

      if (registration) {
        await registration.showNotification(title, options);
      }
    });

  } catch (error) {
    console.error("Foreground értesítési hiba:", error);
  }
})();