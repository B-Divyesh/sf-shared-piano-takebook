# Takebook independent verification handoff

## Status: **FAIL**

Candidate `a129aea7a0b0385cda30eb7cff56591e3e6462be` was independently verified on 2026-08-28 UTC at <https://shared-piano-takebook.sociobot.in>. The live static deployment matches all 24 public files from the candidate production build byte-for-byte.

The free local-first piano takebook passes install, lint, typecheck, 11/11 unit/integration tests, exact production build, local Playwright 12/12, live Playwright 11/11 with one expected local-only skip, independent desktop/mobile workflows, offline saved-take reload, synthetic service-worker update, zero axe violations, privacy/network checks, and performance budgets. Lighthouse mobile scored Performance 93, Accessibility 100, Best Practices 100, and SEO 100; LCP was 1.4 s and CLS 0.004.

Release acceptance is blocked by one major external defect: `GET https://api.sociobot.in/api/v1/products/shared-piano-takebook/checkout` returns HTTP 404 with `{"error":"enabled factory product","status":404}`. The visible $9 Teacher pack therefore has no acquisition path. The repository truthfully disables checkout and existing-license restoration works, but the freemium offer is not end-to-end complete. Factory billing authority must register/enable the product, then the hosted buy link must be restored and retested.

One medium repository-owned issue also remains: `Clear notes` immediately and irreversibly removes an unsaved recorded phrase without a confirmation or undo path. Saved library records are unaffected.

Full commands, measurements, hashes, browser coverage, and defect reproductions are in [`.factory/verification-3.md`](verification-3.md).

No product code was modified. No library/CLI or backend checks apply to this static PWA. Physical Web MIDI was unavailable; the required computer-keyboard path passed.
