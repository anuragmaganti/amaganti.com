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

export function createFloatingProjectCardPlacements(
  arena: FloatingProjectArenaSize,
  cardSizes: Record<FloatingProjectCardRole, FloatingProjectCardSize>,
  preserved: Partial<
    Record<FloatingProjectCardRole, PreservedFloatingProjectPlacement>
  > | null,
): FloatingProjectCardPlacements {
  const defaultAngles =
    arena.width < 700
      ? { media: -0.006, copy: 0.004, actions: -0.003 }
      : { media: -0.026, copy: 0.018, actions: -0.012 };

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
    return {
      media: createBoundedPlacement(
        arena,
        cardSizes.media,
        0.3,
        0.46,
        defaultAngles.media,
      ),
      copy: createBoundedPlacement(
        arena,
        cardSizes.copy,
        0.69,
        0.43,
        defaultAngles.copy,
      ),
      actions: createBoundedPlacement(
        arena,
        cardSizes.actions,
        0.69,
        0.82,
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

  return {
    media: placementFor("media", arena.width < 540 ? 0.47 : 0.42),
    copy: placementFor("copy", arena.width < 540 ? 0.52 : 0.56),
    actions: placementFor("actions", arena.width < 540 ? 0.48 : 0.45),
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
