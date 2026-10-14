import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

import { TABS } from './tabs';

export default function AppTabs() {
  const c = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <NativeTabs tintColor={c.accent}>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
