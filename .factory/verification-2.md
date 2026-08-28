# Independent verification 2 — candidate `9cb2bd2fd41c21c27e044281a02aefd10f748342`

Verified 2026-08-28 UTC from a clean detached worktree at `/tmp/takebook-qa-9cb2`.

Production URL: <https://shared-piano-takebook.sociobot.in>

## Verdict: **FAIL**

The core local-first piano-take workflow is production-quality and the live static artifact matches the requested candidate. Release acceptance is nevertheless blocked because the advertised $9 Teacher pack cannot be purchased: its required Sociobot checkout endpoint still returns HTTP 404. The UI avoids sending people to that broken endpoint by disabling its purchase control, but that does not make the paid offering end-to-end functional. A minor 390px offline-status accessibility issue is also recorded below.

## Clean-checkout and build evidence

Environment: Node `22.23.2`, npm `10.9.8`, Playwright `1.58.2`, Chromium from the preinstalled Playwright bundle, Lighthouse `13.4.1`.

All commands were run in the clean checkout:

```sh
npm ci
npm run lint
npm run check
npm test
npm run build
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://shared-piano-takebook.sociobot.in npm run test:e2e
```

Results:

- `npm ci`: PASS — 172 packages, 0 audit vulnerabilities.
- `npm run lint`: PASS — ESLint zero errors/warnings.
- `npm run check`: PASS — `tsc --noEmit`.
- `npm test`: PASS — 3 Vitest files, 11/11 tests.
- `npm run build`: PASS — production `dist/` generated.
- Local production Playwright: PASS — 11/11. This includes the synthetic service-worker update notice.
- Live production Playwright: PASS — 10/10, 1 expected local-only synthetic-worker test skipped.

Initial production assets are within the static/PWA budgets: app JS 31,843 bytes raw / 11,364 gzip; app CSS 12,124 bytes raw / 3,676 gzip; self-hosted fonts 56,284 bytes total; mobile AVIF 30,692 bytes.

## Candidate/deployment identity and response policy

- The clean worktree was at exactly `9cb2bd2fd41c21c27e044281a02aefd10f748342`.
- SHA-256 comparison found all **24 deployable public files** byte-for-byte identical between `dist/` and production. `staticwebapp.config.json` is deployment configuration, not a public artifact; its request is handled by the navigation fallback and is deliberately excluded.
- HTTPS redirects and live responses include HSTS (`max-age=31536000; includeSubDomains; preload`), CSP, `X-Frame-Options: DENY`, COOP, `Permissions-Policy`, nosniff, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Hashed JS has `Cache-Control: public, max-age=31536000, immutable`; `sw.js` and the manifest use `no-cache`; the manifest MIME type is `application/manifest+json`.

## Independent product exercise

In addition to the repository suite, a separate Playwright smoke harness was exercised against both local production output and the live URL.

- Empty save shows actionable validation and recovers.
- Computer-keyboard recording (`A`, `W`), note visualization, teacher note, tempo clamping, loop range boundary handling, save, refresh/reopen, and named delete confirmation all passed.
- The 60-second recording boundary stopped at exactly `01:00.0` and announced the limit.
- MIDI, WAV, and JSON exports downloaded; MIDI started `MThd`, and WAV contained valid `RIFF` / `WAVE` signatures.
- Malformed JSON and a take with a note extending past the 60-second limit were rejected without changing the usable saved-take library.
- Local persistence across reload, valid/damaged record isolation/recovery, and the computer-keyboard path passed. No physical Web MIDI device was available; this is optional enhancement coverage only.
- Desktop and `390 × 844` layouts have no horizontal overflow. All 13 mobile piano controls measure at least 44 × 44 CSS px (the delivered grid is 48 × 52 with gaps).
- Keyboard focus has a visible 3px cyan outline; keyboard operation, skip link, and native delete-dialog Escape recovery passed.
- Reduced-motion mode reduces transitions to 0.01ms and disables smooth scrolling.
- Axe found zero serious or critical violations on desktop, 390px mobile, privacy, and terms. No console errors or page errors occurred in normal, invalid-input, legal, local offline, or live runs.

Visual inspection at desktop and 390px confirms the distinctive night-market system described in `.factory/design.md`, readable stacking, and a product-specific rather than framework-default presentation.

## PWA, privacy, and network

- Manifest has name/short name, standalone display, `?source=pwa&v=2` start URL, matching theme/background colors, 192/512 icons, and a maskable icon.
- `takebook-v3` activated and controlled the page. After a first visit, offline reload opened the app and showed its offline state; cached `/privacy/` also opened offline.
- The local synthetic worker-byte update test passed and displayed `An update is ready. Reload to use it.`
- Fresh app/privacy/terms navigation requested only `https://shared-piano-takebook.sociobot.in`; no analytics, trackers, CDNs, remote fonts, or recording uploads were observed. Storage is IndexedDB/localStorage and exports are generated locally.
- An invalid license verification response was `200`, origin-scoped CORS, and `Cache-Control: no-store`. A URL license token is saved locally, removed from the address bar, and daily verdict caching prevented an unnecessary second call.

Lighthouse mobile against production produced Performance **99**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 1.2s, LCP 1.4s, TBT 120ms, CLS 0, and transfer 103 KiB. Lighthouse emitted a Chromium BFCache target-crash warning after it had written the completed report; the displayed category and metric results above are from that report. Navigation-only Lighthouse does not provide a representative INP; direct input interactions had no observed delay.

## Defects

### Major — Teacher pack checkout is still unavailable

**Reproduction:** `GET https://api.sociobot.in/api/v1/products/shared-piano-takebook/checkout`.

**Actual:** HTTP `404` with `{"error":"enabled factory product","status":404}`.

**Expected:** the registered product endpoint redirects to the Sociobot/Dodo hosted checkout so a user can buy the advertised $9 Teacher pack.

**Impact:** folders and printable practice sheets are advertised as a one-time purchase but no new customer can acquire the unlock. The site correctly disables its own purchase button and explains that new checkout is unavailable, so it does not expose a broken link. The missing registration/enabling is external factory/billing state, not a product-code defect, but it remains a release acceptance failure for the freemium offer.

### Minor — mobile connection status relies on color alone

**Reproduction:** load the app at 390px wide and toggle offline (or inspect the normal status). The `#connection` label contains the correct text but CSS hides its `span` under `max-width:520px`; only a green/gold dot remains visible.

**Expected:** retain a visible text/icon distinction such as “Offline” at phone size so online/offline state is not conveyed only by color.

**Impact:** sighted color-blind users at the target mobile size cannot distinguish the status states visually. Screen readers still receive the text. This violates the stated no-color-alone and first-class offline-state baseline, but does not prevent offline use.

## Final decision

**FAIL.** Candidate/deployment identity, free local recorder, persistence, backup validation/recovery, exports, PWA/offline behavior, privacy, performance, keyboard/mobile behavior, and automated accessibility checks pass. Enable/register the Sociobot checkout product and restore a working buy link; also preserve visible offline text at 390px. Re-run this verification after those changes.
