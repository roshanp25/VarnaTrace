import Purchases from 'react-native-purchases';

import { ENTITLEMENT_ID, REVENUECAT_API_KEY } from './config';
import { isEntitlementActive } from './isEntitlementActive';
import { SubscriptionService } from './SubscriptionService';

// Configure once, at module load — every method below assumes this has already run. Only ever
// evaluated on native (this file has no web counterpart; see ../index.ts vs ../index.native.ts).
Purchases.configure({ apiKey: REVENUECAT_API_KEY });

export const revenueCatSubscriptionService: SubscriptionService = {
  async getEntitlementStatus() {
    const customerInfo = await Purchases.getCustomerInfo();
    return { isActive: isEntitlementActive(customerInfo, ENTITLEMENT_ID) };
  },

  async purchaseSubscription() {
    try {
      const offerings = await Purchases.getOfferings();
      const currentPackage = offerings.current?.availablePackages[0];
      if (!currentPackage) {
        console.error('purchaseSubscription: no package available on the current offering');
        return { success: false };
      }
      const { customerInfo } = await Purchases.purchasePackage(currentPackage);
      return { success: isEntitlementActive(customerInfo, ENTITLEMENT_ID) };
    } catch (error) {
      console.error('purchaseSubscription failed', error);
      return { success: false };
    }
  },

  async restorePurchases() {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return { success: isEntitlementActive(customerInfo, ENTITLEMENT_ID) };
    } catch (error) {
      console.error('restorePurchases failed', error);
      return { success: false };
    }
  },

  async openSubscriptionManagement() {
    await Purchases.showManageSubscriptions();
  },
};
