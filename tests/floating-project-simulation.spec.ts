import { expect, test } from "@playwright/test";

import {
  FLOATING_PROJECT_SIMULATION,
  resolveFloatingProjectPhysicsSteps,
} from "../lib/floating-project-simulation";
import { createParticleObstacleScreenFrame } from "../lib/particle-obstacle-geometry";
import {
  createProjectImageSizingVariables,
  getProjectImageTargetArea,
} from "../lib/project-card-presentation";
import {
  batchParticleObstacleUpdates,
  removeParticleObstacle,
  subscribeParticleObstacle,
  upsertParticleObstacle,
} from "../lib/particle-obstacle-store";

test.describe("floating project simulation", () => {
  test("advances once per native high-refresh frame", () => {
    for (const refreshRate of [120, 144]) {
      const frame = resolveFloatingProjectPhysicsSteps(1000 / refreshRate);

      expect(frame.count).toBe(1);
      expect(frame.deltaMs).toBeCloseTo(1000 / refreshRate, 5);
    }
  });

  test("subdivides slow frames without exceeding the 60 Hz reference step", () => {
    const frame = resolveFloatingProjectPhysicsSteps(1000 / 30);

    expect(frame.count).toBe(2);
    expect(frame.deltaMs).toBeLessThanOrEqual(
      FLOATING_PROJECT_SIMULATION.referenceStepMs,
    );
  });

  test("limits card rotation to three degrees", () => {
    expect(FLOATING_PROJECT_SIMULATION.maxCardAngle).toBeCloseTo(
      Math.PI / 60,
      8,
    );
  });

  test("projects every card edge using its actual angle", () => {
    const angle = Math.PI / 6;
    const frame = createParticleObstacleScreenFrame({
      centerX: 400,
      centerY: 300,
      width: 200,
      height: 100,
      angle,
      cornerRadius: 20,
      bounds: { left: 280, top: 205, right: 520, bottom: 395 },
    });

    expect(frame.rightMid.x - frame.center.x).toBeCloseTo(
      Math.cos(angle) * 100,
      5,
    );
    expect(frame.rightMid.y - frame.center.y).toBeCloseTo(
      Math.sin(angle) * 100,
      5,
    );
    expect(frame.topMid.x - frame.center.x).toBeCloseTo(
      Math.sin(angle) * 50,
      5,
    );
  });

  test("normalizes portrait, square, and landscape screenshots by area", () => {
    const targetArea = getProjectImageTargetArea("desktop");

    for (const [width, height] of [
      [812, 1060],
      [2152, 1952],
      [3146, 1954],
    ]) {
      const variables = createProjectImageSizingVariables(width, height);
      const renderedWidth = Number.parseFloat(
        variables["--project-image-width-desktop"].slice(4),
      );
      const renderedArea = (renderedWidth * renderedWidth) / (width / height);

      expect(Math.abs(renderedArea - targetArea) / targetArea).toBeLessThan(
        0.02,
      );
    }
  });

  test("publishes all card measurements as one scene snapshot per frame", () => {
    let notifications = 0;
    const unsubscribe = subscribeParticleObstacle(() => {
      notifications += 1;
    });
    const geometry = {
      centerX: 200,
      centerY: 160,
      width: 180,
      height: 120,
      angle: 0,
      cornerRadius: 18,
      bounds: { left: 110, top: 100, right: 290, bottom: 220 },
    };
    const motion = {
      velocityX: 20,
      velocityY: 0,
      angularVelocity: 0,
      sampledAt: 10,
    };

    batchParticleObstacleUpdates(() => {
      upsertParticleObstacle("batch:media", geometry, 1, motion);
      upsertParticleObstacle("batch:copy", geometry, 1, motion);
      upsertParticleObstacle("batch:actions", geometry, 1, motion);
    });

    expect(notifications).toBe(1);

    batchParticleObstacleUpdates(() => {
      removeParticleObstacle("batch:media");
      removeParticleObstacle("batch:copy");
      removeParticleObstacle("batch:actions");
    });
    unsubscribe();
  });
});
