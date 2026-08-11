import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { PASS_THRESHOLD } from '../../engine';
import { Colors } from '../../shared/theme';

/** Both TraceScoreResult and MultiStrokeScoreResult satisfy this — the overlay only needs the final score/pass state, not stroke-level detail. */
interface ScoreSummary {
  score: number;
  passed: boolean;
}

export interface RewardOverlayProps {
  result: ScoreSummary;
  /** Color for the "Next Letter" button — pass a text-safe tone (e.g. a category's `ink`), not a bright fill. */
  accentColor: string;
  /** Retries the same character. */
  onRetry: () => void;
  /** Advances to the next character. */
  onNext: () => void;
}

const PASSED_MESSAGES = ['Great job!', 'Wonderful tracing!', 'You did it!', 'Super stroke!'];
const RETRY_MESSAGES = ['Nice try!', 'Almost there!', 'Keep practicing!', 'So close!'];

function starsForScore(score: number): number {
  if (score >= 90) return 3;
  if (score >= PASS_THRESHOLD) return 2;
  return 1;
}

function pickMessage(passed: boolean): string {
  const pool = passed ? PASSED_MESSAGES : RETRY_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Reward feedback shown after a completed trace: stars, a message, and two explicit next actions.
 * No sound yet — that needs an actual audio asset, which doesn't exist until the content step
 * supplies one.
 */
export function RewardOverlay({ result, accentColor, onRetry, onNext }: RewardOverlayProps) {
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
  const message = useMemo(() => pickMessage(result.passed), [result]);

  return (
    <View style={styles.backdrop}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Text style={styles.stars}>{'⭐'.repeat(stars)}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Pressable style={[styles.button, { backgroundColor: accentColor }]} onPress={onNext}>
            <Text style={styles.buttonTextPrimary}>Next Letter →</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={onRetry}>
            <Text style={styles.buttonTextSecondary}>Trace Again</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
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
    backgroundColor: Colors.paper,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 260,
  },
  stars: {
    fontSize: 48,
    marginBottom: 8,
  },
  message: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: Colors.neutralBg,
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.paper,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutralText,
  },
});
