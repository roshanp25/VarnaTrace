import { SubscriptionService } from './SubscriptionService';

/**
 * Fail-closed SubscriptionService: never reports an active entitlement or available plans, and
 * purchase/restore report failure rather than silently pretending to succeed. This is what web
 * resolves to (see ../index.ts vs ../index.native.ts) — react-native-purchases has no web
 * implementation, so web intentionally never attempts to use it.
 */
export const notConfiguredSubscriptionService: SubscriptionService = {
  async getEntitlementStatus() {
    return { isActive: false };
  },
  async getAvailablePlans() {
    return [];
  },
  async purchaseSubscription() {
    return { success: false };
  },
  async restorePurchases() {
    return { success: false };
  },
  async openSubscriptionManagement() {
    // No-op: nothing to manage until a real subscription exists.
  },
};
