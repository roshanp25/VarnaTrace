import { AnalyticsService } from './AnalyticsService';
import { revenueCatAnalyticsService } from './revenueCatAnalyticsService.native';

export type { AnalyticsService } from './AnalyticsService';

/**
 * Metro picks this file (not ./index.ts) for iOS/Android automatically, based on the `.native.ts`
 * extension -- same pattern as ../subscription/index.ts vs index.native.ts.
 */
export const analyticsService: AnalyticsService = revenueCatAnalyticsService;
