import type { ContentSectionId, ProjectSlug } from "@/lib/content";

export type SectionId =
  | "intro"
  | "about-stage"
  | "projects-stage"
  | ProjectSlug
  | "outro";

type SceneBeatKey =
  | "intro"
  | "about-transform"
  | "about-title"
  | "transform"
  | "hero"
  | "reveal"
  | "project-1"
  | "project-2"
  | "project-3"
  | "project-3-hold"
  | "contact";

type SectionKind =
  | "intro"
  | "particle-text"
  | "content-stage"
  | "card"
  | "outro";
export type SectionDomVariant =
  | "intro"
  | "transform"
  | "content"
  | "project"
  | "outro";

export type PointCloudShape =
  | "face"
  | "text"
  | "project-field-1"
  | "project-field-2"
  | "project-field-3"
  | "settle";

export type PointCloudTextTargetId = "projects" | "about-me";

export type PointCloudTextTarget = {
  id: PointCloudTextTargetId;
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

export type PointCloudTargetId =
  | Exclude<PointCloudShape, "text">
  | PointCloudTextTargetId;

type SceneCameraState = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

type SceneCloudState = {
  shape: PointCloudShape;
  textTargetId?: PointCloudTextTargetId;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  pointSize: number;
  noise: number;
  intensity: number;
  opacity: number;
};

type ScenePreset = {
  camera: SceneCameraState;
  cloud: SceneCloudState;
};

type ScenePresetOverrides = {
  camera?: Partial<SceneCameraState>;
  cloud?: Partial<SceneCloudState>;
};

type ScenePresetId =
  | "intro-face"
  | "about-transform"
  | "about-title"
  | "projects-transform"
  | "projects-hero"
  | "projects-reveal"
  | "project-card-1"
  | "project-card-2"
  | "project-card-3"
  | "outro-face";

type SceneBeatDefinition = {
  key: SceneBeatKey;
  presetId: ScenePresetId;
  durationWeight: number;
};

export type SectionDefinition = {
  id: SectionId;
  kind: SectionKind;
  durationWeight: number;
  domVariant: SectionDomVariant;
  ariaLabel?: string;
  projectSlug?: ProjectSlug;
  contentId?: ContentSectionId;
  sceneBeats: SceneBeatDefinition[];
};

type ScenePhase = {
  key: SceneBeatKey;
  range: [number, number];
  camera: SceneCameraState;
  cloud: SceneCloudState;
};

export const POINT_CLOUD_ASSET_PATH = "/models/face.ply";
export const FACE_SCAN_GLB_PATH = "/models/face.glb";

export const POINT_CLOUD_TEXT_TARGETS: Record<
  PointCloudTextTargetId,
  PointCloudTextTarget
> = {
  "about-me": {
    id: "about-me",
    label: "About Me",
    fontFamily: "Instrument Sans",
    fontWeight: 400,
    fillDensity: 0.85,
    haloDensity: 0.12,
    width: 1.84,
    height: 0.46,
    depth: 0.1,
    haloRadius: 0.11,
  },
  projects: {
    id: "projects",
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
};

export const RENDER_DEFAULTS = {
  desktopMaxPoints: 8000,
  mobileMaxPoints: 3200,
  reducedMaxPoints: 1600,
  desktopDpr: [1, 1.35] as [number, number],
  mobileDpr: [1, 1.1] as [number, number],
};

function createScenePreset(
  camera: SceneCameraState,
  cloud: SceneCloudState,
): ScenePreset {
  return { camera, cloud };
}

function extendScenePreset(
  base: ScenePreset,
  overrides: ScenePresetOverrides,
): ScenePreset {
  return {
    camera: {
      ...base.camera,
      ...overrides.camera,
    },
    cloud: {
      ...base.cloud,
      ...overrides.cloud,
    },
  };
}

function createSceneBeat(
  key: SceneBeatKey,
  presetId: ScenePresetId,
  durationWeight: number,
): SceneBeatDefinition {
  return {
    key,
    presetId,
    durationWeight,
  };
}

function createCardSection(
  id: ProjectSlug,
  durationWeight: number,
  beatKey: SceneBeatKey,
  presetId: ScenePresetId,
): SectionDefinition {
  return {
    id,
    kind: "card",
    domVariant: "project",
    projectSlug: id,
    durationWeight,
    sceneBeats: [createSceneBeat(beatKey, presetId, 1)],
  };
}

const INTRO_FACE_PRESET = createScenePreset(
  {
    position: [-0.04, 0.02, 4.72],
    target: [0.05, 0.02, 0],
    fov: 29,
  },
  {
    shape: "face",
    position: [0.22, 0.02, 0],
    rotation: [0.02, 0.04, 0],
    scale: 1.14,
    pointSize: 0.0185,
    noise: 0.03,
    intensity: 0.22,
    opacity: 0.98,
  },
);

const ABOUT_TITLE_PRESET = createScenePreset(
  {
    position: [0, 0.12, 4.46],
    target: [0, 0.14, 0],
    fov: 29,
  },
  {
    shape: "text",
    textTargetId: "about-me",
    position: [0, 1.08, 0],
    rotation: [0, 0.03, 0],
    scale: 1,
    pointSize: 0.0154,
    noise: 0.022,
    intensity: 0.22,
    opacity: 0.98,
  },
);

const PROJECTS_HERO_PRESET = createScenePreset(
  {
    position: [0.02, 0.04, 4.24],
    target: [0.01, 0.03, 0],
    fov: 30,
  },
  {
    shape: "text",
    textTargetId: "projects",
    position: [0.03, 0.04, 0],
    rotation: [0, 0.03, 0],
    scale: 1.02,
    pointSize: 0.017,
    noise: 0.022,
    intensity: 0.22,
    opacity: 0.98,
  },
);

const PROJECT_CARD_3_PRESET = createScenePreset(
  {
    position: [0.02, 0.08, 4.52],
    target: [0, 0.04, 0],
    fov: 35,
  },
  {
    shape: "project-field-3",
    position: [0, 0.06, -0.08],
    rotation: [-0.08, 0.26, -0.04],
    scale: 1.74,
    pointSize: 0.0154,
    noise: 0.052,
    intensity: 0.34,
    opacity: 0.64,
  },
);

const SCENE_PRESETS: Record<ScenePresetId, ScenePreset> = {
  "intro-face": INTRO_FACE_PRESET,
  "about-transform": extendScenePreset(ABOUT_TITLE_PRESET, {
    camera: {
      position: [0, 0.12, 4.5],
      fov: 30,
    },
    cloud: {
      position: [0, 0.96, 0],
      rotation: [0.01, 0.04, 0],
      scale: 1.02,
      pointSize: 0.0158,
      noise: 0.038,
      intensity: 0.28,
      opacity: 0.97,
    },
  }),
  "about-title": ABOUT_TITLE_PRESET,
  "projects-transform": extendScenePreset(PROJECTS_HERO_PRESET, {
    camera: {
      position: [0.01, 0.03, 4.26],
      target: [0.01, 0.03, 0],
    },
    cloud: {
      position: [0.02, 0.04, 0],
      rotation: [0.01, 0.02, 0],
      scale: 1.04,
      pointSize: 0.0172,
      noise: 0.038,
      intensity: 0.3,
      opacity: 0.96,
    },
  }),
  "projects-hero": PROJECTS_HERO_PRESET,
  "projects-reveal": extendScenePreset(PROJECTS_HERO_PRESET, {
    camera: {
      position: [0.02, 0.04, 4.38],
      fov: 31,
    },
    cloud: {
      scale: 1.01,
      pointSize: 0.0169,
      noise: 0.024,
      intensity: 0.24,
    },
  }),
  "project-card-1": {
    camera: {
      position: [0.02, 0.02, 4.62],
      target: [0, 0.03, 0],
      fov: 36,
    },
    cloud: {
      shape: "project-field-1",
      position: [0, 0.03, -0.1],
      rotation: [-0.08, -0.42, 0.12],
      scale: 1.78,
      pointSize: 0.0158,
      noise: 0.06,
      intensity: 0.38,
      opacity: 0.72,
    },
  },
  "project-card-2": {
    camera: {
      position: [0.01, 0.04, 4.58],
      target: [0, 0.02, 0],
      fov: 36,
    },
    cloud: {
      shape: "project-field-2",
      position: [0, 0.02, -0.1],
      rotation: [0.16, 0.2, -0.14],
      scale: 1.72,
      pointSize: 0.0156,
      noise: 0.054,
      intensity: 0.34,
      opacity: 0.68,
    },
  },
  "project-card-3": PROJECT_CARD_3_PRESET,
  "outro-face": {
    camera: {
      position: [0, 0.02, 4.62],
      target: [0, 0.02, 0],
      fov: 29,
    },
    cloud: {
      shape: "face",
      position: [0, 0.03, 0],
      rotation: [0.02, 0.02, 0],
      scale: 1.02,
      pointSize: 0.0185,
      noise: 0.015,
      intensity: 0.12,
      opacity: 0.98,
    },
  },
};

export const PORTFOLIO_SECTIONS: SectionDefinition[] = [
  {
    id: "intro",
    kind: "intro",
    domVariant: "intro",
    ariaLabel: "Point cloud introduction",
    durationWeight: 150,
    sceneBeats: [createSceneBeat("intro", "intro-face", 1)],
  },
  {
    id: "about-stage",
    kind: "content-stage",
    domVariant: "content",
    ariaLabel: "About me",
    contentId: "about-me",
    durationWeight: 156,
    sceneBeats: [
      createSceneBeat("about-transform", "about-transform", 44),
      createSceneBeat("about-title", "about-title", 112),
    ],
  },
  {
    id: "projects-stage",
    kind: "particle-text",
    domVariant: "transform",
    durationWeight: 236,
    sceneBeats: [
      createSceneBeat("transform", "projects-transform", 55),
      createSceneBeat("hero", "projects-hero", 103),
      createSceneBeat("reveal", "projects-reveal", 78),
    ],
  },
  createCardSection("project-01", 174, "project-1", "project-card-1"),
  createCardSection("project-02", 145, "project-2", "project-card-2"),
  createCardSection("project-03", 150, "project-3", "project-card-3"),
  {
    id: "outro",
    kind: "outro",
    domVariant: "outro",
    durationWeight: 145,
    sceneBeats: [
      createSceneBeat("project-3-hold", "project-card-3", 82),
      createSceneBeat("contact", "outro-face", 63),
    ],
  },
];

const { sectionRanges, scenePhases } = buildSceneConfiguration(
  PORTFOLIO_SECTIONS,
  SCENE_PRESETS,
);

const SECTION_PROGRESS_RANGES = sectionRanges;
export const SCENE_PHASES = scenePhases;

function getSectionProgressRange(sectionId: SectionId) {
  return SECTION_PROGRESS_RANGES[sectionId];
}

export function getSectionProgressPoint(
  sectionId: SectionId,
  localProgress: number,
) {
  const [start, end] = getSectionProgressRange(sectionId);
  return roundProgress(start + (end - start) * clamp(localProgress, 0, 1));
}

export const INTRO_COPY_PROGRESS_STOPS = [
  getSectionProgressPoint("intro", 0),
  getSectionProgressPoint("intro", 2 / 15),
  getSectionProgressPoint("intro", 2 / 3),
] as const;

export const ABOUT_PROGRESS_MARKERS = {
  magnetTarget: getSectionProgressPoint("about-stage", 0.08),
  bodyExit: [
    getSectionProgressPoint("about-stage", 0.44),
    getSectionProgressPoint("about-stage", 0.66),
  ] as const,
  introBackdrop: [
    getSectionProgressPoint("intro", 0),
    getSectionProgressPoint("about-stage", 0.08),
    getSectionProgressPoint("about-stage", 0.58),
    getSectionProgressPoint("about-stage", 0.92),
  ] as const,
} as const;

function buildSceneConfiguration(
  sections: SectionDefinition[],
  presets: Record<ScenePresetId, ScenePreset>,
) {
  const totalDuration = sections.reduce(
    (sum, section) => sum + section.durationWeight,
    0,
  );
  const nextSectionRanges = {} as Record<SectionId, [number, number]>;
  const nextScenePhases: ScenePhase[] = [];
  let accumulatedWeight = 0;

  for (const section of sections) {
    const sectionStart = roundProgress(accumulatedWeight / totalDuration);
    const sectionEnd = roundProgress(
      (accumulatedWeight + section.durationWeight) / totalDuration,
    );
    nextSectionRanges[section.id] = [sectionStart, sectionEnd];

    const beatWeightTotal = section.sceneBeats.reduce(
      (sum, beat) => sum + beat.durationWeight,
      0,
    );
    let accumulatedBeatWeight = accumulatedWeight;

    section.sceneBeats.forEach((beat, beatIndex) => {
      const beatStart = roundProgress(accumulatedBeatWeight / totalDuration);
      accumulatedBeatWeight +=
        section.durationWeight * (beat.durationWeight / beatWeightTotal);
      const preset = presets[beat.presetId];
      const isFinalBeat =
        section === sections[sections.length - 1] &&
        beatIndex === section.sceneBeats.length - 1;
      const beatEnd = isFinalBeat
        ? 1
        : roundProgress(accumulatedBeatWeight / totalDuration);

      nextScenePhases.push({
        key: beat.key,
        range: [beatStart, beatEnd],
        camera: preset.camera,
        cloud: preset.cloud,
      });
    });

    accumulatedWeight += section.durationWeight;
  }

  return {
    sectionRanges: nextSectionRanges,
    scenePhases: nextScenePhases,
  };
}

function roundProgress(value: number) {
  return Number(value.toFixed(6));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
