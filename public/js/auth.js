// Global variables
let currentForm = 'login';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkUrlParams();
    initializeGoogleSignIn();
});

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginFormEl').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerFormEl').addEventListener('submit', handleRegister);
    
    // Forgot password form
    document.getElementById('forgotPasswordFormEl').addEventListener('submit', handleForgotPassword);
    
    // Reset password form
    document.getElementById('resetPasswordFormEl').addEventListener('submit', handleResetPassword);
    
    // Password confirmation validation
    const confirmPasswordInputs = document.querySelectorAll('input[name="confirmPassword"]');
    confirmPasswordInputs.forEach(input => {
        input.addEventListener('input', validatePasswordMatch);
    });
}

// Check URL parameters for reset token
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    if (resetToken) {
        document.getElementById('resetToken').value = resetToken;
        showResetPassword();
    }
}

// Show login form
function showLogin() {
    hideAllForms();
    document.getElementById('loginForm').style.display = 'block';
    currentForm = 'login';
}

// Show register form
function showRegister() {
    hideAllForms();
    document.getElementById('registerForm').style.display = 'block';
    currentForm = 'register';
}

// Show forgot password form
function showForgotPassword() {
    hideAllForms();
    document.getElementById('forgotPasswordForm').style.display = 'block';
    currentForm = 'forgotPassword';
}

// Show reset password form
function showResetPassword() {
    hideAllForms();
    document.getElementById('resetPasswordForm').style.display = 'block';
    currentForm = 'resetPassword';
}

// Hide all forms
function hideAllForms() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('resetPasswordForm').style.display = 'none';
    clearMessages();
}

// Handle login
async function handleLogin(e) {
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
            
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to main page after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please try again.', 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const formData = new FormData(e.target);
    
    // Validate password match
    if (formData.get('password') !== formData.get('confirmPassword')) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone')
    };
    
    setLoading(submitBtn, true);
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token and user data
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            showMessage('Account created successfully! Redirecting...', 'success');
            
            // Redirect to main page after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Network error. Please try again.', 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}

// Handle forgot password
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const formData = new FormData(e.target);
    
    const email = formData.get('email');
    
    setLoading(submitBtn, true);
    
    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(`Password reset instructions sent to ${email}`, 'success');
            
            // For demo purposes, show the reset token
            if (data.resetToken) {
                showMessage(`Demo: Use this token to reset password: ${data.resetToken}`, 'success');
                document.getElementById('resetToken').value = data.resetToken;
                
                // Auto switch to reset form after 3 seconds
                setTimeout(() => {
                    showResetPassword();
                }, 3000);
            }
        } else {
            showMessage(data.error || 'Failed to send reset email', 'error');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        showMessage('Network error. Please try again.', 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}

// Handle reset password
async function handleResetPassword(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const formData = new FormData(e.target);
    
    // Validate password match
    if (formData.get('newPassword') !== formData.get('confirmPassword')) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    const resetData = {
        token: formData.get('token'),
        newPassword: formData.get('newPassword')
    };
    
    setLoading(submitBtn, true);
    
    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resetData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Password reset successfully! You can now login.', 'success');
            
            // Switch to login form after delay
            setTimeout(() => {
                showLogin();
            }, 2000);
        } else {
            showMessage(data.error || 'Failed to reset password', 'error');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        showMessage('Network error. Please try again.', 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}

// Validate password match
function validatePasswordMatch(e) {
    const form = e.target.closest('form');
    const passwordInput = form.querySelector('input[name="password"], input[name="newPassword"]');
    const confirmInput = e.target;
    
    if (passwordInput.value !== confirmInput.value) {
        confirmInput.setCustomValidity('Passwords do not match');
    } else {
        confirmInput.setCustomValidity('');
    }
}

// Show message
function showMessage(message, type) {
    clearMessages();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const currentFormEl = document.querySelector('.auth-form[style*="block"]');
    if (currentFormEl) {
        const form = currentFormEl.querySelector('form');
        currentFormEl.insertBefore(messageDiv, form);
    }
}

// Clear messages
function clearMessages() {
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
}

// Set loading state
function setLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength < 3) return 'weak';
    if (strength < 5) return 'medium';
    return 'strong';
}

// Add password strength indicator
document.addEventListener('DOMContentLoaded', () => {
    const passwordInputs = document.querySelectorAll('input[name="password"]');
    
    passwordInputs.forEach(input => {
        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength';
        strengthIndicator.innerHTML = '<div class="password-strength-bar"></div>';
        
        input.parentNode.appendChild(strengthIndicator);
        
        input.addEventListener('input', (e) => {
            const strength = checkPasswordStrength(e.target.value);
            strengthIndicator.className = `password-strength ${strength}`;
        });
    });
});

// Google OAuth Functions
function initializeGoogleSignIn() {
    // Wait for Google API to load
    if (typeof google !== 'undefined') {
        setupGoogleButtons();
    } else {
        // Retry after a short delay
        setTimeout(initializeGoogleSignIn, 100);
    }
}

function setupGoogleButtons() {
    // Get Client ID from meta tag (set by server)
    const clientIdMeta = document.querySelector('meta[name="google-client-id"]');
    const CLIENT_ID = clientIdMeta ? clientIdMeta.content : null;
    
    if (!CLIENT_ID) {
        console.warn('Google Client ID not found. Please configure GOOGLE_CLIENT_ID in your environment variables.');
        return;
    }
    
    // Initialize Google Sign-In for login
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: false
    });
    
    // Render login button
    const loginButtonContainer = document.getElementById('google-signin-button');
    if (loginButtonContainer) {
        google.accounts.id.renderButton(loginButtonContainer, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signin_with',
            width: '100%'
        });
    }
    
    // Render register button
    const registerButtonContainer = document.getElementById('google-register-button');
    if (registerButtonContainer) {
        google.accounts.id.renderButton(registerButtonContainer, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signup_with',
            width: '100%'
        });
    }
}

async function handleGoogleResponse(response) {
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
            
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to main page after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showMessage(data.error || 'Google authentication failed', 'error');
        }
    } catch (error) {
        console.error('Google OAuth error:', error);
        showMessage('Google authentication failed. Please try again.', 'error');
    }
} 