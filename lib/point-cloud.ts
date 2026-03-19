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
type ProjectFieldTargetId = Extract<
  PointCloudShape,
  "project-field-1" | "project-field-2" | "project-field-3"
>;

type ProjectFieldPreset = {
  xScale: number;
  yScale: number;
  depthScale: number;
  centerPinch: number;
  edgeFan: number;
  verticalSpread: number;
  twist: number;
  bow: number;
  sweep: number;
  horizontalWaveFrequency: number;
  horizontalWaveAmplitude: number;
  verticalWaveFrequency: number;
  verticalWaveAmplitude: number;
  depthWaveFrequencyX: number;
  depthWaveFrequencyY: number;
  depthWaveAmplitude: number;
  depthBias: number;
  bandFrequency: number;
  jitterX: number;
  jitterY: number;
  jitterZ: number;
};

const PROJECT_FIELD_PRESETS: Record<ProjectFieldTargetId, ProjectFieldPreset> = {
  "project-field-1": {
    xScale: 1.72,
    yScale: 1.48,
    depthScale: 0.28,
    centerPinch: 0.18,
    edgeFan: 0.12,
    verticalSpread: 0.08,
    twist: 0.16,
    bow: 0.18,
    sweep: 0.22,
    horizontalWaveFrequency: 3.4,
    horizontalWaveAmplitude: 0.34,
    verticalWaveFrequency: 2.2,
    verticalWaveAmplitude: 0.12,
    depthWaveFrequencyX: 1.9,
    depthWaveFrequencyY: 2.6,
    depthWaveAmplitude: 0.18,
    depthBias: 0.08,
    bandFrequency: 2.1,
    jitterX: 0.06,
    jitterY: 0.08,
    jitterZ: 0.06,
  },
  "project-field-2": {
    xScale: 1.08,
    yScale: 1.94,
    depthScale: 0.34,
    centerPinch: 0.12,
    edgeFan: 0.06,
    verticalSpread: 0.18,
    twist: 0.54,
    bow: 0.1,
    sweep: -0.12,
    horizontalWaveFrequency: 2.4,
    horizontalWaveAmplitude: 0.16,
    verticalWaveFrequency: 3.8,
    verticalWaveAmplitude: 0.24,
    depthWaveFrequencyX: 1.3,
    depthWaveFrequencyY: 3.8,
    depthWaveAmplitude: 0.24,
    depthBias: 0.16,
    bandFrequency: 2.8,
    jitterX: 0.05,
    jitterY: 0.07,
    jitterZ: 0.08,
  },
  "project-field-3": {
    xScale: 1.98,
    yScale: 1.42,
    depthScale: 0.36,
    centerPinch: 0.06,
    edgeFan: 0.28,
    verticalSpread: 0.14,
    twist: 0.26,
    bow: 0.22,
    sweep: 0.08,
    horizontalWaveFrequency: 2.8,
    horizontalWaveAmplitude: 0.22,
    verticalWaveFrequency: 2.0,
    verticalWaveAmplitude: 0.14,
    depthWaveFrequencyX: 2.8,
    depthWaveFrequencyY: 1.7,
    depthWaveAmplitude: 0.28,
    depthBias: 0.18,
    bandFrequency: 3.1,
    jitterX: 0.06,
    jitterY: 0.08,
    jitterZ: 0.09,
  },
};

type CreateMorphTargetsOptions = {
  textTargets?: PointCloudTextTarget[];
  haloDensityMultiplier?: number;
  textScaleMultiplier?: number;
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
  const projectField1 = new Float32Array(basePositions.length);
  const projectField2 = new Float32Array(basePositions.length);
  const projectField3 = new Float32Array(basePositions.length);
  const settle = new Float32Array(basePositions.length);
  const textTargets = options.textTargets ?? [];
  const haloDensityMultiplier = options.haloDensityMultiplier ?? 1;
  const textScaleMultiplier = options.textScaleMultiplier ?? 1;
  const columns = Math.max(18, Math.round(Math.sqrt(pointCount * 1.45)));
  const rows = Math.ceil(pointCount / columns);
  const depthBands: number = 7;

  for (let index = 0; index < pointCount; index += 1) {
    const offset = index * 3;
    const column = index % columns;
    const row = Math.floor(index / columns);
    const u = columns === 1 ? 0 : column / (columns - 1);
    const v = rows === 1 ? 0 : row / (rows - 1);
    const bandIndex = index % depthBands;
    const band = depthBands === 1 ? 0 : bandIndex / (depthBands - 1) - 0.5;
    const jitterA = pseudoRandom(index, 0.17) - 0.5;
    const jitterB = pseudoRandom(index, 0.47) - 0.5;
    const jitterC = pseudoRandom(index, 0.81) - 0.5;

    writeProjectFieldPosition(
      projectField1,
      offset,
      PROJECT_FIELD_PRESETS["project-field-1"],
      u,
      v,
      band,
      jitterA,
      jitterB,
      jitterC,
    );
    writeProjectFieldPosition(
      projectField2,
      offset,
      PROJECT_FIELD_PRESETS["project-field-2"],
      u,
      v,
      band,
      jitterA,
      jitterB,
      jitterC,
    );
    writeProjectFieldPosition(
      projectField3,
      offset,
      PROJECT_FIELD_PRESETS["project-field-3"],
      u,
      v,
      band,
      jitterA,
      jitterB,
      jitterC,
    );

    settle[offset] = basePositions[offset] * 0.78;
    settle[offset + 1] = basePositions[offset + 1] * 0.78 - 0.04;
    settle[offset + 2] = basePositions[offset + 2] * 0.78 + 0.06;
  }

  const targets: Partial<Record<PointCloudTargetId, Float32Array>> = {
    face: basePositions,
    "project-field-1": projectField1,
    "project-field-2": projectField2,
    "project-field-3": projectField3,
    settle,
  };

  for (const textTarget of textTargets) {
    const scaledTextTarget = {
      ...textTarget,
      width: textTarget.width * textScaleMultiplier,
      height: textTarget.height * textScaleMultiplier,
      depth: textTarget.depth * textScaleMultiplier,
      haloRadius: textTarget.haloRadius * textScaleMultiplier,
    };

    targets[textTarget.id] = createTextMorphTarget(
      pointCount,
      scaledTextTarget,
      haloDensityMultiplier,
      settle,
    );
  }

  return targets as Record<PointCloudTargetId, Float32Array>;
}

function writeProjectFieldPosition(
  target: Float32Array,
  offset: number,
  preset: ProjectFieldPreset,
  u: number,
  v: number,
  band: number,
  jitterA: number,
  jitterB: number,
  jitterC: number,
) {
  const normalizedX = (u - 0.5) * 2;
  const normalizedY = (0.5 - v) * 2;
  const centerWeight = 1 - Math.abs(normalizedX);
  const edgeWeight = Math.abs(normalizedX);
  let x =
    normalizedX *
    preset.xScale *
    (1 - centerWeight * preset.centerPinch + edgeWeight * preset.edgeFan);
  let y = normalizedY * preset.yScale * (1 + edgeWeight * preset.verticalSpread);
  let z =
    band * preset.depthScale +
    Math.cos(
      normalizedX * Math.PI * preset.depthWaveFrequencyX +
        normalizedY * Math.PI * preset.depthWaveFrequencyY,
    ) *
      preset.depthWaveAmplitude +
    centerWeight * preset.depthBias;

  x +=
    Math.sin(normalizedY * Math.PI * preset.horizontalWaveFrequency + band * preset.bandFrequency) *
      preset.horizontalWaveAmplitude +
    normalizedY * preset.sweep;
  y +=
    Math.sin(
      normalizedX * Math.PI * preset.verticalWaveFrequency +
        band * (preset.bandFrequency * 0.65 + 0.45),
    ) *
      preset.verticalWaveAmplitude +
    Math.sin(normalizedX * Math.PI) * preset.bow;

  const twistAngle =
    normalizedY * preset.twist +
    Math.sin(normalizedX * Math.PI * 0.5 + normalizedY * Math.PI) * (preset.twist * 0.22);
  [x, z] = rotate2d(x, z, twistAngle);

  target[offset] = x + jitterA * preset.jitterX;
  target[offset + 1] = y + jitterB * preset.jitterY;
  target[offset + 2] = z + jitterC * preset.jitterZ;
}

function rotate2d(x: number, y: number, angle: number): [number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - y * sin, x * sin + y * cos];
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
