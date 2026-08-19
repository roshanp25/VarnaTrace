# VarnaTrace — Product Requirements Document

Status: **DRAFT — awaiting formal review**, but implementation has proceeded past several open
decisions below via direct confirmation during build sessions — see Section 0.
Last updated: 2026-08-16

App Store listing:
- App Name: ~~VarnaTrace: English & Hindi~~ **Varna Trace: Hindi Writing** (26 chars) — renamed
  2026-08-18, see Section 0 item 24. Positioning narrowed to Hindi specifically (heritage/adult
  angle); English tracing still exists in-app but is no longer in the name.
- Subtitle: ~~Handwriting Tracing for Kids~~ ~~Handwriting Tracing~~ **Write the Hindi you speak**
  (26 chars) — "for Kids" dropped 2026-08-18 alongside exiting Apple's Kids Category (Section 0
  item 23); subtitle rewritten same day toward the heritage-learner angle (Section 0 item 24).

---

## 0. Current Status (read this first)

Living build-progress tracker against Section 7's build sequence. This is the fastest way for a
new session to know what's real vs. still planned — everything below Section 1 is still the
requirements source of truth, but may describe things not built yet.

### Done
1. **Project scaffolding** — Expo + TypeScript, repo/folder structure per Section 4 (`src/engine`, `src/features`, `src/content`, `src/services`).
2. **Storage abstraction** — `src/services/storage/{StorageService.ts,AsyncStorageService.ts}`. Defined and tested, but **not yet consumed by any feature** — nothing needs persistence until gating/parental-gate exist.
3. **Scoring engine (test-first)** — `src/engine/`: `scoreTrace.ts` (single stroke: accuracy + coverage + direction) and `scoreMultiStrokeTrace.ts` (multi-stroke, averages per-stroke scores; whether the character then requires every stroke to individually pass or just the average to clear the threshold is now a difficulty setting — see item 22). Fully unit-tested, zero UI dependencies, per Section 4.
4. **Tracing UI** — `src/features/tracing/`: `TracingCanvas.tsx` (single-stroke SVG canvas, touch + Apple Pencil via `PanResponder`), `MultiStrokeTracingCanvas.tsx` (sequences a character's strokes one at a time), `RewardOverlay.tsx`. Wired into `App.tsx`, which is currently a flat debug-style screen (character picker + canvas) — **not** the real app shell/navigation.
5. **CI** — `.github/workflows/ci.yml` runs typecheck + lint + test on every push/PR.
6. **Content data — all three scripts are now complete (49/49 Hindi, 26/26 English, 50/50 numbers):**
   - Hindi vowels: **13/13** (अ आ इ ई उ ऊ ऋ ए ऐ ओ औ अं अः), real hand-traced stroke data.
   - Hindi consonants: **33/33** (क–ह), real hand-traced stroke data.
   - Hindi conjuncts: **3/3** (क्ष त्र ज्ञ), real hand-traced stroke data.
     `assets/data/devanagari-conjuncts-strokes.json`, wired into
     `handTracedStrokes.ts` and `content/index.ts`'s `files` array the same way vowels/consonants
     are. (Free/paid tier is decided separately — see item 17 below — content JSON files
     themselves no longer carry a `tier` field.)
   - English letters: **26/26** — 16 hand-traced (I L T A B D E F G H J K P Q R S) via a new
     English-specific hand-tracing tool, 10 procedurally generated from geometric primitives
     (C M N O U V W X Y Z, via `tools/generate_english_number_strokes.py`).
   - Numbers: **50/50** — digits 1-9 hand-traced, two-digit numbers 10-50 composed from those
     traced digits (digit 0, needed only as a ones-digit, falls back to a procedural ellipse
     since it wasn't traced), single-digit numbers hand-traced directly.
   - Full detail on how the Hindi data was produced (tooling, validation, what's still manual): **`docs/devanagari-stroke-data.md`**.
   - Full detail on the English/numbers hand-tracing + composition + size-normalization pipeline: **`docs/english-numbers-content-pipeline.md`**.
7. **Hindi text rendering fix** — `Text` components had no explicit `fontFamily`, so Devanagari characters fell back to whatever font the OS/browser picked (inconsistent, and rendered malformed in the web preview). Fixed by bundling `@expo-google-fonts/noto-sans-devanagari` + `expo-font` and applying `NotoSansDevanagari_400Regular` specifically where `character.script === 'hindi'` (English/numbers keep the platform default). Verified in-browser: the font loads (`status: "loaded"`), applies only to Hindi text nodes. **Any new UI that renders Hindi character text needs this same treatment** — don't assume default `Text` styling handles Devanagari.
8. **Real app shell/navigation** — `App.tsx`/`index.ts` are gone; the app now runs on **Expo Router** (`"main": "expo-router/entry"` in `package.json`, `app/` directory, `scheme: "varnatrace"` + `typedRoutes` in `app.json`). Root layout `app/_layout.tsx` loads the Devanagari font once and renders a native-stack `Stack`. Routes: `/` (Home), `/english` `/hindi` `/number` (category grids), `/trace/[characterId]` (single-character tracing), `/parental-gate` `/paywall` (added in item 18).
9. **Design system** — `src/shared/theme.ts` (`Colors` + `getCategoryColors(script)`, three category colors each with `fill`/`soft`/`ink` roles — `ink` exists specifically because a single mid-tone color used as both a soft background and its own text color measures under WCAG AA contrast, verified during this pass) and `src/shared/categories.ts` (`SCRIPT_LABELS`, `SCRIPT_TAGLINES`, `CATEGORY_LABELS`, `CATEGORY_ORDER`) are the single source of truth for script/category display copy and color — new screens should consume these, not hardcode strings/colors.
10. **Home screen** (`src/features/home/HomeScreen.tsx`) — wordmark, three category cards with a real sample glyph and a **live "X of Y traced" count** computed from actual content data (never a hardcoded target) plus `progressService`.
11. **Progress tracking** (`src/features/progress/progressService.ts`, tested) — `getCompletedCharacterIds`/`markCharacterCompleted`, the first real feature-level consumer of `StorageService` (previously built but unused per item 2). Written from `TracingScreen` whenever a trace passes; read by both Home and the category grid via `useFocusEffect` so counts/checkmarks update live on navigating back, no manual refresh.
12. **Category grid screen** (`src/features/category-grid/CategoryGridScreen.tsx`) — replaces the old flat picker. Groups characters by `category` (vowel/consonant/etc.), only showing section headers when a script actually has more than one category present (Hindi does; English/Numbers currently don't, so they render as a flat grid with no special-casing needed). Shows a checkmark badge for completed characters and a lock badge for `tier: 'paid'` characters — see item 17 for enforcement, added later.
13. **Tracing screen redesign** (`src/features/tracing/TracingScreen.tsx`) — single-character screen (character selection now lives entirely in the grid). Canvas sits on a category-tinted circular backdrop, the drawn line uses the category accent color instead of a hardcoded blue, a green start-point dot marks where each stroke begins (hidden once the child starts drawing), and multi-stroke characters show a row of progress dots. **Every one of the 46 real hand-traced Hindi characters is multi-stroke (3–8 strokes)** — this isn't a hypothetical case. `TracingCanvas`/`MultiStrokeTracingCanvas` gained `traceColor` and `onStrokeIndexChange` props to support this; the scoring engine itself is untouched.
14. **Reward screen redesign** (`src/features/tracing/RewardOverlay.tsx`) — varied encouragement copy (a small pool per pass/fail, re-picked each completion) instead of two fixed strings; the raw numeric score is no longer shown to the child (only stars); "Trace Again" (retry) and "Next Letter →" (advances to the next character in the script's list, `router.replace` so the back stack always returns to the grid regardless of how many "next" taps happened; falls back to the grid if there's no next character) replace tap-anywhere-to-dismiss.
15. **Content completion + size normalization (2026-08-12 session)** — English/numbers content
    filled out to 26/26 and 50/50 (see item 6), plus a normalization pass
    (`tools/normalize_sizes.py`) run over every letter and number so they're visually consistent:
    every character's own ink bounding box is uniformly scaled (shape-preserving, no stretching)
    to the same height and centered on its block's midpoint. Two-digit numbers are laid out by
    packing both digits with a fixed gap between their actual ink and centering the pair, rather
    than centering each digit independently in a fixed half-box — the latter made narrow tens
    digits (e.g. "1" in 11-19) look far apart and wide ones collide, since the visual gap
    depended on each digit's own width instead of being controlled directly. A couple of
    digit-specific optical corrections (digit 2's width and a top-anchored base-height reduction)
    are also baked in — see `docs/english-numbers-content-pipeline.md` for the full reasoning,
    including two rejected approaches (an independent-half-box layout, and a uniform vertical
    shift for digit 2) kept there so they aren't retried from scratch.
16. **Tracing screen additions** — faint crosshair grid lines through canvas center in
    `TracingCanvas.tsx` (helps visually verify centering, both for content QA and potentially for
    kids); a skip button (→, next to Clear) on `TracingScreen.tsx` that advances to the next
    character without requiring the current trace to be completed first, reusing the same
    "advance" logic `RewardOverlay`'s "Next Letter" button already had.
17. **Free/paid content gating enforcement (2026-08-12 session)** — the free/paid split moved out
    of the per-character content JSON entirely: `RawCharacterContent` (the JSON shape) has no
    `tier` field anymore, and `src/content/tiers.ts` is now the single place that decides tier —
    a flat `FREE_CHARACTER_IDS` set, applied at load time via `applyTiers()` in
    `src/content/index.ts`. Moving a character between free and paid means editing that one list,
    not hunting through five content files. English/numbers' free tier (previously undecided —
    see the old Deviations note below) is now a real decision: English gets a curated mix (A, I,
    L, O, T) rather than the first few letters, numbers get 1-5 free. Hindi's existing
    vowels-free/consonants-and-conjuncts-paid split carried over unchanged.
    Enforcement itself: `src/features/content-gating/entitlementService.ts` (storage-backed
    `hasUnlockedPaidContent()`/`unlockPaidContent()`, defaults false — `unlockPaidContent()` is
    the seam the future IAP flow will call, not wired to anything yet) and `access.ts`
    (`isCharacterAccessible()`, pure). `CategoryGridScreen` now actually blocks navigation for
    locked tiles instead of just showing the lock badge; tapping one now routes into the real
    parental-gate/paywall flow built in item 18 below (an earlier version of this step showed a
    dismissible inline banner instead, superseded the same session once that flow existed).
18. **Parental gate + paywall teaser (2026-08-12 session)** — completes Step 5 of the UX redesign
    (see below). `src/features/parental-gate/`: `generateChallenge.ts` (pure, tested — random
    two-digit × single-digit multiplication, e.g. "16 × 7") and `ParentalGateScreen.tsx` (numeric
    input; a wrong answer gets a new random problem, no attempt limit — this is a speed bump, not
    security). This is the standard "parental gate" pattern kids apps use to block accidental
    child access to commerce, not a COPPA age-screen (the FTC considers a bare math question
    insufficient for *that*, different purpose — verified via web search before committing to this
    approach, since it's a compliance-adjacent decision). `src/features/content-gating/PaywallScreen.tsx`
    is the teaser reached on success, with a **live** paid-character count
    (`allCharacters.filter(tier === 'paid').length`, never hardcoded). New routes `/parental-gate`
    and `/paywall` (`app/parental-gate.tsx`, `app/paywall.tsx`, registered in `app/_layout.tsx`).
    Locked tiles in `CategoryGridScreen` now `router.push('/parental-gate')`; on success it
    `router.replace`s to `/paywall`. **This gate was removed 2026-08-18 — see item 23** — locked
    tiles route straight to `/paywall` now. **Note for anyone adding a route:** `.expo/types/router.d.ts`
    (typed-routes codegen) is gitignored and only regenerates while the Expo dev server is
    running — a fresh `tsc --noEmit` right after adding a new route file will fail until
    `expo start` (any platform) has run at least once against the new file.
19. **Monetization model switched to subscription (2026-08-12, same session)** — overturns Open
    Decision #2 (originally one-time non-consumable, chosen specifically to avoid renewal/expiry
    complexity). The user wants recurring revenue; price/cadence still TBD. This is a real
    complexity increase (correctly tracking active/expired/grace-period/cross-device state is the
    single easiest thing to get subtly wrong in a subscription app, and Apple review scrutinizes it
    closely), so before writing code this session went through an explicit research pass rather
    than guessing:
    - `react-native-iap` (the PRD's original implied library) turned out to now require **Nitro
      Modules**, unverifiable in this project's browser-only dev loop and a real risk of a broken
      EAS build discovered only after burning build time.
    - `expo-iap` (same maintainer, now the Expo-endorsed path, real Expo Module + New Architecture
      support) is a better-fit alternative if a direct store-API approach is ever revisited — found
      via a second, deeper search after being asked to check more thoroughly.
    - **Decided: RevenueCat**, specifically *because* it's a subscription now — its managed backend
      owns renewal/expiry/grace-period/restore state instead of the app having to get that right
      itself, which matters more for a solo dev than for a one-time purchase. Free up to ~$2,500/mo
      revenue, then a percentage cut. Still needs its own account/setup, on top of Apple Developer
      Program enrollment (neither exists yet — see "Not started").
    - **Architecture: RevenueCat must never leak past one seam.** Per explicit user instruction,
      `src/services/subscription/SubscriptionService.ts` defines the interface
      (`getEntitlementStatus` → our own `SubscriptionStatus` shape, `purchaseSubscription`,
      `restorePurchases`, `openSubscriptionManagement`) and every other file — `access.ts`,
      `CategoryGridScreen`, `PaywallScreen` — depends only on that interface, never on RevenueCat's
      types. `notConfiguredSubscriptionService.ts` is the current default: fails closed (never
      reports active), purchase/restore report failure rather than pretending to succeed,
      `openSubscriptionManagement` no-ops. Swapping in a real RevenueCat-backed implementation
      later is a one-line change in `src/services/subscription/index.ts`.
    - `openSubscriptionManagement()` exists because Apple requires subscribers be able to easily
      view/cancel, same category of requirement as Restore Purchases — not optional to bolt on
      later. `PaywallScreen` already branches on real entitlement status: the "already subscribed →
      show Manage Subscription" path is unreachable today (the stub always reports inactive) but is
      wired for real, so nothing here needs revisiting once RevenueCat is actually plugged in.
    - The old one-time-unlock `entitlementService.ts` (permanent boolean flag) is gone — wrong
      model for something that can lapse. `unlockPaidContent()` no longer exists; don't look for it.
20. **Real RevenueCat SDK wired in (2026-08-13)** — the user completed Apple Developer Program
    enrollment and created a RevenueCat account/project. Installed `react-native-purchases` (core
    SDK only, via `npx expo install` not plain `npm install` — resolves the version compatible
    with this Expo SDK) — **not** `react-native-purchases-ui`, since the custom `PaywallScreen`
    from item 19 stays; confirmed with the user that offerings/entitlements/analytics/sandbox
    testing all work identically without RevenueCat's prebuilt UI, only their paywall-template
    A/B-testing and Customer Center screen require it, and neither is worth losing UI control for
    in a Kids Category app.
    - **The API key currently configured is a Test Store key** (`test_` prefix,
      `src/services/subscription/config.ts`) — routes purchases through RevenueCat's simulated
      store, not real Apple purchases. Needed before shipping: swap in the real Apple platform key
      once a real App Store Connect product is linked in the RevenueCat dashboard.
    - **Entitlement identifier hardcoded as `premium`** (also `config.ts`) — confirmed with the
      user, but this must match the dashboard *exactly*; a mismatch doesn't error, it just makes
      `getEntitlementStatus()` silently always report inactive. Worth a direct dashboard check
      before assuming this integration works, even after a real device build.
    - **A prompt pasted from RevenueCat's own onboarding flow (asking for Lifetime/Yearly/Monthly
      tiers, an entitlement named "Roshan Poojary Pro", and RevenueCat's prebuilt Paywall UI +
      Customer Center) was NOT followed as-is** — it was generic dashboard boilerplate, not a
      deliberate spec, and conflicted with decisions already made this session (subscription-only,
      no Lifetime tier; custom paywall, not RevenueCat's UI). Confirmed the real intent with the
      user before writing anything. Worth remembering if a future session encounters another
      vendor-dashboard-generated prompt: treat it as a starting point to interrogate, not
      instructions to execute directly.
    - **Platform split, critical to not breaking the web dev workflow:**
      `src/services/subscription/index.ts` (no platform suffix) still exports
      `notConfiguredSubscriptionService` and is what Metro resolves for web — untouched from item
      19. New `index.native.ts` exports the real `revenueCatSubscriptionService.native.ts`
      instead, and Metro picks it automatically for iOS/Android based on the `.native.ts`
      extension alone, no `Platform.OS` branching anywhere. `react-native-purchases` is never
      imported by anything web resolves — verified by actually rebundling `expo start --web` after
      the install and confirming no errors, plus the full locked-tile → gate → paywall flow still
      working against the stub (buttons now real, correctly show "That didn't go through" against
      the fail-closed stub rather than silently succeeding).
    - `isEntitlementActive(customerInfo, entitlementId)` (`src/services/subscription/isEntitlementActive.ts`)
      is deliberately pure and typed against a minimal structural shape, not RevenueCat's real
      `CustomerInfo` type — lets it be unit-tested without importing `react-native-purchases` at
      all (which would risk crashing under Jest, a plain Node environment with no native bridge).
      This is the one piece of the real integration that's actually unit-tested; the rest
      (`revenueCatSubscriptionService.native.ts` itself) isn't, deliberately — wrapping a native
      SDK isn't meaningfully unit-testable, and real verification only happens on a device.
    - `PaywallScreen`'s Subscribe/Restore buttons are no longer inert — they call the real service
      and show a busy state + a plain retry message on failure.
    - **Still cannot be tested end-to-end here** — no Expo Go support (native module), no web
      support (platform-split stub used instead), so the first real test of any of this happens
      via an Expo Dev Client / EAS build on the user's own device. Everything up to that point
      (typecheck, lint, all tests, the web-preview walkthrough) is as far as this environment
      can verify.
21. **Real dashboard configured; plan picker built to match (2026-08-13)** — the user completed
    the RevenueCat dashboard setup and, in the process, surfaced a real dashboard state worth
    recording: the "default" offering RevenueCat auto-creates comes with **three** packages
    (Monthly, Yearly, Lifetime), and its auto-created entitlement was named after the account
    ("Roshan Poojary Pro"), not something deliberately chosen. Both got fixed on the dashboard
    side without losing the already-correct package/product setup (predefined `$rc_monthly`/
    `$rc_annual`/`$rc_lifetime` identifiers) — created a new `premium` entitlement, reattached the
    Monthly and Yearly products to it from each product's page, detached/deleted the old
    "Roshan Poojary Pro" entitlement once `premium` was confirmed attached, and left the Lifetime
    *package* with no product attached (harmless — this app doesn't sell it).
    - **Code caught up to match**: `purchaseSubscription()` used to just grab
      `availablePackages[0]`, which was fragile even before this — dashboard ordering isn't
      something to depend on, and would have silently tried to sell whatever came first
      (possibly Lifetime). `SubscriptionService` now has `getAvailablePlans()` returning
      `SubscriptionPlanOption[]` in **our own model** (`SubscriptionPlan = 'monthly' | 'yearly'`,
      never RevenueCat's `PACKAGE_TYPE`), and `purchaseSubscription(plan)` now takes which plan to
      buy. `planForPackageType.ts` (pure, tested) maps RevenueCat's package types to ours by
      comparing against the plain string values ("MONTHLY"/"ANNUAL"), not by importing the real
      `PACKAGE_TYPE` enum — keeps it safely unit-testable without touching
      `react-native-purchases` at all. Anything that isn't Monthly or Annual (Lifetime included)
      maps to `null` and is filtered out — this app only sells two cadences, full stop, regardless
      of what else the dashboard has configured.
    - `PaywallScreen` now shows a real 2-option plan picker (Monthly/Yearly chips with live
      `priceString` pricing from the store) once `getAvailablePlans()` resolves, defaulting to
      yearly if available. On web (the stub, empty array) the picker section doesn't render at
      all and Subscribe stays correctly disabled rather than doing something with no plan
      selected — verified in-browser, no errors, no crash.

22. **Easy/Hard difficulty modes (2026-08-16)** — the scoring engine's leniency (point-to-stencil
    tolerance, max distance, direction-wobble tolerance, pass threshold, 3-star threshold, and the
    multi-stroke pass rule) is now driven by a `Difficulty` setting instead of hardcoded constants,
    plus a new silent-redo mechanic for weak strokes. `src/engine/difficulty.ts` defines
    `DIFFICULTY_CONFIGS`: **easy** (tolerance 14, maxDistance 32, direction-epsilon 6, pass
    threshold 55, 3★ at 80, character passes if the *average* score across strokes clears the
    threshold) and **difficult** (8/20/2/70, 3★ at 90, *every* stroke must individually pass — the
    original behavior, now the non-default option). `scoreTrace`/`scoreMultiStrokeTrace` gained
    `passThreshold`/`requireEveryStrokeToPass` options so difficulty threads through as data, not a
    global constant.
    - **Retry mechanic (easy only):** a stroke scoring below `RETRY_THRESHOLD` (40) gets silently
      discarded and redrawn instead of failing outright — no popup, just a "Try again!" pill that
      fades in on `TracingCanvas` for ~1s. Capped at 3 total attempts per stroke (`maxStrokeAttempts`
      in the config), after which whatever score it gets is accepted. Difficult mode sets
      `retryThreshold: null`, disabling this entirely (`maxStrokeAttempts: 1`).
    - **UI:** `TracingScreen` owns an Easy/Hard toggle rendered above the canvas, threaded into
      `MultiStrokeTracingCanvas` (which resolves the config once at mount — same "captured once,
      remount via `key` to pick up a change" pattern already used for the `strokes` prop) and
      `RewardOverlay` (for star cutoffs). **Deliberately not persisted** — no settings/profile
      screen or global state store exists anywhere in this app yet (confirmed by exploring the
      codebase before building this), so difficulty resets to `DEFAULT_DIFFICULTY` (`'easy'`) every
      time the trace screen mounts. Revisit if/when a real settings surface gets built.
    - Also fixed the reward card's backdrop appearing with an instant cut instead of fading in
      (`RewardOverlay`, `Animated.timing` on opacity) — unrelated polish bundled in the same session.
    - **Guided arrow demo, added the same day after user feedback** that Easy/Hard felt
      indistinguishable to a user despite being meaningfully stricter under the hood — the user
      explicitly asked to gate a new guidance feature to Easy specifically to make the difference
      visible, overriding an initial recommendation to make direction cues difficulty-independent.
      New `src/features/tracing/TraceDemo.tsx`: a small SVG arrowhead travels along each stroke of
      the character in order (constant 700ms per stroke + 250ms pause between strokes, direction
      computed from the resampled path's tangent via `resamplePathByArcLength`, now re-exported
      from `src/engine/index.ts`), before the child can draw. `TracingCanvas` gained a `disabled`
      prop (gates `PanResponder`'s `onStartShouldSetPanResponder`/`onMoveShouldSetPanResponder`) so
      a stray touch can't start a real stroke underneath the demo. `MultiStrokeTracingCanvas` plays
      it automatically on every mount when `difficulty`'s config has `guidedDemo: true` (Easy only;
      `DifficultyConfig.guidedDemo`, false for difficult) — there's no separate imperative "replay"
      API, a caller wanting a replay just remounts via the same `key` mechanism already used for
      switching characters. `TracingScreen` adds a pencil-icon (✏️) button next to Clear/Skip,
      shown only when `DIFFICULTY_CONFIGS[difficulty].guidedDemo` is true, wired to the same
      `reset()` as Clear (replaying the demo is a full restart of the current attempt, not a
      pause/resume).
      **Verification note:** this environment's screenshot tool doesn't render the Browser pane
      (established earlier, see [[varnatrace-project]]'s browser-verification technique), so this
      was verified via console-timestamped logs instead of visual screenshots — confirmed a real
      4-stroke Hindi character's demo fired stroke transitions at +5ms/+975ms/+1935ms/+2896ms/
      +3858ms, matching the coded per-stroke timing exactly (not a stub/no-op). Also confirmed
      in-browser that Hard mode renders neither the arrow overlay nor the pencil button.

23. **Exited Apple's Kids Category; parental gate removed (2026-08-18)** — while discussing the
    reward-popup UX, the user reconsidered the app's positioning: no longer kids-only, should read
    as a general language-learning app adults can use too. Downstream of that, re-examined which
    already-built pieces existed specifically to satisfy Kids Category App Review rules rather than
    general product need. Found one concrete one: the parental gate (item 18's math-challenge
    screen) — its own README said outright "Required for Apple Kids Category compliance." Outside
    that category Apple doesn't require it, and a real purchase already goes through Apple's own
    StoreKit confirmation (Face ID/Touch ID/password) via RevenueCat regardless of audience, so the
    gate was pure redundant friction once the category requirement was gone, not a safeguard being
    given up. **Removed**: `src/features/parental-gate/` (whole directory, `ParentalGateScreen.tsx`
    + `generateChallenge.ts` + its test + README) and the `/parental-gate` route (`app/
    parental-gate.tsx`, and its `Stack.Screen` registration in `app/_layout.tsx`). `CategoryGridScreen`'s
    locked-tile handler now `router.push('/paywall')` directly instead of routing through the gate
    first. `src/features/content-gating/README.md` also had a second, unrelated staleness fixed in
    the same pass while touching this area: it still described an `entitlementService.ts` with
    `hasUnlockedPaidContent()`/`unlockPaidContent()` as if live, but that file was actually removed
    back when monetization switched to subscriptions (item 19) — corrected to describe the real
    current mechanism (`subscriptionService.getEntitlementStatus()` via `access.ts`).
    The "no third-party analytics/ad SDKs" rule (Section 3.4) was also a Kids-Category-specific
    hard requirement, not a general one — nothing currently implements analytics/ads, so there was
    no code to remove, but that constraint is now a choice rather than a compliance mandate if
    revisited later. Section 2's "Built for Apple's Kids Category" framing and Section 3.6's
    parental-gate requirement are the original spec and are left as historical record rather than
    rewritten — Section 0 (this section) is the current-truth layer per this doc's own convention.

**Verified working state as of last check:** typecheck clean, lint clean, engine suite green
(`scoreTrace`, `scoreMultiStrokeTrace`, `difficulty`, 3 new tests for the new options/config).
Manually walked through the Easy/Hard toggle and the guided arrow demo in-browser (see above).
**Not verified in this environment:** the retry mechanic's or the guided demo's actual feel on a
real touch/Pencil trace (needs a device — browser mouse-drag wasn't used to simulate a weak
stroke). Two pre-existing, unrelated test failures exist in `src/content/__tests__/` (a stale
snapshot and a content-data assertion) — confirmed present before this session's changes too, not
touched here.

24. **Launch config: app identity + build profile (2026-08-18)** — working through a pre-launch
    "must fix" checklist one item at a time (app store copy/analytics/conjuncts/RevenueCat still
    pending, tracked separately). This item covers `app.json`/`eas.json`/`package.json` identity
    only. `app.json`: `expo.name` "VarnaTrace-scaffold" → "Varna Trace: Hindi Writing" (matches the
    new App Store name above), `expo.slug` "VarnaTrace-scaffold" → "varna-trace", added
    `ios.bundleIdentifier` and `android.package` = `com.roshanpoojary.varnatrace` (neither was set
    before — first real value). `package.json` name field also renamed off the scaffold placeholder
    to match. New `eas.json` with standard `development`/`preview`/`production` build profiles (no
    EAS project existed yet, so nothing to break by renaming the slug now — would need care if
    changed later, since the slug ties to the EAS project). **Deliberately not done in this pass**:
    production app icon — `PRD.md`'s own "Not started" list already flags icon/splash artwork as
    intentionally out of scope for the MVP build (still default Expo placeholder assets); real
    artwork needs to be supplied or commissioned before that can be wired in, so it's tracked as a
    separate follow-up rather than blocking this config pass. Apple Team ID / App Store Connect
    linkage also not done — `eas.json`'s `submit.production` is an empty stub; that needs the Apple
    Developer Program account credentials entered interactively via `eas` CLI when a real build is
    attempted, not something to hardcode here.

### Not started
- **Real device verification of the RevenueCat integration** — needs an Expo Dev Client or EAS build; nothing about items 20-21 has been exercised on an actual device yet. The dashboard is now correctly configured (entitlement `premium`, Monthly/Yearly products attached, single offering marked current) as far as could be checked from screenshots — first real proof this all actually works is a device build.
- **Swapping the Test Store key for a real Apple key** — needs a real App Store Connect subscription product linked in the RevenueCat dashboard first.
- **Audio** (reward sounds) — not started.
- **App icon/splash artwork, a bundled display font** — the UX redesign (see below) intentionally scoped these out; still using default Expo icon assets and system fonts at bold weights as a placeholder for the mockup's rounded display face.

### UX redesign session (2026-08-11)
A separate pass audited the pre-redesign flat `App.tsx` screen against professional UX standards, produced five mockup screens (Home, category grid, tracing, reward, paywall teaser — not persisted in-repo, they were review artifacts), and implemented four of them one at a time as Steps 1–4 above (items 8–14). **Step 5 — content-gating enforcement, the parental gate, and the paywall teaser — is now fully done (items 17-21), including a real (Test-Store-backed) purchase flow with a proper plan picker.**

### Deviations from this document worth knowing about
- **Section 3.6's free/paid split** described "a curated mix" (a few vowels + a few consonants + numbers 1–10), deliberately *not* split along script/category lines, so the free tier would show quality across both scripts. **What actually shipped: Hindi is a straight category split (all 13 vowels free, all 33 consonants + 3 conjuncts paid; decided 2026-08-11), while English and numbers ended up closer to the original "curated mix" intent — English gets 5 letters spread across the alphabet (A, I, L, O, T) rather than the first few, numbers get 1-5 free (decided 2026-08-12, alongside building gating enforcement — see item 17).** The split for every character now lives in one place, `src/content/tiers.ts`, specifically so it can be revisited without a content-file hunt if it turns out wrong once real users see it.
- **Open Decision #4 (stencil authoring)** ended up being a hybrid of the two options it posed: a custom in-repo hand-tracing tool (`tools/stroke-tracer.html` for Hindi, `tools/stroke-tracer-english.html` for English letters — same tool, different character list/font) that the user runs themselves — served locally (`npx serve tools` or `python -m http.server`) and used from a phone over wifi — rather than an external vector tool, traced font glyphs, or AI-generated coordinates. Two secondary approaches were tried and superseded for specific cases: auto-extraction from Wikimedia Commons stroke-order SVGs (still in the repo, `tools/devanagari/import_stroke_order.py`, used for one Hindi vowel's fallback base only) and procedural geometry generation (`tools/generate_english_number_strokes.py`, still actually in use for 10 of the 26 English letters — see item 6 above — after hand-tracing repeatedly out-performed it on proportion/centering issues that took several review rounds to pin down). See `docs/devanagari-stroke-data.md` and `docs/english-numbers-content-pipeline.md` for why and how.

### Where to look next
- **Real device verification of the RevenueCat integration** is the natural next step — see "Not started" above. The dashboard should now be correctly configured (see item 21); this needs an Expo Dev Client / EAS build to actually prove it.
- `src/services/subscription/` — `SubscriptionService.ts` (the interface, including `SubscriptionPlan`/`SubscriptionPlanOption`), `config.ts` (API key + entitlement id — currently a Test Store key), `planForPackageType.ts` (the only place Monthly/Yearly-only is enforced), `index.ts` vs `index.native.ts` (the web/native platform split — read the comments in both before changing either, since getting this wrong risks breaking the web dev workflow).
- `src/content/tiers.ts` — the single free/paid list; edit this to move a character between tiers.
- `docs/devanagari-stroke-data.md` — the Hindi stroke-data pipeline in full: the hand-tracing tool workflow, the validation/repair tooling, data provenance, and (now done) how the conjuncts were added.
- `docs/english-numbers-content-pipeline.md` — the English/numbers pipeline: the hand-tracing tool, the two import scripts, and the size-normalization pass, including the reasoning behind several rejected approaches (worth reading before touching `tools/normalize_sizes.py`, so a fix already tried and reverted doesn't get retried).
- `tools/devanagari/` — Python tooling: `validate_hand_traces.py` (checks hand-traced data for the "forgot to click Finish Stroke" bug pattern, now also covers `devanagari-conjuncts-strokes.json`), `repair_hand_traces.py` (heuristic auto-split + debug visualization, requires visual approval before use), `generate_content_entries.py` (adds `CharacterContent` entries for characters that have trace data but no content entry yet), `import_stroke_order.py`/`svg_path.py`/`geometry.py` (the earlier, now-secondary Wikimedia SVG pipeline).
- `tools/stroke-tracer-english.html` / `import_english_traces.py` / `import_traced_numbers.py` / `normalize_sizes.py` — the English/numbers equivalent of the Devanagari pipeline above.
- `src/content/handTracedStrokes.ts` — where hand-traced data (`assets/data/devanagari-{vowels,consonants,conjuncts}-strokes.json`) gets merged over the base content JSON at runtime. English/numbers don't use this runtime-merge pattern — their hand-traced data is baked directly into `letters.json`/`numbers.json` by the import scripts instead, since (unlike Hindi) there's no separate "base content with placeholder fallback" layer for them.

---

## 1. Open Decisions (flagged for your review — nothing below is final)

I asked clarifying questions before drafting this but didn't get answers back, so I picked reasonable defaults and marked them here. Please confirm or override each one when you review this doc — everything downstream (architecture section especially) assumes these defaults unless you say otherwise.

| # | Decision | Default assumed | Why | Alternative |
|---|----------|-----------------|-----|-------------|
| 1 | Tech stack | **React Native + Expo, built via EAS Build** | You already named EAS Build as an option, you want TypeScript throughout, you're on Windows with no Xcode, and you're not a senior engineer — Expo's managed workflow minimizes native-config pain and EAS Build compiles iOS in the cloud with almost no local setup. | Bare React Native + Codemagic (more native control, more complexity), or native Swift via Codemagic (best performance/Pencil latency, but no TypeScript and a much steeper solo-dev learning curve). |
| 2 | Monetization | ~~One-time non-consumable IAP~~ **Overturned 2026-08-12 — subscription instead, via RevenueCat.** Price/cadence TBD. | Original reasoning (avoid renewal/expiry complexity) still holds as a real cost, but the user wants recurring revenue; RevenueCat's managed backend absorbs most of that complexity instead of it landing on the app. See Section 0, item 19 for the architecture (`SubscriptionService` interface, RevenueCat never leaks past it) and the library research behind the choice. | — |
| 3 | Audio scope | **Generic reward sounds only for MVP** (chime/cheer on completion), no per-character pronunciation audio | Avoids needing to record/source ~105 clean audio clips (49 Hindi + 26 English + 50 numbers, likely in more than one voice) before you can ship anything. | Per-character pronunciation audio — clearly valuable for a learning app, but treat as a fast-follow once the core mechanic is proven, not an MVP blocker. |
| 4 | Stencil path authoring | **You hand-author/source the path data** (e.g. via a vector tool, traced font glyphs, or AI-assisted generation), delivered as coordinate data that I wire into the content JSON schema | No in-app authoring tool needed for MVP; keeps scope on the tracing engine, not tooling. | I build a small dev-only stencil-authoring screen so you can draw/export paths inside the app's own workflow — more upfront scope, possibly faster iteration long-term. |

If any of these are wrong, tell me and I'll update this doc before we touch code.

---

## 2. Product Summary

VarnaTrace is an offline, iPad-first tracing app that teaches UKG-age (5–6 year old) Indian preschoolers to handwrite the English alphabet, the Hindi varnamala, and numbers 1–50, using deterministic path-matching (not ML/handwriting recognition) to score how well a child traces a predefined stencil.

Target platform: iPadOS only (no iPhone-specific UI in MVP). ~~Built for Apple's Kids Category, which drives several hard constraints (no ads, no third-party analytics, no accounts, parental gate before any commerce).~~ **No longer targeting Kids Category as of 2026-08-18 — see Section 0 item 23.** This was the original spec's positioning; kept here as historical record.

---

## 3. MVP Scope

### 3.1 Content

- **English alphabet:** A–Z, 26 letters (uppercase; lowercase explicitly out of scope for MVP unless you say otherwise — flag if wrong).
- **Hindi varnamala:**
  - 13 vowels (स्वर): अ आ इ ई उ ऊ ऋ ए ऐ ओ औ अं अः
  - 33 consonants (व्यंजन): क through ह
  - 3 conjunct consonants (संयुक्ताक्षर): क्ष त्र ज्ञ
  - ≈49 characters total
- **Numbers:** 1–50
- **Age band:** UKG only. No other age bands in MVP.

### 3.2 Core Mechanic

- Each character/number has a **predefined stencil path** (ordered coordinate data representing the correct stroke path).
- The app tracks raw touch/pencil points as the child traces.
- Scoring is **pure deterministic geometry**:
  - Distance-from-path (how far off the stencil the traced points fall)
  - Path coverage percentage (how much of the stencil was actually traced)
- Explicitly **not** ML / handwriting recognition. Keep it that way for MVP — do not introduce a model-based scorer without checking with me first.
- Both **finger touch** and **Apple Pencil** input must be supported.

### 3.3 Feedback

- Simple reward feedback on completion: stars, sound, animation.
- No leaderboards, no social features, no progress dashboards (dashboards explicitly out of scope, see 3.5).

### 3.4 Offline & Compliance

- Fully offline. All content (stencil data, images, audio) bundled in the app binary.
- No backend, no user accounts/authentication.
- No third-party analytics SDKs, no ad SDKs. This is a hard requirement for Apple Kids Category eligibility, not a nice-to-have.

### 3.5 Explicitly Out of Scope for MVP

Do not build any of the following without checking in first:
- Cursive or multiple handwriting styles
- Custom/user-defined word lists
- Teacher or classroom mode
- Progress dashboards or analytics-facing reports
- Additional languages beyond English + Hindi
- iPhone-specific UI/layout optimization
- Authentication or user accounts
- Lowercase English letters (pending confirmation)
- Per-character pronunciation audio (see Open Decision #3)

### 3.6 Free / Paid Content Split

- **Free tier:** a curated mix — a few vowels + a few consonants + numbers 1–10. Deliberately not "just the first N in each set," so the free tier demonstrates quality across both scripts (English shapes + Devanagari shapes) before asking for payment.
- **Paid tier:** remaining content (full 49 Hindi characters, full A–Z, numbers 11–50), unlocked via IAP (see Open Decision #2).
- ~~**Parental gate:** a simple challenge (e.g. solve a basic math problem) must be passed before the user can reach *any* purchase/paywall screen. Required for Kids Category compliance — not optional, not a UX nicety.~~ Built, then removed 2026-08-18 once Kids Category targeting was dropped — see Section 0 item 23. Real purchases still go through Apple's own StoreKit confirmation.

---

## 4. Architecture Requirements

These are constraints on *how* we build, meant to prevent tech debt as content and features grow later (e.g. adding a third language, or a real backend).

- **Language:** TypeScript throughout — no untyped JS files.
- **Content separation:** Character stencil paths and metadata live in **versioned JSON data files**, fully decoupled from UI/engine code. Adding a new language later should mean "add a data file," never "touch the tracing engine or UI components."
- **Storage abstraction:** All local persistence goes through a `StorageService` interface. Components and features never call `AsyncStorage` (or any storage primitive) directly. This is what lets us swap in a real backend later without a rewrite.
- **Scoring engine isolation:** The stencil-scoring module is pure logic with **zero UI dependencies**. It must be testable by feeding it coordinate arrays and asserting a score — no app, no simulator, no rendering required.
- **Folder structure:** Feature-based (e.g. `features/tracing/`, `features/content-gating/`, `features/parental-gate/`), not a single flat `components/` dump.
- **CI:** A GitHub Actions workflow runs lint + tests on every push, set up early — doesn't need to be fancy, just needs to exist so nothing silently breaks as we go.

---

## 5. Testing Approach

- **Scoring engine: test-first (TDD).** Before implementation, define test cases with known-good traces (should score high) and known-bad traces (off-path, incomplete, backwards direction — should score low). Implement the engine to pass those tests.
- **UI and content-gating logic: not TDD'd at this stage.** These will be tested manually and via TestFlight with real users. Do not over-invest in automated UI tests yet — that's a deliberate scope call, not an oversight.

---

## 6. Build & Distribution

- Development machine: Windows, no local Mac/Xcode.
- iOS builds run through a cloud build service — **EAS Build**, assuming the React Native + Expo stack in Open Decision #1. (If we end up on a different stack, this section needs to change to Codemagic instead.)
- Distribution to real devices for testing: TestFlight.

---

## 7. Proposed Build Sequence

Confirmed order, one step at a time — after each step, stop and wait for review before moving to the next:

1. ✅ **Project scaffolding** — repo, TypeScript config, folder structure, base dependencies.
2. ✅ **Storage abstraction layer** — `StorageService` interface + a concrete implementation. Now consumed by `progressService` (see Section 0, item 11).
3. ✅ **Scoring engine (test-first)** — define known-good/known-bad trace test cases, then implement the pure scoring module to pass them.
4. ✅ **Tracing UI** — the canvas/interaction layer that captures touch/Pencil input and renders stencils, wired to the scoring engine.
5. 🟡 **Content data** — English + Hindi character JSON data sets (stencil paths + metadata), per Open Decision #4. Hindi vowels + consonants done (46/49); Hindi conjuncts, full English alphabet, full 1–50 numbers still to do. See Section 0.
6. ✅ **Free/paid content gating** — done, Section 0 items 17-18. Tier decided centrally (`src/content/tiers.ts`), locked tiles blocked and routed into the parental gate.
7. ✅ ~~Parental gate~~ — built (Section 0 item 18, math-challenge screen before the paywall teaser), then **removed 2026-08-18** once the app stopped targeting Apple's Kids Category (Section 0 item 23) — it existed specifically for that category's App Review requirement.

Flag to me if you think a different order makes more sense — one candidate worth considering: building the parental gate *before* content gating, since content gating's paywall screen depends on it existing. I've kept your original order above since it's still logically valid (gate can be a stub during step 6 and wired for real in step 7), but wanted to surface the dependency.

---

## 8. Next Step

This document is the checkpoint. Please review, correct any of the Open Decisions in Section 1 (or anything else), and confirm before we start Step 1 (project scaffolding).
