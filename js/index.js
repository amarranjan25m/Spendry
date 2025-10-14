
        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
        import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
        import { auth, db } from './firebase.js';


       

        let currentUser = null;
        let budgets = [];
        let expenses = [];

        // Helper: Format date
        function formatDate(dateStr) {
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        // Helper: Get month label (e.g., "Jan 2024")
        function monthLabel(dateStr) {
            const d = new Date(dateStr);
            if (isNaN(d)) return '';
            return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
        }

        // Render summary cards
        function renderSummaryCards() {
            // Budget summary
            let totalBudget = 0, totalSpentBudget = 0;
            budgets.forEach(b => {
                totalBudget += Number(b.limit);
                totalSpentBudget += Number(b.spent);
            });
            const totalRemaining = totalBudget - totalSpentBudget;
            const percentBudget = totalBudget ? Math.min(100, (totalSpentBudget / totalBudget) * 100) : 0;

            // Expense summary
            const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
            const avgExpense = expenses.length ? Math.round(totalExpenses / expenses.length) : 0;
            // Top category
            const catMap = {};
            expenses.forEach(e => {
                catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
            });
            let topCat = '-', topAmt = 0;
            for (const cat in catMap) {
                if (catMap[cat] > topAmt) {
                    topCat = cat;
                    topAmt = catMap[cat];
                }
            }

            document.getElementById('summaryCards').innerHTML = `
                <div class="card">
                    <h3>Total Budget</h3>
                    <h2>₹${totalBudget.toLocaleString()}</h2>
                    <div class="subtext">Monthly allocation</div>
                </div>
                <div class="card">
                    <h3>Total Spent</h3>
                    <h2 style="color:var(--spent-color)">₹${totalSpentBudget.toLocaleString()}</h2>
                    <div class="subtext">${totalBudget ? (percentBudget.toFixed(1) + "% of budget") : "—"}</div>
                </div>
                <div class="card">
                    <h3>Remaining</h3>
                    <h2 style="color:${totalRemaining >= 0 ? 'var(--primary-color)' : 'var(--spent-color)'}">₹${totalRemaining.toLocaleString()}</h2>
                    <div class="subtext">${totalRemaining >= 0 ? "Under budget" : "Over budget"}</div>
                </div>
                <div class="card">
                    <h3>Total Expenses</h3>
                    <h2>₹${totalExpenses.toLocaleString()}</h2>
                    <div class="subtext">${expenses.length} expense${expenses.length !== 1 ? 's' : ''}</div>
                </div>
                <div class="card">
                    <h3>Top Category</h3>
                    <h2>${topCat}</h2>
                    <div class="subtext">₹${topAmt.toLocaleString()}</div>
                </div>
                <div class="card">
                    <h3>Average Expense</h3>
                    <h2>₹${avgExpense.toLocaleString()}</h2>
                    <div class="subtext">Per transaction</div>
                </div>
            `;
        }

        // Render recent expenses
        function renderRecentExpenses() {
            const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
            const recent = sorted.slice(0, 5);
            const el = document.getElementById('recentExpenses');
            if (!recent.length) {
                el.innerHTML = `<div style="color:#888;">No expenses yet.</div>`;
                return;
            }
            el.innerHTML = recent.map(e => `
                <div class="expense-item">
                    <div>
                        <span class="expense-title">${e.title}</span>
                        <span class="expense-cat">| ${e.category}</span>
                    </div>
                    <div>
                        <span class="expense-amt">₹${Number(e.amount).toLocaleString()}</span>
                        <span class="expense-date" style="margin-left:10px;">${formatDate(e.date)}</span>
                    </div>
                </div>
            `).join('');
        }

        // Render quick stats
        function renderQuickStats() {
            // For demo: count of unique groups (if you have group expenses, adjust logic)
            // Here, we assume all expenses are personal (no group field in your schema)
            const activeGroups = 0; // If you have group data, count here
            const personalExpenses = expenses.length;
            document.getElementById('quickStats').innerHTML = `
                Active Groups: ${activeGroups}<br>
                Personal Expenses: ${personalExpenses}<br>
                <span class="positive">All settled up!</span>
            `;
        }

        // Render bar chart (monthly expenses)
        function renderBarChart() {
            // Group expenses by month
            const monthMap = {};
            expenses.forEach(e => {
                const label = monthLabel(e.date);
                monthMap[label] = (monthMap[label] || 0) + Number(e.amount);
            });
            const labels = Object.keys(monthMap).sort((a, b) => {
                // Sort by date
                return new Date('01 ' + a) - new Date('01 ' + b);
            });
            const data = labels.map(l => monthMap[l]);
            // Destroy previous chart if exists
            if (window.barChartObj) window.barChartObj.destroy();
            window.barChartObj = new Chart(document.getElementById('barChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Expenses',
                        data,
                        backgroundColor: 'rgba(76,175,80,0.7)'
                    }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { callback: v => '₹' + v.toLocaleString() } }
                    }
                }
            });
        }

        // Render pie chart (category breakdown for this month)
        function renderPieChart() {
            // Get current month
            const now = new Date();
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();
            const catMap = {};
            expenses.forEach(e => {
                const d = new Date(e.date);
                if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
                    catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
                }
            });
            const labels = Object.keys(catMap);
            const data = labels.map(l => catMap[l]);
            const colors = [
                '#4CAF50', '#E53935', '#FFC107', '#2196F3', '#9C27B0', '#FF9800', '#009688'
            ];
            // Destroy previous chart if exists
            if (window.pieChartObj) window.pieChartObj.destroy();
            window.pieChartObj = new Chart(document.getElementById('pieChart').getContext('2d'), {
                type: 'pie',
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor: colors.slice(0, labels.length)
                    }]
                },
                options: {
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        // Fetch budgets and expenses, then render everything
        async function fetchAndRenderAll() {
            if (!currentUser) return;
            // Budgets
            const qBudgets = query(
                collection(db, "budgets"),
                where("ownerId", "==", currentUser.uid)
            );
            const snapBudgets = await getDocs(qBudgets);
            budgets = [];
            snapBudgets.forEach(doc => budgets.push({ id: doc.id, ...doc.data() }));

            // Expenses
            const qExpenses = query(
                collection(db, "expenses"),
                where("uid", "==", currentUser.uid)
            );
            const snapExpenses = await getDocs(qExpenses);
            expenses = [];
            snapExpenses.forEach(doc => expenses.push({ id: doc.id, ...doc.data() }));

            renderSummaryCards();
            renderRecentExpenses();
            renderQuickStats();
            renderBarChart();
            renderPieChart();
        }

        // Auth check and UI setup
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                currentUser = user;
                // Welcome message
                document.getElementById('userInitial').textContent =
                    (user.displayName ? user.displayName[0] : (user.email ? user.email[0].toUpperCase() : 'U'));
                document.getElementById('welcomeMessage').innerHTML =
                    `Welcome back, <strong>${user.displayName || user.email || 'User'}</strong>! Here’s your financial overview.`;
                await fetchAndRenderAll();
            }
        });

        // Logout logic
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await signOut(auth);
            localStorage.clear();
            window.location.href = 'login.html';
        });
        document.getElementById('logoutBtnSidebar').addEventListener('click', async (e) => {
            e.preventDefault();
            await signOut(auth);
            localStorage.clear();
            window.location.href = 'login.html';
        });

        // Export button (dummy)
        document.getElementById('exportBtn').addEventListener('click', () => {
            alert('Export functionality coming soon!');
        });
  