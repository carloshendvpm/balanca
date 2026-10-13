import type { Profile } from '@/db/schema';

import { Chips } from './kit';

export function ProfileSwitcher({
  profiles,
  active,
  onChange,
}: {
  profiles: Profile[];
  active: Profile | null;
  onChange(id: number): void;
}) {
  if (profiles.length < 2) return null;
  return (
    <Chips
      options={profiles.map((p) => ({ key: p.id, label: p.name, color: p.color }))}
      value={active?.id ?? null}
      onChange={onChange}
    />
  );
}
