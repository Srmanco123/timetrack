import { state, query } from '../state.js';
import { PRIORITY } from '../config.js';
import { formatHours, formatDate, daysUntil, daysSince, esc } from '../helpers.js';

export function render() {
  const now       = new Date();
  const allSess   = state.sessions;
  const totalH    = allSess.reduce((a, s) => a + sessionHours(s), 0);
  const weekH     = allSess.filter(s => new Date(s.start) > new Date(now - 7 * 86_400_000))
                           .reduce((a, s) => a + sessionHours(s), 0);
  const monthH    = allSess.filter(s => new Date(s.start) > new Date(now - 30 * 86_400_000))
                           .reduce((a, s) => a + sessionHours(s), 0);
  const active    = state.projects.filter(p => p.status === 'active');
  const totalEst  = active.reduce((a, p) => a + p.estimatedHours, 0);
  const compl     = totalEst ? Math.round(totalH / totalEst * 100) : 0;
  const avgSess   = allSess.length ? totalH / allSess.length : 0;
  const doneTasks = state.tasks.filter(t => t.status === 'done').length;

  const kpis = [
    { label: 'Total horas',    value: formatHours(totalH),  sub: 'acumulado' },
    { label: 'Esta semana',    value: formatHours(weekH),   sub: 'últimos 7 días' },
    { label: 'Este mes',       value: formatHours(monthH),  sub: 'últimos 30 días' },
    { label: 'Completado',     value: `${compl}%`,          sub: `${formatHours(totalH)} / ${formatHours(totalEst)}` },
    { label: 'Proyectos activos', value: active.length,     sub: 'en seguimiento' },
    { label: 'Tareas completadas', value: doneTasks,        sub: `media ${formatHours(avgSess)}/sesión` },
  ];

  const stats = active
    .sort((a, b) => a.priority - b.priority)
    .map(p => renderProjectStat(p));

  return `
    <div class="page">
      <div class="grid-6" style="margin-bottom:10px">
        ${kpis.map(k => `
          <div class="kpi-card">
            <div class="kpi-label">${k.label}</div>
            <div class="kpi-value">${k.value}</div>
            <div class="kpi-sub">${k.sub}</div>
          </div>`).join('')}
      </div>
      ${stats.join('')}
    </div>`;
}

function renderProjectStat(p) {
  const workedH  = query.projectHours(p.id);
  const pct      = Math.min(100, Math.round(workedH / p.estimatedHours * 100));
  const remH     = Math.max(0, p.estimatedHours - workedH);
  const dLeft    = daysUntil(p.deadline);
  const elapsed  = daysSince(p.startDate);
  const velocity = workedH / elapsed;
  const etf      = velocity > 0 ? Math.ceil(remH / velocity) : null;
  const sessCount = query.projectSessions(p.id).length;
  const tasksDone = state.tasks.filter(t => t.projectId === p.id && t.status === 'done').length;
  const tasksAll  = state.tasks.filter(t => t.projectId === p.id).length;
  const priColor  = PRIORITY.colors[p.priority];

  return `
    <div class="card" style="margin-bottom:8px">
      <div class="stat-row">
        <div class="project-left-bar" style="background:${p.color};height:56px"></div>
        <div class="stat-details">
          <div class="stat-tags">
            <span class="pri-badge"
                  style="background:${priColor}22;color:${priColor};border-color:${priColor}44">
              P${p.priority}
            </span>
            <span class="stat-name">${esc(p.name)}</span>
            <span class="project-cat">${esc(p.category)}</span>
            <span class="stat-meta">${sessCount} ses. · ${tasksDone}/${tasksAll} tareas ✓ · ${formatHours(velocity)}/día</span>
          </div>
          <div class="progress-bar-track" style="margin-bottom:4px">
            <div class="progress-bar-fill" style="width:${pct}%;background:${p.color}"></div>
          </div>
          <div class="stat-meta">
            ${formatHours(workedH)} trabajadas · ${pct}% completado · restante: ${formatHours(remH)}
            ${etf != null ? ` · ~${etf}d para terminar` : ''}
          </div>
        </div>
        <div class="stat-right">
          <div class="stat-rem" style="color:${p.color}">${formatHours(remH)}</div>
          <div style="font-size:10px;color:var(--text-m)">restantes</div>
          <div class="stat-deadline ${dLeft != null && dLeft < 14 ? 'deadline-near' : ''}">
            ${formatDate(p.deadline)}
          </div>
          <div style="font-size:9px;color:var(--text-d)">${dLeft != null ? `${dLeft}d restantes` : 'sin deadline'}</div>
        </div>
      </div>
    </div>`;
}

function sessionHours(s) {
  return (new Date(s.end) - new Date(s.start)) / 3_600_000;
}
