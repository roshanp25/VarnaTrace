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

`CategoryGridScreen` is the only current consumer of `isCharacterAccessible`: locked tiles don't
navigate to the tracer, they navigate to `/parental-gate`
(`src/features/parental-gate/`) instead. Passing that gate routes to `PaywallScreen.tsx` here — a
teaser only ("Unlock the full pack", live paid-character count from `allCharacters`), since actual
purchasing isn't wired up: the button is inert ("Coming soon"). That's still separate, not-yet-built
work — `unlockPaidContent()` in `entitlementService.ts` is the seam for it, unused until then.
