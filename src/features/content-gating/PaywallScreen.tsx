import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
 * App Review Guideline 3.1.2 requires both links to be reachable from the same screen as the
 * purchase button, not just listed in App Store Connect metadata. Terms of Use points at Apple's
 * own standard EULA (https://www.apple.com/legal/internet-services/itunes/dev/stdeula/) rather
 * than a custom one — the app has no terms beyond Apple's own, so there's nothing a custom EULA
 * would add. Privacy Policy is hosted from this repo's docs/ folder via GitHub Pages.
 */
const PRIVACY_POLICY_URL = 'https://roshanp25.github.io/VarnaTrace/privacy-policy.html';
const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/**
 * Reached directly from a locked tile (no parental gate in front of it — that was a Kids Category
 * requirement, removed once the app stopped targeting that category; real purchases still go
 * through Apple's own StoreKit confirmation regardless). Subscribe/restore call the real
 * `subscriptionService` — on native that's RevenueCat, configured with the real production API
 * key, so purchases here are real; on web it's a fail-closed stub, so plans come back empty and
 * both buttons harmlessly report failure there. This app only sells monthly/yearly — a Lifetime package
 * may exist in the RevenueCat dashboard, but `getAvailablePlans()` never surfaces it (see
 * `planForPackageType.ts`). "Restore Purchases" is a real UI requirement for any paid
 * subscription, not an optional nicety.
 */
export function PaywallScreen() {
  const paidCount = allCharacters.filter((c) => c.tier === 'paid').length;
  const [isActive, setIsActive] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
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
      setPlansLoading(false);
      const preferred = options.find((option) => option.plan === 'yearly') ?? options[0];
      setSelectedPlan(preferred?.plan ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedOption = plans.find((option) => option.plan === selectedPlan);

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
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <StarIcon />
      <Text style={styles.title}>Subscribe for full access</Text>
      <Text style={styles.body}>
        Get every remaining letter, number, and Hindi character, {paidCount} more to trace.
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
                {(option.trialDescription ?? option.plan === 'yearly') && (
                  <View style={styles.planTag}>
                    <Text style={styles.planTagText}>
                      {option.trialDescription ?? 'Best value'}
                    </Text>
                  </View>
                )}
                <Text style={styles.planChipLabel}>{PLAN_LABELS[option.plan]}</Text>
                <Text style={styles.planChipPrice}>
                  {option.trialDescription ? `then ${option.priceString}` : option.priceString}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {!plansLoading && plans.length === 0 && (
        <Text style={styles.errorText}>
          Plans aren&apos;t available right now. Check your connection and reopen this screen.
        </Text>
      )}

      <Pressable
        style={[styles.cta, (isBusy || !selectedPlan) && styles.ctaDisabled]}
        onPress={handleSubscribe}
        disabled={isBusy || !selectedPlan}
      >
        <Text style={styles.ctaText}>
          {isBusy
            ? 'Please wait…'
            : plansLoading
              ? 'Loading…'
              : selectedOption?.trialDescription
                ? 'Start Free Trial'
                : 'Subscribe'}
        </Text>
      </Pressable>
      <Pressable style={styles.restoreButton} onPress={handleRestore} disabled={isBusy}>
        <Text style={styles.restoreButtonText}>Restore Purchases</Text>
      </Pressable>
      {lastActionFailed && (
        <Text style={styles.errorText}>That didn&apos;t go through, please try again.</Text>
      )}

      <Text style={styles.renewalNotice}>
        {selectedOption?.trialDescription
          ? `${selectedOption.trialDescription}, then ${selectedOption.priceString}. Auto-renews until canceled. Cancel anytime in Settings.`
          : 'Auto-renews until canceled. Cancel anytime in Settings.'}
      </Text>
      <View style={styles.legalRow}>
        <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.legalSeparator}>·</Text>
        <Pressable onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
          <Text style={styles.legalLink}>Terms of Use</Text>
        </Pressable>
      </View>
    </ScrollView>
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
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  // ScrollView's own `style` may only carry flex/background — alignItems/justifyContent must go
  // on contentContainerStyle (scrollContent below) or RN throws at runtime.
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Used as the Subscribe branch's ScrollView contentContainerStyle instead of `container` above,
  // so the (usually short) content still centers vertically via flexGrow, but can grow taller and
  // actually scroll if content ever overflows the screen.
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
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
  ctaDisabled: {
    opacity: 0.5,
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
  renewalNotice: {
    fontSize: 11,
    color: Colors.neutralMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  legalLink: {
    fontSize: 11,
    color: Colors.neutralText,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 11,
    color: Colors.neutralMuted,
  },
});
