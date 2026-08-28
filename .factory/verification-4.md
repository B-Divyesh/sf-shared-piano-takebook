# Independent product verification 4

## Verdict: **FAIL**

- Candidate: `d7e113d14d99965cbff1d8d950b9d6807ff57d1d`
- Production: <https://shared-piano-takebook.sociobot.in>
- Work order: `shared-piano-takebook-verify-4`
- Verified: 2026-08-28 UTC

The deployed static artifact matches the candidate byte-for-byte, and the free local-first recorder passes its core product, PWA, privacy, responsive, accessibility, and performance requirements. Release acceptance nevertheless fails on fresh evidence: the advertised Teacher pack still has no working checkout; the only production API used by the app did not return a rate-limit response during a 200-request burst; and two controls can still discard an unsaved phrase without confirmation or undo.

## Clean checkout and repository gates

The working tree began clean on `main` at the exact candidate SHA, and a fresh `git fetch` confirmed `origin/main` at the same SHA. Runtime was Node `22.23.2`, npm `10.9.8`, and repository-pinned Playwright `1.58.2` with the supplied Chromium.

| Gate | Result |
| --- | --- |
| `npm ci` | PASS — 172 packages installed, 0 audit vulnerabilities |
| `npm run lint` | PASS — ESLint, no findings |
| `npm run check` | PASS — `tsc --noEmit` |
| `npm test` | PASS — 3 files, 11/11 tests |
| `npm run build` | PASS — Vite 6.4.3 produced `dist/` |
| `npm run test:e2e` | PASS on full retry — 13/13 local production scenarios |
| live repository suite | PASS — 12/12 applicable scenarios; 1 local-only synthetic update test skipped |

The first local E2E invocation reached 12 passing scenarios before the supplied Chromium process segfaulted while creating the final test context. An immediate complete rerun passed 13/13; the crash occurred before a product page was created and is not classified as a product defect.

Production output and supplied budgets:

| Initial asset | Raw | Gzip | Budget |
| --- | ---: | ---: | ---: |
| Application JS | 32,644 B | 11.62 KB | <= 200 KB |
| Application CSS | 12,153 B | 3.67 KB | <= 50 KB |
| Self-hosted fonts | 56,284 B | n/a | <= 120 KB |
| 960 px AVIF hero | 30,692 B | n/a | <= 300 KB |

## Deployment identity and browser response policy

PASS. All 24 public files in the candidate's fresh `dist/` matched the live byte streams by SHA-256. `staticwebapp.config.json` was excluded because it is host configuration rather than a public artifact.

Representative hashes:

- `index.html`: `5904cea41ad8b9bddde87a4a10db6f70a6cfbbe8dfc9a00495e1d81f6f8e565a`
- `sw.js`: `26338cc39c91c65e9a97031240babba3524194fe3b29538a82053fcbde9cd2f7`
- `assets/build/app-DQQ22fhW.js`: `e1e5da7600967c58e12c4319c49299c1c68324984f910365a5ba862447b11d90`

HTTP redirects to HTTPS. Live responses provide one-year HSTS with subdomains/preload, CSP with anti-framing, `X-Frame-Options: DENY`, COOP, `Permissions-Policy`, nosniff, and strict-origin referrer policy. Root HTML uses `public, must-revalidate, max-age=30`; fingerprinted JS uses `public, max-age=31536000, immutable`; `sw.js` and the manifest use `no-cache`; and the manifest is served as `application/manifest+json`.

## Independent end-to-end exercise

Independent Playwright scenarios ran against production in addition to the repository suite:

- Empty playback, save, and MIDI export produced actionable messages, after which recording recovered normally.
- Computer-keyboard recording produced two note blocks. A 600-character teacher note, escaped markup-like title, lower tempo clamp, loop-range clamping, save, reload, reopen, cross-tab persistence, and keyboard loop playback all worked.
- MIDI, WAV, and JSON downloads were generated locally. MIDI began `MThd`; WAV contained valid `RIFF` and `WAVE` signatures; the JSON backup contained the full saved record.
- Invalid JSON syntax and a note extending past 60 seconds were rejected without changing existing data. The repository suite also proved atomic rejection of an incomplete multi-row backup and isolation/removal of a legacy damaged IndexedDB row.
- A valid maximum-boundary take imported with 60-second duration, MIDI note and velocity 127, 600-character note, 240 BPM, and loop `59.8–60.0`. Markup-like imported text rendered as text rather than executing.
- A clock-controlled recording stopped automatically at exactly `01:00.0` and announced the 60-second limit.
- Named deletion focused the safe action, Escape preserved the take, and explicit confirmation deleted it.
- Web MIDI permission rejection gave the recovery message `MIDI permission was not granted. The computer keys still work.` The required computer-keyboard route passed; no physical MIDI device was available.
- Free normal, error, export, import, persistence, legal, mobile, and offline flows produced no console errors or uncaught page errors.

Library/CLI packaging and backend concurrency/health checks do not apply to this static PWA. It has no sign-in flow, so an Entra authority check is not applicable.

## Accessibility, responsive behavior, and design

- The factory `verify-url.sh` passed production: HTTP 200, 803 ms browser load, title, `lang="en"`, exactly one `h1`, one `main`, zero images missing `alt`, zero unnamed buttons, and no console/page errors.
- Axe 4.13 found zero serious or critical violations on the desktop app, 390 px app, privacy page, and terms page.
- Keyboard-only recording/playback, skip link, dialog cancellation, and confirmation worked. Focus uses a visible 3 px outline; the safe dialog action receives initial focus.
- At 390 x 844 there was no horizontal overflow. All 13 piano controls were at least 44 x 44 CSS px, the tested grid spacing met 8 px, and online/offline wording remained visible.
- A 640 CSS-pixel layout, representing a 1280 px viewport at 200% browser zoom, had no horizontal overflow.
- Under `prefers-reduced-motion: reduce`, transition duration computed to 0.001 seconds or less and smooth movement was removed.
- Desktop and phone screenshots were inspected. The night-market palette, original kiosk illustration, typography, hierarchy, and intentional mobile stacking match `.factory/design.md` and are clearly product-specific.

## PWA and offline behavior

- Chromium parsed the manifest with no errors. It contains the name/short name, standalone display, versioned start URL, matching colors, 192/512 icons, and maskable purpose.
- `takebook-v3` activated, controlled the page, and precached the shell.
- After saving data, a controlled offline reload retained and reopened the take, displayed `Offline · takes available`, and loaded the cached privacy page.
- The local synthetic service-worker byte-update scenario passed and displayed `An update is ready. Reload to use it.`

## Performance

Fresh Lighthouse 13.4.1 mobile results against production:

| Category or metric | Result | Contract |
| --- | ---: | ---: |
| Performance | 99 | >= 90 |
| Accessibility | 100 | >= 95 |
| Best Practices | 100 | — |
| SEO | 100 | — |
| FCP | 1.4 s | — |
| LCP | 1.5 s | < 2.5 s |
| TBT | 90 ms | — |
| Max potential input delay | 100 ms | < 200 ms proxy |
| CLS | 0.004 | < 0.1 |
| Initial transfer | 107 KiB | — |

Navigation-only Lighthouse does not produce representative INP. Direct keyboard and control interactions showed no observable delay.

## Privacy, network, license, and rate limiting

- Fresh app, recorder, export, import, privacy, terms, and offline use requested only the product origin. No analytics, advertising, third-party scripts/fonts, account calls, or recording uploads were observed.
- Takes and notes remained in IndexedDB; license state remained in localStorage; MIDI/WAV/JSON generation was local.
- The only coded cross-origin request is opt-in license verification to the documented Sociobot API. A real invalid-token response was HTTP 200 with `valid:false`, origin-scoped CORS, and `Cache-Control: no-store`.
- A real `?license=` token was stored as `sb_license:shared-piano-takebook`, removed from the visible URL, described as inactive, and not checked again on reload because the daily verdict cache was used.
- **FAIL — rate limiting:** 200 rapid sequential GET requests to `https://api.sociobot.in/api/v1/products/shared-piano-takebook/verify?license=qa-rate-limit-<n>` completed in 12.3 seconds. Every response was HTTP 200; no 429 and therefore no `Retry-After` header appeared. The observed threshold is **greater than 200 requests per source in 12.3 seconds**, which does not satisfy the work order's explicit burst-rate-limit requirement.

## Defects

### Major — advertised Teacher pack cannot be purchased

**Reproduction:** GET `https://api.sociobot.in/api/v1/products/shared-piano-takebook/checkout`.

**Actual:** HTTP 404 with `{"error":"enabled factory product","status":404}`. The app disables the buy control and says purchases are temporarily paused.

**Expected:** the required buy link redirects to the Sociobot/Dodo hosted checkout for the advertised $9 one-time Teacher pack.

**Impact:** no new user can purchase folders and printable practice sheets. The disclosure avoids a broken outbound link, but the researched freemium product and paid-unlock contract are not functional end to end. Registration/enablement is factory-owned external state, but remains a release blocker.

### Major — production license verification endpoint has no demonstrated burst rate limit

**Reproduction:** send 200 rapid GET requests with distinct invalid tokens to the product verification endpoint.

**Actual:** 200/200 returned HTTP 200 in 12.3 seconds. No request returned 429, and no `Retry-After` header was observed.

**Expected:** the burst must start returning HTTP 429 with `Retry-After`, with the threshold recorded.

**Impact:** the externally hosted license endpoint does not satisfy the work order's explicit abuse-control acceptance requirement. This is factory/API state rather than static repository code.

### Medium — two reset paths irreversibly discard an unsaved phrase

**Reproduction A:** record and stop a note, then activate `New take` before saving.

**Reproduction B:** record and stop a note, then activate `Record again`.

**Actual:** each action immediately removes every recorded note. No confirmation opens and no undo exists. `New take` also resets unsaved take-card text.

**Expected:** confirm the specific destructive action or provide undo, consistent with the supplied interaction contract. The repaired `Clear notes` path already demonstrates the expected behavior.

**Impact:** up to 60 seconds of unsaved student work and its annotation can be lost with one activation.

### Minor — tempo value 0 is silently saved as 96 BPM

**Reproduction:** record a note, enter `0` in Tempo, and save. The field continues to display `0`; reload and reopen the take.

**Actual:** save reports success with no validation message, but the reopened value is `96`.

**Expected:** reject the out-of-range value with an actionable error or visibly clamp it to the 30 BPM minimum before confirming save.

**Impact:** the UI and persisted take disagree, which can produce an unexpected MIDI tempo.

## Final acceptance decision

**FAIL.** Candidate/deployment identity, the free recorder's principal job, export formats, persistence/recovery, visual system, responsive keyboard/mobile use, accessibility automation, offline/update behavior, privacy, hardening, caching, and performance all pass. Acceptance is blocked by the production checkout 404 and missing required API rate limiting. The two remaining unsaved-work reset paths should also be protected before release; tempo validation should be made explicit.
