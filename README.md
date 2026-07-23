# Point-cloud portfolio template

A scroll-driven Next.js portfolio with one persistent React Three Fiber canvas,
DOM-based content, configurable particle text and project fields, dark and light
themes, and responsive motion.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Before shipping a customized version, run:

```bash
npm run check
```

That command runs ESLint, TypeScript, Playwright behavior and visual tests, and
the production build.

## Customization map

The supported template boundary is deliberately small:

| Change | File |
| --- | --- |
| Identity, metadata, intro, About, projects, Skills, outro links | `config/portfolio.ts` |
| Default theme, particle text, head asset, safe global particle tuning | `config/visual.ts` |
| Page order, section renderer, magnetic snap point, scene beats | `config/sections.ts` |
| Camera and particle composition for each scene beat | `config/scene-presets.ts` |
| Project-field geometry | `lib/project-field-presets.ts` |
| Custom React section renderers | `config/custom-sections.tsx` |
| Theme tokens and global foundations | `styles/foundation.css` |
| Section-specific presentation | `styles/*.css` |

Rendering and particle-engine files consume this configuration. Portfolio copy
and routine template changes should not be added to components or engine code.

## Identity and metadata

Edit `siteConfig` in `config/portfolio.ts`:

- `name`, `shortName`, `title`, and `description` set the site identity.
- `url` must be the final canonical production URL.
- `email` is used by the outro mail link.
- `socialPreview` controls Open Graph and X/Twitter share previews.

Place the social image under `public/` and use a root-relative `src`, such as
`/metadata/preview.png`. Keep its declared dimensions equal to the real image.
Replace `app/icon.svg` for the browser icon.

## Intro, About, and links

Edit `introContent`, `contentSections`, and `outroLinks` in
`config/portfolio.ts`.

Content paragraphs are arrays of text and link segments, so links remain
semantic DOM links instead of being embedded in WebGL. Each paragraph can set:

- `enter`: its local section-progress reveal window.
- `from`: `left`, `right`, or `bottom`.
- `exitTo`: `left` or `right`.

The content section's `exit` tuple controls the shared fade-out window. Keep
progress values ordered. Values below zero are valid when copy should begin
appearing during the transition into the section.

For external links, set `external: true`. Use a `mailto:` URL for email links.

## Projects

`projects` in `config/portfolio.ts` is both the project content source and the
project order. Every entry requires:

- a unique `slug`
- a title and concise summary
- proof-point label/body pairs
- a technology list
- an image path, dimensions, and useful alt text
- a `particlePreset`
- optional website and source URLs

Images belong in `public/projects/`. Their intrinsic dimensions prevent layout
shift and should match the actual file.

### Add a project

1. Add its image under `public/projects/`.
2. Add one typed object to `projects`.
3. Choose `contour-sheet`, `torsion-column`, or `bloom-fan` for
   `particlePreset`.
4. Run `npm run check`.

The section registry derives the card section and its scene handoff from the
project array. No component, timeline range, or route edit is required.

### Remove or reorder projects

Delete an entry or move it within the `projects` array. The DOM order, timeline,
project-to-project morphs, Skills handoff, and outro source field update from the
same order automatically. At least one project is currently required.

## Skills

In `config/portfolio.ts`:

- `skills` controls the large primary rail.
- `technologySkills` controls the corner ticker.

Both arrays use stable unique ids. Reordering the arrays changes display order;
the animation derives its travel distance and duration from the rendered list.

## Sections and scene beats

`portfolioSections` in `config/sections.ts` is the canonical page order. A
section joins three concerns through a narrow definition:

- `layout` selects the scroll-height and sticky-layout family.
- `render` selects DOM rendering.
- `sceneBeats` selects particle/camera states over that section.

`durationWeight` values divide a section's scene time proportionally. They do
not set milliseconds. `transitionEasing` can be `smooth` or `direct`.
`snapLocalProgress` is optional and places the section's magnetic resting point
within its own measured scroll range.

A section may have no scene beats. In that case the timeline holds the previous
particle state across the section. A section may also have one or many beats.

### Add a standard content section

1. Add an entry to `contentSections` in `config/portfolio.ts`.
2. Insert a section in `portfolioSections` with
   `render: { type: "content", contentId: "your-id" }`.
3. Add the scene beats it should use, or leave `sceneBeats: []` to hold the
   preceding particle scene.

The existing content renderer supports the top particle-title/editorial-copy
layout. A visually different layout should use a custom React section rather
than conditionals in the shared content component.

### Add a custom React section

1. Build a component that accepts `CustomSectionRendererProps`.
2. Register it in `customSectionRenderers` in `config/custom-sections.tsx`.
3. Add a section using
   `render: { type: "custom", rendererId: "your-key" }`.
4. Add owned styles under `styles/` and import that stylesheet from
   `app/globals.css` in the intended cascade position.

Use `getSectionTimelineAttributes` and `SectionSnapAnchor` from
`components/portfolio-section-frame.tsx` so measurement and snapping remain
consistent with built-in sections.

### Add a particle-text interlude

1. Add a target to `particleTextTargets` in `config/visual.ts`.
2. Add one or more text-shaped presets in `config/scene-presets.ts` using that
   target id.
3. Add a `particle-text` section and reference those preset ids in its beats.

Keep a real, visually hidden heading through the section renderer. Particle
glyphs are decorative and should not replace accessible DOM text.

## Project particle fields

Each project selects a named geometry preset from
`lib/project-field-presets.ts`. To create another:

1. Add a typed geometry entry to `PROJECT_FIELD_PRESETS`.
2. Add its camera/cloud composition to `projectScenePresets` in
   `config/scene-presets.ts`.
3. Select the new id on a project.

Geometry presets define the field itself. Scene presets define how that field is
framed. Card exclusion is applied later by the obstacle engine, so new fields
automatically repel around measured card edges and corners in both scroll
directions.

## Safe particle tuning

Use `particleVisualConfig` in `config/visual.ts` for owner-facing changes:

- `density.maxPoints`: maximum shared point count. The shipped composition is
  characterized at `8000`.
- `appearance.pointSizeScale`: global point-size multiplier.
- `appearance.noiseScale`: global procedural-noise multiplier.
- `appearance.darkProjectOpacityMultiplier`: project-field opacity adjustment
  applied only in dark mode.
- `interaction.pointerRepulsionStrength`: cursor field multiplier; `0` disables
  it.
- `interaction.cardRepulsionStrength`: card-exclusion multiplier; `0` disables
  it.
- `quality`: standard and reduced-motion noise/halo multipliers.

For text targets, `fillDensity` controls solid glyph coverage, while
`haloDensity` and `haloRadius` control surrounding dispersion. Change one group
at a time and update visual snapshots only after checking all viewports and both
themes.

Low-level smoothing, projection, and render-loop constants intentionally remain
inside the engine modules.

## Replace the head point cloud

The runtime asset is raw little-endian `Float32` XYZ triplets with no header:

- 12 bytes per point
- `x`, `y`, and `z` stored as 32-bit floats
- any source scale is accepted because the loader normalizes the cloud
- source orientation is corrected at runtime before normalization

The included asset is `public/models/face-points.bin`. Convert an ASCII or
binary PLY file with:

```bash
npm run point-cloud:convert -- path/to/scan.ply public/models/face-points.bin
```

Then update `particleVisualConfig.headAsset.path` if the filename changed. Tune
the X/Y/Z Euler orientation in `config/visual.ts`; rotations are radians and are
applied in X, then Y, then Z order. Do not bake responsive scale or screen
position into the asset. Viewport framing owns those concerns.

The runtime evenly samples large assets down to `maxPoints`. Keep enough source
points to preserve the silhouette, but do not pre-expand a sparse scan with
duplicate points. If loading fails, a procedural fallback face keeps the scene
functional.

## Theme and styling

Set `themeConfig.defaultTheme` to `dark` or `light` in `config/visual.ts`. The
choice is bootstrapped before hydration and persisted under `storageKey`.

User-facing theme colors are CSS custom properties at the top of
`styles/foundation.css`. Dark values live in `:root`; light overrides live in
`[data-theme="light"]`. Keep theme-specific visual changes in those tokens where
possible rather than duplicating component rules.

The stylesheet import order in `app/globals.css` is intentional and preserves
the cascade: foundation, shared sections, intro/outro, project cards, responsive
deltas, then reduced motion.

## Validation and deployment

Useful commands:

```bash
npm run lint
npm run typecheck
npm run test:e2e
npm run test:e2e:update
npm run build
npm run check
```

`test:e2e:update` replaces visual baselines. Use it only after an intentional,
reviewed visual change.

The site is a statically prerendered Next.js app. Deploy it to Vercel by
importing the repository, or build and run it on any Node-compatible host with
`npm run build` and `npm run start`. Set the production URL in `siteConfig`
before deployment so canonical and social metadata resolve correctly.

## Architecture invariants

Template changes should preserve:

- one fixed React Three Fiber canvas for the complete page
- `frameloop="demand"`
- DOM-based readable content and links
- one measured section registry for page order and scene timing
- allocation-free per-frame and per-particle hot paths
- card obstacle measurement outside the per-particle loop
- dynamic display-pixel-ratio quality
- pointer interaction only on supported fine-pointer devices
- reduced-motion fallbacks

See `docs/refactor-baseline.md` for the pre-refactor measurements and protected
behavior used during the architecture migration.
