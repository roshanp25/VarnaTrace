import { SubscriptionPlan } from './SubscriptionService';

/**
 * Maps RevenueCat's PACKAGE_TYPE — compared here as its plain string value, not imported as a
 * runtime enum, so this stays safely unit-testable without importing react-native-purchases at
 * all — to our own plan model. Anything else (Lifetime, custom, weekly, ...) maps to null: this
 * app only sells these two cadences, regardless of what else might be configured in the dashboard.
 */
export function planForPackageType(packageType: string): SubscriptionPlan | null {
  switch (packageType) {
    case 'MONTHLY':
      return 'monthly';
    case 'ANNUAL':
      return 'yearly';
    default:
      return null;
  }
}
