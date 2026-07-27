import { TABS } from './config.js';
import { state, mutate, query } from './state.js';
import { formatTimer, esc, toISO } from './helpers.js';
import { getConfig, saveConfig, loadData, saveData, testConnection, isConfigured } from './github.js';

import * as Register  from './views/register.js';
import * as Projects  from './views/projects.js';
import * as Dashboard from './views/dashboard.js';
import * as Gantt     from './views/gantt.js';
import * as Settings  from './views/settings.js';

const app = document.getElementById('app');

// ── RENDER ────────────────────────────────────────────────────────────────────

function render() {
  // Stop any running timer interval before rebuilding DOM
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  app.innerHTML = renderHeader() + renderView();

  // Restart timer interval if running and on register tab
  if (state.timerRunning && state.tab === 'register') {
    state.timerInterval = setInterval(() => {
      // Compute from real clock — immune to tab switches and throttling
      state.timerElapsed = Math.floor((Date.now() - state.timerStart.getTime()) / 1000);
      const el = document.getElementById('timer-display');
      if (el) {
        el.textContent = formatTimer(state.timerElapsed);
        el.className   = 'timer-display running';
      }
    }, 1000);
  }
}

function renderHeader() {
  const topTabs = TABS.map(t => `
    <div class="tab ${state.tab === t.id ? 'active' : ''}"
         data-action="navigate" data-params='{"tab":"${t.id}"}'>
      ${t.label}
    </div>`).join('');

  const bottomTabs = TABS.map(t => `
    <div class="bottom-tab ${state.tab === t.id ? 'active' : ''}"
         data-action="navigate" data-params='{"tab":"${t.id}"}'>
      <span class="bottom-tab-icon">${t.icon}</span>
      <span class="bottom-tab-label">${t.label}</span>
    </div>`).join('');

  return `
    <div id="header">
      <div class="logo">TIMETRACK</div>
      ${topTabs}
      <div id="sync-status"></div>
    </div>
    <nav id="bottom-nav">${bottomTabs}</nav>`;
}

function renderView() {
  switch (state.tab) {
    case 'register':  return Register.render();
    case 'projects':  return Projects.render();
    case 'dashboard': return Dashboard.render();
    case 'gantt':     return Gantt.render();
    case 'settings':  return Settings.render();
    default:          return `<div class="page empty-state">Tab no encontrado</div>`;
  }
}

// ── EVENT DELEGATION ──────────────────────────────────────────────────────────

app.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  e.stopPropagation();
  const action = el.dataset.action;
  const params = el.dataset.params ? JSON.parse(el.dataset.params) : {};
  if (el.dataset.color) params.color = el.dataset.color;
  handleAction(action, params);
});

app.addEventListener('change', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  handleAction(el.dataset.action, { value: el.value });
});

// ── ACTION HANDLER ────────────────────────────────────────────────────────────

function handleAction(action, params = {}) {
  switch (action) {

    // Navigation
    case 'navigate':
      state.tab = params.tab;
      render();
      break;

    // Timer mode toggle
    case 'timer-mode':
      state.timerMode = params.mode;
      render();
      break;

    // Timer start
    case 'timer-start':
      state.timerStart   = new Date();
      state.timerElapsed = 0;
      state.timerRunning = true;
      // Persist so the timer survives closing the browser (mobile)
      localStorage.setItem('tt_timer', JSON.stringify({
        start: state.timerStart.toISOString(),
        pid:   document.getElementById('select-project')?.value ?? state.selectedProjectId,
        tid:   document.getElementById('select-task')?.value    ?? state.selectedTaskId,
      }));
      render();
      break;

    // Timer stop — save session
    case 'timer-stop': {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      state.timerRunning  = false;
      localStorage.removeItem('tt_timer');
      const tid = document.getElementById('select-task')?.value;
      const pid = document.getElementById('select-project')?.value ?? state.selectedProjectId;
      const notes = document.getElementById('session-notes')?.value ?? '';
      if (tid && pid) {
        mutate.addSession({
          projectId: pid,
          taskId:    tid,
          start:     state.timerStart.toISOString(),
          end:       new Date().toISOString(),
          notes,
        });
        autoSave();
      }
      state.timerElapsed = 0;
      render();
      break;
    }

    // Manual save
    case 'save-manual': {
      const start = document.getElementById('manual-start')?.value;
      const end   = document.getElementById('manual-end')?.value;
      const tid   = document.getElementById('select-task')?.value;
      const pid   = document.getElementById('select-project')?.value ?? state.selectedProjectId;
      const notes = document.getElementById('session-notes')?.value ?? '';
      if (start && end && tid && pid && new Date(end) > new Date(start)) {
        mutate.addSession({ projectId: pid, taskId: tid, start: toISO(start), end: toISO(end), notes });
        autoSave();
        render();
      }
      break;
    }

    // Project selection change
    case 'select-project': {
      const pid   = params.value ?? document.getElementById('select-project')?.value;
      state.selectedProjectId = pid;
      const tasks = state.tasks.filter(t => t.projectId === pid && t.status === 'active');
      state.selectedTaskId    = tasks[0]?.id ?? null;
      render();
      break;
    }

    // Projects tab — filters
    case 'toggle-show-done':
      state.showDone = !state.showDone;
      render();
      break;
    case 'toggle-show-hidden':
      state.showHidden = !state.showHidden;
      render();
      break;

    // Create project form
    case 'toggle-create-project':
      state.creatingProject = !state.creatingProject;
      render();
      break;

    case 'pick-color':
      state.newProjectColor = params.color;
      render();
      break;

    case 'save-project': {
      const name     = document.getElementById('np-name')?.value?.trim();
      const category = document.getElementById('np-cat')?.value?.trim() ?? '';
      const priority = parseInt(document.getElementById('np-priority')?.value) || 1;
      const estimatedHours = parseFloat(document.getElementById('np-hours')?.value) || 40;
      const hoursPerDay    = parseFloat(document.getElementById('np-hpd')?.value) || 2;
      const startDate  = document.getElementById('np-start')?.value
                      || new Date().toISOString().slice(0, 10);
      const deadline   = document.getElementById('np-deadline')?.value || '';
      if (!name) break;
      mutate.addProject({
        name, category, priority, estimatedHours, hoursPerDay,
        startDate, deadline, color: state.newProjectColor,
        workDays: [1,2,3,4,5],
      });
      // Auto-expand so user can add tasks immediately
      const newP = state.projects[state.projects.length - 1];
      state.expandedProjects.add(newP.id);
      state.creatingProject = false;
      state.newProjectColor = '#F0883E';
      autoSave();
      render();
      break;
    }

    // Create task
    case 'start-create-task':
      state.creatingTaskFor = params.id;
      render();
      break;

    case 'cancel-create-task':
      state.creatingTaskFor = null;
      render();
      break;

    case 'save-task': {
      const name     = document.getElementById('nt-name')?.value?.trim();
      const priority = parseInt(document.getElementById('nt-priority')?.value) || 1;
      if (!name) break;
      mutate.addTask({ projectId: params.id, name, priority });
      state.creatingTaskFor = null;
      autoSave();
      render();
      break;
    }

    // Status toggles
    case 'task-done':
      mutate.setTaskStatus(params.id, 'done');
      autoSave();
      render();
      break;
    case 'task-hide':
      mutate.setTaskStatus(params.id, 'hidden');
      autoSave();
      render();
      break;
    case 'proj-done':
      mutate.setProjectStatus(params.id, 'done');
      autoSave(); render(); break;
    case 'proj-hide':
      mutate.setProjectStatus(params.id, 'hidden');
      autoSave(); render(); break;

    // ── PROJECT EDIT ──────────────────────────────────────────────────────────
    case 'edit-project':
      state.editingProjectId = state.editingProjectId === params.id ? null : params.id;
      state.newProjectColor  = state.projects.find(p => p.id === params.id)?.color ?? '#F0883E';
      render(); break;
    case 'cancel-edit-project':
      state.editingProjectId = null; render(); break;
    case 'save-project-edit':
      mutate.updateProject(params.id, {
        name:           document.getElementById('ep-name')?.value?.trim()      || '',
        category:       document.getElementById('ep-cat')?.value?.trim()       || '',
        priority:       parseInt(document.getElementById('ep-priority')?.value) || 1,
        estimatedHours: parseFloat(document.getElementById('ep-hours')?.value)  || 40,
        hoursPerDay:    parseFloat(document.getElementById('ep-hpd')?.value)    || 2,
        startDate:      document.getElementById('ep-start')?.value             || '',
        deadline:       document.getElementById('ep-deadline')?.value          || '',
        color:          state.newProjectColor,
      });
      state.editingProjectId = null;
      autoSave(); render(); break;
    case 'delete-project':
      state.confirmDeleteProjectId = params.id;
      render();
      break;
    case 'confirm-delete-project':
      mutate.deleteProject(params.id);
      state.confirmDeleteProjectId = null;
      autoSave(); render(); break;
    case 'cancel-delete-project':
      state.confirmDeleteProjectId = null;
      render(); break;

    // ── TASK EDIT ─────────────────────────────────────────────────────────────
    case 'edit-task':
      state.editingTaskId = state.editingTaskId === params.id ? null : params.id;
      render(); break;
    case 'cancel-edit-task':
      state.editingTaskId = null; render(); break;
    case 'save-task-edit': {
      const name     = document.getElementById('et-name-' + params.id)?.value?.trim();
      const priority = parseInt(document.getElementById('et-pri-' + params.id)?.value) || 1;
      if (name) mutate.updateTask(params.id, { name, priority });
      state.editingTaskId = null;
      autoSave(); render(); break;
    }
    case 'delete-task':
      state.confirmDeleteTaskId = params.id;
      render(); break;
    case 'confirm-delete-task':
      mutate.deleteTask(params.id);
      state.confirmDeleteTaskId = null;
      autoSave(); render(); break;
    case 'cancel-delete-task':
      state.confirmDeleteTaskId = null;
      render(); break;

    // ── SESSION EDIT ──────────────────────────────────────────────────────────
    case 'edit-session':
      state.editingSessionId = state.editingSessionId === params.id ? null : params.id;
      render(); break;
    case 'cancel-edit-session':
      state.editingSessionId = null; render(); break;
    case 'save-session-edit': {
      const start = document.getElementById('es-start-' + params.id)?.value;
      const end   = document.getElementById('es-end-'   + params.id)?.value;
      const notes = document.getElementById('es-notes-' + params.id)?.value ?? '';
      if (start && end && new Date(end) > new Date(start)) {
        mutate.updateSession(params.id, { start: toISO(start), end: toISO(end), notes });
      }
      state.editingSessionId = null;
      autoSave(); render(); break;
    }
    case 'delete-session':
      mutate.deleteSession(params.id);
      autoSave(); render(); break;

    // Expand project in projects tab
    case 'toggle-expand':
      mutate.toggleExpanded(params.id);
      render();
      break;

    // Settings
    case 'save-settings': {
      saveConfig({
        token:  document.getElementById('cfg-token')?.value  ?? '',
        owner:  document.getElementById('cfg-owner')?.value  ?? '',
        repo:   document.getElementById('cfg-repo')?.value   ?? '',
        branch: document.getElementById('cfg-branch')?.value ?? 'main',
        path:   document.getElementById('cfg-path')?.value   ?? 'data/timetrack.json',
      });
      showSettingsStatus('✓ Configuración guardada en el navegador', 'ok');
      break;
    }

    case 'test-connection':
      testConnection()
        .then(repo => showSettingsStatus(`✓ Conectado: ${repo.full_name}`, 'ok'))
        .catch(err  => showSettingsStatus(`✗ ${err.message}`, 'err'));
      break;

    case 'sync-now':
      syncData(true);
      break;
  }
}

// ── GITHUB SYNC ───────────────────────────────────────────────────────────────

function setSyncStatus(text, cls = '') {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.textContent = text;
  el.className   = cls;
}

async function autoSave() {
  if (!isConfigured()) return;
  try {
    setSyncStatus('Guardando…', 'saving');
    const result = await saveData(mutate.toJSON(), state._sha);
    state._sha   = result.content.sha;
    setSyncStatus('✓ Guardado', 'saved');
    setTimeout(() => setSyncStatus(''), 3000);
  } catch (err) {
    // SHA conflict (edited from another device) — refetch SHA and retry once
    if (err.message.includes('409') || err.message.includes('422')) {
      try {
        const { sha } = await loadData();
        const result  = await saveData(mutate.toJSON(), sha);
        state._sha    = result.content.sha;
        setSyncStatus('✓ Guardado (conflicto resuelto)', 'saved');
        setTimeout(() => setSyncStatus(''), 3000);
        return;
      } catch (retryErr) {
        console.error('[TimeTrack] Retry failed:', retryErr);
      }
    }
    setSyncStatus('✗ Error al guardar', 'error');
    console.error('[TimeTrack] Save error:', err);
  }
}

async function syncData(forceRender = false) {
  if (!isConfigured()) {
    showSettingsStatus('Completa la configuración primero.', 'err');
    return;
  }
  try {
    setSyncStatus('Sincronizando…', 'saving');
    const { data, sha } = await loadData();
    if (data.projects?.length || data.tasks?.length || data.sessions?.length) {
      mutate.loadFromGitHub(data, sha);
    }
    state._sha = sha;
    setSyncStatus('✓ Sincronizado', 'saved');
    setTimeout(() => setSyncStatus(''), 3000);
    if (forceRender) render();
    else {
      // Only update sync status in DOM, don't rebuild entire page
      const el = document.getElementById('sync-status');
      if (!el) render(); // first load, page not built yet
    }
  } catch (err) {
    setSyncStatus('✗ Error de sincronización', 'error');
    console.error('[TimeTrack] Sync error:', err);
  }
}

function showSettingsStatus(msg, cls) {
  const el = document.getElementById('settings-status');
  if (!el) return;
  el.className   = `status-msg ${cls}`;
  el.textContent = msg;
}

// ── INIT ──────────────────────────────────────────────────────────────────────

/** Restore a running timer that survived a page close (mobile). */
function restoreTimer() {
  try {
    const saved = JSON.parse(localStorage.getItem('tt_timer') ?? 'null');
    if (!saved?.start) return;
    state.timerStart        = new Date(saved.start);
    state.timerElapsed      = Math.floor((Date.now() - state.timerStart.getTime()) / 1000);
    state.timerRunning      = true;
    if (saved.pid) state.selectedProjectId = saved.pid;
    if (saved.tid) state.selectedTaskId    = saved.tid;
  } catch { /* corrupt entry — ignore */ }
}

/** Re-sync when the tab regains focus (e.g. switching between PC and phone). */
function setupFocusSync() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isConfigured() && !state.timerRunning) {
      syncData(true);
    }
  });
}

async function init() {
  restoreTimer();
  render();
  setupFocusSync();
  if (isConfigured()) {
    await syncData(false);
    render(); // one clean render after data loads
  }
}

init();
