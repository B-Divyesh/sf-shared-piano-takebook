# Independent product verification

## Verdict

**FAIL**

Candidate commit: `bfd07d7549cd80cd5c48835fcce2ab5f0f92b44e`

Production URL: <https://shared-piano-takebook.sociobot.in>

Verified: 2026-08-28 UTC

The deployed PWA is the candidate build and its free core workflow works well, but it is not release-ready under the work order. The advertised Teacher pack checkout returns HTTP 404, and the backup importer accepts an incomplete record that persistently breaks the local take library. Both are major defects. Mobile piano keys also miss the explicit 44 px touch-target contract.

## Environment and clean-checkout evidence

- The repository was clean at the requested SHA. `origin/main` also resolved to that SHA before verification.
- All build and repository checks ran in a separate clean detached checkout at `/tmp/takebook-qa.FMqsDL`.
- Runtime: Node 22.23.2, npm 10.9.8, Playwright 1.58.2, preinstalled Chromium.
- `npm ci`: PASS; 95 packages installed, 0 audit vulnerabilities.
- `npm run check`: PASS; `tsc --noEmit`.
- No lint script exists in `package.json`.
- `npm test`: PASS; 1 file, 4/4 Vitest tests.
- `npm run build`: PASS; Vite 6.4.3 produced `dist/`.
- `npm run test:e2e`: PASS; builder suite 4/4.

Production build output:

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| Initial JS | 28.07 KB | 10.29 KB |
| App CSS | 11.52 KB | 3.52 KB |
| Legal CSS | 1.26 KB | 0.63 KB |
| Self-hosted fonts, total | 56.28 KB | n/a |
| 960 px mobile AVIF hero | 30.69 KB | n/a |

The JS, CSS, font, and image budgets pass.

## Deployment identity

PASS. A fresh production build was compared byte-for-byte with the live site. All 24 files in `dist/` matched their deployed URL, including HTML, hashed JS/CSS, source maps, service worker, manifest, legal pages, icons, fonts, and all image variants.

Representative SHA-256 matches:

- `index.html`: `561694a0fc4cd43287bc77791437d02422cc6871194c289e06e0f4705b1b0c22`
- `sw.js`: `85946ce5a73e4d8d4d7b0a1133a792a0f296070d7200561480c03241b868cb87`
- `assets/app-DngGYc0a.js`: `fa58d4311ae97cd337f18cb3cc7a385472b7039f71d685a03523368ea786788e`
- `assets/app--bA6o67l.css`: `e1747c562f4a6a7ebdcbe7b6dae27364c2c4d5b4d01cf5d712c66fc8b3bb8444`

The prior deployment mismatch is not present.

## Independent browser coverage

An additional nine-scenario Playwright suite was run against both the local production build and the live URL. Both runs completed 9/9. One scenario deliberately characterizes the malformed-import defect below, so a green harness result is not an acceptance pass.

Covered:

- Empty-save validation and recovery.
- Computer-key recording, note visualization, annotation, tempo clamping, loop boundaries, looping, save, reload, reopen, and named delete confirmation.
- MIDI, WAV, and JSON downloads. MIDI began with `MThd`; WAV contained valid `RIFF` and `WAVE` signatures.
- A simulated 60.1-second recording stopped at exactly `01:00.0` with the limit announcement.
- Valid 60-second boundary import and persistence.
- Wrong-shape JSON error and subsequent successful import.
- IndexedDB persistence across reload and across a closed/reopened tab.
- Keyboard-only recording, skip-link focus, a visible 3 px cyan focus ring, and native dialog keyboard behavior.
- Desktop and 390 × 844 mobile layouts; no horizontal document overflow.
- Reduced-motion mode; transitions reduced to 0.01 ms and smooth scrolling disabled.
- Main, privacy, and terms semantics.
- No console errors or uncaught page errors on the tested normal, error, legal, mobile, and offline paths.

No physical MIDI keyboard was available. The required computer-keyboard path passed; hardware MIDI remains an unexercised enhancement.

## Accessibility

- PASS: one `h1`, `lang="en"`, title, main/header/footer landmarks, form labels, image alt text, skip link, keyboard reachability, focus visibility, reduced motion, and dialog initial focus.
- PASS: axe found 0 serious or critical violations on desktop, 390 px mobile, privacy, and terms.
- PASS: 390 px layout had no horizontal overflow. A 640 CSS-pixel layout also covers the effective layout width of a 1280 px viewport at 200% browser zoom.
- FAIL: the primary on-screen piano misses the work-order target size at 390 px. Eight white keys measured 41 × 124 px and five black keys measured 26.9 × 76.9 px; the contract requires at least 44 × 44 px and 8 px separation.

## PWA and offline

- PASS: Chromium parsed the manifest with no errors and reported no installability errors despite the server's generic manifest MIME type.
- PASS: manifest name, short name, 192/512 icons, maskable purpose, colors, standalone display, scope, and versioned start URL are present.
- PASS: service worker activated, controlled the page, and created `takebook-v2`.
- PASS: after a saved take and a controlled reload, an offline reload reopened the take and displayed `Offline · takes available`. The cached privacy page also loaded offline.
- PASS: a synthetic same-origin service-worker byte update produced states `updatefound → installed → activating → activated` and the in-app message `An update is ready. Reload to use it.`

## Performance

Fresh Lighthouse 12.8.2 mobile run against production:

| Category/metric | Result | Budget |
| --- | ---: | ---: |
| Performance | 100 | ≥ 90 |
| Accessibility | 100 | ≥ 95 |
| Best Practices | 100 | n/a |
| SEO | 100 | n/a |
| FCP | 1.2 s | n/a |
| LCP | 1.5 s | < 2.5 s |
| TBT | 0 ms | n/a |
| Max potential input delay | 20 ms | < 200 ms proxy |
| CLS | 0 | < 0.1 |
| Initial transfer | 100 KiB | n/a |

INP is not produced by a navigation-only lab run. The tested keyboard and button interactions responded without visible delay.

## Privacy, network, billing, and response policy

- PASS: a fresh load made requests only to the product origin. No analytics, trackers, third-party scripts, third-party fonts, or recording uploads were observed.
- PASS: recordings and notes remained in IndexedDB; audio generation and exports were local.
- PASS: the only coded cross-origin request is opt-in license verification to the documented Sociobot endpoint.
- PASS: invalid license verification returned `200 {"expires_at":null,"reason":"invalid","valid":false}`, used origin-scoped CORS, and `Cache-Control: no-store`.
- PASS: a license query parameter was stored under `sb_license:shared-piano-takebook`, removed from the visible URL, and verified once; reload reused the daily cached verdict.
- PASS: HTTP redirects to HTTPS. HTTPS responses include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`.
- Observation: the manifest is served as `application/octet-stream`; Chromium still parsed it without error.

## Defects

### Major

1. **The advertised Teacher pack cannot be purchased.**
   - Reproduction: follow the live `Buy Teacher pack` link or GET `https://api.sociobot.in/api/v1/products/shared-piano-takebook/checkout`.
   - Actual: HTTP 404 with `{"error":"enabled factory product","status":404}`.
   - Expected: redirect to the hosted Sociobot checkout.
   - Impact: the visible $9 product and its paid folders/print flow have no acquisition path. This is external product-registration/deployment state, but it is still a live acceptance failure.

2. **An incomplete JSON import persistently breaks access to saved takes.**
   - Reproduction: import `[{"id":"broken","notes":[]}]`.
   - Actual: the importer accepts and writes it because it validates only `id` and `notes`; rendering then fails on missing fields. After reload the library displays `Local storage is unavailable`, and existing takes cannot be opened, exported, or deleted through the UI.
   - Expected: reject the entire backup before writing unless every required take and note field has a valid type and safe range.
   - Recovery: only clearing site data or repairing IndexedDB outside the app; clearing data also removes valid takes.

### Medium

3. **The mobile piano misses the explicit touch-target baseline.**
   - At 390 px: white keys are 41 px wide; black keys are 26.9 px wide. Adjacent keys have no 8 px gap.
   - Impact: the core on-screen performance input is error-prone for touch and motor-impaired users.

### Minor

4. **Automatic invalid-license reconciliation is not disclosed.**
   - A returned invalid token is stripped, stored, and verified correctly, but the status becomes the generic free-tier text rather than a quiet “license no longer active” notice required by the billing contract. Manual verification does show a specific inactive message.

5. **Production cache policy does not use immutable caching for hashed assets.**
   - HTML, service worker, hashed JS/CSS, images, and fonts all return `Cache-Control: public, must-revalidate, max-age=30`.
   - Expected: short/no-cache policy for HTML and service worker, but long-lived `immutable` caching for content-hashed assets.

6. **Browser hardening headers are incomplete.**
   - No `Content-Security-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, or `X-Frame-Options`/CSP `frame-ancestors` was present.
   - HSTS is present, but `max-age=10886400` is below the one-year minimum normally associated with its `preload` token.
   - No exploitable injection was found in tested product paths; this is defense-in-depth.

## Final acceptance decision

**FAIL.** The deployment identity, free recorder, exports, local persistence, accessibility automation, offline behavior, and performance all pass. Release acceptance is blocked by the live checkout 404 and the persistent malformed-import failure. The mobile touch-target miss should also be corrected before claiming the contract is complete.
