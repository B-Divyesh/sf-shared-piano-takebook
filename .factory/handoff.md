# Takebook repair 4 handoff

## Status

The repository repair is complete and deployed. Product artifact commit: `d18d9cf`. Production: <https://shared-piano-takebook.sociobot.in>.

The static site, recorder, demo, accessibility, PWA, privacy, and deployment-identity gates pass. The controller-updated billing API demonstrated the required checkout redirect and 30-request rate threshold during this run. A later external API availability check returned a platform-level HTTP 503 for every Sociobot API route; see **External service observation** below.

## Reproduced findings and repairs

1. **Unsaved phrase loss:** Before the repair, Chromium showed no dialog and zero notes after both `New take` and `Record again`. Both paths now open a named confirmation, initially focus the safe **Keep this phrase** action, preserve the phrase on cancel, and perform only the confirmed reset. The keyboard Space recording path uses the same guard.
2. **Tempo 0 mismatch:** Before the repair, saving left `0` visible while reopening showed `96`. The input now visibly changes `0` to `30 BPM`, keeps the explanation beside the field, and persists/reopens `30`.
3. **Live Teacher pack checkout:** The disabled placeholder was replaced with the exact Sociobot checkout link. A live request returned HTTP 303 to `checkout.dodopayments.com`; the page states `$9`, one-time purchase, hosted checkout, merchant of record, refund handling, privacy, and terms.
4. **License restore and rate response:** Valid-license restoration has a recorded browser fixture that proves URL-token capture, `sb_license:shared-piano-takebook` storage, paid folders, printing, and the daily verdict cache. A 429 fixture matches the live response shape and announces the parsed retry delay while retaining the pasted token.
5. **Production rate limit:** The live verification endpoint returned 200 for requests 1–30 and HTTP 429 on request 31 in 478 ms. The 429 included `Retry-After: 4`, product-origin CORS, and `Too Many Requests! Wait for 4s`. Because the API does not expose `Retry-After` to browser JavaScript, Takebook also parses the equivalent delay from the readable response body.

The earlier accepted repairs remain covered: incomplete backup import is rejected atomically; a legacy damaged row is isolated and removable; 390 px piano controls are at least 48 × 52 px with 8 px spacing; invalid-license reconciliation remains explicit; cache and security policies remain intact.

## Additional contract work

- Added one-click `/?demo=1` with three realistic takes, persistent demo banner, reset, and **Start for real**. It uses `demo:takebook` and demo-prefixed license keys. A regression seeds private real data, proves demo isolation, then proves demo data is cleared on exit.
- Added `.factory/claims.json`; all 11 claim selectors run independently from the demo sandbox.
- Added `.factory/demo.md` and `.factory/copy-audit.md`.
- Added canonical/Open Graph/Twitter metadata, a 1200 × 630 social image derived from the reviewed original art, a 180 px touch icon, consistent navigation/footer information, and a designed real HTTP 404 page.
- Added direct “How it works” and local-privacy sections. The established night-market identity and original asset remain unchanged.
- Bumped the service-worker cache to `takebook-v4` and package version to `1.0.1`.

## Verification evidence

Clean install and repository gates on Node 22.23.2 / npm 10.9.8 / Playwright 1.58.2:

- `npm ci`: 172 packages, 0 vulnerabilities.
- `npm run lint`: pass.
- `npm run check`: pass.
- `npm test`: 4 files, 13/13 tests pass.
- `npm run build`: pass; `dist/index.html` present.
- `npm run test:e2e`: 21/21 local Chromium scenarios pass.
- Live suite: 20/20 applicable scenarios pass; one local-only synthetic service-worker update scenario skips.
- Every `.factory/claims.json` command: 1/1 pass, all 11 claims.
- Factory URL verification, local and live: HTTP 200; title, `lang=en`, one `h1`, one `main`, alt text, named buttons, and zero console/page errors pass. Live load was 604 ms.
- Axe 4.13: zero serious or critical findings on root, demo, privacy, terms, 404, and 390 px reduced-motion views.
- Keyboard: recording/playback, skip link, native dialog cancel/confirm, and safe initial dialog focus pass.
- Responsive: desktop, 390 × 844, and 640 CSS-pixel zoom-equivalent layouts inspected; no horizontal overflow. Phone piano keys measure 48 × 52 px.
- Offline/update: `takebook-v4` controls the page; an offline demo reload retains samples and the cached privacy page; a synthetic new worker displays the update notice.
- Privacy: the recorded demo flow covers recording, save, MIDI/WAV/JSON export, JSON import, and legal pages with product-origin requests only.
- Live response policy: HTTP redirects to HTTPS; root HTML uses 30-second revalidation; hashed JS/CSS use one-year immutable caching; worker/manifest use `no-cache`; manifest MIME is correct; HSTS, CSP/anti-framing, COOP, Permissions-Policy, nosniff, and strict-origin referrer policy are present.
- Unknown production URL: HTTP 404 with `Page not found — Takebook` and a return link.
- Deployment identity after the final upload: 28/28 public files match local `dist/` byte-for-byte. Representative hashes: `index.html` `a76bb95c…`, `sw.js` `0457b8e6…`, JS `2e4f30b9…`, CSS `abaa24f3…`.
- Live Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.12 s, LCP 1.36 s, TBT 0 ms, CLS 0.

Production budgets: initial JS 39.08 KB raw / 13.51 KB gzip; app CSS 14.16 KB raw / 4.10 KB gzip; fonts 56.28 KB total; 960 px AVIF hero 30.69 KB. All are within contract budgets.

## Run and verify

```sh
npm ci
npm run lint
npm run check
npm test
npm run build
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://shared-piano-takebook.sociobot.in npm run test:e2e
VERIFY_NODE_MODULES=/work/repo/node_modules /opt/fleet/lib/verify-url.sh https://shared-piano-takebook.sociobot.in /tmp/takebook-verify
```

Deploy the generated site with:

```sh
/opt/fleet/lib/deploy-static.sh shared-piano-takebook /work/repo/dist
```

## External service observation

The billing API passed checkout and rate-limit proof earlier in this run. After the final static deploy, `https://api.sociobot.in/health`, checkout, and verify began returning the same Azure platform HTTP 503 page. Azure reports the separate `sociobot-v2` app as Running/Normal; this repository did not change that service. Takebook fails softly when verification is unavailable, and the free recorder remains fully usable. Recheck the externally owned API before final release promotion; no product-repository change can restore that service.

No library/CLI consumer package, product backend, sign-in flow, or physical MIDI hardware is part of this static PWA verification. Hardware MIDI remains the only unexercised enhancement; denial and the required computer-keyboard fallback pass.
