import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DirectionProvider, assertHarfConfiguration } from '@harf/native';
import type { Direction } from '@harf/native';
import { LanguageContext } from '../src/language';

/**
 * The whole app lives inside one `<DirectionProvider>`.
 *
 * There is deliberately no `I18nManager.forceRTL` anywhere in this project —
 * not in `app.json`, not in a native module, not here. Direction is React
 * state, and `assertHarfConfiguration()` warns in development if the native
 * flag has been turned on behind our back, because Yoga would then reverse
 * rows as well and the two would cancel out.
 */
export default function RootLayout() {
  const [locale, setLocale] = useState('ar-EG');

  useEffect(() => {
    assertHarfConfiguration();
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageContext.Provider value={{ locale, setLocale }}>
        <DirectionProvider
          locale={locale}
          onDirectionChange={(dir: Direction) => {
            // Purely to prove the callback fires on an ordinary state update.
            if (__DEV__) console.log(`[harf demo] direction is now ${dir}`);
          }}
        >
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </DirectionProvider>
      </LanguageContext.Provider>
    </SafeAreaProvider>
  );
}
