# Media shelves design QA

## Reference and implementation

- Reference: `/var/folders/ff/h4lldnv907d97l5_pld8j4sc0000gn/T/codex-clipboard-a32643b3-52f7-44fd-8279-e0dfbbd9f0c9.png`
- Desktop snapshots: `tests/visual.spec.ts-snapshots/media-shelves-stage-*-desktop.png`
- Tablet snapshots: `tests/visual.spec.ts-snapshots/media-shelves-stage-*-tablet.png`
- Mobile snapshots: `tests/visual.spec.ts-snapshots/media-shelves-stage-*-mobile.png`

The reference and the light desktop implementation were compared together at
the same shelf state. The source image was scaled to the implementation width;
the implementation was cropped to the first shelf for a direct comparison.

## Checks

- Passed: title and shelf share the same left edge.
- Passed: front covers preserve their aspect ratios and share one baseline.
- Passed: the desktop shelf uses most of the viewport width without increasing
  the height of the three-row composition.
- Passed: cover height and spacing follow the reference's proportions; square
  album art naturally yields fewer visible items than books.
- Passed: the shelf has a shallow top plane, slim front face, and broad soft shadow.
- Passed: each cover baseline sits 25% into the top surface instead of on its back edge.
- Passed: reflections are short, vertically mirrored, synchronized with the cover
  track, and clipped to the trapezoidal shelf surface.
- Passed: edge items can drift beyond the shelf ends and fade before the viewport
  clip, with no hard vertical cut through artwork.
- Passed: circular arrows sit outside the artwork run and navigate the endless track.
- Passed: tablet and mobile preserve all three rows while reducing visible items;
  viewport-height-based row geometry keeps the stage above 90% vertical occupancy
  instead of collapsing with viewport width.
- Passed: the centered item label hides during motion and returns over the settled item.
- Passed: artwork remains fully opaque and unchanged across light and dark themes.
- Passed: shelf particles are quieter than Skills and transition continuously into
  the outro head.

## Result

Passed after desktop, tablet, and mobile review in both themes.
