class QuickTaskFeature {
    constructor() {
        this.DEFAULT_TIME_FILTER = '15';
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
            presets: document.querySelectorAll('[data-time-preset]'),
            feedback: document.getElementById('quick-feedback'),
            editIndicator: document.getElementById('quick-edit-indicator'),
            cancelEditBtn: document.getElementById('quick-cancel-edit'),
            submitBtn: document.getElementById('quick-submit-btn')
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

                if (action === 'complete') {
                    this.logTime(taskId, true);
                } else if (action === 'progress') {
                    this.logTime(taskId, false);
                } else if (action === 'edit') {
                    this.startEdit(taskId);
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

        if (!name) {
            this.showFeedback('Give the task a short name so you recognize it later.');
            return;
        }

        const estimateMinutes = estimateValue === '' ? null : parseInt(estimateValue, 10);
        if (estimateValue !== '' && (isNaN(estimateMinutes) || estimateMinutes <= 0)) {
            this.showFeedback('Estimated time should be a positive number of minutes.');
            return;
        }

        if (this.editingId) {
            const existing = this.tasks.find(t => t.id === this.editingId);
            if (existing) {
                existing.name = name;
                existing.estimateMinutes = estimateMinutes;
                existing.flexible = flexible;
                this.showFeedback('Task updated.', 'success');
            }
        } else {
            this.tasks.push({
                id: this.generateTaskId(),
                name,
                estimateMinutes,
                flexible,
                logs: [],
                completed: false,
                createdAt: new Date().toISOString()
            });
            this.showFeedback('Task saved for your next free pocket of time.', 'success');
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
        }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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
        this.updateFormState();
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
            this.elements.submitBtn.textContent = this.editingId ? 'Update task' : 'Save task';
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

        if (tasks.length === 0) {
            this.elements.list.innerHTML = `
                <div class="empty-state">
                    <p>${hasFilter ? 'No tasks fit this time window.' : 'Add a few tasks to get started.'}</p>
                    <small style="color: var(--text-secondary);">Try another time button or mark tasks as flexible.</small>
                </div>
            `;
            return;
        }

        this.elements.list.innerHTML = tasks.map(task => {
            const total = this.getTotalMinutes(task);
            const target = task.flexible ? 'Flexible / open-ended' : `${task.estimateMinutes || '—'} min`;
            const progressLabel = this.formatProgressLabel(task, total);

            return `
                <div class="quick-card">
                    <div class="quick-card-header">
                        <div>
                            <div class="quick-name">${task.name}</div>
                            <div class="quick-meta">${target}</div>
                        </div>
                        ${task.flexible ? '<span class="pill">Flexible</span>' : ''}
                    </div>
                    <div class="quick-progress">${progressLabel}</div>
                    <div class="quick-actions">
                        <button class="chip-btn ghost" data-action="edit" data-task-id="${task.id}">Edit</button>
                        <button class="chip-btn" data-action="progress" data-task-id="${task.id}">Log progress</button>
                        <button class="btn-primary" data-action="complete" data-task-id="${task.id}">Complete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCompleted() {
        if (!this.elements.completed) return;
        const completed = this.getCompletedTasks();
        if (completed.length === 0) {
            this.elements.completed.innerHTML = '<div class="empty-state"><p>No completed tasks yet.</p></div>';
            return;
        }

        this.elements.completed.innerHTML = completed.map(task => {
            const total = this.getTotalMinutes(task);
            const lastLogEntry = this.getLatestLog(task);
            const lastLog = lastLogEntry ? new Date(lastLogEntry.timestamp).toLocaleString() : '';
            return `
                <div class="quick-card completed">
                    <div class="quick-card-header">
                        <div>
                            <div class="quick-name">${task.name}</div>
                            <div class="quick-meta">Finished • ${total} min recorded${task.flexible ? ' • Flexible' : ''}</div>
                            ${lastLog ? `<div class="quick-meta">Last updated: ${lastLog}</div>` : ''}
                        </div>
                        <button class="chip-btn ghost" data-action="restart" data-task-id="${task.id}">Reopen</button>
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
