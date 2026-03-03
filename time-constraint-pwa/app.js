(() => {
  const STORAGE_KEY = 'timelens.pwa.v1';
  const DEFAULT_STATE = {
    tasks: [],
    logs: [],
    filterMinutes: null,
    includeFlexible: true,
    activeTaskId: null,
    lastRecurringResetAt: null
  };

  const el = {
    taskForm: document.getElementById('task-form'),
    timeForm: document.getElementById('time-form'),
    taskList: document.getElementById('task-list'),
    emptyState: document.getElementById('empty-state'),
    logList: document.getElementById('log-list'),
    insightGrid: document.getElementById('insight-grid'),
    toast: document.getElementById('toast'),
    filterStatus: document.getElementById('filter-status'),
    taskTemplate: document.getElementById('task-template')
  };

  let state = loadState();
  applyRecurringReset(true);
  bindEvents();
  render();
  registerSW();

  function bindEvents() {
    el.taskForm.addEventListener('submit', onSaveTask);
    el.timeForm.addEventListener('submit', onApplyTimeFilter);
    document.getElementById('reset-filter').addEventListener('click', clearTimeFilter);
    document.getElementById('reset-recurring').addEventListener('click', () => {
      applyRecurringReset(false);
      persistAndRender('Recurring reset checked.');
    });
    document.getElementById('cancel-edit').addEventListener('click', clearTaskForm);
    document.getElementById('task-list').addEventListener('click', onTaskAction);
  }

  function onSaveTask(e) {
    e.preventDefault();
    const id = document.getElementById('task-id').value || crypto.randomUUID();
    const name = document.getElementById('task-name').value.trim();
    const effort = Number(document.getElementById('task-effort').value);
    const recurring = document.getElementById('task-repeat').value;
    const flexible = document.getElementById('task-flexible').checked;
    const active = document.getElementById('task-active').checked;

    if (!name || !Number.isFinite(effort) || effort <= 0) {
      showToast('Task name and valid effort are required.');
      return;
    }

    const existing = state.tasks.findIndex((t) => t.id === id);
    const task = {
      id,
      name,
      effort,
      recurring,
      flexible,
      active,
      completedAt: existing >= 0 ? state.tasks[existing].completedAt : null,
      totalMinutes: existing >= 0 ? state.tasks[existing].totalMinutes : 0,
      createdAt: existing >= 0 ? state.tasks[existing].createdAt : new Date().toISOString()
    };

    if (existing >= 0) {
      state.tasks[existing] = task;
      persistAndRender('Task updated.');
    } else {
      state.tasks.push(task);
      persistAndRender('Task created.');
    }
    clearTaskForm();
  }

  function onApplyTimeFilter(e) {
    e.preventDefault();
    const minutes = Number(document.getElementById('available-minutes').value);
    const includeFlexible = document.getElementById('include-flex').checked;
    if (!Number.isFinite(minutes) || minutes <= 0) {
      showToast('Enter a positive number of available minutes.');
      return;
    }
    state.filterMinutes = minutes;
    state.includeFlexible = includeFlexible;
    persistAndRender(`Filter applied for ${minutes} minutes.`);
  }

  function clearTimeFilter() {
    state.filterMinutes = null;
    document.getElementById('available-minutes').value = '';
    persistAndRender('Showing all active tasks.');
  }

  function onTaskAction(e) {
    const action = e.target.dataset.action;
    if (!action) return;
    const li = e.target.closest('.task-item');
    const taskId = li?.dataset.taskId;
    if (!taskId) return;

    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (action === 'delete') {
      state.tasks = state.tasks.filter((t) => t.id !== taskId);
      state.logs.push(logEntry(taskId, `Deleted task "${task.name}"`, 0));
      persistAndRender('Task deleted.');
      return;
    }

    if (action === 'edit') {
      fillTaskForm(task);
      return;
    }

    if (action === 'start') {
      state.activeTaskId = task.id;
      state.logs.push(logEntry(taskId, `Started task "${task.name}"`, 0));
      persistAndRender('Task started.');
      return;
    }

    if (action === 'log') {
      const logged = Number(prompt(`Minutes worked on "${task.name}"?`, '10'));
      if (!Number.isFinite(logged) || logged <= 0) {
        showToast('Progress log cancelled or invalid.');
        return;
      }
      task.totalMinutes += logged;
      state.logs.push(logEntry(taskId, `Logged progress on "${task.name}"`, logged));
      persistAndRender(`${logged} minute(s) logged.`);
      return;
    }

    if (action === 'complete') {
      task.completedAt = new Date().toISOString();
      state.logs.push(logEntry(taskId, `Completed "${task.name}"`, task.effort));
      persistAndRender('Task completed.');
      return;
    }

    if (action === 'reset') {
      task.completedAt = null;
      state.logs.push(logEntry(taskId, `Reset completion for "${task.name}"`, 0));
      persistAndRender('Task reset to active.');
    }
  }

  function applyRecurringReset(initialOnly) {
    const now = new Date();
    const last = state.lastRecurringResetAt ? new Date(state.lastRecurringResetAt) : null;

    state.tasks.forEach((task) => {
      if (!task.completedAt || task.recurring === 'none') return;
      const completed = new Date(task.completedAt);
      const needsDaily = task.recurring === 'daily' && completed.toDateString() !== now.toDateString();
      const needsWeekly = task.recurring === 'weekly' && daysBetween(completed, now) >= 7;
      if (needsDaily || needsWeekly) task.completedAt = null;
    });

    if (!initialOnly || !last || daysBetween(last, now) >= 1) {
      state.lastRecurringResetAt = now.toISOString();
      saveState();
    }
  }

  function daysBetween(a, b) {
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
  }

  function getVisibleTasks() {
    const activeTasks = state.tasks.filter((task) => task.active && !task.completedAt);
    if (!state.filterMinutes) {
      el.filterStatus.textContent = `${activeTasks.length} active task(s) visible.`;
      return activeTasks;
    }

    const strict = activeTasks.filter((t) => t.effort <= state.filterMinutes);
    if (strict.length > 0) {
      el.filterStatus.textContent = `${strict.length} task(s) fit within ${state.filterMinutes} minute(s).`;
      return sortByEffort(strict);
    }

    if (state.includeFlexible) {
      const flexible = activeTasks.filter((t) => t.flexible);
      el.filterStatus.textContent = flexible.length
        ? `No exact fit. Showing ${flexible.length} flexible task(s).`
        : `No exact fit and no flexible tasks available.`;
      return sortByEffort(flexible);
    }

    el.filterStatus.textContent = `No tasks fit within ${state.filterMinutes} minute(s).`;
    return [];
  }

  function sortByEffort(tasks) {
    return [...tasks].sort((a, b) => a.effort - b.effort);
  }

  function render() {
    const visible = getVisibleTasks();
    el.taskList.innerHTML = '';
    el.emptyState.hidden = visible.length > 0;

    visible.forEach((task) => {
      const fragment = el.taskTemplate.content.cloneNode(true);
      const li = fragment.querySelector('.task-item');
      li.dataset.taskId = task.id;
      fragment.querySelector('.task-name').textContent = task.name;

      const flags = [
        `${task.effort} min`,
        task.flexible ? 'flexible' : 'strict',
        task.recurring !== 'none' ? task.recurring : null,
        state.activeTaskId === task.id ? 'in progress' : null
      ].filter(Boolean).join(' • ');

      fragment.querySelector('.task-meta').textContent = flags;
      el.taskList.appendChild(fragment);
    });

    renderLogs();
    renderInsights();
  }

  function renderLogs() {
    el.logList.innerHTML = '';
    state.logs.slice().reverse().slice(0, 8).forEach((log) => {
      const li = document.createElement('li');
      const stamp = new Date(log.at).toLocaleString();
      li.textContent = `${stamp}: ${log.message}${log.minutes ? ` (${log.minutes} min)` : ''}`;
      el.logList.appendChild(li);
    });
  }

  function renderInsights() {
    const totalTasks = state.tasks.length;
    const completedCount = state.tasks.filter((t) => t.completedAt).length;
    const effortLogged = state.logs.reduce((acc, log) => acc + (log.minutes || 0), 0);
    const activeCount = state.tasks.filter((t) => t.active && !t.completedAt).length;

    const insights = [
      { label: 'Total tasks', value: totalTasks },
      { label: 'Active tasks', value: activeCount },
      { label: 'Completed', value: completedCount },
      { label: 'Minutes logged', value: effortLogged }
    ];

    el.insightGrid.innerHTML = insights
      .map((item) => `<article class="insight"><strong>${item.value}</strong><p>${item.label}</p></article>`)
      .join('');
  }

  function fillTaskForm(task) {
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-name').value = task.name;
    document.getElementById('task-effort').value = String(task.effort);
    document.getElementById('task-repeat').value = task.recurring;
    document.getElementById('task-flexible').checked = task.flexible;
    document.getElementById('task-active').checked = task.active;
    document.getElementById('cancel-edit').hidden = false;
  }

  function clearTaskForm() {
    el.taskForm.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-active').checked = true;
    document.getElementById('cancel-edit').hidden = true;
  }

  function logEntry(taskId, message, minutes) {
    return {
      id: crypto.randomUUID(),
      taskId,
      message,
      minutes,
      at: new Date().toISOString()
    };
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    setTimeout(() => el.toast.classList.remove('show'), 1600);
  }

  function persistAndRender(toastMsg) {
    saveState();
    render();
    if (toastMsg) showToast(toastMsg);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_STATE),
        ...parsed,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        logs: Array.isArray(parsed.logs) ? parsed.logs : []
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        showToast('Offline mode not available in this browser context.');
      });
    }
  }
})();
