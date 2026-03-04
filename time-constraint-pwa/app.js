(() => {
  const STORAGE_KEY = 'timelens.pwa.v2';
  const DEFAULT_STATE = {
    tasks: [],
    logs: [],
    filterMinutes: null,
    includeFlexible: true,
    activeTaskId: null,
    lastRecurringResetAt: null
  };

  const page = document.body.dataset.page;
  const state = loadState();
  applyRecurringReset();

  if (page === 'focus') initFocusPage();
  if (page === 'setup') initSetupPage();
  registerSW();

  function initFocusPage() {
    const taskList = document.getElementById('focus-task-list');
    const emptyState = document.getElementById('empty-state');
    const status = document.getElementById('filter-status');
    const includeFlex = document.getElementById('include-flex');
    const timeForm = document.getElementById('time-form');
    const timeInput = document.getElementById('available-minutes');
    const template = document.getElementById('focus-task-template');

    includeFlex.checked = state.includeFlexible;

    timeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const minutes = Number(timeInput.value);
      if (!Number.isFinite(minutes) || minutes <= 0) return toast('Enter valid minutes.');
      state.filterMinutes = minutes;
      state.includeFlexible = includeFlex.checked;
      persist();
      render();
      toast(`Now filtering by ${minutes}m.`);
    });

    includeFlex.addEventListener('change', () => {
      state.includeFlexible = includeFlex.checked;
      persist();
      render();
    });

    document.getElementById('clear-filter').addEventListener('click', () => {
      state.filterMinutes = null;
      timeInput.value = '';
      persist();
      render();
    });

    document.querySelectorAll('.chip[data-min]').forEach((button) => {
      button.addEventListener('click', () => {
        const minutes = Number(button.dataset.min);
        timeInput.value = String(minutes);
        state.filterMinutes = minutes;
        persist();
        render();
      });
    });

    taskList.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action) return;
      const item = e.target.closest('.task-card');
      const id = item?.dataset.taskId;
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return;

      if (action === 'start') {
        state.activeTaskId = task.id;
        addLog(task.id, `Started "${task.name}"`, 0);
      }
      if (action === 'log5') {
        task.totalMinutes += 5;
        addLog(task.id, `Progress on "${task.name}"`, 5);
      }
      if (action === 'log15') {
        task.totalMinutes += 15;
        addLog(task.id, `Progress on "${task.name}"`, 15);
      }
      if (action === 'complete') {
        task.completedAt = new Date().toISOString();
        addLog(task.id, `Completed "${task.name}"`, task.effort);
      }

      persist();
      render();
      toast('Updated.');
    });

    render();

    function render() {
      const visible = getVisibleTasks();
      taskList.innerHTML = '';
      emptyState.hidden = visible.length > 0;
      status.textContent = buildFilterStatus(visible.length);

      visible.forEach((task) => {
        const frag = template.content.cloneNode(true);
        const li = frag.querySelector('.task-card');
        li.dataset.taskId = task.id;
        frag.querySelector('.task-name').textContent = task.name;
        frag.querySelector('.task-meta').textContent = `${task.effort}m • ${task.flexible ? 'flexible' : 'strict'}${state.activeTaskId === task.id ? ' • in progress' : ''}`;
        taskList.appendChild(frag);
      });
    }
  }

  function initSetupPage() {
    const form = document.getElementById('task-form');
    const list = document.getElementById('setup-task-list');
    const template = document.getElementById('setup-task-template');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('task-id').value || crypto.randomUUID();
      const name = document.getElementById('task-name').value.trim();
      const effort = Number(document.getElementById('task-effort').value);
      if (!name || !Number.isFinite(effort) || effort <= 0) return toast('Name + valid effort required.');

      const current = state.tasks.find((t) => t.id === id);
      const next = {
        id,
        name,
        effort,
        recurring: document.getElementById('task-repeat').value,
        flexible: document.getElementById('task-flexible').checked,
        active: document.getElementById('task-active').checked,
        totalMinutes: current?.totalMinutes || 0,
        completedAt: current?.completedAt || null,
        createdAt: current?.createdAt || new Date().toISOString()
      };

      state.tasks = state.tasks.filter((t) => t.id !== id).concat(next);
      persist();
      render();
      clearForm();
      toast(current ? 'Task updated.' : 'Task created.');
    });

    document.getElementById('cancel-edit').addEventListener('click', clearForm);
    document.getElementById('reset-recurring').addEventListener('click', () => {
      applyRecurringReset(true);
      persist();
      render();
      toast('Recurring rules applied.');
    });

    list.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action) return;
      const task = state.tasks.find((t) => t.id === e.target.closest('.task-card')?.dataset.taskId);
      if (!task) return;

      if (action === 'edit') {
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-name').value = task.name;
        document.getElementById('task-effort').value = String(task.effort);
        document.getElementById('task-repeat').value = task.recurring;
        document.getElementById('task-flexible').checked = task.flexible;
        document.getElementById('task-active').checked = task.active;
        document.getElementById('cancel-edit').hidden = false;
        return;
      }
      if (action === 'delete') {
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
        addLog(task.id, `Deleted "${task.name}"`, 0);
      }
      if (action === 'reset') {
        task.completedAt = null;
        addLog(task.id, `Reset "${task.name}"`, 0);
      }
      if (action === 'toggle') {
        task.active = !task.active;
        addLog(task.id, `${task.active ? 'Enabled' : 'Disabled'} "${task.name}"`, 0);
      }
      persist();
      render();
      toast('Updated.');
    });

    render();

    function render() {
      list.innerHTML = '';
      state.tasks
        .slice()
        .sort((a, b) => Number(b.active) - Number(a.active) || a.effort - b.effort)
        .forEach((task) => {
          const frag = template.content.cloneNode(true);
          const li = frag.querySelector('.task-card');
          li.dataset.taskId = task.id;
          frag.querySelector('.task-name').textContent = task.name;
          frag.querySelector('.task-meta').textContent = `${task.effort}m • ${task.active ? 'active' : 'inactive'} • ${task.recurring}${task.completedAt ? ' • completed' : ''}${task.flexible ? ' • flexible' : ''}`;
          list.appendChild(frag);
        });

      renderInsights();
      renderLogs();
    }

    function clearForm() {
      form.reset();
      document.getElementById('task-id').value = '';
      document.getElementById('task-active').checked = true;
      document.getElementById('cancel-edit').hidden = true;
    }
  }

  function getVisibleTasks() {
    const active = state.tasks.filter((t) => t.active && !t.completedAt);
    if (!state.filterMinutes) return sortByEffort(active);
    const strict = active.filter((t) => t.effort <= state.filterMinutes);
    if (strict.length) return sortByEffort(strict);
    return state.includeFlexible ? sortByEffort(active.filter((t) => t.flexible)) : [];
  }

  function buildFilterStatus(count) {
    if (!state.filterMinutes) return `${count} active tasks ready.`;
    if (count === 0) return `No tasks fit ${state.filterMinutes}m.`;
    return `${count} tasks surfaced for ${state.filterMinutes}m.`;
  }

  function applyRecurringReset(force = false) {
    const now = new Date();
    const last = state.lastRecurringResetAt ? new Date(state.lastRecurringResetAt) : null;
    state.tasks.forEach((task) => {
      if (!task.completedAt || task.recurring === 'none') return;
      const completed = new Date(task.completedAt);
      const dailyReset = task.recurring === 'daily' && completed.toDateString() !== now.toDateString();
      const weeklyReset = task.recurring === 'weekly' && daysBetween(completed, now) >= 7;
      if (dailyReset || weeklyReset) task.completedAt = null;
    });
    if (force || !last || daysBetween(last, now) >= 1) state.lastRecurringResetAt = now.toISOString();
  }

  function renderInsights() {
    const total = state.tasks.length;
    const active = state.tasks.filter((t) => t.active && !t.completedAt).length;
    const complete = state.tasks.filter((t) => t.completedAt).length;
    const minutes = state.logs.reduce((sum, log) => sum + (log.minutes || 0), 0);
    document.getElementById('insight-grid').innerHTML = [
      { label: 'Total', value: total },
      { label: 'Active', value: active },
      { label: 'Completed', value: complete },
      { label: 'Logged min', value: minutes }
    ].map((c) => `<article class="insight"><strong>${c.value}</strong><p>${c.label}</p></article>`).join('');
  }

  function renderLogs() {
    const logs = document.getElementById('log-list');
    logs.innerHTML = '';
    state.logs.slice().reverse().slice(0, 10).forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = `${new Date(entry.at).toLocaleString()}: ${entry.message}${entry.minutes ? ` (${entry.minutes}m)` : ''}`;
      logs.appendChild(li);
    });
  }

  function addLog(taskId, message, minutes) {
    state.logs.push({ id: crypto.randomUUID(), taskId, message, minutes, at: new Date().toISOString() });
  }

  function sortByEffort(list) {
    return [...list].sort((a, b) => a.effort - b.effort);
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1500);
  }

  function daysBetween(a, b) {
    return Math.floor((b - a) / 86400000);
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => null);
    }
  }
})();
