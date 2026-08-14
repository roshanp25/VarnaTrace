import Purchases, { PurchasesPackage } from 'react-native-purchases';

import { ENTITLEMENT_ID, REVENUECAT_API_KEY } from './config';
import { isEntitlementActive } from './isEntitlementActive';
import { planForPackageType } from './planForPackageType';
import { SubscriptionPlan, SubscriptionPlanOption, SubscriptionService } from './SubscriptionService';

// Configure once, at module load — every method below assumes this has already run. Only ever
// evaluated on native (this file has no web counterpart; see ../index.ts vs ../index.native.ts).
Purchases.configure({ apiKey: REVENUECAT_API_KEY });

async function getCurrentPackages(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

function findPackageForPlan(
  packages: PurchasesPackage[],
  plan: SubscriptionPlan,
): PurchasesPackage | undefined {
  return packages.find((pkg) => planForPackageType(pkg.packageType) === plan);
}

export const revenueCatSubscriptionService: SubscriptionService = {
  async getEntitlementStatus() {
    const customerInfo = await Purchases.getCustomerInfo();
    return { isActive: isEntitlementActive(customerInfo, ENTITLEMENT_ID) };
  },

  async getAvailablePlans() {
    const packages = await getCurrentPackages();
    const options: SubscriptionPlanOption[] = [];
    for (const pkg of packages) {
      const plan = planForPackageType(pkg.packageType);
      if (plan) {
        options.push({ plan, priceString: pkg.product.priceString });
      }
    }
    return options;
  },

  async purchaseSubscription(plan) {
    try {
      const packages = await getCurrentPackages();
      const targetPackage = findPackageForPlan(packages, plan);
      if (!targetPackage) {
        console.error(`purchaseSubscription: no package available for plan "${plan}"`);
        return { success: false };
      }
      const { customerInfo } = await Purchases.purchasePackage(targetPackage);
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
