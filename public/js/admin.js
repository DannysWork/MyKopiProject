// Global variables
let orders = [];
let socket = io();
let adminToken = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    adminToken = localStorage.getItem('adminToken');
    
    if (!adminToken) {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
    } else {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        loadOrders();
        
        // Setup real-time updates
        socket.on('new-order', (orderData) => {
            showNotification(`New order from ${orderData.customerName}`);
            loadOrders(); // Refresh orders
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            filterOrders(e.target.dataset.status);
        });
    });
}

// Handle admin login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            adminToken = data.token;
            localStorage.setItem('adminToken', adminToken);
            checkAuth();
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    }
}

// Load orders
async function loadOrders() {
    if (!adminToken) return;
    
    try {
        const response = await fetch('/api/admin/orders', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.ok) {
            orders = await response.json();
            displayOrders(orders);
            updateStats();
        } else {
            showError('Failed to load orders');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showError('Error loading orders');
    }
}

// Display orders
function displayOrders(ordersToShow) {
    const ordersContainer = document.getElementById('ordersContainer');
    ordersContainer.innerHTML = '';
    
    if (ordersToShow.length === 0) {
        ordersContainer.innerHTML = '<p style="text-align: center; color: #666;">No orders found</p>';
        return;
    }
    
    ordersToShow.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersContainer.appendChild(orderCard);
    });
}

// Create order card
function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const createdTime = new Date(order.created_at).toLocaleTimeString();
    const customerName = order.customer_name || `${order.first_name || ''} ${order.last_name || ''}`.trim();
    
    // Use user profile picture if available, otherwise default
    let profilePicture = '/images/default-avatar.svg';
    if (order.profile_picture) {
        profilePicture = order.profile_picture;
    }
    
    card.innerHTML = `
        <div class="order-header">
            <div class="customer-info">
                <div class="customer-avatar">
                    <img src="${profilePicture}" alt="Customer" 
                         onerror="this.src='/images/default-avatar.svg'">
                </div>
                <div class="customer-details">
                    <h3>${customerName}</h3>
                    <p class="customer-contact">${order.customer_phone}</p>
                    ${order.customer_email ? `<p class="customer-email">${order.customer_email}</p>` : ''}
                </div>
            </div>
            <p class="order-id">Order #${order.id.substring(0, 8)}</p>
        </div>
        <div class="order-body">
            <span class="order-status status-${order.status}">
                ${getStatusIcon(order.status)} ${order.status.toUpperCase()}
            </span>
            <div class="order-info">
                <p><strong>Total:</strong> SGD ${parseFloat(order.total_amount).toFixed(2)}</p>
                <p><strong>Time:</strong> ${createdTime}</p>
                ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
            </div>
            <div class="order-actions">
                ${generateStatusButtons(order)}
            </div>
        </div>
    `;
    
    return card;
}

// Get status icon
function getStatusIcon(status) {
    const icons = {
        'pending': '<i class="fas fa-clock"></i>',
        'preparing': '<i class="fas fa-coffee"></i>',
        'ready': '<i class="fas fa-check-circle"></i>',
        'completed': '<i class="fas fa-flag-checkered"></i>',
        'cancelled': '<i class="fas fa-times-circle"></i>'
    };
    return icons[status] || '<i class="fas fa-question"></i>';
}

// Generate status buttons
function generateStatusButtons(order) {
    const statusFlow = ['pending', 'preparing', 'ready', 'completed'];
    const currentIndex = statusFlow.indexOf(order.status);
    
    if (order.status === 'completed' || order.status === 'cancelled') {
        return '<p style="color: #666; font-style: italic;">Order finalized</p>';
    }
    
    let buttons = '';
    
    // Next status button
    if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) {
        const nextStatus = statusFlow[currentIndex + 1];
        buttons += `
            <button class="status-btn status-btn-${nextStatus}" 
                    onclick="updateOrderStatus('${order.id}', '${nextStatus}')">
                ${getStatusIcon(nextStatus)} Mark as ${nextStatus}
            </button>
        `;
    }
    
    // Cancel button (only for pending and preparing orders)
    if (order.status === 'pending' || order.status === 'preparing') {
        buttons += `
            <button class="status-btn status-btn-cancelled" 
                    onclick="updateOrderStatus('${order.id}', 'cancelled')">
                <i class="fas fa-times"></i> Cancel
            </button>
        `;
    }
    
    return buttons;
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    if (!adminToken) return;
    
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            showNotification(`Order status updated to ${newStatus}`);
            loadOrders(); // Refresh orders
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to update status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Error updating order status');
    }
}

// Filter orders
function filterOrders(status) {
    if (status === 'all') {
        displayOrders(orders);
    } else {
        const filtered = orders.filter(order => order.status === status);
        displayOrders(filtered);
    }
}

// Update statistics
function updateStats() {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const todayOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at).toDateString();
        const today = new Date().toDateString();
        return orderDate === today;
    }).length;
    const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('todayOrders').textContent = todayOrders;
    document.getElementById('totalRevenue').textContent = `SGD ${totalRevenue.toFixed(2)}`;
}

// Logout
function logout() {
    localStorage.removeItem('adminToken');
    adminToken = null;
    window.location.reload();
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Show error
function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
} 