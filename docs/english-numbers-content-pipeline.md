# English letters & numbers: content pipeline

How the English alphabet and 1-50 numbers tracing data are produced, composed, normalized for
size/alignment, and wired in. Companion to `docs/devanagari-stroke-data.md` — the two pipelines
share the same tracing-tool shape and raw data format, but diverge from there: Hindi uses a
runtime merge layer (`handTracedStrokes.ts`), English/numbers bake final geometry directly into
`letters.json`/`numbers.json` via one-off import scripts instead.

## Status (2026-08-12)

- **26/26 English letters, 50/50 numbers**, all real geometry (no placeholders left).
- Letters: 16 hand-traced (I L T A B D E F G H J K P Q R S), 10 procedurally generated (C M N O
  U V W X Y Z). The hand-traced 16 are letters that went through several rounds of procedural
  tuning that never quite looked right — see [Why some letters are hand-traced](#why-some-letters-are-hand-traced-and-others-arent).
- Numbers: digits 1-9 hand-traced, 0 procedurally generated (needed only as a ones-digit — never
  a standalone 1-50 number, so never traced), two-digit numbers 10-50 composed from the traced/
  generated single digits (see [Composing two-digit numbers](#composing-two-digit-numbers)).
- All English/numbers content is `tier: 'paid'` except `en-i-upper` (I) and `num-1`, carried over
  unexamined from the original scaffolding samples — **not a real decision**, flag before building
  gating around it (see `PRD.md` Section 0's Deviations section).

## How it fits together

```
tools/generate_english_number_strokes.py     (procedural: lines/arcs from geometric primitives)
        │  writes directly
        ▼
src/content/english/letters.json  ┐
src/content/numbers/numbers.json  ┘         (baseline: 10 procedural letters + digit 0 forever;
                                              everything else here gets overwritten below)
        ▲
        │  writes directly (overwrites matching displayLabel only)
        │
tools/import_english_traces.py  ◄── assets/data/english-letters-strokes.json ◄── tools/stroke-tracer-english.html
tools/import_traced_numbers.py  ◄── assets/data/english-numbers-strokes.json ◄── tools/stroke-tracer.html (numbers list)
        │
        │  (import_traced_numbers.py also composes 10-50 from the 1-9 it just imported,
        │   using tools/generate_english_number_strokes.py's digit_strokes(0,...) for the
        │   ones-digit "0")
        ▼
tools/normalize_sizes.py                    (uniform height + centering + digit-pair spacing
                                              + per-digit optical corrections — see below)
        │
        ▼
src/content/index.ts → allCharacters        (what the app actually renders; no runtime merge
                                              step for English/numbers, unlike Hindi)
```

Unlike Hindi, there's **no separate base-content-with-placeholder-fallback layer** for English/
numbers — `letters.json`/`numbers.json` *are* the final data. This means the import and
normalization scripts are **destructive**: re-running them overwrites whatever's currently in
those files for the characters they touch. If you hand-edit `letters.json` directly for some
reason, re-running `normalize_sizes.py` will normalize your edit's bounding box but won't
otherwise protect it — the scripts don't know the difference between "authored by a script" and
"authored by hand."

## The tracing tool

`tools/stroke-tracer-english.html` — a copy of the Hindi `stroke-tracer.html` retargeted for
English letters: same tap-points/draw mechanics, same 1200×1200 canvas, same Copy JSON/Download/
Open-in-new-tab export, but a plain sans-serif guide font instead of Noto Sans Devanagari and a
`LETTERS` array at the top of the script instead of Devanagari vowel/consonant/matra lists —
**edit that one array to change which letters it offers**, nothing else needs touching. Serve it
the same way:

```bash
npx serve tools -l tcp://0.0.0.0:4500
# or, if that's unreliable: python -m http.server 4500 --directory tools
```

For numbers, the user re-used the *existing* Devanagari tracer's export format directly (traced
digits 1-9 through it, not through a dedicated numbers tool) — the raw JSON it produces
(`{digit: [[[x,y],...], ...]}`) is format-compatible regardless of which HTML page generated it,
since both tracers share the same internal representation.

Same workflow gotcha as Hindi: tap **"Finish stroke"** between every real pen-lift, or strokes
get concatenated. Both import scripts below run the same jump/backtrack validator as
`validate_hand_traces.py` before touching any content file, and refuse to import if anything's
flagged.

## Importing traced data

`tools/import_english_traces.py [path/to/export.json]` (defaults to
`assets/data/english-letters-strokes.json`, so re-running with no argument just re-applies
whatever was last imported):
- Validates first (same jump/backtrack check as `validate_hand_traces.py`).
- Saves the raw export into `assets/data/english-letters-strokes.json` (merged/unioned with
  whatever was already there, so importing a partial re-trace of one letter doesn't lose the
  others).
- Scales every traced letter's strokes by a flat 1200→300 factor (no bbox-fit — the tracer's
  guide already centers/sizes every character consistently, so a plain scale preserves that)
  and overwrites that letter's `strokes` in `letters.json`, clearing the "pending visual
  spot-check" placeholder note.
- Only touches letters actually present in the export — tracing 3 of 9 problem letters and
  importing leaves the other 6 as whatever they were before (procedural or previously-traced).

`tools/import_traced_numbers.py [path/to/export.json]` (defaults to
`assets/data/english-numbers-strokes.json`) does the same for digits 1-9, plus the two-digit
composition described next.

## Composing two-digit numbers

Digits 1-9 (traced) and 0 (procedural, via `generate_english_number_strokes.py`'s
`digit_strokes(0, ...)`, re-fit through the same transform as the traced digits so it isn't a
visibly different weight/size) get combined into 10-50 by literally placing two single-digit
stroke sets side by side and writing both into one `CharacterContent.strokes` array (tens digit's
strokes first, then ones digit's). There's no marker in the data for where one digit ends and the
other begins — anything that needs to split them back apart (as `normalize_sizes.py` does) has to
know the tens digit's own stroke *count* ahead of time and slice by that.

## Size/alignment normalization

`tools/normalize_sizes.py` — run after any import, fixes three real problems that showed up
across several rounds of user review. **Read this section before changing the script**; two
approaches below were tried, looked wrong, and were deliberately reverted — re-trying them from
scratch wastes a review cycle.

### 1. Inconsistent height/centering

Hand-traced (and even some procedural) characters don't naturally share a height — heights
ranged from 162 to 228 canvas units across the 26 letters before this pass, and horizontal
centers drifted up to ~20 units off canvas-center for several letters (C, E, J). Fix: for every
letter and standalone digit, compute its own ink bounding box, scale **uniformly** (one factor
for both axes — shape-preserving, never stretched) until the height is exactly `TARGET_HEIGHT`
(180), then translate so the bbox's own midpoint lands exactly on canvas center (150, 150).
Verified directly per-character after the pass (not just spot-checked): every letter and digit
measures height=180.0, center=(150.0, 150.0) exactly.

### 2. Two-digit layout: pack-with-a-gap, not independent half-boxes

**Rejected approach:** center the tens digit in a fixed left half-box and the ones digit in a
fixed right half-box (e.g. x:43-152 and x:148-257). This was the first implementation and looked
fine for medium-width digit pairs, but a *fixed box* centers whatever digit is inside it
regardless of that digit's own width — so a narrow digit (like "1", ~60 wide vs. the ~100-126
range of most others) leaves large empty margins on both sides within its box, while a wide digit
pushes close to its box edges. The result: 11/21/31/41 (paired with narrow "1") read as "far
apart", while 22/32/34 (paired with wider digits) read as "too close" — same root cause, opposite
symptom, because the *visual* gap between the two digits was a side effect of box-fit rather than
a controlled value.

**What's actually in place:** scale both digits to a shared height (computed once, from the
widest real digit pair that actually occurs in 10-50 — not a symmetric worst-case assuming both
digits could simultaneously be the widest one, which would force a shorter, less legible result
than necessary), measure each digit's *resulting* width after that scale, then lay them out with
a **fixed gap between the ink itself** (`DIGIT_GAP = 14`) and center the pair as a whole on the
canvas. This makes the visual gap a direct, checkable constant instead of an emergent property of
box-fitting — verified directly (`min(ones_x) - max(tens_x)`) at exactly 14.0 for every pair
checked, regardless of which digits are involved.

Even this wasn't quite enough for 11-19 specifically: a mathematically-identical 14px gap still
read as more cramped than the same gap elsewhere, because "1"'s thin, sparse shape gives the pair
very little visual anchor on the left before the gap starts — a purely geometric constant doesn't
capture that. Fix: `GAP_WIDTH_REFERENCE`/`GAP_WIDTH_SLOPE` widen the gap specifically based on how
narrow the **tens** digit is (not the ones digit — 21/31/41, where "1" is the ones digit, were
never flagged as too close, so widening symmetrically risked re-breaking those). "1" as a tens
digit now gets a 20px gap instead of 14px; every other pairing is unaffected.

### 3. Per-digit optical corrections (digit 2)

Digit 2 was flagged as "bigger than the others" across two review rounds. The actual data showed
no bug: its height matched every other digit exactly, and it wasn't even the widest digit (4 and
7 both measured wider). Comparing the traced aspect ratios against a real font (Verdana, via
`fontTools`) showed the opposite of the assumption — most of the *other* traced digits (3, 5, 6,
8, 9) were narrower than standard typography, while 2 (and 7) were close to normal. `DIGIT_GAP`
doesn't fix width mismatches between individual digit shapes, only inter-digit spacing, so this
needed a separate, explicit correction: `squeeze_x` narrows digit 2 by a fixed factor (0.92)
around its own horizontal center, bringing its width down to match the tighter group (~109,
matching digit 5) rather than widening five other digits to match 2.

A second, related complaint ("2's base feels lower than its partner's") turned out to also not be
a data bug — pixel-precise verification showed 2's top and bottom coordinates were *exactly*
identical to its paired digit's. It's a well-known typographic optical effect: a flat, wide base
(2's) reads as more "grounded" than a thin, point-like bottom (1's), even at an identical
y-coordinate. **Rejected fix:** shift digit 2 up by a constant amount. This fixed the base
complaint but immediately created a new one — the top now visibly poked above its partner's top,
trading one mismatch for another, since a uniform shift moves both edges equally and only the
base had actually been flagged as wrong. **What's in place instead:** `raise_base` scales
digit 2 vertically anchored at its own *top* edge (which stays exactly fixed) and only pulls the
bottom up, by a factor (0.975) tuned so the base rises ~4-4.5 units without touching the top.

Both `squeeze_x` and `raise_base` are looked up per-digit-label from a `DIGIT_CORRECTIONS` dict at
the top of the script — adding a similar correction for another digit later means adding an entry
there, not duplicating the transform logic.

**Ordering matters if you touch this script:** the per-digit corrections are applied fresh at
each *final* output point (once for the standalone digit, again after a composed pair is
positioned) rather than baked into the shared `digit_source` dict used by both paths. The
composed-number path re-centers each digit via `scale_to_height_centered_at_origin`, which
recomputes the bbox center from scratch — an asymmetric correction (like `raise_base`, which
moves the center) baked in before that step gets silently partially undone by the recentering.
Squeeze doesn't have this problem (a pure width scale composes cleanly through a later uniform
rescale), which is why only `raise_base` needs the "apply at every final output point" treatment.

### Running order

Because the corrections above are computed from each digit's *current* width/height (not from the
original raw trace), re-running `normalize_sizes.py` on already-normalized data will over-apply
the digit-2 corrections (e.g. squeezing an already-squeezed "2" again). Always re-run the import
scripts first to reset to the raw-traced state, then normalize:

```bash
python tools/import_english_traces.py
python tools/import_traced_numbers.py
python tools/normalize_sizes.py
```

## Automated tests

Same generic suite Hindi content runs through — `src/content/__tests__/content.test.ts` and the
first `describe` block of `hindiVowelStrokeData.test.ts` (misleadingly named; it validates
`allCharacters` generically, not just Hindi) cover English/numbers automatically: unique ids,
≥2-point strokes, finite coordinates within 0-300, no duplicate consecutive points. No
English/numbers-specific test file exists — the size/alignment/spacing invariants described above
aren't currently asserted by any test, only verified manually per change (see the numeric checks
throughout this doc's history in git). Worth adding a real test for the "every character has
height 180 ± tolerance, centered ± tolerance" invariant if this pipeline gets touched again.

Run `npx jest` / `npx tsc --noEmit` after any data or wiring change, same as always.

## Why some letters are hand-traced and others aren't

C, M, N, O, U, V, W, X, Y, Z are still procedurally generated (`generate_english_number_strokes.py`
— lines and elliptical arcs from hand-picked geometric parameters) and were never flagged as
wrong, so they were left as-is rather than hand-traced for consistency's sake alone. The other 16
letters went through this rough sequence before landing on hand-tracing:
1. Procedural generation with guessed proportions — several letters (B, D, F, G, K, P, Q, R, S)
   came back "off-center" or "wrong shape" across two review rounds of guessing at better
   parameters.
2. Real-font-derived measurements (via `fontTools`, reading Verdana's actual glyph outlines) —
   fixed the centering complaints precisely (verified: every letter's bbox center landed at
   exactly x=150) but the user's verdict was still "this feels worse" against a reference image
   they'd supplied, presumably because coarse arc/line approximations of a font's curves don't
   reproduce a genuinely natural letterform.
3. Hand-tracing — the user retraced the problem letters directly; this is what's live now for
   those 16, and no further complaints followed.

If more letters ever need fixing, hand-tracing (step 3) is the proven path — don't restart at
step 1 or 2 without a specific reason to.
