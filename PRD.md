# VarnaTrace — Product Requirements Document

Status: **DRAFT — awaiting review**
Last updated: 2026-08-09

App Store listing:
- App Name: **VarnaTrace: English & Hindi** (27 chars)
- Subtitle: **Handwriting Tracing for Kids** (28 chars)

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

1. **Project scaffolding** — repo, TypeScript config, folder structure, base dependencies.
2. **Storage abstraction layer** — `StorageService` interface + a concrete implementation.
3. **Scoring engine (test-first)** — define known-good/known-bad trace test cases, then implement the pure scoring module to pass them.
4. **Tracing UI** — the canvas/interaction layer that captures touch/Pencil input and renders stencils, wired to the scoring engine.
5. **Content data** — English + Hindi character JSON data sets (stencil paths + metadata), per Open Decision #4.
6. **Free/paid content gating** — logic that determines which content is accessible, backed by `StorageService`.
7. **Parental gate** — the math-challenge (or similar) screen that must be passed before reaching any paywall.

Flag to me if you think a different order makes more sense — one candidate worth considering: building the parental gate *before* content gating, since content gating's paywall screen depends on it existing. I've kept your original order above since it's still logically valid (gate can be a stub during step 6 and wired for real in step 7), but wanted to surface the dependency.

---

## 8. Next Step

This document is the checkpoint. Please review, correct any of the Open Decisions in Section 1 (or anything else), and confirm before we start Step 1 (project scaffolding).
