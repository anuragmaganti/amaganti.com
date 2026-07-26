import { expect, test } from "@playwright/test";

import {
  FLOATING_PROJECT_SIMULATION,
  resolveFloatingProjectPhysicsSteps,
} from "../features/floating-projects/simulation";
import { getFloatingProjectCardScale } from "../features/floating-projects/config";
import {
  createParticleObstacleScreenFrame,
  writeParticleObstacleGeometry,
} from "../lib/particle-obstacle-geometry";
import {
  createProjectImageSizingVariables,
  getProjectImageTargetArea,
} from "../features/floating-projects/image-sizing";
import {
  batchParticleObstacleUpdates,
  getParticleObstacleSnapshot,
  publishParticleObstacle,
  registerParticleObstacle,
  subscribeParticleObstacle,
  unregisterParticleObstacle,
} from "../lib/particle-obstacle-store";

test.describe("floating project simulation", () => {
  test("scales every floating card down ten percent only on mobile", () => {
    expect(getFloatingProjectCardScale(700)).toBe(0.9);
    expect(getFloatingProjectCardScale(430)).toBe(0.9);
    expect(getFloatingProjectCardScale(701)).toBe(1);
    expect(getFloatingProjectCardScale(1024)).toBe(1);
  });

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

  test("publishes mutable card records as one stable scene snapshot per frame", () => {
    let notifications = 0;
    const unsubscribe = subscribeParticleObstacle(() => {
      notifications += 1;
    });
    const media = registerParticleObstacle("batch:media");
    const copy = registerParticleObstacle("batch:copy");
    const actions = registerParticleObstacle("batch:actions");

    batchParticleObstacleUpdates(() => {
      for (const entry of [media, copy, actions]) {
        writeParticleObstacleGeometry(
          entry.geometry,
          200,
          160,
          180,
          120,
          0,
          18,
        );
        entry.motion.velocityX = 20;
        entry.motion.sampledAt = 10;
        publishParticleObstacle(entry, 1);
      }
    });

    expect(notifications).toBe(1);
    const snapshot = getParticleObstacleSnapshot();
    const geometry = media.geometry;

    batchParticleObstacleUpdates(() => {
      writeParticleObstacleGeometry(
        media.geometry,
        220,
        170,
        180,
        120,
        Math.PI / 12,
        18,
      );
      publishParticleObstacle(media, 1);
    });

    expect(getParticleObstacleSnapshot()).toBe(snapshot);
    expect(media.geometry).toBe(geometry);
    expect(media.geometry.centerX).toBe(220);
    expect(notifications).toBe(2);

    batchParticleObstacleUpdates(() => {
      unregisterParticleObstacle(media);
      unregisterParticleObstacle(copy);
      unregisterParticleObstacle(actions);
    });
    unsubscribe();
  });
});
