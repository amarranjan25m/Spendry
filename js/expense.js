
        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
        import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
        import { getFirestore, collection, addDoc, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

        import { auth, db } from './firebase.js';
         

        let currentUser = null;
        let allExpenses = [];

        // Modal logic
        const expenseModal = document.getElementById('expenseModal');
        const addExpenseBtn = document.getElementById('addExpenseBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelModalBtn = document.getElementById('cancelModalBtn');
        const expenseForm = document.getElementById('expenseForm');
        const modalError = document.getElementById('modalError');

        function openModal() {
            expenseModal.classList.add('active');
            modalError.textContent = '';
            expenseForm.reset();
            document.getElementById('expenseDate').value = new Date().toISOString().slice(0,10);
        }
        function closeModal() {
            expenseModal.classList.remove('active');
        }
        addExpenseBtn.onclick = openModal;
        closeModalBtn.onclick = closeModal;
        cancelModalBtn.onclick = closeModal;
        window.onclick = function(event) {
            if (event.target === expenseModal) closeModal();
        };

        // Render expenses
        function renderExpenses(expenses) {
            const expensesList = document.getElementById('expensesList');
            const expenseCount = document.getElementById('expenseCount');
            expensesList.innerHTML = '';
            if (!expenses.length) {
                expensesList.innerHTML = `<div style="color:#888; padding:20px 0;">No expenses found.</div>`;
                expenseCount.textContent = '';
                updateSummaryCards([]);
                return;
            }
            expenses.forEach(exp => {
                expensesList.innerHTML += `
                    <div class="expense-item">
                        <div class="expense-details">
                            <div class="title">${exp.title}</div>
                            <div class="category">${exp.category}</div>
                        </div>
                        <div class="expense-amount">
                            <div class="amount">₹${Number(exp.amount).toLocaleString()}</div>
                            <div class="date">${formatDate(exp.date)}</div>
                        </div>
                    </div>
                `;
            });
            expenseCount.textContent = `Showing ${expenses.length} expense${expenses.length > 1 ? 's' : ''}`;
            updateSummaryCards(expenses);
        }

        function formatDate(dateStr) {
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        // Summary cards
        function updateSummaryCards(expenses) {
            const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
            document.getElementById('totalExpenses').textContent = `₹${total.toLocaleString()}`;
            document.getElementById('totalCount').textContent = `${expenses.length} expense${expenses.length > 1 ? 's' : ''}`;
            if (expenses.length) {
                // Top category
                const catMap = {};
                expenses.forEach(e => {
                    catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
                });
                let topCat = '', topAmt = 0;
                for (const cat in catMap) {
                    if (catMap[cat] > topAmt) {
                        topCat = cat;
                        topAmt = catMap[cat];
                    }
                }
                document.getElementById('topCategory').textContent = topCat;
                document.getElementById('topCategoryAmount').textContent = `₹${topAmt.toLocaleString()}`;
                document.getElementById('avgExpense').textContent = `₹${Math.round(total/expenses.length).toLocaleString()}`;
            } else {
                document.getElementById('topCategory').textContent = '-';
                document.getElementById('topCategoryAmount').textContent = '₹0';
                document.getElementById('avgExpense').textContent = '₹0';
            }
        }

        // Fetch expenses from Firestore
        async function fetchExpenses() {
            if (!currentUser) return;
            let q = query(
                collection(db, "expenses"),
                where("uid", "==", currentUser.uid)
            );
            const querySnapshot = await getDocs(q);
            allExpenses = [];
            querySnapshot.forEach(doc => {
                allExpenses.push({ id: doc.id, ...doc.data() });
            });
            applyFiltersAndRender();
        }

        // Add expense to Firestore
        expenseForm.onsubmit = async function(e) {
            e.preventDefault();
            modalError.textContent = '';
            const title = document.getElementById('expenseTitle').value.trim();
            const amount = Number(document.getElementById('expenseAmount').value);
            const category = document.getElementById('expenseCategory').value;
            const date = document.getElementById('expenseDate').value;
            if (!title || !amount || !category || !date) {
                modalError.textContent = "All fields are required.";
                return;
            }
            try {
                await addDoc(collection(db, "expenses"), {
                    uid: currentUser.uid,
                    title,
                    amount,
                    category,
                    date
                });
                closeModal();
                await fetchExpenses();
            } catch (err) {
                modalError.textContent = "Failed to add expense. Try again.";
            }
        };

        // Filtering and sorting
        function applyFiltersAndRender() {
            let filtered = [...allExpenses];
            const search = document.getElementById('searchInput').value.trim().toLowerCase();
            const cat = document.getElementById('categoryFilter').value;
            const sort = document.getElementById('sortFilter').value;
            if (search) {
                filtered = filtered.filter(e =>
                    e.title.toLowerCase().includes(search) ||
                    e.category.toLowerCase().includes(search)
                );
            }
            if (cat) {
                filtered = filtered.filter(e => e.category === cat);
            }
            if (sort === 'dateDesc') {
                filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            } else if (sort === 'amountDesc') {
                filtered.sort((a, b) => b.amount - a.amount);
            } else if (sort === 'amountAsc') {
                filtered.sort((a, b) => a.amount - b.amount);
            }
            renderExpenses(filtered);
        }
        document.getElementById('searchInput').oninput = applyFiltersAndRender;
        document.getElementById('categoryFilter').onchange = applyFiltersAndRender;
        document.getElementById('sortFilter').onchange = applyFiltersAndRender;

        // Auth check and fetch
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                currentUser = user;
                await fetchExpenses();
            }
        });
    