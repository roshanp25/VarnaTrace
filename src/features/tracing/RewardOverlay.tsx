import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_DIFFICULTY, Difficulty, DIFFICULTY_CONFIGS } from '../../engine';
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
  /** Must match the difficulty the trace was scored under, so star cutoffs line up. Defaults to DEFAULT_DIFFICULTY. */
  difficulty?: Difficulty;
}

const STAR_SLOTS = 3;
const STAR_STAGGER_MS = 110;
const STAR_REVEAL_MS = 220;

/** Keyed by star count so feedback tone tracks how well the trace actually went, not just pass/fail. */
const THREE_STAR_MESSAGES = ['Clean strokes', 'Precise and controlled', 'Well-formed', 'Excellent shape'];
const TWO_STAR_MESSAGES = ['Good control', 'Solid strokes', 'Steady work', 'On the right track'];
const RETRY_MESSAGES = ['Worth another pass', 'Getting the shape down', 'Keep at it', 'Try that again'];

function starsForScore(score: number, difficulty: Difficulty): number {
  const config = DIFFICULTY_CONFIGS[difficulty];
  if (score >= config.threeStarThreshold) return 3;
  if (score >= config.scoring.passThreshold) return 2;
  return 1;
}

function messagesForStars(stars: number): string[] {
  if (stars >= 3) return THREE_STAR_MESSAGES;
  if (stars === 2) return TWO_STAR_MESSAGES;
  return RETRY_MESSAGES;
}

function pickMessage(stars: number): string {
  const pool = messagesForStars(stars);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Reward feedback shown after a completed trace: stars, score, a message, and two explicit next
 * actions. No sound yet — that needs an actual audio asset, which doesn't exist until the content
 * step supplies one.
 */
export function RewardOverlay({
  result,
  accentColor,
  onRetry,
  onNext,
  difficulty = DEFAULT_DIFFICULTY,
}: RewardOverlayProps) {
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const [cardOffset] = useState(() => new Animated.Value(10));
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const [starValues] = useState(() =>
    Array.from({ length: STAR_SLOTS }, () => new Animated.Value(0)),
  );

  const stars = starsForScore(result.score, difficulty);
  const message = useMemo(() => pickMessage(stars), [stars]);

  useEffect(() => {
    cardOpacity.setValue(0);
    cardOffset.setValue(10);
    backdropOpacity.setValue(0);
    starValues.forEach((value) => value.setValue(0));

    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    Animated.timing(cardOpacity, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(cardOffset, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.stagger(
      STAR_STAGGER_MS,
      starValues.slice(0, stars).map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: STAR_REVEAL_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [result, stars, cardOpacity, cardOffset, backdropOpacity, starValues]);

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
      <Animated.View
        style={[
          styles.card,
          { opacity: cardOpacity, transform: [{ translateY: cardOffset }] },
        ]}
      >
        <View style={styles.starRow}>
          {starValues.map((value, index) => {
            const filled = index < stars;
            return (
              <Animated.Text
                key={index}
                style={[
                  styles.star,
                  filled ? styles.starFilled : styles.starEmpty,
                  filled && {
                    opacity: value,
                    transform: [
                      {
                        scale: value.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.6, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {filled ? '★' : '☆'}
              </Animated.Text>
            );
          })}
        </View>
        <Text style={styles.score}>{result.score}%</Text>
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
    </Animated.View>
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
  starRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  star: {
    fontSize: 26,
  },
  starFilled: {
    color: Colors.ink,
  },
  starEmpty: {
    color: Colors.neutralBg,
  },
  score: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutralText,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: Colors.neutralBg,
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.paper,
    letterSpacing: 0.2,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutralText,
  },
});
