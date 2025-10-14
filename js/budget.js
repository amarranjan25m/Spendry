
        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
        import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
        import { where } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
        import { auth, db } from './firebase.js';


        // Authentication check
        let currentUser = null;
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                currentUser = user;
                document.getElementById('userInitial').textContent = (user.displayName ? user.displayName[0] : (user.email ? user.email[0].toUpperCase() : 'U'));
                fetchBudgets();
            }
        });

        // Modal logic
        const addBudgetBtn = document.getElementById('addBudgetBtn');
        const budgetModalBg = document.getElementById('budgetModalBg');
        const cancelModalBtn = document.getElementById('cancelModalBtn');
        const budgetForm = document.getElementById('budgetForm');
        const modalError = document.getElementById('modalError');

        addBudgetBtn.addEventListener('click', () => {
            budgetForm.reset();
            modalError.textContent = '';
            budgetModalBg.classList.add('active');
            budgetForm.onsubmit = defaultAddBudgetHandler; // Always reset to default add handler
        });
        cancelModalBtn.addEventListener('click', () => {
            budgetModalBg.classList.remove('active');
        });
        budgetModalBg.addEventListener('click', (e) => {
            if (e.target === budgetModalBg) budgetModalBg.classList.remove('active');
        });

        // Add Budget Form Submission (default handler)
        const defaultAddBudgetHandler = async (e) => {
            e.preventDefault();
            modalError.textContent = '';
            const category = document.getElementById('category').value.trim();
            const limit = parseFloat(document.getElementById('limit').value);
            const spent = parseFloat(document.getElementById('spent').value);
            if (!category || isNaN(limit) || isNaN(spent) || limit <= 0 || spent < 0) {
                modalError.textContent = "Please enter valid values.";
                return;
            }
            try {
                await addDoc(collection(db, "budgets"), {
                    ownerId: currentUser.uid, // <-- FIXED FIELD NAME
                    category,
                    limit,
                    spent,
                    createdAt: new Date().toISOString()
                });
                budgetModalBg.classList.remove('active');
                fetchBudgets();
            } catch (err) {
                modalError.textContent = "Failed to add budget. Try again.";
            }
        };
        budgetForm.onsubmit = defaultAddBudgetHandler;

        // Fetch Budgets and Render
        async function fetchBudgets() {
         const q = query(
  collection(db, "budgets"),
  where("ownerId", "==", currentUser.uid),
  orderBy("createdAt", "asc")
);
            const snapshot = await getDocs(q);
            let budgets = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.ownerId === currentUser.uid) { // <-- FIXED FIELD NAME
                    budgets.push({ ...data, id: docSnap.id });
                }
            });
            renderBudgets(budgets);
        }

        // Render Budgets
        function renderBudgets(budgets) {
            // Summary
            let totalBudget = 0, totalSpent = 0;
            budgets.forEach(b => {
                totalBudget += Number(b.limit);
                totalSpent += Number(b.spent);
            });
            const totalRemaining = totalBudget - totalSpent;
            const percent = totalBudget ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

            // Summary Cards
            document.getElementById('summaryCards').innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>Total Budget</h3>
                        <div class="summary-icon"><i class='bx bx-info-circle'></i></div>
                    </div>
                    <div class="value">₹${totalBudget.toLocaleString()}</div>
                    <div class="subtext">Monthly allocation</div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3>Total Spent</h3>
                        <div class="summary-icon"><i class='bx bx-trending-up'></i></div>
                    </div>
                    <div class="value spent">₹${totalSpent.toLocaleString()}</div>
                    <div class="subtext">${totalBudget ? (percent.toFixed(1) + "% of budget") : "—"}</div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3>Remaining</h3>
                        <div class="summary-icon"><i class='bx bx-info-circle'></i></div>
                    </div>
                    <div class="value remaining">₹${totalRemaining.toLocaleString()}</div>
                    <div class="subtext">${totalRemaining >= 0 ? "Under budget" : "Over budget"}</div>
                </div>
            `;

            // Overview
            document.getElementById('overallProgressText').textContent = `₹${totalSpent.toLocaleString()} / ₹${totalBudget.toLocaleString()}`;
            document.getElementById('overallProgressBar').style.width = percent + "%";
            document.getElementById('overallProgressBar').className = "progress-bar" + (percent >= 90 ? " warning" : "");

            // Categories
            const cats = budgets.map(b => {
                const catPercent = b.limit ? Math.min(100, (b.spent / b.limit) * 100) : 0;
                const remaining = b.limit - b.spent;
                let icon = `<i class='bx bx-check-circle'></i>`;
                let barClass = "progress-bar";
                let spentColor = "var(--primary-color)";
                let tag = "";
                if (catPercent >= 90) {
                    icon = `<i class='bx bxs-error-alt' style="color: var(--spent-color);"></i>`;
                    barClass += " warning";
                    spentColor = "var(--spent-color)";
                    tag = `<span class="budget-status-tag">Approaching budget limit</span>`;
                }
                return `
                <div class="category-card" data-id="${b.id}">
                    <div class="category-header">
                        <h4>${b.category} ${icon}</h4>
                        <div class="category-actions">
                            <i class='bx bx-edit' title="Edit" onclick="editBudget('${b.id}')"></i>
                            <i class='bx bx-trash' title="Delete" onclick="deleteBudget('${b.id}')"></i>
                        </div>
                    </div>
                    <p class="monthly-tag">monthly</p>
                    <div class="category-info">
                        <p>Spent <span class="spent-amount"><span class="spent-value" style="color:${spentColor}">₹${Number(b.spent).toLocaleString()}</span> / ₹${Number(b.limit).toLocaleString()}</span></p>
                    </div>
                    <div class="progress-bar-container"><div class="${barClass}" style="width: ${catPercent.toFixed(1)}%;"></div></div>
                    <div class="progress-text"><span>${catPercent.toFixed(1)}% used</span><span>₹${remaining >= 0 ? remaining.toLocaleString() : "0"} remaining</span></div>
                    ${tag}
                </div>
                `;
            }).join('');
            document.getElementById('budgetCategories').innerHTML = cats || `<p style="color:var(--text-light);font-size:1rem;">No budgets yet. Click "Add Budget" to create one.</p>`;
        }

        // Expose edit/delete for inline onclick
        window.editBudget = async function(id) {
            // Fetch budget
            const docRef = doc(db, "budgets", id);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return;
            const found = { ...docSnap.data(), id: docSnap.id };
            // Fill modal
            document.getElementById('category').value = found.category;
            document.getElementById('limit').value = found.limit;
            document.getElementById('spent').value = found.spent;
            modalError.textContent = '';
            budgetModalBg.classList.add('active');
            // On submit, update instead of add
            budgetForm.onsubmit = async (e) => {
                e.preventDefault();
                modalError.textContent = '';
                const category = document.getElementById('category').value.trim();
                const limit = parseFloat(document.getElementById('limit').value);
                const spent = parseFloat(document.getElementById('spent').value);
                if (!category || isNaN(limit) || isNaN(spent) || limit <= 0 || spent < 0) {
                    modalError.textContent = "Please enter valid values.";
                    return;
                }
                try {
                    // Only update editable fields, do NOT touch ownerId!
                    await updateDoc(doc(db, "budgets", id), {
                        category, limit, spent
                    });
                    budgetModalBg.classList.remove('active');
                    budgetForm.onsubmit = defaultAddBudgetHandler;
                    fetchBudgets();
                } catch (err) {
                    modalError.textContent = "Failed to update budget. Try again.";
                }
            };
        };

        window.deleteBudget = async function(id) {
            if (!confirm("Delete this budget category?")) return;
            try {
                await deleteDoc(doc(db, "budgets", id));
                fetchBudgets();
            } catch (err) {
                alert("Failed to delete. Try again.");
            }
        };

        // Logout on user profile click
        document.getElementById('userInitial').addEventListener('click', async () => {
            await signOut(auth);
            localStorage.clear();
            window.location.href = 'login.html';
        });
