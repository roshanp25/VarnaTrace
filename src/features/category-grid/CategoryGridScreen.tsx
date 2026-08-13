import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Category, CharacterContent, getCharactersByScript, Script } from '../../content';
import { subscriptionService } from '../../services/subscription';
import { CATEGORY_LABELS, CATEGORY_ORDER, SCRIPT_TAGLINES } from '../../shared/categories';
import { fontFamilyForScript } from '../../shared/fonts';
import { CategoryColors, Colors, getCategoryColors } from '../../shared/theme';
import { isCharacterAccessible } from '../content-gating/access';
import { getCompletedCharacterIds } from '../progress/progressService';

export interface CategoryGridScreenProps {
  script: Script;
}

interface CategoryGroup {
  category: Category;
  characters: CharacterContent[];
}

function groupByCategory(characters: CharacterContent[]): CategoryGroup[] {
  const byCategory = new Map<Category, CharacterContent[]>();
  for (const character of characters) {
    const list = byCategory.get(character.category) ?? [];
    list.push(character);
    byCategory.set(character.category, list);
  }
  return CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => ({
    category,
    characters: byCategory.get(category) as CharacterContent[],
  }));
}

function Tile({
  character,
  colors,
  completed,
  locked,
}: {
  character: CharacterContent;
  colors: CategoryColors;
  completed: boolean;
  locked: boolean;
}) {
  return (
    <Pressable
      style={[styles.tile, { backgroundColor: colors.soft }]}
      onPress={() => {
        if (locked) {
          router.push('/parental-gate');
          return;
        }
        router.push({ pathname: '/trace/[characterId]', params: { characterId: character.id } });
      }}
    >
      <Text
        style={[
          styles.tileText,
          { color: colors.ink, fontFamily: fontFamilyForScript(character.script) },
        ]}
      >
        {character.displayLabel}
      </Text>
      {completed && (
        <View style={styles.checkBadge}>
          <Text style={styles.badgeText}>✓</Text>
        </View>
      )}
      {locked && (
        <View style={styles.lockBadge}>
          <Text style={styles.badgeText}>🔒</Text>
        </View>
      )}
    </Pressable>
  );
}

export function CategoryGridScreen({ script }: CategoryGridScreenProps) {
  const characters = getCharactersByScript(script);
  const colors = getCategoryColors(script);
  const groups = groupByCategory(characters);
  const showSectionLabels = groups.length > 1;

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isSubscribed, setIsSubscribed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCompletedCharacterIds().then((ids) => {
        if (!cancelled) {
          setCompletedIds(new Set(ids));
        }
      });
      subscriptionService.getEntitlementStatus().then((status) => {
        if (!cancelled) {
          setIsSubscribed(status.isActive);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.tagline}>{SCRIPT_TAGLINES[script]}</Text>

      {groups.map((group) => (
        <View key={group.category}>
          {showSectionLabels && (
            <Text style={[styles.sectionLabel, { color: colors.ink }]}>
              {CATEGORY_LABELS[group.category]}
            </Text>
          )}
          <View style={styles.tileRow}>
            {group.characters.map((character) => (
              <Tile
                key={character.id}
                character={character}
                colors={colors}
                completed={completedIds.has(character.id)}
                locked={!isCharacterAccessible(character, isSubscribed)}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const TILE_SIZE = 68;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  tagline: {
    fontSize: 13,
    color: Colors.neutralMuted,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 10,
  },
  tileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontSize: 22,
    fontWeight: '600',
  },
  checkBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.numbers,
    borderWidth: 2,
    borderColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.neutralBg,
    borderWidth: 2,
    borderColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    color: Colors.paper,
    fontWeight: '700',
  },
});
