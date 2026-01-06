/**
 * Constants for Track Deez application
 * @module constants
 */

// Time ranges
export const ALL_DAYS_RANGE = 365;
export const WEEK_DAYS = 7;
export const MONTH_DAYS = 30;
export const QUARTER_DAYS = 90;

// Chart settings
export const CANVAS_HEIGHT = 200;
export const CHART_COLORS = {
    primary: '#2196F3',
    success: '#4CAF50',
    warning: '#FFC107',
    danger: '#F44336',
    gray: '#9E9E9E'
};

// Storage keys
export const STORAGE_KEY = 'trackDeezData';
export const CLOUD_CONFIG_KEY = 'trackDeezCloudConfig';

// Streak milestones for celebrations
export const STREAK_MILESTONES = [7, 30, 100, 365];

// Animation durations (ms)
export const ANIMATION_DURATION = {
    fast: 150,
    normal: 300,
    slow: 500
};

// Touch targets (minimum size in pixels)
export const MIN_TOUCH_TARGET = 44;

// Debounce delays (ms)
export const DEBOUNCE_DELAY = {
    search: 300,
    resize: 150,
    scroll: 100,
    chart: 500
};

// Notification settings
export const NOTIFICATION_DEFAULTS = {
    dailyReminderTime: '21:00', // 9 PM
    enabled: false
};

// Date formats
export const DATE_FORMAT = {
    display: 'MMM D, YYYY',
    storage: 'YYYY-MM-DD',
    time: 'HH:mm'
};

// Calendar colors
export const CALENDAR_STATUS = {
    complete: 'green',
    partial: 'yellow',
    incomplete: 'red',
    noData: 'gray'
};

// Planner settings
export const PLANNER_CONFIG = {
    startHour: 0,
    endHour: 24,
    slotHeight: 60, // pixels per hour
    updateInterval: 60000 // 1 minute
};

// Cloud sync settings
export const CLOUD_SYNC = {
    autoSyncInterval: 300000, // 5 minutes
    retryAttempts: 3,
    retryDelay: 2000 // 2 seconds
};

// Performance settings
export const PERF_LIMITS = {
    virtualScrollThreshold: 20,
    maxCalendarCache: 12, // months
    maxChartDataPoints: 90
};
