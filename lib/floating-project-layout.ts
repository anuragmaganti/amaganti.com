export const floatingProjectCardRoles = ["media", "copy", "actions"] as const;

export type FloatingProjectCardRole =
  (typeof floatingProjectCardRoles)[number];

export type FloatingProjectArenaSize = {
  width: number;
  height: number;
};

export type FloatingProjectCardSize = {
  width: number;
  height: number;
};

export type FloatingProjectCardPlacement = {
  x: number;
  y: number;
  angle: number;
};

export type PreservedFloatingProjectPlacement = {
  x: number;
  y: number;
  angle: number;
};

export type FloatingProjectCardPlacements = Record<
  FloatingProjectCardRole,
  FloatingProjectCardPlacement
>;

const MIN_DESKTOP_SIDE_GAP = 18;

type FloatingProjectLayoutVariant = {
  columnGap: number;
  mediaActionGap: number;
  horizontalBalance: number;
  copyCenterY: number;
  mediaCenterY: number;
  actionsXShift: number;
  stackGap: number;
  stackVerticalBias: number;
  stackXOffsets: Record<FloatingProjectCardRole, number>;
  angles: Record<FloatingProjectCardRole, number>;
};

const FLOATING_PROJECT_LAYOUT_VARIANTS = [
  {
    columnGap: 58,
    mediaActionGap: 36,
    horizontalBalance: 0.35,
    copyCenterY: 0.42,
    mediaCenterY: 0.44,
    actionsXShift: -0.018,
    stackGap: 14,
    stackVerticalBias: -0.045,
    stackXOffsets: { media: -0.04, copy: 0.03, actions: -0.01 },
    angles: { media: -0.038, copy: 0.026, actions: -0.018 },
  },
  {
    columnGap: 74,
    mediaActionGap: 44,
    horizontalBalance: 0.62,
    copyCenterY: 0.52,
    mediaCenterY: 0.49,
    actionsXShift: 0.028,
    stackGap: 20,
    stackVerticalBias: 0.035,
    stackXOffsets: { media: 0.03, copy: -0.04, actions: 0.05 },
    angles: { media: 0.018, copy: -0.028, actions: 0.024 },
  },
  {
    columnGap: 66,
    mediaActionGap: 30,
    horizontalBalance: 0.48,
    copyCenterY: 0.46,
    mediaCenterY: 0.47,
    actionsXShift: -0.032,
    stackGap: 11,
    stackVerticalBias: -0.015,
    stackXOffsets: { media: -0.01, copy: 0.05, actions: -0.04 },
    angles: { media: -0.012, copy: 0.036, actions: 0.008 },
  },
  {
    columnGap: 82,
    mediaActionGap: 50,
    horizontalBalance: 0.4,
    copyCenterY: 0.54,
    mediaCenterY: 0.5,
    actionsXShift: 0.016,
    stackGap: 22,
    stackVerticalBias: 0.05,
    stackXOffsets: { media: 0.05, copy: -0.02, actions: 0.01 },
    angles: { media: 0.032, copy: -0.014, actions: -0.026 },
  },
  {
    columnGap: 70,
    mediaActionGap: 40,
    horizontalBalance: 0.57,
    copyCenterY: 0.39,
    mediaCenterY: 0.41,
    actionsXShift: 0.04,
    stackGap: 16,
    stackVerticalBias: -0.055,
    stackXOffsets: { media: -0.05, copy: -0.01, actions: 0.04 },
    angles: { media: -0.044, copy: -0.03, actions: 0.03 },
  },
] as const satisfies readonly FloatingProjectLayoutVariant[];

export function createFloatingProjectCardPlacements(
  arena: FloatingProjectArenaSize,
  cardSizes: Record<FloatingProjectCardRole, FloatingProjectCardSize>,
  preserved: Partial<
    Record<FloatingProjectCardRole, PreservedFloatingProjectPlacement>
  > | null,
  layoutKey = "default",
): FloatingProjectCardPlacements {
  const variant = resolveLayoutVariant(layoutKey);
  const angleScale = arena.width < 700 ? 0.35 : 1;
  const defaultAngles = Object.fromEntries(
    floatingProjectCardRoles.map((role) => [
      role,
      variant.angles[role] * angleScale,
    ]),
  ) as Record<FloatingProjectCardRole, number>;

  if (preserved) {
    return Object.fromEntries(
      floatingProjectCardRoles.map((role) => {
        const size = cardSizes[role];
        const placement = preserved[role];
        const x = placement?.x ?? 0.5;
        const y = placement?.y ?? 0.5;

        return [
          role,
          {
            x: clamp(
              x * arena.width,
              size.width * 0.5,
              Math.max(size.width * 0.5, arena.width - size.width * 0.5),
            ),
            y: clamp(
              y * arena.height,
              size.height * 0.5,
              Math.max(size.height * 0.5, arena.height - size.height * 0.5),
            ),
            angle: placement?.angle ?? defaultAngles[role],
          },
        ];
      }),
    ) as FloatingProjectCardPlacements;
  }

  const desktopLayout =
    arena.width >= 1040 &&
    cardSizes.media.width +
      cardSizes.copy.width +
      variant.columnGap +
      MIN_DESKTOP_SIDE_GAP * 2 <=
      arena.width;

  if (desktopLayout) {
    const horizontalSlack =
      arena.width -
      cardSizes.copy.width -
      cardSizes.media.width -
      variant.columnGap;
    const leftInset = horizontalSlack * variant.horizontalBalance;
    const copyCenterX = leftInset + cardSizes.copy.width * 0.5;
    const mediaCenterX =
      leftInset +
      cardSizes.copy.width +
      variant.columnGap +
      cardSizes.media.width * 0.5;
    const actionsCenterX =
      mediaCenterX + arena.width * variant.actionsXShift;
    const mediaStackHeight =
      cardSizes.media.height +
      variant.mediaActionGap +
      cardSizes.actions.height;
    const requestedMediaTop =
      arena.height * variant.mediaCenterY - cardSizes.media.height * 0.5;
    const mediaStackTop = clamp(
      requestedMediaTop,
      0,
      Math.max(arena.height - mediaStackHeight, 0),
    );

    return {
      media: createBoundedPlacement(
        arena,
        cardSizes.media,
        mediaCenterX / arena.width,
        (mediaStackTop + cardSizes.media.height * 0.5) / arena.height,
        defaultAngles.media,
      ),
      copy: createBoundedPlacement(
        arena,
        cardSizes.copy,
        copyCenterX / arena.width,
        variant.copyCenterY,
        defaultAngles.copy,
      ),
      actions: createBoundedPlacement(
        arena,
        cardSizes.actions,
        actionsCenterX / arena.width,
        (mediaStackTop +
          cardSizes.media.height +
          variant.mediaActionGap +
          cardSizes.actions.height * 0.5) /
          arena.height,
        defaultAngles.actions,
      ),
    };
  }

  const cardHeight = floatingProjectCardRoles.reduce(
    (total, role) => total + cardSizes[role].height,
    0,
  );
  const availableGap = Math.max((arena.height - cardHeight) / 2, 0);
  const gap = Math.min(variant.stackGap, availableGap);
  const totalHeight = cardHeight + gap * 2;
  const availableVerticalSpace = Math.max(arena.height - totalHeight, 0);
  let cursorY = clamp(
    availableVerticalSpace * 0.5 + variant.stackVerticalBias * arena.height,
    0,
    availableVerticalSpace,
  );
  const placementFor = (
    role: FloatingProjectCardRole,
    xRatio: number,
  ) => {
    const size = cardSizes[role];
    const placement = createBoundedPlacement(
      arena,
      size,
      xRatio,
      (cursorY + size.height * 0.5) / arena.height,
      defaultAngles[role],
    );

    cursorY += size.height + gap;
    return placement;
  };

  const stackOffsetScale = arena.width < 540 ? 0.7 : 1;

  return {
    media: placementFor(
      "media",
      (arena.width < 540 ? 0.47 : 0.42) +
        variant.stackXOffsets.media * stackOffsetScale,
    ),
    copy: placementFor(
      "copy",
      (arena.width < 540 ? 0.52 : 0.56) +
        variant.stackXOffsets.copy * stackOffsetScale,
    ),
    actions: placementFor(
      "actions",
      (arena.width < 540 ? 0.48 : 0.45) +
        variant.stackXOffsets.actions * stackOffsetScale,
    ),
  };
}

function resolveLayoutVariant(layoutKey: string): FloatingProjectLayoutVariant {
  const numericSuffix = layoutKey.match(/(\d+)$/)?.[1];
  const index = numericSuffix
    ? Math.max(Number(numericSuffix) - 1, 0)
    : stableHash(layoutKey);

  return FLOATING_PROJECT_LAYOUT_VARIANTS[
    index % FLOATING_PROJECT_LAYOUT_VARIANTS.length
  ];
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
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
