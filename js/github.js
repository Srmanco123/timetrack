import { STORAGE } from './config.js';

const BASE = 'https://api.github.com';

// ── CONFIG ────────────────────────────────────────────────────────────────────

export function getConfig() {
  return {
    token:  localStorage.getItem(STORAGE.TOKEN)  ?? '',
    owner:  localStorage.getItem(STORAGE.OWNER)  ?? '',
    repo:   localStorage.getItem(STORAGE.REPO)   ?? '',
    branch: localStorage.getItem(STORAGE.BRANCH) ?? 'main',
    path:   localStorage.getItem(STORAGE.PATH)   ?? 'data/timetrack.json',
  };
}

export function saveConfig({ token, owner, repo, branch, path }) {
  localStorage.setItem(STORAGE.TOKEN,  token);
  localStorage.setItem(STORAGE.OWNER,  owner);
  localStorage.setItem(STORAGE.REPO,   repo);
  localStorage.setItem(STORAGE.BRANCH, branch);
  localStorage.setItem(STORAGE.PATH,   path);
}

export function isConfigured() {
  const c = getConfig();
  return Boolean(c.token && c.owner && c.repo);
}

// ── REQUEST ───────────────────────────────────────────────────────────────────

async function request(method, endpoint, body) {
  const { token } = getConfig();
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept:         'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// ── DATA OPS ──────────────────────────────────────────────────────────────────

/**
 * Loads the JSON data file from GitHub.
 * Returns { data, sha } — sha is null if the file doesn't exist yet.
 */
export async function loadData() {
  const { owner, repo, path, branch } = getConfig();
  if (!owner || !repo) throw new Error('GitHub no configurado. Ve a Config.');

  try {
    const file = await request('GET', `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
    const decoded = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))));
    return { data: JSON.parse(decoded), sha: file.sha };
  } catch (err) {
    if (err.message.includes('404')) {
      // File doesn't exist yet — return empty structure
      return { data: { projects: [], tasks: [], sessions: [] }, sha: null };
    }
    throw err;
  }
}

/**
 * Saves the JSON data file to GitHub.
 * Uses sha for updates (required by GitHub API to avoid conflicts).
 */
export async function saveData(data, sha) {
  const { owner, repo, path, branch } = getConfig();
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const now     = new Date().toISOString();

  return request('PUT', `/repos/${owner}/${repo}/contents/${path}`, {
    message: `TimeTrack update ${now}`,
    content,
    branch,
    ...(sha ? { sha } : {}),
  });
}

/**
 * Tests connectivity by fetching repo metadata.
 * Returns the repo object on success.
 */
export async function testConnection() {
  const { owner, repo } = getConfig();
  if (!owner || !repo) throw new Error('Completa usuario y repositorio primero.');
  return request('GET', `/repos/${owner}/${repo}`);
}
