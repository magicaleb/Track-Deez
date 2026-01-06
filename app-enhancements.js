/**
 * Integration layer for new modules with existing app
 * This file bridges the new modular code with the existing monolithic app-main.js
 * @module app-enhancements
 */

import { NotificationManager } from './modules/notification-manager.js';
import { calculateAllStreaks, getStreakStatus, checkMilestone } from './modules/streak-calculator.js';
import { showToast, showLoading, hideLoading, showConfirm, celebrateMilestone } from './modules/ui-helpers.js';
import { formatDate, formatDateDisplay, getTodayString } from './utils/date-utils.js';

/**
 * Enhanced app functionality that extends the base HabitTrackerApp
 */
export class AppEnhancements {
    constructor(habitApp) {
        this.habitApp = habitApp;
        this.notificationManager = new NotificationManager();
        this.streakCache = {};
        this.init();
    }
    
    /**
     * Initialize enhancements
     */
    async init() {
        console.log('Initializing app enhancements...');
        
        // Wait for the main app's data to be loaded
        await this.habitApp.dataManager.ensureInitialized();
        
        // Calculate initial streaks
        this.updateStreakCache();
        
        // Set up event listeners for habit completions to track milestones
        this.setupMilestoneTracking();
        
        console.log('App enhancements initialized');
    }
    
    /**
     * Update streak cache
     */
    updateStreakCache() {
        const habits = this.habitApp.dataManager.data.habits;
        const daysData = this.habitApp.dataManager.data.days;
        this.streakCache = calculateAllStreaks(habits, daysData);
    }
    
    /**
     * Get streak status for a habit
     * @param {string} habitId - Habit ID
     * @returns {Object} Streak status
     */
    getHabitStreak(habitId) {
        return this.streakCache[habitId] || { current: 0, longest: 0 };
    }
    
    /**
     * Setup milestone tracking
     */
    setupMilestoneTracking() {
        // Store reference to original setHabitComplete method
        const originalSetHabitComplete = this.habitApp.dataManager.setHabitComplete.bind(this.habitApp.dataManager);
        
        // Wrap it to add milestone checking
        this.habitApp.dataManager.setHabitComplete = async (date, habitId, completed) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === getTodayString();
            
            // Get previous streak
            const previousStreak = this.streakCache[habitId]?.current || 0;
            
            // Call original method
            await originalSetHabitComplete(date, habitId, completed);
            
            // Update streak cache
            this.updateStreakCache();
            
            // Check for milestone if completing today
            if (completed && isToday) {
                const currentStreak = this.streakCache[habitId]?.current || 0;
                const milestone = checkMilestone(previousStreak, currentStreak);
                
                if (milestone) {
                    const habit = this.habitApp.dataManager.data.habits.find(h => h.id === habitId);
                    if (habit) {
                        celebrateMilestone(milestone);
                        this.notificationManager.sendMilestoneNotification(habit.name, milestone);
                    }
                }
            }
        };
    }
    
    /**
     * Replace alert with toast
     * @param {string} message - Message to display
     * @param {string} type - Toast type
     */
    showMessage(message, type = 'info') {
        showToast(message, type);
    }
    
    /**
     * Replace confirm with custom dialog
     * @param {string} message - Confirmation message
     * @returns {Promise<boolean>} User's choice
     */
    async confirmAction(message) {
        return await showConfirm(message);
    }
    
    /**
     * Show loading indicator
     * @param {string} message - Loading message
     * @returns {HTMLElement} Loading element reference
     */
    showLoadingIndicator(message) {
        return showLoading(message);
    }
    
    /**
     * Hide loading indicator
     * @param {HTMLElement} loadingElement - Loading element to hide
     */
    hideLoadingIndicator(loadingElement) {
        hideLoading(loadingElement);
    }
    
    /**
     * Get notification settings
     * @returns {Object} Notification settings
     */
    getNotificationSettings() {
        return this.notificationManager.getSettings();
    }
    
    /**
     * Enable notifications
     */
    async enableNotifications() {
        return await this.notificationManager.enable();
    }
    
    /**
     * Disable notifications
     */
    disableNotifications() {
        this.notificationManager.disable();
    }
    
    /**
     * Set daily reminder time
     * @param {string} time - Time in HH:MM format
     */
    setDailyReminderTime(time) {
        this.notificationManager.setDailyReminderTime(time);
    }
    
    /**
     * Set habit reminder
     * @param {string} habitId - Habit ID
     * @param {string} habitName - Habit name
     * @param {string} time - Time in HH:MM format
     */
    setHabitReminder(habitId, habitName, time) {
        this.notificationManager.setHabitReminder(habitId, habitName, time);
    }
    
    /**
     * Remove habit reminder
     * @param {string} habitId - Habit ID
     */
    removeHabitReminder(habitId) {
        this.notificationManager.removeHabitReminder(habitId);
    }
}

// Make enhancements available globally for easy access
window.AppEnhancements = AppEnhancements;
