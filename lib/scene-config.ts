import {
  projects,
  type ContentSectionId,
  type ProjectEntry,
  type ProjectSlug,
} from "@/lib/content";
import type { ProjectFieldPresetId } from "@/lib/project-field-presets";

export type SectionId =
  | "intro"
  | "about-stage"
  | "projects-stage"
  | ProjectSlug
  | "outro";

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

export type PointCloudShape = "face" | "text" | "project-field" | "settle";
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
  | "face"
  | "settle"
  | PointCloudTextTargetId
  | ProjectFieldPresetId;

type SceneCameraState = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export type SceneCloudState = {
  shape: PointCloudShape;
  textTargetId?: PointCloudTextTargetId;
  projectFieldPresetId?: ProjectFieldPresetId;
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

type StaticScenePresetId =
  | "intro-face"
  | "about-transform"
  | "about-title"
  | "projects-transform"
  | "projects-hero"
  | "projects-reveal"
  | "outro-face";
type ProjectScenePresetId = `project-${ProjectFieldPresetId}`;
type ScenePresetId = StaticScenePresetId | ProjectScenePresetId;

type SceneBeatDefinition = {
  key: string;
  presetId: ScenePresetId;
  durationWeight: number;
};

export type SectionDefinition = {
  id: SectionId;
  kind: SectionKind;
  domVariant: SectionDomVariant;
  ariaLabel?: string;
  projectSlug?: ProjectSlug;
  contentId?: ContentSectionId;
  snapLocalProgress?: number;
  sceneBeats: SceneBeatDefinition[];
};

export type ScenePhase = {
  key: string;
  range: [number, number];
  camera: SceneCameraState;
  cloud: SceneCloudState;
};

export type SceneTimeline = {
  sectionRanges: Record<SectionId, [number, number]>;
  phases: ScenePhase[];
};

export const POINT_CLOUD_ASSET_PATH = "/models/face-points.bin";

export const POINT_CLOUD_TEXT_TARGETS: Record<
  PointCloudTextTargetId,
  PointCloudTextTarget
> = {
  "about-me": {
    id: "about-me",
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
    camera: { ...base.camera, ...overrides.camera },
    cloud: { ...base.cloud, ...overrides.cloud },
  };
}

function createSceneBeat(
  key: string,
  presetId: ScenePresetId,
  durationWeight: number,
): SceneBeatDefinition {
  return { key, presetId, durationWeight };
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
    position: [0, 0.72, 0],
    rotation: [0, 0.03, 0],
    scale: 1,
    pointSize: 0.017,
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

const PROJECT_SCENE_PRESETS: Record<ProjectFieldPresetId, ScenePreset> = {
  "contour-sheet": createScenePreset(
    { position: [0.02, 0.02, 4.62], target: [0, 0.03, 0], fov: 36 },
    {
      shape: "project-field",
      projectFieldPresetId: "contour-sheet",
      position: [0, 0.03, -0.1],
      rotation: [-0.08, -0.42, 0.12],
      scale: 1.78,
      pointSize: 0.0158,
      noise: 0.06,
      intensity: 0.38,
      opacity: 0.72,
    },
  ),
  "torsion-column": createScenePreset(
    { position: [0.01, 0.04, 4.58], target: [0, 0.02, 0], fov: 36 },
    {
      shape: "project-field",
      projectFieldPresetId: "torsion-column",
      position: [0, 0.02, -0.1],
      rotation: [0.16, 0.2, -0.14],
      scale: 1.72,
      pointSize: 0.0156,
      noise: 0.054,
      intensity: 0.34,
      opacity: 0.68,
    },
  ),
  "bloom-fan": createScenePreset(
    { position: [0.02, 0.08, 4.52], target: [0, 0.04, 0], fov: 35 },
    {
      shape: "project-field",
      projectFieldPresetId: "bloom-fan",
      position: [0, 0.06, -0.08],
      rotation: [-0.08, 0.26, -0.04],
      scale: 1.74,
      pointSize: 0.0154,
      noise: 0.052,
      intensity: 0.34,
      opacity: 0.64,
    },
  ),
};

const staticPresets: Record<StaticScenePresetId, ScenePreset> = {
  "intro-face": INTRO_FACE_PRESET,
  "about-transform": extendScenePreset(ABOUT_TITLE_PRESET, {
    camera: { position: [0, 0.12, 4.5], fov: 30 },
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
    camera: { position: [0.01, 0.03, 4.26], target: [0.01, 0.03, 0] },
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
    camera: { position: [0.02, 0.04, 4.38], fov: 31 },
    cloud: { scale: 1.01, pointSize: 0.0169, noise: 0.024, intensity: 0.24 },
  }),
  "outro-face": createScenePreset(
    { position: [0, 0.02, 4.62], target: [0, 0.02, 0], fov: 29 },
    {
      shape: "face",
      position: [0, 0.2, 0],
      rotation: [0.02, 0.02, 0],
      scale: 1.02,
      pointSize: 0.0185,
      noise: 0.015,
      intensity: 0.12,
      opacity: 0.98,
    },
  ),
};

const projectPresets = Object.fromEntries(
  Object.entries(PROJECT_SCENE_PRESETS).map(([id, preset]) => [`project-${id}`, preset]),
) as Record<ProjectScenePresetId, ScenePreset>;

const SCENE_PRESETS: Record<ScenePresetId, ScenePreset> = {
  ...staticPresets,
  ...projectPresets,
};

function createCardSection(project: ProjectEntry): SectionDefinition {
  return {
    id: project.slug as ProjectSlug,
    kind: "card",
    domVariant: "project",
    projectSlug: project.slug as ProjectSlug,
    snapLocalProgress: 0,
    sceneBeats: [
      createSceneBeat(
        `project:${project.slug}`,
        `project-${project.particlePreset}`,
        1,
      ),
    ],
  };
}

const finalProject = projects.at(-1);

if (!finalProject) {
  throw new Error("At least one project is required to build the scene timeline.");
}

export const PORTFOLIO_SECTIONS: SectionDefinition[] = [
  {
    id: "intro",
    kind: "intro",
    domVariant: "intro",
    ariaLabel: "Point cloud introduction",
    sceneBeats: [createSceneBeat("intro", "intro-face", 1)],
  },
  {
    id: "about-stage",
    kind: "content-stage",
    domVariant: "content",
    ariaLabel: "About Me",
    contentId: "about-me",
    snapLocalProgress: 0.3,
    sceneBeats: [
      createSceneBeat("about-transform", "about-transform", 44),
      createSceneBeat("about-title", "about-title", 112),
    ],
  },
  {
    id: "projects-stage",
    kind: "particle-text",
    domVariant: "transform",
    ariaLabel: "Projects",
    snapLocalProgress: 0.45,
    sceneBeats: [
      createSceneBeat("projects-transform", "projects-transform", 50),
      createSceneBeat("projects-hero", "projects-hero", 50),
      createSceneBeat("projects-reveal", "projects-reveal", 100),
    ],
  },
  ...projects.map(createCardSection),
  {
    id: "outro",
    kind: "outro",
    domVariant: "outro",
    ariaLabel: "Contact links",
    sceneBeats: [
      createSceneBeat(
        `project:${finalProject.slug}:hold`,
        `project-${finalProject.particlePreset}`,
        82,
      ),
      createSceneBeat("contact", "outro-face", 63),
    ],
  },
];

export function createSceneTimeline(
  measuredRanges: Partial<Record<SectionId, [number, number]>> = {},
): SceneTimeline {
  const fallbackSize = 1 / PORTFOLIO_SECTIONS.length;
  const sectionRanges = {} as Record<SectionId, [number, number]>;
  const phases: ScenePhase[] = [];

  PORTFOLIO_SECTIONS.forEach((section, sectionIndex) => {
    const fallbackRange: [number, number] = [
      roundProgress(sectionIndex * fallbackSize),
      sectionIndex === PORTFOLIO_SECTIONS.length - 1
        ? 1
        : roundProgress((sectionIndex + 1) * fallbackSize),
    ];
    const sectionRange = measuredRanges[section.id] ?? fallbackRange;
    sectionRanges[section.id] = sectionRange;

    const totalBeatWeight = section.sceneBeats.reduce(
      (total, beat) => total + beat.durationWeight,
      0,
    );
    let beatWeight = 0;

    section.sceneBeats.forEach((beat, beatIndex) => {
      const beatStart = getRangePoint(
        sectionRange,
        beatWeight / totalBeatWeight,
      );
      beatWeight += beat.durationWeight;
      const beatEnd =
        sectionIndex === PORTFOLIO_SECTIONS.length - 1 &&
        beatIndex === section.sceneBeats.length - 1
          ? 1
          : getRangePoint(sectionRange, beatWeight / totalBeatWeight);
      const preset = SCENE_PRESETS[beat.presetId];

      phases.push({
        key: beat.key,
        range: [beatStart, beatEnd],
        camera: preset.camera,
        cloud: preset.cloud,
      });
    });
  });

  return { sectionRanges, phases };
}

export function getTimelineProgressPoint(
  timeline: SceneTimeline,
  sectionId: SectionId,
  localProgress: number,
) {
  return getRangePoint(
    timeline.sectionRanges[sectionId],
    clamp(localProgress, 0, 1),
  );
}

function getRangePoint(range: [number, number], localProgress: number) {
  return roundProgress(range[0] + (range[1] - range[0]) * localProgress);
}

function roundProgress(value: number) {
  return Number(value.toFixed(6));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
