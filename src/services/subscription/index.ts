import { notConfiguredSubscriptionService } from './notConfiguredSubscriptionService';
import { SubscriptionService } from './SubscriptionService';

export type { SubscriptionService, SubscriptionStatus } from './SubscriptionService';

/**
 * Swap this for a RevenueCat-backed implementation once react-native-purchases is installed and
 * configured (see PRD Section 0) — everything downstream depends on the interface, not this line.
 * RevenueCat's own types never leak past that implementation.
 */
export const subscriptionService: SubscriptionService = notConfiguredSubscriptionService;
