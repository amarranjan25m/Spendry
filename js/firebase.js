// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBSFQmoSeZFWuAAa1FlRh-0KFhAj9wjQDQ",
    authDomain: "spendry-83327.firebaseapp.com",
    projectId: "spendry-83327",
    storageBucket: "spendry-83327.appspot.com",
    messagingSenderId: "423479822230",
    appId: "1:423479822230:web:6b588326c585cda714bfb7",
    measurementId: "G-Z2Z0N7LBZX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };