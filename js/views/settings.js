import { getConfig } from '../github.js';
import { esc } from '../helpers.js';

export function render() {
  const cfg = getConfig();

  return `
    <div class="page">
      <div class="settings-wrap">

        <div class="card">
          <div class="section-label" style="margin-bottom:12px">Configuración GitHub</div>

          <div class="field" style="margin-bottom:9px">
            <label class="field-label">Personal Access Token</label>
            <input class="field-input" type="password" id="cfg-token"
                   value="${esc(cfg.token)}" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"/>
          </div>
          <div class="grid-2" style="gap:8px;margin-bottom:9px">
            <div class="field">
              <label class="field-label">Usuario / Organización</label>
              <input class="field-input" type="text" id="cfg-owner"
                     value="${esc(cfg.owner)}" placeholder="tu-usuario"/>
            </div>
            <div class="field">
              <label class="field-label">Repositorio</label>
              <input class="field-input" type="text" id="cfg-repo"
                     value="${esc(cfg.repo)}" placeholder="time-tracker"/>
            </div>
          </div>
          <div class="grid-2" style="gap:8px;margin-bottom:12px">
            <div class="field">
              <label class="field-label">Rama</label>
              <input class="field-input" type="text" id="cfg-branch"
                     value="${esc(cfg.branch)}" placeholder="main"/>
            </div>
            <div class="field">
              <label class="field-label">Ruta del archivo JSON</label>
              <input class="field-input" type="text" id="cfg-path"
                     value="${esc(cfg.path)}" placeholder="data/timetrack.json"/>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-primary"    data-action="save-settings">Guardar</button>
            <button class="btn-secondary"  data-action="test-connection">Probar conexión</button>
            <button class="btn-secondary"  data-action="sync-now">↺ Sincronizar ahora</button>
          </div>
          <div id="settings-status"></div>
        </div>

        <div class="card">
          <div class="section-label" style="margin-bottom:8px">Permisos necesarios del token</div>
          <ul style="font-size:11px;color:var(--text-m);line-height:2;padding-left:16px">
            <li>Scope: <code style="background:var(--surface2);padding:1px 5px;border-radius:3px">repo</code>
                (acceso completo al repositorio privado)</li>
            <li>O scope: <code style="background:var(--surface2);padding:1px 5px;border-radius:3px">public_repo</code>
                si el repo es público</li>
            <li>Genera el token en: GitHub → Settings → Developer settings → Personal access tokens</li>
          </ul>
        </div>

        <div class="card">
          <div class="section-label" style="margin-bottom:8px">Estructura del archivo JSON</div>
          <pre class="json-preview">{
  "projects": [
    {
      "id": "uuid",
      "name": "DILREC",
      "category": "IA/Mining",
      "color": "#F0883E",
      "priority": 1,
      "estimatedHours": 120,
      "hoursPerDay": 3,
      "workDays": [1,2,3,4,5],
      "startDate": "2026-04-01",
      "deadline": "2026-06-30",
      "status": "active"
    }
  ],
  "tasks": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "name": "Chamber reconciliation",
      "priority": 1,
      "status": "active"
    }
  ],
  "sessions": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "taskId": "uuid",
      "start": "2026-05-12T09:00:00.000Z",
      "end":   "2026-05-12T12:30:00.000Z",
      "notes": ""
    }
  ]
}</pre>
        </div>

      </div>
    </div>`;
}
