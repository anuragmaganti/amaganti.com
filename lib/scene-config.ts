export type SectionKey =
  | "intro"
  | "transform"
  | "hero"
  | "reveal"
  | "project-1"
  | "project-2"
  | "project-3"
  | "about"
  | "contact";

export type PointCloudShape =
  | "face"
  | "text"
  | "orbital"
  | "project-field-1"
  | "project-field-2"
  | "project-field-3"
  | "settle";

export type PointCloudTextTargetId = "projects";

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

export type ScenePhase = {
  key: SectionKey;
  range: [number, number];
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };
  cloud: {
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
};

export const POINT_CLOUD_ASSET_PATH = "/models/face.ply";
export const FACE_SCAN_GLB_PATH = "/models/face.glb";

export const POINT_CLOUD_TEXT_TARGETS: Record<
  PointCloudTextTargetId,
  PointCloudTextTarget
> = {
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

export const SCENE_PHASES: ScenePhase[] = [
  {
    key: "intro",
    range: [0, 0.15],
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
  {
    key: "transform",
    range: [0.15, 0.205],
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
  {
    key: "hero",
    range: [0.205, 0.308],
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
  {
    key: "reveal",
    range: [0.308, 0.386],
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
  {
    key: "project-1",
    range: [0.386, 0.56],
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
  {
    key: "project-2",
    range: [0.56, 0.705],
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
  {
    key: "project-3",
    range: [0.705, 0.855],
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
  {
    key: "about",
    range: [0.855, 0.962],
    camera: {
      position: [0.08, 0, 4.24],
      target: [-0.04, 0.03, 0],
      fov: 32,
    },
    cloud: {
      shape: "orbital",
      position: [-0.12, 0.06, -0.02],
      rotation: [-0.12, 0.26, -0.06],
      scale: 1.06,
      pointSize: 0.0158,
      noise: 0.032,
      intensity: 0.2,
      opacity: 0.28,
    },
  },
  {
    key: "contact",
    range: [0.962, 1],
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
];
