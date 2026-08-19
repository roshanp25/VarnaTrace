import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { allCharacters } from '../../content';
import { analyticsService } from '../../services/analytics';
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
 * Reached directly from a locked tile (no parental gate in front of it — that was a Kids Category
 * requirement, removed once the app stopped targeting that category; real purchases still go
 * through Apple's own StoreKit confirmation regardless). Subscribe/restore call the real
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
    void analyticsService.recordPaywallViewed();
  }, []);

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
        <StarIcon />
        <Text style={styles.title}>You&apos;re subscribed</Text>
        <Text style={styles.body}>Full access to every letter, number, and Hindi character.</Text>
        <Pressable
          style={styles.cta}
          onPress={() => {
            subscriptionService.openSubscriptionManagement();
          }}
        >
          <Text style={styles.ctaText}>Manage Subscription</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StarIcon />
      <Text style={styles.title}>Subscribe for full access</Text>
      <Text style={styles.body}>
        Get every remaining letter, number, and Hindi character — {paidCount} more to trace.
      </Text>

      <View style={styles.unlockList}>
        <View style={styles.unlockRow}>
          <CheckDot color={Colors.english} />
          <Text style={styles.unlockText}>Every category unlocked</Text>
        </View>
        <View style={styles.unlockRow}>
          <CheckDot color={Colors.numbers} />
          <Text style={styles.unlockText}>Progress saved automatically</Text>
        </View>
      </View>

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
                {option.plan === 'yearly' && (
                  <View style={styles.planTag}>
                    <Text style={styles.planTagText}>Best value</Text>
                  </View>
                )}
                <Text style={styles.planChipLabel}>{PLAN_LABELS[option.plan]}</Text>
                <Text style={styles.planChipPrice}>{option.priceString}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable style={styles.cta} onPress={handleSubscribe} disabled={isBusy || !selectedPlan}>
        <Text style={styles.ctaText}>{isBusy ? 'Please wait…' : 'Subscribe'}</Text>
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

function StarIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill={Colors.gold} style={{ marginBottom: 4 }}>
      <Path d="M12 2l2.9 6.6L22 9.3l-5 4.9 1.2 7-6.2-3.6L5.8 21 7 14l-5-4.9 7.1-.7z" />
    </Svg>
  );
}

function CheckDot({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill={color}>
      <Circle cx={12} cy={12} r={10} />
    </Svg>
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
    marginBottom: 4,
  },
  unlockList: {
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 8,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unlockText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  planRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  planChip: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: Colors.panel,
    borderWidth: 2,
    borderColor: 'rgba(36,27,69,0.08)',
    alignItems: 'center',
    minWidth: 100,
    position: 'relative',
  },
  planChipSelected: {
    borderColor: Colors.brand,
  },
  planTag: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    backgroundColor: Colors.hindiInk,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  planTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.paper,
  },
  planChipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  planChipPrice: {
    fontSize: 13,
    color: Colors.neutralMuted,
    marginTop: 2,
  },
  cta: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: Colors.brand,
  },
  ctaText: {
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
