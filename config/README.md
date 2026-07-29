# Template configuration

This directory is the supported customization boundary for portfolio owners.
Rendering components should consume these values rather than define editable
copy or visual preferences themselves.

## Owner content

- `site.ts`: identity, metadata, intro copy, and outro links.
- `projects.ts`: project content and display order.
- `content-sections.ts`: About and future editorial section content.
- `skills.ts`: the primary Skills rail and technology ticker.
- `media-shelves.ts`: shelf order, metadata sources, and sort modes.
- `media/`: rich Books, Movies, and TV Shows catalog entries and artwork.

Array order is display order. Keep project slugs, content ids, and skill ids
unique because they are used as stable section and accessibility identifiers.

Project images and optional videos belong in `public/projects/`. Always provide
the image or video poster's intrinsic width and height and a useful accessible
description. Video entries use the image as a loading-failure fallback. Select one of the typed
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

## Media shelves

The media library is static rather than a runtime feed. This keeps rendering
deterministic and prevents third-party metadata requests from delaying the
portfolio. Add, remove, or manually reorder entries in `media/books.ts`,
`media/movies.ts`, and `media/tv-shows.ts`; the endless tracks and reflections
adapt to any non-empty item count automatically. The catalog helpers in
`media/define-catalog.ts` supply repeated fields such as item kind, creator
labels, default TV metadata, and standard movie artwork dimensions.

After changing a catalog entry or its artwork source, run `npm run media:sync`.
The command generates content-hashed WebP variants in `public/media-shelves/`
and updates `media/artwork-manifest.json`; commit both outputs with the catalog
change. The manifest is intentionally compact generated data. Runtime shelves
use only those local assets, while the source URL stays in the catalog as
provenance and as input for future syncs.

`mediaShelfOrder` in `media-shelves.ts` controls the three row order. Change a
value in `mediaShelfSortModes` to `oldest-first`, `newest-first`,
`alphabetical`, or `manual`. The `manual` mode preserves the array order in that
category's catalog file. Each entry keeps rich metadata and a stable source id
for future detail panels without introducing a runtime API dependency.
