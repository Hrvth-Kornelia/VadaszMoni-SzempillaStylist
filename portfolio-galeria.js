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

const container = document.getElementById("kepekContainer");
const elozo = document.getElementById("elozo");
const kovetkezo = document.getElementById("kovetkezo");

function lathatoKepekSzama() {
  if (window.innerWidth >= 1001) {
    return 3;
  }

  if (window.innerWidth >= 601) {
    return 2;
  }

  return 1;
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

    container.appendChild(img);
  }
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

window.addEventListener("resize", kepekFrissitese);

kepekFrissitese();