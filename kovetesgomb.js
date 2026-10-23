import{
initializeApp,
getApps,
getApp
}from"https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import{
getFirestore,
doc,
getDoc,
runTransaction
}from"https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";


// ========================
// FIREBASE
// ========================

const firebaseConfig={
apiKey: "AIzaSyCsVHd8SfN0YzU3qB8dbOMQrdWBkZpLkjw",
  authDomain: "vadasz-monika-szempillastylist.firebaseapp.com",
  projectId: "vadasz-monika-szempillastylist",
  storageBucket: "vadasz-monika-szempillastylist.firebasestorage.app",
  messagingSenderId: "107835480232",
  appId: "1:107835480232:web:15ed130fd4c696d3b9ca9d",
  measurementId: "G-YYHW07BS7L"
};

const app=getApps().length?getApp():initializeApp(firebaseConfig);
const db=getFirestore(app);


// ========================
// KÖVETÉS GOMB
// ========================

const btn=document.getElementById("followButton");
const text=document.getElementById("followButtonText");
const countText=document.getElementById("followerCount");

if(btn&&text&&countText){

let deviceId=localStorage.getItem("luxoriaDeviceId");

if(!deviceId){
deviceId=crypto.randomUUID
?crypto.randomUUID()
:"device-"+Date.now()+"-"+Math.random().toString(36).slice(2);

localStorage.setItem("luxoriaDeviceId",deviceId);
}

const profileRef=doc(db,"profiles","vadasz-monika");
const followerRef=doc(
db,
"profiles",
"vadasz-monika",
"followers",
deviceId
);

function setUI(active,count){

countText.textContent=count+" Követő";

text.textContent=active
?"Követed"
:"Követés";

const icon=btn.querySelector("i");

if(icon){
icon.className=active
?"bi bi-check-lg"
:"bi bi-plus-lg";
}

btn.classList.toggle("is-following",active);
btn.setAttribute("aria-pressed",active?"true":"false");
}


// ========================
// ADATOK BETÖLTÉSE
// ========================

async function loadFollow(){

try{

const [profile,follower]=await Promise.all([
getDoc(profileRef),
getDoc(followerRef)
]);

const count=profile.exists()
?(profile.data().followerCount||0)
:0;

setUI(follower.exists(),count);

}catch(error){

console.error("Követőszám betöltési hiba:",error);

}

}


// ========================
// KÖVETÉS / KIKÖVETÉS
// ========================

btn.addEventListener("click",async()=>{

btn.disabled=true;

try{

await runTransaction(db,async transaction=>{

const profile=await transaction.get(profileRef);
const follower=await transaction.get(followerRef);

const count=profile.exists()
?(profile.data().followerCount||0)
:0;

if(follower.exists()){

transaction.delete(followerRef);

transaction.set(
profileRef,
{
followerCount:Math.max(0,count-1)
},
{merge:true}
);

}else{

transaction.set(
followerRef,
{
followed:true
}
);

transaction.set(
profileRef,
{
followerCount:count+1
},
{merge:true}
);

}

});

await loadFollow();

}catch(error){

console.error("Követés hiba:",error);

}

btn.disabled=false;

});

loadFollow();

}