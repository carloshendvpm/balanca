import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import { migrate } from './schema';

// App-wide UI state lives outside React context: on web, context updates did
// not reach screens rendered by the tab navigator.
let state = { version: 0, activeProfileId: null as number | null };
const listeners = new Set<() => void>();
const set = (patch: Partial<typeof state>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Signals that the database changed so every query re-runs. */
export const invalidate = () => set({ version: state.version + 1 });
export const setActiveProfileId = (id: number | null) => set({ activeProfileId: id });

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName="balanca.db" onInit={migrate}>
      {children}
    </SQLiteProvider>
  );
}

export function useStore() {
  const s = useSyncExternalStore(subscribe, () => state);
  return { ...s, invalidate, setActiveProfileId, db: useSQLiteContext() };
}

/** Runs a query and re-runs it whenever the store is invalidated. */
export function useQuery<T>(fn: (db: SQLiteDatabase) => Promise<T>, deps: unknown[], initial: T): T {
  const { db, version } = useStore();
  const [data, setData] = useState<T>(initial);
  useEffect(() => {
    let alive = true;
    fn(db).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, ...deps]);
  return data;
}
