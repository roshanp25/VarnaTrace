import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { getCharacterById, getCharactersByScript } from '../../content';
import { DEFAULT_DIFFICULTY, Difficulty, MultiStrokeScoreResult } from '../../engine';
import { fontFamilyForScript } from '../../shared/fonts';
import { Colors, getCategoryColors } from '../../shared/theme';
import { markCharacterCompleted } from '../progress/progressService';

import { MultiStrokeTracingCanvas } from './MultiStrokeTracingCanvas';
import { RewardOverlay } from './RewardOverlay';

export interface TracingScreenProps {
  characterId: string;
}

/**
 * Traces a single character. Character selection now lives entirely in CategoryGridScreen — this
 * screen just resolves the id it's given and renders the canvas/reward flow for it.
 */
export function TracingScreen({ characterId }: TracingScreenProps) {
  const character = getCharacterById(characterId);

  const { width, height } = useWindowDimensions();
  const canvasSize = Math.min(width, height) * 0.7;

  const [result, setResult] = useState<MultiStrokeScoreResult | null>(null);
  const [activeStroke, setActiveStroke] = useState({ index: 0, total: character?.strokes.length ?? 1 });
  // Bumped to force MultiStrokeTracingCanvas to remount and restart from stroke 1 on "Clear",
  // since it owns its own stroke-sequencing state (not lifted here).
  const [canvasKey, setCanvasKey] = useState(0);
  // Per-session only — not persisted, resets to DEFAULT_DIFFICULTY each time this screen mounts.
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);

  if (!character) {
    return null;
  }

  const categoryColors = getCategoryColors(character.script);

  const reset = () => {
    setResult(null);
    setCanvasKey((key) => key + 1);
  };

  const handleDifficultyChange = (next: Difficulty) => {
    if (next === difficulty) {
      return;
    }
    setDifficulty(next);
    reset();
  };

  const handleComplete = (completed: MultiStrokeScoreResult) => {
    setResult(completed);
    if (completed.passed) {
      void markCharacterCompleted(character.id);
    }
  };

  const handleNext = () => {
    const siblings = getCharactersByScript(character.script);
    const currentIndex = siblings.findIndex((sibling) => sibling.id === character.id);
    const next = siblings[currentIndex + 1];
    if (next) {
      router.replace({ pathname: '/trace/[characterId]', params: { characterId: next.id } });
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          { color: categoryColors.ink, fontFamily: fontFamilyForScript(character.script) },
        ]}
      >
        {character.displayLabel}
      </Text>

      <View style={styles.difficultyToggle}>
        {(['easy', 'difficult'] as const).map((mode) => (
          <Pressable
            key={mode}
            style={[
              styles.difficultyButton,
              difficulty === mode && { backgroundColor: categoryColors.fill },
            ]}
            onPress={() => handleDifficultyChange(mode)}
          >
            <Text
              style={[
                styles.difficultyButtonText,
                difficulty === mode && styles.difficultyButtonTextActive,
              ]}
            >
              {mode === 'easy' ? 'Easy' : 'Hard'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeStroke.total > 1 && (
        <View style={styles.dots}>
          {Array.from({ length: activeStroke.total }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeStroke.index ? categoryColors.fill : Colors.neutralBg,
                },
              ]}
            />
          ))}
        </View>
      )}

      <View
        style={[
          styles.canvasBackdrop,
          { width: canvasSize * 1.2, height: canvasSize * 1.2, backgroundColor: categoryColors.soft },
        ]}
      >
        <MultiStrokeTracingCanvas
          key={canvasKey}
          strokes={character.strokes}
          size={canvasSize}
          traceColor={categoryColors.fill}
          onStrokeIndexChange={(index, total) => setActiveStroke({ index, total })}
          onComplete={handleComplete}
          difficulty={difficulty}
        />
      </View>

      <View style={styles.controlRow}>
        <Pressable style={styles.clearButton} onPress={reset} accessibilityLabel="Clear">
          <Text style={styles.clearButtonIcon}>↺</Text>
        </Pressable>
        <Pressable style={styles.clearButton} onPress={handleNext} accessibilityLabel="Skip to next character">
          <Text style={styles.clearButtonIcon}>→</Text>
        </Pressable>
      </View>

      {result && (
        <RewardOverlay
          result={result}
          accentColor={categoryColors.ink}
          onRetry={reset}
          onNext={handleNext}
          difficulty={difficulty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  difficultyToggle: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: Colors.neutralBg,
    borderRadius: 999,
    padding: 4,
    marginBottom: 12,
  },
  difficultyButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  difficultyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.neutralText,
  },
  difficultyButtonTextActive: {
    color: Colors.paper,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  canvasBackdrop: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonIcon: {
    fontSize: 20,
    color: Colors.neutralText,
    fontWeight: '600',
  },
});
