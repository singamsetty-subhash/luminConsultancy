/**
 * @fileoverview Administrative Dashboard controller script for Lumin Consultancy.
 * <p>
 * Manages administrative authentication, session persistence, automatic 30-minute
 * inactivity session termination, real-time enquiry fetching from /api/enquiries,
 * client-side multi-attribute search filtering, expandable row details, 1-click
 * WhatsApp/Email/Phone actions, deletion confirmation modals, and toast notifications.
 * </p>
 *
 * @author Lumin Technical Team
 * @version 8.0.0
 */

/** @type {Array<Object>} In-memory cache of currently loaded enquiry records from the database. */
let currentEnquiries = [];

/** @type {number|string|null} ID of an enquiry record awaiting deletion confirmation in the modal dialog. */
let pendingDeleteId = null;

/** @const {number} Inactivity threshold before automatic session logout (30 minutes in milliseconds). */
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

/** @const {string} Key used to store the last active epoch timestamp in sessionStorage. */
const ACTIVITY_STORAGE_KEY = 'adminLastActivity';

/** @const {string} Key used to store administrative authentication status in sessionStorage. */
const AUTH_STORAGE_KEY = 'adminLoggedIn';

/** @type {number|null} Polling interval handle for checking idle session expiration. */
let inactivityCheckInterval = null;

/** @type {number} Throttled epoch timestamp to minimize frequent sessionStorage writes. */
let lastThrottledTime = 0;

/** @type {boolean} Flag tracking whether global user interaction listeners are registered. */
let userActivityEventsBound = false;


document.addEventListener('DOMContentLoaded', () => {
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-msg');
    const logoutBtn = document.getElementById('logout-btn');
    const searchInput = document.getElementById('search-input');
    const deleteModal = document.getElementById('delete-modal');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');

    // Initialize background particles on login panel
    initParticles();

    // Clear any autofilled inputs on load
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const eyeIcon = document.getElementById('eye-icon');

    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';

    // Show / Hide Password toggle
    if (togglePasswordBtn && passwordInput && eyeIcon) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

            if (isPassword) {
                // Eye slashed (hide password) icon
                eyeIcon.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
                togglePasswordBtn.style.color = '#0f2a3a';
            } else {
                // Eye (show password) icon
                eyeIcon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
                togglePasswordBtn.style.color = '#94a3b8';
            }
        });
    }

    // Check if already logged in and validate session expiry
    if (sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true') {
        const lastActive = parseInt(sessionStorage.getItem(ACTIVITY_STORAGE_KEY) || '0', 10);
        const now = Date.now();
        if (lastActive && (now - lastActive > INACTIVITY_LIMIT_MS)) {
            handleSessionTimeout();
        } else {
            sessionStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
            showDashboard();
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();

        if (user === 'Lumin_admin' && pass === 'Veda@789') {
            sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
            sessionStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
            errorMsg.style.display = 'none';
            showDashboard();
        } else {
            errorMsg.textContent = 'Invalid credentials. Please try again.';
            errorMsg.style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', () => {
        performLogout();
    });

    // Automatically logout whenever clicking any link to navigate to another page (Home, Gallery, etc.)
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (anchor && anchor.getAttribute('href')) {
            const href = anchor.getAttribute('href').trim();
            // Check if navigating away to another page (exclude in-page hash #, tel:, mailto:, wa.me)
            if (!href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.includes('wa.me')) {
                if (!href.includes('admin.html')) {
                    performLogout();
                }
            }
        }
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderTable(currentEnquiries);
                return;
            }
            const filtered = currentEnquiries.filter(item => {
                return (item.name && item.name.toLowerCase().includes(query)) ||
                       (item.organization && item.organization.toLowerCase().includes(query)) ||
                       (item.sector && item.sector.toLowerCase().includes(query)) ||
                       (item.service && item.service.toLowerCase().includes(query)) ||
                       (item.email && item.email.toLowerCase().includes(query)) ||
                       (item.phone && item.phone.toLowerCase().includes(query)) ||
                       (item.message && item.message.toLowerCase().includes(query));
            });
            renderTable(filtered);
        });
    }

    // Modal Cancel Button
    if (btnCancelDelete) {
        btnCancelDelete.addEventListener('click', closeDeleteModal);
    }

    // Close modal when clicking outside modal box
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                closeDeleteModal();
            }
        });
    }

    // Modal Confirm Delete Button
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
            if (!pendingDeleteId) return;
            const idToDelete = pendingDeleteId;
            closeDeleteModal();
            await executeDelete(idToDelete);
        });
    }

    /**
     * Transitions the UI from the login view to the authenticated dashboard view,
     * starts user idle tracking, and triggers initial enquiry loading.
     */
    function showDashboard() {
        loginView.style.display = 'none';
        dashboardView.style.display = 'block';
        logoutBtn.style.display = 'block';
        startInactivityTracker();
        fetchEnquiries();
    }

    /**
     * Clears authentication tokens and timestamps, stops inactivity polling,
     * and resets the interface back to the login state.
     */
    function performLogout() {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(ACTIVITY_STORAGE_KEY);
        stopInactivityTracker();
        closeDeleteModal();
        loginView.style.display = 'grid';
        dashboardView.style.display = 'none';
        logoutBtn.style.display = 'none';
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        errorMsg.style.display = 'none';
    }

    /**
     * Handles automatic session termination when 30 minutes of idle time elapsed,
     * informing the user via an inline alert and toast notification.
     */
    function handleSessionTimeout() {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(ACTIVITY_STORAGE_KEY);
        stopInactivityTracker();
        closeDeleteModal();
        loginView.style.display = 'grid';
        dashboardView.style.display = 'none';
        logoutBtn.style.display = 'none';
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (errorMsg) {
            errorMsg.textContent = 'Session expired due to 30 minutes of inactivity. Please sign in again.';
            errorMsg.style.display = 'block';
        }
        showToast('Session expired due to 30 minutes of inactivity.', true);
    }

    /**
     * Throttled event listener recording user activity and updating the session timestamp.
     */
    function onUserActivity() {
        if (sessionStorage.getItem(AUTH_STORAGE_KEY) !== 'true') return;
        const now = Date.now();
        // Throttle updates to sessionStorage once every 5 seconds
        if (now - lastThrottledTime > 5000) {
            lastThrottledTime = now;
            sessionStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
        }
    }

    /**
     * Periodic check evaluating whether idle time has exceeded {@link INACTIVITY_LIMIT_MS}.
     */
    function checkInactivity() {
        if (sessionStorage.getItem(AUTH_STORAGE_KEY) !== 'true') {
            stopInactivityTracker();
            return;
        }
        const lastActive = parseInt(sessionStorage.getItem(ACTIVITY_STORAGE_KEY) || '0', 10);
        const now = Date.now();
        if (lastActive && (now - lastActive >= INACTIVITY_LIMIT_MS)) {
            handleSessionTimeout();
        }
    }

    /**
     * Attaches global user interaction listeners and starts the 10-second polling interval.
     */
    function startInactivityTracker() {
        if (!userActivityEventsBound) {
            const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
            events.forEach(evt => window.addEventListener(evt, onUserActivity, { passive: true }));
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    checkInactivity();
                }
            });
            userActivityEventsBound = true;
        }

        if (inactivityCheckInterval) clearInterval(inactivityCheckInterval);
        // Check inactivity every 10 seconds
        inactivityCheckInterval = setInterval(checkInactivity, 10000);
    }

    /**
     * Halts the background inactivity polling interval.
     */
    function stopInactivityTracker() {
        if (inactivityCheckInterval) {
            clearInterval(inactivityCheckInterval);
            inactivityCheckInterval = null;
        }
    }
});

/**
 * Initializes the interactive background particle canvas on the login panel.
 */
function initParticles() {
    if (typeof particlesJS !== 'undefined' && document.getElementById('particles-js')) {
        particlesJS("particles-js", {
            "particles": {
                "number": { "value": 50, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": ["#3b82f6", "#60a5fa"] },
                "shape": { "type": "circle" },
                "opacity": { "value": 0.5, "random": false, "anim": { "enable": false } },
                "size": { "value": 3, "random": true, "anim": { "enable": false } },
                "line_linked": { "enable": true, "distance": 150, "color": "#3b82f6", "opacity": 0.3, "width": 1 },
                "move": { "enable": true, "speed": 1.5, "direction": "none", "random": true, "straight": false, "out_mode": "out", "bounce": false }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": true, "mode": "push" }, "resize": true },
                "modes": { "grab": { "distance": 200, "line_linked": { "opacity": 0.6 } }, "push": { "particles_nb": 4 } }
            },
            "retina_detect": true
        });
    }
}

/**
 * Asynchronously fetches all stored consultation enquiries from the backend REST endpoint
 * {@code GET /api/enquiries} and triggers the table rendering pipeline.
 *
 * @async
 * @returns {Promise<void>}
 */
async function fetchEnquiries() {
    const tbody = document.getElementById('enquiries-body');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">Loading enquiries from database...</td></tr>';

    try {
        const response = await fetch('/api/enquiries');
        if (response.ok) {
            const data = await response.json();
            currentEnquiries = data;
            renderTable(data);
        } else {
            throw new Error('API not available');
        }
    } catch (error) {
        console.warn('Could not fetch from /api/enquiries:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 48px 24px; color: #dc2626;">
                    <div style="font-size: 1rem; font-weight: 700; margin-bottom: 6px;">Failed to load enquiries from database</div>
                    <div style="font-size: 0.875rem; color: #64748b;">Please check that your backend server is running and refresh.</div>
                </td>
            </tr>
        `;
    }
}

/**
 * Normalizes phone number into E.164 international format for WhatsApp (https://wa.me/...).
 * Ensures Indian (+91) numbers are always prefixed correctly and never confused with +82 (South Korea).
 *
 * @param {string} phone - Inbound contact phone string
 * @returns {string} Digits formatted for wa.me with international code 91
 */
function formatWaNumber(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (!digits) return '';

    // Strip leading international double zero (e.g. 0091...)
    if (digits.startsWith('00')) {
        digits = digits.substring(2);
    }
    // If 11 digits starting with 0 (e.g. 08247472841), strip leading 0
    if (digits.length === 11 && digits.startsWith('0')) {
        digits = digits.substring(1);
    }
    // If already 12 digits starting with 91 (e.g. 918247472841), return as is
    if (digits.startsWith('91') && digits.length === 12) {
        return digits;
    }
    // If standard 10-digit Indian mobile number
    if (digits.length === 10) {
        return '91' + digits;
    }
    // If digits do not start with 91, ensure 91 is prepended for Indian numbers
    if (!digits.startsWith('91')) {
        if (digits.length > 10) {
            return '91' + digits.slice(-10);
        }
        return '91' + digits;
    }
    return digits;
}

/**
 * Dynamically builds and inserts the table rows for the dashboard.
 * Renders both summary master rows and collapsible sub-rows for detailed viewing.
 *
 * @param {Array<Object>} data - Array of enquiry records to render in the table.
 */
function renderTable(data) {
    const tbody = document.getElementById('enquiries-body');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 48px 24px; color: #94a3b8;">
                    <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 6px; color: #64748b;">No enquiries found</div>
                    <div style="font-size: 0.875rem;">New enquiries submitted from the contact form will appear here automatically.</div>
                </td>
            </tr>
        `;
        return;
    }

    data.forEach((item, index) => {
        const itemId = item.id !== undefined ? item.id : `item-${index}`;
        const formattedDate = formatDate(item.createdAt || item.date);

        const rawPhone = (item.phone || '').trim();
        const waPhone = formatWaNumber(rawPhone);
        const waText = encodeURIComponent(`Hello ${item.name || ''}, thank you for contacting Lumin Consultancy regarding ${item.service || 'our accreditation services'}. How can we assist you?`);
        const waLink = waPhone ? `https://wa.me/${waPhone}?text=${waText}` : '#';

        // Main Summary Row
        const trMain = document.createElement('tr');
        trMain.className = 'main-row';
        trMain.id = `row-${itemId}`;
        trMain.setAttribute('data-id', itemId);

        trMain.innerHTML = `
            <td style="text-align: center; width: 36px; padding: 14px 8px;">
                <span class="expand-indicator" id="expand-icon-${itemId}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </span>
            </td>
            <td style="text-align: center; font-weight: 700; color: #64748b; font-size: 0.85rem; width: 50px; padding: 14px 8px;">
                ${index + 1}
            </td>
            <td style="white-space: nowrap; font-size: 0.85rem; color: #64748b; font-weight: 500; width: 140px;">
                ${formattedDate}
            </td>
            <td style="min-width: 140px;">
                <div style="font-weight: 700; color: #0f172a;">${escapeHtml(item.name || 'Anonymous')}</div>
                ${item.designation ? `<div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(item.designation)}</div>` : ''}
            </td>
            <td style="min-width: 130px;">
                <div style="font-weight: 600; color: #334155;">${escapeHtml(item.organization || '-')}</div>
            </td>
            <td style="font-size: 0.875rem; color: #475569; min-width: 180px;">
                <div><a href="mailto:${escapeHtml(item.email)}" style="color: #0284c7; text-decoration: none;" class="contact-link" onclick="event.stopPropagation();">${escapeHtml(item.email || '-')}</a></div>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                    <span style="color: #64748b; font-size: 0.8rem;">${escapeHtml(item.phone || '-')}</span>
                    ${rawPhone ? `<a href="${waLink}" target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp" onclick="event.stopPropagation();" style="color: #25D366; display: inline-flex; align-items: center;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                    </a>` : ''}
                </div>
            </td>
            <td style="width: 130px;">
                <span class="status-badge">${escapeHtml(item.sector || 'General')}</span>
            </td>
            <td style="font-weight: 500; color: #1e293b; font-size: 0.9rem; min-width: 140px;">
                ${escapeHtml(item.service || 'Consultancy')}
            </td>
            <td style="text-align: center; white-space: nowrap; width: 80px; padding: 14px 8px;">
                <button type="button" class="btn-delete-row" title="Delete record">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        `;

        // Detailed Expanded Sub-Row
        const trDetails = document.createElement('tr');
        trDetails.className = 'details-row';
        trDetails.id = `details-${itemId}`;

        trDetails.innerHTML = `
            <td colspan="9" style="padding: 0;">
                <div class="details-card">
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Full Name & Role</span>
                            <span class="detail-value">${escapeHtml(item.name || '-')} ${item.designation ? `(${escapeHtml(item.designation)})` : ''}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Organization</span>
                            <span class="detail-value">${escapeHtml(item.organization || '-')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Email Address</span>
                            <span class="detail-value"><a href="mailto:${escapeHtml(item.email)}" style="color: #0284c7; text-decoration: none;">${escapeHtml(item.email || '-')}</a></span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Phone Number</span>
                            <span class="detail-value"><a href="tel:${escapeHtml(item.phone)}" style="color: #0284c7; text-decoration: none;">${escapeHtml(item.phone || '-')}</a></span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Industry Sector</span>
                            <span class="detail-value">${escapeHtml(item.sector || '-')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Service Requested</span>
                            <span class="detail-value">${escapeHtml(item.service || '-')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Current Stage / Status</span>
                            <span class="detail-value">${escapeHtml(item.status || 'Initial Request')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Preferred Contact Method</span>
                            <span class="detail-value">${escapeHtml(item.preferred || 'Any')}</span>
                        </div>
                    </div>

                    <div class="detail-label" style="margin-top: 12px;">Enquiry Message & Requirements:</div>
                    <div class="message-box">${escapeHtml(item.message || 'No detailed message provided with this submission.')}</div>

                    <div class="details-actions">
                        <div class="btn-action-group">
                            <a href="mailto:${escapeHtml(item.email)}?subject=Re:%20Lumin%20Consultancy%20Enquiry%20-%20${encodeURIComponent(item.service || 'Accreditation')}" class="btn-action btn-email">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                Reply via Email
                            </a>
                            ${rawPhone ? `
                            <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn-action btn-whatsapp">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                </svg>
                                Reply on WhatsApp
                            </a>` : ''}
                            ${item.phone ? `
                            <a href="tel:${escapeHtml(item.phone)}" class="btn-action btn-call">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                Call Client
                            </a>` : ''}
                        </div>

                        <button type="button" class="btn-action btn-delete">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete Record Permanently
                        </button>
                    </div>
                </div>
            </td>
        `;

        // Direct Event Listener for Delete Button in Main Row
        const deleteRowBtn = trMain.querySelector('.btn-delete-row');
        if (deleteRowBtn) {
            deleteRowBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.deleteEnquiryRecord(item);
            });
        }

        // Direct Event Listener for Delete Button in Expanded Details Card
        const deleteDetailBtn = trDetails.querySelector('.btn-delete');
        if (deleteDetailBtn) {
            deleteDetailBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.deleteEnquiryRecord(item);
            });
        }

        // Row Click Handler for Expansion (ignoring button and link clicks)
        trMain.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('a')) {
                return;
            }
            toggleRowExpansion(itemId);
        });

        tbody.appendChild(trMain);
        tbody.appendChild(trDetails);
    });
}

/**
 * Toggles the expanded visibility state of an enquiry's detail row.
 *
 * @param {string|number} itemId - The ID identifier of the target row.
 */
function toggleRowExpansion(itemId) {
    const mainRow = document.getElementById(`row-${itemId}`);
    const detailsRow = document.getElementById(`details-${itemId}`);
    if (!mainRow || !detailsRow) return;

    const isCurrentlyOpen = detailsRow.classList.contains('is-open');

    if (isCurrentlyOpen) {
        detailsRow.classList.remove('is-open');
        mainRow.classList.remove('is-expanded');
    } else {
        detailsRow.classList.add('is-open');
        mainRow.classList.add('is-expanded');
    }
}

/**
 * Global trigger to open the modal confirmation dialog for deleting an enquiry record.
 *
 * @param {Object|number|string} itemOrId - The enquiry item object or its numeric identifier.
 */
window.deleteEnquiryRecord = function(itemOrId) {
    let item = itemOrId;
    if (typeof itemOrId === 'number' || typeof itemOrId === 'string') {
        item = currentEnquiries.find(e => e.id == itemOrId) || { id: itemOrId };
    }
    if (!item || !item.id) return;

    pendingDeleteId = item.id;

    const modal = document.getElementById('delete-modal');
    const modalText = document.getElementById('delete-modal-text');

    if (modal && modalText) {
        const orgInfo = item.organization ? ` from <strong>${escapeHtml(item.organization)}</strong>` : '';
        const nameInfo = item.name ? escapeHtml(item.name) : 'this client';
        modalText.innerHTML = `Are you sure you want to permanently delete the enquiry record for <strong>${nameInfo}</strong>${orgInfo}?<br><br>This will permanently erase it from the database.`;
        modal.classList.add('is-visible');
    } else {
        if (confirm(`Are you sure you want to permanently delete the enquiry record for ${item.name || 'this enquiry'}?`)) {
            executeDelete(item.id);
        }
    }
};

/**
 * Sends a DELETE request to {@code /api/enquiries/{id}} and removes the row from the table DOM upon success.
 *
 * @async
 * @param {number|string} id - The ID of the enquiry record to delete.
 * @returns {Promise<void>}
 */
async function executeDelete(id) {
    if (!id) return;

    const mainRow = document.getElementById(`row-${id}`);
    const detailsRow = document.getElementById(`details-${id}`);
    if (mainRow) {
        mainRow.style.transition = 'all 0.3s ease';
        mainRow.style.opacity = '0.3';
    }

    try {
        const response = await fetch(`/api/enquiries/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            if (mainRow) mainRow.remove();
            if (detailsRow) detailsRow.remove();
            currentEnquiries = currentEnquiries.filter(item => item.id != id);
            showToast('Enquiry record deleted permanently from database.');
            if (currentEnquiries.length === 0) {
                renderTable([]);
            }
        } else {
            if (mainRow) mainRow.style.opacity = '1';
            const err = await response.json().catch(() => ({}));
            showToast(err.error || 'Failed to delete record from database.', true);
        }
    } catch (error) {
        console.error('Delete request error:', error);
        if (mainRow) mainRow.remove();
        if (detailsRow) detailsRow.remove();
        currentEnquiries = currentEnquiries.filter(item => item.id != id);
        showToast('Enquiry record deleted.');
    } finally {
        pendingDeleteId = null;
    }
}

/**
 * Dismisses the deletion confirmation modal and clears pending state.
 */
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.remove('is-visible');
    }
    pendingDeleteId = null;
}

/**
 * Displays a non-intrusive floating toast notification to the administrator.
 *
 * @param {string} message - Message text to present in the toast.
 * @param {boolean} [isError=false] - If true, styles the toast with an error background (red).
 */
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    if (isError) {
        toast.style.background = '#dc2626';
    } else {
        toast.style.background = '#0f2a3a';
    }

    toast.classList.add('is-show');
    setTimeout(() => {
        toast.classList.remove('is-show');
    }, 4000);
}

/**
 * Formats an ISO-8601 or legacy timestamp string into Indian Standard Time (IST, Asia/Kolkata).
 *
 * @param {string} dateString - Raw date string from backend or entity.
 * @returns {string} Formatted human-readable date and time (e.g. "Oct 21, 2026, 01:25 AM").
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        let str = String(dateString).trim();
        const istOptions = {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        // If string already has a timezone indicator ('Z' or offset like +05:30), parse directly
        if (str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str)) {
            const date = new Date(str);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-US', istOptions);
            }
        }

        // For legacy timestamps without timezone:
        // Try interpreting as UTC, and also as local time
        const utcDate = new Date(str.includes('T') ? str + 'Z' : str.replace(' ', 'T') + 'Z');
        const localDate = new Date(str.includes('T') ? str : str.replace(' ', 'T'));

        // If treating as UTC pushes the timestamp into the future, it was already stored in local time (e.g. localhost submission)
        const chosenDate = (!isNaN(utcDate.getTime()) && utcDate.getTime() <= Date.now() + 120000)
            ? utcDate
            : localDate;

        if (isNaN(chosenDate.getTime())) return dateString;

        return chosenDate.toLocaleDateString('en-US', istOptions);
    } catch (e) {
        return dateString;
    }
}

/**
 * Escapes unsafe characters from user-supplied strings to safeguard against Cross-Site Scripting (XSS).
 *
 * @param {*} unsafe - Raw input value.
 * @returns {string} HTML-escaped string safe for DOM insertion.
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

