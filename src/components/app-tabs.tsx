import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { TABS } from './tabs';

export default function AppTabs() {
  return (
    <NativeTabs>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
