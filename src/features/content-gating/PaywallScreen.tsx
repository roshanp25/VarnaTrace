import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { allCharacters } from '../../content';
import {
  subscriptionService,
  SubscriptionPlan,
  SubscriptionPlanOption,
} from '../../services/subscription';
import { Colors } from '../../shared/theme';

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
};

/**
 * Reached only after the parental gate is passed. Subscribe/restore call the real
 * `subscriptionService` — on native that's RevenueCat (currently a Test Store key, so nothing
 * here is a real purchase yet); on web it's a fail-closed stub, so plans come back empty and both
 * buttons harmlessly report failure there. This app only sells monthly/yearly — a Lifetime package
 * may exist in the RevenueCat dashboard, but `getAvailablePlans()` never surfaces it (see
 * `planForPackageType.ts`). "Restore Purchases" is a real UI requirement for any paid
 * subscription, not an optional nicety.
 */
export function PaywallScreen() {
  const paidCount = allCharacters.filter((c) => c.tier === 'paid').length;
  const [isActive, setIsActive] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [lastActionFailed, setLastActionFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    subscriptionService.getEntitlementStatus().then((status) => {
      if (!cancelled) {
        setIsActive(status.isActive);
      }
    });
    subscriptionService.getAvailablePlans().then((options) => {
      if (cancelled) {
        return;
      }
      setPlans(options);
      const preferred = options.find((option) => option.plan === 'yearly') ?? options[0];
      setSelectedPlan(preferred?.plan ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubscribe() {
    if (!selectedPlan) {
      return;
    }
    setIsBusy(true);
    setLastActionFailed(false);
    const { success } = await subscriptionService.purchaseSubscription(selectedPlan);
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

      {plans.length > 0 && (
        <View style={styles.planRow}>
          {plans.map((option) => {
            const selected = option.plan === selectedPlan;
            return (
              <Pressable
                key={option.plan}
                style={[styles.planChip, selected && styles.planChipSelected]}
                onPress={() => setSelectedPlan(option.plan)}
                disabled={isBusy}
              >
                <Text style={[styles.planChipLabel, selected && styles.planChipLabelSelected]}>
                  {PLAN_LABELS[option.plan]}
                </Text>
                <Text style={[styles.planChipPrice, selected && styles.planChipLabelSelected]}>
                  {option.priceString}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        style={styles.activeButton}
        onPress={handleSubscribe}
        disabled={isBusy || !selectedPlan}
      >
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
  planRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  planChip: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: Colors.neutralBg,
    alignItems: 'center',
    minWidth: 100,
  },
  planChipSelected: {
    backgroundColor: Colors.ink,
  },
  planChipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.neutralText,
  },
  planChipPrice: {
    fontSize: 13,
    color: Colors.neutralMuted,
    marginTop: 2,
  },
  planChipLabelSelected: {
    color: Colors.paper,
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
