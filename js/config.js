// ── TABS ─────────────────────────────────────────────────────────────────────
export const TABS = [
  { id: 'register',  label: 'Registro',  icon: '⏱' },
  { id: 'projects',  label: 'Proyectos', icon: '▤' },
  { id: 'dashboard', label: 'Dashboard', icon: '◫' },
  { id: 'gantt',     label: 'Gantt',     icon: '▦' },
  { id: 'settings',  label: 'Config',    icon: '⚙' },
];

// ── PRIORITY ──────────────────────────────────────────────────────────────────
export const PRIORITY = {
  colors: {
    1: '#FF7B72',   // Crítica  — red
    2: '#F0883E',   // Alta     — orange
    3: '#D29922',   // Media    — yellow
    4: '#3FB950',   // Baja     — green
    5: '#8B949E',   // Mínima   — gray
  },
  labels: {
    1: 'Crítica',
    2: 'Alta',
    3: 'Media',
    4: 'Baja',
    5: 'Mínima',
  },
};

// ── PROJECT PALETTE ───────────────────────────────────────────────────────────
export const PROJECT_PALETTE = [
  '#F0883E', '#A371F7', '#3FB950', '#FF7B72',
  '#58A6FF', '#FFA657', '#79C0FF', '#56D364',
  '#F78166', '#D2A8FF',
];

// ── GANTT RANGE ───────────────────────────────────────────────────────────────
// Auto-computed in gantt.js from project dates; defaults below are fallbacks.
export const GANTT_DEFAULT_START = '2026-04-01';
export const GANTT_DEFAULT_END   = '2026-12-31';

// ── STORAGE KEYS ─────────────────────────────────────────────────────────────
export const STORAGE = {
  TOKEN:  'tt_token',
  OWNER:  'tt_owner',
  REPO:   'tt_repo',
  BRANCH: 'tt_branch',
  PATH:   'tt_path',
};
