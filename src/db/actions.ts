import type { SQLiteDatabase } from 'expo-sqlite';

import { evaluateGoal } from '@/core/goals';
import { matchProfile, type MatchResult } from '@/core/user-match';

import { completeGoal, insertReading, lastWeights, listGoals, listReadings } from './repo';
import type { Reading } from './schema';

/** Marks goals as completed once the latest weight reaches them. */
export async function settleGoals(db: SQLiteDatabase, profileId: number, now = Date.now()) {
  const weights = (await listReadings(db, profileId)).map((r) => ({ t: r.measuredAt, v: r.weightKg }));
  for (const g of await listGoals(db, profileId)) {
    if (g.completedAt === null && evaluateGoal(g, weights, now).status === 'achieved') await completeGoal(db, g.id, now);
  }
}

/** Saves a weighing, assigning it automatically when the weight clearly matches one profile. */
export async function recordWeighing(
  db: SQLiteDatabase,
  r: Omit<Reading, 'id' | 'profileId'>,
): Promise<{ id: number; match: MatchResult }> {
  const match = matchProfile(r.weightKg, await lastWeights(db));
  const profileId = match.kind === 'match' ? match.profileId : null;
  const id = await insertReading(db, { ...r, profileId });
  if (profileId !== null) await settleGoals(db, profileId, r.measuredAt);
  return { id, match };
}
