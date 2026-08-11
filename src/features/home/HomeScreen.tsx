import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { getCharactersByScript, Script } from '../../content';
import { SCRIPT_LABELS } from '../../shared/categories';
import { fontFamilyForScript } from '../../shared/fonts';
import { Colors, getCategoryColors } from '../../shared/theme';
import { getCompletedCharacterIds } from '../progress/progressService';

const CATEGORY_COPY: Record<Script, { name: string; route: '/english' | '/hindi' | '/number' }> = {
  english: { name: SCRIPT_LABELS.english, route: '/english' },
  hindi: { name: `${SCRIPT_LABELS.hindi} · हिंदी`, route: '/hindi' },
  number: { name: SCRIPT_LABELS.number, route: '/number' },
};

function CategoryCard({ script, completedIds }: { script: Script; completedIds: Set<string> }) {
  const characters = getCharactersByScript(script);
  const total = characters.length;
  const done = characters.filter((character) => completedIds.has(character.id)).length;
  const sample = characters[0];
  const colors = getCategoryColors(script);
  const copy = CATEGORY_COPY[script];

  return (
    <Link href={copy.route} asChild>
      <Pressable style={StyleSheet.flatten([styles.card, { backgroundColor: colors.soft }])}>
        <View style={styles.cardGlyph}>
          <Text
            style={[
              styles.cardGlyphText,
              { color: colors.ink, fontFamily: fontFamilyForScript(script) },
            ]}
          >
            {sample?.displayLabel}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardName, { color: colors.ink, fontFamily: fontFamilyForScript(script) }]}>
            {copy.name}
          </Text>
          <Text style={[styles.cardSub, { color: colors.ink }]}>
            {done} of {total} traced
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

export function HomeScreen() {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCompletedCharacterIds().then((ids) => {
        if (!cancelled) {
          setCompletedIds(new Set(ids));
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      <View style={styles.wordmark}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M4 19c4-9 8-13 16-15" stroke={Colors.ink} strokeWidth={2.4} strokeLinecap="round" />
        </Svg>
        <Text style={styles.wordmarkText}>VarnaTrace</Text>
      </View>
      <Text style={styles.tagline}>Trace letters, varnamala &amp; numbers</Text>

      <CategoryCard script="english" completedIds={completedIds} />
      <CategoryCard script="hindi" completedIds={completedIds} />
      <CategoryCard script="number" completedIds={completedIds} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
    paddingTop: 72,
    paddingHorizontal: 20,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  wordmarkText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
  },
  tagline: {
    fontSize: 13,
    color: Colors.neutralMuted,
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  cardGlyph: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGlyphText: {
    fontSize: 24,
    fontWeight: '700',
  },
  cardMeta: {
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 12,
    opacity: 0.75,
  },
});
