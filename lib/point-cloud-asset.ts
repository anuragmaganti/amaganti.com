import { particleVisualConfig } from "@/config/visual";

const IMPORT_SCAN_ORIENTATION = particleVisualConfig.headAsset.orientation;

export function samplePositions(
  source: Float32Array,
  maxPoints: number,
): Float32Array {
  const pointCount = Math.floor(source.length / 3);

  if (!pointCount || pointCount <= maxPoints) {
    return source.slice();
  }

  const sampled = new Float32Array(maxPoints * 3);
  const stride = pointCount / maxPoints;

  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.floor(index * stride) * 3;
    const targetIndex = index * 3;
    sampled[targetIndex] = source[sourceIndex];
    sampled[targetIndex + 1] = source[sourceIndex + 1];
    sampled[targetIndex + 2] = source[sourceIndex + 2];
  }

  return sampled;
}

export function normalizePositions(source: Float32Array): Float32Array {
  if (!source.length) {
    return source.slice();
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < source.length; index += 3) {
    const x = source[index];
    const y = source[index + 1];
    const z = source[index + 2];

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  const scale = 2 / Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.001);
  const normalized = new Float32Array(source.length);

  for (let index = 0; index < source.length; index += 3) {
    normalized[index] = (source[index] - centerX) * scale;
    normalized[index + 1] = (source[index + 1] - centerY) * scale;
    normalized[index + 2] = (source[index + 2] - centerZ) * scale;
  }

  return normalized;
}

export function orientImportedPositions(source: Float32Array): Float32Array {
  if (!source.length) {
    return source.slice();
  }

  const rotation = {
    cosX: Math.cos(IMPORT_SCAN_ORIENTATION.x),
    sinX: Math.sin(IMPORT_SCAN_ORIENTATION.x),
    cosY: Math.cos(IMPORT_SCAN_ORIENTATION.y),
    sinY: Math.sin(IMPORT_SCAN_ORIENTATION.y),
    cosZ: Math.cos(IMPORT_SCAN_ORIENTATION.z),
    sinZ: Math.sin(IMPORT_SCAN_ORIENTATION.z),
  };
  const oriented = new Float32Array(source.length);

  for (let index = 0; index < source.length; index += 3) {
    let x = source[index];
    let y = source[index + 1];
    let z = source[index + 2];

    const rotatedY = y * rotation.cosX - z * rotation.sinX;
    const rotatedZ = y * rotation.sinX + z * rotation.cosX;
    y = rotatedY;
    z = rotatedZ;

    const rotatedX = x * rotation.cosY + z * rotation.sinY;
    z = -x * rotation.sinY + z * rotation.cosY;
    x = rotatedX;

    const finalX = x * rotation.cosZ - y * rotation.sinZ;
    const finalY = x * rotation.sinZ + y * rotation.cosZ;

    oriented[index] = finalX;
    oriented[index + 1] = finalY;
    oriented[index + 2] = z;
  }

  return oriented;
}

export function generateFallbackFacePoints(pointCount: number): Float32Array {
  const positions = new Float32Array(pointCount * 3);
  let cursor = 0;
  let attempts = 0;

  while (cursor < positions.length && attempts < pointCount * 18) {
    const x = randomBetween(-0.86, 0.86);
    const y = randomBetween(-1.08, 1.08);
    const silhouette = (x * x) / 0.72 + (y * y) / 1.2;

    attempts += 1;

    if (silhouette > 1) {
      continue;
    }

    let z = 0.44 * (1 - silhouette);
    z += gaussian(x, y + 0.03, 0.04, 0.12) * 0.24;
    z -= gaussian(x - 0.24, y - 0.2, 0.02, 0.016) * 0.085;
    z -= gaussian(x + 0.24, y - 0.2, 0.02, 0.016) * 0.085;
    z -= gaussian(x, y + 0.38, 0.08, 0.016) * 0.05;
    z += gaussian(x, y + 0.66, 0.1, 0.03) * 0.03;
    z += randomBetween(-0.02, 0.02);

    positions[cursor] = x;
    positions[cursor + 1] = y;
    positions[cursor + 2] = z;
    cursor += 3;
  }

  return normalizePositions(positions);
}

function gaussian(x: number, y: number, radiusX: number, radiusY: number) {
  return Math.exp(-((x * x) / radiusX + (y * y) / radiusY));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
