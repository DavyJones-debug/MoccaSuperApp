import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAcBFC_vOSHyJP89gGvguKPJ60G2BOoIvg", 
    authDomain: "moccasuperapp.firebaseapp.com", 
    projectId: "moccasuperapp", 
    storageBucket: "moccasuperapp.firebasestorage.app", 
    messagingSenderId: "966529708566", 
    appId: "1:966529708566:web:7f7bb39e7c6811e9c93b37", 
    measurementId: "G-CLCMR26YV6" 
};

const app = initializeApp(firebaseConfig); 

// Kata 'export' ini penting banget biar db & auth bisa dipanggil dari cafe.js
export const db = getFirestore(app); 
export const auth = getAuth(app); 
export const provider = new GoogleAuthProvider();