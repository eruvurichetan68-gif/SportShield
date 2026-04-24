// GuardPlay AI DRM Platform Logic

const API_BASE = '/api';
let currentSection = 'home';
let currentUser = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupNavigation();
    setupFileUpload();
    setupDropZone();
    setupVerifyForm();
    setupVerifyDropZone();
    loadAnalytics();
    
    // Start real-time simulation
    setInterval(updateActivityLog, 4000);
    setInterval(loadAnalytics, 15000); // Refresh analytics every 15s
    
    // Periodically simulate violations for demo effect (every 45 seconds)
    setInterval(() => {
        if (currentUser) {
            simulateViolation(true); // silent simulation
        }
    }, 45000);
    
    // Initial data load if on specific sections
    const hash = window.location.hash.substring(1);
    const path = window.location.pathname;
    
    if (path === '/dashboard') {
        navigateTo('gallery');
    } else if (hash) {
        navigateTo(hash);
    }
});

// --- Authentication ---
async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/status');
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data.user;
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('userProfile').style.display = 'flex';
            document.getElementById('userName').textContent = currentUser.firstName || currentUser.username;
            document.getElementById('userEmail').textContent = currentUser.email;
            document.getElementById('userAvatar').src = currentUser.profilePicture || 'https://via.placeholder.com/32';
        } else {
            currentUser = null;
            document.getElementById('loginBtn').style.display = 'flex';
            document.getElementById('userProfile').style.display = 'none';
        }
    } catch (err) {
        console.error('Auth check failed:', err);
    }
}

// --- Navigation ---
function setupNavigation() {
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 20) {
            nav.style.background = 'rgba(7, 10, 19, 0.95)';
            nav.style.height = '70px';
        } else {
            nav.style.background = 'rgba(7, 10, 19, 0.8)';
            nav.style.height = '80px';
        }
    });
}

function navigateTo(sectionId) {
    if (!sectionId) sectionId = 'home';
    
    console.log('Navigating to:', sectionId);

    // Update links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });

    // Update sections
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        console.warn('Section not found:', sectionId);
        document.getElementById('home').classList.add('active');
    }
    
    currentSection = sectionId;

    // Load section data if logged in
    if (currentUser) {
        if (sectionId === 'gallery') loadGallery();
        if (sectionId === 'violations') loadViolations();
        if (sectionId === 'analytics') loadAnalytics();
    } else if (['gallery', 'violations', 'analytics', 'upload'].includes(sectionId)) {
        // Show login prompt for protected sections
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            const originalContent = targetSection.innerHTML;
            if (!targetSection.querySelector('.login-prompt')) {
                targetSection.innerHTML = `
                    <div class="container">
                        <div class="glass login-prompt" style="text-align: center; padding: 80px 20px;">
                            <h2 style="margin-bottom: 20px;">Shield Access Required</h2>
                            <p style="color: var(--text-gray); margin-bottom: 30px;">Please login to access the Global DRM Registry and AI monitoring tools.</p>
                            <div style="display: flex; gap: 15px; justify-content: center;">
                                <button class="btn btn-primary" onclick="window.location.href='/auth/google'">Login with Google</button>
                                <button class="btn btn-outline" onclick="window.location.href='/auth/demo-login'">Demo Guest</button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }
}

// --- File Upload ---
function setupFileUpload() {
    const uploadForm = document.getElementById('uploadForm');
    if (!uploadForm) return;

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('Please login with Google to protect assets.');
            window.location.href = '/auth/google';
            return;
        }

        const fileInput = document.getElementById('fileInput');
        const assetName = document.getElementById('assetName');
        const statusDiv = document.getElementById('uploadStatus');
        const statusMsg = document.getElementById('statusMsg');

        if (!fileInput.files[0]) {
            alert('Please select a file first.');
            return;
        }

        const formData = new FormData();
        formData.append('media', fileInput.files[0]);
        formData.append('assetName', assetName.value);

        statusDiv.style.display = 'block';
        statusMsg.innerHTML = '<span class="pulse" style="color: var(--primary-light)">🛡️ Encrypting & Adding Forensic Watermark...</span>';

        try {
            const response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (response.status === 401) {
                statusMsg.innerHTML = '<span style="color: var(--danger)">Session expired. Please login again.</span>';
                return;
            }

            const result = await response.json();

            if (result.success) {
                showToast('Asset secured and registered successfully!');
                statusMsg.innerHTML = `
                    <div style="color: var(--success)">
                        <strong>✅ ASSET SECURED</strong><br>
                        <small>Registry Hash: ${result.hash.substring(0, 24)}...</small>
                    </div>
                `;
                uploadForm.reset();
                document.getElementById('fileNameDisplay').textContent = 'Drag and drop file or click to browse';
                setTimeout(() => {
                    navigateTo('gallery');
                }, 2000);
            } else {
                showToast(result.message || 'Upload failed', 'error');
                statusMsg.innerHTML = `<span style="color: var(--danger)">❌ Error: ${result.message}</span>`;
            }
        } catch (err) {
            showToast('Network error during upload', 'error');
            statusMsg.innerHTML = `<span style="color: var(--danger)">❌ Network Error</span>`;
        }
    });
}

function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    if (!dropZone) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.background = 'rgba(99, 102, 241, 0.05)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border)';
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        fileInput.files = e.dataTransfer.files;
        if (fileInput.files[0]) {
            fileNameDisplay.textContent = `Selected: ${fileInput.files[0].name}`;
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) {
            fileNameDisplay.textContent = `Selected: ${fileInput.files[0].name}`;
        }
    });
}

function setupVerifyForm() {
    const verifyForm = document.getElementById('verifyForm');
    if (!verifyForm) return;

    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('Please login to verify assets.');
            return;
        }

        const fileInput = document.getElementById('verifyFileInput');
        const statusDiv = document.getElementById('verifyStatus');
        const statusMsg = document.getElementById('verifyMsg');
        const detailsDiv = document.getElementById('verifyDetails');

        if (!fileInput.files[0]) {
            alert('Please select a file to scan.');
            return;
        }

        const formData = new FormData();
        formData.append('media', fileInput.files[0]);

        statusDiv.style.display = 'block';
        statusMsg.innerHTML = '<span class="pulse" style="color: var(--primary-light)">🔍 Scanning Global Networks & Running Deepfake Analysis...</span>';
        detailsDiv.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE}/verify`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();

            if (result.success) {
                if (result.match) {
                    showToast('Violation detected! Match found in registry.', 'error');
                    statusMsg.innerHTML = '<span style="color: var(--danger)">🔴 CRITICAL VIOLATION DETECTED</span>';
                    detailsDiv.innerHTML = `
                        <div class="glass" style="padding: 10px; margin-top: 10px; border-color: var(--danger);">
                            <p><strong>Match Found:</strong> ${result.violation.filename}</p>
                            <p><strong>Confidence:</strong> ${result.violation.confidence}%</p>
                            <p><strong>Authenticity:</strong> ${result.authenticityScore}%</p>
                            <p><strong>Status:</strong> Registered Asset (Unauthorized Leak)</p>
                        </div>
                    `;
                } else {
                    showToast(result.isDeepfake ? 'Deepfake detected!' : 'Suspicious content detected!', 'warning');
                    statusMsg.innerHTML = result.isDeepfake ? 
                        '<span style="color: var(--danger)">⚠️ AI DEEPFAKE DETECTED</span>' : 
                        '<span style="color: var(--warning)">⚠️ SUSPICIOUS TAMPERING DETECTED</span>';
                    
                    detailsDiv.innerHTML = `
                        <div class="glass" style="padding: 10px; margin-top: 10px; border-color: var(--accent);">
                            <p><strong>Authenticity Score:</strong> ${result.authenticityScore}%</p>
                            <p><strong>AI Detection:</strong> ${result.isDeepfake ? 'Deepfake Identified' : 'Metadata Mismatch'}</p>
                            <p><strong>Registry Match:</strong> None (New Content Mismatch)</p>
                            <p style="margin-top: 5px; color: var(--text-gray); font-size: 0.8rem;">This content appears to be a modified version of a protected asset or AI generated.</p>
                        </div>
                    `;
                }
                
                // Automatically refresh violations and analytics
                loadAnalytics();
            } else {
                showToast(result.error || 'Verification failed', 'error');
                statusMsg.innerHTML = `<span style="color: var(--danger)">❌ Error: ${result.error}</span>`;
            }
        } catch (err) {
            showToast('Network error during verification', 'error');
            statusMsg.innerHTML = `<span style="color: var(--danger)">❌ Network Error</span>`;
        }
    });
}

function setupVerifyDropZone() {
    const dropZone = document.getElementById('verifyDropZone');
    const fileInput = document.getElementById('verifyFileInput');
    const fileNameDisplay = document.getElementById('verifyFileNameDisplay');

    if (!dropZone) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.background = 'rgba(99, 102, 241, 0.05)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border)';
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        fileInput.files = e.dataTransfer.files;
        if (fileInput.files[0]) {
            fileNameDisplay.textContent = `Scanning: ${fileInput.files[0].name}`;
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) {
            fileNameDisplay.textContent = `Scanning: ${fileInput.files[0].name}`;
        }
    });
}

// --- Data Loading ---
async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = '<div class="glass card">Accessing Registry...</div>';

    try {
        const response = await fetch(`${API_BASE}/gallery`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            grid.innerHTML = result.data.map(asset => `
                <div class="glass card">
                    <div class="asset-thumb">
                        ${asset.mimeType && asset.mimeType.startsWith('image') ? 
                            `<img src="/uploads/${asset.filename}" alt="${asset.originalName}">` : 
                            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>'}
                    </div>
                    <div class="asset-info">
                        <h3 title="${asset.originalName}">${truncate(asset.originalName, 25)}</h3>
                        <p style="color: var(--text-gray); font-size: 0.75rem;">Owner: ${asset.ownerEmail || 'Unknown'}</p>
                        <div class="asset-meta" style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                            <span class="badge badge-success">🟢 Protected</span>
                            <code style="font-size: 0.65rem; color: var(--primary-light)">${asset.hash.substring(0,10)}...</code>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = '<div class="glass card" style="grid-column: 1/-1; text-align: center; padding: 60px;">No assets registered in the global shield yet.</div>';
        }
    } catch (err) {
        grid.innerHTML = '<div class="glass card" style="grid-column: 1/-1; color: var(--danger);">Registry access failed. Please ensure you are logged in.</div>';
    }
}

async function loadViolations() {
    const tbody = document.getElementById('violationTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Scanning global networks for violations...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/violations`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            tbody.innerHTML = result.data.map(v => `
                <tr>
                    <td style="font-weight: 600;" title="${v.filename}">${truncate(v.filename, 30)}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="color: var(--secondary)">${v.platform}</span>
                        </div>
                    </td>
                    <td>${v.confidence}%</td>
                    <td>${v.deepfake ? '<span class="badge badge-danger">DEEPFAKE</span>' : '<span class="badge badge-warning">REPOST</span>'}</td>
                    <td>
                        <span class="badge ${v.status === 'Detected' ? 'badge-danger' : 'badge-warning'}">
                            ${v.status === 'Detected' ? '🔴 Violated' : '🟡 Takedown Sent'}
                        </span>
                    </td>
                    <td>
                        ${v.status === 'Detected' ? `<button class="btn btn-primary" style="padding: 8px 16px; font-size: 0.75rem;" onclick="sendTakedown('${v.id}')">TAKE DOWN</button>` : '<span style="color: var(--success); font-size: 0.75rem; font-weight: 600;">✅ DMCA FILED</span>'}
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No violations detected. Your content is safe.</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger);">Failed to load violations.</td></tr>';
    }
}

async function sendTakedown(id) {
    try {
        const response = await fetch(`${API_BASE}/takedown/${id}`, { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            showToast('DMCA Notice Sent to Platform!');
            loadViolations();
            loadAnalytics();
        }
    } catch (err) {
        showToast('Takedown request failed', 'error');
    }
}

async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/analytics`);
        const result = await response.json();

        if (result.success) {
            document.getElementById('statTotal').textContent = result.data.totalUploads || 0;
            document.getElementById('statViolations').textContent = result.data.violationsCount || 0;
            document.getElementById('statDeepfakes').textContent = result.data.deepfakeCount || 0;
        }
    } catch (err) {}
}

// --- Simulation ---
async function simulateViolation(silent = false) {
    try {
        const response = await fetch(`${API_BASE}/simulate-violation`, { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            if (!silent) {
                showToast(`Leak detected on ${result.violation.platform}!`, 'warning');
            } else {
                console.log('🚨 Background Violation Detected:', result.violation.filename);
            }
            if (currentSection === 'violations') loadViolations();
            loadAnalytics();
        }
    } catch (err) {
        if (!silent) showToast('Could not simulate leak. Register an asset first.', 'error');
    }
}

// --- Utilities ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function truncate(str, n) {
    return (str.length > n) ? str.substr(0, n-1) + '&hellip;' : str;
}

function updateActivityLog() {
    const log = document.getElementById('activityLog');
    if (!log) return;
    
    const platforms = ['Instagram', 'YouTube', 'X.com', 'Telegram', 'Reddit', 'TikTok', 'DarkWeb Monitor', 'Global IP Pool'];
    const actions = ['Scanning', 'Verifying hash', 'Forensic analysis', 'Metadata audit', 'Deepfake detection', 'Monitoring API', 'Scraping'];
    
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${action} active on ${platform}...`;
    log.prepend(entry);
    
    if (log.children.length > 15) log.removeChild(log.lastChild);
}
