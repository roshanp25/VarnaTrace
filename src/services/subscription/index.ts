import { notConfiguredSubscriptionService } from './notConfiguredSubscriptionService';
import { SubscriptionService } from './SubscriptionService';

export type { SubscriptionService, SubscriptionStatus } from './SubscriptionService';

/**
 * This is the **web** entry point — Metro resolves `index.native.ts` instead for iOS/Android,
 * where the real RevenueCat-backed service now lives (`revenueCatSubscriptionService.native.ts`).
 * react-native-purchases is a native module with no web implementation, so web intentionally keeps
 * using this fail-closed stub rather than ever importing it.
 */
export const subscriptionService: SubscriptionService = notConfiguredSubscriptionService;
