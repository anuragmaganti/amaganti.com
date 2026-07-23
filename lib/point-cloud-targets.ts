import {
  type PointCloudTextTarget,
  type PointCloudTextTargetId,
} from "@/config/visual";
import {
  PROJECT_FIELD_PRESETS,
  type ProjectFieldPreset,
  type ProjectFieldPresetId,
} from "@/lib/project-field-presets";
import type {
  PointCloudTargetId,
  SceneCloudState,
} from "@/lib/scene-types";

const TWO_PI = Math.PI * 2;

type CreateMorphTargetsOptions = {
  textTargets: readonly (PointCloudTextTarget & {
    id: PointCloudTextTargetId;
  })[];
  haloDensityMultiplier?: number;
};

export function createMorphTargets(
  basePositions: Float32Array,
  options: CreateMorphTargetsOptions,
): Record<PointCloudTargetId, Float32Array> {
  const pointCount = Math.floor(basePositions.length / 3);
  const projectPresetIds = Object.keys(
    PROJECT_FIELD_PRESETS,
  ) as ProjectFieldPresetId[];
  const projectFields = Object.fromEntries(
    projectPresetIds.map((id) => [
      id,
      new Float32Array(basePositions.length),
    ]),
  ) as Record<ProjectFieldPresetId, Float32Array>;
  const settle = new Float32Array(basePositions.length);
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
    const bandIndex = index % depthBands;
    const band = depthBands === 1 ? 0 : bandIndex / (depthBands - 1) - 0.5;
    const jitterA = pseudoRandom(index, 0.17) - 0.5;
    const jitterB = pseudoRandom(index, 0.47) - 0.5;
    const jitterC = pseudoRandom(index, 0.81) - 0.5;

    for (const presetId of projectPresetIds) {
      writeProjectFieldPosition(
        projectFields[presetId],
        offset,
        PROJECT_FIELD_PRESETS[presetId],
        u,
        v,
        band,
        jitterA,
        jitterB,
        jitterC,
      );
    }

    settle[offset] = basePositions[offset] * 0.78;
    settle[offset + 1] = basePositions[offset + 1] * 0.78 - 0.04;
    settle[offset + 2] = basePositions[offset + 2] * 0.78 + 0.06;
  }

  const targets: Partial<Record<PointCloudTargetId, Float32Array>> = {
    face: basePositions,
    ...projectFields,
    settle,
  };

  for (const textTarget of options.textTargets) {
    targets[textTarget.id] = createTextMorphTarget(
      pointCount,
      textTarget,
      haloDensityMultiplier,
      settle,
    );
  }

  return targets as Record<PointCloudTargetId, Float32Array>;
}

export function resolveMorphTargetId(cloud: SceneCloudState): PointCloudTargetId {
  if (cloud.shape === "text" && cloud.textTargetId) {
    return cloud.textTargetId;
  }

  if (cloud.shape === "project-field" && cloud.projectFieldPresetId) {
    return cloud.projectFieldPresetId;
  }

  return cloud.shape === "text" || cloud.shape === "project-field"
    ? "settle"
    : cloud.shape;
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
  const along = (u - 0.5) * 2;
  const across = (0.5 - v) * 2;
  const edgeWeight = Math.abs(along);
  const streamWidth = preset.width * (1 + edgeWeight * preset.fan);
  const wave =
    Math.sin(
      (along * preset.waveFrequency + preset.phase) * Math.PI + band * 1.7,
    ) * preset.waveAmplitude;
  const centerline =
    Math.sin((along + preset.phase * 0.35) * Math.PI * 0.72) *
      preset.bend +
    wave * (0.35 + Math.abs(across) * 0.65);
  const streamAlong =
    along * preset.length +
    Math.sin(across * Math.PI + band * 2.1) * preset.waveAmplitude * 0.26;
  const streamAcross = across * streamWidth + centerline;
  const twistAngle = along * preset.twist + band * 0.42;
  const twistedAcross = streamAcross * Math.cos(twistAngle);
  const depth =
    band * preset.depth +
    streamAcross * Math.sin(twistAngle) * preset.depth * 0.48 +
    Math.cos(
      (along * preset.waveFrequency - across * 0.62 + preset.phase) * Math.PI,
    ) *
      preset.depth * 0.14;
  target[offset] = streamAlong + jitterA * preset.jitter[0];
  target[offset + 1] = twistedAcross + jitterB * preset.jitter[1];
  target[offset + 2] = depth + jitterC * preset.jitter[2];
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
      depthNoise +
      Math.sin(worldX * 2.8 + worldY * 4.2) * (target.depth * 0.12);
  }

  for (let index = fillCount; index < pointCount; index += 1) {
    const offset = index * 3;
    const haloIndex = index - fillCount;
    const pairIndex =
      pickDistributedIndex(edgePixels.length / 2, haloIndex, haloCount, 0.61) *
      2;
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
      (pseudoRandom(index, 0.57) - 0.5) * target.depth * 1.8 +
      target.depth * 0.28;
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
  const jitter =
    (pseudoRandom(index, seed) - 0.5) * Math.max(1, itemCount / total);
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
