# Devanagari stroke-order tracing data

How the real (non-placeholder) Devanagari tracing paths in the app are produced, validated, and
wired in — and how to add the characters that are still missing.

## Status (2026-08-11)

- **46/49 Hindi characters done**: all 13 vowels (अ आ इ ई उ ऊ ऋ ए ऐ ओ औ अं अः) and all 33 consonants (क–ह), each with real hand-traced stroke data, validated, and confirmed rendering/scoring correctly in the live app.
- **Not done**: the 3 conjunct consonants (क्ष त्र ज्ञ). No content entries or trace data exist for them yet — see [Adding a character](#adding-a-character-eg-the-conjuncts).
- Primary data-production method is now **hand-tracing** (this doc's main subject). An earlier **Wikimedia SVG auto-extraction** pipeline exists and still works, but is secondary — see [Appendix](#appendix-the-earlier-wikimedia-svg-pipeline).

## How it fits together

```
tools/stroke-tracer.html                 (you trace letters on a phone/tablet)
        │  export → paste/save
        ▼
assets/data/devanagari-vowels-strokes.json       }  raw, 1200×1200 canvas,
assets/data/devanagari-consonants-strokes.json   }  keyed by character
        │
        │  tools/devanagari/validate_hand_traces.py  (read-only sanity check)
        │  tools/devanagari/repair_hand_traces.py     (heuristic fix-up, needs visual approval)
        ▼
src/content/handTracedStrokes.ts          (normalizes 1200→300, merges over base content)
        │
        ▼
src/content/index.ts → allCharacters      (what the app actually renders)
        │
        ▼
src/content/hindi/{vowels,consonants}.json   (base id/tier/category — placeholder strokes,
                                               always overridden by the above when present)
```

A character needs **two separate things** before it works in the app, and it's easy to have one
without the other:
1. A raw entry in one of the `assets/data/devanagari-*-strokes.json` files (the geometry).
2. A `CharacterContent` entry in `src/content/hindi/{vowels,consonants}.json` (the `id`/`tier`/`category`/`displayLabel` — what makes the app aware the character exists at all). Without this, trace data just sits there unused; no error, the character simply never appears.

## The tracing tool

`tools/stroke-tracer.html` — a single self-contained HTML file (no build step, no dependencies).
Serve it locally so it's usable from a phone/tablet on the same wifi:

```bash
npx serve tools -l tcp://0.0.0.0:4500
```

Then open `http://<your-computer's-LAN-IP>:4500/stroke-tracer` from the device. Two tracing modes
("Tap points" and "Draw"); traces every character over the same centered guide glyph rendered on a
fixed 1200×1200 canvas. Export via Copy JSON / Download / Open in new tab (Download can be
unreliable inside a sandboxed iframe — e.g. if this is ever re-opened as a Claude.ai artifact
instead of served locally — Copy JSON is the reliable fallback).

**The one workflow mistake that matters:** you must tap **"Finish stroke"** between every real
pen-lift. If you don't, multiple strokes (or a retrace) end up concatenated into a single stroke
array. This happened twice during initial data production — see
[Validating hand-traced data](#validating-hand-traced-data) for how it's caught.

## Validating hand-traced data

`tools/devanagari/validate_hand_traces.py` — read-only, checks both
`assets/data/devanagari-*-strokes.json` files for:
- the "forgot Finish stroke" signature: a point that both (a) jumps an unusually large distance
  from the previous point *and* (b) lands close to some *earlier, non-adjacent* point in the same
  stroke (i.e. it backtracks into already-covered territory). Both conditions are required — a
  large jump alone isn't suspicious, since "Tap points" mode legitimately places just two taps
  across a long straight segment (checked and confirmed: an earlier version of this validator
  flagged those as false positives).
- degenerate strokes (fewer than 2 points).
- non-finite or out-of-canvas (outside ~0–1200) coordinates.

Run it after tracing any new character:

```bash
python tools/devanagari/validate_hand_traces.py
```

If something's flagged, either re-trace that character (now that you know the "Finish stroke"
mistake to avoid), or try the repair tool below.

## Repairing flagged data

`tools/devanagari/repair_hand_traces.py` — heuristic, **never touches the live app**. Splits a
flagged stroke at its detected jump points, drops short fragments that look like pure retraces
(every point in the fragment lands within 40 units of an already-kept fragment), and writes:
- `development/hand-trace-repair/devanagari-strokes.proposed.json` — the proposed fix.
- `development/hand-trace-repair/repair-report.json` — exactly what it split/dropped and why.
- `development/debug/hand-trace-repair-U+XXXX.svg` (one per character) — solid numbered lines are
  proposed kept strokes, dashed gray is what got dropped.

Reads from `assets/data/devanagari-stroke-traces.json` (the tracer tool's default download
filename) by default — adjust `RAW_FILE` at the top of the script if your export landed somewhere
else. **Always open the debug SVG and actually look at it before using the proposed data** — the
heuristic doesn't know what the character is supposed to look like, only that a jump-then-backtrack
happened. It correctly reconstructed अ (3 strokes: hook, connector+vertical, flag) and confirmed
आ was under-split (needed a manual re-trace) — see git history around 2026-08-10/11 for the actual
before/after if you want a worked example.

## Wiring: how trace data reaches the app

`src/content/handTracedStrokes.ts`:
- `normalizeHandTracedStroke(points, viewBoxSize)` — scales a stroke from the tracer's fixed
  1200×1200 canvas to the app's 0–300 stencil space (`TracingCanvas`'s `DEFAULT_VIEW_BOX_SIZE`), a
  plain uniform scale (no re-centering — every character was traced over the same centered guide,
  so none is needed). Also strips exact-duplicate consecutive points (an accidental double-tap
  produces a zero-length segment, which the schema treats as invalid — this happened once, in अः,
  and is now handled automatically rather than requiring a source-file edit).
- `applyHandTracedStrokes(characters, viewBoxSize)` — for every Hindi character, looks up
  `raw[character.displayLabel]` across the merged vowels+consonants data; if found and non-empty,
  overrides that character's `strokes` (and `note`) at runtime. No entry → character is returned
  unchanged (its `hindi/*.json` base value, typically a trivial placeholder — see below).

Called once, at module load, from `src/content/index.ts`.

## Content entries (`id`/`tier`/`category`)

`tools/devanagari/generate_content_entries.py` — one-off generator, safe to re-run (only adds
entries whose `id` doesn't already exist). Used to create the 45 entries for every vowel/consonant
besides अ (which already had a real entry from the earlier Wikimedia pipeline). Its `strokes` field
is a trivial 2-point placeholder — always overridden at runtime by `applyHandTracedStrokes` as long
as the character's raw trace data exists, so the placeholder is only a schema-satisfying fallback,
never actually shown.

id convention: `hi-vowel-<translit>` / `hi-consonant-<translit>`, e.g. `hi-vowel-aa`,
`hi-consonant-ka`. Retroflex consonants (ट ठ ड ढ ण) are disambiguated from their dental
counterparts (त थ द ध न), which would otherwise transliterate identically, by doubling the first
consonant letter: `hi-consonant-tta` (ट) vs `hi-consonant-ta` (त), `hi-consonant-nna` (ण) vs
`hi-consonant-na` (न), etc. श vs ष similarly: `hi-consonant-sha` vs `hi-consonant-shha`.

Tier: all vowels `free`, all consonants `paid` — see `PRD.md` Section 0 for why this differs from
the PRD's original "curated mix" plan.

## Automated tests

`src/content/__tests__/`:
- `hindiVowelStrokeData.test.ts` — generic geometry validity (finite coordinates, within the
  0–300 canvas, no zero-length duplicate points, no degenerate strokes) runs across **every**
  character in `allCharacters`, not just Hindi — so it automatically covers all 46 hand-traced
  characters plus a locked-in snapshot specifically for अ.
- `handTracedStrokes.test.ts` — unit tests for `normalizeHandTracedStroke` (scaling, dedup) and
  `applyHandTracedStrokes` (override behavior, script isolation).

Run `npx jest` / `npx tsc --noEmit` after any data or wiring change.

## Adding a character (e.g. the conjuncts)

1. Trace it in `tools/stroke-tracer.html`, remembering "Finish stroke" between every real pen-lift.
2. Export and add/update its entry in the relevant `assets/data/devanagari-*-strokes.json` (a new
   `devanagari-conjuncts-strokes.json` would need the same treatment as vowels/consonants got in
   `handTracedStrokes.ts` — merge it in alongside the other two imports).
3. `python tools/devanagari/validate_hand_traces.py` — fix or repair anything flagged.
4. Add a `CharacterContent` entry (extend `generate_content_entries.py`'s character list and
   re-run, or hand-add to the relevant `hindi/*.json` — conjuncts would need a new
   `src/content/hindi/conjuncts.json`, wired into `src/content/index.ts`'s `files` array the same
   way `consonants.json` was).
5. `npx jest` — a new snapshot will be created for it automatically via the generic validity suite; no per-character test is required unless you want the same locked-in-geometry treatment अ got.
6. Load the app (`npx expo start --web` or the real device) and actually look at it and trace it.

## Appendix: the earlier Wikimedia SVG pipeline

Before hand-tracing, अ alone was produced by auto-extracting centerlines from a
[Wikimedia Commons stroke-order SVG](https://commons.wikimedia.org/wiki/File:Devanagari_%E0%A4%85_stroke_order.svg)
(CC BY-SA 3.0, author Saurmandal). That data is **no longer what's live** — अ's live data is the
3-stroke hand-traced version — but the pipeline and its output are still in the repo:

- `tools/devanagari/import_stroke_order.py` + `svg_path.py` + `geometry.py` — parses the SVG's
  frame-by-frame stroke-reveal structure, extracts centerlines from filled calligraphic outlines
  via boundary-chain nearest-point pairing, and writes directly into `hindi/vowels.json` (this is
  अ's *base* value — the one that gets overridden by hand-traced data at runtime; it's a real,
  usable fallback, not a dummy placeholder, in case the hand-traced entry is ever removed).
- `src/content/hindi/source-attribution.json` — CC BY-SA provenance for that base value. **The
  licensing question this file flags (does derived centerline data trigger ShareAlike?) was never
  resolved** — moot for अ specifically now that its *live* data is hand-traced (yours, not
  Wikimedia-derived), but if this pipeline is ever used again for another character, get a real
  legal answer before shipping it in a commercial build.
- `development/source-data/wikimedia-devanagari/` — cached source SVG, not shipped.
- `development/debug/a-stroke-order-debug.svg` — its debug visualization.

Why it was superseded: it worked (अ's auto-extracted version was correct and shipped-quality), but
hand-tracing turned out simpler to scale across 46+ characters — no per-character algorithm
tuning, no licensing question, and the "Finish stroke" validation problem it introduced was easy
to detect and fix automatically, unlike SVG extraction issues which needed source-specific
geometric reasoning per shape.
