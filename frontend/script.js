// SportShield Frontend JavaScript with Authentication

const API_BASE = 'http://localhost:3000/api';

// Authentication State
let currentUser = null;
let authToken = null;

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');
const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const userBtn = document.getElementById('userBtn');
const logoutBtn = document.getElementById('logoutBtn');
const registerMediaBtn = document.getElementById('registerMediaBtn');

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
    handleURLParameters();
});

// Handle URL parameters for login/logout redirects
function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle logout success
    if (urlParams.get('logout') === 'success') {
        showNotification('Logged out successfully', 'success');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle login required
    if (urlParams.get('login_required') === 'true') {
        showNotification('Please login to access this feature', 'warning');
        showAuthModal('login');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle OAuth errors
    if (urlParams.get('error') === 'true') {
        showNotification('Authentication failed. Please try again.', 'error');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.dataset.section;
            navigateToSection(targetSection);
        });
    });

    // Authentication
    loginBtn.addEventListener('click', () => showAuthModal('login'));
    userBtn.addEventListener('click', () => navigateToSection('gallery'));
    logoutBtn.addEventListener('click', handleLogout);
    registerMediaBtn.addEventListener('click', () => {
        if (currentUser) {
            navigateToSection('gallery');
        } else {
            showAuthModal('login');
        }
    });

    // Modal
    const closeBtn = document.querySelector('.close');
    closeBtn.addEventListener('click', hideAuthModal);
    window.addEventListener('click', (e) => {
        if (e.target === authModal) {
            hideAuthModal();
        }
    });

    // Auth form
    const authForm = document.getElementById('authForm');
    authForm.addEventListener('submit', handleAuth);

    // Auth switch
    const authSwitchLink = document.getElementById('authSwitchLink');
    authSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });

    // Upload and Verify forms
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    const verifyForm = document.getElementById('verifyForm');
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerify);
    }

    // File inputs
    setupFileInputs();
}

// Authentication Functions
async function checkAuthStatus() {
    try {
        // Check session-based authentication (Google OAuth)
        const response = await fetch('/auth/status');
        const data = await response.json();
        
        if (data.authenticated && data.user) {
            currentUser = data.user;
            updateAuthUI();
            return;
        }
        
        // Fallback to token-based authentication (local auth)
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        
        if (token && user) {
            authToken = token;
            currentUser = JSON.parse(user);
            updateAuthUI();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }
}

function updateAuthUI() {
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        userProfile.style.display = 'flex';
        
        // Update user profile display
        usernameDisplay.textContent = currentUser.username || currentUser.displayName || 'User';
        
        // Update avatar if available (Google OAuth users)
        if (currentUser.profilePicture) {
            userAvatar.src = currentUser.profilePicture;
            userAvatar.style.display = 'block';
        } else {
            userAvatar.style.display = 'none';
        }
        
        // Show upload section in gallery
        const uploadSection = document.getElementById('uploadSection');
        if (uploadSection) {
            uploadSection.style.display = 'block';
        }
    } else {
        loginBtn.style.display = 'inline-flex';
        userProfile.style.display = 'none';
        
        // Hide upload section in gallery
        const uploadSection = document.getElementById('uploadSection');
        if (uploadSection) {
            uploadSection.style.display = 'none';
        }
    }
}

function showAuthModal(mode = 'login') {
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authSwitchText = document.getElementById('authSwitchText');
    const authSwitchLink = document.getElementById('authSwitchLink');
    const emailGroup = document.getElementById('emailGroup');
    
    if (mode === 'register') {
        authTitle.textContent = 'Register';
        authSubmitBtn.textContent = 'Register';
        authSwitchText.textContent = 'Already have an account?';
        authSwitchLink.textContent = 'Login';
        emailGroup.style.display = 'block';
    } else {
        authTitle.textContent = 'Login';
        authSubmitBtn.textContent = 'Login';
        authSwitchText.textContent = "Don't have an account?";
        authSwitchLink.textContent = 'Register';
        emailGroup.style.display = 'none';
    }
    
    authModal.style.display = 'block';
    authModal.dataset.mode = mode;
}

function hideAuthModal() {
    authModal.style.display = 'none';
    const authForm = document.getElementById('authForm');
    authForm.reset();
}

function toggleAuthMode() {
    const currentMode = authModal.dataset.mode;
    const newMode = currentMode === 'login' ? 'register' : 'login';
    showAuthModal(newMode);
}

async function handleAuth(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const mode = authModal.dataset.mode;
    
    const submitBtn = document.getElementById('authSubmitBtn');
    const originalText = submitBtn.textContent;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Processing...';
    
    try {
        const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
        const response = await apiCall(endpoint, 'POST', {
            username: formData.get('username'),
            password: formData.get('password'),
            email: formData.get('email')
        });
        
        if (response.success) {
            currentUser = response.user;
            authToken = response.token;
            
            // Store in localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            updateAuthUI();
            hideAuthModal();
            
            // Navigate to gallery after successful login/register
            navigateToSection('gallery');
            
            showNotification(mode === 'register' ? 'Registration successful!' : 'Login successful!', 'success');
        } else {
            showNotification(response.message || 'Authentication failed', 'error');
        }
    } catch (error) {
        showNotification(error.message || 'Authentication failed', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleLogout() {
    try {
        // For Google OAuth, redirect to server logout endpoint
        if (currentUser && currentUser.provider === 'google') {
            window.location.href = '/auth/logout';
            return;
        }
        
        // For local authentication, clear local storage
        currentUser = null;
        authToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        updateAuthUI();
        navigateToSection('home');
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed', 'error');
    }
}

// API Helper Functions
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Add auth token if available
        if (authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        if (data && method !== 'GET') {
            if (data instanceof FormData) {
                delete options.headers['Content-Type'];
                options.body = data;
            } else {
                options.body = JSON.stringify(data);
            }
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Navigation
function navigateToSection(sectionName) {
    // Update active states
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionName) {
            link.classList.add('active');
        }
    });

    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionName) {
            section.classList.add('active');
        }
    });

    // Load data for specific sections
    if (sectionName === 'gallery') {
        loadGallery();
    }
}

// Load Gallery
async function loadGallery() {
    const galleryContent = document.getElementById('galleryContent');
    
    // Check authentication status first
    try {
        const authResponse = await fetch('/auth/status');
        const authData = await authResponse.json();
        
        if (!authData.authenticated) {
            galleryContent.innerHTML = `
                <div class="auth-prompt">
                    <h3>Login Required</h3>
                    <p>Please login to view and manage your media gallery.</p>
                    <button class="btn btn-primary" onclick="showAuthModal('login')">Login</button>
                </div>
            `;
            return;
        }
        
        currentUser = authData.user;
    } catch (error) {
        console.error('Auth check failed:', error);
        return;
    }
    
    try {
        // Use session-based auth to get user media
        const response = await fetch('/api/media/user', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load gallery');
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to load gallery');
        }
        
        const media = result.data;
        
        if (media.length === 0) {
            galleryContent.innerHTML = `
                <div class="auth-prompt">
                    <h3>No Media Yet</h3>
                    <p>Upload your first media file to get started.</p>
                </div>
            `;
            return;
        }
        
        galleryContent.innerHTML = media.map(item => `
            <div class="media-item">
                ${item.mimeType.startsWith('image/') ? 
                    `<img src="${API_BASE}/uploads/${item.fileName}" alt="${item.originalName}">` : 
                    `<div class="media-placeholder">Video</div>`
                }
                <div class="media-info">
                    <div class="media-name">${item.originalName}</div>
                    <div class="media-meta">
                        ${formatFileSize(item.fileSize)} | ${new Date(item.uploadTime).toLocaleDateString()}
                    </div>
                    <div class="media-meta">
                        <strong>Hash:</strong> <code class="hash-value">${item.finalHash}</code>
                    </div>
                </div>
                <span class="status-badge status-authentic">Verified</span>
            </div>
        `).join('');
        
    } catch (error) {
        galleryContent.innerHTML = `
            <div class="auth-prompt">
                <h3>Error Loading Gallery</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Handle Upload - AJAX ONLY (NO REDIRECTS)
async function handleUpload(e) {
    e.preventDefault();
    
    console.log("=== FRONTEND UPLOAD STARTED ===");
    
    const form = e.target;
    const fileInput = form.querySelector('input[type="file"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const resultDiv = document.getElementById('uploadResult');
    
    // Validate file selection
    if (!fileInput.files || fileInput.files.length === 0) {
        showResult(resultDiv, 'error', `
            <h3>❌ No File Selected</h3>
            <p>Please select a file to upload.</p>
        `);
        return;
    }
    
    const file = fileInput.files[0];
    console.log("Selected file:", file.name);
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-loader">⏳</span> Uploading...';
    resultDiv.style.display = 'none';
    
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('media', file);
        
        console.log("Sending AJAX request to /api/upload");
        
        // AJAX REQUEST (NO FORM REDIRECT)
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log("Server response:", data);
        
        if (data.success) {
            // SUCCESS - DISPLAY RESULT
            showResult(resultDiv, 'success', `
                <h3>✅ Upload Successful</h3>
                <p><strong>Hash:</strong> <code class="hash-value">${data.hash}</code></p>
                <p><strong>Status:</strong> 🟢 ${data.status}</p>
                <p>${data.message}</p>
            `);
            
            // Reset form
            form.reset();
            document.getElementById('fileLabel').textContent = 'Choose file or drag here';
            
            // Reload gallery to show new upload
            loadGallery();
            
            console.log("=== UPLOAD SUCCESSFUL ===");
            
        } else {
            // ERROR OR DUPLICATE
            if (data.status === 'already_exists') {
                showResult(resultDiv, 'warning', `
                    <h3>⚠️ Duplicate File</h3>
                    <p>${data.message}</p>
                    <p>This file has already been uploaded.</p>
                `);
            } else {
                showResult(resultDiv, 'error', `
                    <h3>❌ Upload Failed</h3>
                    <p>${data.message}</p>
                `);
            }
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showResult(resultDiv, 'error', `
            <h3>❌ Upload Error</h3>
            <p>Network error: ${error.message}</p>
        `);
    } finally {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">📤 Upload</span><span class="btn-loader" style="display:none;">⏳</span>';
    }
}

// Handle Verify
async function handleVerify(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    const resultDiv = document.getElementById('verifyResult');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    submitBtn.disabled = true;
    resultDiv.style.display = 'none';
    
    try {
        const formData = new FormData(form);
        const result = await apiCall('/verify', 'POST', formData);
        
        if (result.authentic) {
            showResult(resultDiv, 'success', `
                <h3> Authentic Media</h3>
                <p><strong>Status:</strong> <span class="status-badge status-authentic">AUTHENTIC</span></p>
                <p><strong>File:</strong> ${result.media.originalName}</p>
                <p><strong>Hash Match:</strong> <code class="hash-value">${result.uploadedHash}</code></p>
                <p><strong>Upload Time:</strong> ${new Date(result.media.uploadTime).toLocaleString()}</p>
                <p><strong>Uploader:</strong> ${result.media.uploader}</p>
                <p>This media file is authentic and has not been tampered with.</p>
            `);
        } else {
            showResult(resultDiv, 'warning', `
                <h3> Tampered Media Detected</h3>
                <p><strong>Status:</strong> <span class="status-badge status-tampered">TAMPERED</span></p>
                <p><strong>Message:</strong> ${result.message}</p>
                <p><strong>Uploaded Hash:</strong> <code class="hash-value">${result.uploadedHash}</code></p>
                ${result.originalMedia ? `
                    <p><strong>Original File:</strong> ${result.originalMedia.originalName}</p>
                    <p><strong>Original Upload Time:</strong> ${new Date(result.originalMedia.uploadTime).toLocaleString()}</p>
                ` : ''}
                <p>This media file appears to have been modified or is not in our database.</p>
            `);
        }
        
    } catch (error) {
        showResult(resultDiv, 'error', `
            <h3> Verification Failed</h3>
            <p>${error.message}</p>
        `);
    } finally {
        // Hide loading state
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
        
        // Reset form
        form.reset();
        document.getElementById('verifyFileLabel').textContent = 'Choose file to verify';
    }
}

// Setup File Inputs
function setupFileInputs() {
    const mediaFile = document.getElementById('mediaFile');
    const fileLabel = document.getElementById('fileLabel');
    
    if (mediaFile && fileLabel) {
        mediaFile.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || 'Choose file or drag here';
            fileLabel.textContent = fileName;
        });
    }
    
    const verifyFile = document.getElementById('verifyFile');
    const verifyFileLabel = document.getElementById('verifyFileLabel');
    
    if (verifyFile && verifyFileLabel) {
        verifyFile.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || 'Choose file to verify';
            verifyFileLabel.textContent = fileName;
        });
    }
}

// Show Result Message
function showResult(container, type, content) {
    container.className = `result-container result-${type}`;
    container.innerHTML = content;
    container.style.display = 'block';
    
    // Scroll to result
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = '#10b981';
            break;
        case 'error':
            notification.style.background = '#ef4444';
            break;
        case 'warning':
            notification.style.background = '#f59e0b';
            break;
        default:
            notification.style.background = '#2563eb';
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .media-placeholder {
        width: 60px;
        height: 60px;
        background: var(--light-bg);
        border-radius: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        color: var(--text-secondary);
        margin-right: 1rem;
    }
`;
document.head.appendChild(style);
