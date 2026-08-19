/**
 * Minimal MVP analytics seam. Deliberately narrow: installs are already covered for free by App
 * Store Connect's own analytics (App Units), and purchases are already covered by RevenueCat's
 * dashboard — neither needs any code here. The only two funnel steps with nowhere else to live are
 * these bespoke in-app milestones, which no platform-level tool can see on its own.
 */
export interface AnalyticsService {
  /** Call once, the first time a user ever completes (passes) any trace. */
  recordFirstTraceCompleted(): Promise<void>;
  /** Call each time the paywall screen is shown. */
  recordPaywallViewed(): Promise<void>;
}
