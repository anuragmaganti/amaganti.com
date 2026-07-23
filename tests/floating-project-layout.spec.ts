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
  copy: { width: 496, height: 380 },
  actions: { width: 340, height: 70 },
};

test.describe("floating project layout", () => {
  test("places copy left with media and actions stacked on the right", () => {
    const placements = createFloatingProjectCardPlacements(
      desktopArena,
      desktopCards,
      null,
      "project-01",
    );

    expectContained(desktopArena, desktopCards, placements);
    expectSeparated(desktopCards, placements);
    expect(placements.copy.x).toBeLessThan(placements.media.x);
    expect(placements.actions.x).toBeGreaterThan(placements.copy.x);
    expect(
      placements.media.x -
        desktopCards.media.width * 0.5 -
        (placements.copy.x + desktopCards.copy.width * 0.5),
    ).toBeGreaterThanOrEqual(50);
    expect(
      placements.actions.y -
        desktopCards.actions.height * 0.5 -
        (placements.media.y + desktopCards.media.height * 0.5),
    ).toBeGreaterThanOrEqual(30);
  });

  test("varies position and angle substantially across project defaults", () => {
    const placements = Array.from({ length: 5 }, (_, index) =>
      createFloatingProjectCardPlacements(
        desktopArena,
        desktopCards,
        null,
        `project-0${index + 1}`,
      ),
    );
    const copyXs = placements.map(({ copy }) => copy.x);
    const actionsXs = placements.map(({ actions }) => actions.x);
    const mediaAngles = placements.map(({ media }) => media.angle);

    expect(Math.max(...copyXs) - Math.min(...copyXs)).toBeGreaterThan(75);
    expect(Math.max(...actionsXs) - Math.min(...actionsXs)).toBeGreaterThan(
      140,
    );
    expect(Math.max(...mediaAngles) - Math.min(...mediaAngles)).toBeGreaterThan(
      0.07,
    );

    for (const { copy, media } of placements) {
      expect(Math.abs(copy.y - media.y)).toBeLessThanOrEqual(35);
    }
  });

  test("gives each project a distinct collision-safe default", () => {
    const placements = Array.from({ length: 5 }, (_, index) =>
      createFloatingProjectCardPlacements(
        desktopArena,
        desktopCards,
        null,
        `project-0${index + 1}`,
      ),
    );
    const signatures = placements.map(({ media, copy, actions }) =>
      [media.x, media.y, media.angle, copy.y, actions.angle].join(":"),
    );

    expect(new Set(signatures).size).toBe(placements.length);

    for (const placement of placements) {
      expectContained(desktopArena, desktopCards, placement);
      expectSeparated(desktopCards, placement);
      expect(placement.copy.x).toBeLessThan(placement.media.x);
      expect(placement.actions.x).toBeGreaterThan(placement.copy.x);
      expect(placement.actions.y).toBeGreaterThan(placement.media.y);
    }
  });

  test("stacks tablet and mobile defaults inside their arenas", () => {
    const viewports = [
      {
        arena: { width: 744, height: 840 },
        cards: {
          media: { width: 340, height: 210 },
          copy: { width: 448, height: 390 },
          actions: { width: 336, height: 68 },
        },
      },
      {
        arena: { width: 374, height: 790 },
        cards: {
          media: { width: 250, height: 170 },
          copy: { width: 314, height: 420 },
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
