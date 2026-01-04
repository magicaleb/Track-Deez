// Track Deez - Habit Tracking Application

// Constants
const ALL_DAYS_RANGE = 365;
const CANVAS_HEIGHT = 200;

// Data Management
class DataManager {
    constructor() {
        this.data = {
            habits: [],
            trackingFields: [],
            days: {}, // key: YYYY-MM-DD, value: { habits: {}, tracking: {} }
            plannerEvents: [], // array of daily planner event objects
            events: [], // array of calendar event objects
            templates: [] // array of event template objects
        };
        this.dbManager = new DBManager();
        this.useIndexedDB = false;
        this.initialized = false;
        this.initPromise = this.init();
    }

    async init() {
        try {
            // Try to initialize IndexedDB
            await this.dbManager.init();
            this.useIndexedDB = true;
            console.log('IndexedDB initialized successfully');
            
            // Check for data migration from localStorage
            await this.migrateFromLocalStorage();
            
            // Load data from IndexedDB
            await this.loadData();
        } catch (error) {
            console.error('IndexedDB initialization failed, falling back to localStorage:', error);
            this.useIndexedDB = false;
            
            // Load from localStorage as fallback
            this.loadDataFromLocalStorage();
        }
        
        this.initialized = true;
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initPromise;
        }
    }

    async migrateFromLocalStorage() {
        try {
            const localData = localStorage.getItem('trackDeezData');
            if (!localData) {
                console.log('No localStorage data to migrate');
                return;
            }

            console.log('Found localStorage data, starting migration...');
            const data = JSON.parse(localData);

            // Migrate habits
            if (data.habits && data.habits.length > 0) {
                await this.dbManager.putAll('habits', data.habits);
                console.log(`Migrated ${data.habits.length} habits`);
            }

            // Migrate tracking fields
            if (data.trackingFields && data.trackingFields.length > 0) {
                await this.dbManager.putAll('trackingFields', data.trackingFields);
                console.log(`Migrated ${data.trackingFields.length} tracking fields`);
            }

            // Migrate days data
            if (data.days && Object.keys(data.days).length > 0) {
                const daysArray = Object.keys(data.days).map(date => ({
                    date: date,
                    habits: data.days[date].habits || {},
                    tracking: data.days[date].tracking || {}
                }));
                await this.dbManager.putAll('days', daysArray);
                console.log(`Migrated ${daysArray.length} days of data`);
            }

            // Migrate planner events
            if (data.plannerEvents && data.plannerEvents.length > 0) {
                await this.dbManager.putAll('plannerEvents', data.plannerEvents);
                console.log(`Migrated ${data.plannerEvents.length} planner events`);
            }

            // Remove localStorage data after successful migration
            localStorage.removeItem('trackDeezData');
            console.log('Migration complete! localStorage data removed.');
        } catch (error) {
            console.error('Error during migration:', error);
            // Don't remove localStorage if migration failed
        }
    }

    loadDataFromLocalStorage() {
        const data = localStorage.getItem('trackDeezData');
        if (data) {
            const parsedData = JSON.parse(data);
            this.data = {
                habits: parsedData.habits || [],
                trackingFields: parsedData.trackingFields || [],
                days: parsedData.days || {},
                plannerEvents: parsedData.plannerEvents || []
            };
        }
    }

    async loadData() {
        if (!this.useIndexedDB) {
            this.loadDataFromLocalStorage();
            return;
        }

        try {
            // Load habits
            const habits = await this.dbManager.getAll('habits');
            this.data.habits = habits || [];

            // Load tracking fields
            const trackingFields = await this.dbManager.getAll('trackingFields');
            this.data.trackingFields = trackingFields || [];

            // Load days data
            const daysArray = await this.dbManager.getAll('days');
            this.data.days = {};
            daysArray.forEach(dayObj => {
                this.data.days[dayObj.date] = {
                    habits: dayObj.habits || {},
                    tracking: dayObj.tracking || {}
                };
            });

            // Load planner events
            const plannerEvents = await this.dbManager.getAll('plannerEvents');
            this.data.plannerEvents = plannerEvents || [];

            // Load events
            const events = await this.dbManager.getAll('events');
            this.data.events = events || [];

            // Load templates
            const templates = await this.dbManager.getAll('templates');
            this.data.templates = templates || [];

            console.log('Data loaded from IndexedDB');
        } catch (error) {
            console.error('Error loading data from IndexedDB:', error);
            // Fallback to empty data structure
            this.data = {
                habits: [],
                trackingFields: [],
                days: {},
                plannerEvents: [],
                events: [],
                templates: []
            };
        }
    }

    async saveData() {
        if (!this.useIndexedDB) {
            localStorage.setItem('trackDeezData', JSON.stringify(this.data));
            return;
        }

        try {
            // Save habits
            await this.dbManager.putAll('habits', this.data.habits);

            // Save tracking fields
            await this.dbManager.putAll('trackingFields', this.data.trackingFields);

            // Save days data
            const daysArray = Object.keys(this.data.days).map(date => ({
                date: date,
                habits: this.data.days[date].habits || {},
                tracking: this.data.days[date].tracking || {}
            }));
            await this.dbManager.putAll('days', daysArray);

            // Save planner events
            await this.dbManager.putAll('plannerEvents', this.data.plannerEvents);

            // Save events
            await this.dbManager.putAll('events', this.data.events);

            // Save templates
            await this.dbManager.putAll('templates', this.data.templates);

            console.log('Data saved to IndexedDB');
        } catch (error) {
            console.error('Error saving data to IndexedDB:', error);
            // Fallback to localStorage
            localStorage.setItem('trackDeezData', JSON.stringify(this.data));
        }
    }

    // Habits
    async addHabit(name, description = '', isBuildUpHabit = false, buildUpConfig = null) {
        const habit = {
            id: Date.now().toString(),
            name,
            description,
            archived: false,
            createdAt: new Date().toISOString(),
            isBuildUpHabit: isBuildUpHabit || false
        };
        
        // Add build-up configuration if this is a build-up habit
        if (isBuildUpHabit && buildUpConfig) {
            habit.buildUpConfig = {
                startValue: buildUpConfig.startValue,
                goalValue: buildUpConfig.goalValue,
                incrementValue: buildUpConfig.incrementValue,
                daysForIncrement: buildUpConfig.daysForIncrement,
                unit: buildUpConfig.unit || '',
                currentValue: buildUpConfig.currentValue || buildUpConfig.startValue,
                currentStreak: buildUpConfig.currentStreak || 0
            };
        }
        
        this.data.habits.push(habit);
        await this.saveData();
        return habit;
    }

    async updateHabit(id, name, description = '', isBuildUpHabit = false, buildUpConfig = null) {
        const habitIndex = this.data.habits.findIndex(h => h.id === id);
        if (habitIndex !== -1) {
            const existingHabit = this.data.habits[habitIndex];
            this.data.habits[habitIndex] = {
                ...existingHabit,
                name,
                description,
                isBuildUpHabit: isBuildUpHabit || false
            };
            
            // Update build-up configuration if provided
            if (isBuildUpHabit && buildUpConfig) {
                // Preserve current progress if it exists
                const currentValue = existingHabit.buildUpConfig?.currentValue || buildUpConfig.startValue;
                const currentStreak = existingHabit.buildUpConfig?.currentStreak || 0;
                
                this.data.habits[habitIndex].buildUpConfig = {
                    startValue: buildUpConfig.startValue,
                    goalValue: buildUpConfig.goalValue,
                    incrementValue: buildUpConfig.incrementValue,
                    daysForIncrement: buildUpConfig.daysForIncrement,
                    unit: buildUpConfig.unit || '',
                    currentValue: currentValue,
                    currentStreak: currentStreak
                };
            } else if (!isBuildUpHabit) {
                // Remove build-up config if habit is no longer a build-up habit
                delete this.data.habits[habitIndex].buildUpConfig;
            }
            
            await this.saveData();
            return this.data.habits[habitIndex];
        }
        return null;
    }

    async archiveHabit(id) {
        const habitIndex = this.data.habits.findIndex(h => h.id === id);
        if (habitIndex !== -1) {
            this.data.habits[habitIndex].archived = true;
            await this.saveData();
        }
    }

    async unarchiveHabit(id) {
        const habitIndex = this.data.habits.findIndex(h => h.id === id);
        if (habitIndex !== -1) {
            this.data.habits[habitIndex].archived = false;
            await this.saveData();
        }
    }

    async deleteHabit(id) {
        this.data.habits = this.data.habits.filter(h => h.id !== id);
        // Do NOT clean up habit data from days - preserve historical data
        await this.saveData();
    }

    // Tracking Fields
    async addTrackingField(name, type, unit = '', description = '') {
        const field = {
            id: Date.now().toString(),
            name,
            type,
            unit,
            description,
            createdAt: new Date().toISOString()
        };
        this.data.trackingFields.push(field);
        await this.saveData();
        return field;
    }

    async updateTrackingField(id, name, type, unit = '', description = '') {
        const fieldIndex = this.data.trackingFields.findIndex(f => f.id === id);
        if (fieldIndex !== -1) {
            this.data.trackingFields[fieldIndex] = {
                ...this.data.trackingFields[fieldIndex],
                name,
                type,
                unit,
                description
            };
            await this.saveData();
            return this.data.trackingFields[fieldIndex];
        }
        return null;
    }

    async deleteTrackingField(id) {
        this.data.trackingFields = this.data.trackingFields.filter(f => f.id !== id);
        // Do NOT clean up tracking data from days - preserve historical data
        await this.saveData();
    }

    // Day Data
    getDayData(date) {
        const dateStr = this.formatDate(date);
        if (!this.data.days[dateStr]) {
            this.data.days[dateStr] = { habits: {}, tracking: {} };
        }
        return this.data.days[dateStr];
    }

    async setHabitComplete(date, habitId, completed) {
        const dateStr = this.formatDate(date);
        const dayData = this.getDayData(date);
        
        // Check if it's a build-up habit
        const habit = this.data.habits.find(h => h.id === habitId);
        if (habit && habit.isBuildUpHabit && habit.buildUpConfig) {
            const config = habit.buildUpConfig;
            
            if (completed) {
                // Increment streak
                config.currentStreak = (config.currentStreak || 0) + 1;
                
                // Check if we've reached the threshold for increment
                if (config.currentStreak >= config.daysForIncrement) {
                    // Increase current value, but not exceeding goal
                    config.currentValue = Math.min(
                        config.currentValue + config.incrementValue,
                        config.goalValue
                    );
                    // Reset streak
                    config.currentStreak = 0;
                }
            } else {
                // Reset streak when unchecking
                config.currentStreak = 0;
            }
            
            // Update the habit in the data structure
            const habitIndex = this.data.habits.findIndex(h => h.id === habitId);
            if (habitIndex !== -1) {
                this.data.habits[habitIndex].buildUpConfig = config;
            }
        }
        
        dayData.habits[habitId] = completed;
        await this.saveData();
    }

    async setTracking(date, fieldId, value) {
        const dateStr = this.formatDate(date);
        const dayData = this.getDayData(date);
        dayData.tracking[fieldId] = value;
        await this.saveData();
    }

    getDayStatus(date) {
        // Check if date is in the future
        // Future dates have no data yet, so they should be marked as gray
        // This prevents the calendar from showing completion status for dates that haven't occurred
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        
        if (checkDate > today) {
            return 'gray'; // Future dates have no data
        }
        
        const dayData = this.getDayData(date);
        // Only count non-archived habits
        const activeHabits = this.data.habits.filter(h => !h.archived);
        const totalHabits = activeHabits.length;
        
        if (totalHabits === 0) return 'gray';
        
        const completedHabits = activeHabits.filter(h => dayData.habits[h.id]).length;
        
        if (completedHabits === 0) return 'red';
        if (completedHabits === totalHabits) return 'green';
        return 'yellow';
    }

    formatDate(date) {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    exportData() {
        return JSON.stringify(this.data, null, 2);
    }

    async importData(importedData) {
        try {
            // Validate the structure
            if (!importedData.habits || !importedData.trackingFields || !importedData.days) {
                throw new Error('Invalid data format');
            }

            // Merge habits (avoid duplicates by name to prevent UI confusion)
            // Note: This intentionally uses name matching to avoid duplicate visible entries
            const existingHabitNames = new Set(this.data.habits.map(h => h.name));
            importedData.habits.forEach(habit => {
                if (!existingHabitNames.has(habit.name)) {
                    this.data.habits.push(habit);
                }
            });

            // Merge tracking fields (avoid duplicates by name to prevent UI confusion)
            // Note: This intentionally uses name matching to avoid duplicate visible entries
            const existingFieldNames = new Set(this.data.trackingFields.map(f => f.name));
            importedData.trackingFields.forEach(field => {
                if (!existingFieldNames.has(field.name)) {
                    this.data.trackingFields.push(field);
                }
            });

            // Merge day data (overwrite existing dates)
            Object.keys(importedData.days).forEach(date => {
                this.data.days[date] = importedData.days[date];
            });

            await this.saveData();
            return { success: true };
        } catch (error) {
            console.error('Error importing data:', error);
            return { success: false, error: error.message };
        }
    }

    async clearAllData() {
        this.data = {
            habits: [],
            trackingFields: [],
            days: {},
            plannerEvents: [],
            events: [],
            templates: []
        };
        await this.saveData();
    }

    // Events
    async addEvent(name, description, date, startTime, duration, recurrence = null) {
        const event = {
            id: Date.now().toString(),
            name,
            description,
            date, // YYYY-MM-DD format for one-time events
            startTime, // HH:MM format
            duration, // in minutes
            recurrence, // null for one-time events, object for recurring
            createdAt: new Date().toISOString()
        };
        this.data.events.push(event);
        await this.saveData();
        return event;
    }

    async updateEvent(id, name, description, date, startTime, duration, recurrence = null, updateAll = true) {
        const eventIndex = this.data.events.findIndex(e => e.id === id);
        if (eventIndex !== -1) {
            if (updateAll) {
                // Update the entire event series
                this.data.events[eventIndex] = {
                    ...this.data.events[eventIndex],
                    name,
                    description,
                    date,
                    startTime,
                    duration,
                    recurrence
                };
            } else {
                // Create exception for this occurrence - add as new event without recurrence
                const newEvent = {
                    id: Date.now().toString(),
                    name,
                    description,
                    date,
                    startTime,
                    duration,
                    recurrence: null,
                    createdAt: new Date().toISOString(),
                    parentEventId: id // Track that this is an exception
                };
                this.data.events.push(newEvent);
            }
            await this.saveData();
            return this.data.events[eventIndex];
        }
        return null;
    }

    async deleteEvent(id, deleteAll = true) {
        if (deleteAll) {
            this.data.events = this.data.events.filter(e => e.id !== id);
        } else {
            // For single occurrence deletion, we'd need to add to an exclusion list
            // For now, simplified implementation
            this.data.events = this.data.events.filter(e => e.id !== id);
        }
        await this.saveData();
    }

    // Templates
    async addTemplate(name, description, duration) {
        const template = {
            id: Date.now().toString(),
            name,
            description,
            duration, // in minutes
            createdAt: new Date().toISOString()
        };
        this.data.templates.push(template);
        await this.saveData();
        return template;
    }

    async updateTemplate(id, name, description, duration) {
        const templateIndex = this.data.templates.findIndex(t => t.id === id);
        if (templateIndex !== -1) {
            this.data.templates[templateIndex] = {
                ...this.data.templates[templateIndex],
                name,
                description,
                duration
            };
            await this.saveData();
            return this.data.templates[templateIndex];
        }
        return null;
    }

    async deleteTemplate(id) {
        this.data.templates = this.data.templates.filter(t => t.id !== id);
        await this.saveData();
    }

    // Helper method to get events for a specific date (including recurring)
    getEventsForDate(date) {
        const dateStr = this.formatDate(date);
        const events = [];

        this.data.events.forEach(event => {
            if (event.recurrence) {
                // Check if this recurring event occurs on this date
                if (this.eventOccursOnDate(event, date)) {
                    events.push({ ...event, isRecurring: true });
                }
            } else if (event.date === dateStr) {
                // One-time event
                events.push({ ...event, isRecurring: false });
            }
        });

        return events;
    }

    // Check if a recurring event occurs on a specific date
    eventOccursOnDate(event, date) {
        if (!event.recurrence) return false;

        const checkDate = new Date(date);
        const eventStartDate = new Date(event.date);
        
        // Event hasn't started yet
        if (checkDate < eventStartDate) return false;

        // Check end date
        if (event.recurrence.endDate) {
            const endDate = new Date(event.recurrence.endDate);
            if (checkDate > endDate) return false;
        }

        const recurrence = event.recurrence;
        const daysDiff = Math.floor((checkDate - eventStartDate) / (1000 * 60 * 60 * 24));

        switch (recurrence.type) {
            case 'daily':
                if (daysDiff % recurrence.interval === 0) {
                    // Check occurrences limit
                    if (recurrence.occurrences) {
                        const occurrenceNumber = Math.floor(daysDiff / recurrence.interval) + 1;
                        return occurrenceNumber <= recurrence.occurrences;
                    }
                    return true;
                }
                return false;

            case 'weekly':
                if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
                    const weeksDiff = Math.floor(daysDiff / 7);
                    if (weeksDiff % recurrence.interval === 0) {
                        const dayOfWeek = checkDate.getDay();
                        if (recurrence.daysOfWeek.includes(dayOfWeek)) {
                            if (recurrence.occurrences) {
                                // Count occurrences up to this date without recursion
                                let count = 0;
                                for (let d = new Date(eventStartDate); d <= checkDate; d.setDate(d.getDate() + 1)) {
                                    const dWeeksDiff = Math.floor((d - eventStartDate) / (1000 * 60 * 60 * 24 * 7));
                                    if (dWeeksDiff % recurrence.interval === 0 && recurrence.daysOfWeek.includes(d.getDay())) {
                                        count++;
                                    }
                                }
                                return count <= recurrence.occurrences;
                            }
                            return true;
                        }
                    }
                }
                return false;

            case 'monthly':
                const monthsDiff = (checkDate.getFullYear() - eventStartDate.getFullYear()) * 12 
                                 + (checkDate.getMonth() - eventStartDate.getMonth());
                
                if (monthsDiff % recurrence.interval === 0) {
                    if (recurrence.dayOfMonth) {
                        // Specific day of month
                        if (checkDate.getDate() === recurrence.dayOfMonth) {
                            if (recurrence.occurrences) {
                                const occurrenceNumber = Math.floor(monthsDiff / recurrence.interval) + 1;
                                return occurrenceNumber <= recurrence.occurrences;
                            }
                            return true;
                        }
                    } else if (recurrence.monthlyPattern) {
                        // Pattern like "2nd Tuesday" or "last Friday"
                        const pattern = recurrence.monthlyPattern;
                        let targetDate;
                        
                        if (pattern.week === -1) {
                            // Last occurrence of the day in the month
                            const lastDayOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0);
                            let lastOccurrence = lastDayOfMonth.getDate();
                            
                            // Walk backward to find the last occurrence of the target day
                            while (new Date(checkDate.getFullYear(), checkDate.getMonth(), lastOccurrence).getDay() !== pattern.dayOfWeek) {
                                lastOccurrence--;
                            }
                            targetDate = lastOccurrence;
                        } else {
                            // Nth occurrence of the day
                            const firstDayOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth(), 1);
                            const firstDayOfWeek = firstDayOfMonth.getDay();
                            const daysUntilTarget = (pattern.dayOfWeek - firstDayOfWeek + 7) % 7;
                            targetDate = 1 + daysUntilTarget + (pattern.week - 1) * 7;
                            
                            // Validate that the date exists in this month
                            const testDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), targetDate);
                            if (testDate.getMonth() !== checkDate.getMonth()) {
                                return false; // Date doesn't exist in this month
                            }
                        }
                        
                        if (checkDate.getDate() === targetDate) {
                            if (recurrence.occurrences) {
                                const occurrenceNumber = Math.floor(monthsDiff / recurrence.interval) + 1;
                                return occurrenceNumber <= recurrence.occurrences;
                            }
                            return true;
                        }
                    }
                }
                return false;

            case 'yearly':
                const yearsDiff = checkDate.getFullYear() - eventStartDate.getFullYear();
                if (yearsDiff % recurrence.interval === 0) {
                    if (checkDate.getMonth() === eventStartDate.getMonth() 
                        && checkDate.getDate() === eventStartDate.getDate()) {
                        if (recurrence.occurrences) {
                            const occurrenceNumber = Math.floor(yearsDiff / recurrence.interval) + 1;
                            return occurrenceNumber <= recurrence.occurrences;
                        }
                        return true;
                    }
                }
                return false;

            case 'custom':
                // Custom is handled like daily with custom interval
                if (daysDiff % recurrence.interval === 0) {
                    if (recurrence.occurrences) {
                        const occurrenceNumber = Math.floor(daysDiff / recurrence.interval) + 1;
                        return occurrenceNumber <= recurrence.occurrences;
                    }
                    return true;
                }
                return false;

            default:
                return false;
        }
    }
}

// Planner Management
class PlannerManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentDate = new Date();
        this.timeUpdateInterval = null;
        this.startHour = 6;  // 6 AM
        this.endHour = 23;   // 11 PM
    }

    // Event CRUD operations
    async addEvent(date, startTime, endTime, title, category = 'other', notes = '') {
        const event = {
            id: crypto.randomUUID(),
            date: this.formatDate(date),
            startTime,
            endTime,
            title,
            category,
            notes,
            createdAt: new Date().toISOString()
        };
        this.dataManager.data.plannerEvents.push(event);
        await this.dataManager.saveData();
        return event;
    }

    async updateEvent(id, startTime, endTime, title, category = 'other', notes = '') {
        const eventIndex = this.dataManager.data.plannerEvents.findIndex(e => e.id === id);
        if (eventIndex !== -1) {
            const existingEvent = this.dataManager.data.plannerEvents[eventIndex];
            this.dataManager.data.plannerEvents[eventIndex] = {
                ...existingEvent,
                startTime,
                endTime,
                title,
                category,
                notes
            };
            await this.dataManager.saveData();
            return this.dataManager.data.plannerEvents[eventIndex];
        }
        return null;
    }

    async deleteEvent(id) {
        this.dataManager.data.plannerEvents = this.dataManager.data.plannerEvents.filter(e => e.id !== id);
        await this.dataManager.saveData();
    }

    getEventsForDate(date) {
        const dateStr = this.formatDate(date);
        return this.dataManager.data.plannerEvents
            .filter(e => e.date === dateStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Time formatting utility
    formatTime12h(hours, minutes) {
        const hour12 = hours % 12 || 12;
        const ampm = hours < 12 ? 'AM' : 'PM';
        return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
    }

    // Time utilities
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    getCurrentTimeInfo() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        
        // Calculate position relative to viewing window (startHour to endHour)
        const startMinutes = this.startHour * 60;
        const endMinutes = this.endHour * 60;
        const viewRangeMinutes = endMinutes - startMinutes;
        
        if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
            return null; // Outside viewing hours
        }
        
        const minutesFromStart = totalMinutes - startMinutes;
        const percentage = (minutesFromStart / viewRangeMinutes) * 100;
        
        return {
            hours,
            minutes,
            totalMinutes,
            percentage,
            timeString: this.formatTime12h(hours, minutes)
        };
    }

    isEventCurrent(event) {
        const now = new Date();
        const today = this.formatDate(now);
        
        if (event.date !== today) {
            return false;
        }
        
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const eventStart = this.timeToMinutes(event.startTime);
        const eventEnd = this.timeToMinutes(event.endTime);
        
        return currentMinutes >= eventStart && currentMinutes < eventEnd;
    }

    isEventPast(event) {
        const now = new Date();
        const today = this.formatDate(now);
        
        if (event.date < today) {
            return true;
        }
        
        if (event.date > today) {
            return false;
        }
        
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const eventEnd = this.timeToMinutes(event.endTime);
        
        return currentMinutes >= eventEnd;
    }

    getEventPosition(event) {
        const startMinutes = this.timeToMinutes(event.startTime);
        const endMinutes = this.timeToMinutes(event.endTime);
        const duration = endMinutes - startMinutes;
        
        const viewStartMinutes = this.startHour * 60;
        const viewRangeMinutes = (this.endHour - this.startHour) * 60;
        
        const topPercentage = ((startMinutes - viewStartMinutes) / viewRangeMinutes) * 100;
        const heightPercentage = (duration / viewRangeMinutes) * 100;
        
        return {
            top: topPercentage,
            height: heightPercentage
        };
    }
}

// App Controller
class HabitTrackerApp {
    constructor() {
        this.dataManager = new DataManager();
        this.plannerManager = new PlannerManager(this.dataManager);
        this.currentDate = new Date();
        this.currentView = 'today';
        this.calendarMonth = new Date();
        this.statsRange = 7;
        
        this.init();
    }

    async init() {
        // Wait for DataManager to initialize
        await this.dataManager.ensureInitialized();
        
        this.setupNavigation();
        this.setupModals();
        this.renderTodayView();
        this.renderCalendarView();
        this.renderPlannerView();
        this.renderStatsView();
        this.renderSettingsView();
        this.setupInstallPrompt();
    }

    // Navigation
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });
    }

    switchView(view) {
        // Clear planner interval when leaving planner view
        if (this.currentView === 'planner' && view !== 'planner') {
            if (this.plannerManager && this.plannerManager.timeUpdateInterval) {
                clearInterval(this.plannerManager.timeUpdateInterval);
                this.plannerManager.timeUpdateInterval = null;
            }
        }
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Update views
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
        });
        document.getElementById(`${view}-view`).classList.add('active');

        this.currentView = view;

        // Refresh view
        if (view === 'today') this.renderTodayView();
        if (view === 'calendar') this.renderCalendarView();
        if (view === 'planner') this.renderPlannerView();
        if (view === 'stats') this.renderStatsView();
        if (view === 'settings') this.renderSettingsView();
    }

    // Today View
    renderTodayView() {
        // Date display
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = 
            this.currentDate.toLocaleDateString('en-US', dateOptions);

        // Day status
        const status = this.dataManager.getDayStatus(this.currentDate);
        const statusIndicator = document.querySelector('.status-indicator');
        statusIndicator.className = `status-indicator ${status}`;

        // Habits list - only show non-archived habits
        const habitsList = document.getElementById('habits-list');
        const habits = this.dataManager.data.habits.filter(h => !h.archived);

        if (habits.length === 0) {
            habitsList.innerHTML = '<div class="empty-state"><p>No habits yet. Add some in Settings.</p></div>';
        } else {
            const dayData = this.dataManager.getDayData(this.currentDate);
            habitsList.innerHTML = habits.map(habit => {
                const completed = dayData.habits[habit.id] || false;
                
                // Build habit name with build-up info if applicable
                let habitName = habit.name;
                let habitDescription = habit.description || '';
                
                if (habit.isBuildUpHabit && habit.buildUpConfig) {
                    const config = habit.buildUpConfig;
                    habitName += ` (Current Goal: ${config.currentValue}${config.unit ? ' ' + config.unit : ''})`;
                    
                    // Add progress info to description
                    const progressInfo = `${config.currentValue}/${config.goalValue}${config.unit ? ' ' + config.unit : ''} - ${config.currentStreak}/${config.daysForIncrement} days toward next increase`;
                    habitDescription = habitDescription ? `${habitDescription}<br><small>${progressInfo}</small>` : `<small>${progressInfo}</small>`;
                }
                
                return `
                    <div class="habit-item ${completed ? 'completed' : ''} ${habit.isBuildUpHabit ? 'build-up-habit' : ''}" data-habit-id="${habit.id}">
                        <div class="habit-checkbox ${completed ? 'checked' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>
                        <div class="habit-info">
                            <span class="habit-name">${habitName}</span>
                            ${habitDescription ? `<span class="habit-description">${habitDescription}</span>` : ''}
                        </div>
                        ${habit.isBuildUpHabit ? '<span class="build-up-badge">📈</span>' : ''}
                    </div>
                `;
            }).join('');

            // Add click handlers
            habitsList.querySelectorAll('.habit-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const habitId = item.dataset.habitId;
                    const dayData = this.dataManager.getDayData(this.currentDate);
                    const completed = !dayData.habits[habitId];
                    await this.dataManager.setHabitComplete(this.currentDate, habitId, completed);
                    this.renderTodayView();
                });
            });
        }

        // Tracking fields
        const trackingSection = document.getElementById('tracking-section');
        const trackingList = document.getElementById('tracking-list');
        const trackingFields = this.dataManager.data.trackingFields;

        if (trackingFields.length === 0) {
            trackingSection.style.display = 'none';
        } else {
            trackingSection.style.display = 'block';
            const dayData = this.dataManager.getDayData(this.currentDate);
            
            trackingList.innerHTML = trackingFields.map(field => {
                const value = dayData.tracking[field.id] || '';
                return `
                    <div class="tracking-item">
                        <div class="tracking-label-wrapper">
                            <div class="tracking-label">${field.name}${field.unit ? ` (${field.unit})` : ''}</div>
                            ${field.description ? `<div class="tracking-description">${field.description}</div>` : ''}
                        </div>
                        ${this.renderTrackingInput(field, value)}
                    </div>
                `;
            }).join('');

            // Add event listeners
            trackingList.querySelectorAll('input, select').forEach(input => {
                input.addEventListener('change', async (e) => {
                    const fieldId = e.target.dataset.fieldId;
                    await this.dataManager.setTracking(this.currentDate, fieldId, e.target.value);
                });
            });
        }
    }

    renderTrackingInput(field, value) {
        switch (field.type) {
            case 'boolean':
                return `
                    <select class="tracking-input" data-field-id="${field.id}">
                        <option value="">-- Select --</option>
                        <option value="Yes" ${value === 'Yes' ? 'selected' : ''}>Yes</option>
                        <option value="No" ${value === 'No' ? 'selected' : ''}>No</option>
                    </select>
                `;
            case 'number':
                return `<input type="number" class="tracking-input" data-field-id="${field.id}" value="${value}">`;
            case 'text':
                return `<input type="text" class="tracking-input" data-field-id="${field.id}" value="${value}">`;
            case 'time':
                return `<input type="time" class="tracking-input" data-field-id="${field.id}" value="${value}">`;
            default:
                return '';
        }
    }

    // Calendar View
    renderCalendarView() {
        const monthYear = document.getElementById('month-year');
        monthYear.textContent = this.calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const grid = document.getElementById('calendar-grid');
        
        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let html = dayHeaders.map(day => `<div class="calendar-day header">${day}</div>`).join('');

        // Calculate calendar days
        const firstDay = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth(), 1);
        const lastDay = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        // Empty cells before first day
        for (let i = 0; i < firstDayOfWeek; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Days of month
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth(), day);
            const status = this.dataManager.getDayStatus(date);
            const isToday = date.toDateString() === today.toDateString();
            
            html += `
                <div class="calendar-day ${status} ${isToday ? 'current' : ''}" data-date="${this.dataManager.formatDate(date)}">
                    ${day}
                </div>
            `;
        }

        grid.innerHTML = html;

        // Add click handlers
        grid.querySelectorAll('.calendar-day:not(.header):not(.empty)').forEach(day => {
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                this.showDayModal(new Date(date));
            });
        });

        // Month navigation
        document.getElementById('prev-month').onclick = () => {
            this.calendarMonth.setMonth(this.calendarMonth.getMonth() - 1);
            this.renderCalendarView();
        };

        document.getElementById('next-month').onclick = () => {
            this.calendarMonth.setMonth(this.calendarMonth.getMonth() + 1);
            this.renderCalendarView();
        };
    }

    showDayModal(date) {
        const modal = document.getElementById('day-modal');
        const modalDate = document.getElementById('modal-date');
        const modalBody = document.getElementById('modal-body');

        modalDate.textContent = date.toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        const dayData = this.dataManager.getDayData(date);
        const status = this.dataManager.getDayStatus(date);

        let html = `<div class="day-status"><div class="status-indicator ${status}"></div></div>`;

        // Habits - only show non-archived habits
        html += '<h3>Habits</h3>';
        const activeHabits = this.dataManager.data.habits.filter(h => !h.archived);
        if (activeHabits.length === 0) {
            html += '<p>No habits configured.</p>';
        } else {
            html += '<div class="habits-list">';
            activeHabits.forEach(habit => {
                const completed = dayData.habits[habit.id] || false;
                
                // Build habit name with build-up info if applicable
                let habitName = habit.name;
                let habitDescription = habit.description || '';
                
                if (habit.isBuildUpHabit && habit.buildUpConfig) {
                    const config = habit.buildUpConfig;
                    habitName += ` (Current Goal: ${config.currentValue}${config.unit ? ' ' + config.unit : ''})`;
                }
                
                html += `
                    <div class="habit-item ${completed ? 'completed' : ''} ${habit.isBuildUpHabit ? 'build-up-habit' : ''}">
                        <div class="habit-checkbox ${completed ? 'checked' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>
                        <div class="habit-info">
                            <span class="habit-name">${habitName}</span>
                            ${habitDescription ? `<span class="habit-description">${habitDescription}</span>` : ''}
                        </div>
                        ${habit.isBuildUpHabit ? '<span class="build-up-badge">📈</span>' : ''}
                    </div>
                `;
            });
            html += '</div>';
        }

        // Tracking
        if (this.dataManager.data.trackingFields.length > 0) {
            html += '<h3 style="margin-top: 1.5rem;">Tracking</h3>';
            html += '<div class="tracking-list">';
            this.dataManager.data.trackingFields.forEach(field => {
                const value = dayData.tracking[field.id] || 'Not recorded';
                html += `
                    <div class="tracking-item">
                        <div class="tracking-label-wrapper">
                            <div class="tracking-label">${field.name}</div>
                            ${field.description ? `<div class="tracking-description">${field.description}</div>` : ''}
                        </div>
                        <div style="font-weight: 600;">${value}${field.unit ? ' ' + field.unit : ''}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        modalBody.innerHTML = html;
        modal.classList.add('active');
    }

    // Planner View
    renderPlannerView() {
        // Update date display
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('planner-date').textContent = 
            this.plannerManager.currentDate.toLocaleDateString('en-US', dateOptions);

        // Render time column
        this.renderTimeColumn();

        // Render grid
        this.renderPlannerGrid();

        // Render events
        this.renderPlannerEvents();

        // Setup current time indicator
        this.setupCurrentTimeIndicator();

        // Setup navigation buttons (only once)
        if (!this._plannerNavSetup) {
            document.getElementById('planner-prev-day').onclick = () => {
                this.plannerManager.currentDate.setDate(this.plannerManager.currentDate.getDate() - 1);
                this.renderPlannerView();
            };

            document.getElementById('planner-next-day').onclick = () => {
                this.plannerManager.currentDate.setDate(this.plannerManager.currentDate.getDate() + 1);
                this.renderPlannerView();
            };

            document.getElementById('planner-today').onclick = () => {
                this.plannerManager.currentDate = new Date();
                this.renderPlannerView();
            };
            
            this._plannerNavSetup = true;
        }
    }

    renderTimeColumn() {
        const timeColumn = document.getElementById('time-column');
        let html = '';
        
        for (let hour = this.plannerManager.startHour; hour <= this.plannerManager.endHour; hour++) {
            const time12h = hour % 12 || 12;
            const ampm = hour < 12 ? 'AM' : 'PM';
            html += `<div class="time-slot">${time12h} ${ampm}</div>`;
        }
        
        timeColumn.innerHTML = html;
    }

    renderPlannerGrid() {
        const grid = document.getElementById('planner-grid');
        let html = '';
        
        const totalSlots = (this.plannerManager.endHour - this.plannerManager.startHour + 1) * 2;
        
        for (let i = 0; i < totalSlots; i++) {
            const hour = this.plannerManager.startHour + Math.floor(i / 2);
            const minute = (i % 2) * 30;
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const isHalfHour = i % 2 === 1;
            
            html += `<div class="grid-slot ${isHalfHour ? 'half-hour' : ''}" data-time="${timeStr}"></div>`;
        }
        
        grid.innerHTML = html;

        // Use event delegation for click handlers
        if (!this._plannerGridClickDelegated) {
            grid.addEventListener('click', (evt) => {
                const slot = evt.target.closest('.grid-slot');
                if (!slot || !grid.contains(slot)) {
                    return;
                }
                const startTime = slot.dataset.time;
                this.showPlannerEventModal(null, startTime);
            });
            this._plannerGridClickDelegated = true;
        }
    }

    renderPlannerEvents() {
        const eventsContainer = document.getElementById('planner-events');
        const events = this.plannerManager.getEventsForDate(this.plannerManager.currentDate);
        
        // Clear existing events
        eventsContainer.innerHTML = '';
        
        if (events.length === 0) {
            return;
        }
        
        // Safely render events without injecting unescaped HTML
        events.forEach(event => {
            const position = this.plannerManager.getEventPosition(event);
            const isCurrent = this.plannerManager.isEventCurrent(event);
            const isPast = this.plannerManager.isEventPast(event);
            
            let statusClass = '';
            if (isCurrent) statusClass = 'current';
            else if (isPast) statusClass = 'past';
            
            const eventEl = document.createElement('div');
            eventEl.className = `planner-event category-${event.category} ${statusClass}`;
            eventEl.dataset.eventId = event.id;
            eventEl.style.top = `${position.top}%`;
            eventEl.style.height = `${position.height}%`;
            
            const titleEl = document.createElement('div');
            titleEl.className = 'event-title';
            titleEl.textContent = event.title;
            eventEl.appendChild(titleEl);
            
            const timeEl = document.createElement('div');
            timeEl.className = 'event-time';
            timeEl.textContent = this.formatTimeRange(event.startTime, event.endTime);
            eventEl.appendChild(timeEl);
            
            if (event.notes) {
                const notesEl = document.createElement('div');
                notesEl.className = 'event-notes';
                notesEl.textContent = event.notes;
                eventEl.appendChild(notesEl);
            }
            
            eventsContainer.appendChild(eventEl);
        });

        // Use event delegation: attach a single click handler to the container
        if (!this._plannerEventsClickDelegated) {
            eventsContainer.addEventListener('click', (evt) => {
                const eventEl = evt.target.closest('.planner-event');
                if (!eventEl || !eventsContainer.contains(eventEl)) {
                    return;
                }
                const eventId = eventEl.dataset.eventId;
                this.showPlannerEventModal(eventId);
            });
            this._plannerEventsClickDelegated = true;
        }
    }

    formatTimeRange(startTime, endTime) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        return `${this.plannerManager.formatTime12h(startHours, startMinutes)} - ${this.plannerManager.formatTime12h(endHours, endMinutes)}`;
    }

    setupCurrentTimeIndicator() {
        // Clear existing interval
        if (this.plannerManager.timeUpdateInterval) {
            clearInterval(this.plannerManager.timeUpdateInterval);
        }

        const updateIndicator = () => {
            const indicator = document.getElementById('current-time-indicator');
            const label = document.getElementById('current-time-label');
            
            // Only show for today
            const today = this.plannerManager.formatDate(new Date());
            const viewingDate = this.plannerManager.formatDate(this.plannerManager.currentDate);
            
            if (today !== viewingDate) {
                indicator.classList.remove('visible');
                return;
            }
            
            const timeInfo = this.plannerManager.getCurrentTimeInfo();
            
            if (timeInfo) {
                indicator.style.top = `${timeInfo.percentage}%`;
                label.textContent = timeInfo.timeString;
                indicator.classList.add('visible');
            } else {
                indicator.classList.remove('visible');
            }
        };

        // Update immediately
        updateIndicator();

        // Update every minute
        this.plannerManager.timeUpdateInterval = setInterval(updateIndicator, 60000);
    }

    showPlannerEventModal(eventId = null, defaultStartTime = null) {
        const modal = document.getElementById('planner-event-modal');
        const form = document.getElementById('planner-event-form');
        const title = document.getElementById('planner-event-modal-title');
        const deleteBtn = document.getElementById('delete-planner-event');
        
        if (eventId) {
            // Edit mode
            const event = this.dataManager.data.plannerEvents.find(e => e.id === eventId);
            if (event) {
                title.textContent = 'Edit Event';
                document.getElementById('event-title').value = event.title;
                document.getElementById('event-start-time').value = event.startTime;
                document.getElementById('event-end-time').value = event.endTime;
                document.getElementById('event-category').value = event.category;
                document.getElementById('event-notes').value = event.notes || '';
                form.dataset.editingId = eventId;
                deleteBtn.style.display = 'block';
                
                // Calculate and set duration
                const startMinutes = this.plannerManager.timeToMinutes(event.startTime);
                let endMinutes = this.plannerManager.timeToMinutes(event.endTime);
                
                // Handle crossing midnight
                if (endMinutes <= startMinutes) {
                    endMinutes += 24 * 60;
                }
                
                const calculatedDuration = endMinutes - startMinutes;
                document.getElementById('planner-event-duration').value = calculatedDuration;
                
                // Update preset button selection
                document.querySelectorAll('#planner-event-form .preset-btn').forEach(btn => {
                    btn.classList.toggle('active', parseInt(btn.dataset.duration) === calculatedDuration);
                });
                
                // Update display
                this.updatePlannerEventTimes('duration');
            }
        } else {
            // Add mode
            title.textContent = 'Add Event';
            form.reset();
            delete form.dataset.editingId;
            deleteBtn.style.display = 'none';
            
            // Set default times if provided
            if (defaultStartTime) {
                document.getElementById('event-start-time').value = defaultStartTime;
                
                // Calculate end time (1 hour later, but not beyond 23:00, and strictly after start)
                const [hours, minutes] = defaultStartTime.split(':').map(Number);
                const startTotalMinutes = hours * 60 + minutes;
                const maxEndMinutes = 23 * 60; // 23:00 is the latest allowed end time
                
                if (startTotalMinutes < maxEndMinutes) {
                    let endTotalMinutes = startTotalMinutes + 60;
                    if (endTotalMinutes > maxEndMinutes) {
                        endTotalMinutes = maxEndMinutes;
                    }
                    
                    if (endTotalMinutes > startTotalMinutes) {
                        const endHours = Math.floor(endTotalMinutes / 60);
                        const endMinutes = endTotalMinutes % 60;
                        document.getElementById('event-end-time').value =
                            `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
                        
                        // Set duration to 60 minutes and activate the preset
                        document.getElementById('planner-event-duration').value = 60;
                        document.querySelectorAll('#planner-event-form .preset-btn').forEach(btn => {
                            btn.classList.toggle('active', parseInt(btn.dataset.duration) === 60);
                        });
                        this.updatePlannerEventTimes('duration');
                    } else {
                        // If we can't compute a valid end time, leave it blank for the user to set.
                        document.getElementById('event-end-time').value = '';
                    }
                } else {
                    // Start time is at or after the maximum end time; don't set a default end time.
                    document.getElementById('event-end-time').value = '';
                }
            }
        }
        
        modal.classList.add('active');
        document.getElementById('event-title').focus();
    }

    updatePlannerEventTimes(changedField) {
        const startTimeInput = document.getElementById('event-start-time');
        const endTimeInput = document.getElementById('event-end-time');
        const durationInput = document.getElementById('planner-event-duration');
        const display = document.getElementById('planner-duration-display');
        
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        const duration = parseInt(durationInput.value) || 0;
        
        // Helper to format duration in user-friendly way
        const formatDuration = (minutes) => {
            if (minutes < 60) {
                return `${minutes} min`;
            }
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (mins === 0) {
                return `${hours} hr`;
            }
            return `${hours} hr ${mins} min`;
        };
        
        // Prevent infinite loops by tracking which field we're updating
        if (this._isUpdating) return;
        this._isUpdating = true;
        
        try {
            if (changedField === 'start' && startTime && endTime) {
                // Start Time + End Time → Calculate Duration
                const startMinutes = this.plannerManager.timeToMinutes(startTime);
                let endMinutes = this.plannerManager.timeToMinutes(endTime);
                
                // Handle crossing midnight
                if (endMinutes <= startMinutes) {
                    endMinutes += 24 * 60;
                }
                
                const calculatedDuration = endMinutes - startMinutes;
                durationInput.value = calculatedDuration;
                display.textContent = formatDuration(calculatedDuration);
                
                // Update preset button selection
                document.querySelectorAll('#planner-event-form .preset-btn').forEach(btn => {
                    btn.classList.toggle('active', parseInt(btn.dataset.duration) === calculatedDuration);
                });
                
            } else if (changedField === 'end' && startTime && endTime) {
                // Start Time + End Time → Calculate Duration
                const startMinutes = this.plannerManager.timeToMinutes(startTime);
                let endMinutes = this.plannerManager.timeToMinutes(endTime);
                
                // Handle crossing midnight
                if (endMinutes <= startMinutes) {
                    endMinutes += 24 * 60;
                }
                
                const calculatedDuration = endMinutes - startMinutes;
                durationInput.value = calculatedDuration;
                display.textContent = formatDuration(calculatedDuration);
                
                // Update preset button selection
                document.querySelectorAll('#planner-event-form .preset-btn').forEach(btn => {
                    btn.classList.toggle('active', parseInt(btn.dataset.duration) === calculatedDuration);
                });
                
            } else if (changedField === 'duration' && duration > 0) {
                display.textContent = formatDuration(duration);
                
                if (startTime && !endTime) {
                    // Start Time + Duration → Calculate End Time
                    const startMinutes = this.plannerManager.timeToMinutes(startTime);
                    const endMinutes = (startMinutes + duration) % (24 * 60);
                    endTimeInput.value = this.plannerManager.minutesToTime(endMinutes);
                    
                } else if (endTime && !startTime) {
                    // End Time + Duration → Calculate Start Time
                    let endMinutes = this.plannerManager.timeToMinutes(endTime);
                    let startMinutes = endMinutes - duration;
                    
                    // Handle crossing midnight backwards
                    if (startMinutes < 0) {
                        startMinutes += 24 * 60;
                    }
                    
                    startTimeInput.value = this.plannerManager.minutesToTime(startMinutes);
                    
                } else if (startTime && endTime) {
                    // If both times exist, recalculate end time based on start + duration
                    const startMinutes = this.plannerManager.timeToMinutes(startTime);
                    const endMinutes = (startMinutes + duration) % (24 * 60);
                    endTimeInput.value = this.plannerManager.minutesToTime(endMinutes);
                }
            } else if (!duration || duration <= 0) {
                display.textContent = '';
            }
        } finally {
            this._isUpdating = false;
        }
    }

    updateEventEndTime() {
        const startTime = document.getElementById('event-start-time').value;
        const duration = parseInt(document.getElementById('event-duration').value);
        const display = document.getElementById('event-end-time-display');
        
        if (startTime && duration && duration > 0) {
            const [hours, minutes] = startTime.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes + duration;
            const endHours = Math.floor(totalMinutes / 60) % 24;
            const endMinutes = totalMinutes % 60;
            const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
            display.textContent = `Ends at ${endTime}`;
        } else if (duration === -1) {
            display.textContent = 'All day event';
        } else {
            display.textContent = '';
        }
    }

    async saveEvent() {
        const form = document.getElementById('event-form');
        const name = document.getElementById('event-name').value.trim();
        const description = document.getElementById('event-description').value.trim();
        const date = document.getElementById('event-date').value;
        const startTime = document.getElementById('event-start-time').value;
        const durationInput = document.getElementById('event-duration').value;
        const duration = durationInput === '' ? -1 : parseInt(durationInput);
        const isRecurring = document.getElementById('event-is-recurring').checked;
        
        if (!name || !date || !startTime) {
            alert('Please fill in all required fields');
            return;
        }
        
        let recurrence = null;
        if (isRecurring) {
            const type = document.getElementById('recurrence-type').value;
            const interval = parseInt(document.getElementById('recurrence-interval').value);
            
            recurrence = { type, interval };
            
            if (type === 'weekly') {
                const daysOfWeek = Array.from(
                    document.querySelectorAll('#recurrence-days-group input[type="checkbox"]:checked')
                ).map(cb => parseInt(cb.value));
                recurrence.daysOfWeek = daysOfWeek;
            }
            
            if (type === 'monthly') {
                const monthlyType = document.getElementById('recurrence-monthly-type').value;
                if (monthlyType === 'date') {
                    recurrence.dayOfMonth = parseInt(document.getElementById('recurrence-day-of-month').value);
                } else {
                    recurrence.monthlyPattern = {
                        week: parseInt(document.getElementById('recurrence-pattern-week').value),
                        dayOfWeek: parseInt(document.getElementById('recurrence-pattern-day').value)
                    };
                }
            }
            
            const endType = document.getElementById('recurrence-end-type').value;
            if (endType === 'on') {
                recurrence.endDate = document.getElementById('recurrence-end-date').value;
            } else if (endType === 'after') {
                recurrence.occurrences = parseInt(document.getElementById('recurrence-occurrences').value);
            }
        }
        
        const editingId = form.dataset.editingId;
        if (editingId) {
            await this.dataManager.updateEvent(editingId, name, description, date, startTime, duration, recurrence);
        } else {
            await this.dataManager.addEvent(name, description, date, startTime, duration, recurrence);
        }
        
        document.getElementById('event-modal').classList.remove('active');
        form.reset();
        document.getElementById('recurrence-fields').style.display = 'none';
        this.renderTodayView();
        this.renderCalendarView();
    }

    async saveEventAsTemplate() {
        const name = document.getElementById('event-name').value.trim();
        const description = document.getElementById('event-description').value.trim();
        const durationInput = document.getElementById('event-duration').value;
        const duration = durationInput === '' ? -1 : parseInt(durationInput);
        
        if (!name) {
            alert('Please enter an event name first');
            return;
        }
        
        await this.dataManager.addTemplate(name, description, duration);
        alert('Template saved!');
        this.renderSettingsView();
    }

    showTemplateModal(templateId = null) {
        const modal = document.getElementById('template-modal');
        const form = document.getElementById('template-form');
        const title = document.getElementById('template-modal-title');
        
        if (templateId) {
            // Edit mode
            const template = this.dataManager.data.templates.find(t => t.id === templateId);
            if (template) {
                title.textContent = 'Edit Template';
                document.getElementById('template-name').value = template.name;
                document.getElementById('template-description').value = template.description || '';
                document.getElementById('template-duration').value = template.duration === -1 ? '' : template.duration;
                form.dataset.editingId = templateId;
            }
        } else {
            // Add mode
            title.textContent = 'Add Template';
            form.reset();
            delete form.dataset.editingId;
        }
        
        modal.classList.add('active');
        document.getElementById('template-name').focus();
    }

    async saveTemplate() {
        const form = document.getElementById('template-form');
        const name = document.getElementById('template-name').value.trim();
        const description = document.getElementById('template-description').value.trim();
        const durationInput = document.getElementById('template-duration').value;
        const duration = durationInput === '' ? -1 : parseInt(durationInput);
        
        if (!name) {
            alert('Please enter a template name');
            return;
        }
        
        const editingId = form.dataset.editingId;
        if (editingId) {
            await this.dataManager.updateTemplate(editingId, name, description, duration);
        } else {
            await this.dataManager.addTemplate(name, description, duration);
        }
        
        document.getElementById('template-modal').classList.remove('active');
        form.reset();
        this.renderSettingsView();
    }

    showTemplatePicker() {
        const modal = document.getElementById('template-picker-modal');
        const list = document.getElementById('template-picker-list');
        
        if (this.dataManager.data.templates.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No templates available. Create one in Settings.</p></div>';
        } else {
            list.innerHTML = this.dataManager.data.templates.map(template => {
                const durationDisplay = template.duration === -1 ? 'All day' : 
                    template.duration >= 60 ? `${Math.floor(template.duration / 60)} hr ${template.duration % 60 > 0 ? template.duration % 60 + ' min' : ''}`.trim() :
                    `${template.duration} min`;
                
                return `
                    <div class="template-item" data-template-id="${template.id}">
                        <div class="template-name">${template.name}</div>
                        ${template.description ? `<div class="template-description">${template.description}</div>` : ''}
                        <div class="template-duration">Duration: ${durationDisplay}</div>
                    </div>
                `;
            }).join('');
            
            // Add click handlers
            list.querySelectorAll('.template-item').forEach(item => {
                item.addEventListener('click', () => {
                    const templateId = item.dataset.templateId;
                    this.applyTemplate(templateId);
                });
            });
        }
        
        modal.classList.add('active');
    }

    applyTemplate(templateId) {
        const template = this.dataManager.data.templates.find(t => t.id === templateId);
        if (template) {
            document.getElementById('event-name').value = template.name;
            document.getElementById('event-description').value = template.description || '';
            document.getElementById('event-duration').value = template.duration === -1 ? '' : template.duration;
            
            // Highlight the active preset button
            const duration = template.duration;
            document.querySelectorAll('#event-form .preset-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.duration) === duration);
            });
            
            this.updateEventEndTime();
        }
        
        document.getElementById('template-picker-modal').classList.remove('active');
    }

    // Stats View
    renderStatsView() {
        const range = this.statsRange;
        const days = this.getDateRange(range);
        
        let greenCount = 0, yellowCount = 0, redCount = 0;
        
        days.forEach(date => {
            const status = this.dataManager.getDayStatus(date);
            if (status === 'green') greenCount++;
            else if (status === 'yellow') yellowCount++;
            else if (status === 'red') redCount++;
        });

        document.getElementById('green-days').textContent = greenCount;
        document.getElementById('yellow-days').textContent = yellowCount;
        document.getElementById('red-days').textContent = redCount;

        // Range selector
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.statsRange = btn.dataset.range === 'all' ? ALL_DAYS_RANGE : parseInt(btn.dataset.range);
                this.renderStatsView();
            });
        });

        // Render chart
        this.renderCompletionChart(days);

        // Habit stats - only show non-archived habits
        const habitStats = document.getElementById('habit-stats');
        const activeHabits = this.dataManager.data.habits.filter(h => !h.archived);
        if (activeHabits.length === 0) {
            habitStats.innerHTML = '<div class="empty-state"><p>No habits to show stats for.</p></div>';
        } else {
            habitStats.innerHTML = activeHabits.map(habit => {
                let completed = 0;
                let total = 0;
                
                days.forEach(date => {
                    const dayData = this.dataManager.getDayData(date);
                    if (dayData.habits[habit.id] !== undefined) {
                        total++;
                        if (dayData.habits[habit.id]) completed++;
                    }
                });

                const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

                return `
                    <div class="habit-stat-item">
                        <div class="habit-stat-header">
                            <span class="habit-stat-name">${habit.name}</span>
                            <span class="habit-stat-rate">${rate}%</span>
                        </div>
                        <div class="habit-stat-bar">
                            <div class="habit-stat-fill" style="width: ${rate}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    renderCompletionChart(days) {
        const canvas = document.getElementById('completion-chart');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = CANVAS_HEIGHT;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 20;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (days.length === 0) return;

        // Calculate data - only count non-archived habits
        const data = days.map(date => {
            const dayData = this.dataManager.getDayData(date);
            const activeHabits = this.dataManager.data.habits.filter(h => !h.archived);
            const total = activeHabits.length;
            if (total === 0) return 0;
            const completed = activeHabits.filter(h => dayData.habits[h.id]).length;
            return (completed / total) * 100;
        });

        // Draw chart
        const barWidth = (width - padding * 2) / data.length;
        const maxHeight = height - padding * 2;

        ctx.fillStyle = '#6366f1';
        data.forEach((value, index) => {
            const barHeight = (value / 100) * maxHeight;
            const x = padding + index * barWidth;
            const y = height - padding - barHeight;
            
            ctx.fillRect(x, y, Math.max(barWidth - 2, 1), barHeight);
        });

        // Draw baseline
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
    }

    getDateRange(days) {
        const dates = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date);
        }
        
        return dates;
    }

    // Settings View
    renderSettingsView() {
        // Habits - separate active and archived
        const habitsList = document.getElementById('habits-settings-list');
        const activeHabits = this.dataManager.data.habits.filter(h => !h.archived);
        const archivedHabits = this.dataManager.data.habits.filter(h => h.archived);
        
        let habitsHtml = '';
        
        if (activeHabits.length === 0 && archivedHabits.length === 0) {
            habitsHtml = '<div class="empty-state"><p>No habits configured yet.</p></div>';
        } else {
            // Active habits
            if (activeHabits.length > 0) {
                habitsHtml += '<div class="subsection-label">Active Habits</div>';
                habitsHtml += activeHabits.map(habit => {
                    let progressInfo = '';
                    if (habit.isBuildUpHabit && habit.buildUpConfig) {
                        const config = habit.buildUpConfig;
                        progressInfo = `<div class="setting-detail">
                            <span class="build-up-badge">📈 Build-Up Habit</span> 
                            ${config.currentValue}/${config.goalValue}${config.unit ? ' ' + config.unit : ''} 
                            (Streak: ${config.currentStreak}/${config.daysForIncrement})
                        </div>`;
                    }
                    
                    return `
                        <div class="setting-item ${habit.isBuildUpHabit ? 'build-up-habit' : ''}">
                            <div class="setting-info">
                                <div class="setting-name">${habit.name}</div>
                                ${habit.description ? `<div class="setting-detail">${habit.description}</div>` : ''}
                                ${progressInfo}
                            </div>
                            <div class="setting-actions">
                                <button class="btn-icon edit" data-habit-id="${habit.id}">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                                <button class="btn-icon archive" data-habit-id="${habit.id}">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="21 8 21 21 3 21 3 8"/>
                                        <rect x="1" y="3" width="22" height="5"/>
                                        <line x1="10" y1="12" x2="14" y2="12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            // Archived habits
            if (archivedHabits.length > 0) {
                habitsHtml += '<div class="subsection-label" style="margin-top: 1rem;">Archived Habits</div>';
                habitsHtml += archivedHabits.map(habit => `
                    <div class="setting-item archived">
                        <div class="setting-info">
                            <div class="setting-name">${habit.name}</div>
                            ${habit.description ? `<div class="setting-detail">${habit.description}</div>` : ''}
                        </div>
                        <div class="setting-actions">
                            <button class="btn-icon unarchive" data-habit-id="${habit.id}" title="Unarchive">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 8 3 21 21 21 21 8"/>
                                    <rect x="1" y="3" width="22" height="5"/>
                                    <line x1="10" y1="12" x2="14" y2="12"/>
                                </svg>
                            </button>
                            <button class="btn-icon delete" data-habit-id="${habit.id}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        habitsList.innerHTML = habitsHtml;

        // Add event handlers for habit actions
        habitsList.querySelectorAll('.btn-icon.edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const habitId = btn.dataset.habitId;
                this.showHabitModal(habitId);
            });
        });

        habitsList.querySelectorAll('.btn-icon.archive').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Archive this habit? It will be hidden but data will be preserved.')) {
                    await this.dataManager.archiveHabit(btn.dataset.habitId);
                    this.renderSettingsView();
                    this.renderTodayView();
                }
            });
        });

        habitsList.querySelectorAll('.btn-icon.unarchive').forEach(btn => {
            btn.addEventListener('click', async () => {
                await this.dataManager.unarchiveHabit(btn.dataset.habitId);
                this.renderSettingsView();
                this.renderTodayView();
            });
        });

        habitsList.querySelectorAll('.btn-icon.delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Permanently delete this habit? Historical data will be preserved but the habit cannot be recovered.')) {
                    await this.dataManager.deleteHabit(btn.dataset.habitId);
                    this.renderSettingsView();
                    this.renderTodayView();
                }
            });
        });

        // Tracking fields
        const trackingList = document.getElementById('tracking-settings-list');
        if (this.dataManager.data.trackingFields.length === 0) {
            trackingList.innerHTML = '<div class="empty-state"><p>No tracking fields configured yet.</p></div>';
        } else {
            trackingList.innerHTML = this.dataManager.data.trackingFields.map(field => `
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">${field.name}</div>
                        <div class="setting-detail">Type: ${field.type}${field.unit ? `, Unit: ${field.unit}` : ''}</div>
                        ${field.description ? `<div class="setting-detail">${field.description}</div>` : ''}
                    </div>
                    <div class="setting-actions">
                        <button class="btn-icon edit" data-field-id="${field.id}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon delete" data-field-id="${field.id}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');

            trackingList.querySelectorAll('.btn-icon.edit').forEach(btn => {
                btn.addEventListener('click', () => {
                    const fieldId = btn.dataset.fieldId;
                    this.showTrackingModal(fieldId);
                });
            });

            trackingList.querySelectorAll('.btn-icon.delete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('Delete this tracking field? Historical data will be preserved.')) {
                        await this.dataManager.deleteTrackingField(btn.dataset.fieldId);
                        this.renderSettingsView();
                        this.renderTodayView();
                    }
                });
            });
        }

        // Buttons
        document.getElementById('add-habit-btn').onclick = () => this.showHabitModal();
        document.getElementById('add-tracking-btn').onclick = () => this.showTrackingModal();
        document.getElementById('import-data-btn').onclick = () => this.showImportModal();
        document.getElementById('export-data-btn').onclick = () => this.exportData();
        document.getElementById('clear-data-btn').onclick = () => this.clearData();
    }

    // Modals
    setupModals() {
        // Day modal
        document.getElementById('close-modal').onclick = () => {
            document.getElementById('day-modal').classList.remove('active');
        };

        document.getElementById('day-modal').onclick = (e) => {
            if (e.target.id === 'day-modal') {
                document.getElementById('day-modal').classList.remove('active');
            }
        };

        // Habit modal
        document.getElementById('close-habit-modal').onclick = () => {
            document.getElementById('habit-modal').classList.remove('active');
        };

        document.getElementById('cancel-habit').onclick = () => {
            document.getElementById('habit-modal').classList.remove('active');
        };
        
        // Build-up habit checkbox toggle
        document.getElementById('is-build-up-habit').onchange = (e) => {
            const buildUpFields = document.getElementById('build-up-fields');
            buildUpFields.style.display = e.target.checked ? 'block' : 'none';
        };

        document.getElementById('habit-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('habit-name').value.trim();
            const description = document.getElementById('habit-description').value.trim();
            const isBuildUpHabit = document.getElementById('is-build-up-habit').checked;
            
            let buildUpConfig = null;
            if (isBuildUpHabit) {
                const startValue = parseFloat(document.getElementById('build-up-start-value').value);
                const goalValue = parseFloat(document.getElementById('build-up-goal-value').value);
                const incrementValue = parseFloat(document.getElementById('build-up-increment-value').value);
                const daysForIncrement = parseInt(document.getElementById('build-up-days-for-increment').value);
                const unit = document.getElementById('build-up-unit').value.trim();
                
                // Validation
                if (isNaN(startValue) || isNaN(goalValue) || isNaN(incrementValue) || isNaN(daysForIncrement)) {
                    alert('Please fill in all required build-up habit fields with valid numbers');
                    return;
                }
                
                if (startValue <= 0 || goalValue <= 0 || incrementValue <= 0 || daysForIncrement <= 0) {
                    alert('All build-up values must be positive numbers greater than zero');
                    return;
                }
                
                if (goalValue <= startValue) {
                    alert('Goal Value must be greater than Starting Value');
                    return;
                }
                
                buildUpConfig = {
                    startValue,
                    goalValue,
                    incrementValue,
                    daysForIncrement,
                    unit
                };
            }
            
            if (name) {
                const editingId = document.getElementById('habit-form').dataset.editingId;
                if (editingId) {
                    await this.dataManager.updateHabit(editingId, name, description, isBuildUpHabit, buildUpConfig);
                    delete document.getElementById('habit-form').dataset.editingId;
                } else {
                    await this.dataManager.addHabit(name, description, isBuildUpHabit, buildUpConfig);
                }
                document.getElementById('habit-modal').classList.remove('active');
                document.getElementById('habit-form').reset();
                document.getElementById('build-up-fields').style.display = 'none';
                this.renderSettingsView();
                this.renderTodayView();
            }
        };

        document.getElementById('habit-modal').onclick = (e) => {
            if (e.target.id === 'habit-modal') {
                document.getElementById('habit-modal').classList.remove('active');
            }
        };

        // Tracking modal
        document.getElementById('close-tracking-modal').onclick = () => {
            document.getElementById('tracking-modal').classList.remove('active');
        };

        document.getElementById('cancel-tracking').onclick = () => {
            document.getElementById('tracking-modal').classList.remove('active');
        };

        document.getElementById('tracking-type').onchange = (e) => {
            const unitGroup = document.getElementById('unit-group');
            unitGroup.style.display = (e.target.value === 'number') ? 'block' : 'none';
        };

        document.getElementById('tracking-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('tracking-name').value.trim();
            const type = document.getElementById('tracking-type').value;
            const unit = document.getElementById('tracking-unit').value.trim();
            const description = document.getElementById('tracking-description').value.trim();
            
            if (name && type) {
                const editingId = document.getElementById('tracking-form').dataset.editingId;
                if (editingId) {
                    await this.dataManager.updateTrackingField(editingId, name, type, unit, description);
                    delete document.getElementById('tracking-form').dataset.editingId;
                } else {
                    await this.dataManager.addTrackingField(name, type, unit, description);
                }
                document.getElementById('tracking-modal').classList.remove('active');
                document.getElementById('tracking-form').reset();
                document.getElementById('unit-group').style.display = 'none';
                this.renderSettingsView();
                this.renderTodayView();
            }
        };

        document.getElementById('tracking-modal').onclick = (e) => {
            if (e.target.id === 'tracking-modal') {
                document.getElementById('tracking-modal').classList.remove('active');
            }
        };

        // Import modal
        document.getElementById('close-import-modal').onclick = () => {
            document.getElementById('import-modal').classList.remove('active');
        };

        document.getElementById('cancel-import').onclick = () => {
            document.getElementById('import-modal').classList.remove('active');
        };

        document.getElementById('import-form').onsubmit = async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('import-file');
            const file = fileInput.files[0];
            
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const importedData = JSON.parse(event.target.result);
                        const result = await this.dataManager.importData(importedData);
                        
                        if (result.success) {
                            alert('Data imported successfully!');
                            document.getElementById('import-modal').classList.remove('active');
                            document.getElementById('import-form').reset();
                            this.renderTodayView();
                            this.renderCalendarView();
                            this.renderStatsView();
                            this.renderSettingsView();
                        } else {
                            alert('Error importing data: ' + result.error);
                        }
                    } catch (error) {
                        alert('Invalid JSON file. Please make sure you selected a valid backup file.');
                    }
                };
                reader.readAsText(file);
            }
        };

        document.getElementById('import-modal').onclick = (e) => {
            if (e.target.id === 'import-modal') {
                document.getElementById('import-modal').classList.remove('active');
            }
        };

        // Planner event modal
        document.getElementById('close-planner-event-modal').onclick = () => {
            document.getElementById('planner-event-modal').classList.remove('active');
        };

        document.getElementById('cancel-planner-event').onclick = () => {
            document.getElementById('planner-event-modal').classList.remove('active');
        };

        document.getElementById('delete-planner-event').onclick = async () => {
            const form = document.getElementById('planner-event-form');
            const eventId = form.dataset.editingId;
            
            if (eventId && confirm('Delete this event?')) {
                await this.plannerManager.deleteEvent(eventId);
                document.getElementById('planner-event-modal').classList.remove('active');
                this.renderPlannerView();
            }
        };

        document.getElementById('planner-event-form').onsubmit = async (e) => {
            e.preventDefault();
            const title = document.getElementById('event-title').value.trim();
            const startTime = document.getElementById('event-start-time').value;
            const endTime = document.getElementById('event-end-time').value;
            const category = document.getElementById('event-category').value;
            const notes = document.getElementById('event-notes').value.trim();
            
            // Validate times using numeric comparison
            const startMinutes = this.plannerManager.timeToMinutes(startTime);
            const endMinutes = this.plannerManager.timeToMinutes(endTime);
            
            if (startMinutes >= endMinutes) {
                alert('End time must be after start time');
                return;
            }
            
            if (title && startTime && endTime) {
                const form = document.getElementById('planner-event-form');
                const editingId = form.dataset.editingId;
                
                if (editingId) {
                    await this.plannerManager.updateEvent(editingId, startTime, endTime, title, category, notes);
                    delete form.dataset.editingId;
                } else {
                    await this.plannerManager.addEvent(
                        this.plannerManager.currentDate,
                        startTime,
                        endTime,
                        title,
                        category,
                        notes
                    );
                }
                
                document.getElementById('planner-event-modal').classList.remove('active');
                form.reset();
                this.renderPlannerView();
            }
        };

        document.getElementById('planner-event-modal').onclick = (e) => {
            if (e.target.id === 'planner-event-modal') {
                document.getElementById('planner-event-modal').classList.remove('active');
            }
        };

        // Duration preset handlers for planner event modal
        document.querySelectorAll('#planner-event-form .preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const duration = parseInt(btn.dataset.duration);
                document.getElementById('planner-event-duration').value = duration;
                document.querySelectorAll('#planner-event-form .preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updatePlannerEventTimes('duration');
            });
        });

        // Auto-calculation event listeners for planner event modal
        document.getElementById('event-start-time').addEventListener('input', () => {
            this.updatePlannerEventTimes('start');
        });
        
        document.getElementById('event-end-time').addEventListener('input', () => {
            this.updatePlannerEventTimes('end');
        });
        
        document.getElementById('planner-event-duration').addEventListener('input', () => {
            // Clear preset button selection on custom input
            document.querySelectorAll('#planner-event-form .preset-btn').forEach(b => b.classList.remove('active'));
            this.updatePlannerEventTimes('duration');
        });

        // Event modal
        document.getElementById('close-event-modal').onclick = () => {
            document.getElementById('event-modal').classList.remove('active');
        };

        document.getElementById('cancel-event').onclick = () => {
            document.getElementById('event-modal').classList.remove('active');
        };

        // Use template button
        document.getElementById('use-template-btn').onclick = () => {
            this.showTemplatePicker();
        };

        document.getElementById('event-is-recurring').onchange = (e) => {
            const recurrenceFields = document.getElementById('recurrence-fields');
            recurrenceFields.style.display = e.target.checked ? 'block' : 'none';
        };

        // Recurrence type change handler
        document.getElementById('recurrence-type').onchange = (e) => {
            const type = e.target.value;
            const intervalUnit = document.getElementById('recurrence-interval-unit');
            const daysGroup = document.getElementById('recurrence-days-group');
            const monthlyGroup = document.getElementById('recurrence-monthly-group');
            
            // Update interval unit text
            switch(type) {
                case 'daily':
                    intervalUnit.textContent = 'day(s)';
                    break;
                case 'weekly':
                    intervalUnit.textContent = 'week(s)';
                    break;
                case 'monthly':
                    intervalUnit.textContent = 'month(s)';
                    break;
                case 'yearly':
                    intervalUnit.textContent = 'year(s)';
                    break;
                case 'custom':
                    intervalUnit.textContent = 'day(s)';
                    break;
            }
            
            // Show/hide relevant fields
            daysGroup.style.display = type === 'weekly' ? 'block' : 'none';
            monthlyGroup.style.display = type === 'monthly' ? 'block' : 'none';
        };

        // Monthly recurrence type handler
        document.getElementById('recurrence-monthly-type').onchange = (e) => {
            const monthlyType = e.target.value;
            document.getElementById('recurrence-day-of-month-group').style.display = 
                monthlyType === 'date' ? 'block' : 'none';
            document.getElementById('recurrence-pattern-group').style.display = 
                monthlyType === 'pattern' ? 'block' : 'none';
        };

        // Recurrence end type handler
        document.getElementById('recurrence-end-type').onchange = (e) => {
            const endType = e.target.value;
            document.getElementById('recurrence-end-date-group').style.display = 
                endType === 'on' ? 'block' : 'none';
            document.getElementById('recurrence-occurrences-group').style.display = 
                endType === 'after' ? 'block' : 'none';
        };

        // Duration preset handlers for event modal
        document.querySelectorAll('#event-form .preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const duration = parseInt(btn.dataset.duration);
                document.getElementById('event-duration').value = duration === -1 ? '' : duration;
                document.querySelectorAll('#event-form .preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateEventEndTime();
            });
        });

        // Update end time display when start time or duration changes
        document.getElementById('event-start-time').oninput = () => this.updateEventEndTime();
        document.getElementById('event-duration').oninput = () => this.updateEventEndTime();

        // Save as template button
        document.getElementById('save-as-template-btn').onclick = () => {
            this.saveEventAsTemplate();
        };

        document.getElementById('event-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.saveEvent();
        };

        document.getElementById('event-modal').onclick = (e) => {
            if (e.target.id === 'event-modal') {
                document.getElementById('event-modal').classList.remove('active');
            }
        };

        // Template modal
        document.getElementById('close-template-modal').onclick = () => {
            document.getElementById('template-modal').classList.remove('active');
        };

        document.getElementById('cancel-template').onclick = () => {
            document.getElementById('template-modal').classList.remove('active');
        };

        // Duration preset handlers for template modal
        document.querySelectorAll('#template-form .preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const duration = parseInt(btn.dataset.duration);
                document.getElementById('template-duration').value = duration === -1 ? '' : duration;
                document.querySelectorAll('#template-form .preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.getElementById('template-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.saveTemplate();
        };

        document.getElementById('template-modal').onclick = (e) => {
            if (e.target.id === 'template-modal') {
                document.getElementById('template-modal').classList.remove('active');
            }
        };

        // Template picker modal
        document.getElementById('close-template-picker').onclick = () => {
            document.getElementById('template-picker-modal').classList.remove('active');
        };

        document.getElementById('template-picker-modal').onclick = (e) => {
            if (e.target.id === 'template-picker-modal') {
                document.getElementById('template-picker-modal').classList.remove('active');
            }
        };
    }

    showHabitModal(habitId = null) {
        const modal = document.getElementById('habit-modal');
        const form = document.getElementById('habit-form');
        const title = document.getElementById('habit-modal-title');
        const nameInput = document.getElementById('habit-name');
        const descriptionInput = document.getElementById('habit-description');
        const isBuildUpCheckbox = document.getElementById('is-build-up-habit');
        const buildUpFields = document.getElementById('build-up-fields');
        
        if (habitId) {
            // Edit mode
            const habit = this.dataManager.data.habits.find(h => h.id === habitId);
            if (habit) {
                title.textContent = 'Edit Habit';
                nameInput.value = habit.name;
                descriptionInput.value = habit.description || '';
                form.dataset.editingId = habitId;
                
                // Populate build-up fields if applicable
                isBuildUpCheckbox.checked = habit.isBuildUpHabit || false;
                if (habit.isBuildUpHabit && habit.buildUpConfig) {
                    buildUpFields.style.display = 'block';
                    document.getElementById('build-up-start-value').value = habit.buildUpConfig.startValue;
                    document.getElementById('build-up-goal-value').value = habit.buildUpConfig.goalValue;
                    document.getElementById('build-up-increment-value').value = habit.buildUpConfig.incrementValue;
                    document.getElementById('build-up-days-for-increment').value = habit.buildUpConfig.daysForIncrement;
                    document.getElementById('build-up-unit').value = habit.buildUpConfig.unit || '';
                } else {
                    buildUpFields.style.display = 'none';
                }
            }
        } else {
            // Add mode
            title.textContent = 'Add Habit';
            form.reset();
            delete form.dataset.editingId;
            buildUpFields.style.display = 'none';
        }
        
        modal.classList.add('active');
        nameInput.focus();
    }

    showTrackingModal(fieldId = null) {
        const modal = document.getElementById('tracking-modal');
        const form = document.getElementById('tracking-form');
        const title = document.getElementById('tracking-modal-title');
        const nameInput = document.getElementById('tracking-name');
        const typeInput = document.getElementById('tracking-type');
        const unitInput = document.getElementById('tracking-unit');
        const descriptionInput = document.getElementById('tracking-description');
        const unitGroup = document.getElementById('unit-group');
        
        if (fieldId) {
            // Edit mode
            const field = this.dataManager.data.trackingFields.find(f => f.id === fieldId);
            if (field) {
                title.textContent = 'Edit Tracking Field';
                nameInput.value = field.name;
                typeInput.value = field.type;
                unitInput.value = field.unit || '';
                descriptionInput.value = field.description || '';
                unitGroup.style.display = (field.type === 'number') ? 'block' : 'none';
                form.dataset.editingId = fieldId;
            }
        } else {
            // Add mode
            title.textContent = 'Add Tracking Field';
            form.reset();
            unitGroup.style.display = 'none';
            delete form.dataset.editingId;
        }
        
        modal.classList.add('active');
        nameInput.focus();
    }

    showImportModal() {
        document.getElementById('import-modal').classList.add('active');
        document.getElementById('import-file').focus();
    }

    exportData() {
        const data = this.dataManager.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `track-deez-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async clearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            await this.dataManager.clearAllData();
            this.renderTodayView();
            this.renderCalendarView();
            this.renderStatsView();
            this.renderSettingsView();
        }
    }

    setupInstallPrompt() {
        // This is handled in app.js
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.habitApp = new HabitTrackerApp();
});
