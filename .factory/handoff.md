# Takebook handoff

## Delivered

Takebook v1 is a complete static, local-first piano practice PWA. A user can record up to 60 seconds from the computer keyboard or Web MIDI, see velocity-aware note events in a piano roll, adjust and continuously play a loop range with bar/time feedback, add a teacher note and tempo, save/reopen/delete takes in IndexedDB, and export standard MIDI, locally synthesized WAV, or a JSON library backup. JSON backups can be restored.

The free tier includes unlimited local takes, notes, looping, and all data/audio exports. The $9 one-time Teacher pack adds custom folders and printable practice sheets. Checkout links to the Sociobot product-slug endpoint; returned/pasted tokens are stored locally and verified at most daily without blocking the free first paint. Privacy and terms pages describe local storage, billing, and verification.

The app is installable and offline-capable with a versioned service-worker cache, navigation fallback, manifest, 192/512 maskable icon, update toast, and an explicit online/offline state. It includes storage/error/empty states, delete confirmation, keyboard shortcuts, 44px controls, reduced-motion behavior, and a responsive phone layout.

The unique night-market neon system is documented in `.factory/design.md`. The original generated kiosk illustration, prompt, review, and provenance are in `assets/src/`; 960/1440 AVIF and WebP derivatives ship locally. Fonts are self-hosted.

## Run and verify

```sh
npm ci
npm run check
npm test
npm run build
npm run test:e2e
```

Deployment command: `npm run build`

Deployment directory: `dist/` (`dist/index.html` is at its root)

Verified on 2026-08-28:

- TypeScript: pass
- Vitest: 4/4 unit tests pass (MIDI, WAV, filename encoding)
- Playwright 1.58.2 Chromium: 4/4 pass
  - keyboard recording → annotation → IndexedDB save → reload → reopen
  - service-worker-controlled offline reload
  - privacy/terms semantics
  - axe scan with zero serious or critical violations
- Browser console/page errors during those journeys: none
- Production bundle: 28.07 KB initial JS (10.29 KB gzip), 11.52 KB CSS (3.52 KB gzip), 56 KB total fonts
- Mobile hero: 30 KB AVIF / 43 KB WebP at 960px (both below 300 KB)
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100
- Lighthouse lab metrics: LCP 1.7s, CLS 0.002, TBT 20ms, max potential input delay 70ms

## Known limitations and next steps

- Web MIDI availability and device naming depend on the browser/OS; the full computer-keyboard path is always present.
- The billing product is registered later by the factory. The production slug-based checkout/verify contract is implemented, but a real purchase was not made in this build container.
- Audio is an intentionally small original Web Audio synth, not sampled acoustic-piano playback.
- Data sync and live collaboration are intentionally out of scope; users move data with JSON backups.
- A future teacher-pack iteration could add multiple custom sheet layouts after observing real print usage.
