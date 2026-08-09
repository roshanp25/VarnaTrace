# Scoring Engine

Pure, isolated stencil-tracing scoring logic. Zero UI dependencies.

Takes coordinate arrays (traced points) and a stencil path definition, returns a score based on
distance-from-path and path coverage. Must be testable in isolation — no app, no simulator, no
rendering required. Built test-first (see `src/engine/__tests__`).

Populated in the "scoring engine" build step.
