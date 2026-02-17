class QuickTaskFeature {
    constructor() {
        this.DEFAULT_TIME_FILTER = '';
        this.storageKey = 'trackDeezQuickTasks';
        this.tasks = [];
        this.availableTime = '';
        this.fallbackCounter = 0;
        this.editingId = null;
        this.elements = {
            view: document.getElementById('quick-view'),
            list: document.getElementById('quick-task-list'),
            completed: document.getElementById('quick-completed-list'),
            form: document.getElementById('quick-task-form'),
            nameInput: document.getElementById('quick-task-name'),
            estimateInput: document.getElementById('quick-task-estimate'),
            flexibleInput: document.getElementById('quick-task-flexible'),
            recurringInput: document.getElementById('quick-task-recurring'),
            presets: document.querySelectorAll('[data-time-preset]'),
            feedback: document.getElementById('quick-feedback'),
            editIndicator: document.getElementById('quick-edit-indicator'),
            cancelEditBtn: document.getElementById('quick-cancel-edit'),
            submitBtn: document.getElementById('quick-submit-btn'),
            taskCount: document.getElementById('quick-task-count')
        };
        this.load();
        this.bindEvents();
        this.render();
    }

    load() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.storageKey));
            if (saved && Array.isArray(saved.tasks)) {
                this.tasks = saved.tasks;
                this.availableTime = saved.availableTime || '';
            }
        } catch (e) {
            this.tasks = [];
        }
        if (!this.availableTime) {
            this.availableTime = this.DEFAULT_TIME_FILTER;
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify({
            tasks: this.tasks,
            availableTime: this.availableTime
        }));
    }

    bindEvents() {
        if (!this.elements.view) return;

        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addTask();
            });
        }

        if (this.elements.presets) {
            this.elements.presets.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.setFilterMinutes(btn.dataset.timePreset);
                });
            });
        }

        if (this.elements.list) {
            this.elements.list.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-action]');
                if (!button) return;
                const action = button.dataset.action;
                const taskId = button.dataset.taskId;

                if (action === 'work') {
                    this.logWork(taskId);
                } else if (action === 'edit') {
                    this.startEdit(taskId);
                } else if (action === 'delete') {
                    this.deleteTask(taskId);
                }
            });
        }

        if (this.elements.completed) {
            this.elements.completed.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-action]');
                if (!button) return;
                const action = button.dataset.action;
                const taskId = button.dataset.taskId;

                if (action === 'restart') {
                    this.restartTask(taskId);
                }
            });
        }

        if (this.elements.cancelEditBtn) {
            this.elements.cancelEditBtn.addEventListener('click', () => this.resetForm());
        }

        this.setPresetActive();
        this.updateFormState();
    }

    addTask() {
        const name = (this.elements.nameInput?.value || '').trim();
        const estimateValue = (this.elements.estimateInput?.value || '').trim();
        const flexible = !!this.elements.flexibleInput?.checked;
        const recurring = !!this.elements.recurringInput?.checked;

        if (!name) {
            this.showFeedback('Please enter a task name');
            return;
        }

        const estimateMinutes = estimateValue === '' ? null : parseInt(estimateValue, 10);
        if (estimateValue !== '' && (isNaN(estimateMinutes) || estimateMinutes <= 0)) {
            this.showFeedback('Estimated time should be a positive number');
            return;
        }

        if (this.editingId) {
            const existing = this.tasks.find(t => t.id === this.editingId);
            if (existing) {
                existing.name = name;
                existing.estimateMinutes = estimateMinutes;
                existing.flexible = flexible;
                existing.recurring = recurring;
                this.showFeedback('Task updated', 'success');
            }
        } else {
            this.tasks.push({
                id: this.generateTaskId(),
                name,
                estimateMinutes,
                flexible,
                recurring,
                logs: [],
                completed: false,
                createdAt: new Date().toISOString()
            });
            this.showFeedback('Task added', 'success');
        }

        this.resetForm();
        this.save();
        this.render();
    }

    showFeedback(message, type = 'error') {
        if (!this.elements.feedback) return;
        this.elements.feedback.textContent = message;
        this.elements.feedback.className = `quick-feedback ${type}`;
    }

    getActiveTasks() {
        const available = parseInt(this.availableTime, 10);
        const hasTimeFilter = !isNaN(available) && this.availableTime !== '';

        return this.tasks.filter(task => {
            if (task.completed) return false;
            if (!hasTimeFilter) return true;
            if (task.flexible) return true;
            if (typeof task.estimateMinutes === 'number') {
                return task.estimateMinutes <= available;
            }
            return true;
        }).sort((a, b) => {
            // Sort by estimate time (shortest first), then by created date
            const aEst = a.estimateMinutes || 999999;
            const bEst = b.estimateMinutes || 999999;
            if (aEst !== bEst) return aEst - bEst;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    }

    getCompletedTasks() {
        return this.tasks
            .filter(t => t.completed)
            .sort((a, b) => this.getLatestTimestamp(b) - this.getLatestTimestamp(a));
    }

    logTime(taskId, complete = false) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const message = complete ?
            'How many minutes did this task actually take?' :
            'How many minutes did you just work on this?';
        const input = prompt(message);
        if (input === null) return;

        const minutes = parseInt(input, 10);
        if (isNaN(minutes) || minutes <= 0) {
            this.showFeedback('Please enter minutes as a positive number.', 'error');
            return;
        }

        task.logs = task.logs || [];
        task.logs.push({
            minutes,
            type: complete ? 'complete' : 'progress',
            timestamp: new Date().toISOString()
        });

        if (complete) {
            task.completed = true;
        }

        this.save();
        this.render();
    }

    logWork(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const input = prompt('How many minutes did you work on this?');
        if (input === null) return;

        const minutes = parseInt(input, 10);
        if (isNaN(minutes) || minutes <= 0) {
            this.showFeedback('Please enter a positive number', 'error');
            return;
        }

        const complete = confirm('Did you complete this task?');
        
        task.logs = task.logs || [];
        task.logs.push({
            minutes,
            type: complete ? 'complete' : 'progress',
            timestamp: new Date().toISOString()
        });

        if (complete) {
            // Check if task is recurring
            if (task.recurring) {
                // For recurring tasks, mark complete but it will reopen
                task.completed = true;
                setTimeout(() => {
                    task.completed = false;
                    this.save();
                    this.render();
                    this.showFeedback('Recurring task reopened', 'success');
                }, 500);
            } else {
                task.completed = true;
            }
        }

        this.save();
        this.render();
        
        const msg = complete ? 
            (task.recurring ? `${minutes} min logged. Task will reopen as it's recurring.` : `${minutes} min logged. Task completed!`) : 
            `${minutes} min logged as progress`;
        this.showFeedback(msg, 'success');
    }

    deleteTask(taskId) {
        if (!confirm('Delete this task?')) return;
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.save();
        this.render();
        this.showFeedback('Task deleted', 'success');
    }

    restartTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        task.completed = false;
        this.save();
        this.render();
    }

    startEdit(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        this.editingId = taskId;
        if (this.elements.nameInput) this.elements.nameInput.value = task.name;
        if (this.elements.estimateInput) this.elements.estimateInput.value = task.estimateMinutes || '';
        if (this.elements.flexibleInput) this.elements.flexibleInput.checked = !!task.flexible;
        if (this.elements.recurringInput) this.elements.recurringInput.checked = !!task.recurring;
        this.updateFormState();
        
        // Open the details element if it exists
        const details = this.elements.form?.closest('details');
        if (details) details.open = true;
    }

    resetForm() {
        this.editingId = null;
        this.elements.form?.reset();
        this.updateFormState();
    }

    updateFormState() {
        if (this.elements.editIndicator) {
            this.elements.editIndicator.classList.toggle('hidden', !this.editingId);
        }
        if (this.elements.cancelEditBtn) {
            this.elements.cancelEditBtn.classList.toggle('hidden', !this.editingId);
        }
        if (this.elements.submitBtn) {
            this.elements.submitBtn.textContent = this.editingId ? 'Update' : 'Save';
        }
    }

    setFilterMinutes(value) {
        this.availableTime = value;
        this.save();
        this.setPresetActive();
        this.render();
    }

    setPresetActive() {
        if (!this.elements.presets) return;
        this.elements.presets.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.timePreset === this.availableTime);
        });
    }

    render() {
        this.renderActive();
        this.renderCompleted();
    }

    renderActive() {
        if (!this.elements.list) return;
        const tasks = this.getActiveTasks();
        const hasFilter = this.availableTime !== '' && !isNaN(parseInt(this.availableTime, 10));

        // Update task count
        if (this.elements.taskCount) {
            this.elements.taskCount.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
        }

        if (tasks.length === 0) {
            this.elements.list.innerHTML = `
                <div class="empty-state">
                    <p>${hasFilter ? 'No tasks match this time filter' : 'No tasks yet. Add one below!'}</p>
                </div>
            `;
            return;
        }

        this.elements.list.innerHTML = tasks.map(task => {
            const total = this.getTotalMinutes(task);
            const est = task.estimateMinutes || '?';
            const progress = total > 0 ? ` • ${total} min logged` : '';
            
            return `
                <div class="quick-card-compact">
                    <div class="quick-card-main">
                        <div class="quick-card-info">
                            <div class="quick-name-compact">${task.name}</div>
                            <div class="quick-meta-compact">
                                ${task.flexible ? '⏱️ Flexible' : `⏱️ ${est} min`}${progress}
                                ${task.recurring ? ' • 🔄 Recurring' : ''}
                            </div>
                        </div>
                        <div class="quick-actions-compact">
                            <button class="btn-action" data-action="work" data-task-id="${task.id}">Work on it</button>
                            <button class="btn-icon" data-action="edit" data-task-id="${task.id}" title="Edit">✏️</button>
                            <button class="btn-icon" data-action="delete" data-task-id="${task.id}" title="Delete">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCompleted() {
        if (!this.elements.completed) return;
        const completed = this.getCompletedTasks();
        if (completed.length === 0) {
            this.elements.completed.innerHTML = '<div class="empty-state"><p>No completed tasks yet</p></div>';
            return;
        }

        this.elements.completed.innerHTML = completed.map(task => {
            const total = this.getTotalMinutes(task);
            const lastLogEntry = this.getLatestLog(task);
            const lastLog = lastLogEntry ? new Date(lastLogEntry.timestamp).toLocaleDateString() : '';
            return `
                <div class="quick-card-compact completed">
                    <div class="quick-card-main">
                        <div class="quick-card-info">
                            <div class="quick-name-compact">${task.name}</div>
                            <div class="quick-meta-compact">
                                ✅ ${total} min • ${lastLog}${task.recurring ? ' • 🔄 Recurring' : ''}
                            </div>
                        </div>
                        <button class="btn-secondary-compact" data-action="restart" data-task-id="${task.id}">Reopen</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTotalMinutes(task) {
        return (task.logs || []).reduce((sum, entry) => sum + (parseInt(entry.minutes, 10) || 0), 0);
    }

    getLatestLog(task) {
        return task.logs?.length ? task.logs.slice(-1)[0] : null;
    }

    getLatestTimestamp(task) {
        const latestLog = this.getLatestLog(task);
        return latestLog ? new Date(latestLog.timestamp) : new Date(task.createdAt);
    }

    generateTaskId() {
        if (crypto.randomUUID) return crypto.randomUUID();
        const randomPart = Math.random().toString(36).slice(2, 8);
        return `qt_${Date.now()}_${this.fallbackCounter++}_${randomPart}`;
    }

    formatProgressLabel(task, total) {
        if (total <= 0) return 'No time logged yet';
        const estimateText = task.estimateMinutes ? ` of ~${task.estimateMinutes} min` : '';
        return `${total} min logged${estimateText}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('quick-view')) {
        window.quickTaskFeature = new QuickTaskFeature();
    }
});
