import { notConfiguredSubscriptionService } from '../notConfiguredSubscriptionService';

describe('notConfiguredSubscriptionService', () => {
  it('reports no active entitlement', async () => {
    expect(await notConfiguredSubscriptionService.getEntitlementStatus()).toEqual({
      isActive: false,
    });
  });

  it('reports no available plans', async () => {
    expect(await notConfiguredSubscriptionService.getAvailablePlans()).toEqual([]);
  });

  it('reports purchase as unsuccessful rather than silently succeeding', async () => {
    expect(await notConfiguredSubscriptionService.purchaseSubscription('monthly')).toEqual({
      success: false,
    });
  });

  it('reports restore as unsuccessful rather than silently succeeding', async () => {
    expect(await notConfiguredSubscriptionService.restorePurchases()).toEqual({ success: false });
  });

  it('does not throw when asked to open subscription management with nothing to manage', async () => {
    await expect(notConfiguredSubscriptionService.openSubscriptionManagement()).resolves.toBeUndefined();
  });
});
