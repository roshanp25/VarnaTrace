import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { getCharacterById } from '../../src/content';
import { TracingScreen } from '../../src/features/tracing';
import { SCRIPT_LABELS } from '../../src/shared/categories';
import { Colors, getCategoryColors } from '../../src/shared/theme';

/**
 * Replaces the native back button, which otherwise just repeats the current screen's own title
 * (e.g. "< Hindi" leading into a screen titled "Hindi") — redundant rather than a real affordance.
 * Tinted per-category so it doubles as a visual cue for which script grid it returns to.
 */
function BackToGridButton({ color }: { color: string }) {
  return (
    <Pressable
      onPress={() => router.back()}
      style={[styles.backPill, { backgroundColor: color }]}
      hitSlop={10}
      accessibilityLabel="Back to all characters"
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 5l-7 7 7 7"
          stroke={Colors.paper}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Rect x={3} y={3} width={7} height={7} rx={1.5} fill={Colors.paper} />
        <Rect x={14} y={3} width={7} height={7} rx={1.5} fill={Colors.paper} opacity={0.55} />
        <Rect x={3} y={14} width={7} height={7} rx={1.5} fill={Colors.paper} opacity={0.55} />
        <Rect x={14} y={14} width={7} height={7} rx={1.5} fill={Colors.paper} opacity={0.55} />
      </Svg>
    </Pressable>
  );
}

export default function TraceScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const character = getCharacterById(characterId);
  const accentColor = character ? getCategoryColors(character.script).fill : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          title: character ? SCRIPT_LABELS[character.script] : '',
          // The native swipe-back gesture recognizer runs at the UIKit level, outside React
          // Native's JS responder system — it still intercepts a left-to-right drag anywhere on
          // screen even while TracingCanvas's PanResponder is handling the same touch, which reads
          // as the whole screen sliding away mid-trace. The custom back button below stays available.
          gestureEnabled: false,
          headerLeft: accentColor ? () => <BackToGridButton color={accentColor} /> : undefined,
        }}
      />
      <TracingScreen key={characterId} characterId={characterId} />
    </>
  );
}

const styles = StyleSheet.create({
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
});
