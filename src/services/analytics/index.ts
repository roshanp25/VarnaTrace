import { AnalyticsService } from './AnalyticsService';

export type { AnalyticsService } from './AnalyticsService';

/**
 * Web entry point — Metro resolves index.native.ts instead for iOS/Android, where the real
 * RevenueCat-attribute-backed implementation lives (see ../subscription/index.ts vs
 * index.native.ts for the same pattern). No-op here since there's no web analytics need for this
 * app.
 */
export const analyticsService: AnalyticsService = {
  async recordFirstTraceCompleted() {},
  async recordPaywallViewed() {},
};
