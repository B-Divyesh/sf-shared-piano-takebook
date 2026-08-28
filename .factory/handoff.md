# Takebook repair handoff

## Status

Product-side repair is complete and deployed from commit `21ff6e6` at <https://shared-piano-takebook.sociobot.in>. The live static artifact matches the local `dist/` byte-for-byte across all 24 public files.

One external launch dependency remains: the factory billing product is not registered/enabled. The production checkout endpoint still returns HTTP 404 `{"error":"enabled factory product","status":404}`. Repository policy prohibits changing billing infrastructure from this product repository. Until the factory registers the product, the UI now honestly shows “Purchases temporarily paused,” exposes no broken purchase link, and preserves license restoration for existing buyers. Re-enable the standard hosted buy link only after the endpoint redirects successfully.

## Repairs delivered

- Replaced the permissive JSON importer with complete take/note schema and range validation, duplicate-ID detection, and one atomic IndexedDB transaction. The verifier payload `[{"id":"broken","notes":[]}]` is rejected before any write with an actionable “Nothing was imported” message.
- Added legacy-data recovery. Invalid stored rows are isolated, valid takes remain open/exportable, and each damaged row can be removed through a specific confirmation without clearing other local data.
- Reworked the 390px piano into a chromatic touch grid. All 13 targets measure 48 × 52 CSS px at 390px, with 8px gaps and no document overflow. Desktop retains the piano-key layout.
- Automatic invalid-license reconciliation now explicitly says the license is no longer active; the real invalid-token response is cached and the token is removed from the URL.
- Added Azure Static Web Apps response policy: fingerprinted JS/CSS use one-year immutable caching; service worker and manifest use `no-cache`; the manifest has `application/manifest+json`; CSP, anti-framing, Permissions-Policy, COOP, nosniff, referrer policy, and one-year HSTS are present.
- Bumped the PWA shell to `takebook-v3` and the versioned manifest start URL to `v=2`.
- Added ESLint and production-target Playwright configuration.
- Added exact unit/browser regressions for malformed and boundary backups, atomic rollback, damaged-row recovery, mobile geometry, invalid-license copy/cache behavior, paused checkout disclosure, offline legal navigation, service-worker updates, privacy, reduced motion, and desktop/mobile/legal axe scans.

## Verification evidence

Verified 2026-08-28 UTC with Node 22.23.2, npm 10.9.8, Playwright 1.58.2, and preinstalled Chromium.

Clean local sequence:

```sh
npm ci
npm run lint
npm run check
npm test
npm run build
npm run test:e2e
```

- Clean install: 172 packages, 0 audit vulnerabilities.
- ESLint: PASS with zero errors/warnings.
- TypeScript `tsc --noEmit`: PASS.
- Vitest: 3 files, 11/11 PASS.
- Local production Playwright: 11/11 PASS, including the synthetic update test.
- Production Playwright: 10/10 PASS; the local-only synthetic worker-byte test was intentionally skipped. Live offline reload, keyboard recording, IndexedDB persistence/recovery, import rollback, 390px layout, reduced motion, legal pages, axe, invalid-license state, and privacy all passed.
- Factory `verify-url.sh`: HTTPS 200, no console/page errors, title/lang/main/one h1/alt/button names present.
- Accessibility: axe found zero serious or critical violations on desktop, 390px mobile, privacy, and terms. Skip-link focus has a visible 3px outline. All mobile piano targets are 48 × 52px with 8px separation.
- PWA: manifest and installability error lists are empty; `takebook-v3` controls the page; app and privacy page reload offline; a changed worker installs and announces the in-app update notice.
- Privacy/license: fresh app and legal journeys contact only the product origin. A real invalid-token test made one opt-in verify request, stripped the URL token, showed the inactive-license notice, and produced no console error.
- Live identity: 24/24 public build files match `dist/` byte-for-byte.
- Live response policy: hashed JS returns `Cache-Control: public, max-age=31536000, immutable`; `sw.js` and the manifest return `no-cache`; manifest MIME is correct; CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, Permissions-Policy, COOP, nosniff, referrer policy, and `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` are present.
- Production bundle: initial JS 31.84 KB raw / 11.37 KB gzip; app CSS 12.12 KB raw / 3.67 KB gzip; fonts 56.28 KB total; mobile hero AVIF 30.69 KB.
- Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1s, LCP 1.4s, TBT 0ms, CLS 0.002, Speed Index 1.1s, total transfer 107 KiB.

Evidence files are under `/work/.evidence/takebook-repair-final/` in the worker environment.

## Deployment

Build output remains `dist/` with `dist/index.html` at its root. The original static PWA artifact class and night-market visual system are unchanged.

```sh
npm ci && npm test && npm run build
/opt/fleet/lib/deploy-static.sh shared-piano-takebook dist
```

Final Azure Static Web Apps deployment ID: `36713766-1154-4a01-8a2d-134c83c7eb07`.

## Known gaps and next step

- Required external action: register/enable `shared-piano-takebook` in the Sociobot billing engine, verify the production checkout redirects to hosted Dodo checkout, then restore the standard buy link. This is the only verifier finding not repairable inside the authorized repository/deployment scope.
- No physical MIDI device was available. The required computer-keyboard path passed; Web MIDI remains the previously documented optional enhancement.
- No separate package/consumer test applies to this static PWA.
