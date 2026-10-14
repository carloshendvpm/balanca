import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { Colors } from '@/constants/theme';
import { syncReminders } from '@/data/reminders';
import { StoreProvider } from '@/db/store';

SplashScreen.preventAutoHideAsync();

/** Re-plans reminders on launch, once the database is open. */
function Boot() {
  const db = useSQLiteContext();
  useEffect(() => {
    syncReminders(db).catch(() => {});
  }, [db]);
  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  // Only the two weights in use, so the other sixteen are not bundled.
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_500Medium: require('@expo-google-fonts/barlow-condensed/500Medium/BarlowCondensed_500Medium.ttf'),
    BarlowCondensed_600SemiBold: require('@expo-google-fonts/barlow-condensed/600SemiBold/BarlowCondensed_600SemiBold.ttf'),
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme];
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.accent, background: c.background, card: c.card, text: c.text, border: c.separator } }}>
      <StoreProvider>
        <Boot />
        <AppTabs />
      </StoreProvider>
    </ThemeProvider>
  );
}
