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
            days: {} // key: YYYY-MM-DD, value: { habits: {}, tracking: {} }
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
            this.data = JSON.parse(data);
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

            console.log('Data loaded from IndexedDB');
        } catch (error) {
            console.error('Error loading data from IndexedDB:', error);
            // Fallback to empty data structure
            this.data = {
                habits: [],
                trackingFields: [],
                days: {}
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

            console.log('Data saved to IndexedDB');
        } catch (error) {
            console.error('Error saving data to IndexedDB:', error);
            // Fallback to localStorage
            localStorage.setItem('trackDeezData', JSON.stringify(this.data));
        }
    }

    // Habits
    async addHabit(name) {
        const habit = {
            id: Date.now().toString(),
            name,
            createdAt: new Date().toISOString()
        };
        this.data.habits.push(habit);
        await this.saveData();
        return habit;
    }

    async deleteHabit(id) {
        this.data.habits = this.data.habits.filter(h => h.id !== id);
        // Clean up habit data from days
        Object.keys(this.data.days).forEach(date => {
            if (this.data.days[date].habits) {
                delete this.data.days[date].habits[id];
            }
        });
        await this.saveData();
    }

    // Tracking Fields
    async addTrackingField(name, type, unit = '') {
        const field = {
            id: Date.now().toString(),
            name,
            type,
            unit,
            createdAt: new Date().toISOString()
        };
        this.data.trackingFields.push(field);
        await this.saveData();
        return field;
    }

    async updateTrackingField(id, name, type, unit = '') {
        const fieldIndex = this.data.trackingFields.findIndex(f => f.id === id);
        if (fieldIndex !== -1) {
            this.data.trackingFields[fieldIndex] = {
                ...this.data.trackingFields[fieldIndex],
                name,
                type,
                unit
            };
            await this.saveData();
            return this.data.trackingFields[fieldIndex];
        }
        return null;
    }

    async deleteTrackingField(id) {
        this.data.trackingFields = this.data.trackingFields.filter(f => f.id !== id);
        // Clean up tracking data from days
        Object.keys(this.data.days).forEach(date => {
            if (this.data.days[date].tracking) {
                delete this.data.days[date].tracking[id];
            }
        });
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        
        if (checkDate > today) {
            return 'gray'; // Future dates have no data
        }
        
        const dayData = this.getDayData(date);
        const totalHabits = this.data.habits.length;
        
        if (totalHabits === 0) return 'gray';
        
        const completedHabits = Object.values(dayData.habits).filter(v => v).length;
        
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

            // Merge habits (avoid duplicates by name)
            const existingHabitNames = new Set(this.data.habits.map(h => h.name));
            importedData.habits.forEach(habit => {
                if (!existingHabitNames.has(habit.name)) {
                    this.data.habits.push(habit);
                }
            });

            // Merge tracking fields (avoid duplicates by name)
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
            days: {}
        };
        await this.saveData();
    }
}

// App Controller
class HabitTrackerApp {
    constructor() {
        this.dataManager = new DataManager();
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

        // Habits list
        const habitsList = document.getElementById('habits-list');
        const habits = this.dataManager.data.habits;

        if (habits.length === 0) {
            habitsList.innerHTML = '<div class="empty-state"><p>No habits yet. Add some in Settings.</p></div>';
        } else {
            const dayData = this.dataManager.getDayData(this.currentDate);
            habitsList.innerHTML = habits.map(habit => {
                const completed = dayData.habits[habit.id] || false;
                return `
                    <div class="habit-item ${completed ? 'completed' : ''}" data-habit-id="${habit.id}">
                        <div class="habit-checkbox ${completed ? 'checked' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>
                        <span class="habit-name">${habit.name}</span>
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
                        <div class="tracking-label">${field.name}${field.unit ? ` (${field.unit})` : ''}</div>
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

            trackingList.querySelectorAll('.scale-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const fieldId = btn.dataset.fieldId;
                    const value = btn.dataset.value;
                    
                    // Update UI
                    const parent = btn.parentElement;
                    parent.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    
                    // Save data
                    await this.dataManager.setTracking(this.currentDate, fieldId, value);
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
            case 'scale':
                return `
                    <div class="scale-input">
                        ${[1,2,3,4,5].map(n => 
                            `<button class="scale-btn ${value == n ? 'selected' : ''}" data-field-id="${field.id}" data-value="${n}">${n}</button>`
                        ).join('')}
                    </div>
                `;
            case 'scale10':
                return `
                    <div class="scale-input">
                        ${[1,2,3,4,5,6,7,8,9,10].map(n => 
                            `<button class="scale-btn ${value == n ? 'selected' : ''}" data-field-id="${field.id}" data-value="${n}">${n}</button>`
                        ).join('')}
                    </div>
                `;
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

        // Habits
        html += '<h3>Habits</h3>';
        if (this.dataManager.data.habits.length === 0) {
            html += '<p>No habits configured.</p>';
        } else {
            html += '<div class="habits-list">';
            this.dataManager.data.habits.forEach(habit => {
                const completed = dayData.habits[habit.id] || false;
                html += `
                    <div class="habit-item ${completed ? 'completed' : ''}">
                        <div class="habit-checkbox ${completed ? 'checked' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>
                        <span class="habit-name">${habit.name}</span>
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
                        <div class="tracking-label">${field.name}</div>
                        <div style="font-weight: 600;">${value}${field.unit ? ' ' + field.unit : ''}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        modalBody.innerHTML = html;
        modal.classList.add('active');
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

        // Habit stats
        const habitStats = document.getElementById('habit-stats');
        if (this.dataManager.data.habits.length === 0) {
            habitStats.innerHTML = '<div class="empty-state"><p>No habits to show stats for.</p></div>';
        } else {
            habitStats.innerHTML = this.dataManager.data.habits.map(habit => {
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

        // Calculate data
        const data = days.map(date => {
            const dayData = this.dataManager.getDayData(date);
            const total = this.dataManager.data.habits.length;
            if (total === 0) return 0;
            const completed = Object.values(dayData.habits).filter(v => v).length;
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
        // Habits
        const habitsList = document.getElementById('habits-settings-list');
        if (this.dataManager.data.habits.length === 0) {
            habitsList.innerHTML = '<div class="empty-state"><p>No habits configured yet.</p></div>';
        } else {
            habitsList.innerHTML = this.dataManager.data.habits.map(habit => `
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">${habit.name}</div>
                    </div>
                    <div class="setting-actions">
                        <button class="btn-icon delete" data-habit-id="${habit.id}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');

            habitsList.querySelectorAll('.btn-icon.delete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('Delete this habit? All associated data will be removed.')) {
                        await this.dataManager.deleteHabit(btn.dataset.habitId);
                        this.renderSettingsView();
                        this.renderTodayView();
                    }
                });
            });
        }

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
                    if (confirm('Delete this tracking field? All associated data will be removed.')) {
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

        document.getElementById('habit-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('habit-name').value.trim();
            if (name) {
                await this.dataManager.addHabit(name);
                document.getElementById('habit-modal').classList.remove('active');
                document.getElementById('habit-form').reset();
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
            
            if (name && type) {
                const editingId = document.getElementById('tracking-form').dataset.editingId;
                if (editingId) {
                    await this.dataManager.updateTrackingField(editingId, name, type, unit);
                    delete document.getElementById('tracking-form').dataset.editingId;
                } else {
                    await this.dataManager.addTrackingField(name, type, unit);
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
    }

    showHabitModal() {
        document.getElementById('habit-modal').classList.add('active');
        document.getElementById('habit-name').focus();
    }

    showTrackingModal(fieldId = null) {
        const modal = document.getElementById('tracking-modal');
        const form = document.getElementById('tracking-form');
        const title = document.getElementById('tracking-modal-title');
        const nameInput = document.getElementById('tracking-name');
        const typeInput = document.getElementById('tracking-type');
        const unitInput = document.getElementById('tracking-unit');
        const unitGroup = document.getElementById('unit-group');
        
        if (fieldId) {
            // Edit mode
            const field = this.dataManager.data.trackingFields.find(f => f.id === fieldId);
            if (field) {
                title.textContent = 'Edit Tracking Field';
                nameInput.value = field.name;
                typeInput.value = field.type;
                unitInput.value = field.unit || '';
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
