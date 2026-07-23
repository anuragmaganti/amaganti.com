import { expect, test } from "@playwright/test";

import { portfolioSections } from "../config/sections";
import {
  createSampledScene,
  createSceneTimeline,
  createSceneTimelineFromSections,
  sampleSceneProgress,
} from "../lib/scene-timeline";

test.describe("scene engine contract", () => {
  test("derives a continuous timeline from the section registry", () => {
    const timeline = createSceneTimeline();

    expect(timeline.phases[0].range[0]).toBe(0);
    expect(timeline.phases.at(-1)?.range[1]).toBe(1);
    expect(Object.keys(timeline.sectionRanges)).toEqual(
      portfolioSections.map((section) => section.id),
    );

    for (let index = 1; index < timeline.phases.length; index += 1) {
      const previous = timeline.phases[index - 1];
      const current = timeline.phases[index];

      expect(current.range[0]).toBe(previous.range[1]);
      expect(current.range[1]).toBeGreaterThanOrEqual(current.range[0]);
    }
  });

  test("reuses one sampled frame while traversing in either direction", () => {
    const phases = createSceneTimeline().phases;
    const phaseIndexRef = { current: 0 };
    const sample = createSampledScene(phases);
    const cameraPosition = sample.camera.position;
    const cameraTarget = sample.camera.target;
    const cloudPosition = sample.cloud.position;
    const cloudRotation = sample.cloud.rotation;

    for (const progress of [0, 0.38, 0.92, 0.61, 0.12, 1]) {
      expect(
        sampleSceneProgress(progress, phases, phaseIndexRef, sample),
      ).toBe(sample);
      expect(sample.camera.position).toBe(cameraPosition);
      expect(sample.camera.target).toBe(cameraTarget);
      expect(sample.cloud.position).toBe(cloudPosition);
      expect(sample.cloud.rotation).toBe(cloudRotation);
      expect(sample.mix).toBeGreaterThanOrEqual(0);
      expect(sample.mix).toBeLessThanOrEqual(1);
    }
  });

  test("holds the preceding particle scene across a beatless section", () => {
    const intro = portfolioSections[0];
    const about = portfolioSections[1];
    const timeline = createSceneTimelineFromSections(
      [intro, { id: "static-copy", sceneBeats: [] }, about],
      {
        intro: [0, 0.25],
        "static-copy": [0.25, 0.75],
        "about-stage": [0.75, 1],
      },
    );
    const phaseIndexRef = { current: 0 };
    const sample = createSampledScene(timeline.phases);

    sampleSceneProgress(0.5, timeline.phases, phaseIndexRef, sample);

    expect(sample.current.key).toBe("section:static-copy:hold:start");
    expect(sample.next.key).toBe("section:static-copy:hold:end");
    expect(sample.current.cloud.shape).toBe("face");
    expect(sample.next.cloud.shape).toBe("face");
  });
});
