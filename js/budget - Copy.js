import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { where } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { auth, db } from './firebase.js';

// Predefined categories from expense.js
const predefinedCategories = [
    "Travel",
    "Food",
    "Shopping",
    "Entertainment",
    "Health",
    "Education",
    "Utilities",
    "Miscellaneous"
];

// Authentication check
let currentUser = null;
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        currentUser = user;
        document.getElementById('userInitial').textContent = (user.displayName ? user.displayName[0] : (user.email ? user.email[0].toUpperCase() : 'U'));
        populateCategoryDropdown();
        fetchBudgets();
    }
});

// Populate predefined categories in the dropdown
function populateCategoryDropdown() {
    const categoryDropdown = document.getElementById('category');
    categoryDropdown.innerHTML = predefinedCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

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
            ownerId: currentUser.uid,
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
        if (data.ownerId === currentUser.uid) {
            budgets.push({ ...data, id: docSnap.id });
        }
    });
    renderBudgets(budgets);
    checkBudgetNotifications(budgets);
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
    const docRef = doc(db, "budgets", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const found = { ...docSnap.data(), id: docSnap.id };
    document.getElementById('category').value = found.category;
    document.getElementById('limit').value = found.limit;
    document.getElementById('spent').value = found.spent;
    modalError.textContent = '';
    budgetModalBg.classList.add('active');
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
            await updateDoc(doc(db, "budgets", id), { category, limit, spent });
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

// --- Notification System ---

const notificationBell = document.getElementById('notificationBell');
const notificationPanel = document.getElementById('notificationPanel');
const notificationList = document.getElementById('notificationList');

// Show/hide notification panel
notificationBell.addEventListener('click', () => {
    notificationPanel.style.display = notificationPanel.style.display === 'block' ? 'none' : 'block';
    // Remove bell highlight when opened
    notificationBell.classList.remove('active');
});

// Hide notification panel when clicking outside
document.addEventListener('click', (e) => {
    if (!notificationPanel.contains(e.target) && e.target !== notificationBell) {
        notificationPanel.style.display = 'none';
    }
});

// Generate notifications based on budgets
function checkBudgetNotifications(budgets) {
    let notifications = [];
    let overBudget = [];
    let approachingBudget = [];
    let recommendations = [];
    let tips = [];

    // Over budget and approaching budget
    budgets.forEach(b => {
        const percent = b.limit ? (b.spent / b.limit) * 100 : 0;
        if (b.spent > b.limit) {
            overBudget.push(b.category);
            notifications.push({
                type: 'alert',
                icon: "<i class='bx bxs-error-alt'></i>",
                message: `You have exceeded your budget for <strong>${b.category}</strong>. Consider reducing expenses in this category.`
            });
        } else if (percent >= 80) {
            approachingBudget.push(b.category);
            notifications.push({
                type: 'warning',
                icon: "<i class='bx bx-error'></i>",
                message: `You are approaching your budget limit for <strong>${b.category}</strong> (${percent.toFixed(1)}% used).`
            });
        }
    });

    // Recommendations (example: Food, Shopping)
    const food = budgets.find(b => b.category === "Food");
    if (food && food.spent > 0.7 * food.limit) {
        recommendations.push({
            type: 'recommendation',
            icon: "<i class='bx bx-bulb'></i>",
            message: `Try meal planning or cooking at home to save on <strong>Food</strong> expenses.`
        });
    }
    const shopping = budgets.find(b => b.category === "Shopping");
    if (shopping && shopping.spent > 0.6 * shopping.limit) {
        recommendations.push({
            type: 'recommendation',
            icon: "<i class='bx bx-bulb'></i>",
            message: `Consider postponing non-essential <strong>Shopping</strong> to stay within your budget.`
        });
    }
    notifications = notifications.concat(recommendations);

    // General financial tips (always show at least one)
    tips.push({
        type: 'tip',
        icon: "<i class='bx bx-info-circle'></i>",
        message: `Tip: Try to save at least <strong>20%</strong> of your income each month.`
    });
    tips.push({
        type: 'tip',
        icon: "<i class='bx bx-info-circle'></i>",
        message: `Tip: Review your budgets regularly and adjust as needed.`
    });
    notifications = notifications.concat(tips);

    // Render notifications
    notificationList.innerHTML = notifications.length
        ? notifications.map(n => `
            <div class="notification-item notification-${n.type}">
                <span class="notification-icon">${n.icon}</span>
                <span>${n.message}</span>
            </div>
        `).join('')
        : `<div class="notification-item">No notifications at this time.</div>`;

    // Highlight bell if any alerts or warnings
    if (overBudget.length > 0 || approachingBudget.length > 0) {
        notificationBell.classList.add('active');
        notificationBell.title = `${overBudget.length + approachingBudget.length} budget alert(s)!`;
    } else {
        notificationBell.classList.remove('active');
        notificationBell.title = '';
    }
}

// Logout on user profile click
document.getElementById('userInitial').addEventListener('click', async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = 'login.html';
});