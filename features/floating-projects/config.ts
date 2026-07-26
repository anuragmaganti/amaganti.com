export const floatingProjectCardRoles = ["media", "copy", "actions"] as const;

export type FloatingProjectCardRole =
  (typeof floatingProjectCardRoles)[number];

const MOBILE_CARD_MAX_VIEWPORT_WIDTH = 700;
const MOBILE_CARD_SCALE = 0.9;

export function getFloatingProjectCardScale(viewportWidth: number) {
  return viewportWidth <= MOBILE_CARD_MAX_VIEWPORT_WIDTH
    ? MOBILE_CARD_SCALE
    : 1;
}

export type FloatingProjectLayoutPreset = {
  columnGap: number;
  mediaActionGap: number;
  horizontalBalance: number;
  copyCenterY: number;
  mediaCenterY: number;
  actionsXShift: number;
  stackGap: number;
  stackVerticalBias: number;
  stackXOffsets: Record<FloatingProjectCardRole, number>;
  angles: Record<FloatingProjectCardRole, number>;
};

export const floatingProjectLayoutPresets = {
  "left-balanced": {
    columnGap: 58,
    mediaActionGap: 36,
    horizontalBalance: 0.35,
    copyCenterY: 0.42,
    mediaCenterY: 0.44,
    actionsXShift: -0.018,
    stackGap: 14,
    stackVerticalBias: -0.045,
    stackXOffsets: { media: -0.04, copy: 0.03, actions: -0.01 },
    angles: { media: -0.038, copy: 0.026, actions: -0.018 },
  },
  "right-balanced": {
    columnGap: 74,
    mediaActionGap: 44,
    horizontalBalance: 0.62,
    copyCenterY: 0.52,
    mediaCenterY: 0.49,
    actionsXShift: 0.028,
    stackGap: 20,
    stackVerticalBias: 0.035,
    stackXOffsets: { media: 0.03, copy: -0.04, actions: 0.05 },
    angles: { media: 0.018, copy: -0.028, actions: 0.024 },
  },
  "center-stagger": {
    columnGap: 66,
    mediaActionGap: 30,
    horizontalBalance: 0.48,
    copyCenterY: 0.46,
    mediaCenterY: 0.47,
    actionsXShift: -0.032,
    stackGap: 11,
    stackVerticalBias: -0.015,
    stackXOffsets: { media: -0.01, copy: 0.05, actions: -0.04 },
    angles: { media: -0.012, copy: 0.036, actions: 0.008 },
  },
  "low-stagger": {
    columnGap: 82,
    mediaActionGap: 50,
    horizontalBalance: 0.4,
    copyCenterY: 0.54,
    mediaCenterY: 0.5,
    actionsXShift: 0.016,
    stackGap: 22,
    stackVerticalBias: 0.05,
    stackXOffsets: { media: 0.05, copy: -0.02, actions: 0.01 },
    angles: { media: 0.032, copy: -0.014, actions: -0.026 },
  },
  "high-stagger": {
    columnGap: 70,
    mediaActionGap: 40,
    horizontalBalance: 0.57,
    copyCenterY: 0.39,
    mediaCenterY: 0.41,
    actionsXShift: 0.04,
    stackGap: 16,
    stackVerticalBias: -0.055,
    stackXOffsets: { media: -0.05, copy: -0.01, actions: 0.04 },
    angles: { media: -0.044, copy: -0.03, actions: 0.03 },
  },
} as const satisfies Record<string, FloatingProjectLayoutPreset>;

export type FloatingProjectLayoutPresetId =
  keyof typeof floatingProjectLayoutPresets;

export function mapFloatingProjectCards<Value>(
  createValue: (role: FloatingProjectCardRole, index: number) => Value,
): Record<FloatingProjectCardRole, Value> {
  return {
    media: createValue("media", 0),
    copy: createValue("copy", 1),
    actions: createValue("actions", 2),
  };
}
