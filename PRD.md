# VarnaTrace — Product Requirements Document

Status: **DRAFT — awaiting formal review**, but implementation has proceeded past several open
decisions below via direct confirmation during build sessions — see Section 0.
Last updated: 2026-08-12

App Store listing:
- App Name: **VarnaTrace: English & Hindi** (27 chars)
- Subtitle: **Handwriting Tracing for Kids** (28 chars)

---

## 0. Current Status (read this first)

Living build-progress tracker against Section 7's build sequence. This is the fastest way for a
new session to know what's real vs. still planned — everything below Section 1 is still the
requirements source of truth, but may describe things not built yet.

### Done
1. **Project scaffolding** — Expo + TypeScript, repo/folder structure per Section 4 (`src/engine`, `src/features`, `src/content`, `src/services`).
2. **Storage abstraction** — `src/services/storage/{StorageService.ts,AsyncStorageService.ts}`. Defined and tested, but **not yet consumed by any feature** — nothing needs persistence until gating/parental-gate exist.
3. **Scoring engine (test-first)** — `src/engine/`: `scoreTrace.ts` (single stroke: accuracy + coverage + direction) and `scoreMultiStrokeTrace.ts` (multi-stroke; a character only "passes" if *every* stroke individually passes). Fully unit-tested, zero UI dependencies, per Section 4.
4. **Tracing UI** — `src/features/tracing/`: `TracingCanvas.tsx` (single-stroke SVG canvas, touch + Apple Pencil via `PanResponder`), `MultiStrokeTracingCanvas.tsx` (sequences a character's strokes one at a time), `RewardOverlay.tsx`. Wired into `App.tsx`, which is currently a flat debug-style screen (character picker + canvas) — **not** the real app shell/navigation.
5. **CI** — `.github/workflows/ci.yml` runs typecheck + lint + test on every push/PR.
6. **Content data — all three scripts are now complete (49/49 Hindi, 26/26 English, 50/50 numbers):**
   - Hindi vowels: **13/13** (अ आ इ ई उ ऊ ऋ ए ऐ ओ औ अं अः), real hand-traced stroke data, `tier: free`.
   - Hindi consonants: **33/33** (क–ह), real hand-traced stroke data, `tier: paid`.
   - Hindi conjuncts: **3/3** (क्ष त्र ज्ञ), real hand-traced stroke data, `tier: paid` (matching the
     consonants convention — not an explicit decision, worth confirming if the free/paid split
     ever gets revisited). `assets/data/devanagari-conjuncts-strokes.json`, wired into
     `handTracedStrokes.ts` and `content/index.ts`'s `files` array the same way vowels/consonants
     are.
   - English letters: **26/26** — 16 hand-traced (I L T A B D E F G H J K P Q R S) via a new
     English-specific hand-tracing tool, 10 procedurally generated from geometric primitives
     (C M N O U V W X Y Z, via `tools/generate_english_number_strokes.py`).
   - Numbers: **50/50** — digits 1-9 hand-traced, two-digit numbers 10-50 composed from those
     traced digits (digit 0, needed only as a ones-digit, falls back to a procedural ellipse
     since it wasn't traced), single-digit numbers hand-traced directly.
   - Full detail on how the Hindi data was produced (tooling, validation, what's still manual): **`docs/devanagari-stroke-data.md`**.
   - Full detail on the English/numbers hand-tracing + composition + size-normalization pipeline: **`docs/english-numbers-content-pipeline.md`**.
7. **Hindi text rendering fix** — `Text` components had no explicit `fontFamily`, so Devanagari characters fell back to whatever font the OS/browser picked (inconsistent, and rendered malformed in the web preview). Fixed by bundling `@expo-google-fonts/noto-sans-devanagari` + `expo-font` and applying `NotoSansDevanagari_400Regular` specifically where `character.script === 'hindi'` (English/numbers keep the platform default). Verified in-browser: the font loads (`status: "loaded"`), applies only to Hindi text nodes. **Any new UI that renders Hindi character text needs this same treatment** — don't assume default `Text` styling handles Devanagari.
8. **Real app shell/navigation** — `App.tsx`/`index.ts` are gone; the app now runs on **Expo Router** (`"main": "expo-router/entry"` in `package.json`, `app/` directory, `scheme: "varnatrace"` + `typedRoutes` in `app.json`). Root layout `app/_layout.tsx` loads the Devanagari font once and renders a native-stack `Stack`. Routes: `/` (Home), `/english` `/hindi` `/number` (category grids), `/trace/[characterId]` (single-character tracing).
9. **Design system** — `src/shared/theme.ts` (`Colors` + `getCategoryColors(script)`, three category colors each with `fill`/`soft`/`ink` roles — `ink` exists specifically because a single mid-tone color used as both a soft background and its own text color measures under WCAG AA contrast, verified during this pass) and `src/shared/categories.ts` (`SCRIPT_LABELS`, `SCRIPT_TAGLINES`, `CATEGORY_LABELS`, `CATEGORY_ORDER`) are the single source of truth for script/category display copy and color — new screens should consume these, not hardcode strings/colors.
10. **Home screen** (`src/features/home/HomeScreen.tsx`) — wordmark, three category cards with a real sample glyph and a **live "X of Y traced" count** computed from actual content data (never a hardcoded target) plus `progressService`.
11. **Progress tracking** (`src/features/progress/progressService.ts`, tested) — `getCompletedCharacterIds`/`markCharacterCompleted`, the first real feature-level consumer of `StorageService` (previously built but unused per item 2). Written from `TracingScreen` whenever a trace passes; read by both Home and the category grid via `useFocusEffect` so counts/checkmarks update live on navigating back, no manual refresh.
12. **Category grid screen** (`src/features/category-grid/CategoryGridScreen.tsx`) — replaces the old flat picker. Groups characters by `category` (vowel/consonant/etc.), only showing section headers when a script actually has more than one category present (Hindi does; English/Numbers currently don't, so they render as a flat grid with no special-casing needed). Shows a checkmark badge for completed characters and a **lock badge for `tier: 'paid'` characters — informational only, tiles stay fully tappable**, since gating enforcement (item below) isn't built yet.
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

**Verified working state as of last check:** typecheck clean, lint clean, 665 tests passing across 7 suites (includes per-character hand-traced-data validation tests plus `progressService` tests). Manually walked through in-browser: Home → category grid → tracing → reward → next-letter, including the multi-stroke sequence and the end-of-list fallback, plus the new skip button and grid lines. A good baseline to build on from a fresh session.

### Not started
- **Free/paid content gating enforcement (Section 3.6 / build step 6)** — the data model (`tier: 'free'|'paid'`, `getFreeCharacters()` in `src/content/index.ts`) and the **visual** lock badge (item 12 above) both exist now, but nothing actually blocks access — every tile, locked or not, still opens the tracer. `src/features/content-gating/` is still just a placeholder README. Content is now fully authored (item 6), so this is the natural next step.
- **Parental gate** — not started. `src/features/parental-gate/` is currently just a placeholder README. The reward screen's "Next Letter" flow and the grid's lock badges were both built with this in mind (see the UX session notes below) but don't call into anything yet.
- **IAP / purchase flow** — not started (blocked on the two items above).
- **Audio** (reward sounds) — not started.
- **App icon/splash artwork, a bundled display font** — the UX redesign (see below) intentionally scoped these out; still using default Expo icon assets and system fonts at bold weights as a placeholder for the mockup's rounded display face.

### UX redesign session (2026-08-11)
A separate pass audited the pre-redesign flat `App.tsx` screen against professional UX standards, produced five mockup screens (Home, category grid, tracing, reward, paywall teaser — not persisted in-repo, they were review artifacts), and implemented four of them one at a time as Steps 1–4 above (items 8–14). **Step 5 — real content-gating enforcement + the paywall teaser + parental gate — is intentionally not built yet**; it's the same work already listed as "Not started" above, now with the visual groundwork (lock badges, category colors, the reward screen's flow) in place to build it against. Pick up there next.

### Deviations from this document worth knowing about
- **Section 3.6's free/paid split** described "a curated mix" (a few vowels + a few consonants + numbers 1–10), deliberately *not* split along script/category lines, so the free tier would show quality across both scripts. **What actually shipped in the data is a straight category split: all 13 vowels free, all 33 consonants paid.** Decided directly with the user during the 2026-08-11 content session — simpler to reason about, but a real change from the original plan. Hindi conjuncts (added 2026-08-12) followed the consonants convention (`tier: paid`) by default, not an explicit decision. **English letters and numbers are currently ALL `tier: paid` except `en-i-upper` (displayLabel "I") and `num-1`** (carried over from the original scaffolding samples — verified directly against the JSON, not assumed) — this was never discussed with the user and is very likely wrong once gating actually gets built; flag it explicitly rather than assuming it's intentional. If/when the gating screen gets built, use the Hindi split as-is, but get real direction on English/numbers first; update this doc once that's settled.
- **Open Decision #4 (stencil authoring)** ended up being a hybrid of the two options it posed: a custom in-repo hand-tracing tool (`tools/stroke-tracer.html` for Hindi, `tools/stroke-tracer-english.html` for English letters — same tool, different character list/font) that the user runs themselves — served locally (`npx serve tools` or `python -m http.server`) and used from a phone over wifi — rather than an external vector tool, traced font glyphs, or AI-generated coordinates. Two secondary approaches were tried and superseded for specific cases: auto-extraction from Wikimedia Commons stroke-order SVGs (still in the repo, `tools/devanagari/import_stroke_order.py`, used for one Hindi vowel's fallback base only) and procedural geometry generation (`tools/generate_english_number_strokes.py`, still actually in use for 10 of the 26 English letters — see item 6 above — after hand-tracing repeatedly out-performed it on proportion/centering issues that took several review rounds to pin down). See `docs/devanagari-stroke-data.md` and `docs/english-numbers-content-pipeline.md` for why and how.

### Where to look next
- **Content gating enforcement** is the natural next build step now that all content is authored — see "Not started" above.
- `docs/devanagari-stroke-data.md` — the Hindi stroke-data pipeline in full: the hand-tracing tool workflow, the validation/repair tooling, data provenance, and (now done) how the conjuncts were added.
- `docs/english-numbers-content-pipeline.md` — the English/numbers pipeline: the hand-tracing tool, the two import scripts, and the size-normalization pass, including the reasoning behind several rejected approaches (worth reading before touching `tools/normalize_sizes.py`, so a fix already tried and reverted doesn't get retried).
- `tools/devanagari/` — Python tooling: `validate_hand_traces.py` (checks hand-traced data for the "forgot to click Finish Stroke" bug pattern, now also covers `devanagari-conjuncts-strokes.json`), `repair_hand_traces.py` (heuristic auto-split + debug visualization, requires visual approval before use), `generate_content_entries.py` (adds `CharacterContent` entries for characters that have trace data but no id/tier yet), `import_stroke_order.py`/`svg_path.py`/`geometry.py` (the earlier, now-secondary Wikimedia SVG pipeline).
- `tools/stroke-tracer-english.html` / `import_english_traces.py` / `import_traced_numbers.py` / `normalize_sizes.py` — the English/numbers equivalent of the Devanagari pipeline above.
- `src/content/handTracedStrokes.ts` — where hand-traced data (`assets/data/devanagari-{vowels,consonants,conjuncts}-strokes.json`) gets merged over the base content JSON at runtime. English/numbers don't use this runtime-merge pattern — their hand-traced data is baked directly into `letters.json`/`numbers.json` by the import scripts instead, since (unlike Hindi) there's no separate "base content with placeholder fallback" layer for them.

---

## 1. Open Decisions (flagged for your review — nothing below is final)

I asked clarifying questions before drafting this but didn't get answers back, so I picked reasonable defaults and marked them here. Please confirm or override each one when you review this doc — everything downstream (architecture section especially) assumes these defaults unless you say otherwise.

| # | Decision | Default assumed | Why | Alternative |
|---|----------|-----------------|-----|-------------|
| 1 | Tech stack | **React Native + Expo, built via EAS Build** | You already named EAS Build as an option, you want TypeScript throughout, you're on Windows with no Xcode, and you're not a senior engineer — Expo's managed workflow minimizes native-config pain and EAS Build compiles iOS in the cloud with almost no local setup. | Bare React Native + Codemagic (more native control, more complexity), or native Swift via Codemagic (best performance/Pencil latency, but no TypeScript and a much steeper solo-dev learning curve). |
| 2 | Monetization | **One-time non-consumable IAP** ("unlock full content") | Simpler to implement (no receipt renewal/expiry logic), simpler for parents to understand, and typical for this category of kids' educational app. | Subscription — more recurring revenue potential but real added complexity (restore purchases, expiry, grace periods) that's hard to justify for a single-mechanic app. |
| 3 | Audio scope | **Generic reward sounds only for MVP** (chime/cheer on completion), no per-character pronunciation audio | Avoids needing to record/source ~105 clean audio clips (49 Hindi + 26 English + 50 numbers, likely in more than one voice) before you can ship anything. | Per-character pronunciation audio — clearly valuable for a learning app, but treat as a fast-follow once the core mechanic is proven, not an MVP blocker. |
| 4 | Stencil path authoring | **You hand-author/source the path data** (e.g. via a vector tool, traced font glyphs, or AI-assisted generation), delivered as coordinate data that I wire into the content JSON schema | No in-app authoring tool needed for MVP; keeps scope on the tracing engine, not tooling. | I build a small dev-only stencil-authoring screen so you can draw/export paths inside the app's own workflow — more upfront scope, possibly faster iteration long-term. |

If any of these are wrong, tell me and I'll update this doc before we touch code.

---

## 2. Product Summary

VarnaTrace is an offline, iPad-first tracing app that teaches UKG-age (5–6 year old) Indian preschoolers to handwrite the English alphabet, the Hindi varnamala, and numbers 1–50, using deterministic path-matching (not ML/handwriting recognition) to score how well a child traces a predefined stencil.

Target platform: iPadOS only (no iPhone-specific UI in MVP). Built for Apple's Kids Category, which drives several hard constraints (no ads, no third-party analytics, no accounts, parental gate before any commerce).

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
- **Parental gate:** a simple challenge (e.g. solve a basic math problem) must be passed before the user can reach *any* purchase/paywall screen. Required for Kids Category compliance — not optional, not a UX nicety.

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
6. ⬜ **Free/paid content gating** — logic that determines which content is accessible, backed by `StorageService`. Data model (`tier` field) and an informational lock badge on paid tiles both exist (Section 0, item 12); no actual enforcement/paywall UI yet — locked tiles still open the tracer.
7. ⬜ **Parental gate** — the math-challenge (or similar) screen that must be passed before reaching any paywall.

Flag to me if you think a different order makes more sense — one candidate worth considering: building the parental gate *before* content gating, since content gating's paywall screen depends on it existing. I've kept your original order above since it's still logically valid (gate can be a stub during step 6 and wired for real in step 7), but wanted to surface the dependency.

---

## 8. Next Step

This document is the checkpoint. Please review, correct any of the Open Decisions in Section 1 (or anything else), and confirm before we start Step 1 (project scaffolding).
