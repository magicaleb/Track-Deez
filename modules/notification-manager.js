/**
 * Notification manager for habit reminders
 * @module notification-manager
 */

import { NOTIFICATION_DEFAULTS } from '../utils/constants.js';
import { environment } from '../config.js';
import { showToast } from './ui-helpers.js';

export class NotificationManager {
    constructor() {
        this.enabled = false;
        this.permission = 'default';
        this.dailyReminderTime = NOTIFICATION_DEFAULTS.dailyReminderTime;
        this.habitReminders = {}; // habitId -> time string
        this.activeTimers = {}; // Store timeout IDs for proper cleanup
        
        this.init();
    }
    
    /**
     * Initialize notification manager
     */
    async init() {
        if (!environment.supportsNotifications) {
            console.log('Notifications not supported');
            return;
        }
        
        this.permission = Notification.permission;
        
        // Load settings from localStorage
        this.loadSettings();
        
        // Set up daily reminder if enabled
        if (this.enabled && this.permission === 'granted') {
            this.scheduleDailyReminder();
        }
    }
    
    /**
     * Request notification permission
     * @returns {Promise<boolean>} True if permission granted
     */
    async requestPermission() {
        if (!environment.supportsNotifications) {
            showToast('Notifications not supported on this device', 'error');
            return false;
        }
        
        if (this.permission === 'granted') {
            return true;
        }
        
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                showToast('Notifications enabled!', 'success');
                this.enabled = true;
                this.saveSettings();
                return true;
            } else {
                showToast('Notification permission denied', 'warning');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            showToast('Failed to enable notifications', 'error');
            return false;
        }
    }
    
    /**
     * Enable notifications
     * @returns {Promise<boolean>} Success status
     */
    async enable() {
        const granted = await this.requestPermission();
        if (granted) {
            this.scheduleDailyReminder();
        }
        return granted;
    }
    
    /**
     * Disable notifications
     */
    disable() {
        this.enabled = false;
        this.clearAllReminders();
        this.saveSettings();
        showToast('Notifications disabled', 'info');
    }
    
    /**
     * Set daily reminder time
     * @param {string} time - Time in HH:MM format
     */
    setDailyReminderTime(time) {
        this.dailyReminderTime = time;
        this.saveSettings();
        
        if (this.enabled && this.permission === 'granted') {
            this.scheduleDailyReminder();
        }
    }
    
    /**
     * Schedule daily reminder
     */
    scheduleDailyReminder() {
        // Clear existing reminder
        this.clearReminder('daily-reminder');
        
        // Calculate time until reminder
        const [hours, minutes] = this.dailyReminderTime.split(':').map(Number);
        const now = new Date();
        const reminderTime = new Date(now);
        reminderTime.setHours(hours, minutes, 0, 0);
        
        // If time has passed today, schedule for tomorrow
        if (reminderTime <= now) {
            reminderTime.setDate(reminderTime.getDate() + 1);
        }
        
        const msUntilReminder = reminderTime - now;
        
        // Schedule reminder
        const timerId = setTimeout(() => {
            this.sendDailyReminder();
            // Reschedule for next day
            this.scheduleDailyReminder();
        }, msUntilReminder);
        
        this.activeTimers['daily-reminder'] = timerId;
        
        console.log(`Daily reminder scheduled for ${this.dailyReminderTime}`);
    }
    
    /**
     * Send daily reminder notification
     */
    sendDailyReminder() {
        if (!this.enabled || this.permission !== 'granted') {
            return;
        }
        
        try {
            const notification = new Notification('Track Deez Reminder', {
                body: 'Time to track today\'s habits! 📊',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-96x96.png',
                tag: 'daily-reminder',
                requireInteraction: false,
                silent: false
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            // Auto close after 10 seconds
            setTimeout(() => notification.close(), 10000);
        } catch (error) {
            console.error('Error sending daily reminder:', error);
        }
    }
    
    /**
     * Set habit-specific reminder
     * @param {string} habitId - Habit ID
     * @param {string} habitName - Habit name
     * @param {string} time - Time in HH:MM format
     */
    setHabitReminder(habitId, habitName, time) {
        this.habitReminders[habitId] = { name: habitName, time };
        this.saveSettings();
        
        if (this.enabled && this.permission === 'granted') {
            this.scheduleHabitReminder(habitId, habitName, time);
        }
    }
    
    /**
     * Schedule habit-specific reminder
     * @param {string} habitId - Habit ID
     * @param {string} habitName - Habit name
     * @param {string} time - Time in HH:MM format
     */
    scheduleHabitReminder(habitId, habitName, time) {
        // Clear existing reminder for this habit
        this.clearReminder(`habit-${habitId}`);
        
        const [hours, minutes] = time.split(':').map(Number);
        const now = new Date();
        const reminderTime = new Date(now);
        reminderTime.setHours(hours, minutes, 0, 0);
        
        if (reminderTime <= now) {
            reminderTime.setDate(reminderTime.getDate() + 1);
        }
        
        const msUntilReminder = reminderTime - now;
        
        const timerId = setTimeout(() => {
            this.sendHabitReminder(habitId, habitName);
            // Reschedule for next day
            this.scheduleHabitReminder(habitId, habitName, time);
        }, msUntilReminder);
        
        this.activeTimers[`habit-${habitId}`] = timerId;
    }
    
    /**
     * Send habit reminder notification
     * @param {string} habitId - Habit ID
     * @param {string} habitName - Habit name
     */
    sendHabitReminder(habitId, habitName) {
        if (!this.enabled || this.permission !== 'granted') {
            return;
        }
        
        try {
            const notification = new Notification(`Reminder: ${habitName}`, {
                body: 'Don\'t forget to complete your habit today! 💪',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-96x96.png',
                tag: `habit-${habitId}`,
                requireInteraction: false,
                silent: false
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            setTimeout(() => notification.close(), 10000);
        } catch (error) {
            console.error('Error sending habit reminder:', error);
        }
    }
    
    /**
     * Remove habit reminder
     * @param {string} habitId - Habit ID
     */
    removeHabitReminder(habitId) {
        delete this.habitReminders[habitId];
        this.clearReminder(`habit-${habitId}`);
        this.saveSettings();
    }
    
    /**
     * Clear a specific reminder
     * @param {string} reminderId - Reminder ID
     */
    clearReminder(reminderId) {
        if (this.activeTimers[reminderId]) {
            clearTimeout(this.activeTimers[reminderId]);
            delete this.activeTimers[reminderId];
        }
    }
    
    /**
     * Clear all reminders
     */
    clearAllReminders() {
        Object.keys(this.activeTimers).forEach(reminderId => {
            clearTimeout(this.activeTimers[reminderId]);
        });
        this.activeTimers = {};
    }
    
    /**
     * Send milestone celebration notification
     * @param {string} habitName - Habit name
     * @param {number} milestone - Milestone reached
     */
    sendMilestoneNotification(habitName, milestone) {
        if (!this.enabled || this.permission !== 'granted') {
            return;
        }
        
        const emoji = milestone >= 100 ? '🎉' : milestone >= 30 ? '🔥' : '⭐';
        
        try {
            const notification = new Notification('Milestone Reached! ' + emoji, {
                body: `${habitName}: ${milestone}-day streak! Keep it up!`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-96x96.png',
                tag: 'milestone',
                requireInteraction: true,
                silent: false
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        } catch (error) {
            console.error('Error sending milestone notification:', error);
        }
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem('notificationSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.enabled = parsed.enabled || false;
                this.dailyReminderTime = parsed.dailyReminderTime || NOTIFICATION_DEFAULTS.dailyReminderTime;
                this.habitReminders = parsed.habitReminders || {};
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            const settings = {
                enabled: this.enabled,
                dailyReminderTime: this.dailyReminderTime,
                habitReminders: this.habitReminders
            };
            localStorage.setItem('notificationSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving notification settings:', error);
        }
    }
    
    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return {
            enabled: this.enabled,
            permission: this.permission,
            dailyReminderTime: this.dailyReminderTime,
            habitReminders: this.habitReminders,
            supported: environment.supportsNotifications
        };
    }
}
