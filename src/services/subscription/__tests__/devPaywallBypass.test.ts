import { SubscriptionService } from '../SubscriptionService';

const fakeService: SubscriptionService = {
  async getEntitlementStatus() {
    return { isActive: false };
  },
  async getAvailablePlans() {
    return [{ plan: 'monthly', priceString: '$4.99' }];
  },
  async purchaseSubscription() {
    return { success: true };
  },
  async restorePurchases() {
    return { success: true };
  },
  async openSubscriptionManagement() {},
};

describe('withDevPaywallBypass', () => {
  const originalEnv = process.env.EXPO_PUBLIC_DEV_BYPASS_PAYWALL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_DEV_BYPASS_PAYWALL = originalEnv;
    jest.resetModules();
  });

  it('passes the real service through unchanged when the env var is unset', async () => {
    delete process.env.EXPO_PUBLIC_DEV_BYPASS_PAYWALL;
    jest.resetModules();
    const { withDevPaywallBypass } = require('../devPaywallBypass');

    const wrapped = withDevPaywallBypass(fakeService);

    expect(wrapped).toBe(fakeService);
    await expect(wrapped.getEntitlementStatus()).resolves.toEqual({ isActive: false });
  });

  it('forces entitlement active when the env var is set to "true"', async () => {
    process.env.EXPO_PUBLIC_DEV_BYPASS_PAYWALL = 'true';
    jest.resetModules();
    const { withDevPaywallBypass } = require('../devPaywallBypass');

    const wrapped = withDevPaywallBypass(fakeService);

    await expect(wrapped.getEntitlementStatus()).resolves.toEqual({ isActive: true });
  });

  it('leaves every other method pointed at the real service while bypassed', async () => {
    process.env.EXPO_PUBLIC_DEV_BYPASS_PAYWALL = 'true';
    jest.resetModules();
    const { withDevPaywallBypass } = require('../devPaywallBypass');

    const wrapped = withDevPaywallBypass(fakeService);

    await expect(wrapped.getAvailablePlans()).resolves.toEqual([{ plan: 'monthly', priceString: '$4.99' }]);
    await expect(wrapped.purchaseSubscription('monthly')).resolves.toEqual({ success: true });
    await expect(wrapped.restorePurchases()).resolves.toEqual({ success: true });
  });

  it('ignores any value other than the exact string "true"', async () => {
    process.env.EXPO_PUBLIC_DEV_BYPASS_PAYWALL = '1';
    jest.resetModules();
    const { withDevPaywallBypass } = require('../devPaywallBypass');

    const wrapped = withDevPaywallBypass(fakeService);

    await expect(wrapped.getEntitlementStatus()).resolves.toEqual({ isActive: false });
  });
});
