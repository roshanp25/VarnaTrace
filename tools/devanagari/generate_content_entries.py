"""One-off generator for src/content/hindi/{vowels,consonants}.json entries.

Creates a CharacterContent entry (id/category/displayLabel) for every
character that has hand-traced data in assets/data/devanagari-*-strokes.json
but doesn't yet have a content entry. The `strokes` field here is a trivial
placeholder — every one of these characters has real hand-traced data, so
applyHandTracedStrokes (src/content/handTracedStrokes.ts) overrides it at
runtime unconditionally. It only exists to satisfy the schema (>=1 stroke,
>=2 points) as a fallback for the (currently hypothetical) case where a
character's hand-traced entry is ever removed.

Entries carry no "tier" field — free vs paid is decided centrally in
src/content/tiers.ts, not per-character in this content JSON.

Run once; re-running is safe (it only adds entries whose id doesn't already
exist in the target file, never overwrites/duplicates).

Usage:
    python tools/devanagari/generate_content_entries.py
"""
from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
VOWELS_FILE = REPO_ROOT / "src" / "content" / "hindi" / "vowels.json"
CONSONANTS_FILE = REPO_ROOT / "src" / "content" / "hindi" / "consonants.json"

PLACEHOLDER_STROKES = [[[50, 50], [250, 250]]]
PLACEHOLDER_NOTE = (
    "Placeholder fallback shape only. Real geometry comes from the hand-traced source data "
    "(assets/data/devanagari-vowels-strokes.json / devanagari-consonants-strokes.json) via "
    "applyHandTracedStrokes at runtime -- this value is never shown as long as that entry exists."
)

# (character, id slug) -- excludes अ, which already has a real (hand-traced) entry.
VOWELS = [
    ("आ", "aa"), ("इ", "i"), ("ई", "ii"), ("उ", "u"), ("ऊ", "uu"), ("ऋ", "ri"),
    ("ए", "e"), ("ऐ", "ai"), ("ओ", "o"), ("औ", "au"), ("अं", "am"), ("अः", "ah"),
]

CONSONANTS = [
    ("क", "ka"), ("ख", "kha"), ("ग", "ga"), ("घ", "gha"), ("ङ", "nga"),
    ("च", "cha"), ("छ", "chha"), ("ज", "ja"), ("झ", "jha"), ("ञ", "nya"),
    ("ट", "tta"), ("ठ", "ttha"), ("ड", "dda"), ("ढ", "ddha"), ("ण", "nna"),
    ("त", "ta"), ("थ", "tha"), ("द", "da"), ("ध", "dha"), ("न", "na"),
    ("प", "pa"), ("फ", "pha"), ("ब", "ba"), ("भ", "bha"), ("म", "ma"),
    ("य", "ya"), ("र", "ra"), ("ल", "la"), ("व", "va"),
    ("श", "sha"), ("ष", "shha"), ("स", "sa"), ("ह", "ha"),
]


def make_entry(char, slug, category):
    return {
        "id": f"hi-{category}-{slug}",
        "script": "hindi",
        "category": category,
        "displayLabel": char,
        "note": PLACEHOLDER_NOTE,
        "strokes": [[{"x": x, "y": y} for x, y in stroke] for stroke in PLACEHOLDER_STROKES],
    }


def add_entries(path, chars, category):
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
    else:
        data = {"version": 1, "characters": []}

    existing_ids = {c["id"] for c in data["characters"]}
    added = []
    for char, slug in chars:
        entry = make_entry(char, slug, category)
        if entry["id"] in existing_ids:
            continue
        data["characters"].append(entry)
        added.append(entry["id"])

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return added


def main():
    added_vowels = add_entries(VOWELS_FILE, VOWELS, "vowel")
    added_consonants = add_entries(CONSONANTS_FILE, CONSONANTS, "consonant")
    print(f"{VOWELS_FILE.relative_to(REPO_ROOT)}: added {len(added_vowels)} entries")
    print(f"{CONSONANTS_FILE.relative_to(REPO_ROOT)}: added {len(added_consonants)} entries")


if __name__ == "__main__":
    main()
