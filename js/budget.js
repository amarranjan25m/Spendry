import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
    getFirestore, collection, getDocs, addDoc, 
    doc, setDoc, deleteDoc, query, where 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { auth, db } from './firebase.js';
import { setupNotificationSystem, renderBudgetNotifications } from './notification.js';

// Global variables
let currentUser = null;
let budgets = []; // This will hold the fetched budget data
let editingBudgetId = null; // Tracks which budget we are editing

// Predefined categories for the dropdown
const PREDEFINED_CATEGORIES = [
    'Food', 'Transport', 'Utilities', 'Entertainment', 
    'Shopping', 'Health', 'Education', 'Gifts', 'Other'
];

// --- DOM Elements ---
// Page elements
const summaryCards = document.getElementById('summaryCards');
const overallProgressText = document.getElementById('overallProgressText');
const overallProgressBar = document.getElementById('overallProgressBar');
const budgetCategories = document.getElementById('budgetCategories');

// Modal elements
const addBudgetBtn = document.getElementById('addBudgetBtn');
const budgetModalBg = document.getElementById('budgetModalBg');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const budgetForm = document.getElementById('budgetForm');
const modalError = document.getElementById('modalError');

// Form fields
const categorySelect = document.getElementById('category');
const limitInput = document.getElementById('limit');
const spentInput = document.getElementById('spent');
const modalTitle = budgetModalBg.querySelector('h2');
const modalSubmitBtn = budgetForm.querySelector('button[type="submit"]');

// Notification elements
const notificationBell = document.getElementById('notificationBell');
const notificationPanel = document.getElementById('notificationPanel');
const notificationList = document.getElementById('notificationList');

// User profile
const userInitial = document.getElementById('userInitial');

// --- Auth Handling ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Set user initial in navbar
        userInitial.textContent = (user.displayName ? user.displayName[0] : (user.email ? user.email[0].toUpperCase() : 'U'));
        
        // Initialize systems
        setupNotificationSystem({ notificationBell, notificationPanel, notificationList });
        populateCategoryDropdown();
        setupModalListeners();
        setupEventListeners();
        
        // Fetch and render all data
        fetchAndRenderBudgets();
    } else {
        // No user logged in
        window.location.href = 'login.html';
    }
});

// --- Modal and Form Logic ---

/**
 * Populates the category <select> dropdown
 */
function populateCategoryDropdown() {
    categorySelect.innerHTML = PREDEFINED_CATEGORIES.map(
        cat => `<option value="${cat}">${cat}</option>`
    ).join('');
}

/**
 * Sets up listeners for modal buttons (open, close, submit)
 */
function setupModalListeners() {
    // Open modal for ADDING
    addBudgetBtn.addEventListener('click', () => {
        editingBudgetId = null;
        budgetForm.reset();
        modalTitle.textContent = 'Add Budget Category';
        modalSubmitBtn.textContent = 'Add';
        categorySelect.disabled = false;
        modalError.textContent = '';
        budgetModalBg.style.display = 'flex';
    });

    // Close modal
    cancelModalBtn.addEventListener('click', closeModal);
    budgetModalBg.addEventListener('click', (e) => {
        if (e.target === budgetModalBg) {
            closeModal();
        }
    });

    // Handle form submission (for both Add and Edit)
    budgetForm.addEventListener('submit', handleFormSubmit);
}

/**
 * Closes the budget modal
 */
function closeModal() {
    budgetModalBg.style.display = 'none';
    editingBudgetId = null;
}

/**
 * Handles the submit event for the budget form
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    const category = categorySelect.value;
    const limit = parseFloat(limitInput.value);
    const spent = parseFloat(spentInput.value);

    // Validation
    if (isNaN(limit) || limit <= 0) {
        modalError.textContent = 'Please enter a valid limit (greater than 0).';
        return;
    }
    if (isNaN(spent) || spent < 0) {
        modalError.textContent = 'Please enter a valid spent amount (0 or more).';
        return;
    }
    if (spent > limit) {
         modalError.textContent = 'Spent amount cannot be greater than the limit.';
        return;
    }

    // Check for duplicates (only if adding new)
    const alreadyExists = budgets.some(
        b => b.category === category && b.id !== editingBudgetId
    );
    if (!editingBudgetId && alreadyExists) {
        modalError.textContent = `A budget for "${category}" already exists.`;
        return;
    }

    const budgetData = {
        category,
        limit,
        spent,
        ownerId: currentUser.uid
    };

    try {
        modalSubmitBtn.disabled = true;
        if (editingBudgetId) {
            // --- UPDATE existing budget ---
            const docRef = doc(db, "budgets", editingBudgetId);
            await setDoc(docRef, budgetData);
            modalSubmitBtn.textContent = 'Saving...';
        } else {
            // --- ADD new budget ---
            modalSubmitBtn.textContent = 'Adding...';
            await addDoc(collection(db, "budgets"), budgetData);
        }
        
        closeModal();
        await fetchAndRenderBudgets(); // Refresh all data

    } catch (error) {
        console.error("Error saving budget:", error);
        modalError.textContent = `Failed to save budget: ${error.message}`;
    } finally {
        modalSubmitBtn.disabled = false;
    }
}

/**
 * Opens the modal in "Edit" mode, pre-filled with budget data
 * @param {string} budgetId - The ID of the budget to edit
 */
function openEditModal(budgetId) {
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) return;

    editingBudgetId = budgetId;
    
    // Fill the form
    categorySelect.value = budget.category;
    limitInput.value = budget.limit;
    spentInput.value = budget.spent;

    // Set modal state
    modalTitle.textContent = 'Edit Budget';
    modalSubmitBtn.textContent = 'Save';
    categorySelect.disabled = true; // Don't allow changing category
    modalError.textContent = '';
    
    budgetModalBg.style.display = 'flex';
}

// --- Data Fetching and Rendering ---

/**
 * Fetches all budgets from Firestore and triggers render functions
 */
async function fetchAndRenderBudgets() {
    if (!currentUser) return;

    try {
        const q = query(collection(db, "budgets"), where("ownerId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        
        budgets = []; // Clear the array
        snapshot.forEach(doc => {
            budgets.push({ id: doc.id, ...doc.data() });
        });

        // Trigger all render functions
        renderSummaryCards();
        renderOverallProgress();
        renderBudgetCategories();
        
        // Update notifications
        renderBudgetNotifications(budgets, notificationBell, notificationList);

    } catch (error) {
        console.error("Error fetching budgets: ", error);
        // Handle error display
    }
}

/**
 * Renders the top 3 summary cards
 */
function renderSummaryCards() {
    const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudget - totalSpent;

    summaryCards.innerHTML = `
        <div class="card">
            <h3>Total Budget</h3>
            <div class="value">₹${totalBudget.toLocaleString('en-IN')}</div>
            <div class="subtext">Across ${budgets.length} categories</div>
        </div>
        <div class="card">
            <h3>Total Spent</h3>
            <div class="value spent">₹${totalSpent.toLocaleString('en-IN')}</div>
            <div class="subtext">This month</div>
        </div>
        <div class="card">
            <h3>Total Remaining</h3>
            <div class="value remaining" style="color: ${totalRemaining < 0 ? 'var(--error-color)' : 'var(--remaining-color)'};">
                ₹${totalRemaining.toLocaleString('en-IN')}
            </div>
            <div class="subtext">${totalRemaining < 0 ? 'Over budget' : 'In budget'}</div>
        </div>
    `;
}

/**
 * Renders the main "Overall Progress" bar
 */
function renderOverallProgress() {
    const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    
    let percent = 0;
    if (totalBudget > 0) {
        percent = (totalSpent / totalBudget) * 100;
    }
    
    // Cap at 100% for visual
    const displayPercent = Math.min(percent, 100);

    overallProgressText.textContent = `₹${totalSpent.toLocaleString('en-IN')} spent of ₹${totalBudget.toLocaleString('en-IN')}`;
    overallProgressBar.style.width = `${displayPercent}%`;
    
    // Add warning class if over 80%
    overallProgressBar.classList.toggle('warning', percent > 80);
}

/**
 * Renders the list of individual budget category cards
 */
function renderBudgetCategories() {
    if (budgets.length === 0) {
        budgetCategories.innerHTML = '<p class="subtext">No budgets set. Click "Add Budget" to get started!</p>';
        return;
    }

    budgetCategories.innerHTML = budgets.map(budget => {
        const remaining = budget.limit - budget.spent;
        let percent = 0;
        if (budget.limit > 0) {
            percent = (budget.spent / budget.limit) * 100;
        }
        const displayPercent = Math.min(percent, 100);
        
        let statusTag = '';
        if (percent > 100) {
            statusTag = `<div class="budget-status-tag" style="background-color: #fce8e6; color: var(--error-color);">Over Budget</div>`;
        } else if (percent > 80) {
            statusTag = `<div class="budget-status-tag">Nearing Limit</div>`;
        }

        return `
            <div class="category-card">
                <div class="category-header">
                    <h4>${budget.category}</h4>
                    <div class="category-actions">
                        <i class='bx bxs-edit edit-btn' data-id="${budget.id}" title="Edit Budget"></i>
                        <i class='bx bxs-trash delete-btn' data-id="${budget.id}" title="Delete Budget"></i>
                    </div>
                </div>
                <div class="category-info">
                    <div class="spent-amount">
                        <span class="spent-value">₹${budget.spent.toLocaleString('en-IN')}</span> / ₹${budget.limit.toLocaleString('en-IN')}
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar ${percent > 80 ? 'warning' : ''}" style="width: ${displayPercent}%;"></div>
                    </div>
                    <div class="progress-text">
                        <span>${percent.toFixed(0)}% Spent</span>
                        <span>₹${remaining.toLocaleString('en-IN')} ${remaining < 0 ? 'Over' : 'Left'}</span>
                    </div>
                    ${statusTag}
                </div>
            </div>
        `;
    }).join('');
}

// --- Event Listeners for Dynamic Content ---

/**
 * Sets up event listener on the parent container to handle clicks on dynamic buttons
 */
function setupEventListeners() {
    budgetCategories.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            // --- Handle EDIT click ---
            const budgetId = editBtn.dataset.id;
            openEditModal(budgetId);
        }

        if (deleteBtn) {
            // --- Handle DELETE click ---
            const budgetId = deleteBtn.dataset.id;
            const budget = budgets.find(b => b.id === budgetId);
            if (confirm(`Are you sure you want to delete the "${budget.category}" budget?`)) {
                handleDeleteBudget(budgetId);
            }
        }
    });
}

/**
 * Deletes a budget document from Firestore
 * @param {string} budgetId - The ID of the budget to delete
 */
async function handleDeleteBudget(budgetId) {
    try {
        await deleteDoc(doc(db, "budgets", budgetId));
        await fetchAndRenderBudgets(); // Refresh the UI
    } catch (error) {
        console.error("Error deleting budget:", error);
        alert(`Failed to delete budget: ${error.message}`);
    }
}