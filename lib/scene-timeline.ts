import {
  portfolioSections,
  type SectionDefinition,
  type SectionId,
} from "@/config/sections";
import { scenePresets } from "@/config/scene-presets";
import type {
  SampledScene,
  ScenePhase,
  SceneTimeline,
} from "@/lib/scene-types";

export function createSceneTimeline(
  measuredRanges: Partial<Record<SectionId, [number, number]>> = {},
): SceneTimeline {
  return createSceneTimelineFromSections(portfolioSections, measuredRanges);
}

export function createSceneTimelineFromSections(
  sections: readonly Pick<SectionDefinition, "id" | "sceneBeats">[],
  measuredRanges: Partial<Record<string, [number, number]>> = {},
): SceneTimeline {
  if (!sections.length) {
    throw new Error("The scene timeline requires at least one section.");
  }

  const fallbackSize = 1 / sections.length;
  const sectionRanges: Record<string, [number, number]> = {};
  const phases: ScenePhase[] = [];

  sections.forEach((section, sectionIndex) => {
    const fallbackRange: [number, number] = [
      roundProgress(sectionIndex * fallbackSize),
      sectionIndex === sections.length - 1
        ? 1
        : roundProgress((sectionIndex + 1) * fallbackSize),
    ];
    const sectionRange = measuredRanges[section.id] ?? fallbackRange;
    sectionRanges[section.id] = sectionRange;

    if (!section.sceneBeats.length) {
      const previousPhase = phases.at(-1);

      if (!previousPhase) {
        throw new Error(
          `Section "${section.id}" has no scene beats and no prior scene to hold.`,
        );
      }

      const holdEnd = sectionIndex === sections.length - 1 ? 1 : sectionRange[1];
      const holdKey = `section:${section.id}:hold`;
      phases.push(
        {
          ...previousPhase,
          key: `${holdKey}:start`,
          range: [sectionRange[0], holdEnd],
        },
        {
          ...previousPhase,
          key: `${holdKey}:end`,
          range: [holdEnd, holdEnd],
        },
      );
      return;
    }

    for (const beat of section.sceneBeats) {
      if (!Number.isFinite(beat.durationWeight) || beat.durationWeight <= 0) {
        throw new Error(
          `Scene beat "${beat.key}" must have a positive duration weight.`,
        );
      }
    }

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
        sectionIndex === sections.length - 1 &&
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
  sample: SampledScene = createSampledScene(phases),
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

  sample.current = current;
  sample.next = next;
  sample.mix = mix;
  writeLerpedVector3(
    sample.camera.position,
    current.camera.position,
    next.camera.position,
    mix,
  );
  writeLerpedVector3(
    sample.camera.target,
    current.camera.target,
    next.camera.target,
    mix,
  );
  sample.camera.fov = lerp(current.camera.fov, next.camera.fov, mix);
  sample.cloud.shape = chooseAtMidpoint(
    current.cloud.shape,
    next.cloud.shape,
    mix,
  );
  sample.cloud.viewportFrame = chooseAtMidpoint(
    current.cloud.viewportFrame,
    next.cloud.viewportFrame,
    mix,
  );
  sample.cloud.obstacleFlow = lerp(
    current.cloud.obstacleFlow,
    next.cloud.obstacleFlow,
    mix,
  );
  sample.cloud.textTargetId = chooseAtMidpoint(
    current.cloud.textTargetId,
    next.cloud.textTargetId,
    mix,
  );
  sample.cloud.projectFieldPresetId = chooseAtMidpoint(
    current.cloud.projectFieldPresetId,
    next.cloud.projectFieldPresetId,
    mix,
  );
  writeLerpedVector3(
    sample.cloud.position,
    current.cloud.position,
    next.cloud.position,
    mix,
  );
  writeLerpedVector3(
    sample.cloud.rotation,
    current.cloud.rotation,
    next.cloud.rotation,
    mix,
  );
  sample.cloud.scale = lerp(current.cloud.scale, next.cloud.scale, mix);
  sample.cloud.pointSize = lerp(
    current.cloud.pointSize,
    next.cloud.pointSize,
    mix,
  );
  sample.cloud.noise = lerp(current.cloud.noise, next.cloud.noise, mix);
  sample.cloud.intensity = lerp(
    current.cloud.intensity,
    next.cloud.intensity,
    mix,
  );
  sample.cloud.opacity = lerp(current.cloud.opacity, next.cloud.opacity, mix);

  return sample;
}

export function createSampledScene(phases: ScenePhase[]): SampledScene {
  const initial = phases[0];

  if (!initial) {
    throw new Error("The scene timeline requires at least one phase.");
  }

  return {
    current: initial,
    next: initial,
    mix: 0,
    camera: {
      position: [...initial.camera.position],
      target: [...initial.camera.target],
      fov: initial.camera.fov,
    },
    cloud: {
      ...initial.cloud,
      position: [...initial.cloud.position],
      rotation: [...initial.cloud.rotation],
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

function writeLerpedVector3(
  output: [number, number, number],
  start: [number, number, number],
  end: [number, number, number],
  progress: number,
) {
  output[0] = lerp(start[0], end[0], progress);
  output[1] = lerp(start[1], end[1], progress);
  output[2] = lerp(start[2], end[2], progress);
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
