import type { PointCloudTextTargetId } from "@/config/visual";
import type { ProjectFieldPresetId } from "@/lib/project-field-presets";

export type PointCloudShape = "face" | "text" | "project-field" | "settle";
export type SceneViewportFrame = "preserve" | "authored";
export type SceneTransitionEasing = "smooth" | "direct";

export type PointCloudTargetId =
  | "face"
  | "settle"
  | PointCloudTextTargetId
  | ProjectFieldPresetId;

export type SceneCameraState = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export type SceneCloudState = {
  shape: PointCloudShape;
  textTargetId?: PointCloudTextTargetId;
  projectFieldPresetId?: ProjectFieldPresetId;
  viewportFrame: SceneViewportFrame;
  obstacleRepulsion: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  pointSize: number;
  noise: number;
  intensity: number;
  opacity: number;
};

export type ScenePreset = {
  camera: SceneCameraState;
  cloud: SceneCloudState;
};

export type ScenePhase = ScenePreset & {
  key: string;
  range: [number, number];
  transitionEasing: SceneTransitionEasing;
};

export type SceneTimeline = {
  sectionRanges: Record<string, [number, number]>;
  phases: ScenePhase[];
};

export type SampledScene = ScenePreset & {
  current: ScenePhase;
  next: ScenePhase;
  mix: number;
};
