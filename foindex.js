
// Mindig frissült CSS-s
document.addEventListener("DOMContentLoaded", () => {
  const css = document.getElementById("main-css");
  if (!css) return;

  const baseHref = css.getAttribute("href").split("?")[0];
  css.setAttribute("href", baseHref + "?v=" + Date.now());
});

console.log("betolthhhhhhhhhhhh");

function copytoclipboard(elementID){
    const text=document.getElementById(elementID).innerText;
    navigator.clipboard.writeText(text).then(()=>{
        alert('Másolva: ' + text);
    
    });
}

//A weboldal apkent telepitheto telefonra

let deferredPrompt;
const mentesnevjegykent = document.getElementById('mentesnevjegykent'); // A gomb ID-je

// Eltároljuk a telepítési promptot, ha elérhető
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// Gomb kattintás esemény
if (mentesnevjegykent) {
  mentesnevjegykent.addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Telepítés elfogadva');
        } else {
          console.log('Telepítés elutasítva');
        }
        deferredPrompt = null;
      });
    } else {
      alert('Ez az alkalmazás jelenleg nem telepíthető a böngésző által.');
    }
  });
}


//Megosztas Messengeren

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("shareMessengerBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const url = "https://hrvth-kornelia.github.io/Sminktetovalo/";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Megosztás",
          text: "Nézd meg ezt!",
          url
        });
        return;
      } catch (e) {}
    }

    const encoded = encodeURIComponent(url);
    window.location.href =
      "https://www.facebook.com/sharer/sharer.php?u=" + encoded;
    
  });
});

// 🔧 iOS visszalépés utáni layout javítás
// Megoldja, hogy Instagram / külső link után ne csússzon fel az oldal
// iPhone Safari cache-ből visszatéréskor újrarajzoljuk az oldalt

window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    document.body.style.display = "none";

    setTimeout(() => {
      document.body.style.display = "block";
    }, 50);
  }
});

// képernyő betöltődés + animációk

function luxoriaBetoltesBefejezese() {
    const loader = document.getElementById("luxoria-splash");

    function inditAnimaciokat() {
        document.querySelectorAll(".fade").forEach((elem, index) => {
            setTimeout(() => {
                elem.classList.add("show");
            }, index * 70);
        });

        document.querySelectorAll(".fade-up").forEach((elem, index) => {
            setTimeout(() => {
                elem.classList.add("show");
            }, index * 90);
        });
    }

    if (loader) {
        setTimeout(() => {
            loader.classList.add("luxoria-splash-hidden");
        }, 350);

        setTimeout(() => {
            loader.remove();
            inditAnimaciokat();
        }, 600);
    } else {
        inditAnimaciokat();
    }
}

// Ha az oldal már betöltődött, azonnal fusson le.
// Ha még nem, várja meg a betöltést.
if (document.readyState === "complete") {
    luxoriaBetoltesBefejezese();
} else {
    window.addEventListener(
        "load",
        luxoriaBetoltesBefejezese,
        { once: true }
    );
}

// ========================
// ANIMÁCIÓK
// ========================

document.addEventListener("DOMContentLoaded", function () {

    // PROFILKÉP - FADE IN
    document.querySelectorAll(".fadein").forEach(function (el) {

        el.style.animation = "none";

        requestAnimationFrame(function () {
            el.style.animation =
                "fadeIn 4s ease-in-out forwards";
        });

    });


    // SIENNA BLOOM + SZAKMA + TULAJDONOS
    // finoman oldalról érkezik
    document.querySelectorAll(".oldalrol-be").forEach(function (el) {

        el.style.animation = "none";

        requestAnimationFrame(function () {
            el.style.animation =
                "oldalrolBe 2s cubic-bezier(0.22, 1, 0.36, 1) forwards";
        });

    });

});

