import { state, query } from '../state.js';
import { PRIORITY, GANTT_DEFAULT_START, GANTT_DEFAULT_END } from '../config.js';
import { formatHours, formatDate, esc } from '../helpers.js';

export function render() {
  const projects = state.projects
    .filter(p => p.status !== 'hidden')
    .sort((a, b) => a.priority - b.priority);

  // Compute timeline range from actual project dates (skip invalid ones)
  const allDates = projects
    .flatMap(p => [new Date(p.startDate), new Date(p.deadline)])
    .filter(d => !isNaN(d));
  const rangeStart = allDates.length
    ? new Date(Math.min(...allDates))
    : new Date(GANTT_DEFAULT_START);
  const rangeEnd = allDates.length
    ? new Date(Math.max(...allDates))
    : new Date(GANTT_DEFAULT_END);

  const totalMs  = rangeEnd - rangeStart;
  const pos      = d => Math.max(0, Math.min(100, (new Date(d) - rangeStart) / totalMs * 100));
  const barWidth = (s, e) => Math.max(0.4, pos(e) - pos(s));
  const todayPos = pos(new Date());

  // Month tick marks
  const months = [];
  const m = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (m <= rangeEnd) {
    months.push(new Date(m));
    m.setMonth(m.getMonth() + 1);
  }

  const rows = projects.map(p => renderGanttRow(p, pos, barWidth, months, todayPos)).join('');

  const footerDots = projects.map(p => `
    <div class="gantt-footer-item">
      <div class="color-dot" style="background:${p.color}"></div>
      <span>${esc(p.name)}</span>
    </div>`).join('');

  return `
    <div class="page">
      <div class="card">
        <div class="section-label" style="margin-bottom:12px">Gantt — Real vs Planificado</div>

        <div class="gantt-legend">
          <div class="gantt-legend-item">
            <div style="width:20px;height:8px;border-radius:3px;background:var(--surface2);border:1px solid var(--border)"></div>
            <span>Planificado</span>
          </div>
          <div class="gantt-legend-item">
            <div style="width:12px;height:8px;border-radius:2px;background:var(--text-d)"></div>
            <span>Real (sesiones)</span>
          </div>
          <div class="gantt-legend-item">
            <div style="width:0;height:12px;border-left:1.5px dashed var(--accent);margin:0 4px"></div>
            <span>Hoy</span>
          </div>
        </div>

        <div class="gantt-axis">
          ${months.map(mo => `
            <div class="gantt-axis-label" style="left:${pos(mo)}%">
              ${mo.toLocaleDateString('es-ES', { month: 'short' })} '${String(mo.getFullYear()).slice(2)}
            </div>`).join('')}
        </div>

        ${rows}

        <div class="gantt-footer">${footerDots}</div>
      </div>
    </div>`;
}

function renderGanttRow(p, pos, barWidth, months, todayPos) {
  const sessions  = query.projectSessions(p.id);
  const priColor  = PRIORITY.colors[p.priority];

  const gridLines = months.map(mo => `
    <div class="gantt-grid-line" style="left:${pos(mo)}%"></div>`).join('');

  const hasValidDates = p.startDate && p.deadline
    && !isNaN(new Date(p.startDate)) && !isNaN(new Date(p.deadline));

  const plannedBar = hasValidDates ? `
    <div class="gantt-bar-planned"
         style="left:${pos(p.startDate)}%;
                width:${barWidth(p.startDate, p.deadline)}%;
                background:${p.color}18;
                border:1px solid ${p.color}3A">
    </div>` : '';

  const sessionBars = sessions.map(s => {
    const task = state.tasks.find(t => t.id === s.taskId);
    return `
      <div class="gantt-bar-session"
           title="${esc(task?.name ?? '')} — ${formatHours((new Date(s.end) - new Date(s.start)) / 3_600_000)}"
           style="left:${pos(s.start)}%;
                  width:${Math.max(0.8, barWidth(s.start, s.end))}%;
                  background:${p.color}">
      </div>`;
  }).join('');

  const todayLine = `
    <div class="gantt-today" style="left:${todayPos}%"></div>`;

  return `
    <div class="gantt-row">
      <div class="gantt-label">
        <div class="gantt-label-name" style="color:${p.color}">
          <span class="pri-badge"
                style="background:${priColor}22;color:${priColor};border-color:${priColor}44;margin-right:4px">
            P${p.priority}
          </span>${esc(p.name)}
        </div>
        <div class="gantt-label-meta">${p.estimatedHours}h · ${formatDate(p.deadline)}</div>
      </div>
      <div class="gantt-bars">
        ${gridLines}
        ${plannedBar}
        ${sessionBars}
        ${todayLine}
      </div>
    </div>`;
}
