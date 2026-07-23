export type ProjectFieldPreset = {
  length: number;
  width: number;
  depth: number;
  bend: number;
  fan: number;
  twist: number;
  waveAmplitude: number;
  waveFrequency: number;
  phase: number;
  jitter: readonly [number, number, number];
};

export const PROJECT_FIELD_PRESETS = {
  "contour-sheet": {
    length: 1.86,
    width: 1.34,
    depth: 0.28,
    bend: 0.2,
    fan: 0.12,
    twist: 0.16,
    waveAmplitude: 0.18,
    waveFrequency: 1.7,
    phase: 0.08,
    jitter: [0.055, 0.07, 0.055],
  },
  "torsion-column": {
    length: 1.9,
    width: 1.18,
    depth: 0.42,
    bend: 0.28,
    fan: 0.1,
    twist: 0.68,
    waveAmplitude: 0.2,
    waveFrequency: 2.05,
    phase: 0.42,
    jitter: [0.05, 0.065, 0.075],
  },
  "bloom-fan": {
    length: 1.96,
    width: 1.42,
    depth: 0.4,
    bend: 0.35,
    fan: 0.38,
    twist: 0.3,
    waveAmplitude: 0.24,
    waveFrequency: 1.45,
    phase: 0.72,
    jitter: [0.055, 0.075, 0.085],
  },
} as const satisfies Record<string, ProjectFieldPreset>;

export type ProjectFieldPresetId = keyof typeof PROJECT_FIELD_PRESETS;
