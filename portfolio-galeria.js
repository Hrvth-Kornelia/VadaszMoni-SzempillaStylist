const kepek = [
  "portfoliopilla5.jpg",
  "portfoliopilla2.jpg",
  "portfoliopilla3.jpg",
  "portfoliopilla4.jpg",
  "portfoliopilla1.jpg",
  "portfoliopilla6.jpg",
  "portfoliopilla7.jpg",
  "portfoliopilla8.jpg",
  "portfoliopilla9.jpg"
];

let aktualisKep = 0;
let touchKezdetX = 0;

const container = document.getElementById("kepekContainer");
const elozo = document.getElementById("elozo");
const kovetkezo = document.getElementById("kovetkezo");
const mobilPontok = document.getElementById("mobilPontok");

function lathatoKepekSzama() {
  if (window.innerWidth >= 1001) return 3;
  if (window.innerWidth >= 601) return 2;
  return 1;
}

function pontokFrissitese() {
  mobilPontok.innerHTML = "";

  if (window.innerWidth > 600) return;

  kepek.forEach((_, index) => {
    const pont = document.createElement("button");
    pont.className = "mobil-pont";

    if (index === aktualisKep) {
      pont.classList.add("aktiv");
    }

    pont.type = "button";
    pont.setAttribute("aria-label", `${index + 1}`. kép);

    pont.addEventListener("click", function () {
      aktualisKep = index;
      kepekFrissitese();
    });

    mobilPontok.appendChild(pont);
  });
}

function kepekFrissitese() {
  container.innerHTML = "";

  const darab = Math.min(lathatoKepekSzama(), kepek.length);

  for (let i = 0; i < darab; i++) {
    const index = (aktualisKep + i) % kepek.length;
    const img = document.createElement("img");

    img.src = kepek[index];
    img.alt = "Luxória Beauty Art portfólió";
    img.className = "galeria-kep";
    img.draggable = false;

    container.appendChild(img);
  }

  pontokFrissitese();
}

function kovetkezoKep() {
  aktualisKep++;

  if (aktualisKep >= kepek.length) {
    aktualisKep = 0;
  }

  kepekFrissitese();
}

function elozoKep() {
  aktualisKep--;

  if (aktualisKep < 0) {
    aktualisKep = kepek.length - 1;
  }

  kepekFrissitese();
}

kovetkezo.addEventListener("click", kovetkezoKep);
elozo.addEventListener("click", elozoKep);

container.addEventListener("touchstart", function (event) {
  if (window.innerWidth > 600) return;

  touchKezdetX = event.touches[0].clientX;
}, { passive: true });

container.addEventListener("touchend", function (event) {
  if (window.innerWidth > 600) return;

  const touchVegeX = event.changedTouches[0].clientX;
  const tavolsag = touchKezdetX - touchVegeX;

  if (Math.abs(tavolsag) < 45) return;

  if (tavolsag > 0) {
    kovetkezoKep();
  } else {
    elozoKep();
  }
}, { passive: true });

window.addEventListener("resize", kepekFrissitese);

kepekFrissitese();