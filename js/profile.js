// js/profile.js

import { auth, db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Elements
const userInitial = document.getElementById('userInitial');
const profileModalBg = document.getElementById('profileModalBg');
const closeProfileBtn = document.getElementById('closeProfileBtn');

// Helper: Get current user UID from localStorage (set at login)
const userId = localStorage.getItem('userId');

// Populate profile modal with real user data from Firestore
async function populateProfileModal() {
    let uid = localStorage.getItem('userId');
    if (!uid && auth.currentUser) {
        uid = auth.currentUser.uid;
    }
    if (!uid) {
        alert("User not logged in.");
        return;
    }
    try {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const data = userDoc.data();
            document.getElementById('profileName').textContent = data.name || '';
            document.getElementById('profileEmail').textContent = data.email || '';
            document.getElementById('profilePhone').textContent = data.phone || '';
            document.getElementById('profileNumber').textContent = uid || '';
        } else {
            alert("User profile not found.");
        }
    } catch (err) {
        alert("Error fetching profile: " + err.message);
    }
}
// Show modal on profile icon click
userInitial.addEventListener('click', () => {
    populateProfileModal();
    profileModalBg.style.display = 'flex';
});

// Hide modal on close button click or background click
closeProfileBtn.addEventListener('click', () => {
    profileModalBg.style.display = 'none';
});
profileModalBg.addEventListener('click', (e) => {
    if (e.target === profileModalBg) {
        profileModalBg.style.display = 'none';
    }
});