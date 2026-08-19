import Purchases from 'react-native-purchases';

import '../subscription';
import { AnalyticsService } from './AnalyticsService';

// The `../subscription` import above is for its side effect only (calling Purchases.configure()
// at module load) -- guarantees the SDK is configured before setAttributes runs below,
// regardless of which module happens to load first at app startup.

/**
 * Tags the current RevenueCat customer profile with these MVP funnel milestones as subscriber
 * attributes -- visible/filterable in RevenueCat's dashboard without a second analytics SDK.
 * Deliberately rough (a customer property, not a proper funnel chart) -- revisit with a real
 * analytics tool once there's actual install volume to make that worthwhile.
 */
export const revenueCatAnalyticsService: AnalyticsService = {
  async recordFirstTraceCompleted() {
    await Purchases.setAttributes({ first_trace_completed_at: new Date().toISOString() });
  },
  async recordPaywallViewed() {
    await Purchases.setAttributes({ paywall_last_viewed_at: new Date().toISOString() });
  },
};
