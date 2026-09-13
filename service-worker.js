const CACHE =
  "app-cache-v12";


/* =====================================================
   ELŐRE CACHE-ELENDŐ FÁJLOK
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

self.addEventListener(
  "install",
  (event) => {

    self.skipWaiting();


    event.waitUntil(

      caches
        .open(CACHE)
        .then(
          async (cache) => {

            /*
              Ha egyetlen fájl hibázik,
              ne álljon le az egész SW telepítés.
            */

            await Promise.allSettled(

              ASSETS.map(
                (asset) =>
                  cache.add(asset)
              )

            );

          }
        )

    );

  }
);


/* =====================================================
   AKTIVÁLÁS
===================================================== */

self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      caches
        .keys()
        .then(
          (keys) => {

            return Promise.all(

              keys
                .filter(
                  (key) =>
                    key !== CACHE
                )
                .map(
                  (key) =>
                    caches.delete(key)
                )

            );

          }
        )
        .then(
          () =>
            self.clients.claim()
        )

    );

  }
);


/* =====================================================
   FETCH / CACHE KEZELÉS
===================================================== */

self.addEventListener(
  "fetch",
  (event) => {

    const request =
      event.request;


    /*
      Csak GET kérésekkel foglalkozunk.
    */

    if (
      request.method !== "GET"
    ) {

      return;

    }


    /*
      HTML:

      először internet,
      ha nincs internet → cache.
    */

    if (
      request.mode === "navigate"
    ) {

      event.respondWith(

        fetch(request)

          .then(
            (response) => {

              const copy =
                response.clone();


              caches
                .open(CACHE)
                .then(
                  (cache) => {

                    cache.put(
                      request,
                      copy
                    );

                  }
                );


              return response;

            }
          )

          .catch(
            () =>
              caches.match(request)
          )

      );


      return;

    }


    /*
      CSS + JAVASCRIPT:

      mindig a friss verziót próbáljuk
      először letölteni.
    */

    if (
      request.destination === "style" ||
      request.destination === "script"
    ) {

      event.respondWith(

        fetch(request)

          .then(
            (response) => {

              const copy =
                response.clone();


              caches
                .open(CACHE)
                .then(
                  (cache) => {

                    cache.put(
                      request,
                      copy
                    );

                  }
                );


              return response;

            }
          )

          .catch(
            () =>
              caches.match(request)
          )

      );


      return;

    }


    /*
      KÉPEK:

      először cache,
      ha nincs → internet.
    */

    if (
      request.destination === "image"
    ) {

      event.respondWith(

        caches
          .match(request)
          .then(
            async (cached) => {

              if (cached) {

                return cached;

              }


              try {

                const response =
                  await fetch(request);


                if (
                  response &&
                  response.ok
                ) {

                  const copy =
                    response.clone();


                  const cache =
                    await caches.open(
                      CACHE
                    );


                  await cache.put(
                    request,
                    copy
                  );

                }


                return response;


              } catch (error) {

                console.error(
                  "Kép letöltési hiba:",
                  error
                );


                throw error;

              }

            }
          )

      );


      return;

    }

  }
);


/* =====================================================
   FIREBASE IMPORT
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


const messaging =
  firebase.messaging();


/* =====================================================
   HÁTTÉRBEN ÉRKEZŐ ÜZENET
===================================================== */

messaging.onBackgroundMessage(
  (payload) => {

    console.log(
      "Háttérben érkezett Firebase üzenet:",
      payload
    );


    /*
      Ha a Firebase notification payloadot
      küld, azt az FCM általában automatikusan
      megjeleníti.

      Ha csak data payload érkezik,
      mi jelenítjük meg.
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
          payload.data.body ||
          "",

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


      self.registration
        .showNotification(
          title,
          options
        );

    }

  }
);


/* =====================================================
   ÉRTESÍTÉSRE KATTINTÁS
===================================================== */

self.addEventListener(
  "notificationclick",
  (event) => {

    event.notification.close();


    const targetUrl =
      event.notification.data?.url ||
      self.registration.scope;


    event.waitUntil(

      clients
        .matchAll({

          type: "window",

          includeUncontrolled: true

        })

        .then(
          async (clientList) => {

            /*
              Ha már nyitva van az oldal,
              arra váltunk.
            */

            for (
              const client of clientList
            ) {

              if (
                "focus" in client
              ) {

                try {

                  if (
                    "navigate" in client
                  ) {

                    await client.navigate(
                      targetUrl
                    );

                  }

                } catch (error) {

                  console.log(
                    "Navigációs hiba:",
                    error
                  );

                }


                return client.focus();

              }

            }


            /*
              Ha nincs nyitott oldal,
              újat nyitunk.
            */

            if (
              clients.openWindow
            ) {

              return clients
                .openWindow(
                  targetUrl
                );

            }

          }
        )

    );

  }
);