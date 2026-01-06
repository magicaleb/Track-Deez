/**
 * UI helper functions and utilities
 * @module ui-helpers
 */

import { ANIMATION_DURATION } from '../utils/constants.js';
import { environment } from '../config.js';

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    
    // Add icon based on type
    const icon = getToastIcon(type);
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.innerHTML = icon;
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    
    toast.appendChild(iconSpan);
    toast.appendChild(messageSpan);
    
    // Add to container
    container.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });
    
    // Haptic feedback if available
    if (environment.supportsVibration && type === 'success') {
        navigator.vibrate(50);
    }
    
    // Remove after duration
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => {
            toast.remove();
            // Remove container if empty
            if (container.children.length === 0) {
                container.remove();
            }
        }, ANIMATION_DURATION.normal);
    }, duration);
}

/**
 * Get icon SVG for toast type
 * @param {string} type - Toast type
 * @returns {string} SVG icon HTML
 */
function getToastIcon(type) {
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 20h20L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><circle cx="12" cy="8" r="0.5" fill="currentColor"/></svg>'
    };
    return icons[type] || icons.info;
}

/**
 * Show loading spinner
 * @param {string} message - Optional loading message
 * @returns {HTMLElement} Loading element (to be removed later)
 */
export function showLoading(message = 'Loading...') {
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.setAttribute('role', 'status');
    loading.setAttribute('aria-live', 'polite');
    
    loading.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p class="loading-message">${message}</p>
        </div>
    `;
    
    document.body.appendChild(loading);
    return loading;
}

/**
 * Hide loading spinner
 * @param {HTMLElement} loadingElement - Loading element to remove
 */
export function hideLoading(loadingElement) {
    if (loadingElement && loadingElement.parentNode) {
        loadingElement.classList.add('fade-out');
        setTimeout(() => {
            loadingElement.remove();
        }, ANIMATION_DURATION.fast);
    }
}

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Confirm button text
 * @param {string} cancelText - Cancel button text
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
export function showConfirm(message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary confirm-cancel">${cancelText}</button>
                    <button class="btn-primary confirm-ok">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const cleanup = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), ANIMATION_DURATION.normal);
        };
        
        modal.querySelector('.confirm-cancel').addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
        
        modal.querySelector('.confirm-ok').addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cleanup();
                resolve(false);
            }
        });
    });
}

/**
 * Create a skeleton loader element
 * @param {number} count - Number of skeleton items
 * @returns {HTMLElement} Skeleton loader element
 */
export function createSkeleton(count = 3) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-loader';
    
    for (let i = 0; i < count; i++) {
        const item = document.createElement('div');
        item.className = 'skeleton-item';
        skeleton.appendChild(item);
    }
    
    return skeleton;
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Animate element entrance
 * @param {HTMLElement} element - Element to animate
 * @param {string} animation - Animation class name
 */
export function animateIn(element, animation = 'fade-in') {
    element.classList.add(animation);
    element.addEventListener('animationend', () => {
        element.classList.remove(animation);
    }, { once: true });
}

/**
 * Animate element exit
 * @param {HTMLElement} element - Element to animate
 * @param {string} animation - Animation class name
 * @returns {Promise} Resolves when animation completes
 */
export function animateOut(element, animation = 'fade-out') {
    return new Promise((resolve) => {
        element.classList.add(animation);
        element.addEventListener('animationend', () => {
            element.classList.remove(animation);
            resolve();
        }, { once: true });
    });
}

/**
 * Scroll to element smoothly
 * @param {HTMLElement} element - Element to scroll to
 * @param {Object} options - Scroll options
 */
export function scrollToElement(element, options = {}) {
    const defaultOptions = {
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
    };
    
    element.scrollIntoView({ ...defaultOptions, ...options });
}

/**
 * Focus management for modals
 * @param {HTMLElement} modal - Modal element
 */
export function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Focus first element
    firstElement.focus();
    
    // Handle tab key
    const handleTab = (e) => {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    };
    
    modal.addEventListener('keydown', handleTab);
    
    // Return cleanup function
    return () => modal.removeEventListener('keydown', handleTab);
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Celebrate milestone with animation
 * @param {number} milestone - Milestone reached
 */
export function celebrateMilestone(milestone) {
    const emoji = milestone >= 100 ? '🎉' : milestone >= 30 ? '🔥' : '⭐';
    const message = `${emoji} ${milestone}-day streak! Keep it up!`;
    showToast(message, 'success', 5000);
    
    // Add confetti or other celebration effect here if desired
    if (environment.supportsVibration) {
        navigator.vibrate([100, 50, 100, 50, 100]);
    }
}

/**
 * Handle modal open
 * @param {HTMLElement} modal - Modal element
 */
export function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Set up focus trap
    const cleanup = trapFocus(modal);
    
    // Return cleanup function
    return () => {
        document.body.style.overflow = '';
        if (cleanup) cleanup();
    };
}

/**
 * Handle modal close
 * @param {HTMLElement} modal - Modal element
 * @param {Function} cleanup - Cleanup function from openModal
 */
export function closeModal(modal, cleanup) {
    modal.classList.remove('active');
    if (cleanup) cleanup();
}
