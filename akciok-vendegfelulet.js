const akcioLista = document.getElementById("akcioLista");
const uresAllapot = document.getElementById("uresAllapot");

/* =========================
   SABLONKÉPEK
========================= */

const sablonKepek = {
    szempillarakas2D3D: "szempillarakas.akcio.kep.jfif",
    szempillarakas4D5D: "szempillarakas.akcio.kep.jfif",
    szempillarakas8D9D: "szempillarakas.akcio.kep.jfif",
    szempillatoltes: "akcio-szempillatoltes.jpg",
    szempillalifting: "akcio-szempillalifting.jpg",
    szemoldokstyling: "akcio-szemoldok-laminalas.jpg",
    szemoldokstylingextra: "akcio-szemoldokfestes.jpg",
    
};

/* =========================
   TESZT AKCIÓK
========================= */

const akciok = [
    {
        id: "akcio-1",
        tipus: "szempillarakas2D3D",
        kategoria: "Szempilla",
        nev: "Szempillarakás 2D-3D",
        leiras: "Természetes hatású, dúsabb és kifejezőbb tekintet.",
        eredetiAr: 17000,
        kedvezmeny: 20
    },
    {
        id: "akcio-2",
        tipus: "szempillalifting",
        kategoria: "Szempilla",
        nev: "Szempillalifting",
        leiras: "Nyitottabb, frissebb tekintet természetes hatással.",
        eredetiAr: 14000,
        kedvezmeny: 15
    }
];

/* =========================
   ÁR FORMÁZÁS
========================= */

function arFormazas(ar) {
    return new Intl.NumberFormat("hu-HU").format(ar) + " Ft";
}

/* =========================
   AKCIÓS ÁR
========================= */

function akciosArSzamitas(eredetiAr, kedvezmeny) {
    return Math.round(
        eredetiAr * (1 - kedvezmeny / 100)
    );
}

/* =========================
   SABLONKÉP KERESÉS
========================= */

function sablonKepKeres(tipus) {
    return sablonKepek[tipus] || sablonKepek.egyeb;
}

/* =========================
   MESSENGER MEGOSZTÁS
========================= */

function messengerMegosztas() {
    const link = encodeURIComponent(window.location.href);

    window.location.href =
        `fb-messenger://share/?link=${link}`;
}

/* =========================
   AKCIÓK KIRAJZOLÁSA
========================= */

function akciokKirajzolasa() {
    akcioLista.innerHTML = "";

    if (!akciok.length) {
        akcioLista.hidden = true;
        uresAllapot.hidden = false;
        return;
    }

    akcioLista.hidden = false;
    uresAllapot.hidden = true;

    akciok.forEach((akcio) => {
        const akciosAr = akciosArSzamitas(
            akcio.eredetiAr,
            akcio.kedvezmeny
        );

        const kep = sablonKepKeres(akcio.tipus);

        const kartya = document.createElement("article");

        kartya.className = "akcio-kartya";

        kartya.innerHTML = `
            <div class="akcio-kep-resz">

                <img
                    src="${kep}"
                    alt="${akcio.nev}"
                >

                <div class="akcio-badge">
                    <strong>-${akcio.kedvezmeny}%</strong>
                    <span>Akció</span>
                </div>

            </div>

            <div class="akcio-tartalom">

                <div class="akcio-kategoria">
                    ${akcio.kategoria}
                </div>

                <h2 class="akcio-nev">
                    ${akcio.nev}
                </h2>

                <p class="akcio-leiras">
                    ${akcio.leiras}
                </p>

                <div class="akcio-arak">

                    <div class="eredeti-ar">
                        ${arFormazas(akcio.eredetiAr)}
                    </div>

                    <div class="akcios-ar">
                        ${arFormazas(akciosAr)}
                    </div>

                </div>

                <div class="akcio-gombok">

                    <button
                        type="button"
                        class="ajanlas-gomb"
                        onclick="messengerMegosztas()"
                    >
                        Ajánld ismerősödnek
                        <i class="bi bi-messenger"></i>
                    </button>

                </div>

            </div>
        `;

        akcioLista.appendChild(kartya);
    });
}

/* =========================
   INDÍTÁS
========================= */

akciokKirajzolasa();