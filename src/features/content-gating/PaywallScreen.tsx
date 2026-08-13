import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { allCharacters } from '../../content';
import { subscriptionService } from '../../services/subscription';
import { Colors } from '../../shared/theme';

/**
 * Reached only after the parental gate is passed. The subscribe/restore buttons are inert —
 * purchasing isn't wired up yet (no RevenueCat account/product exists), so this is a teaser for
 * the real paywall, not the real thing. "Restore Purchases" is present even while inert because
 * it's a real UI requirement for any paid subscription, not an optional nicety to bolt on later.
 *
 * The "already subscribed" branch below is unreachable today (notConfiguredSubscriptionService
 * always reports inactive) but is wired for real against `subscriptionService` — the moment a real
 * backend reports an active entitlement, this screen correctly offers to manage it instead of
 * re-pitching the subscription, with no further changes needed here.
 */
export function PaywallScreen() {
  const paidCount = allCharacters.filter((c) => c.tier === 'paid').length;
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    subscriptionService.getEntitlementStatus().then((status) => {
      if (!cancelled) {
        setIsActive(status.isActive);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You&apos;re subscribed</Text>
        <Text style={styles.body}>Full access to every letter, number, and Hindi character.</Text>
        <Pressable
          style={styles.activeButton}
          onPress={() => {
            subscriptionService.openSubscriptionManagement();
          }}
        >
          <Text style={styles.activeButtonText}>Manage Subscription</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscribe for full access</Text>
      <Text style={styles.body}>
        Get every remaining letter, number, and Hindi character — {paidCount} more to trace.
      </Text>
      <Pressable style={styles.button} disabled>
        <Text style={styles.buttonText}>Coming soon</Text>
      </Pressable>
      <Pressable style={styles.restoreButton} disabled>
        <Text style={styles.restoreButtonText}>Restore Purchases</Text>
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
  activeButton: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: Colors.ink,
  },
  activeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.paper,
  },
  restoreButton: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restoreButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutralMuted,
  },
});
