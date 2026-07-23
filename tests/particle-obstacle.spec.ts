import { expect, test } from "@playwright/test";
import * as THREE from "three";

import {
  applyObstacleExclusions,
  createObstacleExclusionResources,
  type ObstacleExclusionRuntime,
} from "../lib/particle-obstacle-field";
import { createParticleState } from "../lib/particle-motion";

const field: ObstacleExclusionRuntime = {
  id: "test-card",
  present: true,
  rect: null,
  halfWidth: 0.8,
  halfHeight: 0.6,
  cornerRadius: 0.12,
  strength: 1,
  targetStrength: 1,
  center: new THREE.Vector3(),
  leftMid: new THREE.Vector3(-0.8, 0, 0),
  rightMid: new THREE.Vector3(0.8, 0, 0),
  topMid: new THREE.Vector3(0, 0.6, 0),
  bottomMid: new THREE.Vector3(0, -0.6, 0),
  rightAxis: new THREE.Vector3(1, 0, 0),
  upAxis: new THREE.Vector3(0, 1, 0),
  planeNormal: new THREE.Vector3(0, 0, 1),
};

test.describe("particle obstacle geometry", () => {
  test("routes interior particles through every card edge and corner", () => {
    const left = displace(-0.2, 0, -1, 0);
    const right = displace(0.2, 0, 1, 0);
    const top = displace(0, 0.2, 0, 1);
    const bottom = displace(0, -0.2, 0, -1);
    const corner = displace(0.35, 0.25, 1, 1);

    expect(left.x).toBeLessThan(-0.8);
    expect(right.x).toBeGreaterThan(0.8);
    expect(top.y).toBeGreaterThan(0.6);
    expect(bottom.y).toBeLessThan(-0.6);
    expect(corner.x).toBeGreaterThan(0.35);
    expect(corner.y).toBeGreaterThan(0.25);
  });

  test("leaves particles outside the exclusion falloff unchanged", () => {
    const particle = displace(2, 2, 1, 1);

    expect(particle).toMatchObject({ x: 2, y: 2, z: 0 });
  });
});

function displace(x: number, y: number, spreadX: number, spreadY: number) {
  const particle = createParticleState();
  particle.x = x;
  particle.y = y;
  particle.spreadX = spreadX;
  particle.spreadY = spreadY;

  applyObstacleExclusions(particle, [field], createObstacleExclusionResources());
  return particle;
}
