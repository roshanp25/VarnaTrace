/**
 * The slice of RevenueCat's CustomerInfo this needs — kept structural/minimal rather than
 * importing the real CustomerInfo type, so this pure logic (and its test) never has to import
 * react-native-purchases itself.
 */
interface EntitlementsSnapshot {
  entitlements: {
    active: Record<string, unknown>;
  };
}

/** Whether the given entitlement id is present in RevenueCat's active-entitlements map. */
export function isEntitlementActive(customerInfo: EntitlementsSnapshot, entitlementId: string): boolean {
  return customerInfo.entitlements.active[entitlementId] !== undefined;
}
