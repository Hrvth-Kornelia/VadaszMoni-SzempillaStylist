/* =====================================================
   LUXÓRIA – SERVICE WORKER
   FRISSÍTETT VERZIÓ
===================================================== */

const CACHE = "app-cache-v19";

const CACHE_PREFIX = "app-cache-";


/* =====================================================
   ELŐRE ELTÁROLT FÁJLOK
===================================================== */

const ASSETS = [
  "./manifest.json",
  "./192favicon.jfif",
  "./icon.192.jfif",
  "./icon.512.jfif",
  "./fo-profil-photo-moni.jfif"
];


/* =====================================================
   TELEPÍTÉS
===================================================== */

self.addEventListener("install", event => {

  event.waitUntil(
    (async () => {

      const cache = await caches.open(CACHE);

      await Promise.allSettled(
        ASSETS.map(async asset => {

          const url = new URL(asset, self.registration.scope);

          const response = await fetch(url, {
            cache: "no-store"
          });

          if (response.ok) {
            await cache.put(url, response);
          }

        })
      );

      await self.skipWaiting();

    })()
  );

});


/* =====================================================
   AKTIVÁLÁS
===================================================== */

self.addEventListener("activate", event => {

  event.waitUntil(
    (async () => {

      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key =>
            key.startsWith(CACHE_PREFIX) &&
            key !== CACHE
          )
          .map(key => caches.delete(key))
      );

      await self.clients.claim();

      console.log(
        "Luxória: új service worker aktiválva:",
        CACHE
      );

    })()
  );

});


/* =====================================================
   FRISSÍTÉSI SZABÁLYOK
===================================================== */

function mustBeFresh(request) {

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return false;
  }

  const pathname = url.pathname.toLowerCase();

  return (
    request.mode === "navigate" ||
    request.destination === "script" ||
    request.destination === "style" ||
    pathname.endsWith(".html") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css")
  );

}


/* =====================================================
   HTML, JAVASCRIPT ÉS CSS
   MINDIG FRISS LEKÉRÉS
===================================================== */

async function fetchFresh(request) {

  try {

    const response = await fetch(request, {
      cache: "no-store"
    });

    /*
      A szerver válaszát közvetlenül visszaadjuk.

      Ha a GitHub 404-et ad, akkor 404 marad.
      Nem töltünk be régi HTML- vagy JS-fájlt
      a gyorsítótárból.
    */

    return response;

  } catch (error) {

    console.warn(
      "Luxória: nem sikerült friss fájlt letölteni.",
      request.url
    );

    /*
      Nincs internet vagy a kérés sikertelen.

      Szándékosan NEM jelenítünk meg
      régebbi oldalverziót.
    */

    return new Response(
      "A Luxória oldal jelenleg nem érhető el. Ellenőrizd az internetkapcsolatodat, majd próbáld újra.",
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );

  }

}


/* =====================================================
   KÉPEK GYORSÍTÓTÁRA
===================================================== */

async function fetchImage(request) {

  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {

    const response = await fetch(request);

    if (response.ok) {

      const cache = await caches.open(CACHE);

      await cache.put(
        request,
        response.clone()
      );

    }

    return response;

  } catch (error) {

    console.warn(
      "Luxória: kép nem tölthető le.",
      request.url
    );

    return Response.error();

  }

}


/* =====================================================
   HÁLÓZATI KÉRÉSEK
===================================================== */

self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
    Firebase és más külső szolgáltatások
    kéréseit nem módosítjuk.
  */

  if (url.origin !== self.location.origin) {
    return;
  }

  /*
    HTML / JS / CSS:
    mindig friss változat.
  */

  if (mustBeFresh(request)) {

    event.respondWith(
      fetchFresh(request)
    );

    return;

  }

  /*
    Képek:
    gyorsítótár használata.
  */

  if (request.destination === "image") {

    event.respondWith(
      fetchImage(request)
    );

    return;

  }

  /*
    Minden más kérés normál módon fut.
  */

});


/* =====================================================
   FIREBASE IMPORTOK
===================================================== */

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);


/* =====================================================
   FIREBASE INICIALIZÁLÁS
===================================================== */

firebase.initializeApp({

  apiKey:
    "AIzaSyCsVHd8SfN0YzU3qB8dbOMQrdWBkZpLkjw",

  authDomain:
    "vadasz-monika-szempillastylist.firebaseapp.com",

  projectId:
    "vadasz-monika-szempillastylist",

  storageBucket:
    "vadasz-monika-szempillastylist.firebasestorage.app",

  messagingSenderId:
    "107835480232",

  appId:
    "1:107835480232:web:15ed130fd4c696d3b9ca9d",

  measurementId:
    "G-YYHW07BS7L"

});


const messaging = firebase.messaging();


/* =====================================================
   HÁTTÉRBEN ÉRKEZŐ PUSHÉRTESÍTÉSEK
===================================================== */

messaging.onBackgroundMessage(payload => {

  console.log(
    "Luxória: háttérben érkező üzenet.",
    payload
  );

  /*
    A Firebase notification típusú üzeneteit
    az FCM kezeli.

    Ha csak data érkezik,
    mi jelenítjük meg az értesítést.
  */

  if (
    !payload.notification &&
    payload.data
  ) {

    const title =
      payload.data.title ||
      "Luxória Beauty Art";

    const options = {

      body:
        payload.data.body || "",

      icon:
        "./icon.192.jfif",

      badge:
        "./192favicon.jfif",

      data: {
        url:
          payload.data.url ||
          self.registration.scope
      }

    };

    return self.registration.showNotification(
      title,
      options
    );

  }

});


/* =====================================================
   ÉRTESÍTÉSRE KATTINTÁS
===================================================== */

self.addEventListener("notificationclick", event => {

  event.notification.close();

  const requestedUrl =
    event.notification.data?.url ||
    self.registration.scope;

  /*
    Csak a Luxória webhelyén belüli
    URL-t nyitunk meg.
  */

  let targetUrl = self.registration.scope;

  try {

    const candidate = new URL(
      requestedUrl,
      self.registration.scope
    );

    const scopeUrl = new URL(
      self.registration.scope
    );

    if (
      candidate.origin === scopeUrl.origin &&
      candidate.pathname.startsWith(scopeUrl.pathname)
    ) {

      targetUrl = candidate.href;

    }

  } catch (error) {

    console.warn(
      "Luxória: érvénytelen értesítési URL."
    );

  }

  event.waitUntil(
    (async () => {

      const clientList = await clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      for (const client of clientList) {

        try {

          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }

          if ("focus" in client) {
            return await client.focus();
          }

        } catch (error) {

          console.warn(
            "Luxória: meglévő ablak nem nyitható."
          );

        }

      }

      if (clients.openWindow) {

        return clients.openWindow(
          targetUrl
        );

      }

    })()
  );

});