import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { PASS_THRESHOLD } from '../../engine';

/** Both TraceScoreResult and MultiStrokeScoreResult satisfy this — the overlay only needs the final score/pass state, not stroke-level detail. */
interface ScoreSummary {
  score: number;
  passed: boolean;
}

export interface RewardOverlayProps {
  result: ScoreSummary;
  /** Called when the child taps the overlay to try again. */
  onDismiss: () => void;
}

function starsForScore(score: number): number {
  if (score >= 90) return 3;
  if (score >= PASS_THRESHOLD) return 2;
  return 1;
}

function messageForScore(passed: boolean): string {
  return passed ? 'Great job!' : 'Try again!';
}

/**
 * Simple reward feedback shown after a completed trace: stars + a short message, with a small
 * pop-in animation. No sound yet — that needs an actual audio asset, which doesn't exist until
 * the content step supplies one.
 */
export function RewardOverlay({ result, onDismiss }: RewardOverlayProps) {
  const [scale] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    scale.setValue(0.5);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [result, scale]);

  const stars = starsForScore(result.score);

  return (
    <Pressable style={styles.backdrop} onPress={onDismiss}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Text style={styles.stars}>{'⭐'.repeat(stars)}</Text>
        <Text style={styles.message}>{messageForScore(result.passed)}</Text>
        <Text style={styles.score}>Score: {result.score}</Text>
        <Text style={styles.hint}>Tap to try again</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  stars: {
    fontSize: 48,
    marginBottom: 8,
  },
  message: {
    fontSize: 24,
    fontWeight: '700',
  },
  score: {
    fontSize: 18,
    color: '#555',
    marginTop: 4,
  },
  hint: {
    fontSize: 14,
    color: '#999',
    marginTop: 16,
  },
});
