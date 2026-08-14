import { isEntitlementActive } from '../isEntitlementActive';

describe('isEntitlementActive', () => {
  it('is true when the entitlement id is present in the active map', () => {
    const customerInfo = { entitlements: { active: { premium: {} } } };
    expect(isEntitlementActive(customerInfo, 'premium')).toBe(true);
  });

  it('is false when the active map is empty', () => {
    const customerInfo = { entitlements: { active: {} } };
    expect(isEntitlementActive(customerInfo, 'premium')).toBe(false);
  });

  it('is false when a different entitlement is active but not the one asked about', () => {
    const customerInfo = { entitlements: { active: { other: {} } } };
    expect(isEntitlementActive(customerInfo, 'premium')).toBe(false);
  });
});
