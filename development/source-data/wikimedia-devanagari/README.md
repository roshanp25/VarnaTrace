# Wikimedia Devanagari stroke-order source cache

Cached source SVGs from Wikimedia Commons' "Devanagari `<letter>` stroke
order.svg" series, used as input to `tools/devanagari/import_stroke_order.py`.
This directory is **development-only source material**, not shipped app
content — the derived tracing data lives in `src/content/hindi/vowels.json`,
and its provenance is recorded in `src/content/hindi/source-attribution.json`.

Do not edit these files by hand; re-fetch from Wikimedia Commons if a file
needs updating.

## Files

| File | Character | Source page | Author | License |
|---|---|---|---|---|
| `devanagari_a_stroke_order.svg` | अ | https://commons.wikimedia.org/wiki/File:Devanagari_%E0%A4%85_stroke_order.svg | Saurmandal | CC BY-SA 3.0 |

Fetched via Wikimedia's stable `Special:FilePath` redirect, e.g.:

```bash
curl -sL "https://commons.wikimedia.org/wiki/Special:FilePath/Devanagari_%E0%A4%85_stroke_order.svg" -o devanagari_a_stroke_order.svg
```

See [`docs/devanagari-stroke-data.md`](../../../docs/devanagari-stroke-data.md)
for how these files are structured and converted, and for the open licensing
question that still needs a legal decision before shipping derived data
commercially.
