import { revenueCatSubscriptionService } from './revenueCatSubscriptionService.native';
import { SubscriptionService } from './SubscriptionService';
import { withDevPaywallBypass } from './devPaywallBypass';

export type {
  SubscriptionService,
  SubscriptionStatus,
  SubscriptionPlan,
  SubscriptionPlanOption,
} from './SubscriptionService';

/**
 * Metro picks this file (not ./index.ts) for iOS/Android automatically, based on the `.native.ts`
 * extension — no manual Platform.OS branching needed. ./index.ts (no such extension) remains the
 * file web resolves to, and never imports react-native-purchases.
 */
export const subscriptionService: SubscriptionService = withDevPaywallBypass(
  revenueCatSubscriptionService,
);
