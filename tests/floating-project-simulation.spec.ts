import { expect, test } from "@playwright/test";

import {
  FLOATING_PROJECT_SIMULATION,
  resolveFloatingProjectPhysicsSteps,
} from "../lib/floating-project-simulation";
import {
  createParticleObstacleScreenFrame,
  writeParticleObstacleGeometry,
} from "../lib/particle-obstacle-geometry";
import {
  createProjectImageSizingVariables,
  getProjectImageTargetArea,
} from "../lib/project-card-presentation";
import {
  batchParticleObstacleUpdates,
  getParticleObstacleSnapshot,
  publishParticleObstacle,
  registerParticleObstacle,
  subscribeParticleObstacle,
  unregisterParticleObstacle,
} from "../lib/particle-obstacle-store";
import {
  createSceneFrameScheduler,
  SCENE_FRAME_PRIORITY,
  type SceneFrameTaskController,
} from "../lib/scene-frame-scheduler";

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

  test("runs physics, invalidation, and canvases from one native frame", () => {
    let queuedFrame: FrameRequestCallback | null = null;
    let requestCount = 0;
    const order: string[] = [];
    const deltas: number[] = [];
    const scheduler = createSceneFrameScheduler({
      requestFrame(callback) {
        requestCount += 1;
        queuedFrame = callback;
        return requestCount;
      },
      cancelFrame() {
        queuedFrame = null;
      },
      getScrollY: () => 0,
    });
    const invalidation: SceneFrameTaskController = scheduler.register(
      () => order.push("invalidation"),
      { priority: SCENE_FRAME_PRIORITY.particleInvalidation },
    );
    const physics = scheduler.register(
      (frame) => {
        order.push("physics");
        deltas.push(frame.deltaMs);
        invalidation.request();
      },
      { priority: SCENE_FRAME_PRIORITY.projectPhysics },
    );
    const orb = scheduler.register(() => order.push("orb"), {
      priority: SCENE_FRAME_PRIORITY.actionOrb,
    });

    physics.setContinuous(true);
    orb.setContinuous(true);
    expect(requestCount).toBe(1);

    runQueuedFrame(100);
    expect(order).toEqual(["physics", "invalidation", "orb"]);
    expect(requestCount).toBe(2);

    order.length = 0;
    runQueuedFrame(100 + 1000 / 120);
    expect(deltas[1]).toBeCloseTo(1000 / 120, 5);
    expect(order).toEqual(["physics", "invalidation", "orb"]);

    physics.dispose();
    invalidation.dispose();
    orb.dispose();
    scheduler.dispose();

    function runQueuedFrame(timestamp: number) {
      const callback = queuedFrame;
      expect(callback).not.toBeNull();
      queuedFrame = null;
      callback!(timestamp);
    }
  });
});
