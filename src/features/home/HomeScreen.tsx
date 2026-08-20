import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { allCharacters, getCharacterById, getCharactersByScript, Script } from '../../content';
import { SCRIPT_LABELS } from '../../shared/categories';
import { fontFamilyForScript } from '../../shared/fonts';
import { Colors, getCategoryColors } from '../../shared/theme';
import {
  computeStreak,
  getCompletedCharacterIds,
  getCompletionDates,
  getLastTracedCharacterId,
} from '../progress/progressService';

const CATEGORY_COPY: Record<Script, { name: string; route: '/english' | '/hindi' | '/number' }> = {
  english: { name: SCRIPT_LABELS.english, route: '/english' },
  hindi: { name: `${SCRIPT_LABELS.hindi} · हिंदी`, route: '/hindi' },
  number: { name: SCRIPT_LABELS.number, route: '/number' },
};

/** Trace-count thresholds shown as achievement dots on the stats card — first trace, then two
 *  round waypoints, then the full set. The last one reads "All" rather than the raw character
 *  count so it doesn't look like an arbitrary number pulled from nowhere. */
const MILESTONES: { count: number; label: string }[] = [
  { count: 1, label: 'First' },
  { count: 25, label: '25' },
  { count: 75, label: '75' },
  { count: allCharacters.length, label: 'All' },
];

const RING_SIZE = 64;
const RING_RADIUS = 28;
const RING_STROKE = 3.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CategoryCard({ script, completedIds }: { script: Script; completedIds: Set<string> }) {
  const characters = getCharactersByScript(script);
  const total = characters.length;
  const done = characters.filter((character) => completedIds.has(character.id)).length;
  const sample = characters[0];
  const colors = getCategoryColors(script);
  const copy = CATEGORY_COPY[script];
  const progress = total > 0 ? done / total : 0;

  return (
    <Link href={copy.route} asChild>
      <Pressable style={styles.card}>
        <View style={styles.cardRingWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={styles.cardRing}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="rgba(36,27,69,0.08)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={colors.fill}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            />
          </Svg>
          <View style={[styles.cardGlyph, { backgroundColor: colors.soft }]}>
            <Text
              style={[
                styles.cardGlyphText,
                { color: colors.ink, fontFamily: fontFamilyForScript(script, true) },
              ]}
            >
              {sample?.displayLabel}
            </Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardName, { color: colors.ink, fontFamily: fontFamilyForScript(script, true) }]}>
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

/** Prominent shortcut back into the last character traced, with a streak badge if one's active. */
function ContinueCard({ characterId, streak }: { characterId: string; streak: number }) {
  const character = getCharacterById(characterId);
  if (!character) {
    return null;
  }
  const colors = getCategoryColors(character.script);

  return (
    <Pressable
      style={[styles.continueCard, { backgroundColor: colors.soft, borderColor: colors.fill }]}
      onPress={() => router.push({ pathname: '/trace/[characterId]', params: { characterId: character.id } })}
    >
      <View style={[styles.continueGlyphWrap, { backgroundColor: Colors.paper }]}>
        <Text
          style={[
            styles.continueGlyphText,
            { color: colors.ink, fontFamily: fontFamilyForScript(character.script, true) },
          ]}
        >
          {character.displayLabel}
        </Text>
      </View>
      <View style={styles.continueMeta}>
        <Text style={[styles.continueLabel, { color: colors.ink }]}>Continue tracing</Text>
        <Text style={[styles.continueName, { color: colors.ink }]}>{SCRIPT_LABELS[character.script]}</Text>
      </View>
      {streak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakBadgeText}>🔥 {streak}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Overall trace count plus a row of achievement dots — no data model of its own beyond MILESTONES. */
function StatsCard({ tracedCount, streak }: { tracedCount: number; streak: number }) {
  const total = allCharacters.length;

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{tracedCount}</Text>
          <Text style={styles.statLabel}>of {total} traced</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{streak > 0 ? `🔥 ${streak}` : '0'}</Text>
          <Text style={styles.statLabel}>{streak > 0 ? 'day streak' : 'trace today to start a streak'}</Text>
        </View>
      </View>
      <Text style={styles.milestoneHeading}>Milestones</Text>
      <View style={styles.milestoneRow}>
        {MILESTONES.map((milestone) => {
          const reached = tracedCount >= milestone.count;
          return (
            <View key={milestone.count} style={styles.milestone}>
              <View style={[styles.milestoneDot, reached && styles.milestoneDotReached]}>
                <Text style={[styles.milestoneStar, reached && styles.milestoneStarReached]}>★</Text>
              </View>
              <Text style={styles.milestoneLabel}>{milestone.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface ProgressSnapshot {
  completedIds: Set<string>;
  lastTracedCharacterId: string | null;
  streak: number;
}

const EMPTY_PROGRESS: ProgressSnapshot = { completedIds: new Set(), lastTracedCharacterId: null, streak: 0 };

export function HomeScreen() {
  const [progress, setProgress] = useState<ProgressSnapshot>(EMPTY_PROGRESS);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getCompletedCharacterIds(), getLastTracedCharacterId(), getCompletionDates()]).then(
        ([completedIds, lastTracedCharacterId, completionDates]) => {
          if (!cancelled) {
            setProgress({
              completedIds: new Set(completedIds),
              lastTracedCharacterId,
              streak: computeStreak(completionDates),
            });
          }
        },
      );
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <View style={styles.wordmark}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M4 19c4-9 8-13 16-15" stroke={Colors.brand} strokeWidth={2.6} strokeLinecap="round" />
          </Svg>
          <Text style={styles.wordmarkText}>Varna Trace</Text>
        </View>
        {/* Only in-app entry point to subscription management — CategoryGridScreen's locked-tile
         * route to /paywall is unreachable once every category is unlocked, so a subscriber would
         * otherwise have no way to manage/cancel without leaving the app. */}
        <Pressable
          accessibilityLabel="Account and subscription"
          style={styles.accountButton}
          onPress={() => router.push('/paywall')}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="8" r="4" stroke={Colors.ink} strokeWidth={2} />
            <Path d="M4 20c1.4-4.2 4.4-6.4 8-6.4s6.6 2.2 8 6.4" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>
      <Text style={styles.tagline}>Write the Hindi you speak, and more</Text>

      {progress.lastTracedCharacterId && (
        <ContinueCard characterId={progress.lastTracedCharacterId} streak={progress.streak} />
      )}

      <CategoryCard script="english" completedIds={progress.completedIds} />
      <CategoryCard script="hindi" completedIds={progress.completedIds} />
      <CategoryCard script="number" completedIds={progress.completedIds} />

      <StatsCard tracedCount={progress.completedIds.size} streak={progress.streak} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: Colors.panel,
    borderWidth: 2,
    borderColor: 'rgba(36,27,69,0.08)',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  cardRingWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRing: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  cardGlyph: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGlyphText: {
    fontSize: 22,
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
  continueCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  continueGlyphWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueGlyphText: {
    fontSize: 22,
    fontWeight: '700',
  },
  continueMeta: {
    flex: 1,
  },
  continueLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.75,
    marginBottom: 2,
  },
  continueName: {
    fontSize: 17,
    fontWeight: '700',
  },
  streakBadge: {
    backgroundColor: Colors.paper,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  streakBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  statsCard: {
    backgroundColor: Colors.panel,
    borderWidth: 2,
    borderColor: 'rgba(36,27,69,0.08)',
    borderRadius: 20,
    padding: 18,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(36,27,69,0.1)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.neutralMuted,
    textAlign: 'center',
  },
  milestoneHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.neutralMuted,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(36,27,69,0.08)',
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  milestone: {
    alignItems: 'center',
    gap: 4,
  },
  milestoneDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneDotReached: {
    backgroundColor: Colors.gold,
  },
  milestoneStar: {
    fontSize: 14,
    color: Colors.neutralMuted,
  },
  milestoneStarReached: {
    color: Colors.paper,
  },
  milestoneLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.neutralMuted,
  },
});
