import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { allCharacters } from '../../content';
import { subscriptionService } from '../../services/subscription';
import { Colors } from '../../shared/theme';

/**
 * Reached only after the parental gate is passed. Subscribe/restore call the real
 * `subscriptionService` — on native that's RevenueCat (currently a Test Store key, so nothing
 * here is a real purchase yet); on web it's a fail-closed stub, so both buttons harmlessly report
 * failure there. "Restore Purchases" is a real UI requirement for any paid subscription, not an
 * optional nicety.
 */
export function PaywallScreen() {
  const paidCount = allCharacters.filter((c) => c.tier === 'paid').length;
  const [isActive, setIsActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [lastActionFailed, setLastActionFailed] = useState(false);

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

  async function handleSubscribe() {
    setIsBusy(true);
    setLastActionFailed(false);
    const { success } = await subscriptionService.purchaseSubscription();
    setIsBusy(false);
    setLastActionFailed(!success);
    if (success) {
      setIsActive(true);
    }
  }

  async function handleRestore() {
    setIsBusy(true);
    setLastActionFailed(false);
    const { success } = await subscriptionService.restorePurchases();
    setIsBusy(false);
    setLastActionFailed(!success);
    if (success) {
      setIsActive(true);
    }
  }

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
      <Pressable style={styles.activeButton} onPress={handleSubscribe} disabled={isBusy}>
        <Text style={styles.activeButtonText}>{isBusy ? 'Please wait…' : 'Subscribe'}</Text>
      </Pressable>
      <Pressable style={styles.restoreButton} onPress={handleRestore} disabled={isBusy}>
        <Text style={styles.restoreButtonText}>Restore Purchases</Text>
      </Pressable>
      {lastActionFailed && (
        <Text style={styles.errorText}>That didn&apos;t go through — please try again.</Text>
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
  errorText: {
    fontSize: 13,
    color: Colors.neutralText,
    textAlign: 'center',
    marginTop: 4,
  },
});
