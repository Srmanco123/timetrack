import { state, query } from '../state.js';
import { PRIORITY } from '../config.js';
import { formatHours, formatTimer, formatDate, getHours, esc, toLocalInput } from '../helpers.js';

export function render() {
  return `
    <div class="page grid-2">
      ${renderTimerCard()}
      ${renderRecentCard()}
    </div>`;
}

// ── LEFT: TIMER / MANUAL ──────────────────────────────────────────────────────
function renderTimerCard() {
  const { timerMode, timerRunning, timerElapsed, selectedProjectId, selectedTaskId } = state;

  const activeTasks = state.tasks
    .filter(t => t.projectId === selectedProjectId && t.status === 'active')
    .sort((a, b) => a.priority - b.priority);

  const modeToggle = `
    <div class="toggle-row">
      <button class="toggle-btn ${timerMode === 'timer'  ? 'active' : ''}"
              data-action="timer-mode" data-params='{"mode":"timer"}'>Timer</button>
      <button class="toggle-btn ${timerMode === 'manual' ? 'active' : ''}"
              data-action="timer-mode" data-params='{"mode":"manual"}'>Manual</button>
    </div>`;

  const timerBlock = timerMode === 'timer' ? `
    <div class="timer-center">
      <div class="timer-display ${timerRunning ? 'running' : ''}" id="timer-display">
        ${formatTimer(timerElapsed)}
      </div>
      ${timerRunning
        ? `<button class="btn-stop" data-action="timer-stop">■&nbsp; Parar y guardar</button>`
        : `<button class="btn-primary" data-action="timer-start">▶&nbsp; Iniciar</button>`
      }
    </div>` : `
    <div class="manual-block">
      <div class="grid-2">
        <div class="field">
          <label class="field-label">Inicio</label>
          <input class="field-input" type="datetime-local" id="manual-start"/>
        </div>
        <div class="field">
          <label class="field-label">Fin</label>
          <input class="field-input" type="datetime-local" id="manual-end"/>
        </div>
      </div>
      <button class="btn-primary full-width" data-action="save-manual">Guardar sesión</button>
    </div>`;

  const projOptions = state.projects
    .filter(p => p.status !== 'hidden')
    .sort((a, b) => a.priority - b.priority)
    .map(p => `<option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>
      P${p.priority} · ${esc(p.name)}
    </option>`)
    .join('');

  const taskOptions = activeTasks.length
    ? activeTasks.map(t => `<option value="${t.id}" ${t.id === selectedTaskId ? 'selected' : ''}>
        P${t.priority} · ${esc(t.name)}
      </option>`).join('')
    : `<option value="">— Sin tareas activas —</option>`;

  return `
    <div class="card">
      ${modeToggle}
      ${timerBlock}
      <div class="field-group" style="margin-top:14px">
        <div class="field">
          <label class="field-label">Proyecto</label>
          <select class="field-input" id="select-project" data-action="select-project">
            ${projOptions}
          </select>
        </div>
        <div class="field">
          <label class="field-label">Tarea</label>
          <select class="field-input" id="select-task" data-action="select-task">
            ${taskOptions}
          </select>
          ${!activeTasks.length ? `<span style="font-size:10px;color:var(--warning);margin-top:4px">
            ${state.projects.length
              ? 'Este proyecto no tiene tareas activas — créala en la pestaña Proyectos'
              : 'Crea primero un proyecto en la pestaña Proyectos'}
          </span>` : ''}
        </div>
        <div class="field">
          <label class="field-label">Notas</label>
          <input class="field-input" id="session-notes" placeholder="Opcional…"/>
        </div>
      </div>
    </div>`;
}

// ── RIGHT: RECENT SESSIONS ────────────────────────────────────────────────────
function renderRecentCard() {
  const recent = [...state.sessions].reverse().slice(0, 8);

  const rows = recent.length
    ? recent.map(s => {
        const proj  = query.project(s.projectId);
        const task  = query.task(s.taskId);
        const color = proj?.color ?? '#484F58';

        if (state.editingSessionId === s.id) {
          return `
            <div class="session-row" style="flex-wrap:wrap;gap:6px;padding:8px 0">
              <div class="color-bar" style="background:${color}"></div>
              <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:5px">
                <div class="grid-2" style="gap:6px">
                  <div>
                    <label class="field-label">Inicio</label>
                    <input class="field-input" type="datetime-local" id="es-start-${s.id}"
                           value="${toLocalInput(s.start)}"/>
                  </div>
                  <div>
                    <label class="field-label">Fin</label>
                    <input class="field-input" type="datetime-local" id="es-end-${s.id}"
                           value="${toLocalInput(s.end)}"/>
                  </div>
                </div>
                <input class="field-input" id="es-notes-${s.id}"
                       placeholder="Notas…" value="${esc(s.notes ?? '')}"/>
                <div style="display:flex;gap:6px">
                  <button class="btn-primary" style="font-size:10px;padding:5px 10px"
                          data-action="save-session-edit" data-params='{"id":"${s.id}"}'>Guardar</button>
                  <button class="btn-secondary" style="font-size:10px;padding:5px 8px"
                          data-action="cancel-edit-session">✕</button>
                </div>
              </div>
            </div>`;
        }

        return `
          <div class="session-row">
            <div class="color-bar" style="background:${color}"></div>
            <div class="session-info">
              <span class="session-task">${esc(task?.name ?? '—')}</span>
              <span class="session-meta">${esc(proj?.name ?? '')} · ${formatDate(s.start)}</span>
            </div>
            <span class="session-duration" style="color:${color}">
              ${formatHours(getHours(s.start, s.end))}
            </span>
            <button class="btn-secondary" style="font-size:9px;padding:3px 7px;flex-shrink:0"
                    data-action="edit-session" data-params='{"id":"${s.id}"}'>✏</button>
            <button class="btn-secondary" style="font-size:9px;padding:3px 7px;flex-shrink:0;color:var(--danger);border-color:var(--danger)"
                    data-action="delete-session" data-params='{"id":"${s.id}"}'>🗑</button>
          </div>`;
      }).join('')
    : `<div class="empty-state">Sin sesiones registradas</div>`;

  return `
    <div class="card">
      <div class="section-label">Sesiones recientes</div>
      ${rows}
    </div>`;
}
