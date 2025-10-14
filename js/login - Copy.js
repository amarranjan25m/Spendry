// login.js
import { auth, db } from './firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Redirect if already logged in
if (localStorage.getItem('isLoggedIn') === 'true') {
    window.location.href = 'index.html';
}

// UI logic
let isSignIn = true;
const form = document.getElementById('authForm');
const submitButton = document.getElementById('submitButton');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const msgDiv = document.getElementById('msg');

// Switch between Sign In and Sign Up
function toggleAuthMode(signIn) {
    isSignIn = signIn;
    signInBtn.classList.toggle('active', isSignIn);
    signUpBtn.classList.toggle('active', !isSignIn);
    submitButton.textContent = isSignIn ? 'Sign In' : 'Sign Up';
    msgDiv.innerHTML = '';
}
signInBtn.addEventListener('click', () => toggleAuthMode(true));
signUpBtn.addEventListener('click', () => toggleAuthMode(false));

// Auth form submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgDiv.innerHTML = '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try {
        if (isSignIn) {
            // Sign In
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            await afterLogin(userCred.user);
        } else {
            // Sign Up
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            // Save user profile in Firestore
            const name = email.split('@')[0];
            await setDoc(doc(db, "users", userCred.user.uid), {
                name: name,
                email: email,
                createdAt: new Date().toISOString()
            });
            msgDiv.innerHTML = `<div class="success-msg">Sign up successful! Logging you in...</div>`;
            await afterLogin(userCred.user);
        }
    } catch (err) {
        let msg = err.message;
        if (msg.includes('auth/invalid-email')) msg = "Invalid email address.";
        if (msg.includes('auth/user-not-found')) msg = "No user found with this email.";
        if (msg.includes('auth/wrong-password')) msg = "Incorrect password.";
        if (msg.includes('auth/email-already-in-use')) msg = "Email already in use.";
        if (msg.includes('auth/weak-password')) msg = "Password should be at least 6 characters.";
        msgDiv.innerHTML = `<div class="error-msg">${msg}</div>`;
    }
});

// After login/signup: fetch user name, store in localStorage, redirect
async function afterLogin(user) {
    // Get user profile from Firestore
    let name = '';
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            name = userDoc.data().name || user.email.split('@')[0];
        } else {
            name = user.email.split('@')[0];
        }
    } catch {
        name = user.email.split('@')[0];
    }
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userName', name);
    setTimeout(() => { window.location.href = 'index.html'; }, 800);
}

  // Re-added the logout listener for the sidebar link
        document.getElementById('logoutBtnSidebar').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.setItem('isLoggedIn', 'false');
            localStorage.removeItem('userName');
            window.location.href = 'login.html';
        });