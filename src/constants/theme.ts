import '@/global.css';

import { Platform } from 'react-native';

// "Azulejo" palette: bathroom-tile cobalt on porcelain, navy ink instead of
// black, grout-coloured hairlines, and a red reserved for the scale's index.
export const Colors = {
  light: {
    text: '#14213D', // tinta
    textSecondary: '#55617A', // grafite
    textMuted: '#8792A6',
    background: '#EEF2F6', // porcelana
    card: '#FFFFFF',
    separator: '#D5DCE5', // rejunte
    accent: '#1D4E9E', // azulejo
    accentSoft: '#DCE6F5',
    accentText: '#FFFFFF',
    needle: '#D93A2B', // ponteiro
    good: '#1F7A4A',
    bad: '#B3261E',
    warn: '#9A5B00',
    low: '#1D4E9E',
  },
  dark: {
    text: '#E6ECF4',
    textSecondary: '#A3B0C4',
    textMuted: '#6F7E96',
    background: '#0D1726',
    card: '#142238',
    separator: '#24344D',
    accent: '#7EA6F0',
    accentSoft: '#1C3157',
    accentText: '#0D1726',
    needle: '#FF6B5B',
    good: '#5CC98A',
    bad: '#F08A80',
    warn: '#E5B05C',
    low: '#7EA6F0',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

/** Categorical slots for profiles, in fixed order (dataviz reference palette). */
export const ProfileColors = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

/** Barlow Condensed for numerals and headings: reads like an instrument dial. */
export const Display = {
  medium: 'BarlowCondensed_500Medium',
  semibold: 'BarlowCondensed_600SemiBold',
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', mono: 'var(--font-mono)' },
});

export const Spacing = { one: 4, two: 8, three: 12, four: 16, five: 24, six: 32 } as const;

export const MaxContentWidth = 640;
