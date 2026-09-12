const VISIBLE_SLOTS = 8;
const EDGE_SLOTS = 1.5;
const PRIMARY_SKILL_STEP_VH = 56;
const TECHNOLOGY_STEP_VH = 14;
const MINIMUM_SCROLL_TRAVEL_VH = 280;

export type TrackGeometry = {
  arcLength: number;
  horizontalLength: number;
  pathLength: number;
  radius: number;
  rightX: number;
  startX: number;
  topY: number;
  verticalLength: number;
};

export type ViewportSize = {
  height: number;
  width: number;
};

export type TrackRenderMode = "horizontal" | "vertical" | "bend" | "start" | "end";

type LabelViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
  offset: number;
};

export type LabelFrames = {
  halfWidth: number;
  viewports: Record<TrackRenderMode, LabelViewport>;
};

export function createLabelFrames(
  geometry: TrackGeometry,
  textLength: number,
  fontSize: number,
): LabelFrames {
  // Include glyph overhangs and antialiasing in each small SVG surface. Switch
  // to the original curved path before any part of a letter reaches the bend.
  const halfWidth = Math.ceil(textLength / 2 + fontSize);
  const padding = Math.ceil(fontSize * 1.5);
  const cornerX = geometry.rightX - geometry.radius;
  const cornerY = geometry.topY + geometry.radius;
  const endY = cornerY + geometry.verticalLength;
  const bendLeft = Math.max(0, cornerX - halfWidth * 2);
  const endTop = Math.max(cornerY, endY - halfWidth * 2);

  return {
    halfWidth,
    viewports: {
      horizontal: {
        x: cornerX / 2 - halfWidth,
        y: geometry.topY - padding,
        width: halfWidth * 2,
        height: padding * 2,
        offset: cornerX / 2,
      },
      vertical: {
        x: geometry.rightX - padding,
        y: cornerY + geometry.verticalLength / 2 - halfWidth,
        width: padding * 2,
        height: halfWidth * 2,
        offset: cornerX + geometry.arcLength + geometry.verticalLength / 2,
      },
      bend: {
        x: bendLeft,
        y: geometry.topY - padding,
        width: geometry.rightX + padding - bendLeft,
        height:
          Math.min(endY, cornerY + halfWidth * 2) - geometry.topY + padding * 2,
        offset: 0,
      },
      start: {
        x: 0,
        y: geometry.topY - padding,
        width: halfWidth * 2,
        height: padding * 2,
        offset: 0,
      },
      end: {
        x: geometry.rightX - padding,
        y: endTop - padding,
        width: padding * 2,
        height: endY - endTop + padding * 2,
        offset: 0,
      },
    },
  };
}

export function getTrackRenderMode(
  geometry: TrackGeometry,
  offset: number,
  halfWidth: number,
): TrackRenderMode {
  const cornerX = geometry.rightX - geometry.radius;
  const verticalStart = cornerX + geometry.arcLength;
  const pathEnd = geometry.startX + geometry.pathLength;

  if (offset + halfWidth < cornerX) {
    return offset - halfWidth > 0 ? "horizontal" : "start";
  }

  if (offset - halfWidth > verticalStart) {
    return offset + halfWidth < pathEnd ? "vertical" : "end";
  }

  return "bend";
}

export function getSkillsScrollHeightVh(
  technologyCount: number,
  primarySkillCount: number,
) {
  const primaryTravel =
    Math.max(primarySkillCount - 1, 0) * PRIMARY_SKILL_STEP_VH;
  const technologyTravel =
    Math.max(technologyCount - 1, 0) * TECHNOLOGY_STEP_VH;
  const scrollTravel = Math.max(
    MINIMUM_SCROLL_TRAVEL_VH,
    primaryTravel,
    technologyTravel,
  );

  return 100 + scrollTravel;
}

export function createTrackGeometry({ height, width }: ViewportSize): TrackGeometry {
  if (height <= 0 || width <= 0) {
    return {
      arcLength: 0,
      horizontalLength: 0,
      pathLength: 0,
      radius: 0,
      rightX: 0,
      startX: 0,
      topY: 0,
      verticalLength: 0,
    };
  }

  const isMobile = width <= 640;
  const topY = clamp(
    height * (isMobile ? 0.022 : 0.026),
    isMobile ? 12 : 16,
    isMobile ? 20 : 24,
  );
  const rightX =
    width -
    clamp(width * 0.034, isMobile ? 16 : 28, isMobile ? 24 : 56);
  const startX = isMobile
    ? width * 0.12
    : clamp(width * 0.1, 72, 128);
  const radius = clamp(
    Math.min(width, height) * (isMobile ? 0.07 : 0.085),
    isMobile ? 28 : 48,
    isMobile ? 46 : 88,
  );
  const horizontalLength = Math.max(rightX - radius - startX, 1);
  const arcLength = radius * (Math.PI / 2);
  const verticalLength = Math.max(
    height * (isMobile ? 0.92 : 0.9) - (topY + radius),
    1,
  );
  const pathLength = horizontalLength + arcLength + verticalLength;

  return {
    arcLength,
    horizontalLength,
    pathLength,
    radius,
    rightX,
    startX,
    topY,
    verticalLength,
  };
}

export function getTrackPath(geometry: TrackGeometry) {
  if (geometry.pathLength <= 0) {
    return "";
  }

  const cornerX = geometry.rightX - geometry.radius;
  const cornerY = geometry.topY + geometry.radius;
  const endY = cornerY + geometry.verticalLength;

  return [
    `M 0 ${geometry.topY}`,
    `H ${cornerX}`,
    `A ${geometry.radius} ${geometry.radius} 0 0 1 ${geometry.rightX} ${cornerY}`,
    `V ${endY}`,
  ].join(" ");
}

export function getTrackOffset(geometry: TrackGeometry, progress: number) {
  return geometry.startX + clamp01(progress) * geometry.pathLength;
}

export function getItemProgress(
  sectionProgress: number,
  index: number,
  itemCount: number,
) {
  const travelSlots =
    Math.max(itemCount - 1, 0) + VISIBLE_SLOTS - EDGE_SLOTS * 2;

  return (
    (clamp01(sectionProgress) * travelSlots - index + EDGE_SLOTS) /
    VISIBLE_SLOTS
  );
}

export function getItemOpacity(itemProgress: number, geometry: TrackGeometry) {
  if (geometry.pathLength <= 0) {
    return 0;
  }

  const verticalStart =
    (geometry.horizontalLength + geometry.arcLength) / geometry.pathLength;
  const verticalProgress = clamp01(
    (itemProgress - verticalStart) / Math.max(1 - verticalStart, 0.0001),
  );
  const entranceOpacity = smoothstep(0, 0.035, itemProgress);
  const bottomFade = 1 - smoothstep(0.5, 1, verticalProgress);

  return entranceOpacity * bottomFade;
}

export function smoothstep(min: number, max: number, value: number) {
  const progress = clamp01((value - min) / Math.max(max - min, 0.0001));

  return progress * progress * (3 - 2 * progress);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}
