import { expect, test } from "@playwright/test";
import * as THREE from "three";

import {
  applyPointerParticleInteraction,
  createPointerParticleFlowState,
  type PointerParticleInteractionFrame,
  type PressureRipple,
} from "../lib/pointer-particle-interaction";
import { createParticleState } from "../lib/particle-motion";

test.describe("pointer particle interaction", () => {
  test("creates a stationary depth lens without opening a lateral crater", () => {
    const frame = createFrame();
    const particle = simulateHover(frame, 0.05, 0, 24);

    expect(particle.x).toBeCloseTo(0.05, 4);
    expect(particle.y).toBeCloseTo(0, 4);
    expect(particle.z).toBeLessThan(-0.001);
  });

  test("pushes ahead of pointer motion and shears around its sides", () => {
    const frame = createFrame();
    frame.flowVelocity.set(0.8, 0);

    const leading = simulateHover(frame, 0.24, 0, 16);
    const side = simulateHover(frame, 0, 0.24, 16);

    expect(leading.x).toBeGreaterThan(0.24);
    expect(side.x).toBeLessThan(0);
  });

  test("culls distant particles and settles tracked motion after exit", () => {
    const frame = createFrame();
    frame.flowVelocity.set(0.8, 0.2);
    const flowState = createPointerParticleFlowState(2);
    const distant = createParticleState();
    const affected = createParticleState();

    distant.x = 1.2;
    distant.y = 1.2;
    applyPointerParticleInteraction(distant, 0, frame, flowState, 1 / 60);
    expect(distant).toMatchObject({ x: 1.2, y: 1.2, z: 0 });
    expect(flowState.active[0]).toBe(0);

    for (let index = 0; index < 18; index += 1) {
      affected.x = 0.16;
      affected.y = 0;
      affected.z = 0;
      applyPointerParticleInteraction(affected, 1, frame, flowState, 1 / 60);
    }
    expect(flowState.active[1]).toBe(1);

    frame.hoverActive = false;
    frame.flowVelocity.set(0, 0);
    for (let index = 0; index < 180; index += 1) {
      affected.x = 0.16;
      affected.y = 0;
      affected.z = 0;
      applyPointerParticleInteraction(affected, 1, frame, flowState, 1 / 60);
    }

    expect(affected.x).toBeCloseTo(0.16, 3);
    expect(affected.y).toBeCloseTo(0, 3);
    expect(affected.z).toBeCloseTo(0, 3);
    expect(flowState.active[1]).toBe(0);
  });

  test("click pressure travels outward with a softer recovery behind it", () => {
    const frame = createFrame();
    frame.hoverActive = false;
    frame.ripples.push(createRipple(0.302));
    const flowState = createPointerParticleFlowState(3);
    const crest = createParticleState();
    const recovery = createParticleState();
    const distant = createParticleState();

    crest.x = 0.6;
    recovery.x = 0.554;
    distant.x = 1.2;
    applyPointerParticleInteraction(crest, 0, frame, flowState, 1 / 60);
    applyPointerParticleInteraction(recovery, 1, frame, flowState, 1 / 60);
    applyPointerParticleInteraction(distant, 2, frame, flowState, 1 / 60);

    expect(crest.x).toBeGreaterThan(0.6);
    expect(recovery.x).toBeLessThan(0.554);
    expect(distant.x).toBe(1.2);
  });
});

function createFrame(): PointerParticleInteractionFrame {
  return {
    hoverActive: true,
    hoverStrength: 1,
    hoverRadius: 0.2,
    unsettled: false,
    localPoint: new THREE.Vector3(),
    localRight: new THREE.Vector3(1, 0, 0),
    localUp: new THREE.Vector3(0, 1, 0),
    localNormal: new THREE.Vector3(0, 0, 1),
    flowVelocity: new THREE.Vector2(),
    ripples: [],
  };
}

function createRipple(age: number): PressureRipple {
  return {
    age,
    strength: 1,
    unitRadius: 0.2,
    localPoint: new THREE.Vector3(),
  };
}

function simulateHover(
  frame: PointerParticleInteractionFrame,
  x: number,
  y: number,
  frames: number,
) {
  const particle = createParticleState();
  const flowState = createPointerParticleFlowState(1);
  particle.spreadX = x >= 0 ? 0.5 : -0.5;
  particle.spreadY = y >= 0 ? 0.5 : -0.5;
  particle.spreadZ = 0.25;

  for (let index = 0; index < frames; index += 1) {
    particle.x = x;
    particle.y = y;
    particle.z = 0;
    applyPointerParticleInteraction(particle, 0, frame, flowState, 1 / 60);
  }

  return particle;
}
