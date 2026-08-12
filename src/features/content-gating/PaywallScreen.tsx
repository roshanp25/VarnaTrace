import { Pressable, StyleSheet, Text, View } from 'react-native';

import { allCharacters } from '../../content';
import { Colors } from '../../shared/theme';

/**
 * Reached only after the parental gate is passed. Purchasing isn't wired up yet (no IAP flow
 * exists), so the button is inert — this is a teaser for the real paywall, not the real thing.
 */
export function PaywallScreen() {
  const paidCount = allCharacters.filter((c) => c.tier === 'paid').length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock the full pack</Text>
      <Text style={styles.body}>
        Get every remaining letter, number, and Hindi character — {paidCount} more to trace.
      </Text>
      <Pressable style={styles.button} disabled>
        <Text style={styles.buttonText}>Coming soon</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.ink,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: Colors.neutralText,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: Colors.neutralBg,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutralMuted,
  },
});
