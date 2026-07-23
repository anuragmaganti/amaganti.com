import { projects } from "@/config/portfolio";
import type { ProjectFieldPresetId } from "@/lib/project-field-presets";
import type {
  SceneCameraState,
  SceneCloudState,
  ScenePreset,
} from "@/lib/scene-types";

type ScenePresetOverrides = {
  camera?: Partial<SceneCameraState>;
  cloud?: Partial<SceneCloudState>;
};

type SceneCloudDefinition = Omit<
  SceneCloudState,
  "viewportFrame" | "obstacleFlow"
> &
  Partial<Pick<SceneCloudState, "viewportFrame" | "obstacleFlow">>;

type StaticScenePresetId =
  | "intro-face"
  | "about-transform"
  | "about-title"
  | "projects-transform"
  | "projects-hero"
  | "projects-reveal"
  | "skills-ambient"
  | "outro-face";
type ProjectScenePresetId = `project-${ProjectFieldPresetId}`;
export type ScenePresetId = StaticScenePresetId | ProjectScenePresetId;

const ABOUT_TEXT_COMPOSITION_SCALE = 0.84;
const PROJECTS_TEXT_COMPOSITION_SCALE = 0.86;
const PROJECT_FIELD_ROTATION: SceneCloudState["rotation"] = [
  -0.04,
  -0.12,
  0.02,
];

function createScenePreset(
  camera: SceneCameraState,
  cloud: SceneCloudDefinition,
): ScenePreset {
  const isProjectField = cloud.shape === "project-field";

  return {
    camera,
    cloud: {
      // Fields retain authored world space so obstacle projection and preset
      // geometry use one coordinate system. Foreground subjects preserve frame.
      viewportFrame: isProjectField ? "authored" : "preserve",
      obstacleFlow: isProjectField ? 1 : 0,
      ...cloud,
    },
  };
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

const introFacePreset = createScenePreset(
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

const aboutTitlePreset = createScenePreset(
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
    scale: ABOUT_TEXT_COMPOSITION_SCALE,
    pointSize: 0.017 * ABOUT_TEXT_COMPOSITION_SCALE,
    noise: 0.022,
    intensity: 0.22,
    opacity: 0.98,
  },
);

const projectsHeroPreset = createScenePreset(
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
    scale: 1.02 * PROJECTS_TEXT_COMPOSITION_SCALE,
    pointSize: 0.017 * PROJECTS_TEXT_COMPOSITION_SCALE,
    noise: 0.022,
    intensity: 0.22,
    opacity: 0.98,
  },
);

export const projectScenePresets: Record<ProjectFieldPresetId, ScenePreset> = {
  "contour-sheet": createScenePreset(
    { position: [0.02, 0.02, 4.62], target: [0, 0.03, 0], fov: 36 },
    {
      shape: "project-field",
      projectFieldPresetId: "contour-sheet",
      position: [0, 0.03, -0.1],
      rotation: PROJECT_FIELD_ROTATION,
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
      rotation: PROJECT_FIELD_ROTATION,
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
      rotation: PROJECT_FIELD_ROTATION,
      scale: 1.74,
      pointSize: 0.0154,
      noise: 0.052,
      intensity: 0.34,
      opacity: 0.64,
    },
  ),
};

const finalProject = projects.at(-1);

if (!finalProject) {
  throw new Error("At least one project is required to build the scene presets.");
}

const skillsAmbientPreset = extendScenePreset(
  projectScenePresets[finalProject.particlePreset],
  {
    camera: { position: [0.01, 0.04, 4.84], target: [0, 0.03, 0], fov: 37 },
    cloud: {
      position: [0, 0.03, -0.32],
      scale: 2.08,
      pointSize: 0.013,
      noise: 0.028,
      intensity: 0.12,
      opacity: 0.3,
    },
  },
);

const staticPresets: Record<StaticScenePresetId, ScenePreset> = {
  "intro-face": introFacePreset,
  "about-transform": extendScenePreset(aboutTitlePreset, {
    camera: { position: [0, 0.12, 4.5], fov: 30 },
    cloud: {
      position: [0, 0.96, 0],
      rotation: [0.01, 0.04, 0],
      scale: 1.02 * ABOUT_TEXT_COMPOSITION_SCALE,
      pointSize: 0.0158 * ABOUT_TEXT_COMPOSITION_SCALE,
      noise: 0.038,
      intensity: 0.28,
      opacity: 0.97,
    },
  }),
  "about-title": aboutTitlePreset,
  "projects-transform": extendScenePreset(projectsHeroPreset, {
    camera: { position: [0.01, 0.03, 4.26], target: [0.01, 0.03, 0] },
    cloud: {
      position: [0.02, 0.04, 0],
      rotation: [0.01, 0.02, 0],
      scale: 1.04 * PROJECTS_TEXT_COMPOSITION_SCALE,
      pointSize: 0.0172 * PROJECTS_TEXT_COMPOSITION_SCALE,
      noise: 0.038,
      intensity: 0.3,
      opacity: 0.96,
    },
  }),
  "projects-hero": projectsHeroPreset,
  "projects-reveal": extendScenePreset(projectsHeroPreset, {
    camera: { position: [0.02, 0.04, 4.38], fov: 31 },
    cloud: {
      scale: 1.01 * PROJECTS_TEXT_COMPOSITION_SCALE,
      pointSize: 0.0169 * PROJECTS_TEXT_COMPOSITION_SCALE,
      noise: 0.024,
      intensity: 0.24,
    },
  }),
  "skills-ambient": skillsAmbientPreset,
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
  Object.entries(projectScenePresets).map(([id, preset]) => [
    `project-${id}`,
    preset,
  ]),
) as Record<ProjectScenePresetId, ScenePreset>;

export const scenePresets: Record<ScenePresetId, ScenePreset> = {
  ...staticPresets,
  ...projectPresets,
};
