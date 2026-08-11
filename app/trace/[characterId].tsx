import { Stack, useLocalSearchParams } from 'expo-router';

import { getCharacterById } from '../../src/content';
import { TracingScreen } from '../../src/features/tracing';
import { SCRIPT_LABELS } from '../../src/shared/categories';

export default function TraceScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const character = getCharacterById(characterId);

  return (
    <>
      <Stack.Screen options={{ title: character ? SCRIPT_LABELS[character.script] : '' }} />
      <TracingScreen key={characterId} characterId={characterId} />
    </>
  );
}
