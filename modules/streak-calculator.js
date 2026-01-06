/**
 * Streak calculation and tracking for habits
 * @module streak-calculator
 */

import { formatDate, parseDate, addDays, getTodayString, compareDates } from '../utils/date-utils.js';
import { STREAK_MILESTONES } from '../utils/constants.js';

/**
 * Calculate the current streak for a habit
 * @param {string} habitId - Habit ID
 * @param {Object} daysData - Days data object from DataManager
 * @returns {number} Current streak count
 */
export function calculateCurrentStreak(habitId, daysData) {
    const today = getTodayString();
    let streak = 0;
    let currentDate = parseDate(today);
    
    // Start from today and count backwards
    while (true) {
        const dateStr = formatDate(currentDate);
        const dayData = daysData[dateStr];
        
        // Check if habit was completed on this date
        if (dayData && dayData.habits && dayData.habits[habitId] === true) {
            streak++;
            currentDate = addDays(currentDate, -1);
        } else {
            // Streak is broken
            break;
        }
    }
    
    return streak;
}

/**
 * Calculate the longest streak for a habit
 * @param {string} habitId - Habit ID
 * @param {Object} daysData - Days data object from DataManager
 * @param {string} habitCreatedAt - ISO date string when habit was created
 * @returns {Object} Longest streak info {count, startDate, endDate}
 */
export function calculateLongestStreak(habitId, daysData, habitCreatedAt) {
    const createdDate = new Date(habitCreatedAt);
    const today = new Date();
    
    let longestStreak = 0;
    let longestStart = null;
    let longestEnd = null;
    
    let currentStreakCount = 0;
    let currentStreakStart = null;
    
    // Iterate through all days from creation to today
    let currentDate = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
    
    while (currentDate <= today) {
        const dateStr = formatDate(currentDate);
        const dayData = daysData[dateStr];
        
        if (dayData && dayData.habits && dayData.habits[habitId] === true) {
            if (currentStreakCount === 0) {
                currentStreakStart = new Date(currentDate);
            }
            currentStreakCount++;
        } else {
            if (currentStreakCount > longestStreak) {
                longestStreak = currentStreakCount;
                longestStart = currentStreakStart;
                longestEnd = addDays(currentDate, -1);
            }
            currentStreakCount = 0;
            currentStreakStart = null;
        }
        
        currentDate = addDays(currentDate, 1);
    }
    
    // Check if current streak is the longest
    if (currentStreakCount > longestStreak) {
        longestStreak = currentStreakCount;
        longestStart = currentStreakStart;
        longestEnd = today;
    }
    
    return {
        count: longestStreak,
        startDate: longestStart ? formatDate(longestStart) : null,
        endDate: longestEnd ? formatDate(longestEnd) : null
    };
}

/**
 * Get all streaks for a habit (for analysis)
 * @param {string} habitId - Habit ID
 * @param {Object} daysData - Days data object from DataManager
 * @param {string} habitCreatedAt - ISO date string when habit was created
 * @returns {Array} Array of streak objects {count, startDate, endDate}
 */
export function getAllStreaks(habitId, daysData, habitCreatedAt) {
    const createdDate = new Date(habitCreatedAt);
    const today = new Date();
    
    const streaks = [];
    let currentStreakCount = 0;
    let currentStreakStart = null;
    
    let currentDate = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
    
    while (currentDate <= today) {
        const dateStr = formatDate(currentDate);
        const dayData = daysData[dateStr];
        
        if (dayData && dayData.habits && dayData.habits[habitId] === true) {
            if (currentStreakCount === 0) {
                currentStreakStart = new Date(currentDate);
            }
            currentStreakCount++;
        } else {
            if (currentStreakCount > 0) {
                streaks.push({
                    count: currentStreakCount,
                    startDate: formatDate(currentStreakStart),
                    endDate: formatDate(addDays(currentDate, -1))
                });
            }
            currentStreakCount = 0;
            currentStreakStart = null;
        }
        
        currentDate = addDays(currentDate, 1);
    }
    
    // Add current streak if it exists
    if (currentStreakCount > 0) {
        streaks.push({
            count: currentStreakCount,
            startDate: formatDate(currentStreakStart),
            endDate: formatDate(today)
        });
    }
    
    return streaks;
}

/**
 * Check if a streak milestone was just reached
 * @param {number} previousStreak - Previous streak count
 * @param {number} currentStreak - Current streak count
 * @returns {number|null} Milestone reached or null
 */
export function checkMilestone(previousStreak, currentStreak) {
    for (const milestone of STREAK_MILESTONES) {
        if (currentStreak >= milestone && previousStreak < milestone) {
            return milestone;
        }
    }
    return null;
}

/**
 * Get streak status for a habit
 * @param {string} habitId - Habit ID
 * @param {Object} daysData - Days data object from DataManager
 * @param {string} habitCreatedAt - ISO date string when habit was created
 * @returns {Object} Streak status object
 */
export function getStreakStatus(habitId, daysData, habitCreatedAt) {
    const current = calculateCurrentStreak(habitId, daysData);
    const longest = calculateLongestStreak(habitId, daysData, habitCreatedAt);
    
    const today = getTodayString();
    const yesterday = formatDate(addDays(new Date(), -1));
    
    const completedToday = daysData[today]?.habits?.[habitId] === true;
    const completedYesterday = daysData[yesterday]?.habits?.[habitId] === true;
    
    return {
        current,
        longest: longest.count,
        longestPeriod: longest,
        completedToday,
        completedYesterday,
        isActive: current > 0,
        nextMilestone: getNextMilestone(current)
    };
}

/**
 * Get the next milestone for a streak
 * @param {number} currentStreak - Current streak count
 * @returns {number|null} Next milestone or null if none
 */
export function getNextMilestone(currentStreak) {
    for (const milestone of STREAK_MILESTONES) {
        if (currentStreak < milestone) {
            return milestone;
        }
    }
    return null;
}

/**
 * Calculate streak statistics for all habits
 * @param {Array} habits - Array of habit objects
 * @param {Object} daysData - Days data object from DataManager
 * @returns {Object} Map of habitId to streak status
 */
export function calculateAllStreaks(habits, daysData) {
    const streakStats = {};
    
    for (const habit of habits) {
        if (!habit.archived) {
            streakStats[habit.id] = getStreakStatus(habit.id, daysData, habit.createdAt);
        }
    }
    
    return streakStats;
}

/**
 * Get habits with active streaks sorted by streak length
 * @param {Object} streakStats - Streak statistics from calculateAllStreaks
 * @param {Array} habits - Array of habit objects
 * @returns {Array} Sorted array of habits with their streaks
 */
export function getTopStreaks(streakStats, habits) {
    const habitsWithStreaks = habits
        .filter(h => !h.archived && streakStats[h.id]?.current > 0)
        .map(h => ({
            ...h,
            streak: streakStats[h.id]
        }))
        .sort((a, b) => b.streak.current - a.streak.current);
    
    return habitsWithStreaks;
}

/**
 * Check if streak will break if habit not completed today
 * @param {string} habitId - Habit ID
 * @param {Object} daysData - Days data object from DataManager
 * @returns {boolean} True if streak at risk
 */
export function isStreakAtRisk(habitId, daysData) {
    const today = getTodayString();
    const completedToday = daysData[today]?.habits?.[habitId] === true;
    
    if (completedToday) {
        return false; // Already completed today
    }
    
    const currentStreak = calculateCurrentStreak(habitId, daysData);
    return currentStreak > 0; // Streak exists but not completed today
}
