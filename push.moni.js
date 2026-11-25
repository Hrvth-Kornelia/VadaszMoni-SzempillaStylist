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
const button = document.getElementById("pushupbutton");

let messaging = null;
let swRegistration = null;

if (!button) {
  console.error("A pushupbutton gomb nem található.");
}

/* ========================================
   TOKEN ÉS ÉRTESÍTÉSI ÁLLAPOT
======================================== */

function getTokenDocumentId(token) {
  return encodeURIComponent(token);
}

function notificationsAreEnabled() {
  return localStorage.getItem("pushNotificationsEnabled") === "true";
}

async function setTokenActive(token, active) {
  if (!token) return;

  await setDoc(
    doc(db, "pushSubscribers", getTokenDocumentId(token)),
    {
      token,
      active,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

/* ========================================
   TOKENVÁLTOZÁS MEGJEGYZÉSE
======================================== */

function rememberPreviousToken(oldToken, newToken) {
  if (!oldToken || oldToken === newToken) return;

  const alreadyPending = localStorage.getItem("luxoriaPreviousFcmToken");

  if (!alreadyPending) {
    localStorage.setItem("luxoriaPreviousFcmToken", oldToken);
  }
}

function notifyTokenReady(oldToken, newToken) {
  window.dispatchEvent(
    new CustomEvent("luxoriaPushTokenReady", {
      detail: {
        oldToken: oldToken || null,
        newToken
      }
    })
  );
}

function saveCurrentToken(oldToken, newToken) {
  rememberPreviousToken(oldToken, newToken);

  localStorage.setItem("fcmToken", newToken);
  localStorage.setItem("pushNotificationsEnabled", "true");

  notifyTokenReady(oldToken, newToken);
}

/* ========================================
   GOMB MEGJELENÍTÉSE
======================================== */

function showEnabledState() {
  if (!button) return;

  button.classList.add("is-active");

  const icon = button.querySelector("i");
  const text = button.querySelector("span");

  if (icon) icon.className = "bi bi-bell-fill";
  if (text) text.textContent = "Bekapcsolva";

  button.setAttribute("aria-label", "Értesítések kikapcsolása");
}

function showDisabledState() {
  if (!button) return;

  button.classList.remove("is-active");

  const icon = button.querySelector("i");
  const text = button.querySelector("span");

  if (icon) icon.className = "bi bi-bell";
  if (text) text.textContent = "Bekapcsolás";

  button.setAttribute("aria-label", "Értesítések bekapcsolása");
}

/* ========================================
   FIREBASE MESSAGING ELŐKÉSZÍTÉSE
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
   ÚJ TOKEN AKTIVÁLÁSA
======================================== */

async function activateCurrentToken(newToken) {
  const oldToken = localStorage.getItem("fcmToken");

  await setTokenActive(newToken, true);

  saveCurrentToken(oldToken, newToken);
  showEnabledState();

  if (oldToken && oldToken !== newToken) {
    try {
      await setTokenActive(oldToken, false);
    } catch (error) {
      console.warn("A régi token letiltása nem sikerült:", error);
    }
  }
}

/* ========================================
   ÉRTESÍTÉSEK BEKAPCSOLÁSA
======================================== */

async function enableNotifications() {
  if (!button) return;

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

    await activateCurrentToken(newToken);

  } catch (error) {
    console.error("Bekapcsolási hiba:", error);

    if (notificationsAreEnabled()) {
      showEnabledState();
    } else {
      showDisabledState();
    }

    alert(error?.message || "Nem sikerült bekapcsolni az értesítéseket.");

  } finally {
    button.disabled = false;
  }
}

/* ========================================
   ÉRTESÍTÉSEK KIKAPCSOLÁSA
======================================== */

async function disableNotifications() {
  if (!button) return;

  button.disabled = true;

  const text = button.querySelector("span");
  if (text) text.textContent = "Kikapcsolás…";

  try {
    const savedToken = localStorage.getItem("fcmToken");

    if (savedToken) {
      await setTokenActive(savedToken, false);
    }

    localStorage.setItem("pushNotificationsEnabled", "false");
    showDisabledState();

  } catch (error) {
    console.error("Kikapcsolási hiba:", error);

    if (notificationsAreEnabled()) {
      showEnabledState();
    } else {
      showDisabledState();
    }

    alert("Nem sikerült kikapcsolni az értesítéseket. Próbáld újra.");

  } finally {
    button.disabled = false;
  }
}

/* ========================================
   GOMB KATTINTÁS
======================================== */

if (button) {
  button.addEventListener("click", async () => {
    if (notificationsAreEnabled()) {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  });
}

/* ========================================
   GOMB ÁLLAPOTÁNAK VISSZAÁLLÍTÁSA
======================================== */

async function restoreButtonState() {
  if (!button) return;

  if (!notificationsAreEnabled()) {
    showDisabledState();
    return;
  }

  try {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      localStorage.setItem("pushNotificationsEnabled", "false");
      showDisabledState();
      return;
    }

    const currentToken = await readCurrentToken();

    if (!currentToken) {
      showDisabledState();
      return;
    }

    await activateCurrentToken(currentToken);

  } catch (error) {
    console.error("Állapotellenőrzési hiba:", error);
    showDisabledState();
  }
}

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
      if (!notificationsAreEnabled()) return;

      const title = payload.notification?.title || payload.data?.title || "Luxória";

      const options = {
        body: payload.notification?.body || payload.data?.body || "",
        icon: "./icon.192.jfif",
        badge: "./192favicon.jfif",
        data: {
          url: payload.data?.url || window.location.href
        }
      };

      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        await registration.showNotification(title, options);
      }
    });

  } catch (error) {
    console.error("Foreground értesítési hiba:", error);
  }
})();