import assert from 'node:assert/strict';
import { formatMoney, toNumber, round2 } from '../src/lib/money.js';
import { addDaysISO, daysUntil, dueLabel, formatDate, parseLocal, todayISO } from '../src/lib/dates.js';
import { normalizePhone, isValidMobile, formatPhoneForDisplay, phoneProblem } from '../src/lib/phone.js';
import {
  balance,
  createLoan,
  effectiveRatePercent,
  paidAmount,
  partitionByDue,
  resolveInterest,
  statsOf,
  statusOf,
  applyInput,
} from '../src/lib/loans.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log('money');
check('groups thousands and keeps two decimals', () => {
  assert.equal(formatMoney(1234567.5, 'KSh'), 'KSh1,234,567.50');
  assert.equal(formatMoney(0, 'KSh'), 'KSh0.00');
  assert.equal(formatMoney(-250, 'KSh'), '-KSh250.00');
});
check('parses figures typed with symbols and spaces', () => {
  assert.equal(toNumber('KSh 12,500'), 12500);
  assert.equal(toNumber('1,200.75'), 1200.75);
  assert.equal(toNumber('abc'), NaN);
  assert.equal(toNumber(''), NaN);
  assert.equal(round2(0.1 + 0.2), 0.3);
});

console.log('dates');
check('formats the weekday correctly for known dates', () => {
  assert.equal(formatDate('2026-11-06'), 'Fri 06 Nov 2026');
  assert.equal(formatDate('2026-12-06'), 'Sun 06 Dec 2026');
  assert.equal(formatDate('2027-01-01'), 'Fri 01 Jan 2027');
});
check('adds days across month and year ends', () => {
  assert.equal(addDaysISO('2026-11-06', 30), '2026-12-06');
  assert.equal(addDaysISO('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysISO('2026-03-01', -1), '2026-02-28');
  assert.equal(addDaysISO('2028-02-28', 1), '2028-02-29');
});
check('parses local time without shifting the day', () => {
  const date = parseLocal('2026-11-06', '09:00');
  assert.equal(date.getHours(), 9);
  assert.equal(date.getDate(), 6);
  assert.equal(parseLocal('not-a-date'), null);
});
check('daysUntil and due labels', () => {
  const today = todayISO();
  assert.equal(daysUntil(today), 0);
  assert.equal(daysUntil(addDaysISO(today, 5)), 5);
  assert.equal(daysUntil(addDaysISO(today, -3)), -3);
  assert.equal(dueLabel(today).text, 'Due today');
  assert.equal(dueLabel(addDaysISO(today, 1)).text, 'Due tomorrow');
  assert.equal(dueLabel(addDaysISO(today, -2)).text, '2 days overdue');
  assert.equal(dueLabel(addDaysISO(today, -1)).text, '1 day overdue');
  assert.equal(dueLabel(addDaysISO(today, 9)).text, 'Due in 9 days');
});

console.log('phone numbers (Kenya)');
check('normalises every local format to 254…', () => {
  assert.equal(normalizePhone('0746021668'), '254746021668');
  assert.equal(normalizePhone('0746 021 668'), '254746021668');
  assert.equal(normalizePhone('+254 746 021 668'), '254746021668');
  assert.equal(normalizePhone('254746021668'), '254746021668');
  assert.equal(normalizePhone('00254746021668'), '254746021668');
  assert.equal(normalizePhone('746021668'), '254746021668');
  assert.equal(normalizePhone('0112 345 678'), '254112345678');
  assert.equal(normalizePhone(''), '');
});
check('respects a different country code', () => {
  assert.equal(normalizePhone('08031234567', '234'), '2348031234567');
  assert.equal(normalizePhone('0746021668', '254'), '254746021668');
});
check('accepts Safaricom 07xx and 01xx, rejects the rest', () => {
  assert.equal(isValidMobile('254746021668'), true);
  assert.equal(isValidMobile('254112345678'), true);
  assert.equal(isValidMobile('25474602166'), false);
  assert.equal(isValidMobile('254202123456'), false);
  assert.equal(isValidMobile(''), false);
});
check('displays the number the way it will be messaged', () => {
  assert.equal(formatPhoneForDisplay('254746021668'), '+254 746 021 668');
  assert.equal(phoneProblem('0746 021 668'), null);
  assert.match(phoneProblem('0746'), /not a working mobile/);
  assert.equal(phoneProblem(''), 'Enter the debtor phone number so Talgo can message them.');
});

console.log('interest and totals');
check('percentage interest', () => {
  assert.deepEqual(resolveInterest({ principal: 2000, interestMode: 'percent', interestValue: 20 }), {
    interestAmount: 400,
    totalToReturn: 2400,
  });
  assert.equal(effectiveRatePercent({ principal: 2000, interestAmount: 400 }), 20);
});
check('flat interest', () => {
  assert.deepEqual(resolveInterest({ principal: 50000, interestMode: 'flat', interestValue: 7500 }), {
    interestAmount: 7500,
    totalToReturn: 57500,
  });
  assert.equal(effectiveRatePercent({ principal: 50000, interestAmount: 7500 }), 15);
});
check('new loan captures date, time and reminder defaults', () => {
  const loan = createLoan({ name: ' Austin ', phone: ' 0746 021 668 ', principal: 2000, interestMode: 'percent', interestValue: 20, dueDate: '2026-12-06' });
  assert.equal(loan.name, 'Austin');
  assert.equal(loan.phone, '0746 021 668');
  assert.equal(loan.totalToReturn, 2400);
  assert.equal(loan.dateGiven, todayISO());
  assert.match(loan.timeGiven, /^\d{2}:\d{2}$/);
  assert.equal(loan.reminderTime, '09:00');
  assert.equal(loan.remindDayBefore, true);
  assert.deepEqual(loan.payments, []);
});

console.log('balances, status and profit');
const today = todayISO();
const mk = (over = {}) =>
  createLoan({
    name: 'X',
    phone: '0746021668',
    principal: 1000,
    interestMode: 'percent',
    interestValue: 10,
    dueDate: addDaysISO(today, 10),
    ...over,
  });
const withPayments = (loan, amounts) => ({
  ...loan,
  payments: amounts.map((amount, i) => ({ id: `P${i}`, amount, date: today })),
});

check('interest is 110 of 1000 at 10%', () => {
  const loan = mk({});
  assert.equal(loan.interestAmount, 100);
  assert.equal(loan.totalToReturn, 1100);
});
check('partial payment leaves the right balance and keeps the loan active', () => {
  const loan = withPayments(mk({}), [400]);
  assert.equal(paidAmount(loan), 400);
  assert.equal(balance(loan), 700);
  assert.equal(statusOf(loan), 'active');
});
check('full payment settles it', () => {
  assert.equal(statusOf(withPayments(mk({}), [1100])), 'paid');
  assert.equal(balance(withPayments(mk({}), [1100])), 0);
});
check('status follows the due date', () => {
  assert.equal(statusOf({ ...mk({}), dueDate: today }), 'due_today');
  assert.equal(statusOf({ ...mk({}), dueDate: addDaysISO(today, -4) }), 'overdue');
  assert.equal(statusOf({ ...mk({}), dueDate: '' }), 'active');
});
check('editing a loan keeps its payments and identity', () => {
  const original = withPayments(mk({}), [300]);
  const edited = applyInput(original, { name: 'Y', phone: '0746021668', principal: 1000, interestMode: 'flat', interestValue: 200, dueDate: addDaysISO(today, 10), dateGiven: today });
  assert.equal(edited.id, original.id);
  assert.equal(edited.name, 'Y');
  assert.equal(edited.totalToReturn, 1200);
  assert.equal(paidAmount(edited), 300);
  assert.equal(balance(edited), 900);
});
check('portfolio maths', () => {
  const loans = [
    // KSh1000 at 10% -> 1100 due, 600 paid, falls due today
    withPayments(mk({ dueDate: today }), [600]),
    // KSh5000 at 20% -> 6000 due, 2000 paid, two days late
    withPayments(mk({ principal: 5000, interestValue: 20, dueDate: addDaysISO(today, -2) }), [2000]),
    // KSh1000 at 5% -> 1050 due, nothing paid yet
    mk({ principal: 1000, interestValue: 5, dueDate: addDaysISO(today, 20) }),
  ];
  const stats = statsOf(loans);
  assert.equal(stats.totalGiven, 7000);
  assert.equal(stats.totalInterest, 1150);
  assert.equal(stats.expectedReturn, 8150);
  assert.equal(stats.collected, 2600);
  assert.equal(stats.outstanding, 5550);
  assert.equal(stats.paidCount, 0);
  assert.equal(stats.openCount, 3);
  assert.equal(stats.dueTodayCount, 1);
  assert.equal(stats.overdueCount, 1);
  assert.equal(stats.dueTodayAmount, 500);
  assert.equal(stats.overdueAmount, 4000);
  assert.equal(stats.collectNowAmount, 4500);
  // profit counts only interest actually earned: 100*600/1100 + 1000*2000/6000 + 0
  assert.equal(stats.profitCollected, round2(100 * (600 / 1100) + 1000 * (2000 / 6000)));
  assert.equal(stats.profitPending, round2(1150 - stats.profitCollected));
});
check('partition sorts debtors into the right buckets', () => {
  const groups = partitionByDue([
    withPayments(mk({ dueDate: today }), [0]),
    mk({ dueDate: addDaysISO(today, -1) }),
    mk({ dueDate: addDaysISO(today, 15) }),
    withPayments(mk({ dueDate: addDaysISO(today, 3) }), [1100]),
  ]);
  assert.equal(groups.dueToday.length, 1);
  assert.equal(groups.overdue.length, 1);
  assert.equal(groups.upcoming.length, 1);
  assert.equal(groups.settled.length, 1);
});

console.log(`\n${passed} checks passed`);
