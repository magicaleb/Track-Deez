(() => {
  const STORAGE_KEY = 'timelens.pwa.v3';
  const DEFAULT_STATE = {
    tasks: [],
    logs: [],
    filterMinutes: null,
    activeTaskId: null,
    selectedTaskId: null,
    lastRecurringResetAt: null
  };

  const STARTER_TASKS = [
    { name: 'Squats', effort: 5, recurring: 'daily', flexible: true, active: true },
    { name: 'Clean car – bring stuff inside', effort: 5, recurring: 'none', flexible: true, active: true },
    { name: 'Use dating app', effort: 5, recurring: 'daily', flexible: true, active: true },
    { name: 'Stretch', effort: 5, recurring: 'daily', flexible: true, active: true },
    { name: 'Clean desk corner', effort: 5, recurring: 'none', flexible: true, active: true },
    { name: 'Sort through trunk', effort: 10, recurring: 'none', flexible: true, active: true },
    { name: 'Remove junk from fridge', effort: 10, recurring: 'weekly', flexible: true, active: true },
    { name: 'Practice magic', effort: 15, recurring: 'daily', flexible: false, active: true },
    { name: 'Practice Piano', effort: 15, recurring: 'daily', flexible: false, active: true },
    { name: 'Clean Bedroom', effort: 15, recurring: 'weekly', flexible: false, active: true },
    { name: 'Clean Bathroom', effort: 15, recurring: 'weekly', flexible: false, active: true }
  ];

  const page = document.body.dataset.page;
  const state = loadState();
  applyRecurringReset();

  if (page === 'focus') initFocusPage();
  if (page === 'setup') initSetupPage();
  registerSW();

  function initFocusPage() {
    const status = document.getElementById('filter-status');
    const timeInput = document.getElementById('available-minutes');
    const goButton = document.getElementById('go-button');
    const chooseButton = document.getElementById('choose-button');
    const closeChoose = document.getElementById('close-choose');
    const primaryControls = document.getElementById('primary-controls');
    const resultControls = document.getElementById('result-controls');
    const taskDisplay = document.getElementById('task-display');
    const choosePanel = document.getElementById('choose-panel');
    const chooseList = document.getElementById('choose-list');
    const chooseTemplate = document.getElementById('choose-item-template');
    const doneButton = document.getElementById('done-button');
    const progressButton = document.getElementById('progress-button');

    if (state.filterMinutes) timeInput.value = String(state.filterMinutes);

    goButton.addEventListener('click', () => {
      const minutes = Number(timeInput.value);
      if (!isValidMinutes(minutes)) return toast('Enter valid minutes first.');
      state.filterMinutes = minutes;
      const candidates = getMatchingTasks(minutes);
      if (!candidates.length) {
        setIdleUi();
        status.textContent = `No active tasks fit ${minutes}m yet. Add or reactivate tasks in Setup.`;
        persist();
        return;
      }
      const task = pickTask(candidates, null);
      selectTask(task.id);
      status.textContent = buildConstraintStatus(minutes, candidates.length);
      persist();
      renderTaskCard();
      renderChooseList();
    });

    chooseButton.addEventListener('click', () => {
      const minutes = Number(timeInput.value);
      if (!isValidMinutes(minutes)) return toast('Enter valid minutes first.');
      choosePanel.hidden = false;
      renderChooseList();
    });

    closeChoose.addEventListener('click', () => {
      choosePanel.hidden = true;
    });

    chooseList.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action !== 'select') return;
      const item = e.target.closest('.task-card');
      const taskId = item?.dataset.taskId;
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) return;
      selectTask(task.id);
      choosePanel.hidden = true;
      persist();
      renderTaskCard();
      toast('Task selected.');
    });

    doneButton.addEventListener('click', () => {
      const task = getSelectedTask();
      if (!task) return;
      task.completedAt = new Date().toISOString();
      task.active = false;
      addLog(task.id, `Completed "${task.name}"`, task.effort);
      clearSelectionAndResetUi();
      persist();
      toast('Task archived as completed.');
    });

    progressButton.addEventListener('click', () => {
      const task = getSelectedTask();
      if (!task) return;

      const spentInput = window.prompt(`How many minutes did you spend on "${task.name}"?`, '15');
      if (spentInput === null) return;
      const spent = Number(spentInput);
      if (!isValidMinutes(spent)) return toast('Enter a valid minute amount.');

      task.totalMinutes += spent;
      const previousEffort = task.effort;

      if (spent >= previousEffort) {
        const extraInput = window.prompt(
          `You reached or passed the estimate (${previousEffort}m). How many more minutes are needed?`,
          '0'
        );
        if (extraInput === null) return;
        const remaining = Math.max(0, Number(extraInput));
        if (!Number.isFinite(remaining)) return toast('Enter a valid remaining time.');

        if (remaining === 0) {
          task.completedAt = new Date().toISOString();
          task.active = false;
          addLog(task.id, `Completed after progress on "${task.name}"`, spent);
          clearSelectionAndResetUi();
          persist();
          toast('Task completed and archived.');
          return;
        }

        task.effort = remaining;
        task.completedAt = null;
        addLog(task.id, `Progressed "${task.name}"; new estimate ${remaining}m`, spent);
      } else {
        task.effort = Math.max(1, previousEffort - spent);
        addLog(task.id, `Progressed "${task.name}"; ${task.effort}m remaining`, spent);
      }

      clearSelectionAndResetUi();
      persist();
      toast('Progress saved.');
    });

    setIdleUi();

    function renderTaskCard() {
      const task = getSelectedTask();
      if (!task) {
        setIdleUi();
        return;
      }
      const heroName = document.getElementById('hero-task-name');
      const heroMeta = document.getElementById('hero-task-meta');

      heroName.textContent = task.name;
      heroMeta.textContent = `${task.effort} min remaining${task.flexible ? ' • flex' : ''}`;
      primaryControls.hidden = true;
      resultControls.hidden = false;
      taskDisplay.hidden = false;
    }

    function renderChooseList() {
      const minutes = Number(timeInput.value);
      chooseList.innerHTML = '';
      const candidates = isValidMinutes(minutes) ? getMatchingTasks(minutes) : [];
      candidates.forEach((task) => {
        const frag = chooseTemplate.content.cloneNode(true);
        const li = frag.querySelector('.task-card');
        li.dataset.taskId = task.id;
        frag.querySelector('.task-name').textContent = task.name;
        frag.querySelector('.task-meta').textContent = `${task.effort}m remaining${task.flexible ? ' • flex backup' : ''}`;
        chooseList.appendChild(frag);
      });

      if (!candidates.length) {
        const li = document.createElement('li');
        li.className = 'task-card compact';
        li.textContent = 'No tasks fit your current time.';
        chooseList.appendChild(li);
      }
    }

    function clearSelectionAndResetUi() {
      state.selectedTaskId = null;
      state.activeTaskId = null;
      setIdleUi();
    }

    function setIdleUi() {
      primaryControls.hidden = false;
      resultControls.hidden = true;
      taskDisplay.hidden = true;
      choosePanel.hidden = true;
      status.textContent = state.filterMinutes
        ? 'Enter minutes and tap Go to get one task.'
        : 'Enter minutes and tap Go to get one task.';
    }

    function getSelectedTask() {
      return state.tasks.find((task) => task.id === state.selectedTaskId && task.active && !task.completedAt) || null;
    }

    function selectTask(taskId) {
      state.selectedTaskId = taskId;
      state.activeTaskId = taskId;
    }
  }

  function initSetupPage() {
    const form = document.getElementById('task-form');
    const list = document.getElementById('setup-task-list');
    const archivedList = document.getElementById('archived-task-list');
    const template = document.getElementById('setup-task-template');
    const archivedTemplate = document.getElementById('archived-task-template');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('task-id').value || crypto.randomUUID();
      const name = document.getElementById('task-name').value.trim();
      const effort = Number(document.getElementById('task-effort').value);
      if (!name || !isValidMinutes(effort)) return toast('Name + valid effort required.');

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
    document.getElementById('add-starters').addEventListener('click', () => {
      const existingNames = new Set(state.tasks.map((task) => task.name.toLowerCase()));
      const starters = STARTER_TASKS
        .filter((task) => !existingNames.has(task.name.toLowerCase()))
        .map((task) => ({
          ...task,
          id: crypto.randomUUID(),
          totalMinutes: 0,
          completedAt: null,
          createdAt: new Date().toISOString()
        }));
      if (!starters.length) return toast('Starter tasks already added.');
      state.tasks = state.tasks.concat(starters);
      persist();
      render();
      toast(`Added ${starters.length} starter tasks.`);
    });

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
        populateForm(task);
        return;
      }
      if (action === 'delete') {
        deleteTask(task);
      }
      if (action === 'reset') {
        task.completedAt = null;
        task.active = true;
        addLog(task.id, `Reset "${task.name}"`, 0);
      }
      if (action === 'toggle') {
        task.active = !task.active;
        if (!task.active && state.activeTaskId === task.id) state.activeTaskId = null;
        addLog(task.id, `${task.active ? 'Activated' : 'Paused'} "${task.name}"`, 0);
      }
      persist();
      render();
      toast('Updated.');
    });

    archivedList.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action) return;
      const task = state.tasks.find((t) => t.id === e.target.closest('.task-card')?.dataset.taskId);
      if (!task) return;

      if (action === 'restore') {
        task.completedAt = null;
        task.active = true;
        addLog(task.id, `Restored "${task.name}"`, 0);
      }
      if (action === 'delete') {
        deleteTask(task);
      }

      persist();
      render();
      toast('Updated.');
    });

    render();

    function render() {
      list.innerHTML = '';
      archivedList.innerHTML = '';

      const activeTasks = state.tasks
        .filter((task) => !task.completedAt)
        .slice()
        .sort((a, b) => Number(b.active) - Number(a.active) || a.effort - b.effort);
      const archivedTasks = state.tasks
        .filter((task) => Boolean(task.completedAt))
        .slice()
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      activeTasks.forEach((task) => {
        const frag = template.content.cloneNode(true);
        const li = frag.querySelector('.task-card');
        li.dataset.taskId = task.id;
        frag.querySelector('.task-name').textContent = task.name;
        frag.querySelector('.task-meta').textContent = `${task.effort}m • ${task.active ? 'active' : 'paused'} • ${task.recurring}${task.flexible ? ' • flex' : ''}`;
        list.appendChild(frag);
      });

      archivedTasks.forEach((task) => {
        const frag = archivedTemplate.content.cloneNode(true);
        const li = frag.querySelector('.task-card');
        li.dataset.taskId = task.id;
        frag.querySelector('.task-name').textContent = task.name;
        frag.querySelector('.task-meta').textContent = `Archived • ${task.effort}m • ${new Date(task.completedAt).toLocaleDateString()}`;
        archivedList.appendChild(frag);
      });

      if (!archivedTasks.length) {
        const li = document.createElement('li');
        li.className = 'task-card compact';
        li.textContent = 'No archived tasks yet.';
        archivedList.appendChild(li);
      }

      renderInsights();
      renderLogs();
    }

    function clearForm() {
      form.reset();
      document.getElementById('task-id').value = '';
      document.getElementById('task-active').checked = true;
      document.getElementById('cancel-edit').hidden = true;
    }

    function populateForm(task) {
      document.getElementById('task-id').value = task.id;
      document.getElementById('task-name').value = task.name;
      document.getElementById('task-effort').value = String(task.effort);
      document.getElementById('task-repeat').value = task.recurring;
      document.getElementById('task-flexible').checked = task.flexible;
      document.getElementById('task-active').checked = task.active;
      document.getElementById('cancel-edit').hidden = false;
    }

    function deleteTask(task) {
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      if (state.activeTaskId === task.id || state.selectedTaskId === task.id) {
        state.activeTaskId = null;
        state.selectedTaskId = null;
      }
      addLog(task.id, `Deleted "${task.name}"`, 0);
    }
  }

  function getMatchingTasks(minutes) {
    const active = state.tasks.filter((t) => t.active && !t.completedAt);
    const strict = active.filter((t) => t.effort <= minutes);
    if (strict.length) return sortByEffort(strict);
    return sortByEffort(active.filter((t) => t.flexible));
  }

  function pickTask(candidates, currentTaskId) {
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];
    const options = currentTaskId ? candidates.filter((t) => t.id !== currentTaskId) : candidates;
    const source = options.length ? options : candidates;
    return source[Math.floor(Math.random() * source.length)];
  }

  function buildConstraintStatus(minutes, count) {
    return `${count} option${count === 1 ? '' : 's'} found for ${minutes}m.`;
  }

  function applyRecurringReset(force = false) {
    const now = new Date();
    const last = state.lastRecurringResetAt ? new Date(state.lastRecurringResetAt) : null;
    state.tasks.forEach((task) => {
      if (!task.completedAt || task.recurring === 'none') return;
      const completed = new Date(task.completedAt);
      const dailyReset = task.recurring === 'daily' && completed.toDateString() !== now.toDateString();
      const weeklyReset = task.recurring === 'weekly' && daysBetween(completed, now) >= 7;
      if (dailyReset || weeklyReset) {
        task.completedAt = null;
        task.active = true;
      }
    });
    if (force || !last || daysBetween(last, now) >= 1) state.lastRecurringResetAt = now.toISOString();
  }

  function renderInsights() {
    const total = state.tasks.length;
    const active = state.tasks.filter((t) => t.active && !t.completedAt).length;
    const archived = state.tasks.filter((t) => t.completedAt).length;
    const minutes = state.logs.reduce((sum, log) => sum + (log.minutes || 0), 0);
    document.getElementById('insight-grid').innerHTML = [
      { label: 'Total', value: total },
      { label: 'Ready now', value: active },
      { label: 'Archived', value: archived },
      { label: 'Logged min', value: minutes }
    ].map((c) => `<article class="insight"><strong>${c.value}</strong><p>${c.label}</p></article>`).join('');
  }

  function renderLogs() {
    const logs = document.getElementById('log-list');
    logs.innerHTML = '';
    state.logs.slice().reverse().slice(0, 12).forEach((entry) => {
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

  function isValidMinutes(value) {
    return Number.isFinite(value) && value > 0;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('timelens.pwa.v2');
      if (!raw) {
        return {
          ...structuredClone(DEFAULT_STATE),
          tasks: STARTER_TASKS.map((task) => ({
            ...task,
            id: crypto.randomUUID(),
            totalMinutes: 0,
            completedAt: null,
            createdAt: new Date().toISOString()
          }))
        };
      }
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
    setTimeout(() => el.classList.remove('show'), 1700);
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
