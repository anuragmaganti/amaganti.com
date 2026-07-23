import { expect, test } from "@playwright/test";
import * as THREE from "three";

import {
  applyParticleObstacleFlow,
  createParticleObstacleFlowState,
  createParticleObstacleResources,
  type ParticleObstacleRuntime,
} from "../lib/particle-obstacle-field";
import { createParticleObstacleScreenFrame } from "../lib/particle-obstacle-geometry";
import { createParticleState } from "../lib/particle-motion";

const field: ParticleObstacleRuntime = {
  id: "test-card",
  present: true,
  geometry: null,
  motion: null,
  halfWidth: 0.8,
  halfHeight: 0.6,
  cornerRadius: 0.12,
  strength: 1,
  targetStrength: 1,
  screenFrame: createParticleObstacleScreenFrame({
    centerX: 0,
    centerY: 0,
    width: 0,
    height: 0,
    angle: 0,
    cornerRadius: 0,
    bounds: { left: 0, top: 0, right: 0, bottom: 0 },
  }),
  center: new THREE.Vector3(),
  leftMid: new THREE.Vector3(-0.8, 0, 0),
  rightMid: new THREE.Vector3(0.8, 0, 0),
  topMid: new THREE.Vector3(0, 0.6, 0),
  bottomMid: new THREE.Vector3(0, -0.6, 0),
  rightAxis: new THREE.Vector3(1, 0, 0),
  upAxis: new THREE.Vector3(0, 1, 0),
  planeNormal: new THREE.Vector3(0, 0, 1),
  flowVelocity: new THREE.Vector2(),
  targetFlowVelocity: new THREE.Vector2(),
  angularVelocity: 0,
  targetAngularVelocity: 0,
};

test.describe("particle obstacle flow", () => {
  test.beforeEach(() => {
    field.flowVelocity.set(0, 0);
    field.targetFlowVelocity.set(0, 0);
    field.angularVelocity = 0;
    field.targetAngularVelocity = 0;
  });

  test("keeps particles outside the rounded card boundary", () => {
    for (const [x, y] of [
      [-0.55, 0],
      [0.55, 0],
      [0, 0.4],
      [0, -0.4],
      [0.65, 0.45],
    ]) {
      const particle = simulate(x, y);

      expect(getRoundedRectDistance(particle.x, particle.y)).toBeGreaterThan(0);
    }
  });

  test("pushes the leading edge and slips along the sides without attracting the wake", () => {
    field.flowVelocity.set(0, 1);

    const leading = simulate(0, 0.72, 4);
    const side = simulate(0.92, 0, 4);
    const trailing = simulate(0, -0.72, 4);

    expect(leading.y).toBeGreaterThan(0.72);
    expect(side.y).toBeGreaterThan(0);
    expect(trailing.y).toBeCloseTo(-0.72, 5);
  });

  test("reverses the flow when card motion reverses", () => {
    field.flowVelocity.set(0, -1);

    const leading = simulate(0, -0.72, 4);
    const trailing = simulate(0, 0.72, 4);

    expect(leading.y).toBeLessThan(-0.72);
    expect(trailing.y).toBeCloseTo(0.72, 5);
  });

  test("refills the trailing wake by releasing prior offsets", () => {
    field.flowVelocity.set(0, 1);
    const passiveOffset = simulateWakeReturn(false);
    const wakeOffset = simulateWakeReturn(true);

    expect(wakeOffset).toBeLessThan(passiveOffset);
  });

  test("keeps the leading flow continuous through the card centerline", () => {
    field.flowVelocity.set(0, 1);

    const nearLeft = simulate(-0.001, 0.72, 4);
    const nearRight = simulate(0.001, 0.72, 4);
    const outerLeft = simulate(-0.25, 0.72, 4);
    const outerRight = simulate(0.25, 0.72, 4);

    expect(nearRight.x - nearLeft.x).toBeLessThan(0.01);
    expect(outerLeft.x).toBeLessThan(-0.25);
    expect(outerRight.x).toBeGreaterThan(0.25);
  });

  test("routes diagonal sweeps through the rounded corner without a particle ridge", () => {
    field.flowVelocity.set(1, 1);

    const cornerExit = simulate(-0.3, -0.5);
    const topExit = simulate(-0.4, 0);
    const rightExit = simulate(0, -0.4);
    const topProjection = (topExit.x + topExit.y) * Math.SQRT1_2;
    const rightProjection = (rightExit.x + rightExit.y) * Math.SQRT1_2;

    // A sharp-box support plane would put all three particles on one diagonal
    // and eject the corner particle through the rectangle's imaginary corner.
    expect(cornerExit.x).toBeLessThan(field.halfWidth - 0.01);
    expect(cornerExit.y).toBeLessThan(field.halfHeight - 0.01);
    expect(Math.abs(topProjection - rightProjection)).toBeGreaterThan(0.1);
    expect(getRoundedRectDistance(cornerExit.x, cornerExit.y)).toBeGreaterThan(0);
  });

  test("leaves distant particles unchanged and settles offsets after exit", () => {
    field.flowVelocity.set(0, 1);
    const resources = createParticleObstacleResources();
    const flowState = createParticleObstacleFlowState(1);
    const particle = createParticleState();

    particle.x = 2;
    particle.y = 2;
    applyParticleObstacleFlow(
      particle,
      0,
      [field],
      flowState,
      resources,
      1 / 60,
    );
    expect(particle).toMatchObject({ x: 2, y: 2, z: 0 });

    for (let frame = 0; frame < 12; frame += 1) {
      particle.x = 0.92;
      particle.y = 0;
      particle.z = 0;
      applyParticleObstacleFlow(
        particle,
        0,
        [field],
        flowState,
        resources,
        1 / 60,
      );
    }

    for (let frame = 0; frame < 180; frame += 1) {
      particle.x = 0.92;
      particle.y = 0;
      particle.z = 0;
      applyParticleObstacleFlow(
        particle,
        0,
        [],
        flowState,
        resources,
        1 / 60,
      );
    }

    expect(particle.x).toBeCloseTo(0.92, 2);
    expect(particle.y).toBeCloseTo(0, 2);
  });
});

function simulate(x: number, y: number, frames = 1) {
  const particle = createParticleState();
  const resources = createParticleObstacleResources();
  const flowState = createParticleObstacleFlowState(1);

  particle.spreadX = x >= 0 ? 0.5 : -0.5;
  particle.spreadY = y >= 0 ? 0.5 : -0.5;
  particle.spreadZ = 0.25;

  for (let frame = 0; frame < frames; frame += 1) {
    particle.x = x;
    particle.y = y;
    particle.z = 0;
    applyParticleObstacleFlow(
      particle,
      0,
      [field],
      flowState,
      resources,
      1 / 60,
    );
  }

  return particle;
}

function getRoundedRectDistance(x: number, y: number) {
  const innerHalfWidth = field.halfWidth - field.cornerRadius;
  const innerHalfHeight = field.halfHeight - field.cornerRadius;
  const distanceX = Math.abs(x) - innerHalfWidth;
  const distanceY = Math.abs(y) - innerHalfHeight;
  const outsideX = Math.max(distanceX, 0);
  const outsideY = Math.max(distanceY, 0);

  return (
    Math.hypot(outsideX, outsideY) +
    Math.min(Math.max(distanceX, distanceY), 0) -
    field.cornerRadius
  );
}

function simulateWakeReturn(withField: boolean) {
  const particle = createParticleState();
  const resources = createParticleObstacleResources();
  const flowState = createParticleObstacleFlowState(1);

  flowState.offsets[0] = 0.18;
  flowState.offsets[1] = 0.12;
  particle.x = 0;
  particle.y = -0.72;
  applyParticleObstacleFlow(
    particle,
    0,
    withField ? [field] : [],
    flowState,
    resources,
    1 / 60,
  );

  return Math.hypot(flowState.offsets[0], flowState.offsets[1]);
}
