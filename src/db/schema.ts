import type { SQLiteDatabase } from 'expo-sqlite';

import type { Sex } from '@/core/bia';
import type { Variant } from '@/core/protocol/parse';

export interface Profile {
  id: number;
  name: string;
  sex: Sex;
  birthDate: string; // YYYY-MM-DD
  heightCm: number;
  color: string;
}

export interface Reading {
  id: number;
  profileId: number | null;
  measuredAt: number; // epoch ms
  weightKg: number;
  impedance: number | null;
  variant: Variant | 'manual';
  rawHex: string;
}

export interface GoalRow {
  id: number;
  profileId: number;
  targetKg: number;
  deadline: number;
  startDate: number;
  startKg: number;
  completedAt: number | null;
}

const MIGRATIONS = [
  `CREATE TABLE profiles (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     sex TEXT NOT NULL CHECK (sex IN ('male','female')),
     birthDate TEXT NOT NULL,
     heightCm REAL NOT NULL,
     color TEXT NOT NULL
   );
   CREATE TABLE readings (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     profileId INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
     measuredAt INTEGER NOT NULL,
     weightKg REAL NOT NULL,
     impedance REAL,
     variant TEXT NOT NULL,
     rawHex TEXT NOT NULL DEFAULT ''
   );
   CREATE INDEX readings_profile_time ON readings(profileId, measuredAt);
   CREATE TABLE goals (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     profileId INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
     targetKg REAL NOT NULL,
     deadline INTEGER NOT NULL,
     startDate INTEGER NOT NULL,
     startKg REAL NOT NULL,
     completedAt INTEGER
   );`,
];

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
    version++;
  }
}
