/**
 * RevenueCat configuration.
 *
 * Real Apple App Store key (the "appl_" prefix) — routes to the actual App Store, not RevenueCat's
 * simulated Test Store. Real device/TestFlight testing now happens via Apple's own Sandbox
 * environment (sign in with a Sandbox tester Apple ID), which this same key handles automatically
 * alongside production purchases — no separate test key needed once real ASC products exist.
 */
export const REVENUECAT_API_KEY = 'appl_GhnRYcAMUctYKJCyoMVhgkXfrAx';

/**
 * Entitlement identifier configured in the RevenueCat dashboard. Must match exactly — a mismatch
 * doesn't error, it just makes getEntitlementStatus() silently always report inactive.
 */
export const ENTITLEMENT_ID = 'premium';
