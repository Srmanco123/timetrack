// ── TIME ──────────────────────────────────────────────────────────────────────

/** Returns duration in decimal hours between two ISO strings. */
export function getHours(start, end) {
  return (new Date(end) - new Date(start)) / 3_600_000;
}

/** Formats decimal hours → "2h 30m" or "4h". */
export function formatHours(h) {
  if (!h || h <= 0) return '0h';
  const hh = Math.floor(h);
  const m  = Math.round((h - hh) * 60);
  return m ? `${hh}h ${m}m` : `${hh}h`;
}

/** Formats a Date (or ISO string) → "12 may" in Spanish. */
export function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } catch {
    return String(d);
  }
}

/** Formats elapsed seconds → "HH:MM:SS". */
export function formatTimer(seconds) {
  const h  = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m  = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s  = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ── HTML ──────────────────────────────────────────────────────────────────────

/** Escapes HTML special characters to prevent XSS in templates. */
export function esc(str) {
  return String(str ?? '').replace(/[<>&"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;',
  }[c]));
}

// ── DATE MATH ─────────────────────────────────────────────────────────────────

/** Returns days remaining until a date string, or null if the date is missing/invalid. */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.max(0, Math.ceil((d - new Date()) / 86_400_000));
}

/** Returns days elapsed since a date string (minimum 1). */
export function daysSince(dateStr) {
  return Math.max(1, Math.ceil((new Date() - new Date(dateStr)) / 86_400_000));
}

/** Converts an ISO string (UTC or local) to a value usable in datetime-local inputs. */
export function toLocalInput(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Normalizes a datetime-local input value to ISO UTC for storage. */
export function toISO(localValue) {
  const d = new Date(localValue);
  return isNaN(d) ? '' : d.toISOString();
}

// ── IDS ───────────────────────────────────────────────────────────────────────

/** Generates a unique ID using crypto.randomUUID when available. */
export function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}
