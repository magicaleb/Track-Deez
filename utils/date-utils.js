/**
 * Date utility functions for Track Deez
 * @module date-utils
 */

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a date for display (e.g., "Jan 1, 2024")
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateDisplay(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format time as HH:MM
 * @param {Date} date - Date object with time
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Parse a date string in YYYY-MM-DD format
 * @param {string} dateStr - Date string to parse
 * @returns {Date} Date object
 */
export function parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Get today's date as a Date object at midnight
 * @returns {Date} Today at 00:00:00
 */
export function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Get today's date string in YYYY-MM-DD format
 * @returns {string} Today's date string
 */
export function getTodayString() {
    return formatDate(getToday());
}

/**
 * Check if a date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
    const dateStr = typeof date === 'string' ? date : formatDate(date);
    return dateStr === getTodayString();
}

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isPast(date) {
    const dateObj = typeof date === 'string' ? parseDate(date) : date;
    return dateObj < getToday();
}

/**
 * Check if a date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export function isFuture(date) {
    const dateObj = typeof date === 'string' ? parseDate(date) : date;
    return dateObj > getToday();
}

/**
 * Get the start of the week for a given date
 * @param {Date} date - Date to get week start for
 * @param {number} startDay - Start day of week (0 = Sunday, 1 = Monday)
 * @returns {Date} Start of week date
 */
export function getWeekStart(date, startDay = 0) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day < startDay ? 7 : 0) + day - startDay;
    d.setDate(d.getDate() - diff);
    return d;
}

/**
 * Get the end of the week for a given date
 * @param {Date} date - Date to get week end for
 * @param {number} startDay - Start day of week (0 = Sunday, 1 = Monday)
 * @returns {Date} End of week date
 */
export function getWeekEnd(date, startDay = 0) {
    const start = getWeekStart(date, startDay);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
}

/**
 * Get array of dates between two dates (inclusive)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Date[]} Array of dates
 */
export function getDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/**
 * Get the number of days between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Number of days between dates
 */
export function getDaysDifference(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
}

/**
 * Add days to a date
 * @param {Date} date - Starting date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date
 */
export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Get the name of the day of the week
 * @param {Date} date - Date to get day name for
 * @param {boolean} short - Whether to use short form (Mon vs Monday)
 * @returns {string} Day name
 */
export function getDayName(date, short = false) {
    const options = { weekday: short ? 'short' : 'long' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Get the name of the month
 * @param {Date} date - Date to get month name for
 * @param {boolean} short - Whether to use short form (Jan vs January)
 * @returns {string} Month name
 */
export function getMonthName(date, short = false) {
    const options = { month: short ? 'short' : 'long' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Get the first day of the month
 * @param {Date} date - Date in the month
 * @returns {Date} First day of month
 */
export function getMonthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the last day of the month
 * @param {Date} date - Date in the month
 * @returns {Date} Last day of month
 */
export function getMonthEnd(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Get all days in a month
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @returns {Date[]} Array of dates in the month
 */
export function getMonthDays(year, month) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return getDateRange(start, end);
}

/**
 * Compare two dates (ignoring time)
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1, date2) {
    const d1 = typeof date1 === 'string' ? parseDate(date1) : new Date(date1);
    const d2 = typeof date2 === 'string' ? parseDate(date2) : new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    if (d1 < d2) return -1;
    if (d1 > d2) return 1;
    return 0;
}

/**
 * Check if two dates are the same day
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if same day
 */
export function isSameDay(date1, date2) {
    return compareDates(date1, date2) === 0;
}
