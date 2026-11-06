const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');

export function todayISO(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function nowHHMM(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

export function parseLocal(iso, hhmm = '00:00') {
  if (!iso) return null;
  const [h, minute] = (hhmm || '00:00').split(':').map(Number);
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d, h || 0, minute || 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysUntil(iso) {
  const target = parseLocal(iso);
  if (!target) return null;
  return Math.round((target - startOfToday()) / 86_400_000);
}

export function formatDate(iso) {
  const date = parseLocal(iso);
  if (!date) return '—';
  return `${DAYS[date.getDay()]} ${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(iso, hhmm) {
  const date = parseLocal(iso, hhmm || '00:00');
  if (!date) return '—';
  return `${formatDate(iso)} · ${formatTime(hhmm)}`;
}

export function formatTime(hhmm) {
  if (!hhmm) return '—';
  const [rawH, m] = hhmm.split(':').map(Number);
  const suffix = rawH >= 12 ? 'pm' : 'am';
  const h12 = rawH % 12 === 0 ? 12 : rawH % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function dueLabel(iso) {
  const days = daysUntil(iso);
  if (days === null) return { text: 'No due date', tone: 'muted' };
  if (days < 0) return { text: `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`, tone: 'danger' };
  if (days === 0) return { text: 'Due today', tone: 'danger' };
  if (days === 1) return { text: 'Due tomorrow', tone: 'warn' };
  return { text: `Due in ${days} days`, tone: 'muted' };
}
