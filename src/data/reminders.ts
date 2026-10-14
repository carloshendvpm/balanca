import type { SQLiteDatabase } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';

import { reminderDates, sameLocalDay } from '@/core/reminders';
import { getSetting } from '@/db/repo';

export interface ReminderPrefs {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, hour: 7, minute: 0 };
export const remindersSupported = true;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestReminderPermission(): Promise<boolean> {
  const { granted } = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } });
  return granted;
}

/**
 * Re-plans the next week of reminders. Called on launch, after every
 * weigh-in and when the preference changes, so a day that already has a
 * weigh-in never gets a reminder.
 */
export async function syncReminders(db: SQLiteDatabase) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const prefs = await getSetting(db, 'reminder', DEFAULT_REMINDER);
  if (!prefs.enabled) return;
  const last = await db.getFirstAsync<{ t: number | null }>('SELECT MAX(measuredAt) AS t FROM readings');
  const now = new Date();
  const weighedToday = last?.t != null && sameLocalDay(new Date(last.t), now);
  for (const date of reminderDates(now, prefs.hour, prefs.minute, weighedToday)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Hora da pesagem', body: 'Suba na balança antes do café para manter a tendência precisa.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
}
