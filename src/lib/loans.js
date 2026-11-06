import { round2 } from './money';
import { daysUntil, nowHHMM, todayISO } from './dates';

export const STATUS_PAID = 'paid';
export const STATUS_OVERDUE = 'overdue';
export const STATUS_DUE_TODAY = 'due_today';
export const STATUS_ACTIVE = 'active';

export function newId() {
  return `L${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}

export function resolveInterest({ principal, interestMode, interestValue }) {
  const base = round2(Number(principal) || 0);
  const raw = Number(interestValue) || 0;
  const interestAmount = interestMode === 'percent' ? round2((base * raw) / 100) : round2(raw);
  return { interestAmount, totalToReturn: round2(base + interestAmount) };
}

export function effectiveRatePercent({ principal, interestAmount }) {
  if (!principal) return 0;
  return round2((interestAmount / principal) * 100);
}

export function createLoan(input) {
  const now = new Date();
  const interest = resolveInterest(input);
  return {
    id: newId(),
    name: String(input.name || '').trim(),
    phone: String(input.phone || '').trim(),
    principal: round2(input.principal),
    interestMode: input.interestMode === 'flat' ? 'flat' : 'percent',
    interestValue: Number(input.interestValue) || 0,
    interestAmount: interest.interestAmount,
    totalToReturn: interest.totalToReturn,
    dateGiven: input.dateGiven || todayISO(now),
    timeGiven: input.timeGiven || nowHHMM(now),
    dueDate: input.dueDate || '',
    reminderTime: input.reminderTime || '09:00',
    remindDayBefore: input.remindDayBefore !== false,
    remindOverdue: input.remindOverdue !== false,
    notes: String(input.notes || '').trim(),
    payments: [],
    notificationIds: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function applyInput(loan, input) {
  const interest = resolveInterest(input);
  return {
    ...loan,
    ...createLoan({ ...loan, ...input, ...interest }),
    id: loan.id,
    createdAt: loan.createdAt,
    payments: loan.payments,
    notificationIds: loan.notificationIds || [],
    updatedAt: new Date().toISOString(),
  };
}

export function paidAmount(loan) {
  return round2((loan.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
}

export function balance(loan) {
  return round2((Number(loan.totalToReturn) || 0) - paidAmount(loan));
}

export function statusOf(loan) {
  if (balance(loan) <= 0.004) return STATUS_PAID;
  const days = daysUntil(loan.dueDate);
  if (days === null) return STATUS_ACTIVE;
  if (days < 0) return STATUS_OVERDUE;
  if (days === 0) return STATUS_DUE_TODAY;
  return STATUS_ACTIVE;
}

export function isOpen(loan) {
  return statusOf(loan) !== STATUS_PAID;
}

export function progressOf(loan) {
  const total = Number(loan.totalToReturn) || 0;
  if (total <= 0) return 1;
  return Math.min(1, paidAmount(loan) / total);
}

export const STATUS_META = {
  [STATUS_PAID]: { label: 'Paid', tone: 'success' },
  [STATUS_OVERDUE]: { label: 'Overdue', tone: 'danger' },
  [STATUS_DUE_TODAY]: { label: 'Due today', tone: 'danger' },
  [STATUS_ACTIVE]: { label: 'Active', tone: 'info' },
};

export function statsOf(loans) {
  let totalGiven = 0;
  let totalInterest = 0;
  let collected = 0;
  let profitCollected = 0;
  let paidCount = 0;
  let openCount = 0;
  let dueTodayCount = 0;
  let overdueCount = 0;
  let dueTodayAmount = 0;
  let overdueAmount = 0;

  for (const loan of loans) {
    const principal = Number(loan.principal) || 0;
    const interest = Number(loan.interestAmount) || 0;
    const total = Number(loan.totalToReturn) || 0;
    const paid = paidAmount(loan);
    totalGiven += principal;
    totalInterest += interest;
    collected += paid;
    profitCollected += total > 0 ? interest * Math.min(1, paid / total) : 0;

    const status = statusOf(loan);
    if (status === STATUS_PAID) paidCount += 1;
    else openCount += 1;
    if (status === STATUS_DUE_TODAY) {
      dueTodayCount += 1;
      dueTodayAmount += balance(loan);
    }
    if (status === STATUS_OVERDUE) {
      overdueCount += 1;
      overdueAmount += balance(loan);
    }
  }

  return {
    loanCount: loans.length,
    totalGiven: round2(totalGiven),
    totalInterest: round2(totalInterest),
    expectedReturn: round2(totalGiven + totalInterest),
    collected: round2(collected),
    profitCollected: round2(profitCollected),
    profitPending: round2(totalInterest - profitCollected),
    outstanding: round2(totalGiven + totalInterest - collected),
    paidCount,
    openCount,
    dueTodayCount,
    overdueCount,
    dueTodayAmount: round2(dueTodayAmount),
    overdueAmount: round2(overdueAmount),
    collectNowAmount: round2(dueTodayAmount + overdueAmount),
    collectNowCount: dueTodayCount + overdueCount,
  };
}

export function partitionByDue(loans) {
  const overdue = [];
  const dueToday = [];
  const upcoming = [];
  const settled = [];
  for (const loan of loans) {
    const status = statusOf(loan);
    if (status === STATUS_PAID) settled.push(loan);
    else if (status === STATUS_OVERDUE) overdue.push(loan);
    else if (status === STATUS_DUE_TODAY) dueToday.push(loan);
    else upcoming.push(loan);
  }
  const byDue = (a, b) => String(a.dueDate).localeCompare(String(b.dueDate));
  return {
    overdue: overdue.sort(byDue),
    dueToday: dueToday.sort(byDue),
    upcoming: upcoming.sort(byDue),
    settled,
  };
}
