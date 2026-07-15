export type ProjectFieldPreset = {
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

export const PROJECT_FIELD_PRESETS = {
  "contour-sheet": {
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
  "torsion-column": {
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
  "bloom-fan": {
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
    verticalWaveFrequency: 2,
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
} as const satisfies Record<string, ProjectFieldPreset>;

export type ProjectFieldPresetId = keyof typeof PROJECT_FIELD_PRESETS;
