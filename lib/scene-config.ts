import type { ContentSectionId, ProjectSlug } from "@/lib/content";

export type SectionId =
  | "intro"
  | "about-stage"
  | "projects-stage"
  | ProjectSlug
  | "outro";

export type SceneBeatKey =
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

export type SectionKind =
  | "intro"
  | "particle-text"
  | "content-stage"
  | "card"
  | "spacer"
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
  | "orbital"
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

export type ScenePresetId =
  | "intro-face"
  | "about-transform"
  | "about-title"
  | "projects-transform"
  | "projects-hero"
  | "projects-reveal"
  | "project-card-1"
  | "project-card-2"
  | "project-card-3"
  | "project-card-3-hold"
  | "outro-face";

export type SceneBeatDefinition = {
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

export type ScenePhase = {
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
    fontFamily: "Montserrat",
    fontWeight: 700,
    fillDensity: 0.82,
    haloDensity: 0.12,
    width: 1.84,
    height: 0.46,
    depth: 0.1,
    haloRadius: 0.11,
  },
  projects: {
    id: "projects",
    label: "Projects",
    fontFamily: "Montserrat",
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

export const SCENE_PRESETS: Record<ScenePresetId, ScenePreset> = {
  "intro-face": {
    camera: {
      position: [-0.04, 0.02, 4.72],
      target: [0.05, 0.02, 0],
      fov: 29,
    },
    cloud: {
      shape: "face",
      position: [0.22, 0.02, 0],
      rotation: [0.02, 0.04, 0],
      scale: 1.14,
      pointSize: 0.0185,
      noise: 0.03,
      intensity: 0.22,
      opacity: 0.98,
    },
  },
  "about-transform": {
    camera: {
      position: [0, 0.12, 4.5],
      target: [0, 0.14, 0],
      fov: 30,
    },
    cloud: {
      shape: "text",
      textTargetId: "about-me",
      position: [0, 0.96, 0],
      rotation: [0.01, 0.04, 0],
      scale: 1.02,
      pointSize: 0.0158,
      noise: 0.038,
      intensity: 0.28,
      opacity: 0.97,
    },
  },
  "about-title": {
    camera: {
      position: [0, 0.12, 4.46],
      target: [0, 0.14, 0],
      fov: 29,
    },
    cloud: {
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
  },
  "projects-transform": {
    camera: {
      position: [0.01, 0.03, 4.26],
      target: [0.01, 0.03, 0],
      fov: 30,
    },
    cloud: {
      shape: "text",
      textTargetId: "projects",
      position: [0.02, 0.04, 0],
      rotation: [0.01, 0.02, 0],
      scale: 1.04,
      pointSize: 0.0172,
      noise: 0.038,
      intensity: 0.3,
      opacity: 0.96,
    },
  },
  "projects-hero": {
    camera: {
      position: [0.02, 0.04, 4.24],
      target: [0.01, 0.03, 0],
      fov: 30,
    },
    cloud: {
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
  },
  "projects-reveal": {
    camera: {
      position: [0.02, 0.04, 4.38],
      target: [0.01, 0.03, 0],
      fov: 31,
    },
    cloud: {
      shape: "text",
      textTargetId: "projects",
      position: [0.03, 0.04, 0],
      rotation: [0, 0.03, 0],
      scale: 1.01,
      pointSize: 0.0169,
      noise: 0.024,
      intensity: 0.24,
      opacity: 0.98,
    },
  },
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
  "project-card-3": {
    camera: {
      position: [0.02, 0.08, 4.52],
      target: [0, 0.04, 0],
      fov: 35,
    },
    cloud: {
      shape: "project-field-3",
      position: [0, 0.06, -0.08],
      rotation: [-0.08, 0.26, -0.04],
      scale: 1.74,
      pointSize: 0.0154,
      noise: 0.052,
      intensity: 0.34,
      opacity: 0.64,
    },
  },
  "project-card-3-hold": {
    camera: {
      position: [0.02, 0.08, 4.52],
      target: [0, 0.04, 0],
      fov: 35,
    },
    cloud: {
      shape: "project-field-3",
      position: [0, 0.06, -0.08],
      rotation: [-0.08, 0.26, -0.04],
      scale: 1.74,
      pointSize: 0.0154,
      noise: 0.052,
      intensity: 0.34,
      opacity: 0.64,
    },
  },
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
    sceneBeats: [
      {
        key: "intro",
        presetId: "intro-face",
        durationWeight: 1,
      },
    ],
  },
  {
    id: "about-stage",
    kind: "content-stage",
    domVariant: "content",
    ariaLabel: "About me",
    contentId: "about-me",
    durationWeight: 156,
    sceneBeats: [
      {
        key: "about-transform",
        presetId: "about-transform",
        durationWeight: 44,
      },
      {
        key: "about-title",
        presetId: "about-title",
        durationWeight: 112,
      },
    ],
  },
  {
    id: "projects-stage",
    kind: "particle-text",
    domVariant: "transform",
    durationWeight: 236,
    sceneBeats: [
      {
        key: "transform",
        presetId: "projects-transform",
        durationWeight: 55,
      },
      {
        key: "hero",
        presetId: "projects-hero",
        durationWeight: 103,
      },
      {
        key: "reveal",
        presetId: "projects-reveal",
        durationWeight: 78,
      },
    ],
  },
  {
    id: "project-01",
    kind: "card",
    domVariant: "project",
    projectSlug: "project-01",
    durationWeight: 174,
    sceneBeats: [
      {
        key: "project-1",
        presetId: "project-card-1",
        durationWeight: 1,
      },
    ],
  },
  {
    id: "project-02",
    kind: "card",
    domVariant: "project",
    projectSlug: "project-02",
    durationWeight: 145,
    sceneBeats: [
      {
        key: "project-2",
        presetId: "project-card-2",
        durationWeight: 1,
      },
    ],
  },
  {
    id: "project-03",
    kind: "card",
    domVariant: "project",
    projectSlug: "project-03",
    durationWeight: 150,
    sceneBeats: [
      {
        key: "project-3",
        presetId: "project-card-3",
        durationWeight: 1,
      },
    ],
  },
  {
    id: "outro",
    kind: "outro",
    domVariant: "outro",
    durationWeight: 145,
    sceneBeats: [
      {
        key: "project-3-hold",
        presetId: "project-card-3-hold",
        durationWeight: 82,
      },
      {
        key: "contact",
        presetId: "outro-face",
        durationWeight: 63,
      },
    ],
  },
];

const { sectionRanges, scenePhases } = buildSceneConfiguration(
  PORTFOLIO_SECTIONS,
  SCENE_PRESETS,
);

export const SECTION_PROGRESS_RANGES = sectionRanges;
export const SCENE_PHASES = scenePhases;

export function getSectionProgressRange(sectionId: SectionId) {
  return SECTION_PROGRESS_RANGES[sectionId];
}

export function getSectionProgressPoint(sectionId: SectionId, localProgress: number) {
  const [start, end] = getSectionProgressRange(sectionId);
  return roundProgress(start + (end - start) * clamp(localProgress, 0, 1));
}

export function getSceneBeatProgressPoint(beatKey: SceneBeatKey, localProgress = 0) {
  const phase = SCENE_PHASES.find((scenePhase) => scenePhase.key === beatKey);

  if (!phase) {
    return 0;
  }

  return roundProgress(
    phase.range[0] + (phase.range[1] - phase.range[0]) * clamp(localProgress, 0, 1),
  );
}

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
