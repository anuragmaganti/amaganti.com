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
- Passed: cover height, spacing, and visible desktop count match the reference's
  proportions; square album art naturally yields fewer visible items than books.
- Passed: the shelf has a shallow top plane, slim front face, and broad soft shadow.
- Passed: reflections are short, vertically mirrored, and fade within the shelf.
- Passed: circular arrows sit outside the artwork run and expose disabled states.
- Passed: tablet and mobile preserve all three rows while reducing visible items.
- Passed: artwork remains fully opaque and unchanged across light and dark themes.
- Passed: shelf particles are quieter than Skills and transition continuously into
  the outro head.

## Result

Passed after desktop, tablet, and mobile review in both themes.

