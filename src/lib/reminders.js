import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { formatMoney } from './money';
import { daysUntil, formatDate } from './dates';
import { normalizePhone } from './phone';
import { STATUS_OVERDUE, balance, paidAmount, statusOf } from './loans';

export { normalizePhone };

export const DEFAULT_SETTINGS = {
  businessName: 'Talgo Investment',
  currency: 'KSh',
  countryDialCode: '254',
  defaultReminderTime: '09:00',
  remindDayBefore: true,
  remindOverdue: true,
};

export function buildReminderText(loan, settings = DEFAULT_SETTINGS) {
  const { currency } = settings;
  const owed = balance(loan);
  const paid = paidAmount(loan);
  const lines = [
    `Hello ${loan.name},`,
    ``,
    `Reminder from ${settings.businessName}.`,
    `Loan taken ${formatDate(loan.dateGiven)}: ${formatMoney(loan.principal, currency)}`,
    `Interest: ${formatMoney(loan.interestAmount, currency)}`,
    `Total to return: ${formatMoney(loan.totalToReturn, currency)}`,
    `Due date: ${formatDate(loan.dueDate)}`,
  ];
  if (paid > 0) lines.push(`Already paid: ${formatMoney(paid, currency)}`);
  const when = daysUntil(loan.dueDate) > 0 ? `by ${formatDate(loan.dueDate)}` : 'today';
  lines.push('', `Please send ${formatMoney(owed, currency)} ${when} via M-Pesa or cash.`);
  lines.push('Thank you.');
  return lines.join('\n');
}

export function buildFollowUpText(loan, settings = DEFAULT_SETTINGS) {
  const { currency } = settings;
  return [
    `Hello ${loan.name},`,
    ``,
    `Follow-up from ${settings.businessName} on your overdue loan.`,
    `Outstanding: ${formatMoney(balance(loan), currency)} — it was due ${formatDate(loan.dueDate)}.`,
    `Kindly settle today or call us to agree a payment plan.`,
  ].join('\n');
}

export function reminderTextFor(loan, settings = DEFAULT_SETTINGS) {
  return statusOf(loan) === STATUS_OVERDUE
    ? buildFollowUpText(loan, settings)
    : buildReminderText(loan, settings);
}

export function whatsappUrl(loan, settings = DEFAULT_SETTINGS, text) {
  const digits = normalizePhone(loan.phone, settings.countryDialCode);
  const message = text ?? reminderTextFor(loan, settings);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function smsUrl(loan, settings = DEFAULT_SETTINGS, text) {
  const digits = normalizePhone(loan.phone, settings.countryDialCode);
  const message = text ?? reminderTextFor(loan, settings);
  const separator = Platform.OS === 'ios' ? '&' : '?';
  return `sms:${digits}${separator}body=${encodeURIComponent(message)}`;
}

export function telUrl(loan, settings = DEFAULT_SETTINGS) {
  return `tel:${normalizePhone(loan.phone, settings.countryDialCode)}`;
}

export function openLink(url) {
  return Linking.openURL(url);
}
