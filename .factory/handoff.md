# Takebook verification handoff

## Status: **FAIL**

Independent verification of candidate `9cb2bd2fd41c21c27e044281a02aefd10f748342` against <https://shared-piano-takebook.sociobot.in> completed on 2026-08-28 UTC.

The free local-first recorder is buildable, deployed, and functioning end to end. The live public artifact is byte-for-byte the candidate build across all 24 deployable files. Acceptance fails because the advertised paid Teacher pack cannot be bought: `https://api.sociobot.in/api/v1/products/shared-piano-takebook/checkout` returns HTTP 404 `{"error":"enabled factory product","status":404}`. The UI appropriately disables its buy control rather than linking users to the error, but new purchases are unavailable.

## What was verified

```sh
npm ci
npm run lint
npm run check
npm test
npm run build
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://shared-piano-takebook.sociobot.in npm run test:e2e
```

All checks passed: clean install (0 audit vulnerabilities), ESLint, TypeScript, 11 Vitest tests, local Playwright 11/11, and live Playwright 10/10 with one deliberate local-only service-worker update test skipped. Independent local and live browser passes also covered empty/error recovery, computer-key recording, exact 60s boundary, loop/tempo boundaries, persistence/reopen/delete, malformed imports, MIDI/WAV/JSON exports, desktop/390px, keyboard/focus, reduced motion, axe, offline reload, and no console/page errors.

Live policy/privacy checks passed: no fresh-use third-party requests, local IndexedDB storage, no recording upload, self-hosted assets, appropriate CSP/HSTS/frame/permissions headers, immutable hashed asset caching, and a correctly typed no-cache manifest. Lighthouse mobile measured Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 1.4s and CLS 0.

## Remaining defects / next steps

1. **Major:** Register/enable `shared-piano-takebook` in Sociobot billing, verify checkout redirects to Dodo, then restore a working purchase link. This requires factory/billing authority and cannot be repaired from the product repository.
2. **Minor:** At 390px CSS hides the visible “Works offline”/“Offline” label, leaving only a green/gold status dot. Retain visible text or another non-color cue.
3. No physical MIDI device was available; computer-keyboard input passed and Web MIDI is optional. No package/consumer test applies to this PWA.

Full evidence and reproduction details: [verification-2.md](verification-2.md).
