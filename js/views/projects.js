import { state, query } from '../state.js';
import { PRIORITY, PROJECT_PALETTE } from '../config.js';
import { formatHours, formatDate, daysUntil, esc } from '../helpers.js';

export function render() {
  const visibleProjects = state.projects
    .filter(p => {
      if (p.status === 'hidden' && !state.showHidden) return false;
      if (p.status === 'done'   && !state.showDone)   return false;
      return true;
    })
    .sort((a, b) => a.priority - b.priority);

  return `
    <div class="page">
      ${renderFilterBar()}
      ${state.creatingProject ? renderCreateProjectForm() : ''}
      ${visibleProjects.map(renderProjectCard).join('')}
      ${visibleProjects.length === 0
        ? `<div class="empty-state" style="padding:40px 0">
             No hay proyectos visibles.
             ${!state.showDone && !state.showHidden
               ? 'Activa los filtros o crea uno nuevo.' : ''}
           </div>`
        : ''}
    </div>`;
}

// ── FILTER BAR ────────────────────────────────────────────────────────────────
function renderFilterBar() {
  return `
    <div class="filter-bar">
      <button class="${state.showDone   ? 'btn-primary' : 'btn-secondary'}"
              data-action="toggle-show-done" style="font-size:10px;padding:6px 11px">
        ✓ Ver concluidas
      </button>
      <button class="${state.showHidden ? 'btn-primary' : 'btn-secondary'}"
              data-action="toggle-show-hidden" style="font-size:10px;padding:6px 11px">
        ◎ Ver ocultas
      </button>
      <div class="spacer"></div>
      <button class="btn-primary" data-action="toggle-create-project">
        + Nuevo proyecto
      </button>
    </div>`;
}

// ── CREATE PROJECT FORM ───────────────────────────────────────────────────────
function renderCreateProjectForm() {
  const priOptions = [1,2,3,4,5].map(n => `
    <option value="${n}">P${n} — ${PRIORITY.labels[n]}</option>`).join('');

  const paletteFixed = PROJECT_PALETTE.map(c => {
    const sel = state.newProjectColor === c ? 'selected' : '';
    return '<div class="color-swatch ' + sel + '" style="background:' + c + '" data-action="pick-color" data-color="' + c + '"></div>';
  }).join('');

  return `
    <div class="card create-project-card">
      <div class="card-title">Nuevo proyecto</div>
      <div class="grid-2" style="gap:8px;margin-bottom:8px">
        <div class="field">
          <label class="field-label">Nombre</label>
          <input class="field-input" id="np-name" placeholder="Nombre del proyecto"/>
        </div>
        <div class="field">
          <label class="field-label">Categoría</label>
          <input class="field-input" id="np-cat" placeholder="Dev, Planning, Mining…"/>
        </div>
      </div>
      <div class="grid-3" style="gap:8px;margin-bottom:8px">
        <div class="field">
          <label class="field-label">Prioridad</label>
          <select class="field-input" id="np-priority">${priOptions}</select>
        </div>
        <div class="field">
          <label class="field-label">Horas estimadas</label>
          <input class="field-input" id="np-hours" type="number" min="1" placeholder="120"/>
        </div>
        <div class="field">
          <label class="field-label">Horas / día</label>
          <input class="field-input" id="np-hpd" type="number" min="1" placeholder="3"/>
        </div>
      </div>
      <div class="grid-2" style="gap:8px;margin-bottom:10px">
        <div class="field">
          <label class="field-label">Fecha inicio</label>
          <input class="field-input" type="date" id="np-start"/>
        </div>
        <div class="field">
          <label class="field-label">Deadline</label>
          <input class="field-input" type="date" id="np-deadline"/>
        </div>
      </div>
      <div class="field">
        <label class="field-label">Color del proyecto</label>
        <div class="color-picker">${paletteFixed}</div>
      </div>
      <div class="form-actions">
        <button class="btn-primary" data-action="save-project">Guardar proyecto</button>
        <button class="btn-secondary" data-action="toggle-create-project">Cancelar</button>
      </div>
    </div>`;
}

// ── PROJECT CARD ──────────────────────────────────────────────────────────────
function renderProjectCard(p) {
  const workedH  = query.projectHours(p.id);
  const pct      = Math.min(100, Math.round(workedH / p.estimatedHours * 100));
  const dLeft    = daysUntil(p.deadline);
  const isExpanded = state.expandedProjects.has(p.id);
  const priColor = PRIORITY.colors[p.priority];
  const opacity  = p.status === 'hidden' ? '0.45' : p.status === 'done' ? '0.65' : '1';
  const isEditing = state.editingProjectId === p.id;

  const header = isEditing ? renderProjectEditForm(p) : renderProjectHeader(p, workedH, pct, dLeft, priColor, isExpanded);

  return `
    <div class="card" style="opacity:${opacity}">
      ${header}
      ${isExpanded && !isEditing ? renderTaskList(p) : ''}
    </div>`;
}

function renderProjectHeader(p, workedH, pct, dLeft, priColor, isExpanded) {
  const statusBadge = p.status === 'done'
    ? `<span class="project-status-badge badge-done">✓ Concluido</span>`
    : p.status === 'hidden'
    ? `<span class="project-status-badge badge-hidden">◎ Oculto</span>`
    : '';

  return `
    <div class="project-header" style="cursor:default">
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;cursor:pointer"
           data-action="toggle-expand" data-params='{"id":"${p.id}"}'>
        <div class="project-left-bar" style="background:${p.color}"></div>
        <div class="project-meta">
          <div class="project-name-row">
            <span class="pri-badge"
                  style="background:${priColor}22;color:${priColor};border-color:${priColor}44">
              P${p.priority}
            </span>
            <span class="project-name">${esc(p.name)}</span>
            <span class="project-cat">${esc(p.category)}</span>
            ${statusBadge}
          </div>
          <div class="project-progress-row">
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width:${pct}%;background:${p.color}"></div>
            </div>
            <span class="project-hours-label">
              ${formatHours(workedH)} / ${formatHours(p.estimatedHours)}${dLeft != null ? ` · ${dLeft}d` : ""}
            </span>
          </div>
        </div>
        <span class="expand-arrow">${isExpanded ? '▲' : '▼'}</span>
      </div>
      <div class="project-actions">
        <button class="btn-secondary" style="font-size:10px;padding:4px 9px"
                data-action="edit-project" data-params='{"id":"${p.id}"}'>✏ Editar</button>
        <button class="btn-done ${p.status === 'done' ? 'is-done' : ''}"
                data-action="proj-done" data-params='{"id":"${p.id}"}'>
          ${p.status === 'done' ? '✓ Concluido' : 'Concluir'}
        </button>
        <button class="btn-hide ${p.status === 'hidden' ? 'is-hidden' : ''}"
                data-action="proj-hide" data-params='{"id":"${p.id}"}'>
          ${p.status === 'hidden' ? '◎ Oculto' : 'Ocultar'}
        </button>
        <button class="btn-secondary" style="font-size:10px;padding:4px 9px;color:var(--danger);border-color:var(--danger)"
                data-action="delete-project" data-params='{"id":"${p.id}"}'>🗑</button>
      </div>
    </div>
    ${state.confirmDeleteProjectId === p.id ? `
      <div style="background:rgba(255,59,48,0.08);border:1px solid rgba(255,59,48,0.3);border-radius:8px;padding:10px 12px;margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="flex:1;font-size:11px;color:var(--danger);min-width:160px">¿Borrar <strong>${esc(p.name)}</strong> y todas sus tareas y sesiones? No se puede deshacer.</span>
        <button class="btn-stop" style="font-size:10px;padding:5px 12px"
                data-action="confirm-delete-project" data-params='{"id":"${p.id}"}'>Sí, borrar</button>
        <button class="btn-secondary" style="font-size:10px;padding:5px 10px"
                data-action="cancel-delete-project">Cancelar</button>
      </div>` : ''}
  `;
}

function renderProjectEditForm(p) {
  const priOptions = [1,2,3,4,5].map(n =>
    '<option value="' + n + '"' + (p.priority === n ? ' selected' : '') + '>P' + n + ' — ' + PRIORITY.labels[n] + '</option>'
  ).join('');

  const palette = PROJECT_PALETTE.map(c => {
    const current = state.newProjectColor || p.color;
    const sel = current === c ? 'selected' : '';
    return '<div class="color-swatch ' + sel + '" style="background:' + c + '" data-action="pick-color" data-color="' + c + '"></div>';
  }).join('');

  return `
    <div style="border-left:3px solid var(--accent);padding-left:12px">
      <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:10px">Editar proyecto</div>
      <div class="grid-2" style="gap:8px;margin-bottom:8px">
        <div class="field">
          <label class="field-label">Nombre</label>
          <input class="field-input" id="ep-name" value="${esc(p.name)}"/>
        </div>
        <div class="field">
          <label class="field-label">Categoría</label>
          <input class="field-input" id="ep-cat" value="${esc(p.category)}"/>
        </div>
      </div>
      <div class="grid-3" style="gap:8px;margin-bottom:8px">
        <div class="field">
          <label class="field-label">Prioridad</label>
          <select class="field-input" id="ep-priority">${priOptions}</select>
        </div>
        <div class="field">
          <label class="field-label">Horas estimadas</label>
          <input class="field-input" id="ep-hours" type="number" value="${p.estimatedHours}"/>
        </div>
        <div class="field">
          <label class="field-label">H/día</label>
          <input class="field-input" id="ep-hpd" type="number" value="${p.hoursPerDay}"/>
        </div>
      </div>
      <div class="grid-2" style="gap:8px;margin-bottom:8px">
        <div class="field">
          <label class="field-label">Fecha inicio</label>
          <input class="field-input" type="date" id="ep-start" value="${p.startDate}"/>
        </div>
        <div class="field">
          <label class="field-label">Deadline</label>
          <input class="field-input" type="date" id="ep-deadline" value="${p.deadline}"/>
        </div>
      </div>
      <div class="field" style="margin-bottom:10px">
        <label class="field-label">Color</label>
        <div class="color-picker">${palette}</div>
      </div>
      <div class="form-actions">
        <button class="btn-primary" data-action="save-project-edit" data-params='{"id":"${p.id}"}'>Guardar cambios</button>
        <button class="btn-secondary" data-action="cancel-edit-project">Cancelar</button>
      </div>
    </div>`;
}

// ── TASK LIST ─────────────────────────────────────────────────────────────────
function renderTaskList(p) {
  const tasks = query.projectTasks(p.id, {
    includeDone:   state.showDone,
    includeHidden: state.showHidden,
  });

  const rows = tasks.map(t => {
    const th  = query.taskHours(t.id);
    const sc  = query.taskSessions(t.id).length;
    const pc  = PRIORITY.colors[t.priority];
    const isDone   = t.status === 'done';
    const isHidden = t.status === 'hidden';

    // ── EDIT MODE ──
    if (state.editingTaskId === t.id) {
      const priOpts = [1,2,3,4,5].map(n =>
        '<option value="' + n + '"' + (t.priority === n ? ' selected' : '') + '>P' + n + ' · ' + PRIORITY.labels[n] + '</option>'
      ).join('');
      return `
        <div class="task-row" style="padding:8px 0 8px 10px;flex-wrap:wrap;gap:6px">
          <select class="field-input" id="et-pri-${t.id}" style="width:90px;flex-shrink:0">${priOpts}</select>
          <input class="field-input" id="et-name-${t.id}" value="${esc(t.name)}" style="flex:1;min-width:120px"/>
          <button class="btn-primary" data-action="save-task-edit" data-params='{"id":"${t.id}"}'>Guardar</button>
          <button class="btn-secondary" data-action="cancel-edit-task" style="padding:6px 8px">✕</button>
        </div>`;
    }

    return `
      <div class="task-row" style="opacity:${isHidden ? 0.45 : 1}">
        <span class="pri-badge"
              style="background:${pc}22;color:${pc};border-color:${pc}44">
          P${t.priority}
        </span>
        <span class="task-name ${isDone ? 'done' : ''}">${esc(t.name)}</span>
        <span class="task-stats">${formatHours(th)} · ${sc} ses.</span>
        <button class="btn-secondary" style="font-size:9px;padding:3px 7px"
                data-action="edit-task" data-params='{"id":"${t.id}"}'>✏</button>
        <button class="btn-done ${isDone ? 'is-done' : ''}"
                data-action="task-done" data-params='{"id":"${t.id}"}'>
          ${isDone ? '✓' : 'Concluir'}
        </button>
        <button class="btn-hide ${isHidden ? 'is-hidden' : ''}"
                data-action="task-hide" data-params='{"id":"${t.id}"}'>
          ${isHidden ? '◎' : 'Ocultar'}
        </button>
        <button class="btn-secondary" style="font-size:9px;padding:3px 7px;color:var(--danger);border-color:var(--danger)"
                data-action="delete-task" data-params='{"id":"${t.id}"}'>🗑</button>
      </div>
      ${state.confirmDeleteTaskId === t.id ? `
        <div style="background:rgba(255,59,48,0.08);border:1px solid rgba(255,59,48,0.3);border-radius:6px;padding:8px 10px;margin:2px 0 4px 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="flex:1;font-size:11px;color:var(--danger);min-width:140px">¿Borrar tarea y sus sesiones?</span>
          <button class="btn-stop" style="font-size:10px;padding:4px 10px"
                  data-action="confirm-delete-task" data-params='{"id":"${t.id}"}'>Sí, borrar</button>
          <button class="btn-secondary" style="font-size:10px;padding:4px 8px"
                  data-action="cancel-delete-task">Cancelar</button>
        </div>` : ''}`;
  }).join('');

  const createRow = state.creatingTaskFor === p.id
    ? `<div class="new-task-row">
         <select class="field-input" id="nt-priority" style="width:90px;flex-shrink:0">
           ${[1,2,3,4,5].map(n => `<option value="${n}">P${n} · ${PRIORITY.labels[n]}</option>`).join('')}
         </select>
         <input class="field-input" id="nt-name" placeholder="Nombre de la tarea…" style="flex:1"/>
         <button class="btn-primary" data-action="save-task" data-params='{"id":"${p.id}"}'>
           Añadir
         </button>
         <button class="btn-secondary" data-action="cancel-create-task" style="padding:6px 8px">✕</button>
       </div>`
    : `<button class="add-task-btn"
              data-action="start-create-task" data-params='{"id":"${p.id}"}'>
         + Nueva tarea
       </button>`;

  return `
    <div class="task-list">
      ${rows}
      ${createRow}
    </div>`;
}
