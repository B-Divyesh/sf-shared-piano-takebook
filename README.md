# Takebook

Takebook is a local-first piano practice recorder for a teacher and student working on a short phrase together. It records from a computer keyboard or Web MIDI piano, shows the result on a piano roll, loops a marked range, keeps a teacher note, and exports standard MIDI or synthesized WAV without opening a DAW.

Live product: <https://shared-piano-takebook.sociobot.in>

## What is included

- Up to 60 seconds of velocity-aware note recording
- Computer-keyboard input (`A W S E D F T G Y H U J K`) and optional Web MIDI
- Editable loop range with time and bar positions
- Local IndexedDB take library that survives refresh and install
- Standard type-0 MIDI, locally synthesized WAV, and full JSON backup/import
- Installable offline PWA with responsive 390px layout
- Teacher notes on every free take
- Optional $9 one-time Teacher pack with custom folders and printable practice sheets
- Privacy and terms pages; no recording upload, analytics, runtime CDNs, or accounts

The Teacher pack checkout and license verification use the Sociobot billing API. Sociobot/Dodo hosts checkout and acts as merchant of record. No payment-provider code or product ID is embedded in this repository.

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Open the printed local URL. For Web MIDI, use a Chromium-based browser and grant device permission when prompted. The computer keyboard path works without MIDI hardware.

## Test and build

```sh
npm run check
npm test
npm run test:e2e
npm run build
```

`npm run build` is the deployment command. It writes the complete static site to `dist/`, with `dist/index.html` at the root. `npm run preview` serves that build locally. Playwright 1.58.2 is pinned; the browser path supplied by the factory worker is used automatically when present.

## Data and deployment

Takes stay in browser IndexedDB. License state stays in localStorage. Users can export a JSON backup and restore it on another browser. The service worker precaches the shell and uses a navigation fallback for offline use.

Deploy the contents of `dist/` as a static site. Route `/privacy/` and `/terms/` directly to their generated `index.html` files. The factory owns DNS and product registration; this repository does not modify infrastructure.

The original visual direction and asset provenance are in [.factory/design.md](.factory/design.md). Build verification and known limitations are in [.factory/handoff.md](.factory/handoff.md).

## License

MIT. See [LICENSE](LICENSE).
