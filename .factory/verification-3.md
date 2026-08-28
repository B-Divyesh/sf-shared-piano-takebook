# Independent product verification 3

## Verdict: **FAIL**

- Candidate: `a129aea7a0b0385cda30eb7cff56591e3e6462be`
- Production: <https://shared-piano-takebook.sociobot.in>
- Verified: 2026-08-28 UTC

The deployed static artifact matches the candidate exactly, and Takebook's free local-first recorder passes the core product, PWA, privacy, accessibility, and performance checks. Release acceptance still fails because the advertised $9 Teacher pack cannot be purchased: the required production Sociobot checkout endpoint returns HTTP 404. An additional medium-severity data-loss issue allows an unsaved phrase to be cleared without confirmation or undo.

## Clean checkout and repository gates

The working tree started clean on `main` at the exact candidate; `origin/main` resolved to the same SHA. Node was `22.23.2`, npm `10.9.8`, and the repository-pinned Playwright was `1.58.2`.

| Gate | Result |
| --- | --- |
| `npm ci` | PASS — 172 packages installed, 0 audit vulnerabilities |
| `npm run lint` | PASS — ESLint, no findings |
| `npm run check` | PASS — `tsc --noEmit` |
| `npm test` | PASS — 3 files, 11/11 tests |
| `npm run build` | PASS — Vite 6.4.3 produced `dist/` |
| `npm run test:e2e` | PASS — local production build, 12/12 |
| live repository suite | PASS — 11/11, with the local-only synthetic update test skipped |

No product code was changed during verification. Temporary independent browser tests were removed after execution.

Production output and supplied budgets:

| Initial asset | Raw | Gzip | Budget |
| --- | ---: | ---: | ---: |
| Application JS | 31,843 B | 11,370 B | ≤ 200 KB |
| Application CSS | 12,153 B | 3,670 B | ≤ 50 KB |
| Self-hosted fonts | 56,284 B | n/a | ≤ 120 KB |
| 960 px AVIF hero | 30,692 B | n/a | ≤ 300 KB |

## Deployment identity and response policy

PASS. All 24 public `dist/` artifacts matched production byte-for-byte by SHA-256. `staticwebapp.config.json` was correctly excluded because it is deployment configuration, not a public artifact.

Representative hashes:

- `index.html`: `f14a05698c6dabf7f951d5d0b19cc2f0f5de657fe27578f65c9f566fcc586028`
- `sw.js`: `26338cc39c91c65e9a97031240babba3524194fe3b29538a82053fcbde9cd2f7`
- `assets/build/app-DJ4fR-06.js`: `b1f3cf0dbc559b0b06ae782e139b10cb68201d32f1a6b85fb267dd0adabe344c`

HTTP redirects to HTTPS. Live responses include one-year HSTS with subdomains/preload, CSP with anti-framing, `X-Frame-Options: DENY`, COOP, `Permissions-Policy`, nosniff, and strict-origin referrer policy. Hashed build assets use `public, max-age=31536000, immutable`; `sw.js` and the manifest use `no-cache`; the manifest is served as `application/manifest+json`. Root HTML uses a 30-second revalidation policy.

## Independent end-to-end exercise

Independent Playwright coverage ran against both the local production output and production. It passed all exercised paths without console errors or uncaught page errors:

- Empty save and empty MIDI export produced actionable errors, then recovered normally.
- Computer-keyboard recording produced a visible two-note piano roll; teacher note, title trimming, tempo low-bound clamping to 30 BPM, loop boundary clamping, save, reload, a newly opened tab, reopen, and named delete cancellation/confirmation all worked.
- Playback wrapped within a 0.2-second loop and Enter stopped it.
- A clock-controlled recording stopped at exactly `01:00.0` and announced the 60-second limit.
- MIDI, WAV, and JSON downloads were generated locally. MIDI began `MThd`; WAV had valid `RIFF`/`WAVE` signatures; backup content reopened with the expected clamped values.
- A valid maximum-boundary take (60 seconds, MIDI note/velocity 127, 600-character note, 240 BPM) imported and rendered safely. HTML-like title text was escaped rather than executed.
- Invalid JSON syntax, the wrong top-level shape, incomplete records, and a note extending beyond 60 seconds were rejected without corrupting or replacing the usable library.
- IndexedDB data persisted across reload, closed tab/reopened tab, and offline reload.
- The live loop, normal, validation, export, import, persistence, and offline scenarios produced no unexpected outbound request.

No physical MIDI device was available. Web MIDI is an optional enhancement under the brief; the required computer-keyboard path passed. Library/CLI packaging and backend concurrency/health checks do not apply to this static PWA.

## PWA and offline

- Chromium parsed the manifest with zero errors. It includes name/short name, standalone display, versioned start URL, matching theme/background colors, 192/512 icons, and maskable purpose.
- `takebook-v3` installed, activated, claimed the page, and precached the application and legal shell.
- After saving a take, both local and live pages reloaded offline, retained the take and teacher note after closing/reopening the tab, and displayed `Offline · takes available`. The privacy page also loaded offline.
- The local synthetic service-worker byte-update test passed and displayed `An update is ready. Reload to use it.`

## Accessibility, responsive behavior, and design

- Axe 4.13 found **zero violations of any severity** on the desktop app, 390 px app, privacy page, and terms page; therefore serious/critical findings were also zero.
- The factory `verify-url.sh` passed production: HTTP 200 in 625 ms, title and `lang="en"`, exactly one `h1`, a `main`, all images with alt attributes, all buttons named, and no console/page errors.
- Keyboard-only recording, piano input, loop start/stop, skip link, native dialog cancel, and delete confirmation passed. Focus measured as a visible 3 px cyan outline with 3 px offset.
- At 390 × 844 there was no horizontal overflow. All 13 piano buttons measured 48 × 52 CSS px with 8 px grid gaps, and the online/offline wording remained visible.
- A 640 CSS-pixel viewport, representing a 1280 px desktop at 200% zoom, had no horizontal overflow.
- Under reduced motion, transitions computed to 0.01 ms and smooth scrolling computed to `auto`.
- Desktop and phone screenshots were visually inspected. The night-market palette, generated kiosk illustration, typography, hierarchy, and stacked mobile workbench match `.factory/design.md` and are product-specific rather than framework-default.

## Performance

Fresh Lighthouse 13.4.1 mobile results against production:

| Category or metric | Result | Contract |
| --- | ---: | ---: |
| Performance | 93 | ≥ 90 |
| Accessibility | 100 | ≥ 95 |
| Best Practices | 100 | — |
| SEO | 100 | — |
| FCP | 1.4 s | — |
| LCP | 1.4 s | < 2.5 s |
| TBT | 290 ms | — |
| Max potential input delay | 160 ms | < 200 ms proxy |
| CLS | 0.004 | < 0.1 |
| Initial transfer | 107 KiB | — |

Navigation-only Lighthouse does not report representative INP. The tested keyboard and control interactions completed without observed delay.

## Privacy and billing

- Fresh app/privacy/terms use loaded only from the product origin. There are no analytics, trackers, CDN fonts/scripts, recording uploads, or account requests.
- Takes and notes remained in IndexedDB. Exports and synthesized audio were generated in-browser.
- License verification is the only coded opt-in cross-origin request. A real invalid-token check returned `200`, `valid:false`, origin-scoped CORS, and `Cache-Control: no-store`.
- A real `?license=` return token was stored under `sb_license:shared-piano-takebook`, stripped from the URL, checked once, named as inactive, and not rechecked on reload because of the daily verdict cache.

## Defects

### Major — advertised Teacher pack cannot be purchased

**Reproduction:** request `https://api.sociobot.in/api/v1/products/shared-piano-takebook/checkout`.

**Actual:** HTTP 404 with `{"error":"enabled factory product","status":404}`.

**Expected:** redirect to the hosted Sociobot/Dodo checkout for the advertised $9 one-time Teacher pack.

**Impact:** no new user can buy folders and printable practice sheets. The UI honestly disables the purchase control and existing-license restoration works, but the researched freemium product is not functional end to end. The missing product enablement is external factory/billing state; that does not change the acceptance result.

### Medium — Clear notes irreversibly discards an unsaved phrase

**Reproduction:** record a note, stop, then activate `Clear notes` before saving.

**Actual:** note blocks changed from 1 to 0 immediately, no confirmation dialog opened, no undo action existed, and the status only said `Notes cleared. The take card is unchanged.`

**Expected:** confirm the specific destructive action or provide an undo path, as required by the supplied feedback/state and visual-interaction contract.

**Impact:** a teacher or student can lose the just-recorded phrase with one activation. Previously saved library data is unaffected.

## Final acceptance decision

**FAIL.** Candidate identity, the free core job-to-be-done, production build, local storage recovery, exports, responsive keyboard/mobile use, accessibility automation, offline/update behavior, privacy, headers, caching, and performance pass. Acceptance is blocked by the production checkout 404. The unsaved-phrase clear path should also receive confirmation or undo before release.
