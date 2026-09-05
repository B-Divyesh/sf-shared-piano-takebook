# Takebook verification 5 handoff

## Status

**FAIL** under work order `shared-piano-takebook-verify-5`.

- Findings: 4 (2 medium, 2 minor)
- Untested public claims: 4
- Implementation reviewed: `d18d9cf850bc0801467a067b66c9a94f9a3cd07f`
- Documentation checkout: `63adb871faea0642c4044e390ce9060e984dfeb9`
- Live URL: <https://shared-piano-takebook.sociobot.in>

No product code was changed. Full evidence and reproductions are in [verification-5.md](verification-5.md).

## Main blocker

Opening another saved take immediately replaces an unsaved recording and take-card edits. There is no confirmation or undo. Reproduced live by recording one note in the demo, changing the title, and opening **Recital cadence**.

The claim registry also omits required end-to-end coverage for loop playback, successful velocity-aware Web MIDI input, the full named keyboard shortcuts, and installability/persistence through installation.

Minor gaps remain in route social metadata and direct plain-language section labels.

## Passing evidence

- Clean install: 172 packages, 0 vulnerabilities.
- Lint and type-check: pass.
- Unit tests: 13/13.
- Local browser tests: 21/21.
- Live browser tests: 20/20; one local-only update simulation skipped.
- All 11 declared claim commands: 1/1 pass independently.
- Factory URL verifier: pass.
- Axe: zero violations of any severity on root, demo, privacy, terms, and 404 at desktop and 390 px reduced motion.
- Live Lighthouse: 99 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; LCP 1.6 s, TBT 80 ms, CLS 0.
- Deployment identity: 28/28 public build files match production.
- Demo: realistic populated output, persistent label, reset, separate storage, and untouched real data pass.
- Offline reload, cached privacy, worker update notice, exports/import, invalid input, 60-second limit, damaged-row recovery, tempo clamp, and existing unsaved-work dialogs pass.
- Billing API: health 200; checkout 303 to hosted Dodo checkout; invalid verify 200/no-store; request 31 returns 429 with `Retry-After: 4`.
- All earlier verification findings are fixed; the saved-take switch is a newly found destructive path.

Evidence files are under `/work/.evidence/takebook-verify-5/`. The required report copy is `/work/.evidence/qa-report.md`; the machine result is `/work/.evidence/qa-result.json`.

## Run again

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

After repairing the saved-take guard and contract gaps, rerun every claim command and repeat live desktop/phone, offline, billing, accessibility, deployment-identity, and Lighthouse checks.
