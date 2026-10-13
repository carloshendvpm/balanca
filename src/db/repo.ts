import type { SQLiteDatabase } from 'expo-sqlite';

import type { GoalRow, Profile, Reading } from './schema';

export const listProfiles = (db: SQLiteDatabase) =>
  db.getAllAsync<Profile>('SELECT * FROM profiles ORDER BY id');

export async function saveProfile(db: SQLiteDatabase, p: Omit<Profile, 'id'> & { id?: number }) {
  if (p.id) {
    await db.runAsync(
      'UPDATE profiles SET name=?, sex=?, birthDate=?, heightCm=?, color=? WHERE id=?',
      p.name, p.sex, p.birthDate, p.heightCm, p.color, p.id,
    );
    return p.id;
  }
  const r = await db.runAsync(
    'INSERT INTO profiles (name, sex, birthDate, heightCm, color) VALUES (?,?,?,?,?)',
    p.name, p.sex, p.birthDate, p.heightCm, p.color,
  );
  return r.lastInsertRowId;
}

export const deleteProfile = (db: SQLiteDatabase, id: number) => db.runAsync('DELETE FROM profiles WHERE id=?', id);

/** Readings sorted oldest → newest. */
export const listReadings = (db: SQLiteDatabase, profileId: number) =>
  db.getAllAsync<Reading>('SELECT * FROM readings WHERE profileId=? ORDER BY measuredAt', profileId);

export const listAllReadings = (db: SQLiteDatabase) =>
  db.getAllAsync<Reading>('SELECT * FROM readings ORDER BY measuredAt');

export const listUnassigned = (db: SQLiteDatabase) =>
  db.getAllAsync<Reading>('SELECT * FROM readings WHERE profileId IS NULL ORDER BY measuredAt DESC');

export const lastWeights = (db: SQLiteDatabase) =>
  db.getAllAsync<{ profileId: number; lastWeightKg: number | null }>(
    `SELECT p.id AS profileId,
            (SELECT weightKg FROM readings r WHERE r.profileId = p.id ORDER BY measuredAt DESC LIMIT 1) AS lastWeightKg
       FROM profiles p`,
  );

export async function insertReading(db: SQLiteDatabase, r: Omit<Reading, 'id'>) {
  const res = await db.runAsync(
    'INSERT INTO readings (profileId, measuredAt, weightKg, impedance, variant, rawHex) VALUES (?,?,?,?,?,?)',
    r.profileId, r.measuredAt, r.weightKg, r.impedance, r.variant, r.rawHex,
  );
  return res.lastInsertRowId;
}

export const setReadingImpedance = (db: SQLiteDatabase, id: number, impedance: number, rawHex: string) =>
  db.runAsync('UPDATE readings SET impedance=?, rawHex=? WHERE id=?', impedance, rawHex, id);

export const assignReading = (db: SQLiteDatabase, id: number, profileId: number | null) =>
  db.runAsync('UPDATE readings SET profileId=? WHERE id=?', profileId, id);

export const deleteReading = (db: SQLiteDatabase, id: number) => db.runAsync('DELETE FROM readings WHERE id=?', id);

export const listGoals = (db: SQLiteDatabase, profileId: number) =>
  db.getAllAsync<GoalRow>('SELECT * FROM goals WHERE profileId=? ORDER BY completedAt IS NOT NULL, deadline', profileId);

export async function insertGoal(db: SQLiteDatabase, g: Omit<GoalRow, 'id' | 'completedAt'>) {
  await db.runAsync(
    'INSERT INTO goals (profileId, targetKg, deadline, startDate, startKg) VALUES (?,?,?,?,?)',
    g.profileId, g.targetKg, g.deadline, g.startDate, g.startKg,
  );
}

export const completeGoal = (db: SQLiteDatabase, id: number, at: number) =>
  db.runAsync('UPDATE goals SET completedAt=? WHERE id=? AND completedAt IS NULL', at, id);

export const deleteGoal = (db: SQLiteDatabase, id: number) => db.runAsync('DELETE FROM goals WHERE id=?', id);

export const listAllGoals = (db: SQLiteDatabase) => db.getAllAsync<GoalRow>('SELECT * FROM goals ORDER BY id');
