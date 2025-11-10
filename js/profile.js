// js/profile.js

import { auth, db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Elements
const userInitial = document.getElementById('userInitial');
const profileModalBg = document.getElementById('profileModalBg');
const closeProfileBtn = document.getElementById('closeProfileBtn');

// Get the new elements
const profileDetailsContainer = document.getElementById('profileDetailsContainer');
const profileLoader = document.getElementById('profileLoader');
const profileContent = document.getElementById('profileContent');

// Populate profile modal
async function populateProfileModal() {
    let uid = localStorage.getItem('userId');
    if (!uid && auth.currentUser) {
        uid = auth.currentUser.uid;
    }
    if (!uid) {
        alert("User not logged in.");
        return;
    }

    // --- 1. Show loading state ---
    profileLoader.style.display = 'block';
    profileContent.style.display = 'none';
    // Reset fields to avoid showing old data
    document.getElementById('profileName').textContent = '-';
    document.getElementById('profileEmail').textContent = '-';
    document.getElementById('profilePhone').textContent = '-';
    // if (document.getElementById('profileNumber')) {
    //     document.getElementById('profileNumber').textContent = '-';
    // }

    try {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            document.getElementById('profileName').textContent = data.name || 'N/A';
            document.getElementById('profileEmail').textContent = data.email || 'N/A';
            document.getElementById('profilePhone').textContent = data.phone || 'N/A';
            // if (document.getElementById('profileNumber')) {
            //     document.getElementById('profileNumber').textContent = uid || 'N/A';
            // }
        } else {
            alert("User profile not found.");
            document.getElementById('profileName').textContent = 'Not Found';
        }
    } catch (err) {
        alert("Error fetching profile: " + err.message);
        document.getElementById('profileName').textContent = 'Error';
    } finally {
        // --- 2. Hide loading state ---
        profileLoader.style.display = 'none';
        profileContent.style.display = 'block';
    }
}

// Show modal on profile icon click
userInitial.addEventListener('click', () => {
    profileModalBg.style.display = 'flex';
    populateProfileModal(); // Fetch data *after* showing the modal
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