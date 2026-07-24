import {
  floatingProjectCardRoles,
  floatingProjectLayoutPresets,
  mapFloatingProjectCards,
  type FloatingProjectCardRole,
  type FloatingProjectLayoutPresetId,
} from "@/features/floating-projects/config";

export type FloatingProjectArenaSize = {
  width: number;
  height: number;
};

export type FloatingProjectCardSize = FloatingProjectArenaSize;

export type FloatingProjectCardPlacement = {
  x: number;
  y: number;
  angle: number;
};

export type PreservedFloatingProjectPlacement = FloatingProjectCardPlacement;

export type FloatingProjectCardPlacements = Record<
  FloatingProjectCardRole,
  FloatingProjectCardPlacement
>;

const MIN_DESKTOP_SIDE_GAP = 18;

export function createFloatingProjectCardPlacements(
  arena: FloatingProjectArenaSize,
  cardSizes: Record<FloatingProjectCardRole, FloatingProjectCardSize>,
  preserved: Partial<
    Record<FloatingProjectCardRole, PreservedFloatingProjectPlacement>
  > | null,
  presetId: FloatingProjectLayoutPresetId,
): FloatingProjectCardPlacements {
  const preset = floatingProjectLayoutPresets[presetId];
  const angleScale = arena.width < 700 ? 0.35 : 1;
  const defaultAngles = mapFloatingProjectCards(
    (role) => preset.angles[role] * angleScale,
  );

  if (preserved) {
    return mapFloatingProjectCards((role) => {
      const size = cardSizes[role];
      const placement = preserved[role];

      return createBoundedPlacement(
        arena,
        size,
        placement?.x ?? 0.5,
        placement?.y ?? 0.5,
        placement?.angle ?? defaultAngles[role],
      );
    });
  }

  const desktopLayout =
    arena.width >= 1040 &&
    cardSizes.media.width +
      cardSizes.copy.width +
      preset.columnGap +
      MIN_DESKTOP_SIDE_GAP * 2 <=
      arena.width;

  if (desktopLayout) {
    return createDesktopPlacements(
      arena,
      cardSizes,
      presetId,
      defaultAngles,
    );
  }

  const cardsHeight = floatingProjectCardRoles.reduce(
    (total, role) => total + cardSizes[role].height,
    0,
  );
  const gap = Math.min(
    preset.stackGap,
    Math.max((arena.height - cardsHeight) / 2, 0),
  );
  const availableSpace = Math.max(arena.height - cardsHeight - gap * 2, 0);
  let cursorY = clamp(
    availableSpace * 0.5 + preset.stackVerticalBias * arena.height,
    0,
    availableSpace,
  );
  const offsetScale = arena.width < 540 ? 0.7 : 1;
  const baseX = arena.width < 540
    ? { media: 0.47, copy: 0.52, actions: 0.48 }
    : { media: 0.42, copy: 0.56, actions: 0.45 };

  return mapFloatingProjectCards((role) => {
    const size = cardSizes[role];
    const placement = createBoundedPlacement(
      arena,
      size,
      baseX[role] + preset.stackXOffsets[role] * offsetScale,
      (cursorY + size.height * 0.5) / arena.height,
      defaultAngles[role],
    );

    cursorY += size.height + gap;
    return placement;
  });
}

function createDesktopPlacements(
  arena: FloatingProjectArenaSize,
  cardSizes: Record<FloatingProjectCardRole, FloatingProjectCardSize>,
  presetId: FloatingProjectLayoutPresetId,
  angles: Record<FloatingProjectCardRole, number>,
) {
  const preset = floatingProjectLayoutPresets[presetId];
  const horizontalSlack =
    arena.width -
    cardSizes.copy.width -
    cardSizes.media.width -
    preset.columnGap;
  const leftInset = horizontalSlack * preset.horizontalBalance;
  const copyCenterX = leftInset + cardSizes.copy.width * 0.5;
  const mediaCenterX =
    leftInset +
    cardSizes.copy.width +
    preset.columnGap +
    cardSizes.media.width * 0.5;
  const mediaStackHeight =
    cardSizes.media.height +
    preset.mediaActionGap +
    cardSizes.actions.height;
  const mediaStackTop = clamp(
    arena.height * preset.mediaCenterY - cardSizes.media.height * 0.5,
    0,
    Math.max(arena.height - mediaStackHeight, 0),
  );

  return {
    media: createBoundedPlacement(
      arena,
      cardSizes.media,
      mediaCenterX / arena.width,
      (mediaStackTop + cardSizes.media.height * 0.5) / arena.height,
      angles.media,
    ),
    copy: createBoundedPlacement(
      arena,
      cardSizes.copy,
      copyCenterX / arena.width,
      preset.copyCenterY,
      angles.copy,
    ),
    actions: createBoundedPlacement(
      arena,
      cardSizes.actions,
      mediaCenterX / arena.width + preset.actionsXShift,
      (mediaStackTop +
        cardSizes.media.height +
        preset.mediaActionGap +
        cardSizes.actions.height * 0.5) /
        arena.height,
      angles.actions,
    ),
  };
}

function createBoundedPlacement(
  arena: FloatingProjectArenaSize,
  size: FloatingProjectCardSize,
  xRatio: number,
  yRatio: number,
  angle: number,
): FloatingProjectCardPlacement {
  return {
    x: clamp(
      arena.width * xRatio,
      size.width * 0.5,
      Math.max(size.width * 0.5, arena.width - size.width * 0.5),
    ),
    y: clamp(
      arena.height * yRatio,
      size.height * 0.5,
      Math.max(size.height * 0.5, arena.height - size.height * 0.5),
    ),
    angle,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
