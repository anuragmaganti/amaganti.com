export type ProjectImageSizingVariables = {
  "--project-image-aspect-ratio": string;
  "--project-image-width-wide": string;
  "--project-image-width-desktop": string;
  "--project-image-width-tablet": string;
  "--project-image-width-mobile": string;
  "--project-image-width-compact": string;
};

type ImageSizeTarget = {
  areaRemSquared: number;
  maxWidthRem: number;
  maxHeightSvh: number;
  viewportClearanceRem: number;
};

const IMAGE_SIZE_TARGETS = {
  wide: {
    areaRemSquared: 760,
    maxWidthRem: 36,
    maxHeightSvh: 62,
    viewportClearanceRem: 4,
  },
  desktop: {
    areaRemSquared: 600,
    maxWidthRem: 31,
    maxHeightSvh: 58,
    viewportClearanceRem: 3,
  },
  tablet: {
    areaRemSquared: 430,
    maxWidthRem: 29,
    maxHeightSvh: 44,
    viewportClearanceRem: 2.25,
  },
  mobile: {
    areaRemSquared: 260,
    maxWidthRem: 24,
    maxHeightSvh: 38,
    viewportClearanceRem: 1.5,
  },
  compact: {
    areaRemSquared: 220,
    maxWidthRem: 22,
    maxHeightSvh: 36,
    viewportClearanceRem: 1.25,
  },
} as const satisfies Record<string, ImageSizeTarget>;

/**
 * Uses equal target areas rather than equal heights. Portrait and square
 * screenshots therefore remain optically comparable to landscape screenshots
 * at every breakpoint without project-specific CSS.
 */
export function createProjectImageSizingVariables(
  width: number,
  height: number,
): ProjectImageSizingVariables {
  const aspectRatio = width / height;

  return {
    "--project-image-aspect-ratio": `${width} / ${height}`,
    "--project-image-width-wide": createImageWidthRule(
      aspectRatio,
      IMAGE_SIZE_TARGETS.wide,
    ),
    "--project-image-width-desktop": createImageWidthRule(
      aspectRatio,
      IMAGE_SIZE_TARGETS.desktop,
    ),
    "--project-image-width-tablet": createImageWidthRule(
      aspectRatio,
      IMAGE_SIZE_TARGETS.tablet,
    ),
    "--project-image-width-mobile": createImageWidthRule(
      aspectRatio,
      IMAGE_SIZE_TARGETS.mobile,
    ),
    "--project-image-width-compact": createImageWidthRule(
      aspectRatio,
      IMAGE_SIZE_TARGETS.compact,
    ),
  };
}

export function getProjectImageTargetArea(
  viewport: keyof typeof IMAGE_SIZE_TARGETS,
) {
  return IMAGE_SIZE_TARGETS[viewport].areaRemSquared;
}

function createImageWidthRule(
  aspectRatio: number,
  target: ImageSizeTarget,
) {
  const equalAreaWidth = Math.sqrt(target.areaRemSquared * aspectRatio);
  const heightLimitedWidth = target.maxHeightSvh * aspectRatio;

  return `min(${format(equalAreaWidth)}rem, ${target.maxWidthRem}rem, ${format(heightLimitedWidth)}svh, calc(100vw - ${target.viewportClearanceRem}rem))`;
}

function format(value: number) {
  return Number(value.toFixed(4));
}
