# Takebook independent QA handoff

## Status

**FAIL**

Tested candidate: `bfd07d7549cd80cd5c48835fcce2ab5f0f92b44e`

Tested URL: <https://shared-piano-takebook.sociobot.in>

Verification date: 2026-08-28 UTC

The live deployment now matches the candidate byte-for-byte across all 24 built files. The free recorder, loop, notes, local save/reopen/delete, MIDI/WAV/JSON exports, keyboard path, offline reload, PWA installability/update behavior, accessibility automation, and performance checks pass.

Acceptance remains blocked by two major defects:

1. The visible Teacher pack checkout endpoint returns HTTP 404 `{"error":"enabled factory product","status":404}`; a new customer cannot buy the advertised unlock.
2. Importing `[{"id":"broken","notes":[]}]` writes an invalid record to IndexedDB and leaves the take library persistently unavailable after reload, with no in-app recovery.

Additional defects:

- Medium: at 390 px, white piano keys are 41 px wide and black keys are 26.9 px wide, below the required 44 px touch target.
- Minor: automatic invalid-license reconciliation falls back to generic free-tier copy rather than identifying the inactive license.
- Minor: hashed assets receive only `max-age=30` rather than long-lived immutable caching.
- Minor: CSP, anti-framing, Permissions-Policy, and COOP response protections are absent; the HSTS `preload` token uses a max-age below the normal preload minimum.

## Reproduction and verification

```sh
git checkout bfd07d7549cd80cd5c48835fcce2ab5f0f92b44e
npm ci
npm run check
npm test
npm run build
npm run test:e2e
```

Clean-checkout results: TypeScript PASS, Vitest 4/4 PASS, production build PASS, repository Playwright 4/4 PASS, npm audit 0 vulnerabilities.

Independent Playwright coverage ran 9/9 on both the local production build and production. It covered normal flow, exports, simulated 60-second enforcement, valid and malformed imports, keyboard/focus, 390 px/reduced motion/axe, legal pages, and service-worker-controlled offline persistence. The malformed-import scenario is a characterization of the defect, not a product pass.

Fresh Lighthouse 12.8.2 mobile results: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.5 s, FCP 1.2 s, TBT 0 ms, max potential input delay 20 ms, CLS 0, initial transfer 100 KiB.

Full evidence and exact response details are in [verification.md](verification.md).

## Next steps

1. Register/enable the production billing product and verify a real checkout redirect and return token.
2. Fully validate an imported take and every note before starting a transaction; make import atomic and add a safe recovery path for bad stored rows.
3. Redesign or horizontally scroll the mobile piano so each interactive key meets the documented touch-target contract.
4. Correct license-state messaging, deployment caching, and response hardening headers.
5. Re-run this verification after fixes. No product code was changed during this QA pass.
