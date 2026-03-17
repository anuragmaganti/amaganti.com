import type {
  PointCloudShape,
  PointCloudTargetId,
  PointCloudTextTarget,
} from "@/lib/scene-config";

const TWO_PI = Math.PI * 2;
const IMPORT_SCAN_ORIENTATION = {
  x: -Math.PI / 2,
  y: 0,
  z: 0,
};

type CreateMorphTargetsOptions = {
  textTargets?: PointCloudTextTarget[];
  haloDensityMultiplier?: number;
};

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

export function createMorphTargets(
  basePositions: Float32Array,
  options: CreateMorphTargetsOptions = {},
): Record<PointCloudTargetId, Float32Array> {
  const pointCount = Math.floor(basePositions.length / 3);
  const orbital = new Float32Array(basePositions.length);
  const ribbon = new Float32Array(basePositions.length);
  const helix = new Float32Array(basePositions.length);
  const veil = new Float32Array(basePositions.length);
  const settle = new Float32Array(basePositions.length);
  const textTargets = options.textTargets ?? [];
  const haloDensityMultiplier = options.haloDensityMultiplier ?? 1;
  const columns = Math.max(18, Math.round(Math.sqrt(pointCount * 1.45)));
  const rows = Math.ceil(pointCount / columns);
  const depthBands: number = 7;

  for (let index = 0; index < pointCount; index += 1) {
    const offset = index * 3;
    const column = index % columns;
    const row = Math.floor(index / columns);
    const u = columns === 1 ? 0 : column / (columns - 1);
    const v = rows === 1 ? 0 : row / (rows - 1);
    const waveU = u * TWO_PI;
    const waveV = v * TWO_PI;
    const gridY = (0.5 - v) * 1.8;
    const bandIndex = index % depthBands;
    const band = depthBands === 1 ? 0 : bandIndex / (depthBands - 1) - 0.5;
    const jitterA = pseudoRandom(index, 0.17) - 0.5;
    const jitterB = pseudoRandom(index, 0.47) - 0.5;
    const jitterC = pseudoRandom(index, 0.81) - 0.5;
    const side = u < 0.5 ? -1 : 1;
    const innerToOuter =
      side < 0 ? 1 - clamp(u / 0.5, 0, 1) : clamp((u - 0.5) / 0.5, 0, 1);
    const sideCore = 1.12 + innerToOuter * 0.7;
    const sideWave = Math.sin(waveV * 2.8 + band * 4.1 + side * 0.35);
    const sideLift = Math.cos(waveU * 1.9 + band * 2.2 + side * 0.7);

    // Keep transforms as layered particle fields rather than single-strand splines.
    const orbitalAngle =
      waveU * 1.75 + band * 0.9 + Math.sin(waveV * 1.2 + jitterA * 2) * 0.16;
    const orbitalRadius = 0.38 + v * 0.54 + jitterA * 0.08;

    orbital[offset] =
      Math.cos(orbitalAngle) * orbitalRadius + band * 0.12 + jitterB * 0.06;
    orbital[offset + 1] =
      (v - 0.5) * 1.5 + Math.sin(waveU * 2.4 + band * 3.2) * 0.26 + jitterC * 0.08;
    orbital[offset + 2] =
      Math.sin(orbitalAngle) * orbitalRadius * 0.78 +
      Math.cos(waveV * 3.2 + waveU) * 0.14 +
      jitterA * 0.08;

    ribbon[offset] =
      side * (sideCore + sideWave * 0.12 + jitterA * 0.08);
    ribbon[offset + 1] =
      gridY + Math.sin(innerToOuter * 5.2 + waveV * 1.7 + side * 0.5) * 0.18;
    ribbon[offset + 2] =
      Math.cos(innerToOuter * 5.8 + waveV * 3.4) * 0.22 + band * 0.26 + jitterC * 0.08;

    helix[offset] =
      side *
        (1.18 +
          innerToOuter * 0.62 +
          Math.cos(waveV * 3.1 + band * 3.8 + side * 0.4) * 0.12) +
      jitterA * 0.05;
    helix[offset + 1] =
      (v - 0.5) * 2.12 + Math.sin(waveV * 3.8 + innerToOuter * 2.4 + side * 0.7) * 0.22;
    helix[offset + 2] =
      Math.sin(waveV * 4.4 + innerToOuter * 4.2) * 0.3 + band * 0.28 + jitterB * 0.08;

    veil[offset] =
      side * (1.06 + innerToOuter * 0.78 + sideLift * 0.1) + jitterB * 0.05;
    veil[offset + 1] =
      (v - 0.5) * 2.24 + Math.sin(waveU * 1.4 + waveV * 1.9 + side * 0.6) * 0.12;
    veil[offset + 2] =
      Math.cos(waveV * 4.8 + innerToOuter * 5.1 + band * 2.1) * 0.34 +
      band * 0.24 +
      jitterC * 0.07;

    settle[offset] = basePositions[offset] * 0.78;
    settle[offset + 1] = basePositions[offset + 1] * 0.78 - 0.04;
    settle[offset + 2] = basePositions[offset + 2] * 0.78 + 0.06;
  }

  const targets: Partial<Record<PointCloudTargetId, Float32Array>> = {
    face: basePositions,
    orbital,
    ribbon,
    helix,
    veil,
    settle,
  };

  for (const textTarget of textTargets) {
    targets[textTarget.id] = createTextMorphTarget(
      pointCount,
      textTarget,
      haloDensityMultiplier,
      ribbon,
    );
  }

  return targets as Record<PointCloudTargetId, Float32Array>;
}

function gaussian(x: number, y: number, radiusX: number, radiusY: number) {
  return Math.exp(-((x * x) / radiusX + (y * y) / radiusY));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pseudoRandom(index: number, seed: number) {
  const value = Math.sin(index * 91.345 + seed * 713.17) * 43758.5453123;
  return value - Math.floor(value);
}

function createTextMorphTarget(
  pointCount: number,
  target: PointCloudTextTarget,
  haloDensityMultiplier: number,
  fallback: Float32Array,
) {
  if (typeof document === "undefined") {
    return fallback.slice();
  }

  const canvas = document.createElement("canvas");
  const canvasWidth = Math.max(960, Math.round(target.width * 720));
  const canvasHeight = Math.max(260, Math.round(target.height * 620));

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return fallback.slice();
  }

  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const maxTextWidth = canvasWidth * 0.88;
  let fontSize = Math.floor(canvasHeight * 0.66);
  context.font = `${target.fontWeight} ${fontSize}px "${target.fontFamily}", sans-serif`;

  const metrics = context.measureText(target.label);

  if (metrics.width > maxTextWidth && metrics.width > 0) {
    fontSize = Math.floor(fontSize * (maxTextWidth / metrics.width));
    context.font = `${target.fontWeight} ${fontSize}px "${target.fontFamily}", sans-serif`;
  }

  context.fillText(target.label, canvasWidth * 0.5, canvasHeight * 0.5);

  const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
  const fillPixels: number[] = [];
  const edgePixels: number[] = [];
  const sampleStep = 2;
  const alphaThreshold = 28;

  for (let y = 1; y < canvasHeight - 1; y += sampleStep) {
    for (let x = 1; x < canvasWidth - 1; x += sampleStep) {
      if (!isOpaquePixel(imageData.data, canvasWidth, x, y, alphaThreshold)) {
        continue;
      }

      fillPixels.push(x, y);

      if (isEdgePixel(imageData.data, canvasWidth, x, y, alphaThreshold)) {
        edgePixels.push(x, y);
      }
    }
  }

  if (!fillPixels.length) {
    return fallback.slice();
  }

  const minimumFillCount = Math.round(pointCount * target.fillDensity);
  const maxHaloCount = Math.max(0, pointCount - minimumFillCount);
  const haloCount =
    edgePixels.length > 0
      ? Math.min(
          maxHaloCount,
          Math.round(pointCount * target.haloDensity * haloDensityMultiplier),
        )
      : 0;
  const fillCount = Math.max(1, pointCount - haloCount);
  const positions = new Float32Array(pointCount * 3);

  for (let index = 0; index < fillCount; index += 1) {
    const offset = index * 3;
    const pairIndex =
      pickDistributedIndex(fillPixels.length / 2, index, fillCount, 0.17) * 2;
    const x = fillPixels[pairIndex];
    const y = fillPixels[pairIndex + 1];
    const worldX = ((x / (canvasWidth - 1)) - 0.5) * target.width;
    const worldY = (0.5 - y / (canvasHeight - 1)) * target.height;
    const depthNoise = (pseudoRandom(index, 0.43) - 0.5) * target.depth;

    positions[offset] = worldX;
    positions[offset + 1] = worldY;
    positions[offset + 2] =
      depthNoise + Math.sin(worldX * 2.8 + worldY * 4.2) * (target.depth * 0.12);
  }

  for (let index = fillCount; index < pointCount; index += 1) {
    const offset = index * 3;
    const haloIndex = index - fillCount;
    const pairIndex =
      pickDistributedIndex(edgePixels.length / 2, haloIndex, haloCount, 0.61) * 2;
    const x = edgePixels[pairIndex];
    const y = edgePixels[pairIndex + 1];
    const baseX = ((x / (canvasWidth - 1)) - 0.5) * target.width;
    const baseY = (0.5 - y / (canvasHeight - 1)) * target.height;
    const angle = pseudoRandom(index, 0.73) * TWO_PI;
    const radius =
      target.haloRadius * (0.24 + pseudoRandom(index, 0.91) * 0.76);

    positions[offset] = baseX + Math.cos(angle) * radius;
    positions[offset + 1] = baseY + Math.sin(angle) * radius * 0.72;
    positions[offset + 2] =
      (pseudoRandom(index, 0.57) - 0.5) * target.depth * 1.8 + target.depth * 0.28;
  }

  return positions;
}

function pickDistributedIndex(
  itemCount: number,
  index: number,
  total: number,
  seed: number,
) {
  if (itemCount <= 1 || total <= 1) {
    return 0;
  }

  const base = ((index + 0.5) / total) * itemCount;
  const jitter = (pseudoRandom(index, seed) - 0.5) * Math.max(1, itemCount / total);
  return clamp(Math.floor(base + jitter), 0, itemCount - 1);
}

function isOpaquePixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  threshold: number,
) {
  const alphaIndex = (y * width + x) * 4 + 3;
  return data[alphaIndex] >= threshold;
}

function isEdgePixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  threshold: number,
) {
  return (
    !isOpaquePixel(data, width, x + 1, y, threshold) ||
    !isOpaquePixel(data, width, x - 1, y, threshold) ||
    !isOpaquePixel(data, width, x, y + 1, threshold) ||
    !isOpaquePixel(data, width, x, y - 1, threshold)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
