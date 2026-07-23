import { expect, test } from "@playwright/test";

import {
  createFloatingProjectCardPlacements,
  floatingProjectCardRoles,
  type FloatingProjectArenaSize,
  type FloatingProjectCardRole,
  type FloatingProjectCardSize,
} from "../lib/floating-project-layout";

const desktopArena = { width: 1400, height: 840 };
const desktopCards = {
  media: { width: 500, height: 560 },
  copy: { width: 480, height: 470 },
  actions: { width: 340, height: 70 },
};

test.describe("floating project layout", () => {
  test("keeps the desktop defaults contained and separated", () => {
    const placements = createFloatingProjectCardPlacements(
      desktopArena,
      desktopCards,
      null,
    );

    expectContained(desktopArena, desktopCards, placements);
    expectSeparated(desktopCards, placements);
  });

  test("stacks tablet and mobile defaults inside their arenas", () => {
    const viewports = [
      {
        arena: { width: 744, height: 840 },
        cards: {
          media: { width: 340, height: 210 },
          copy: { width: 500, height: 420 },
          actions: { width: 336, height: 68 },
        },
      },
      {
        arena: { width: 374, height: 790 },
        cards: {
          media: { width: 250, height: 170 },
          copy: { width: 356, height: 385 },
          actions: { width: 340, height: 60 },
        },
      },
    ];

    for (const { arena, cards } of viewports) {
      const placements = createFloatingProjectCardPlacements(
        arena,
        cards,
        null,
      );

      expectContained(arena, cards, placements);
      expectSeparated(cards, placements);
    }
  });

  test("preserves normalized positions while clamping after resize", () => {
    const cards = {
      media: { width: 260, height: 180 },
      copy: { width: 350, height: 390 },
      actions: { width: 320, height: 62 },
    };
    const arena = { width: 390, height: 760 };
    const placements = createFloatingProjectCardPlacements(arena, cards, {
      media: { x: 0.95, y: 0.05, angle: 0.02 },
      copy: { x: 0.5, y: 0.5, angle: -0.01 },
      actions: { x: 0.02, y: 0.98, angle: 0 },
    });

    expectContained(arena, cards, placements);
    expect(placements.media.x).toBe(arena.width - cards.media.width * 0.5);
    expect(placements.actions.y).toBe(
      arena.height - cards.actions.height * 0.5,
    );
  });
});

function expectContained(
  arena: FloatingProjectArenaSize,
  sizes: Record<FloatingProjectCardRole, FloatingProjectCardSize>,
  placements: ReturnType<typeof createFloatingProjectCardPlacements>,
) {
  for (const role of floatingProjectCardRoles) {
    const placement = placements[role];
    const size = sizes[role];

    expect(placement.x - size.width * 0.5).toBeGreaterThanOrEqual(0);
    expect(placement.y - size.height * 0.5).toBeGreaterThanOrEqual(0);
    expect(placement.x + size.width * 0.5).toBeLessThanOrEqual(arena.width);
    expect(placement.y + size.height * 0.5).toBeLessThanOrEqual(arena.height);
  }
}

function expectSeparated(
  sizes: Record<FloatingProjectCardRole, FloatingProjectCardSize>,
  placements: ReturnType<typeof createFloatingProjectCardPlacements>,
) {
  for (let index = 0; index < floatingProjectCardRoles.length; index += 1) {
    const leftRole = floatingProjectCardRoles[index];

    for (
      let comparison = index + 1;
      comparison < floatingProjectCardRoles.length;
      comparison += 1
    ) {
      const rightRole = floatingProjectCardRoles[comparison];
      const left = placements[leftRole];
      const right = placements[rightRole];
      const horizontalGap =
        Math.abs(left.x - right.x) -
        (sizes[leftRole].width + sizes[rightRole].width) * 0.5;
      const verticalGap =
        Math.abs(left.y - right.y) -
        (sizes[leftRole].height + sizes[rightRole].height) * 0.5;

      expect(Math.max(horizontalGap, verticalGap)).toBeGreaterThanOrEqual(0);
    }
  }
}
