import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Spacing, type Palette } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = keyof Pick<Palette, 'text' | 'textSecondary' | 'textMuted' | 'accent' | 'good' | 'bad' | 'warn' | 'low'>;

export function T({
  style,
  variant = 'body',
  tone = 'text',
  ...rest
}: TextProps & { variant?: 'hero' | 'title' | 'heading' | 'body' | 'small' | 'caption' | 'mono'; tone?: Tone }) {
  const c = useTheme();
  return <Text style={[{ color: c[tone] }, styles[variant], style]} {...rest} />;
}

export function Screen({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + 120 }}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <T variant="title">{title}</T>
          {right}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.card }, style]}>{children}</View>;
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={styles.titleRow}>
        <T variant="small" tone="textSecondary" style={styles.sectionTitle}>
          {title.toUpperCase()}
        </T>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  testID,
}: {
  label: string;
  onPress(): void;
  kind?: 'primary' | 'secondary' | 'danger' | 'plain';
  disabled?: boolean;
  testID?: string;
}) {
  const c = useTheme();
  const bg = kind === 'primary' ? c.accent : kind === 'secondary' ? c.separator : 'transparent';
  const fg = kind === 'primary' ? c.accentText : kind === 'danger' ? c.bad : kind === 'plain' ? c.accent : c.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === 'plain' && styles.buttonPlain,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chips<K extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string; color?: string }[];
  value: NoInfer<K> | null;
  onChange(k: NoInfer<K>): void;
}) {
  const c = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={String(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[styles.chip, { backgroundColor: on ? c.text : c.card, borderColor: c.separator }]}>
            {o.color && <View style={[styles.dot, { backgroundColor: o.color }]} />}
            <Text style={[styles.chipText, { color: on ? c.background : c.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string | null }) {
  const c = useTheme();
  return (
    <View style={{ gap: Spacing.one }}>
      <T variant="small" tone="textSecondary">
        {label}
      </T>
      <TextInput
        placeholderTextColor={c.textMuted}
        style={[styles.input, { color: c.text, backgroundColor: c.background, borderColor: error ? c.bad : c.separator }]}
        {...input}
      />
      {error ? (
        <T variant="caption" tone="bad">
          {error}
        </T>
      ) : null}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Divider() {
  const c = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator }} />;
}

export function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const c = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: c.separator }]}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { fontSize: 64, lineHeight: 70, fontWeight: '700', fontFamily: Fonts.rounded, fontVariant: ['tabular-nums'] },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 19 },
  caption: { fontSize: 12, lineHeight: 16 },
  mono: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.mono },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four, gap: Spacing.five },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  sectionTitle: { letterSpacing: 0.6, fontWeight: '600' },
  card: { borderRadius: 14, padding: Spacing.four, gap: Spacing.three },
  button: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  buttonPlain: { paddingVertical: 6, paddingHorizontal: 6 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 14, fontWeight: '500' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
});
