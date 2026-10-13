import { TabList, TabSlot, TabTrigger, Tabs, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { TABS } from './tabs';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <Bar>
          {TABS.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabButton>{t.label}</TabButton>
            </TabTrigger>
          ))}
        </Bar>
      </TabList>
    </Tabs>
  );
}

// TabTriggers must be direct children of the element passed to TabList.
function Bar({ children, ...props }: TabListProps) {
  const c = useTheme();
  return (
    <View {...props} style={styles.bar}>
      <View style={[styles.inner, { backgroundColor: c.card, borderColor: c.separator }]}>{children}</View>
    </View>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const c = useTheme();
  return (
    <Pressable {...props} style={[styles.button, isFocused && { backgroundColor: c.text }]}>
      <Text style={{ color: isFocused ? c.background : c.textSecondary, fontWeight: '600', fontSize: 14 }}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', bottom: 0, width: '100%', padding: 12, alignItems: 'center' },
  inner: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    justifyContent: 'space-between',
  },
  button: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
});
