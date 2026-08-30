# Takebook visual thesis

## Direction: night-market neon signage

Takebook should feel like two players meeting at a tiny music stall after dark: immediate, warm, a little electric, and far less intimidating than a studio. The product uses a dark, explicitly single-mode treatment so luminous controls read like physical signs against an ink-blue street. The piano roll is the merchandise on the counter; decoration never competes with it.

## Palette

- `night-950` `#080B14`: page background, like the sky beyond the awnings.
- `night-900` `#101523`: working surface.
- `night-800` `#1A2233`: raised controls and inactive keys.
- `paper` `#F7F1DF`: primary text and warm key faces (15.6:1 on `night-950`).
- `paper-dim` `#BFC5D2`: supporting text (10.5:1 on `night-950`).
- `cyan` `#36E5F5`: primary action, playhead, keyboard focus (11.5:1 on `night-950`).
- `cyan-ink` `#032C35`: text on cyan.
- `coral` `#FF6F61`: record state and warnings; paired with icons/text, never color alone.
- `marigold` `#FFC857`: loop range and warm sign-light.
- `mint` `#67E8A5`: saved/success state.
- `danger` `#FF8B91`: destructive text.

Surfaces are opaque and edges are crisp. Sparse 1px cyan/marigold highlights evoke bent neon tubing without a generic glassmorphic or gradient-heavy look.

## Typography

Two self-hosted files only. `Space Grotesk` (OFL, variable WOFF2) is the compact, engineered sign face for display and controls. `Atkinson Hyperlegible Next` (OFL, variable WOFF2) is used for body copy and note entry because teachers need long-session legibility. Numerals use tabular figures. Scale: 13 / 16 / 20 / 28 / clamp(36–64) px; body line-height 1.55; readable text capped near 68 characters.

## Spacing and shape

An 8px base rhythm with 4px micro-adjustments. Main gutters are 16px on a 390px phone, 24px on tablet, and 40px on desktop. Touch targets are at least 44px. Corners use 8px on controls and 16px on independent “stall” sections, with a clipped upper-right corner on major panels to recall hanging placards. Phone layout stacks transport, roll, note, then library; desktop uses a 7/5 workbench split.

## Interaction grammar

- Cyan means “do this now”; coral is reserved for active recording/destructive risk; marigold marks a chosen loop.
- Recording changes both label and icon, starts a visible timer, and adds notes to the roll immediately.
- The piano roll is a real timeline. Drag the two labelled loop handles or use their numeric fields; playback visibly wraps inside the chosen range.
- Computer keys `A W S E D F T G Y H U J K` are a playable chromatic octave; `Space` records/stops outside text fields; `Enter` plays/stops. Hardware MIDI is optional enhancement.
- Feedback appears close to its origin plus in a polite live region. Destructive actions require a named confirmation.

## Motion

Motion has physical logic: new notes rise a few pixels into the roll, the playhead moves linearly, and status toasts slide from the lower edge in 180–240ms. Nothing decorative loops. Under `prefers-reduced-motion`, transforms and smooth scrolling are removed, transitions become near-instant, and only the static playhead position changes.

## Original asset plan and provenance

Hero asset: an original wide editorial illustration of an empty after-hours piano practice kiosk under neon awnings, with paired stools and a luminous piano-roll receipt. It communicates the two-person, lightweight “keep this take” job without claiming online collaboration. It is generated with the factory image model, then reviewed and converted to responsive AVIF/WebP files. PWA icons and interface symbols are original hand-authored SVG/geometric assets.

Prompt sheet (use case `illustration-story`): “Wide editorial cut-paper and gouache illustration for a browser piano practice takebook. Empty night-market music kiosk after rain, compact electric keyboard on a counter, two mismatched stools suggesting teacher and student, a single curling piano-roll receipt with abstract note blocks, cyan neon tubing, coral paper lantern, marigold task lamp, deep ink-blue shadows, tactile paper grain, three-quarter view, strong quiet negative space, warm humane mood. No people, no text, no letters, no logos, no brands, no watermark, no screens showing an app, no gradients, no photorealism.”

Provenance: generated for Takebook on 2026-08-28 with the Param Factory Azure image deployment (`factory-image`) using `/opt/fleet/lib/gen-image.sh`; original project asset under the repository MIT license. Generated imagery is disclosed in the footer.

The 1200 × 630 social preview is a center crop of that reviewed original, made on 2026-08-30. The 180 px Apple touch icon is resized from the hand-authored Takebook app icon. No new generated subject matter was added during the repair.

## Accessibility and responsive intent

The dark treatment is intentional and contrast-checked. Focus is a 3px cyan ring plus offset, not color alone. Each transport icon has a visible text label. The roll has a text summary; range controls have bound labels. At 390px the illustration becomes a shallow banner, secondary explanatory copy is shortened, and the library becomes a vertical list. Nothing required is hover-only and the page supports 200% zoom without fixed overlays.
