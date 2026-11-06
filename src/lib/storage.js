import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { paidAmount, balance, statusOf } from './loans';
import { DEFAULT_SETTINGS } from './reminders';

const LOANS_KEY = 'talgo.loans.v1';
const SETTINGS_KEY = 'talgo.settings.v1';

export async function loadLoans() {
  const raw = await AsyncStorage.getItem(LOANS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLoans(loans) {
  return AsyncStorage.setItem(LOANS_KEY, JSON.stringify(loans));
}

export async function loadSettings() {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function loansToCsv(loans) {
  const header = [
    'Ref', 'Borrower', 'Phone', 'Date given', 'Time given', 'Principal', 'Interest',
    'Total to return', 'Paid', 'Balance', 'Status', 'Due date', 'Reminder time', 'Notes',
  ];
  const rows = loans.map((loan) => [
    loan.id, loan.name, loan.phone, loan.dateGiven, loan.timeGiven,
    (loan.principal || 0).toFixed(2), (loan.interestAmount || 0).toFixed(2),
    (loan.totalToReturn || 0).toFixed(2), paidAmount(loan).toFixed(2), balance(loan).toFixed(2),
    statusOf(loan).replace('_', ' '), loan.dueDate, loan.reminderTime, loan.notes || '',
  ].map(csvCell).join(','));
  return [header.join(','), ...rows].join('\r\n');
}

function timestampName(prefix, extension) {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${prefix}-${stamp}.${extension}`;
}

async function shareNative(filename, contents, mimeType) {
  const file = new File(Paths.document, filename);
  if (file.exists) file.delete();
  file.create();
  await file.write(contents);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('This device has no app that can share a file.');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Export Talgo records', UTI: mimeType });
  return file.uri;
}

function downloadOnWeb(filename, contents, mimeType) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return url;
}

export function exportText(filename, contents, mimeType = 'text/plain') {
  if (Platform.OS === 'web') return Promise.resolve(downloadOnWeb(filename, contents, mimeType));
  return shareNative(filename, contents, mimeType);
}

export function exportLoansCsv(loans) {
  return exportText(timestampName('talgo-loans', 'csv'), loansToCsv(loans), 'text/csv');
}

export function exportBackup(loans, settings) {
  const payload = JSON.stringify(
    { app: 'talgo-investment', version: 1, exportedAt: new Date().toISOString(), settings, loans },
    null,
    2,
  );
  return exportText(timestampName('talgo-backup', 'json'), payload, 'application/json');
}

export function parseBackup(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const loans = Array.isArray(parsed) ? parsed : parsed?.loans;
  if (!Array.isArray(loans)) throw new Error('This file does not contain Talgo loan records.');
  const cleaned = loans
    .filter((loan) => loan && typeof loan === 'object' && loan.id && loan.name)
    .map((loan) => ({
      ...loan,
      payments: Array.isArray(loan.payments) ? loan.payments : [],
      notificationIds: Array.isArray(loan.notificationIds) ? loan.notificationIds : [],
    }));
  if (!cleaned.length) throw new Error('No valid loan records were found in that backup.');
  return { loans: cleaned, settings: parsed?.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : null };
}

export async function pickBackup() {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
  const file = Array.isArray(picked) ? picked[0] : picked;
  if (!file) throw new Error('No file was selected.');
  return parseBackup(await file.text());
}
