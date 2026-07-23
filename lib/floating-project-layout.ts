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

const CARD_GAP = 18;

type FloatingProjectLayoutVariant = {
  horizontalBalance: number;
  copyCenterY: number;
  mediaCenterY: number;
  stackShift: number;
  angleOffsets: Record<FloatingProjectCardRole, number>;
};

const FLOATING_PROJECT_LAYOUT_VARIANTS = [
  {
    horizontalBalance: 0.44,
    copyCenterY: 0.45,
    mediaCenterY: 0.42,
    stackShift: -0.018,
    angleOffsets: { media: 0, copy: 0, actions: 0 },
  },
  {
    horizontalBalance: 0.5,
    copyCenterY: 0.49,
    mediaCenterY: 0.4,
    stackShift: 0.014,
    angleOffsets: { media: 0.004, copy: -0.003, actions: 0.002 },
  },
  {
    horizontalBalance: 0.56,
    copyCenterY: 0.44,
    mediaCenterY: 0.45,
    stackShift: -0.008,
    angleOffsets: { media: -0.003, copy: 0.004, actions: -0.002 },
  },
  {
    horizontalBalance: 0.47,
    copyCenterY: 0.51,
    mediaCenterY: 0.41,
    stackShift: 0.022,
    angleOffsets: { media: 0.005, copy: 0.002, actions: -0.003 },
  },
  {
    horizontalBalance: 0.53,
    copyCenterY: 0.47,
    mediaCenterY: 0.44,
    stackShift: -0.024,
    angleOffsets: { media: -0.004, copy: -0.002, actions: 0.003 },
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
  const baseAngles =
    arena.width < 700
      ? { media: -0.006, copy: 0.004, actions: -0.003 }
      : { media: -0.026, copy: 0.018, actions: -0.012 };
  const angleVariationScale = arena.width < 700 ? 0.35 : 1;
  const defaultAngles = Object.fromEntries(
    floatingProjectCardRoles.map((role) => [
      role,
      baseAngles[role] +
        variant.angleOffsets[role] * angleVariationScale,
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
    cardSizes.media.width + cardSizes.copy.width + CARD_GAP * 3 <= arena.width;

  if (desktopLayout) {
    const horizontalSlack =
      arena.width -
      cardSizes.copy.width -
      cardSizes.media.width -
      CARD_GAP;
    const leftInset = horizontalSlack * variant.horizontalBalance;
    const copyCenterX = leftInset + cardSizes.copy.width * 0.5;
    const mediaCenterX =
      leftInset +
      cardSizes.copy.width +
      CARD_GAP +
      cardSizes.media.width * 0.5;
    const mediaStackHeight =
      cardSizes.media.height + CARD_GAP + cardSizes.actions.height;
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
        mediaCenterX / arena.width,
        (mediaStackTop +
          cardSizes.media.height +
          CARD_GAP +
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
  const gap = Math.min(CARD_GAP, availableGap);
  const totalHeight = cardHeight + gap * 2;
  let cursorY = Math.max((arena.height - totalHeight) * 0.5, 0);
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

  const responsiveStackShift =
    variant.stackShift * (arena.width < 540 ? 0.7 : 1);

  return {
    media: placementFor(
      "media",
      (arena.width < 540 ? 0.47 : 0.42) + responsiveStackShift,
    ),
    copy: placementFor(
      "copy",
      (arena.width < 540 ? 0.52 : 0.56) - responsiveStackShift * 0.5,
    ),
    actions: placementFor(
      "actions",
      (arena.width < 540 ? 0.48 : 0.45) + responsiveStackShift * 0.65,
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
