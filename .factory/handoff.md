# Takebook repair handoff

## Status: repository repair deployed; external billing release blocker remains

Repair implementation: `4bef6907e41859ff1f6e7bbbff050dbf14fc458b`.

This repair corrects the verifier's repository-owned mobile accessibility finding without changing the brief, the static PWA artifact class, the local-first recorder, or any previously passing behavior. At `390 × 844`, the header now keeps the status wording visible: **“Works offline”** while connected and **“Offline · takes available”** when disconnected. The status dot remains supplementary rather than the only visual distinction.

The independent verifier's major finding cannot be corrected by code or the static deployment: on 2026-08-28 UTC, `GET https://api.sociobot.in/api/v1/products/shared-piano-takebook/checkout` still returned HTTP `404` with `{"error":"enabled factory product","status":404}`. The factory must register/enable the Sociobot billing product before a working $9 hosted checkout link can be exposed. This repository deliberately keeps its purchase control disabled and preserves license restoration so no customer is sent to that failing endpoint. The researched freemium offering and all existing paid-license behavior are preserved.

## Regression coverage added

- Playwright now asserts at 390px that the connection wording is rendered, has a non-`none` display style, changes to the exact offline text after an offline transition, and creates no horizontal overflow.
- The existing checkout regression continues to assert that the unavailable endpoint is disclosed without making a third-party request or providing a broken purchase link.

## Verification evidence

Performed on 2026-08-28 UTC with Node `22.23.2`, npm `10.9.8`, Playwright `1.58.2`, and the preinstalled Chromium bundle:

```sh
npm ci
npm run lint
npm run check
npm test
npm run build
npm run test:e2e
```

- Clean install: PASS — 172 packages, 0 audit vulnerabilities.
- ESLint: PASS — no errors or warnings.
- TypeScript: PASS — `tsc --noEmit`.
- Unit/integration: PASS — 3 files, 11 tests.
- Production build: PASS — `dist/index.html` at the root; initial application JS 31,843 bytes raw / 11,370 bytes gzip and CSS 12,153 bytes raw / 3,670 bytes gzip (within the static budgets).
- Local production browser suite: PASS — 12/12. It exercises desktop and 390px mobile, computer-keyboard recording, save/reopen/delete, malformed-import rollback/recovery, MIDI/WAV/JSON exports, keyboard/focus, reduced motion, privacy, legal pages, axe, offline reload, worker update notice, license reconciliation, paused checkout disclosure, and the new visible-status regression.
- Local browser smoke via `verify-url.sh`: PASS — HTTP 200; no console/page errors; title, `lang`, exactly one `h1`, `main`, image alt text, and button names all present.
- Accessibility: PASS — axe found zero serious or critical violations across app desktop, app 390px/reduced-motion, privacy, and terms.
- PWA/privacy: PASS in Playwright — cached app and privacy page loaded offline; the synthetic worker update displayed the in-app update notice; a fresh app/privacy/terms journey remained same-origin with no tracker, CDN, or recording-upload request.
- Response policy: PASS in unit coverage — the Static Web Apps configuration retains immutable hashed build assets, `no-cache` service worker/manifest behavior, manifest MIME type, CSP anti-framing, Permissions-Policy, COOP, and one-year HSTS.
- Lighthouse 13.4.1 mobile against the local production preview: Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0s, LCP 1.6s, TBT 80ms, CLS 0.004, total transfer 108 KiB. Chromium emitted its known tab-crash message only after Lighthouse wrote the completed JSON report.

No package/consumer test applies to this static PWA. No physical Web MIDI device was available; the required computer-keyboard path passed, and Web MIDI remains optional enhancement coverage.

## Deployment and live verification

The tested production build was deployed to <https://shared-piano-takebook.sociobot.in> with the factory static deployment configuration:

```sh
/opt/fleet/lib/deploy-static.sh shared-piano-takebook /work/repo/dist
```

Post-deploy checks on 2026-08-28 UTC:

- Live Playwright: PASS — 11/11; the synthetic worker-byte update test is intentionally local-only and skipped against production. This includes the new 390px online/offline visible-text regression.
- Live `verify-url.sh`: PASS — HTTP 200 in 615ms; no console/page errors; title, language, one heading, main landmark, image alt text, and button names present.
- Live identity: PASS — all 24 public `dist/` files matched their production URLs byte-for-byte by SHA-256. `staticwebapp.config.json` is deployment configuration and is not a public artifact.
- Live response policy: PASS — hashed application JS is immutable for one year; manifest is `application/manifest+json` with `no-cache`; responses retain CSP, HSTS (`max-age=31536000; includeSubDomains; preload`), `X-Frame-Options: DENY`, COOP, Permissions-Policy, nosniff, and strict-origin referrer policy.
- Live checkout: still FAILS externally with the documented HTTP 404 response. The production UI continues to avoid a broken outbound purchase link.

## Next required external action

Register/enable `shared-piano-takebook` in the Sociobot billing engine, confirm that `/api/v1/products/shared-piano-takebook/checkout` redirects to Sociobot/Dodo hosted checkout, then replace the paused control with the standard hosted buy link. This requires factory billing authority and is explicitly outside this repository's permitted scope.
