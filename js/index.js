
        document.addEventListener('DOMContentLoaded', () => {
            // 1. Fake Authentication Check
            if (localStorage.getItem('isLoggedIn') !== 'true') {
                // If not logged in, redirect to the login page
                window.location.href = 'login.html';
                return; // Stop execution of the rest of the script/page load
            }

            // 2. Dynamic Welcome Message
            const userName = localStorage.getItem('userName') || 'User';
            const welcomeText = document.getElementById('welcomeMessage');
            if (welcomeText) {
                welcomeText.innerHTML = `Welcome back, <strong>${userName}</strong>! Here’s your financial overview.`;
            }

            // 3. Logout Functionality
            const logoutButton = document.getElementById('logoutBtn');
            if (logoutButton) {
                logoutButton.addEventListener('click', () => {
                    localStorage.setItem('isLoggedIn', 'false');
                    localStorage.removeItem('userName');
                    window.location.href = 'login.html';
                });
            }
        });
    