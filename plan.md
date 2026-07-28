# Media shelves implementation plan

## Scope

Add one section between `skills-stage` and `outro` containing three shelves:

1. Books
2. Movies
3. TV Shows

Each shelf contains a curated catalog. Catalog content, ordering, artwork
sources, rendering, and interaction are separated so owners can replace,
reorder, or add entries without editing shelf motion code.

## Visual contract

The supplied bookshelf screenshot is the source of truth.

- Front covers face the viewer; no spines, detail panel, tilt, or 3D inspection.
- Covers share one optical baseline while preserving their natural aspect ratio.
- Cover art is the dominant color. Surrounding typography and controls stay quiet.
- The shelf is a thin floating slab with a shallow top plane, soft front edge,
  and broad low-contrast shadow.
- Every cover has a short vertically mirrored reflection that fades into the
  shelf surface.
- Names appear as plain text above fully visible covers on hover.
- Dark mode changes the neutral shelf and shadow treatment, never the artwork.
- All three shelves remain present at every viewport. The viewport determines
  how many covers are visible, not how many are rendered.

## Interaction contract

- Embla owns one logical item set and provides continuous looping, drag
  momentum, touch input, and transform-based movement.
- The Embla wheel gestures plugin maps horizontal trackpad input to the same
  rail without trapping ordinary vertical page scrolling.
- Keyboard users can focus a shelf and use Left, Right, Home, and End.
- Reduced motion keeps direct interaction but removes free-running momentum and
  animated keyboard movement.
- Dragging never prevents ordinary vertical page scrolling from the trackpad.

## Architecture

- Render with React DOM and CSS, not a second WebGL scene.
- Register the section through the existing custom-section boundary.
- Keep catalog data in `config/media/` and ordering in
  `config/media-shelves.ts`.
- Keep reusable shelf UI and input physics under `features/media-shelves/`.
- Keep shelf-specific CSS in `styles/media-shelves.css`.
- Fade the existing `skills-ambient` field to a quieter shelf-specific variant
  during the final sliver of Skills. The shelves hold that variant, and the
  outro starts its field-to-head morph from it, so neither boundary pops.

## Data and artwork

- Store catalog metadata in the repo, not behind a runtime API request.
- Keep every item's source URL and accessible title/creator metadata in config.
- Run `npm run media:sync` after artwork changes. The script downloads each
  source once, creates 256/512/768-pixel-high WebP variants, and replaces the
  generated local artwork only after every variant succeeds.
- Serve content-hashed local artwork with immutable caching. The browser chooses
  the appropriate density from `srcset`; remote hosts are never in the runtime
  rendering path.

## Performance budget

- No new canvas, render loop, physics engine, or global listener per shelf.
- One Embla instance and one logical item set per shelf; looping does not clone
  the catalog in React.
- Artwork preloads at low priority after load/idle, then promotes when the shelf
  approaches the viewport. Visible covers and nearby neighbors decode first.
- Artwork remains dimensioned to prevent layout shift.
- Reflections reuse the selected local image URL and browser cache rather than
  downloading another source.
- Shelf layout uses transforms and opacity for moving artwork.

## Responsive behavior

- Desktop: approximately five to seven covers visible per shelf.
- Tablet: approximately four to five covers visible.
- Mobile: approximately two to three covers visible, with larger touch targets.
- Cover height and shelf depth use viewport-height geometry on tablet and mobile
  so all three rows occupy the available screen without clipping.
- Hover labels hide on coarse pointers; drag, touch momentum, and trackpad remain
  available.

## Verification

- Compare the implemented shelf and the supplied screenshot at a matching wide
  viewport, including baseline, spacing, slab depth, shadow, and reflections.
- Test drag inertia, interruption, trackpad scrolling, hover labels, keyboard
  controls, reduced motion, and no accidental vertical scroll trapping.
- Verify desktop, tablet, and mobile layouts in both themes.
- Verify the section order and the particle transition into the outro.
- Run lint, typecheck, focused Playwright behavior tests, full tests, and build.
