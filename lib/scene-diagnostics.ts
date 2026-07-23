import type { ObstacleExclusionRuntime } from "@/lib/particle-obstacle-field";
import type { PointCloudShape } from "@/lib/scene-types";

export type SceneDiagnostics = {
  frameCount: number;
  currentPhaseKey: string;
  nextPhaseKey: string;
  currentShape: PointCloudShape;
  nextShape: PointCloudShape;
  mix: number;
  pointerPresence: number;
  obstacleRepulsion: number;
  obstacleIds: string[];
  obstacleStrengths: number[];
};

declare global {
  interface Window {
    __portfolioSceneDiagnostics?: SceneDiagnostics;
  }
}

export function createSceneDiagnostics(): SceneDiagnostics {
  return {
    frameCount: 0,
    currentPhaseKey: "",
    nextPhaseKey: "",
    currentShape: "face",
    nextShape: "face",
    mix: 0,
    pointerPresence: 0,
    obstacleRepulsion: 0,
    obstacleIds: [],
    obstacleStrengths: [],
  };
}

export function exposeSceneDiagnostics(diagnostics: SceneDiagnostics) {
  window.__portfolioSceneDiagnostics = diagnostics;

  return () => {
    if (window.__portfolioSceneDiagnostics === diagnostics) {
      delete window.__portfolioSceneDiagnostics;
    }
  };
}

export function updateSceneDiagnostics(
  diagnostics: SceneDiagnostics,
  currentPhaseKey: string,
  nextPhaseKey: string,
  currentShape: PointCloudShape,
  nextShape: PointCloudShape,
  mix: number,
  pointerPresence: number,
  obstacleRepulsion: number,
  obstacleFields: ObstacleExclusionRuntime[],
) {
  diagnostics.frameCount += 1;
  diagnostics.currentPhaseKey = currentPhaseKey;
  diagnostics.nextPhaseKey = nextPhaseKey;
  diagnostics.currentShape = currentShape;
  diagnostics.nextShape = nextShape;
  diagnostics.mix = mix;
  diagnostics.pointerPresence = pointerPresence;
  diagnostics.obstacleRepulsion = obstacleRepulsion;
  diagnostics.obstacleIds.length = obstacleFields.length;
  diagnostics.obstacleStrengths.length = obstacleFields.length;

  for (let index = 0; index < obstacleFields.length; index += 1) {
    diagnostics.obstacleIds[index] = obstacleFields[index].id;
    diagnostics.obstacleStrengths[index] = obstacleFields[index].strength;
  }
}
