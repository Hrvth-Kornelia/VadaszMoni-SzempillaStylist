// Mindig frissült CSS
document.addEventListener("DOMContentLoaded",()=>{
const css=document.getElementById("main-css");
if(!css)return;

const baseHref=css.getAttribute("href").split("?")[0];
css.setAttribute("href",baseHref+"?v="+Date.now());
});

console.log("betolthhhhhhhhhhhh");

function copytoclipboard(elementID){
const text=document.getElementById(elementID).innerText;

navigator.clipboard.writeText(text).then(()=>{
alert("Másolva: "+text);
});
}


// ========================
// ÉRTESÍTŐ GOMB
// ========================

const pushButton=document.getElementById("pushupbutton");

async function frissitPushGomb(){

if(!pushButton)return;

const icon=pushButton.querySelector("i");
const text=pushButton.querySelector("span");

try{

if(
!("serviceWorker" in navigator) ||
!("PushManager" in window)
){

pushButton.classList.remove("is-active");

if(icon){
icon.className="bi bi-bell";
}

if(text){
text.textContent="Értesítő";
}

pushButton.setAttribute("aria-pressed","false");

return;
}

const registration=await navigator.serviceWorker.ready;
const subscription=await registration.pushManager.getSubscription();

if(subscription){

pushButton.classList.add("is-active");

if(icon){
icon.className="bi bi-bell-fill";
}

if(text){
text.textContent="Aktív";
}

pushButton.setAttribute("aria-pressed","true");

}else{

pushButton.classList.remove("is-active");

if(icon){
icon.className="bi bi-bell";
}

if(text){
text.textContent="Értesítő";
}

pushButton.setAttribute("aria-pressed","false");

}

}catch(error){

console.log("Értesítő állapot ellenőrzési hiba:",error);

pushButton.classList.remove("is-active");

if(icon){
icon.className="bi bi-bell";
}

if(text){
text.textContent="Értesítő";
}

pushButton.setAttribute("aria-pressed","false");

}

}


// Betöltéskor ellenőrizzük az állapotot
window.addEventListener("load",()=>{
frissitPushGomb();
});


// Kattintás után a push.moni.js elvégzi
// a fel- vagy leiratkozást,
// majd újraellenőrizzük az állapotot
if(pushButton){

pushButton.addEventListener("click",()=>{

setTimeout(()=>{
frissitPushGomb();
},400);

setTimeout(()=>{
frissitPushGomb();
},1200);

});

}


// Ha másik script változtatja az is-active osztályt,
// az ikon és a szöveg is automatikusan kövesse
if(pushButton){

const observer=new MutationObserver(()=>{

const icon=pushButton.querySelector("i");
const text=pushButton.querySelector("span");

if(pushButton.classList.contains("is-active")){

if(icon){
icon.className="bi bi-bell-fill";
}

if(text){
text.textContent="Aktív";
}

pushButton.setAttribute("aria-pressed","true");

}else{

if(icon){
icon.className="bi bi-bell";
}

if(text){
text.textContent="Értesítő";
}

pushButton.setAttribute("aria-pressed","false");

}

});

observer.observe(pushButton,{
attributes:true,
attributeFilter:["class"]
});

}


// ========================
// PWA TELEPÍTÉS
// ========================

let deferredPrompt;

const mentesnevjegykent=
document.getElementById("mentesnevjegykent");

window.addEventListener("beforeinstallprompt",(e)=>{
e.preventDefault();
deferredPrompt=e;
});

if(mentesnevjegykent){

mentesnevjegykent.addEventListener("click",()=>{

if(deferredPrompt){

deferredPrompt.prompt();

deferredPrompt.userChoice.then((choiceResult)=>{

if(choiceResult.outcome==="accepted"){
console.log("Telepítés elfogadva");
}else{
console.log("Telepítés elutasítva");
}

deferredPrompt=null;

});

}else{

alert(
"Ez az alkalmazás jelenleg nem telepíthető a böngésző által."
);

}

});

}


// ========================
// MEGOSZTÁS MESSENGEREN
// ========================

document.addEventListener("DOMContentLoaded",()=>{

const btn=
document.getElementById("shareMessengerBtn");

if(!btn)return;

btn.addEventListener("click",async()=>{

const url=
"https://hrvth-kornelia.github.io/Sminktetovalo/";

if(navigator.share){

try{

await navigator.share({
title:"Megosztás",
text:"Nézd meg ezt!",
url
});

return;

}catch(e){}

}

const encoded=
encodeURIComponent(url);

window.location.href=
"https://www.facebook.com/sharer/sharer.php?u="+encoded;

});

});


// ========================
// IOS VISSZALÉPÉS JAVÍTÁS
// ========================

window.addEventListener("pageshow",(event)=>{

if(event.persisted){

document.body.style.display="none";

setTimeout(()=>{

document.body.style.display="block";
frissitPushGomb();

},50);

}

});


// ========================
// BETÖLTÉS + ANIMÁCIÓK
// ========================

function luxoriaBetoltesBefejezese(){

const loader=
document.getElementById("luxoria-splash");

function inditAnimaciokat(){

document.querySelectorAll(".fade")
.forEach((elem,index)=>{

setTimeout(()=>{
elem.classList.add("show");
},index*70);

});

document.querySelectorAll(".fade-up")
.forEach((elem,index)=>{

setTimeout(()=>{
elem.classList.add("show");
},index*90);

});

}

if(loader){

setTimeout(()=>{
loader.classList.add("luxoria-splash-hidden");
},350);

setTimeout(()=>{

loader.remove();
inditAnimaciokat();

},600);

}else{

inditAnimaciokat();

}

}

if(document.readyState==="complete"){

luxoriaBetoltesBefejezese();

}else{

window.addEventListener(
"load",
luxoriaBetoltesBefejezese,
{once:true}
);

}


// ========================
// ANIMÁCIÓK
// ========================

document.addEventListener("DOMContentLoaded",function(){

// PROFILKÉP - FADE IN
document.querySelectorAll(".fadein")
.forEach(function(el){

el.style.animation="none";

requestAnimationFrame(function(){

el.style.animation=
"fadeIn 4s ease-in-out forwards";

});

});


// NÉV + SZAKMA
document.querySelectorAll(".oldalrol-be")
.forEach(function(el){

el.style.animation="none";

requestAnimationFrame(function(){

el.style.animation=
"oldalrolBe 2s cubic-bezier(0.22,1,0.36,1) forwards";

});

});

});