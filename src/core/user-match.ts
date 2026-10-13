export interface Candidate {
  profileId: number;
  lastWeightKg: number | null;
}

export type MatchResult =
  | { kind: 'match'; profileId: number }
  | { kind: 'ambiguous'; profileIds: number[] } // closest first
  | { kind: 'none' };

export const toleranceKg = (lastKg: number) => Math.max(3, lastKg * 0.04);

/** Pick the profile a new weight most likely belongs to, like the OKOK app does. */
export function matchProfile(weightKg: number, candidates: Candidate[]): MatchResult {
  if (candidates.length === 1 && candidates[0].lastWeightKg === null) {
    return { kind: 'match', profileId: candidates[0].profileId };
  }
  const close = candidates
    .filter((c) => c.lastWeightKg !== null && Math.abs(weightKg - c.lastWeightKg) <= toleranceKg(c.lastWeightKg))
    .sort((a, b) => Math.abs(weightKg - a.lastWeightKg!) - Math.abs(weightKg - b.lastWeightKg!));
  if (close.length === 1) return { kind: 'match', profileId: close[0].profileId };
  if (close.length > 1) return { kind: 'ambiguous', profileIds: close.map((c) => c.profileId) };
  return { kind: 'none' };
}
