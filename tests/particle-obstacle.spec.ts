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

  test("softens the resting exclusion without pinning particles to a hard contour", () => {
    const deep = simulate(0, 0, 90);
    const shallow = simulate(0.55, 0, 90);
    const deepDisplacement = Math.hypot(deep.x, deep.y);
    const shallowDisplacement = Math.hypot(shallow.x - 0.55, shallow.y);

    expect(deepDisplacement).toBeGreaterThan(shallowDisplacement);
    expect(getRoundedRectDistance(deep.x, deep.y)).toBeLessThan(-0.05);
    expect(getRoundedRectDistance(shallow.x, shallow.y)).toBeLessThan(-0.05);
  });

  test("pushes the front, shears around the sides, and refills behind the card", () => {
    field.flowVelocity.set(0, 1);

    const leading = simulate(0, 0.72, 12);
    const side = simulate(0.92, 0, 12);
    const trailing = simulate(0, -0.72, 12);

    expect(leading.y).toBeGreaterThan(0.72);
    expect(side.y).toBeLessThan(0);
    expect(trailing.y).toBeGreaterThan(-0.72);
    expect(trailing.y + 0.72).toBeLessThan(leading.y - 0.72);
  });

  test("reverses the flow when card motion reverses", () => {
    field.flowVelocity.set(0, -1);

    const leading = simulate(0, -0.72, 12);
    const trailing = simulate(0, 0.72, 12);

    expect(leading.y).toBeLessThan(-0.72);
    expect(trailing.y).toBeLessThan(0.72);
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

  test("keeps diagonal flow curved instead of projecting particles onto one ridge", () => {
    field.flowVelocity.set(1, 1);

    const cornerExit = simulate(-0.3, -0.5, 24);
    const topExit = simulate(-0.4, 0, 24);
    const rightExit = simulate(0, -0.4, 24);
    const topProjection = (topExit.x + topExit.y) * Math.SQRT1_2;
    const rightProjection = (rightExit.x + rightExit.y) * Math.SQRT1_2;

    expect(cornerExit.x).toBeLessThan(field.halfWidth - 0.01);
    expect(cornerExit.y).toBeLessThan(field.halfHeight - 0.01);
    expect(Math.abs(topProjection - rightProjection)).toBeGreaterThan(0.02);
    expect(getRoundedRectDistance(cornerExit.x, cornerExit.y)).toBeLessThan(0);
  });

  test("keeps the exact flow envelope while rejecting its outer corners", () => {
    field.flowVelocity.set(0, 1);

    const insideEnvelope = simulate(2, 0, 12);
    const outsideEllipse = simulate(-1.6, 1.2, 12);

    expect(Math.abs(insideEnvelope.y)).toBeGreaterThan(0.000001);
    expect(outsideEllipse).toMatchObject({ x: -1.6, y: 1.2, z: 0 });
  });

  test("integrates the fluid response consistently at 60Hz and 120Hz", () => {
    field.flowVelocity.set(0.8, 1);

    const at60Hz = simulateDuration(0.28, 0.72, 0.6, 60);
    const at120Hz = simulateDuration(0.28, 0.72, 0.6, 120);

    expect(at120Hz.x).toBeCloseTo(at60Hz.x, 2);
    expect(at120Hz.y).toBeCloseTo(at60Hz.y, 2);
    expect(at120Hz.z).toBeCloseTo(at60Hz.z, 2);
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
    expect(flowState.active[0]).toBe(0);

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
    expect(flowState.active[0]).toBe(1);

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
    expect(flowState.active[0]).toBe(0);
  });
});

function simulate(x: number, y: number, frames = 1, delta = 1 / 60) {
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
      delta,
    );
  }

  return particle;
}

function simulateDuration(
  x: number,
  y: number,
  duration: number,
  refreshRate: number,
) {
  return simulate(x, y, Math.round(duration * refreshRate), 1 / refreshRate);
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
