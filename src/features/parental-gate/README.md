# Parental Gate Feature

A two-digit × one-digit multiplication challenge (e.g. "16 × 7") that must be passed before
reaching the paywall. This is the standard "parental gate" pattern used across kids apps —
distinct from a COPPA age-screen (which the FTC says a math question alone can't substitute for);
here the app already knows it's talking to a child (Kids Category), the gate just needs to filter
out this app's 5-6yo target age band, which hasn't learned multiplication, while staying trivial
for an adult. Required for Apple Kids Category compliance.

- `generateChallenge.ts` — pure, tested: picks a random two-digit (12-19) × single-digit (3-9)
  problem.
- `ParentalGateScreen.tsx` — numeric input, wrong answers get a new random problem (no lockout/
  attempt limit — this isn't security, just a speed bump), correct answer calls `onSuccess`.

Reached via `/parental-gate` (locked tiles in `CategoryGridScreen` navigate here); on success it
routes to `/paywall` (`src/features/content-gating/PaywallScreen.tsx`).
