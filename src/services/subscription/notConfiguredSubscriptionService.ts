import { SubscriptionService } from './SubscriptionService';

/**
 * Default SubscriptionService until RevenueCat is actually wired up (needs a RevenueCat account +
 * an Apple Developer Program enrollment + a configured subscription product — none of which exist
 * yet). Fails closed: never reports an active entitlement, and purchase/restore are no-ops that
 * report failure rather than silently pretending to succeed. `PaywallScreen`'s buttons stay inert
 * ("Coming soon") against this implementation.
 */
export const notConfiguredSubscriptionService: SubscriptionService = {
  async getEntitlementStatus() {
    return { isActive: false };
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
