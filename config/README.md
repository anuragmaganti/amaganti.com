# Template configuration

This directory is the supported customization boundary for portfolio owners.
Rendering components should consume these values rather than define editable
copy or visual preferences themselves.

## Owner content

- `site.ts`: identity, metadata, intro copy, and outro links.
- `projects.ts`: project content and display order.
- `content-sections.ts`: About and future editorial section content.
- `skills.ts`: the primary Skills rail and technology ticker.

Array order is display order. Keep project slugs, content ids, and skill ids
unique because they are used as stable section and accessibility identifiers.

Project images belong in `public/projects/`. Always provide the image's intrinsic
width and height and a useful alt description. Select one of the typed
`floatingLayout` values for the starting card composition and one of the typed
`particlePreset` values for the field behind each card.

## `visual.ts`

Change the default theme, particle title labels and typography, head asset, and
high-level particle tuning here.

- `maxPoints` controls shared cloud density. The shipped asset and layouts are
  characterized at 8,000 points.
- `pointSizeScale` and `noiseScale` are global multipliers. Start within
  `0.75 -> 1.25` to avoid changing the composition's character.
- Pointer and card repulsion strengths are multipliers; `0` disables an effect
  and `1` preserves the authored behavior.
- Text `fillDensity` reserves particles for solid letterforms. `haloDensity`
  controls the available edge dispersion, while `haloRadius` controls its
  distance.
- The head asset is raw little-endian `Float32` XYZ triplets. Its orientation is
  applied before normalization. The root template guide documents replacement
  and the included PLY conversion command.

Low-level projection, smoothing, and allocation-sensitive render-loop constants
remain internal by design.
