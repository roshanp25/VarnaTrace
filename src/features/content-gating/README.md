# Content Gating Feature

Determines which content (characters/numbers) is accessible based on free/paid tier, backed by
the real-time subscription entitlement (`src/services/subscription/`) — not a stored unlock flag.

- `access.ts` — pure `isCharacterAccessible(character, isSubscribed)` helper: free characters are
  always accessible, paid ones only while `subscriptionService.getEntitlementStatus()` reports an
  active subscription.
- `PaywallScreen.tsx` — the subscribe/restore screen, with a live plan picker
  (`subscriptionService.getAvailablePlans()`) and a live paid-character count from
  `allCharacters`. Also carries the price/duration/auto-renewal disclosure and Privacy
  Policy/Terms of Use links App Review Guideline 3.1.2 requires on the same screen as the purchase
  button (`docs/privacy-policy.html` served via GitHub Pages; Terms points at Apple's own standard
  EULA).

The actual free/paid split per character lives in `src/content/tiers.ts`, not here — this feature
only enforces whatever that file decides, so the split can change without touching gating logic.

`CategoryGridScreen` is the only current consumer of `isCharacterAccessible`: locked tiles route
straight to `/paywall` (`PaywallScreen.tsx`). There used to be a parental-gate math-challenge screen
in front of it — that was an Apple Kids Category requirement, removed once the app stopped
targeting that category. A real purchase still goes through Apple's own StoreKit confirmation
(Face ID/Touch ID/password) regardless of audience.
