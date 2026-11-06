import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { addDaysISO, formatDate, parseLocal } from './dates';
import { formatMoney } from './money';
import { STATUS_OVERDUE, STATUS_PAID, balance, statusOf } from './loans';

export const REMINDER_CHANNEL = 'loan-reminders';

// expo-notifications 58 exports AndroidImportance as a type only, so the numeric level is inlined.
const ANDROID_IMPORTANCE_HIGH = 6;

const isNative = Platform.OS === 'android' || Platform.OS === 'ios';

export function configureNotifications() {
  if (!isNative) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function setUpAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: 'Loan reminders',
    importance: ANDROID_IMPORTANCE_HIGH,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: '#0B6B4F',
  });
}

export async function ensurePermissions() {
  if (!isNative) return { status: 'unsupported', granted: false };
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return current;
  return Notifications.requestPermissionsAsync();
}

export const permissionSupported = isNative;

function timeParts(hhmm) {
  const [hour, minute] = String(hhmm || '09:00').split(':').map(Number);
  return { hour: Number.isFinite(hour) ? hour : 9, minute: Number.isFinite(minute) ? minute : 0 };
}

async function scheduleOnce(title, body, date, loanId) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: { loanId }, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: REMINDER_CHANNEL,
    },
  });
}

async function scheduleDaily(title, body, hour, minute, loanId) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: { loanId }, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDER_CHANNEL,
    },
  });
}

export async function cancelNotifications(ids = []) {
  if (!isNative) return;
  await Promise.all(
    ids.filter(Boolean).map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {
        /* already delivered or cancelled */
      }),
    ),
  );
}

export async function syncLoanNotifications(loan, settings) {
  if (!isNative) return [];
  const status = statusOf(loan);
  if (status === STATUS_PAID || !loan.dueDate) return [];

  const now = Date.now();
  const ids = [];
  const { hour, minute } = timeParts(loan.reminderTime);
  const owed = formatMoney(balance(loan), settings.currency);
  const dueDate = parseLocal(loan.dueDate, loan.reminderTime);

  if (loan.remindDayBefore && dueDate) {
    const eve = parseLocal(addDaysISO(loan.dueDate, -1), loan.reminderTime);
    if (eve && eve.getTime() > now) {
      ids.push(
        await scheduleOnce(
          `${loan.name} pays tomorrow`,
          `${loan.name} should pay ${owed} tomorrow (${formatDate(loan.dueDate)}). Prepare the reminder.`,
          eve,
          loan.id,
        ),
      );
    }
  }

  if (dueDate && dueDate.getTime() > now) {
    ids.push(
      await scheduleOnce(
        `${loan.name} should pay ${owed} today`,
        `Loan ${loan.id} taken ${formatDate(loan.dateGiven)} is due today.`,
        dueDate,
        loan.id,
      ),
    );
  }

  if (status === STATUS_OVERDUE && loan.remindOverdue) {
    ids.push(
      await scheduleDaily(
        `${loan.name} is overdue — ${owed}`,
        `Due ${formatDate(loan.dueDate)}. Send the reminder and follow up until it is paid.`,
        hour,
        minute,
        loan.id,
      ),
    );
  }

  return ids;
}

export async function resyncLoan(loan, settings) {
  await cancelNotifications(loan.notificationIds);
  const notificationIds = await syncLoanNotifications(loan, settings);
  return { ...loan, notificationIds };
}
