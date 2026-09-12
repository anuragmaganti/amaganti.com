import { expect, test } from "@playwright/test";
import * as THREE from "three";

import { projects } from "../config/projects";
import {
  portfolioSections,
  sectionsAfterProjects,
  sectionsBeforeProjects,
} from "../config/sections";
import { parsePointCloudBuffer } from "../lib/point-cloud-asset";
import { resolveScenePixelRatio } from "../hooks/use-scene-environment";
import {
  applyViewportCloudLayout,
  createCloudLayoutResources,
} from "../lib/viewport-cloud-layout";
import {
  createCompactScenePhases,
  createSampledScene,
  createSceneTimeline,
  createSceneTimelineFromSections,
  getTimelineProgressPoint,
  sampleSceneProgress,
} from "../lib/scene-timeline";

test.describe("scene engine contract", () => {
  test("gives the compact About morph room after reading and joins Projects continuously", () => {
    const timeline = createSceneTimeline();
    const originalRanges = timeline.phases.map((phase) => [...phase.range]);
    const phases = createCompactScenePhases(timeline.phases);
    const originalAbout = timeline.phases.find((phase) => phase.key === "about-title")!;
    const reading = phases.find((phase) => phase.key === "about-reading")!;
    const morph = phases.find((phase) => phase.key === "about-title")!;
    const projects = phases.find((phase) => phase.key === "projects-hero")!;
    const previousCompressedDuration = (originalAbout.range[1] - originalAbout.range[0]) * 0.25;

    expect(reading.range[1]).toBe(getTimelineProgressPoint(timeline, "about-stage", 0.82));
    expect(morph.range[0]).toBe(reading.range[1]);
    expect(morph.range[1]).toBe(projects.range[0]);
    expect(morph.range[1] - morph.range[0]).toBeGreaterThan(previousCompressedDuration * 2);
    expect(timeline.phases.map((phase) => phase.range)).toEqual(originalRanges);

    for (let index = 1; index < phases.length; index += 1) {
      expect(phases[index].range[0]).toBe(phases[index - 1].range[1]);
    }

    const index = { current: 0 };
    const scene = createSampledScene(phases);
    const duration = morph.range[1] - morph.range[0];
    for (const fraction of [0.2, 0.5, 0.8, 0.5, 0.2]) {
      sampleSceneProgress(morph.range[0] + duration * fraction, phases, index, scene);
      expect(scene.current.key).toBe("about-title");
      expect(scene.next.key).toBe("projects-hero");
      expect(scene.mix).toBeCloseTo(fraction * fraction * (3 - 2 * fraction), 8);
    }

    for (const boundary of [reading.range[0], morph.range[0], morph.range[1]]) {
      sampleSceneProgress(boundary - 0.0000001, phases, index, scene);
      const before = [...scene.cloud.position, scene.cloud.scale, ...scene.camera.position];
      sampleSceneProgress(boundary + 0.0000001, phases, index, scene);
      const after = [...scene.cloud.position, scene.cloud.scale, ...scene.camera.position];
      after.forEach((value, offset) => expect(value).toBeCloseTo(before[offset], 6));
    }
  });

  test("reuses layout projections without changing morphs, resize, or copy placement", () => {
    const phases = createSceneTimeline().phases;
    const scene = createSampledScene(phases);
    const phaseIndex = { current: 0 };
    const resources = createCloudLayoutResources();
    const cloud = new THREE.Points();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const from = new THREE.Box3(
      new THREE.Vector3(-0.6, -0.9, -0.25),
      new THREE.Vector3(0.6, 0.9, 0.25),
    );
    const to = from.clone().expandByScalar(0.1);
    let projections = 0;
    const project = resources.corner.project.bind(resources.corner);
    resources.corner.project = (activeCamera) => {
      projections += 1;
      return project(activeCamera);
    };

    try {
      for (const [width, height] of [[1440, 900], [768, 900], [390, 844], [956, 440]]) {
        let intro = {
          left: 24, right: width * 0.45, top: 50, bottom: 200,
          centered: width <= 900,
        };
        let outro = { height: 108, bottomInset: 88 };
        for (const progress of [0, 0.02, 0.2, 0.5, 0.95, 1, 0.5, 0]) {
          sampleSceneProgress(progress, phases, phaseIndex, scene);
          camera.aspect = width / height;
          camera.fov = scene.camera.fov;
          camera.position.set(...scene.camera.position);
          camera.lookAt(new THREE.Vector3(...scene.camera.target));
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld();

          const layout = (layoutResources: ReturnType<typeof createCloudLayoutResources>) => {
            cloud.position.set(...scene.cloud.position);
            cloud.rotation.set(...scene.cloud.rotation);
            cloud.scale.setScalar(scene.cloud.scale);
            const scale = applyViewportCloudLayout(
              cloud, camera, scene, scene.mix, from, to, width, height,
              intro, layoutResources, outro,
            );
            cloud.updateMatrixWorld();
            return { scale, matrix: cloud.matrixWorld.toArray() };
          };

          expect(layout(resources)).toEqual(layout(createCloudLayoutResources()));
          const projectionCount = projections;
          cloud.rotation.x += 0.05;
          cloud.rotation.y -= 0.1;
          cloud.updateMatrixWorld();
          expect(layout(resources)).toEqual(layout(createCloudLayoutResources()));
          expect(projections).toBe(projectionCount);

          // New font measurements, contact rows, and morph bounds must all
          // invalidate the result, even at the exact same scroll position.
          intro = { ...intro, bottom: intro.bottom + 12 };
          expect(layout(resources)).toEqual(layout(createCloudLayoutResources()));
          outro = { ...outro, height: outro.height + 8 };
          expect(layout(resources)).toEqual(layout(createCloudLayoutResources()));
          to.max.y += 0.01;
          expect(layout(resources)).toEqual(layout(createCloudLayoutResources()));
          camera.position.x += 0.03;
          camera.updateMatrixWorld();
          expect(layout(resources)).toEqual(layout(createCloudLayoutResources()));
        }
      }
    } finally {
      cloud.geometry.dispose();
      (cloud.material as THREE.Material).dispose();
    }
  });

  test("generates project sections between the public insertion points", () => {
    expect(portfolioSections.map((section) => section.id)).toEqual([
      ...sectionsBeforeProjects.map((section) => section.id),
      ...projects.map((project) => project.slug),
      ...sectionsAfterProjects.map((section) => section.id),
    ]);

    for (const project of projects) {
      const section = portfolioSections.find(
        (candidate) => candidate.id === project.slug,
      );

      expect(section?.render).toEqual({
        type: "project-card",
        projectSlug: project.slug,
      });
    }
  });

  test("accepts only complete point-cloud XYZ triplets", () => {
    const validBuffer = new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 6);
    const source = new Float32Array(validBuffer);
    source.set([1, 2, 3, 4, 5, 6]);

    expect(Array.from(parsePointCloudBuffer(validBuffer))).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(() => parsePointCloudBuffer(new ArrayBuffer(0))).toThrow(
      "Float32 XYZ triplets",
    );
    expect(() =>
      parsePointCloudBuffer(new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT)),
    ).toThrow("Float32 XYZ triplets");
  });

  test("caps only high-density coarse-pointer scene rendering", () => {
    expect(resolveScenePixelRatio(3, true)).toBe(2);
    expect(resolveScenePixelRatio(2, true)).toBe(2);
    expect(resolveScenePixelRatio(1.5, true)).toBe(1.5);
    expect(resolveScenePixelRatio(3, false)).toBe(3);
    expect(resolveScenePixelRatio(Number.NaN, true)).toBe(1);
  });

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

  test("morphs continuously from the media field into the outro face", () => {
    const timeline = createSceneTimeline();
    const phaseIndexRef = { current: 0 };
    const sample = createSampledScene(timeline.phases);
    const checkpoints = [0.05, 0.3, 0.6].map((localProgress) => {
      const frame = sampleSceneProgress(
        getTimelineProgressPoint(timeline, "outro", localProgress),
        timeline.phases,
        phaseIndexRef,
        sample,
      );

      return {
        currentKey: frame.current.key,
        nextKey: frame.next.key,
        currentShape: frame.current.cloud.shape,
        nextShape: frame.next.cloud.shape,
        mix: frame.mix,
        scale: frame.cloud.scale,
        opacity: frame.cloud.opacity,
      };
    });

    for (const checkpoint of checkpoints) {
      expect(checkpoint.currentKey).toBe("media-shelves-to-contact");
      expect(checkpoint.nextKey).toBe("contact");
      expect(checkpoint.currentShape).toBe("project-field");
      expect(checkpoint.nextShape).toBe("face");
    }

    expect(checkpoints[0].mix).toBeLessThan(checkpoints[1].mix);
    expect(checkpoints[1].mix).toBeLessThan(checkpoints[2].mix);
    expect(checkpoints[0].scale).toBeGreaterThan(checkpoints[1].scale);
    expect(checkpoints[1].scale).toBeGreaterThan(checkpoints[2].scale);
    expect(checkpoints[0].opacity).toBeLessThan(checkpoints[1].opacity);
    expect(checkpoints[1].opacity).toBeLessThan(checkpoints[2].opacity);

    const settled = sampleSceneProgress(
      getTimelineProgressPoint(timeline, "outro", 0.8),
      timeline.phases,
      phaseIndexRef,
      sample,
    );
    expect(settled.cloud.shape).toBe("face");
  });
});
