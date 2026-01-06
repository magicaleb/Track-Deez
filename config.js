/**
 * Application configuration
 * @module config
 */

export const config = {
    // App metadata
    appName: 'Track Deez',
    version: '2.0.0',
    
    // Feature flags
    features: {
        cloudSync: true,
        notifications: true,
        darkMode: true,
        analytics: false,
        betaFeatures: false
    },
    
    // Storage configuration
    storage: {
        preferIndexedDB: true,
        fallbackToLocalStorage: true,
        autoBackup: true
    },
    
    // UI configuration
    ui: {
        theme: 'auto', // 'light', 'dark', or 'auto'
        animations: true,
        hapticFeedback: true,
        soundEffects: false
    },
    
    // Performance configuration
    performance: {
        lazyLoadViews: true,
        cacheCalendar: true,
        debounceExpensiveOps: true,
        virtualScrolling: false // Enable when > 20 habits
    },
    
    // Notification configuration
    notifications: {
        dailyReminder: false,
        habitReminders: true,
        milestoneAlerts: true,
        defaultReminderTime: '21:00'
    },
    
    // Development configuration
    dev: {
        logging: false,
        debugMode: false,
        mockData: false
    }
};

// Environment detection
export const environment = {
    isPWA: window.matchMedia('(display-mode: standalone)').matches,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    supportsNotifications: 'Notification' in window,
    supportsVibration: 'vibrate' in navigator,
    supportsServiceWorker: 'serviceWorker' in navigator,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
};

/**
 * Update configuration at runtime
 * @param {Object} updates - Configuration updates
 */
export function updateConfig(updates) {
    Object.keys(updates).forEach(key => {
        if (config[key] && typeof config[key] === 'object') {
            config[key] = { ...config[key], ...updates[key] };
        } else {
            config[key] = updates[key];
        }
    });
}
