import type { SQLiteDatabase } from 'expo-sqlite';

import { importReadingsCsv, toCsv } from '@/core/csv';
import { METRICS, metricsFor } from '@/core/metrics';
import { insertReading, listAllGoals, listAllReadings, listProfiles } from '@/db/repo';
import type { GoalRow, Profile, Reading } from '@/db/schema';

export async function exportCsv(db: SQLiteDatabase): Promise<string> {
  const profiles = await listProfiles(db);
  const readings = await listAllReadings(db);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const metricCols = METRICS.filter((m) => m.key !== 'weightKg');
  const header = ['data', 'perfil', 'peso_kg', 'impedancia_ohm', 'variante', 'payload', ...metricCols.map((m) => m.key)];
  const rows = readings.map((r) => {
    const p = r.profileId === null ? undefined : byId.get(r.profileId);
    const m = p ? metricsFor(r, p) : {};
    return [
      new Date(r.measuredAt).toISOString(),
      p?.name ?? '',
      r.weightKg,
      r.impedance,
      r.variant,
      r.rawHex,
      ...metricCols.map((c) => {
        const v = m[c.key];
        return v === null || v === undefined ? '' : Number(v.toFixed(c.decimals + 1));
      }),
    ];
  });
  return toCsv([header, ...rows]);
}

interface Backup {
  app: 'balanca';
  version: 1;
  exportedAt: string;
  profiles: Profile[];
  readings: Reading[];
  goals: GoalRow[];
}

export async function exportJson(db: SQLiteDatabase): Promise<string> {
  const backup: Backup = {
    app: 'balanca',
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles: await listProfiles(db),
    readings: await listAllReadings(db),
    goals: await listAllGoals(db),
  };
  return JSON.stringify(backup, null, 1);
}

/** Restores a JSON backup, replacing everything. */
async function restoreJson(db: SQLiteDatabase, b: Backup) {
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM goals; DELETE FROM readings; DELETE FROM profiles;');
    for (const p of b.profiles)
      await db.runAsync('INSERT INTO profiles (id,name,sex,birthDate,heightCm,color) VALUES (?,?,?,?,?,?)', p.id, p.name, p.sex, p.birthDate, p.heightCm, p.color);
    for (const r of b.readings)
      await db.runAsync(
        'INSERT INTO readings (id,profileId,measuredAt,weightKg,impedance,variant,rawHex) VALUES (?,?,?,?,?,?,?)',
        r.id, r.profileId, r.measuredAt, r.weightKg, r.impedance, r.variant, r.rawHex,
      );
    for (const g of b.goals)
      await db.runAsync(
        'INSERT INTO goals (id,profileId,targetKg,deadline,startDate,startKg,completedAt) VALUES (?,?,?,?,?,?,?)',
        g.id, g.profileId, g.targetKg, g.deadline, g.startDate, g.startKg, g.completedAt,
      );
  });
  return `Backup restaurado: ${b.profiles.length} perfis, ${b.readings.length} pesagens, ${b.goals.length} metas.`;
}

/**
 * JSON backups replace all data. CSV rows are appended (skipping exact
 * duplicates); rows go to the profile named in the file, else `fallbackProfileId`.
 */
export async function importFile(db: SQLiteDatabase, text: string, fallbackProfileId: number | null): Promise<string> {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{')) {
    const b = JSON.parse(trimmed) as Backup;
    if (b.app !== 'balanca') throw new Error('Arquivo JSON não é um backup deste app');
    return restoreJson(db, b);
  }
  const rows = importReadingsCsv(text);
  const profiles = await listProfiles(db);
  const existing = new Set((await listAllReadings(db)).map((r) => `${r.measuredAt}|${r.weightKg}`));
  let added = 0;
  for (const r of rows) {
    if (existing.has(`${r.measuredAt}|${r.weightKg}`)) continue;
    const named = r.profileName ? profiles.find((p) => p.name === r.profileName) : undefined;
    await insertReading(db, {
      profileId: named?.id ?? fallbackProfileId,
      measuredAt: r.measuredAt,
      weightKg: r.weightKg,
      impedance: r.impedance,
      variant: r.variant as Reading['variant'],
      rawHex: r.rawHex,
    });
    added++;
  }
  return `${added} pesagens importadas${rows.length - added ? ` (${rows.length - added} já existiam)` : ''}.`;
}
