/**
 * Our own entitlement model. Whatever backend implements SubscriptionService (RevenueCat, once
 * it's wired up) maps its own shape into this one — the rest of the app only ever sees this, never
 * a RevenueCat type. Deliberately a small object, not a bare boolean: room to grow (expiry date,
 * product identifier, trial state) without changing every call site again.
 */
export interface SubscriptionStatus {
  isActive: boolean;
}

/**
 * Abstraction over the subscription/entitlement backend — mirrors StorageService's role: features
 * depend on this interface, never on a purchase SDK (RevenueCat or otherwise) directly, so the
 * backend can be swapped without touching feature code. RevenueCat is an implementation detail
 * behind this interface, not something the rest of the app knows exists.
 */
export interface SubscriptionService {
  /** Current entitlement status, computed from whatever the backend knows about renewal/expiry/grace-period state. */
  getEntitlementStatus(): Promise<SubscriptionStatus>;
  /** Starts the purchase flow for the subscription. */
  purchaseSubscription(): Promise<{ success: boolean }>;
  /** Restores a subscription already active on the App Store account (required by Apple for any paid entitlement). */
  restorePurchases(): Promise<{ success: boolean }>;
  /** Sends the user to their platform's subscription-management surface (also an Apple requirement — subscribers must be able to view/cancel easily). */
  openSubscriptionManagement(): Promise<void>;
}
