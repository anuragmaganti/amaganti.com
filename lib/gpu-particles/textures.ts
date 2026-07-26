import * as THREE from "three";

import type { PointCloudTargetId } from "@/lib/scene-types";

export type ParticleTextureSet = {
  size: number;
  seeds: THREE.DataTexture;
  targets: Record<PointCloudTargetId, THREE.DataTexture>;
  dispose: () => void;
};

export function createParticleTextureSet({
  morphTargets,
  seeds,
  pointCount,
}: {
  morphTargets: Record<PointCloudTargetId, Float32Array>;
  seeds: Float32Array;
  pointCount: number;
}): ParticleTextureSet {
  const size = Math.ceil(Math.sqrt(pointCount));
  const seedData = new Float32Array(size * size * 4);

  for (let index = 0; index < pointCount; index += 1) {
    const sourceOffset = index * 2;
    const targetOffset = index * 4;

    seedData[targetOffset] = seeds[sourceOffset];
    seedData[targetOffset + 1] = seeds[sourceOffset + 1];
    seedData[targetOffset + 2] = 0.01 + (index % 5) * 0.0012;
    seedData[targetOffset + 3] = 1;
  }

  const seedTexture = createFloatTexture(seedData, size);
  const targets = Object.fromEntries(
    Object.entries(morphTargets).map(([id, positions]) => {
      const targetData = new Float32Array(size * size * 4);

      for (let index = 0; index < pointCount; index += 1) {
        const sourceOffset = index * 3;
        const targetOffset = index * 4;

        targetData[targetOffset] = positions[sourceOffset];
        targetData[targetOffset + 1] = positions[sourceOffset + 1];
        targetData[targetOffset + 2] = positions[sourceOffset + 2];
        targetData[targetOffset + 3] = 1;
      }

      return [id, createFloatTexture(targetData, size)];
    }),
  ) as Record<PointCloudTargetId, THREE.DataTexture>;

  return {
    size,
    seeds: seedTexture,
    targets,
    dispose() {
      seedTexture.dispose();
      Object.values(targets).forEach((texture) => texture.dispose());
    },
  };
}

export function createGpuParticleGeometry(
  basePositions: Float32Array,
  textureSize: number,
) {
  const pointCount = Math.floor(basePositions.length / 3);
  const particleUvs = new Float32Array(pointCount * 2);

  for (let index = 0; index < pointCount; index += 1) {
    particleUvs[index * 2] = ((index % textureSize) + 0.5) / textureSize;
    particleUvs[index * 2 + 1] =
      (Math.floor(index / textureSize) + 0.5) / textureSize;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(basePositions, 3).setUsage(THREE.StaticDrawUsage),
  );
  geometry.setAttribute(
    "particleUv",
    new THREE.BufferAttribute(particleUvs, 2).setUsage(THREE.StaticDrawUsage),
  );
  geometry.computeBoundingSphere();
  return geometry;
}

function createFloatTexture(data: Float32Array, size: number) {
  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}
