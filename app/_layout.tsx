import { NotoSansDevanagari_400Regular, useFonts } from '@expo-google-fonts/noto-sans-devanagari';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { SCRIPT_LABELS } from '../src/shared/categories';
import { Colors } from '../src/shared/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ NotoSansDevanagari_400Regular });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.paper }} />;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.paper },
          headerTintColor: Colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.paper },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="english" options={{ title: SCRIPT_LABELS.english }} />
        <Stack.Screen name="hindi" options={{ title: SCRIPT_LABELS.hindi }} />
        <Stack.Screen name="number" options={{ title: SCRIPT_LABELS.number }} />
        <Stack.Screen name="parental-gate" options={{ title: 'Grown-ups Only' }} />
        <Stack.Screen name="paywall" options={{ title: 'Unlock' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
