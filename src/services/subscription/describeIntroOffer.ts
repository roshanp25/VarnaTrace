/**
 * Structural shape matching RevenueCat's `PurchasesIntroPrice`, kept minimal and locally-declared
 * (not imported from react-native-purchases) so this stays unit-testable without importing the
 * native module, mirroring `planForPackageType`'s and `isEntitlementActive`'s approach.
 */
interface IntroPriceLike {
  price: number;
  periodUnit: string;
  periodNumberOfUnits: number;
}

function pluralize(unit: string, count: number): string {
  const lower = unit.toLowerCase();
  return count === 1 ? lower : `${lower}s`;
}

/**
 * Describes a free-trial introductory offer for display on the paywall, e.g. "7 days free".
 * Returns null when there's no introductory offer, or when it's a paid intro price rather than a
 * free trial — this app only ever configures free trials in App Store Connect, not discounted
 * intro pricing, so anything with a non-zero price is treated as not applicable here.
 */
export function describeIntroOffer(introPrice: IntroPriceLike | null): string | null {
  if (!introPrice || introPrice.price !== 0) {
    return null;
  }
  const { periodNumberOfUnits, periodUnit } = introPrice;
  return `${periodNumberOfUnits} ${pluralize(periodUnit, periodNumberOfUnits)} free`;
}
