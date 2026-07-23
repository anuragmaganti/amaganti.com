import { portfolioSections, type SectionId } from "@/config/sections";
import { scenePresets } from "@/config/scene-presets";
import type {
  SampledScene,
  ScenePhase,
  SceneTimeline,
} from "@/lib/scene-types";

export function createSceneTimeline(
  measuredRanges: Partial<Record<SectionId, [number, number]>> = {},
): SceneTimeline {
  const fallbackSize = 1 / portfolioSections.length;
  const sectionRanges: Record<string, [number, number]> = {};
  const phases: ScenePhase[] = [];

  portfolioSections.forEach((section, sectionIndex) => {
    const fallbackRange: [number, number] = [
      roundProgress(sectionIndex * fallbackSize),
      sectionIndex === portfolioSections.length - 1
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
        sectionIndex === portfolioSections.length - 1 &&
        beatIndex === section.sceneBeats.length - 1
          ? 1
          : getRangePoint(sectionRange, beatWeight / totalBeatWeight);
      const preset = scenePresets[beat.presetId];

      phases.push({
        key: beat.key,
        range: [beatStart, beatEnd],
        transitionEasing: beat.transitionEasing,
        camera: preset.camera,
        cloud: preset.cloud,
      });
    });
  });

  return { sectionRanges, phases };
}

export function getTimelineProgressPoint(
  timeline: SceneTimeline,
  sectionId: string,
  localProgress: number,
) {
  return getRangePoint(
    timeline.sectionRanges[sectionId],
    clamp(localProgress, 0, 1),
  );
}

export function sampleSceneProgress(
  progress: number,
  phases: ScenePhase[],
  phaseIndexRef: { current: number },
): SampledScene {
  const clampedProgress = clamp(progress, 0, 1);
  let activeIndex = clamp(phaseIndexRef.current, 0, phases.length - 1);

  while (
    activeIndex < phases.length - 1 &&
    clampedProgress > phases[activeIndex].range[1]
  ) {
    activeIndex += 1;
  }

  while (activeIndex > 0 && clampedProgress < phases[activeIndex].range[0]) {
    activeIndex -= 1;
  }

  phaseIndexRef.current = activeIndex;

  const current = phases[activeIndex];
  const next = phases[Math.min(activeIndex + 1, phases.length - 1)];
  const rangeSpan = Math.max(current.range[1] - current.range[0], 0.0001);
  const linearMix = (clampedProgress - current.range[0]) / rangeSpan;
  const clampedMix = clamp(linearMix, 0, 1);
  const mix =
    current.transitionEasing === "direct"
      ? directTransition(clampedMix)
      : smoothstep(clampedMix);

  return {
    current,
    next,
    mix,
    camera: {
      position: lerpVector3(current.camera.position, next.camera.position, mix),
      target: lerpVector3(current.camera.target, next.camera.target, mix),
      fov: lerp(current.camera.fov, next.camera.fov, mix),
    },
    cloud: {
      shape: chooseAtMidpoint(current.cloud.shape, next.cloud.shape, mix),
      viewportFrame: chooseAtMidpoint(
        current.cloud.viewportFrame,
        next.cloud.viewportFrame,
        mix,
      ),
      obstacleRepulsion: lerp(
        current.cloud.obstacleRepulsion,
        next.cloud.obstacleRepulsion,
        mix,
      ),
      textTargetId: chooseAtMidpoint(
        current.cloud.textTargetId,
        next.cloud.textTargetId,
        mix,
      ),
      projectFieldPresetId: chooseAtMidpoint(
        current.cloud.projectFieldPresetId,
        next.cloud.projectFieldPresetId,
        mix,
      ),
      position: lerpVector3(current.cloud.position, next.cloud.position, mix),
      rotation: lerpVector3(current.cloud.rotation, next.cloud.rotation, mix),
      scale: lerp(current.cloud.scale, next.cloud.scale, mix),
      pointSize: lerp(current.cloud.pointSize, next.cloud.pointSize, mix),
      noise: lerp(current.cloud.noise, next.cloud.noise, mix),
      intensity: lerp(current.cloud.intensity, next.cloud.intensity, mix),
      opacity: lerp(current.cloud.opacity, next.cloud.opacity, mix),
    },
  };
}

export function getProjectCardPhaseWeight(
  currentKey: string,
  nextKey: string,
  mix: number,
) {
  const currentWeight = currentKey.startsWith("project:") ? 1 : 0;
  const nextWeight = nextKey.startsWith("project:") ? 1 : 0;

  return lerp(currentWeight, nextWeight, mix);
}

function getRangePoint(range: [number, number], localProgress: number) {
  return roundProgress(range[0] + (range[1] - range[0]) * localProgress);
}

function roundProgress(value: number) {
  return Number(value.toFixed(6));
}

function directTransition(value: number) {
  return -1.25 * value ** 3 + 1.5 * value ** 2 + 0.75 * value;
}

function chooseAtMidpoint<Value>(current: Value, next: Value, mix: number) {
  return mix < 0.5 ? current : next;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function lerpVector3(
  start: [number, number, number],
  end: [number, number, number],
  progress: number,
): [number, number, number] {
  return [
    lerp(start[0], end[0], progress),
    lerp(start[1], end[1], progress),
    lerp(start[2], end[2], progress),
  ];
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
