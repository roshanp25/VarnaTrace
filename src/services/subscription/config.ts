/**
 * RevenueCat configuration.
 *
 * This is currently a **Test Store** API key (the "test_" prefix) — it routes purchases through
 * RevenueCat's simulated store, not real Apple purchases. It lets the purchase flow be exercised
 * end-to-end before any real App Store Connect product exists. Replace with the real Apple
 * platform API key from the RevenueCat dashboard once that product is configured and linked, and
 * before shipping to real users.
 */
export const REVENUECAT_API_KEY = 'test_glCpZKefPxnmSqoEnJvwixiKYqx';

/**
 * Entitlement identifier configured in the RevenueCat dashboard. Must match exactly — a mismatch
 * doesn't error, it just makes getEntitlementStatus() silently always report inactive.
 */
export const ENTITLEMENT_ID = 'premium';
