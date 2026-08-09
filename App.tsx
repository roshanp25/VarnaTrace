import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { allCharacters, CharacterContent } from './src/content';
import { Point, TraceScoreResult } from './src/engine';
import { RewardOverlay, TracingCanvas } from './src/features/tracing';

export default function App() {
  const { width, height } = useWindowDimensions();
  const canvasSize = Math.min(width, height) * 0.7;

  const [selected, setSelected] = useState<CharacterContent>(allCharacters[0]);
  const [tracedPoints, setTracedPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<TraceScoreResult | null>(null);

  const reset = () => {
    setTracedPoints([]);
    setResult(null);
  };

  const selectCharacter = (character: CharacterContent) => {
    setSelected(character);
    reset();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trace: {selected.displayLabel}</Text>
      <Text style={styles.subtitle}>
        {selected.script} · {selected.tier}
      </Text>

      <ScrollView horizontal style={styles.picker} contentContainerStyle={styles.pickerContent}>
        {allCharacters.map((character) => (
          <Pressable
            key={character.id}
            style={[styles.pickerItem, character.id === selected.id && styles.pickerItemSelected]}
            onPress={() => selectCharacter(character)}
          >
            <Text style={styles.pickerItemText}>{character.displayLabel}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <TracingCanvas
        stencil={selected.strokes[0]}
        size={canvasSize}
        tracedPoints={tracedPoints}
        onTracedPointsChange={setTracedPoints}
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
