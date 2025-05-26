// Global variables
let cart = [];
let drinks = [];
let currentDrink = null;
let socket = io();
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    loadDrinks();
    loadCartFromStorage(); // Load cart from localStorage
    setupEventListeners();
    updateCartUI();
    updateNavigation();
});

// Load user data from localStorage
function loadUserData() {
    const userToken = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');
    
    if (userToken && userData) {
        currentUser = JSON.parse(userData);
        currentUser.token = userToken;
    }
}

// Load cart from localStorage
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Save cart to localStorage
function saveCartToStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Update navigation based on user status
function updateNavigation() {
    const navItems = document.querySelector('.nav-items');
    
    // Remove any existing dynamic navigation elements
    const existingUserNav = navItems.querySelector('.user-nav');
    const existingLoginBtn = navItems.querySelector('.login-btn');
    if (existingUserNav) existingUserNav.remove();
    if (existingLoginBtn) existingLoginBtn.remove();
    
    if (currentUser) {
        // User is logged in - show profile menu
        const userNav = document.createElement('div');
        userNav.className = 'user-nav';
        userNav.innerHTML = `
            <div class="user-profile" onclick="toggleUserMenu()">
                <img src="${currentUser.profilePicture || '/images/default-avatar.svg'}" 
                     alt="Profile" class="user-avatar" onerror="this.src='/images/default-avatar.svg'">
                <span class="user-name">${currentUser.firstName || currentUser.username}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="user-menu" id="userMenu">
                <a href="#" onclick="showProfile()"><i class="fas fa-user"></i> My Profile</a>
                <a href="#" onclick="showOrderHistory()"><i class="fas fa-history"></i> Order History</a>
                <a href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</a>
            </div>
        `;
        
        navItems.appendChild(userNav);
    } else {
        // User not logged in - show login button
        const loginBtn = document.createElement('button');
        loginBtn.className = 'login-btn';
        loginBtn.innerHTML = '<i class="fas fa-user"></i> Login';
        loginBtn.onclick = showQuickLogin;
        
        navItems.appendChild(loginBtn);
    }
}

// Toggle user menu
function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    userMenu.classList.toggle('active');
}

// Show profile modal
function showProfile() {
    document.getElementById('profileModal').classList.add('active');
    toggleUserMenu();
    loadProfile();
}

// Load profile data
async function loadProfile() {
    if (!currentUser || !currentUser.token) return;
    
    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });
        
        if (response.ok) {
            const profile = await response.json();
            
            // Update form fields
            document.getElementById('profileFirstName').value = profile.firstName || '';
            document.getElementById('profileLastName').value = profile.lastName || '';
            document.getElementById('profilePhone').value = profile.phone || '';
            document.getElementById('profileEmail').value = profile.email || '';
            
            // Update profile picture
            const profileImg = document.getElementById('profilePreview');
            const fallbackIcon = document.querySelector('#profileModal .profile-preview i');
            
            if (profile.profilePicture) {
                profileImg.src = profile.profilePicture;
                profileImg.style.display = 'block';
                if (fallbackIcon) fallbackIcon.style.display = 'none';
            } else {
                profileImg.src = '/images/default-avatar.svg';
                profileImg.style.display = 'block';
                if (fallbackIcon) fallbackIcon.style.display = 'none';
            }
            
            // Handle image load error
            profileImg.onerror = function() {
                this.style.display = 'none';
                if (fallbackIcon) fallbackIcon.style.display = 'block';
            };
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Update profile
async function updateProfile(e) {
    e.preventDefault();
    
    if (!currentUser || !currentUser.token) return;
    
    const formData = new FormData(e.target);
    const profileData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone')
    };
    
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            // Update local user data
            currentUser.firstName = profileData.firstName;
            currentUser.lastName = profileData.lastName;
            currentUser.phone = profileData.phone;
            localStorage.setItem('userData', JSON.stringify(currentUser));
            
            showNotification('Profile updated successfully!');
            updateNavigation();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile');
    }
}

// Upload profile picture
async function uploadProfilePicture(e) {
    const file = e.target.files[0];
    if (!file || !currentUser || !currentUser.token) return;
    
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    try {
        const response = await fetch('/api/auth/profile/picture', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update profile picture display
            const profileImg = document.getElementById('profilePreview');
            const fallbackIcon = document.querySelector('#profileModal .profile-preview i');
            
            profileImg.src = result.profilePicture;
            profileImg.style.display = 'block';
            if (fallbackIcon) fallbackIcon.style.display = 'none';
            
            // Update user data
            currentUser.profilePicture = result.profilePicture;
            localStorage.setItem('userData', JSON.stringify(currentUser));
            
            // Update navigation avatar
            const userAvatar = document.querySelector('.user-avatar');
            if (userAvatar) {
                userAvatar.src = result.profilePicture;
            }
            
            showNotification('Profile picture updated successfully!');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to upload profile picture');
        }
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        showNotification('Error uploading profile picture');
    }
}

// Show order history
function showOrderHistory() {
    // This could be expanded to show user's order history
    // For now, just show a simple notification
    showNotification('Order history feature coming soon!');
    toggleUserMenu();
}

// Logout user
function logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    currentUser = null;
    
    showNotification('Logged out successfully');
    
    // Reload page to update navigation
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Setup event listeners
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            filterDrinks(e.target.dataset.filter);
        });
    });

    // Checkout form
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
    
    // Quick login form
    document.getElementById('quickLoginForm').addEventListener('submit', handleQuickLogin);
    
    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
        const userMenu = document.getElementById('userMenu');
        const userProfile = document.querySelector('.user-profile');
        
        if (userMenu && userProfile && !userProfile.contains(e.target)) {
            userMenu.classList.remove('active');
        }
    });
    
    // Initialize Google OAuth
    initializeMainPageGoogleOAuth();
}

// Load drinks from API
async function loadDrinks() {
    try {
        const response = await fetch('/api/drinks');
        drinks = await response.json();
        displayDrinks(drinks);
    } catch (error) {
        console.error('Error loading drinks:', error);
    }
}

// Display drinks
function displayDrinks(drinksToShow) {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    drinksToShow.forEach(drink => {
        const drinkIcon = getCategoryIcon(drink.category);
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        menuItem.innerHTML = `
            <div class="menu-item-image">
                <i class="fas ${drinkIcon}"></i>
            </div>
            <div class="menu-item-content">
                <h3 class="menu-item-name">${drink.name}</h3>
                <p class="menu-item-description">${drink.description}</p>
                <div class="menu-item-footer">
                    <span class="menu-item-price">SGD ${parseFloat(drink.price).toFixed(2)}</span>
                    <button class="add-btn" onclick="showCustomizeModal(${drink.id})">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
            </div>
        `;
        menuGrid.appendChild(menuItem);
    });
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        'Coffee': 'fa-coffee',
        'Specialty': 'fa-star',
        'Tea': 'fa-leaf',
        'Wellness': 'fa-heart'
    };
    return icons[category] || 'fa-mug-hot';
}

// Filter drinks
function filterDrinks(filter) {
    if (filter === 'all') {
        displayDrinks(drinks);
    } else {
        const filtered = drinks.filter(drink => drink.category === filter);
        displayDrinks(filtered);
    }
}

// Show customize modal for adding new item
function showCustomizeModal(drinkId) {
    currentDrink = drinks.find(d => d.id === drinkId);
    if (!currentDrink) return;

    const form = document.getElementById('customizeForm');
    
    // Reset the form
    form.reset();
    document.getElementById('quantity').value = 1;
    
    // Update modal title and button
    document.getElementById('customizeTitle').textContent = `Customize ${currentDrink.name}`;
    const submitButton = form.querySelector('.add-to-cart-btn');
    submitButton.textContent = 'Add to Cart';
    
    // Remove any existing event listeners by cloning and replacing the form
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add the new event listener
    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddToCart(e);
    });
    
    // Show the modal
    document.getElementById('customizeModal').classList.add('active');
}

// Show edit modal for modifying existing item
function showEditItemModal(itemId) {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    currentDrink = drinks.find(d => d.id === item.drinkId);
    if (!currentDrink) return;

    const form = document.getElementById('customizeForm');
    
    // Set current values
    form.querySelector(`input[name="size"][value="${item.size}"]`).checked = true;
    form.querySelector(`input[name="sugarLevel"][value="${item.sugarLevel}"]`).checked = true;
    form.querySelector(`input[name="iceLevel"][value="${item.iceLevel}"]`).checked = true;
    document.getElementById('quantity').value = item.quantity;
    
    // Update modal title and button
    document.getElementById('customizeTitle').textContent = `Modify ${item.name}`;
    const submitButton = form.querySelector('.add-to-cart-btn');
    submitButton.textContent = 'Modify';
    
    // Remove any existing event listeners by cloning and replacing the form
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Add the new event listener
    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleEditItem(e, itemId);
    });
    
    // Show the modal
    document.getElementById('customizeModal').classList.add('active');
}

// Handle adding new item to cart
function handleAddToCart(e) {
    const formData = new FormData(e.target);
    
    const cartItem = {
        id: Date.now(),
        drinkId: currentDrink.id,
        name: currentDrink.name,
        price: parseFloat(currentDrink.price),
        size: formData.get('size'),
        sugarLevel: formData.get('sugarLevel'),
        iceLevel: formData.get('iceLevel'),
        quantity: parseInt(document.getElementById('quantity').value)
    };
    
    cart.push(cartItem);
    saveCartToStorage();
    updateCartUI();
    
    // Close modal and show cart
    closeModal('customizeModal');
    document.getElementById('cartSidebar').classList.add('active');
}

// Handle editing existing cart item
function handleEditItem(e, itemId) {
    const formData = new FormData(e.target);
    
    // Find the item index
    const itemIndex = cart.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    // Update the existing item
    cart[itemIndex] = {
        ...cart[itemIndex], // Keep the existing id and drinkId
        size: formData.get('size'),
        sugarLevel: formData.get('sugarLevel'),
        iceLevel: formData.get('iceLevel'),
        quantity: parseInt(document.getElementById('quantity').value)
    };
    
    saveCartToStorage();
    updateCartUI();
    
    // Close modal and show cart
    closeModal('customizeModal');
    document.getElementById('cartSidebar').classList.add('active');
}

// Update cart UI
function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.querySelector('.cart-count');
    const cartTotal = document.getElementById('cartTotal');
    
    // Update count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update items
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #666;">Your cart is empty</p>';
        cartTotal.textContent = 'SGD 0.00';
        return;
    }
    
    cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const priceMultiplier = item.size === 'small' ? 0.8 : item.size === 'large' ? 1.2 : 1;
        const itemPrice = item.price * priceMultiplier * item.quantity;
        total += itemPrice;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-header">
                <span class="cart-item-name">${item.name} (${item.quantity}x)</span>
                <div class="cart-item-actions">
                    <button class="cart-item-edit" onclick="showEditItemModal(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="cart-item-details">
                Size: ${item.size} | Sugar: ${item.sugarLevel} | Ice: ${item.iceLevel}<br>
                SGD ${itemPrice.toFixed(2)}
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    cartTotal.textContent = `SGD ${total.toFixed(2)}`;
}

// Remove from cart
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    saveCartToStorage(); // Save cart after removing item
    updateCartUI();
}

// Clear cart
function clearCart() {
    cart = [];
    saveCartToStorage();
    updateCartUI();
}

// Toggle cart
function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('active');
}

// Show checkout modal
function showCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty');
        return;
    }
    
    const modal = document.getElementById('checkoutModal');
    const phoneField = modal.querySelector('input[name="customerPhone"]').closest('.form-group');
    const emailField = modal.querySelector('input[name="customerEmail"]').closest('.form-group');
    const modalHeader = modal.querySelector('.modal-header h3');
    
    if (currentUser) {
        // Check if user has phone number
        if (!currentUser.phone) {
            // Show phone number prompt modal
            const promptModal = document.createElement('div');
            promptModal.className = 'modal';
            promptModal.id = 'phonePromptModal';
            promptModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Phone Number Required</h3>
                        <button class="close-btn" onclick="closeModal('phonePromptModal')">×</button>
                    </div>
                    <div class="modal-body">
                        <p>Please provide your phone number to continue with checkout.</p>
                        <form id="phonePromptForm" onsubmit="handlePhoneUpdate(event)">
                            <div class="form-group">
                                <label for="promptPhone">Phone Number</label>
                                <input type="tel" id="promptPhone" name="phone" required 
                                       pattern="[0-9]+" minlength="8" maxlength="15"
                                       placeholder="Enter your phone number">
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="primary-btn">Save & Continue</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // Remove existing prompt modal if any
            const existingPrompt = document.getElementById('phonePromptModal');
            if (existingPrompt) {
                existingPrompt.remove();
            }
            
            // Add new prompt modal
            document.body.appendChild(promptModal);
            promptModal.classList.add('active');
            return;
        }
        
        // User is logged in and has phone number - hide phone and email fields, update header
        phoneField.style.display = 'none';
        emailField.style.display = 'none';
        modalHeader.textContent = `Complete Your Order, ${currentUser.firstName || currentUser.username}!`;
        
        // Auto-fill name from user profile
        const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
        document.getElementById('checkoutName').value = fullName || currentUser.username || '';
        
        // Remove required attributes since they're hidden
        document.getElementById('checkoutPhone').removeAttribute('required');
        document.getElementById('checkoutEmail').removeAttribute('required');
        
        // Add user info display
        let userInfoDisplay = modal.querySelector('.user-checkout-info');
        if (!userInfoDisplay) {
            userInfoDisplay = document.createElement('div');
            userInfoDisplay.className = 'user-checkout-info';
            const nameField = modal.querySelector('input[name="customerName"]').closest('.form-group');
            nameField.insertAdjacentElement('afterend', userInfoDisplay);
        }
        userInfoDisplay.innerHTML = `
            <div style="background: var(--bg-light); padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
                <p style="margin: 0; color: var(--text-dark); font-weight: 600;">
                    <i class="fas fa-user"></i> Ordering as: ${currentUser.email}
                </p>
                <p style="margin: 0.5rem 0 0 0; color: var(--text-light); font-size: 0.9rem;">
                    <i class="fas fa-phone"></i> ${currentUser.phone} | 
                    <a href="#" onclick="showProfile(); closeModal('checkoutModal');" style="color: var(--secondary-color);">
                        Update Profile
                    </a>
                </p>
            </div>
        `;
    } else {
        // User is guest - show all fields, update header
        phoneField.style.display = 'block';
        emailField.style.display = 'block';
        modalHeader.textContent = 'Complete Your Order';
        
        // Add required attributes back
        document.getElementById('checkoutPhone').setAttribute('required', '');
        document.getElementById('checkoutEmail').setAttribute('required', '');
        
        // Clear form for guest
        document.getElementById('checkoutName').value = '';
        document.getElementById('checkoutPhone').value = '';
        document.getElementById('checkoutEmail').value = '';
        
        // Remove user info display if exists
        const userInfoDisplay = modal.querySelector('.user-checkout-info');
        if (userInfoDisplay) {
            userInfoDisplay.remove();
        }
    }
    
    modal.classList.add('active');
}

// Handle phone number update
async function handlePhoneUpdate(event) {
    event.preventDefault();
    
    const phone = document.getElementById('promptPhone').value;
    
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({
                firstName: currentUser.firstName || '',
                lastName: currentUser.lastName || '',
                phone: phone
            })
        });
        
        if (response.ok) {
            // Update local user data
            currentUser.phone = phone;
            localStorage.setItem('userData', JSON.stringify(currentUser));
            
            // Close phone prompt and show checkout
            closeModal('phonePromptModal');
            showNotification('Phone number updated successfully!');
            showCheckout();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to update phone number');
        }
    } catch (error) {
        console.error('Error updating phone number:', error);
        showNotification('Error updating phone number');
    }
}

// Handle checkout
async function handleCheckout(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const orderData = {
        customerName: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || formData.get('customerName') : formData.get('customerName'),
        customerPhone: currentUser ? currentUser.phone || formData.get('customerPhone') : formData.get('customerPhone'),
        customerEmail: currentUser ? currentUser.email || formData.get('customerEmail') : formData.get('customerEmail'),
        notes: formData.get('notes'),
        items: cart.map(item => ({
            drinkId: item.drinkId,
            quantity: item.quantity,
            size: item.size,
            sugarLevel: item.sugarLevel,
            iceLevel: item.iceLevel,
            price: item.price
        }))
    };
    
    console.log('Sending order data:', orderData);
    
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add authorization header if user is logged in
        if (currentUser && currentUser.token) {
            headers['Authorization'] = `Bearer ${currentUser.token}`;
        }
        
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Clear cart
            clearCart();
            
            // Close modals
            closeModal('checkoutModal');
            document.getElementById('cartSidebar').classList.remove('active');
            
            // Create and show success modal with enhanced styling
            const successModal = document.createElement('div');
            successModal.className = 'modal success-modal';
            successModal.id = 'successModal';
            successModal.innerHTML = `
                <div class="modal-content success-content">
                    <div class="modal-header">
                        <h3>Order Placed Successfully!</h3>
                        <button class="close-btn" onclick="closeModal('successModal')">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="success-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <p>Your order has been placed successfully.</p>
                        <p>Order ID: <strong id="orderId">${result.orderId}</strong></p>
                        
                        <!-- Telegram Notification Section -->
                        <div class="telegram-section" style="
                            background: var(--bg-light);
                            padding: 1rem;
                            border-radius: 10px;
                            margin: 1rem 0;
                        ">
                            <p style="margin: 0 0 0.5rem 0;">
                                <i class="fab fa-telegram-plane"></i>
                                Get order updates via Telegram!
                            </p>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" id="telegramChatId" 
                                    placeholder="Enter your Telegram Chat ID"
                                    style="
                                        flex: 1;
                                        padding: 0.5rem;
                                        border: 1px solid var(--border-color);
                                        border-radius: 5px;
                                    "
                                >
                                <button onclick="linkTelegram()" class="secondary-btn">
                                    <i class="fas fa-link"></i> Link
                                </button>
                            </div>
                            <small style="display: block; margin-top: 0.5rem; color: var(--text-light);">
                                Message our bot @KopiSahajaBot to get your Chat ID
                            </small>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="primary-btn" onclick="trackNewOrder()">
                                <i class="fas fa-map-marker-alt"></i> Track Order
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing success modal if any
            const existingModal = document.getElementById('successModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add new success modal
            document.body.appendChild(successModal);
            
            // Add click outside listener
            successModal.addEventListener('click', (e) => {
                if (e.target === successModal) {
                    closeModal('successModal');
                }
            });
            
            // Show the modal
            successModal.classList.add('active');
            
            // Join socket room for real-time updates
            socket.emit('join-order', result.orderId);
        } else {
            // Show error message from server
            console.error('Order failed:', result.error);
            showNotification('Error placing order: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error placing order. Please try again.', 'error');
    }
}

// Track new order
function trackNewOrder() {
    const orderId = document.getElementById('orderId').textContent;
    document.getElementById('trackOrderId').value = orderId;
    closeModal('successModal');
    showTrackOrder();
    trackOrder();
}

// Show track order modal
function showTrackOrder() {
    document.getElementById('trackModal').classList.add('active');
}

// Track order
async function trackOrder() {
    const orderId = document.getElementById('trackOrderId').value.trim();
    
    if (!orderId) {
        alert('Please enter an order ID');
        return;
    }
    
    try {
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json();
        
        if (response.ok) {
            displayOrderStatus(data);
            // Join socket room for updates
            socket.emit('join-order', orderId);
        } else {
            document.getElementById('orderStatus').innerHTML = `
                <p style="color: #e74c3c; text-align: center;">
                    <i class="fas fa-exclamation-circle"></i> Order not found
                </p>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error tracking order');
    }
}

// Display order status
function displayOrderStatus(data) {
    const { order, items } = data;
    const statusSteps = ['pending', 'preparing', 'ready', 'completed'];
    const currentStepIndex = statusSteps.indexOf(order.status);
    
    const statusIcons = {
        pending: 'fa-clock',
        preparing: 'fa-coffee',
        ready: 'fa-check-circle',
        completed: 'fa-flag-checkered'
    };
    
    let statusHTML = `
        <h4>Order #${order.id}</h4>
        <p><strong>Customer:</strong> ${order.customer_name}</p>
        <p><strong>Total:</strong> SGD ${parseFloat(order.total_amount).toFixed(2)}</p>
        
        <div class="status-timeline">
    `;
    
    statusSteps.forEach((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;
        const stepClass = isActive ? 'active' : isCompleted ? 'completed' : '';
        
        statusHTML += `
            <div class="status-step ${stepClass}">
                <div class="status-icon">
                    <i class="fas ${statusIcons[step]}"></i>
                </div>
                <div class="status-label">${step.charAt(0).toUpperCase() + step.slice(1)}</div>
            </div>
        `;
    });
    
    statusHTML += '</div>';
    
    document.getElementById('orderStatus').innerHTML = statusHTML;
}

// Socket.io listeners
socket.on('status-update', (data) => {
    // If tracking modal is open, refresh the status
    if (document.getElementById('trackModal').classList.contains('active')) {
        trackOrder();
    }
    
    // Show notification
    showNotification(`Order status updated: ${data.status}`);
});

// Show notification with type support
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? 'var(--error-color, #e74c3c)' : 'var(--primary-color)'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 0 0 0 1rem;
        ">×</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Change quantity
function changeQuantity(change) {
    const quantityInput = document.getElementById('quantity');
    const newValue = parseInt(quantityInput.value) + change;
    if (newValue >= 1) {
        quantityInput.value = newValue;
    }
}

// Show quick login modal
function showQuickLogin() {
    document.getElementById('quickLoginModal').classList.add('active');
}

// Continue as guest
function continueAsGuest() {
    closeModal('quickLoginModal');
}

// Handle quick login
async function handleQuickLogin(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const formData = new FormData(e.target);
    
    const credentials = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    setLoading(submitBtn, true);
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token and user data
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Update current user
            currentUser = data.user;
            currentUser.token = data.token;
            
            // Close modal and update navigation
            closeModal('quickLoginModal');
            updateNavigation();
            showNotification('Login successful!');
        } else {
            showModalMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showModalMessage('Network error. Please try again.', 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}

// Initialize Google OAuth for main page
function initializeMainPageGoogleOAuth() {
    console.log('initializeMainPageGoogleOAuth called');
    
    // Make sure DOM is ready
    if (document.readyState === 'loading') {
        console.log('DOM still loading, waiting...');
        document.addEventListener('DOMContentLoaded', initializeMainPageGoogleOAuth);
        return;
    }
    
    // Wait for Google API to load
    if (typeof google !== 'undefined') {
        console.log('Google API loaded, setting up button');
        setupMainPageGoogleButton();
    } else {
        console.log('Google API not loaded yet, retrying in 100ms');
        // Retry after a short delay
        setTimeout(initializeMainPageGoogleOAuth, 100);
    }
}

function setupMainPageGoogleButton() {
    console.log('setupMainPageGoogleButton called');
    
    // Get Client ID from meta tag (set by server)
    const clientIdMeta = document.querySelector('meta[name="google-client-id"]');
    console.log('Meta tag found:', clientIdMeta);
    
    const CLIENT_ID = clientIdMeta ? clientIdMeta.content : null;
    console.log('Client ID from meta tag:', CLIENT_ID);
    
    if (!CLIENT_ID || CLIENT_ID.trim() === '') {
        console.warn('Google Client ID not found. Please configure GOOGLE_CLIENT_ID in your environment variables.');
        return;
    }
    
    // Initialize Google Sign-In
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleMainPageGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: false
    });
    
    console.log('Google OAuth initialized with Client ID:', CLIENT_ID);
    
    // Render button when modal is opened
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const modal = document.getElementById('quickLoginModal');
                if (modal.classList.contains('active')) {
                    // Modal opened, render Google button
                    const buttonContainer = document.getElementById('main-page-google-signin');
                    if (buttonContainer && !buttonContainer.innerHTML) {
                        console.log('Rendering Google button in modal');
                        google.accounts.id.renderButton(buttonContainer, {
                            theme: 'outline',
                            size: 'large',
                            type: 'standard',
                            shape: 'rectangular',
                            text: 'signin_with',
                            width: '100%'
                        });
                    }
                }
            }
        });
    });
    
    observer.observe(document.getElementById('quickLoginModal'), { attributes: true });
}

async function handleMainPageGoogleResponse(response) {
    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ credential: response.credential })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Store token and user data
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Update current user
            currentUser = data.user;
            currentUser.token = data.token;
            
            // Close modal and update navigation
            closeModal('quickLoginModal');
            updateNavigation();
            showNotification('Login successful!');
        } else {
            showModalMessage(data.error || 'Google authentication failed', 'error');
        }
    } catch (error) {
        console.error('Google OAuth error:', error);
        showModalMessage('Google authentication failed. Please try again.', 'error');
    }
}

// Show message in modal
function showModalMessage(message, type) {
    const modal = document.getElementById('quickLoginModal');
    const existingMessage = modal.querySelector('.message');
    if (existingMessage) existingMessage.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const form = modal.querySelector('form');
    modal.querySelector('.quick-login-content').insertBefore(messageDiv, form);
}

// Set loading state for buttons
function setLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Add the linkTelegram function if it doesn't exist
async function linkTelegram() {
    const chatId = document.getElementById('telegramChatId').value.trim();
    const orderId = document.getElementById('orderId').textContent;
    
    if (!chatId) {
        showNotification('Please enter your Telegram Chat ID', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/orders/${orderId}/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ telegramChatId: chatId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Telegram notifications enabled successfully!');
            // Optionally disable the input and button after successful linking
            document.getElementById('telegramChatId').disabled = true;
            const linkButton = document.querySelector('.telegram-section button');
            linkButton.disabled = true;
            linkButton.innerHTML = '<i class="fas fa-check"></i> Linked';
        } else {
            showNotification(data.error || 'Failed to enable Telegram notifications', 'error');
        }
    } catch (error) {
        console.error('Error linking Telegram:', error);
        showNotification('Error enabling Telegram notifications', 'error');
    }
} 