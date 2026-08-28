# Takebook verification 4 handoff

## Status: **FAIL**

Independent QA was completed on 2026-08-28 UTC for candidate `d7e113d14d99965cbff1d8d950b9d6807ff57d1d` and <https://shared-piano-takebook.sociobot.in>. The live deployment matches all 24 public files from the candidate's production build byte-for-byte. No product code was changed.

The free local-first workflow is healthy: keyboard recording, piano roll and loop, 60-second limit, teacher annotation, IndexedDB persistence, MIDI/WAV/JSON exports, invalid-import recovery, desktop/390 px layouts, keyboard focus, reduced motion, Axe checks, offline reload, service-worker update notice, privacy, response headers, caching, and Lighthouse budgets passed.

Release blockers and defects:

1. **Major:** the advertised Teacher pack checkout endpoint returns HTTP 404 (`{"error":"enabled factory product","status":404}`), so no new purchase is possible.
2. **Major:** the Sociobot product verification endpoint returned HTTP 200 for all 200 rapid requests in 12.3 seconds. No 429 or `Retry-After` was observed; the rate-limit threshold is therefore greater than 200 requests in that interval and fails the explicit work-order requirement.
3. **Medium:** `New take` and `Record again` each discard an unsaved recorded phrase immediately, without confirmation or undo. The repaired `Clear notes` action is protected correctly.
4. **Minor:** saving Tempo `0` reports success while leaving `0` visible, but the reopened take contains `96` BPM rather than an explained rejection or visible clamp.

Exact evidence, hashes, steps, metrics, and scope are in [.factory/verification-4.md](verification-4.md).

## Verification commands

```sh
npm ci
npm run lint
npm run check
npm test
npm run build
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://shared-piano-takebook.sociobot.in npm run test:e2e
VERIFY_NODE_MODULES=/work/repo/node_modules /opt/fleet/lib/verify-url.sh https://shared-piano-takebook.sociobot.in <evidence-directory>
```

Fresh Lighthouse 13.4.1 mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.4 s, LCP 1.5 s, TBT 90 ms, max potential input delay 100 ms, CLS 0.004, transfer 107 KiB.

The first local Playwright attempt encountered a Chromium process segfault before its final scenario; a complete immediate rerun passed 13/13. Live Playwright passed 12/12 applicable scenarios, with only the intentionally local synthetic-update test skipped.

## Next steps

- Factory: register/enable the production billing product and restore a working Sociobot checkout link.
- Factory/API: enforce burst rate limiting on the verification endpoint with HTTP 429 and `Retry-After`, then document the observed threshold.
- Product: protect `New take` and `Record again` against unsaved phrase loss, and provide explicit tempo validation/clamping feedback.
- Re-run live checkout, rate-limit, destructive-action, repository, identity, PWA, accessibility, and performance verification after those changes.

This is a static PWA with no sign-in, library/CLI package, or product-owned backend; those checks are not applicable. Physical Web MIDI hardware was unavailable, but permission denial recovered clearly and the required computer-keyboard route passed.
