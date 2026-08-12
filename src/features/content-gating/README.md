# Content Gating Feature

Determines which content (characters/numbers) is accessible based on free/paid tier, backed by
`StorageService`.

- `entitlementService.ts` — storage-backed `hasUnlockedPaidContent()` / `unlockPaidContent()`.
  Defaults to not-unlocked; nothing currently calls `unlockPaidContent()` — that's the seam the
  future IAP purchase flow will call into once it exists.
- `access.ts` — pure `isCharacterAccessible(character, hasUnlockedPaidContent)` helper: free
  characters are always accessible, paid ones only once unlocked.

The actual free/paid split per character lives in `src/content/tiers.ts`, not here — this feature
only enforces whatever that file decides, so the split can change without touching gating logic.

`CategoryGridScreen` is the only current consumer: locked tiles don't navigate to the tracer and
instead show a dismissible inline banner. There's no paywall/purchase screen yet — that (plus the
parental gate required to reach it) is separate, not-yet-built work.
