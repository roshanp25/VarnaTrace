import { SubscriptionService } from './SubscriptionService';

/**
 * Dev-only paywall bypass, opt-in via a local, gitignored `.env` — never a hardcoded flip. Gated
 * on `__DEV__` (false in any production/release bundle, regardless of what's in the environment)
 * so this can never activate for a real user even if the env var somehow ended up set.
 */
export const isDevPaywallBypassEnabled: boolean =
  __DEV__ && process.env.EXPO_PUBLIC_DEV_BYPASS_PAYWALL === 'true';

/**
 * Wraps a SubscriptionService so `getEntitlementStatus` always reports active while the bypass is
 * enabled — everything else (purchase, restore, plans, management) still hits the real backend
 * unchanged, since only entitlement is what gates content.
 */
export function withDevPaywallBypass(service: SubscriptionService): SubscriptionService {
  if (!isDevPaywallBypassEnabled) {
    return service;
  }
  return {
    ...service,
    async getEntitlementStatus() {
      return { isActive: true };
    },
  };
}
