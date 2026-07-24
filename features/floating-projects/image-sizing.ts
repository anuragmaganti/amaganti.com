export type ProjectImageSizingVariables = {
  "--project-image-aspect-ratio": string;
  "--project-image-width-wide": string;
  "--project-image-width-desktop": string;
  "--project-image-width-tablet": string;
  "--project-image-width-mobile": string;
  "--project-image-width-compact": string;
};

type ImageSizeTarget = {
  area: number;
  maxWidth: number;
  maxHeight: number;
  clearance: number;
};

const IMAGE_SIZE_TARGETS = {
  wide: { area: 760, maxWidth: 36, maxHeight: 62, clearance: 4 },
  desktop: { area: 600, maxWidth: 31, maxHeight: 58, clearance: 3 },
  tablet: { area: 430, maxWidth: 29, maxHeight: 44, clearance: 2.25 },
  mobile: { area: 260, maxWidth: 24, maxHeight: 38, clearance: 1.5 },
  compact: { area: 220, maxWidth: 22, maxHeight: 36, clearance: 1.25 },
} as const satisfies Record<string, ImageSizeTarget>;

/** Keeps portrait, square, and landscape screenshots optically comparable. */
export function createProjectImageSizingVariables(
  width: number,
  height: number,
): ProjectImageSizingVariables {
  const aspectRatio = width / height;
  const widths = Object.fromEntries(
    Object.entries(IMAGE_SIZE_TARGETS).map(([viewport, target]) => [
      `--project-image-width-${viewport}`,
      createImageWidthRule(aspectRatio, target),
    ]),
  ) as Omit<ProjectImageSizingVariables, "--project-image-aspect-ratio">;

  return {
    "--project-image-aspect-ratio": `${width} / ${height}`,
    ...widths,
  };
}

export function getProjectImageTargetArea(
  viewport: keyof typeof IMAGE_SIZE_TARGETS,
) {
  return IMAGE_SIZE_TARGETS[viewport].area;
}

function createImageWidthRule(aspectRatio: number, target: ImageSizeTarget) {
  const equalAreaWidth = Math.sqrt(target.area * aspectRatio);
  const heightLimitedWidth = target.maxHeight * aspectRatio;

  return `min(${format(equalAreaWidth)}rem, ${target.maxWidth}rem, ${format(heightLimitedWidth)}svh, calc(100vw - ${target.clearance}rem))`;
}

function format(value: number) {
  return Number(value.toFixed(4));
}
