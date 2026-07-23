# Refactor baseline

Captured on 2026-07-23 from `main` at `a223803`, before structural changes on
`codex/portfolio-template-refactor`.

## Verification state

| Check | Baseline result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test:e2e` | Fail: no tests existed |
| `npm run build` | Pass with Next.js 16.2.10 |

The tracked application contains 7,565 lines across 15 TypeScript/TSX/CSS
files. The largest files are `app/globals.css` (1,895 lines),
`components/scene-canvas.tsx` (1,836 lines), and
`components/portfolio-experience.tsx` (1,429 lines). Public assets total about
1.6 MB. The production build's largest JavaScript chunk is about 893 KB before
compression.

## Runtime architecture

- `lib/content.ts` contains project, About, primary-skill, and technology copy.
- `lib/scene-config.ts` defines the ordered section registry, scene presets, and
  the derived scroll timeline.
- `components/portfolio-experience.tsx` measures the DOM timeline and renders
  every scroll section, including intro choreography, cards, Skills, and outro.
- `components/scene-canvas.tsx` owns the persistent React Three Fiber canvas,
  morph interpolation, viewport framing, pointer interaction, and card
  exclusion.
- `lib/point-cloud.ts` loads and normalizes point data and generates face, text,
  project-field, and settle targets.
- `hooks/use-particle-obstacle.ts` and
  `lib/particle-obstacle-store.ts` translate live card rectangles into a shared
  obstacle snapshot consumed by the canvas.

## Behavior to preserve

- One fixed, demand-rendered point-cloud canvas remains mounted for the entire
  page and uses the same particles for every scene transition.
- Native vertical scrolling drives intro, About, Projects, every project card,
  Skills, and the returning outro face in registry order.
- Intro copy first resolves in the center, moves into its authored layout, and
  fades while the face disperses into the About title.
- About copy remains accessible DOM text while its title and the Projects title
  remain particle targets.
- Project cards are live rounded-rectangle obstacles. Particles must avoid all
  card edges during forward, reverse, partial, and fast re-entry scrolling.
- The Skills primary rail and technology corner track share one local scroll
  driver. Its ambient field must brighten and reform into the outro face.
- Dark is the default theme. Light mode is persisted in local storage and uses
  the radial View Transition reveal when supported.
- Reduced motion removes snapping and decorative animation without hiding
  content or navigation.

## Baseline checkpoints

Manual screenshots were captured outside the repository at
`/tmp/portfolio-template-baseline/` for intro, About, Projects, the first project
card, Skills, and outro at 1440x900, 768x900, and 390x844 in dark and light
themes. Automated stable-checkpoint screenshots now live beside the Playwright
tests and use reduced motion to remove timing noise.

## Refactor pressure points

- Scene configuration imports portfolio content, so content order and rendering
  concerns are not yet independent.
- `portfolio-experience.tsx` combines global orchestration with every section
  implementation and a custom canvas-button animation loop.
- `scene-canvas.tsx` combines render lifecycle, scene interpolation, responsive
  composition, pointer physics, and obstacle physics in one module.
- Content entries include reveal timing, while section definitions include DOM,
  scroll, and scene concerns; these customization boundaries are unclear.
- Theme bootstrap metadata, contact links, typography, rendering constants, and
  asset paths are distributed across unrelated files.
- CSS ownership is implicit and breakpoint overrides are far from their base
  components, making visual changes difficult to review safely.

This file records the starting contract, not the intended final architecture.
