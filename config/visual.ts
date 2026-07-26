export type PortfolioTheme = "dark" | "light";

export const themeConfig = {
  defaultTheme: "light",
  storageKey: "portfolio-theme",
} as const satisfies {
  defaultTheme: PortfolioTheme;
  storageKey: string;
};

export type PointCloudTextTarget = {
  id: string;
  label: string;
  fontFamily: string;
  fontWeight: number;
  fillDensity: number;
  haloDensity: number;
  width: number;
  height: number;
  depth: number;
  haloRadius: number;
};

type PointCloudTextTargetDefinition = Omit<PointCloudTextTarget, "id">;

function defineParticleTextTargets<
  const Targets extends Record<string, PointCloudTextTargetDefinition>,
>(targets: Targets) {
  return Object.fromEntries(
    Object.entries(targets).map(([id, target]) => [id, { id, ...target }]),
  ) as {
    [Id in keyof Targets]: Targets[Id] & { id: Id };
  };
}

export const particleTextTargets = defineParticleTextTargets({
  "about-me": {
    label: "About Me",
    fontFamily: "Instrument Sans",
    fontWeight: 700,
    fillDensity: 0.93,
    haloDensity: 0.07,
    width: 1.84,
    height: 0.46,
    depth: 0.06,
    haloRadius: 0.075,
  },
  projects: {
    label: "Projects",
    fontFamily: "Instrument Sans",
    fontWeight: 700,
    fillDensity: 0.84,
    haloDensity: 0.18,
    width: 2.72,
    height: 0.84,
    depth: 0.14,
    haloRadius: 0.18,
  },
} as const satisfies Record<string, PointCloudTextTargetDefinition>);

export type PointCloudTextTargetId = keyof typeof particleTextTargets;

export const particleVisualConfig = {
  headAsset: {
    path: "/models/face-points.bin",
    // Euler rotation in radians, applied X -> Y -> Z before normalization.
    orientation: { x: -Math.PI / 2, y: 0, z: 0 },
  },
  density: {
    maxPoints: 8000,
  },
  appearance: {
    pointSizeScale: 1,
    noiseScale: 1,
    darkProjectOpacityMultiplier: 0.84,
  },
  interaction: {
    pointerFlowStrength: 1,
    pressureRippleStrength: 1,
    cardFlowStrength: 1,
  },
  quality: {
    standard: {
      noiseMultiplier: 0.48,
      textHaloMultiplier: 1,
    },
    reducedMotion: {
      noiseMultiplier: 0.18,
      textHaloMultiplier: 0.12,
    },
  },
} as const;
