# Media shelves implementation plan

## Scope

Add one section between `skills-stage` and `outro` containing three shelves:

1. Books
2. Movies
3. TV Shows

Each shelf contains a snapshot of the current US top 10 captured on
2026-07-28. The catalog is configuration-driven so owners can replace, reorder,
or add entries without editing rendering or motion code.

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

- Native horizontal overflow owns trackpad and touch scrolling.
- Pointer drag maps directly to `scrollLeft` and captures the pointer.
- Release velocity continues through requestAnimationFrame-based exponential
  damping while the repeated track wraps seamlessly.
- A new drag, wheel input, resize, or visibility change cancels active inertia.
- Keyboard users can focus a shelf and use Left, Right, Home, and End.
- Reduced motion keeps direct dragging and native scrolling but disables
  post-release inertia and animated keyboard scrolling.
- Dragging never prevents ordinary vertical page scrolling from the trackpad.

## Architecture

- Render with React DOM and CSS, not a second WebGL scene.
- Register the section through the existing custom-section boundary.
- Keep catalog data in `config/media-shelves.ts`.
- Keep reusable shelf UI and input physics under `features/media-shelves/`.
- Keep shelf-specific CSS in `styles/media-shelves.css`.
- Fade the existing `skills-ambient` field to a quieter shelf-specific variant
  during the final sliver of Skills. The shelves hold that variant, and the
  outro starts its field-to-head morph from it, so neither boundary pops.

## Data and artwork

- Books: Apple Books US Top Paid RSS feed.
- Movies: Apple iTunes US Top Movies RSS feed.
- TV Shows: Apple iTunes US Top TV Seasons RSS feed.
- Store a dated metadata snapshot in the repo, not a runtime API request.
- Load Apple-hosted artwork through Next Image with explicit dimensions,
  responsive `sizes`, lazy loading, and low fetch priority.
- Do not duplicate downloaded third-party cover files in the repository.
- Every item retains its source URL and accessible title/creator metadata.

## Performance budget

- No new canvas, render loop, physics engine, or global listener per shelf.
- One shared hook implementation; listeners attach only to each shelf element.
- Inertia requests frames only after a qualifying drag and stops below its
  velocity threshold.
- Artwork below the fold remains lazy and dimensioned to prevent layout shift.
- Reflections reuse the same optimized image URL and avoid new source downloads.
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
