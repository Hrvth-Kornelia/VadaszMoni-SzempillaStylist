import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const firebaseConfig = {
  apiKey : "AIzaSyCsVHd8SfN0YzU3qB8dbOMQrdWBkZpLkjw" , 
  authDomain : "vadasz-monika-szempillastylist.firebaseapp.com" , 
  projectId : "vadasz-monika-szempillastylist" , 
  storageBucket : "vadasz-monika-szempillastylist.firebasestorage.app" , 
  messagingSenderId: "107835480232" , 
  appId : "1:107835480232:web:15ed130fd4c696d3b9ca9d" , 
  measurementID : "G-YYHW07BS7L"    
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const belepes = document.getElementById("belepes");
const hiba = document.getElementById("hiba");
const jelszoMutat = document.getElementById("jelszoMutat");

jelszoMutat.addEventListener("click", () => {
    password.type =
        password.type === "password" ? "text" : "password";
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    hiba.style.display = "none";
    belepes.disabled = true;
    belepes.textContent = "BELÉPÉS...";

    try {
        await signInWithEmailAndPassword(
            auth,
            email.value.trim(),
            password.value
        );

        window.location.href = "felszabadult-idopontok-adminoldal.html";

    } catch (error) {
        console.error(error);

        hiba.textContent =
            "Hibás e-mail cím vagy jelszó.";

        hiba.style.display = "block";
        password.value = "";

    } finally {
        belepes.disabled = false;
        belepes.textContent = "BELÉPÉS";
    }
});