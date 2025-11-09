// Setup notification panel show/hide logic
export function setupNotificationSystem({ notificationBell, notificationPanel, notificationList }) {
    // Always show panel on bell click
    notificationBell.addEventListener('click', (e) => {
        notificationPanel.style.display = 'block';
        notificationBell.classList.remove('active');
        e.stopPropagation();
    });

    // Hide notification panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationPanel.contains(e.target) && e.target !== notificationBell) {
            notificationPanel.style.display = 'none';
        }
    });
}

// Generate and render notifications based on budgets
export function renderBudgetNotifications(budgets, notificationBell, notificationList) {
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