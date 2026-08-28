# Takebook repair handoff

## Status: repository repair complete; factory billing registration remains a release blocker

This repair addresses the repository-owned finding in independent verification 3 (`741d68c6c2b4aa62c791669e7c568bda346c8673`) for candidate `a129aea7a0b0385cda30eb7cff56591e3e6462be`.

## What changed

- `Clear notes` no longer discards an unsaved phrase immediately. It now opens a native, labelled confirmation dialog that states the exact recorded-note count and that the take-card text remains.
- The safe default is focused (`Keep notes`), supports Enter and Escape through the native dialog, and leaves the piano roll unchanged on cancellation. Confirming `Clear notes` performs the reset and announces the result.
- The existing delete and damaged-entry confirmations now share the same explicit, labelled dialog flow without changing their prior behavior.
- Added a browser regression that records one keyboard note, verifies the note remains visible before and after keyboard cancellation, then confirms clearing and verifies the note disappears and the result is announced.

## Verification performed locally (2026-08-28 UTC)

Clean install and quality gates:

```sh
npm ci                 # PASS: 172 packages installed, 0 vulnerabilities
npm run lint           # PASS
npm run check          # PASS
npm test               # PASS: 3 files, 11 tests
npm run build          # PASS: dist/ with index.html at its root
npm run test:e2e       # PASS: 13 Playwright scenarios
```

The Playwright suite covers desktop keyboard recording, the new destructive-clear confirmation and keyboard cancellation, 390px touch targets/connection wording, legal-page semantics, desktop and mobile Axe checks (zero serious/critical violations), reduced motion, offline reload after service-worker install, synthetic update notification, privacy/on-origin requests, import recovery, and license handling. No package/consumer test applies to this static PWA; physical Web MIDI remains an optional enhancement and was not available.

The production build remains within the static budget: application JS 32,645 B raw / 11,630 B gzip; application CSS 12,153 B raw / 3,670 B gzip; self-hosted fonts 56,284 B; 960px AVIF hero 30,692 B. `tests/deployment.test.ts` passes the static response-policy contract (immutable fingerprinted assets, no-cache service worker/manifest, CSP, HSTS, COOP, Permissions-Policy, nosniff, manifest media type).

## Checkout finding and exact reproduction

The other verifier finding is factory-owned, not repairable in this repository without violating the product rule that the factory owns billing and infrastructure. On 2026-08-28 UTC:

```text
GET https://api.sociobot.in/api/v1/products/shared-piano-takebook/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The UI continues to avoid exposing that broken outbound purchase link while allowing existing license restoration and verification. The researched freemium Teacher pack cannot be accepted as end-to-end release-ready until the factory registers/enables this exact production Sociobot product. After that external action, restore the hosted checkout link and rerun checkout plus live verification.

## Deployment and live checks

The static artifact is deployed with:

```sh
/opt/fleet/lib/deploy-static.sh shared-piano-takebook /work/repo/dist
```

Post-deployment verification results are recorded below after the deployment completes. The artifact class remains `pwa-offline`; no infrastructure, DNS, or billing configuration is committed in this repository.
