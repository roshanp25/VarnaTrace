import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Point, StencilPath, TraceScoreResult } from './src/engine';
import { RewardOverlay, TracingCanvas } from './src/features/tracing';

/**
 * A simple arch shape, standing in for a real character stencil until the content step supplies
 * actual English/Hindi character path data. Coordinates are in the canvas's 0-300 viewBox space.
 */
const DEMO_STENCIL: StencilPath = [
  { x: 40, y: 220 },
  { x: 60, y: 120 },
  { x: 110, y: 50 },
  { x: 190, y: 50 },
  { x: 240, y: 120 },
  { x: 260, y: 220 },
];

export default function App() {
  const { width, height } = useWindowDimensions();
  const canvasSize = Math.min(width, height) * 0.8;

  const [tracedPoints, setTracedPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<TraceScoreResult | null>(null);

  const reset = () => {
    setTracedPoints([]);
    setResult(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trace the arch</Text>

      <TracingCanvas
        stencil={DEMO_STENCIL}
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
    marginBottom: 16,
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
