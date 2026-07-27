import { uid } from './helpers.js';

// ── STATE ─────────────────────────────────────────────────────────────────────
export const state = {
  // Data (synced with GitHub)
  projects: [],
  tasks:    [],
  sessions: [],
  _sha: null,   // GitHub file SHA for updates

  // Navigation
  tab: 'register',

  // UI
  expandedProjects: new Set(),
  showDone:   false,
  showHidden: false,
  creatingProject:  false,
  creatingTaskFor:  null,   // projectId | null
  editingTaskId:    null,
  editingProjectId: null,
  editingSessionId: null,
  confirmDeleteProjectId: null,
  confirmDeleteTaskId:    null,
  newProjectColor: '#F0883E',

  // Timer
  timerMode:    'timer',  // 'timer' | 'manual'
  timerRunning: false,
  timerElapsed: 0,        // seconds
  timerStart:   null,     // Date
  timerInterval: null,

  // Selections (register tab)
  selectedProjectId: null,
  selectedTaskId:    null,
};

// ── QUERIES ───────────────────────────────────────────────────────────────────
export const query = {
  project: id => state.projects.find(p => p.id === id),
  task:    id => state.tasks.find(t => t.id === id),

  projectTasks(projectId, { includeDone = false, includeHidden = false } = {}) {
    return state.tasks
      .filter(t => {
        if (t.projectId !== projectId) return false;
        if (t.status === 'done'   && !includeDone)   return false;
        if (t.status === 'hidden' && !includeHidden) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  },

  taskSessions:   taskId    => state.sessions.filter(s => s.taskId    === taskId),
  projectSessions:projectId => state.sessions.filter(s => s.projectId === projectId),

  projectHours: projectId =>
    state.sessions
      .filter(s => s.projectId === projectId)
      .reduce((acc, s) => acc + (new Date(s.end) - new Date(s.start)) / 3_600_000, 0),

  taskHours: taskId =>
    state.sessions
      .filter(s => s.taskId === taskId)
      .reduce((acc, s) => acc + (new Date(s.end) - new Date(s.start)) / 3_600_000, 0),
};

// ── MUTATIONS ─────────────────────────────────────────────────────────────────
export const mutate = {
  addSession({ projectId, taskId, start, end, notes = '' }) {
    state.sessions.push({ id: uid(), projectId, taskId, start, end, notes });
  },

  addProject(data) {
    state.projects.push({ id: uid(), ...data, status: 'active' });
  },

  addTask(data) {
    state.tasks.push({ id: uid(), ...data, status: 'active' });
  },

  setProjectStatus(id, status) {
    const p = state.projects.find(p => p.id === id);
    if (p) p.status = p.status === status ? 'active' : status;
  },

  setTaskStatus(id, status) {
    const t = state.tasks.find(t => t.id === id);
    if (t) t.status = t.status === status ? 'active' : status;
  },

  updateTask(id, data) {
    const t = state.tasks.find(t => t.id === id);
    if (t) Object.assign(t, data);
  },

  deleteTask(id) {
    state.tasks    = state.tasks.filter(t => t.id !== id);
    state.sessions = state.sessions.filter(s => s.taskId !== id);
  },

  updateProject(id, data) {
    const p = state.projects.find(p => p.id === id);
    if (p) Object.assign(p, data);
  },

  deleteProject(id) {
    state.projects = state.projects.filter(p => p.id !== id);
    state.tasks    = state.tasks.filter(t => t.projectId !== id);
    state.sessions = state.sessions.filter(s => s.projectId !== id);
  },

  updateSession(id, data) {
    const s = state.sessions.find(s => s.id === id);
    if (s) Object.assign(s, data);
  },

  deleteSession(id) {
    state.sessions = state.sessions.filter(s => s.id !== id);
  },

  toggleExpanded(id) {
    if (state.expandedProjects.has(id)) state.expandedProjects.delete(id);
    else state.expandedProjects.add(id);
  },

  /** Load data from GitHub (replaces demo data). */
  loadFromGitHub({ projects, tasks, sessions }, sha) {
    state.projects = projects;
    state.tasks    = tasks;
    state.sessions = sessions;
    state._sha     = sha;
    if (state.projects.length > 0) {
      state.selectedProjectId = state.projects[0].id;
      const firstActive = state.tasks.find(
        t => t.projectId === state.selectedProjectId && t.status === 'active'
      );
      state.selectedTaskId = firstActive?.id ?? null;
    }
  },

  /** Serialize data for GitHub save. */
  toJSON() {
    return {
      projects: state.projects,
      tasks:    state.tasks,
      sessions: state.sessions,
    };
  },
};
