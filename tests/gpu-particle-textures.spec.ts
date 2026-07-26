import { expect, test } from "@playwright/test";

import {
  createGpuParticleGeometry,
  createParticleTextureSet,
} from "../lib/gpu-particles/textures";
import type { PointCloudTargetId } from "../lib/scene-types";

test.describe("GPU particle data", () => {
  test("packs authored targets and deterministic seeds into square textures", () => {
    const positions = new Float32Array([
      1, 2, 3,
      4, 5, 6,
      7, 8, 9,
    ]);
    const textureSet = createParticleTextureSet({
      morphTargets: { face: positions } as Record<
        PointCloudTargetId,
        Float32Array
      >,
      seeds: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]),
      pointCount: 3,
    });

    try {
      expect(textureSet.size).toBe(2);
      const seedData = textureSet.seeds.image.data as Float32Array;
      const targetData = textureSet.targets.face.image.data as Float32Array;

      expect(Array.from(seedData.slice(0, 4))).toEqual([
        expect.closeTo(0.1),
        expect.closeTo(0.2),
        expect.closeTo(0.01),
        1,
      ]);
      expect(Array.from(targetData.slice(8, 12))).toEqual([7, 8, 9, 1]);
      expect(seedData[15]).toBe(0);
      expect(targetData[15]).toBe(0);
    } finally {
      textureSet.dispose();
    }
  });

  test("maps each rendered point to the center of its simulation texel", () => {
    const geometry = createGpuParticleGeometry(
      new Float32Array([
        0, 0, 0,
        1, 1, 1,
        2, 2, 2,
      ]),
      2,
    );

    try {
      const uv = geometry.getAttribute("particleUv");
      expect(uv.count).toBe(3);
      expect([uv.getX(0), uv.getY(0)]).toEqual([0.25, 0.25]);
      expect([uv.getX(1), uv.getY(1)]).toEqual([0.75, 0.25]);
      expect([uv.getX(2), uv.getY(2)]).toEqual([0.25, 0.75]);
    } finally {
      geometry.dispose();
    }
  });
});
