import { useState } from 'react';
import { NotoSansDevanagari_400Regular, useFonts } from '@expo-google-fonts/noto-sans-devanagari';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { allCharacters, CharacterContent, Script } from './src/content';
import { MultiStrokeScoreResult } from './src/engine';
import { MultiStrokeTracingCanvas, RewardOverlay } from './src/features/tracing';

/**
 * System/platform default fonts don't reliably include good Devanagari glyphs (rendering can come
 * out malformed depending on the OS/browser's font-fallback choice), so Hindi text explicitly uses
 * a bundled font instead of leaving it to fallback. English/numbers use the platform default.
 */
function fontFamilyForScript(script: Script): string | undefined {
  return script === 'hindi' ? 'NotoSansDevanagari_400Regular' : undefined;
}

export default function App() {
  const [fontsLoaded] = useFonts({ NotoSansDevanagari_400Regular });

  const { width, height } = useWindowDimensions();
  const canvasSize = Math.min(width, height) * 0.7;

  const [selected, setSelected] = useState<CharacterContent>(allCharacters[0]);
  const [result, setResult] = useState<MultiStrokeScoreResult | null>(null);
  // Bumped to force MultiStrokeTracingCanvas to remount and restart from stroke 1 on "Clear",
  // since it owns its own stroke-sequencing state (not lifted here).
  const [canvasKey, setCanvasKey] = useState(0);

  const reset = () => {
    setResult(null);
    setCanvasKey((key) => key + 1);
  };

  const selectCharacter = (character: CharacterContent) => {
    setSelected(character);
    reset();
  };

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontFamily: fontFamilyForScript(selected.script) }]}>
        Trace: {selected.displayLabel}
      </Text>
      <Text style={styles.subtitle}>
        {selected.script} · {selected.tier} · {selected.strokes.length} stroke
        {selected.strokes.length > 1 ? 's' : ''}
      </Text>

      <ScrollView horizontal style={styles.picker} contentContainerStyle={styles.pickerContent}>
        {allCharacters.map((character) => (
          <Pressable
            key={character.id}
            style={[styles.pickerItem, character.id === selected.id && styles.pickerItemSelected]}
            onPress={() => selectCharacter(character)}
          >
            <Text
              style={[
                styles.pickerItemText,
                { fontFamily: fontFamilyForScript(character.script) },
              ]}
            >
              {character.displayLabel}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <MultiStrokeTracingCanvas
        key={canvasKey}
        strokes={selected.strokes}
        size={canvasSize}
        onComplete={setResult}
      />

      <Pressable style={styles.clearButton} onPress={reset}>
        <Text style={styles.clearButtonText}>Clear</Text>
      </Pressable>

      {result && <RewardOverlay result={result} onDismiss={reset} />}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
    marginBottom: 12,
  },
  picker: {
    maxHeight: 56,
    marginBottom: 12,
  },
  pickerContent: {
    gap: 8,
    paddingHorizontal: 8,
  },
  pickerItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#3478f6',
  },
  pickerItemText: {
    fontSize: 18,
  },
  clearButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#333',
  },
});
