import { useEffect, useMemo } from 'react';

import { metricsFor, type MetricValues } from '@/core/metrics';
import { listGoals, listProfiles, listReadings } from '@/db/repo';
import type { GoalRow, Profile, Reading } from '@/db/schema';
import { useQuery, useStore } from '@/db/store';

export const useProfiles = () => useQuery(listProfiles, [], [] as Profile[]);

/** The profile the tabs are showing; defaults to the first one. */
export function useActiveProfile() {
  const profiles = useProfiles();
  const { activeProfileId, setActiveProfileId } = useStore();
  const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
  useEffect(() => {
    if (active && active.id !== activeProfileId) setActiveProfileId(active.id);
  }, [active, activeProfileId, setActiveProfileId]);
  return { profiles, active, setActive: setActiveProfileId };
}

export type ReadingWithMetrics = Reading & { m: MetricValues };

export function useProfileReadings(profile: Profile | null): ReadingWithMetrics[] {
  const id = profile?.id ?? -1;
  const readings = useQuery((db) => listReadings(db, id), [id], [] as Reading[]);
  return useMemo(
    () => (profile ? readings.map((r) => ({ ...r, m: metricsFor(r, profile) })) : []),
    [readings, profile],
  );
}

export function useGoals(profile: Profile | null) {
  const id = profile?.id ?? -1;
  return useQuery((db) => listGoals(db, id), [id], [] as GoalRow[]);
}
