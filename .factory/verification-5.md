# Verify recording and reopening piano practice takes

## Verdict: **FAIL**

- Findings: **4** (0 critical, 0 major, 2 medium, 2 minor)
- Untested public claims: **4**
- Implementation reviewed: `d18d9cf850bc0801467a067b66c9a94f9a3cd07f`
- Documentation checkout: `63adb871faea0642c4044e390ce9060e984dfeb9`
- Live URL: <https://shared-piano-takebook.sociobot.in>
- Verified: 5 September 2026 UTC

The recorder, demo, exports, local storage, offline shell, paid checkout, accessibility, and production artifact all pass their existing automated checks. Acceptance still fails because a normal saved-take action can erase unsaved work, four public capability claims lack the required claim coverage, and two smaller copy and metadata contract gaps remain.

## Job, audience, and first action

Before scrolling, both a fresh 1440 × 1000 desktop browser and a fresh 390 × 844 phone browser showed:

- Job: **Record a piano phrase together**.
- Audience: teachers and students practicing a short phrase without a DAW.
- First action: **Try it with sample data**.
- Next-step explanation: the demo loads three samples in separate browser storage.
- Facts: takes stay on the device, the app works offline after the first visit, and the $9 Teacher pack is optional.

All of this was visible at `scrollY = 0` on the phone. The phone had no horizontal overflow. Screenshots are in `/work/.evidence/takebook-verify-5/desktop-first-screen.png` and `/work/.evidence/takebook-verify-5/phone-first-screen.png`.

## Candidate and deployment identity

`63adb871` changes only `.factory/handoff.md`. The last implementation change is `d18d9cf`, so that is the product candidate reviewed. A fresh build produced 28 deployable files. All 28 matched the corresponding live bytes by SHA-256. The live runtime is the candidate implementation.

## Clean-checkout gates

The checkout began clean at `63adb871`; `origin/main` matched it.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 172 packages, 0 vulnerabilities |
| `npm run lint` | PASS |
| `npm run check` | PASS |
| `npm test` | PASS — 13/13 |
| `npm run build` | PASS — `dist/index.html` produced |
| `npm run test:e2e` | PASS — 21/21 local |
| Live browser suite | PASS — 20/20; the local-only worker-update simulation skipped |
| Factory URL verifier | PASS — HTTP 200, 720 ms, title/lang/main/alt/names, no load errors |
| Axe 4.13 | PASS — zero violations of any severity on root, demo, privacy, terms, and 404 at desktop and 390 px reduced motion |

Initial application JavaScript is 39,083 B raw / 13,514 B gzip. Application CSS is 14,162 B raw / 4,104 B gzip. Fonts total 56,284 B. The mobile AVIF is 30,692 B. These pass the supplied budgets.

Fresh live Lighthouse 13.4.1 results: Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.2 s, LCP 1.6 s, TBT 80 ms, CLS 0, total transfer 110 KiB. The JSON result is `/work/.evidence/takebook-verify-5/lighthouse.json`.

## Declared claim commands

Every command in `.factory/claims.json` was run as its own fresh invocation from the clean checkout.

| Claim | Command result |
| --- | --- |
| `demo-sandbox` | PASS — 1/1 |
| `local-persistence` | PASS — 1/1 |
| `offline-reload` | PASS — 1/1 |
| `60-second-limit` | PASS — 1/1 |
| `local-exports` | PASS — 1/1 |
| `json-import` | PASS — 1/1 |
| `keyboard-fallback` | PASS — 1/1 |
| `mobile-layout` | PASS — 1/1 |
| `privacy-local` | PASS — 1/1 |
| `teacher-tools` | PASS — 1/1 |
| `teacher-pack-price` | PASS — 1/1 |

These passing commands do not cover all public claims; see finding 2.

## Live product exercise

- The one-click sample opened `/?demo=1` with title `Demo — Takebook` and the persistent label `Demo — sample data, nothing is saved to your takebook`.
- The three samples were **Lighten the turn**, **Recital cadence**, and **Even staccato**. The opened sample had seven roll blocks, a 0.8–3.6 second loop, 88 BPM, and a specific teacher note.
- Reset restored the original three samples after an edit. Reload kept the demo label. **Start for real** cleared the demo database and returned the pre-seeded real take unchanged.
- A real take survived reload, tab close, and a new tab in the same browser profile.
- Empty actions, invalid and incomplete imports, damaged-row recovery, the 60-second boundary, tempo 0 clamping, unsaved-work dialogs, license invalidation, and 429 recovery passed the repository suite.
- MIDI, WAV, and JSON downloads had the expected signatures/data. A valid backup imported. A malformed multi-row backup changed nothing.
- Keyboard focus begins on the skip link with a 3 px cyan ring. Recording works from the computer keyboard. Dialogs focus the safe action. Reduced motion computes to 0.01 ms. The 390 px piano controls meet 44 px size and 8 px spacing. A 640 CSS-pixel zoom-equivalent layout had no overflow.
- Offline reload retained the samples and cached privacy page. The local worker-update test displayed the update notice.
- Normal demo recording, save, export, import, and legal-page use made only same-origin requests.

## Routes, links, and response policy

- `/`: HTTP 200, `Takebook — record short piano practice takes`.
- `/?demo=1`: HTTP 200, `Demo — Takebook` after app load.
- `/privacy/`: HTTP 200, `Privacy — Takebook`.
- `/terms/`: HTTP 200, `Terms — Takebook`.
- An unknown path: deliberate HTTP 404 with `Page not found — Takebook`, one `h1`, and a return link. This expected 404 is not a defect.
- All product links resolved. The source link returned 200. Mail links were valid `mailto:` links.
- HTTP redirects to HTTPS. Root HTML uses 30-second revalidation. Fingerprinted JS uses one-year immutable caching. The service worker and manifest use `no-cache`; the manifest MIME type is correct.
- Live headers include one-year HSTS, CSP with `frame-ancestors 'none'`, X-Frame-Options, COOP, Permissions-Policy, nosniff, and strict-origin referrer policy.

## Billing API and backend scope

Takebook is a static local-first PWA and has no product backend, tenant store, shared database, sign-in, CLI, library, or desktop artifact. Backend tenant isolation and SQLite restart checks do not apply. IndexedDB persistence and demo namespace isolation passed.

The allowed Sociobot product endpoints were healthy during this verification:

- `/health`: HTTP 200.
- Checkout: HTTP 303 to `checkout.dodopayments.com`.
- Invalid license verification: HTTP 200, `valid:false`, origin-scoped CORS, `Cache-Control: no-store`.
- Rate limit: requests 1–30 returned 200; request 31 returned 429 with `Retry-After: 4` and a readable wait message.

The external Azure 503 described in the earlier handoff was not present during this run.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Checkout returned 404 | Fixed — live 303 to hosted checkout |
| Incomplete import broke the library | Fixed — atomic rejection and damaged-row recovery pass |
| Phone piano controls were too small | Fixed — all 13 controls meet size/spacing checks |
| Invalid license lacked a clear notice | Fixed — inactive-license notice passes |
| Hashed assets lacked immutable caching | Fixed — live one-year immutable response |
| Hardening headers were missing | Fixed — live headers present |
| Phone connection status used color alone | Fixed — visible online/offline text passes |
| Clear notes discarded work | Fixed — named confirmation, safe focus, cancel/confirm pass |
| New take and Record again discarded work | Fixed — both named confirmations pass |
| Tempo 0 was saved as 96 | Fixed — visible clamp to 30 persists |
| Verify endpoint lacked demonstrated rate limiting | Fixed — request 31 returns 429 with `Retry-After: 4` |

## Findings

### Medium 1 — opening a saved take discards unsaved work

Reproduction on the live demo:

1. Record and stop one note.
2. Change the take name to `Unsaved switch test`.
3. Open **Recital cadence** from Saved takes.

Before opening, the editor contained one unsaved note and the changed title. After opening, it immediately contained the five-note sample and title `Recital cadence`. No dialog appeared and no undo was offered.

Screenshots: `/work/.evidence/takebook-verify-5/unsaved-before-open.png` and `/work/.evidence/takebook-verify-5/unsaved-after-open.png`.

Impact: a teacher or student can lose an unsaved phrase and note through a normal library action. The repaired **Clear notes**, **New take**, and **Record again** paths already show the required confirmation pattern. Saved-take opening needs the same guard.

### Medium 2 — four public capability claims lack required claim coverage

The landing page, help text, metadata, and README make these claims, but `.factory/claims.json` has no matching claim/test that proves the complete behavior:

1. A marked range loops and repeats the phrase.
2. A successful Web MIDI connection records notes and preserves velocity.
3. All named A–K piano keys plus Space and Enter perform their stated actions.
4. The app is installable and saved takes survive installation.

The existing `keyboard-fallback` claim tests denied MIDI and only the A key. The offline claim tests a controlled reload, not installation. No tagged test starts and observes a loop. Under the supplied claims contract, these are four untested public claims and fail acceptance even though the related implementation code exists.

### Minor 3 — public routes have incomplete social metadata

Privacy and terms include only `twitter:card`; they omit `twitter:title`, `twitter:description`, and `twitter:image`. The designed 404 and offline pages omit Open Graph and Twitter metadata. This does not break navigation, but it misses the supplied route-metadata contract.

### Minor 4 — decorative and metaphorical labels remain

The landing and legal copy includes `A pocket notebook for piano phrases`, `Take desk`, `For a teaching week`, and the privacy heading `Your practice stays yours.` These are not direct section names. The supplied plain-words contract requires headings and labels to name the job or section without metaphor or mood copy. The main job headline itself is clear and passes.

## Final decision

**FAIL.** Finding count: **4**. Untested claim count: **4**. The report and result JSON use the implementation candidate `d18d9cf850bc0801467a067b66c9a94f9a3cd07f`; `63adb871faea0642c4044e390ce9060e984dfeb9` is the documentation-only checkout used for verification.
