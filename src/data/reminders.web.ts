import type { SQLiteDatabase } from 'expo-sqlite';

export interface ReminderPrefs {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, hour: 7, minute: 0 };
export const remindersSupported = false;

export async function requestReminderPermission() {
  return false;
}

export async function syncReminders(_db: SQLiteDatabase) {}
