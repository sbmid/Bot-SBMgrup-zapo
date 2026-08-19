// SBMgrup - Shared Utilities

const API_BASE = '/api';

// API Helper
async function apiCall(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });
    
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.error || 'Request failed');
    }
    
    return data;
}

// Show alert
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => alertDiv.remove(), 5000);
}

// Confirm action
function confirmAction(message) {
    return confirm(message);
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format JID (remove domain)
function formatJID(jid) {
    return jid.split('@')[0];
}

// Modal helpers
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Loading state
function setLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = '<span class="loading"></span>';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showAlert('Copied to clipboard', 'success');
    } catch (err) {
        showAlert('Failed to copy', 'error');
    }
}
