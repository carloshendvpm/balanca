import '@/global.css';

import { Platform } from 'react-native';

// Data colors follow the dataviz reference palette (light/dark steps).
export const Colors = {
  light: {
    text: '#0b0b0b',
    textSecondary: '#52514e',
    textMuted: '#8a8984',
    background: '#f2f2f0',
    card: '#fcfcfb',
    separator: '#e4e3df',
    accent: '#2a78d6',
    accentText: '#ffffff',
    good: '#1a7f37',
    bad: '#c62828',
    warn: '#b26a00',
    low: '#2a78d6',
  },
  dark: {
    text: '#f0efec',
    textSecondary: '#c3c2b7',
    textMuted: '#8d8c85',
    background: '#0c0c0b',
    card: '#1a1a19',
    separator: '#2c2c2a',
    accent: '#3987e5',
    accentText: '#ffffff',
    good: '#4cc06a',
    bad: '#ef6b6b',
    warn: '#e0a030',
    low: '#6aa8f0',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

/** Categorical slots, assigned to profiles in fixed order. */
export const ProfileColors = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
});

export const Spacing = { one: 4, two: 8, three: 12, four: 16, five: 24, six: 32 } as const;

export const MaxContentWidth = 720;
