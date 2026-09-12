"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  particleTextTargets,
  particleVisualConfig,
} from "@/config/visual";
import { useIntroCopyFrame } from "@/hooks/use-intro-copy-frame";
import { useOutroContactFrame } from "@/hooks/use-outro-contact-frame";
import { usePointCloudSource } from "@/hooks/use-point-cloud-source";
import {
  useIsDarkTheme,
  usePointCloudQualityProfile,
  useScenePixelRatio,
  type PointCloudQualityProfile,
} from "@/hooks/use-scene-environment";
import { useTypographyVersion } from "@/hooks/use-typography-version";
import { createGpuParticleRuntime } from "@/lib/gpu-particles/runtime";
import {
  applyParticleObstacleFlow,
  createParticleObstacleFlowState,
  createParticleObstacleResources,
  resolveParticleObstacleFrame,
} from "@/lib/particle-obstacle-field";
import {
  createParticleSeeds,
  createParticleState,
  sampleParticlePosition,
} from "@/lib/particle-motion";
import {
  applyPointerParticleInteraction,
  createPointerParticleFlowState,
  createPointerParticleInteractionResources,
  getFaceTrackingWeight,
  resolvePointerParticleInteractionFrame,
  updatePointerState,
} from "@/lib/pointer-particle-interaction";
import {
  createMorphTargets,
  resolveMorphTargetId,
} from "@/lib/point-cloud-targets";
import {
  createCompactScenePhases,
  createSampledScene,
  getProjectCardPhaseWeight,
  sampleSceneProgress,
} from "@/lib/scene-timeline";
import {
  createSceneDiagnostics,
  exposeSceneDiagnostics,
  updateSceneDiagnostics,
} from "@/lib/scene-diagnostics";
import type {
  PointCloudTargetId,
  ScenePhase,
  SceneTimeline,
} from "@/lib/scene-types";
import {
  applyViewportCloudLayout,
  createCloudLayoutResources,
  createPositionBounds,
} from "@/lib/viewport-cloud-layout";
import {
  getParticleObstacleSnapshot,
  subscribeParticleObstacle,
  type ParticleObstacleSnapshot,
} from "@/lib/particle-obstacle-store";
import {
  registerSceneFrameTask,
  SCENE_FRAME_PRIORITY,
} from "@/lib/scene-frame-scheduler";
import { usePointerParticleEvents } from "@/hooks/use-pointer-particle-events";

type SceneCanvasProps = {
  progress: MotionValue<number>;
  timeline: SceneTimeline;
};

type PointCloudSystemProps = {
  basePositions: Float32Array;
  progress: MotionValue<number>;
  reducedMotion: boolean;
  isDarkTheme: boolean;
  profile: PointCloudQualityProfile;
  phases: ScenePhase[];
};

type ParticleBackendPreference = "auto" | "cpu" | "gpu";

declare global {
  interface Window {
    __portfolioParticleBackendPreference?: ParticleBackendPreference;
  }
}

export function SceneCanvas({ progress, timeline }: SceneCanvasProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const isDarkTheme = useIsDarkTheme();
  const scenePixelRatio = useScenePixelRatio();
  const profile = usePointCloudQualityProfile(reducedMotion);
  const basePositions = usePointCloudSource(
    particleVisualConfig.density.maxPoints,
  );

  return (
    <Canvas
      dpr={scenePixelRatio}
      camera={{ position: [0, 0, 4.9], fov: 30 }}
      frameloop="demand"
      // This canvas is fixed; scrolling cannot change its bounds.
      resize={{ scroll: false, debounce: { resize: 0, scroll: 0 } }}
      gl={{
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: "high-performance",
        stencil: false,
      }}
      performance={{ min: 0.55 }}
    >
      <PointCloudSystem
        basePositions={basePositions}
        progress={progress}
        reducedMotion={reducedMotion}
        isDarkTheme={isDarkTheme}
        profile={profile}
        phases={timeline.phases}
      />
    </Canvas>
  );
}

function PointCloudSystem({
  basePositions,
  progress,
  reducedMotion,
  isDarkTheme,
  profile,
  phases,
}: PointCloudSystemProps) {
  const invalidate = useThree((state) => state.invalidate);
  const renderer = useThree((state) => state.gl);
  const backendPreference = useMemo<ParticleBackendPreference>(
    () =>
      typeof window === "undefined"
        ? "auto"
        : (window.__portfolioParticleBackendPreference ?? "auto"),
    [],
  );
  const pointCount = Math.floor(basePositions.length / 3);
  const typographyDescriptors = useMemo(
    () =>
      Object.values(particleTextTargets).map(
        (target) => `${target.fontWeight} 220px "${target.fontFamily}"`,
      ),
    [],
  );
  const typographyVersion = useTypographyVersion(typographyDescriptors);
  const seeds = useMemo(() => createParticleSeeds(pointCount), [pointCount]);
  const morphTargets = useMemo(() => {
    void typographyVersion;

    return createMorphTargets(basePositions, {
      textTargets: Object.values(particleTextTargets),
      haloDensityMultiplier: profile.textHaloMultiplier,
    });
  }, [
    basePositions,
    profile.textHaloMultiplier,
    typographyVersion,
  ]);
  const morphTargetBounds = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(morphTargets).map(([id, positions]) => [
          id,
          createPositionBounds(positions),
        ]),
      ) as Record<PointCloudTargetId, THREE.Box3>,
    [morphTargets],
  );
  const gpuRuntime = useMemo(
    () =>
      backendPreference === "cpu"
        ? null
        : createGpuParticleRuntime({
            renderer,
            basePositions,
            morphTargets,
            seeds,
            allowSoftwareRenderer: backendPreference === "gpu",
          }),
    [backendPreference, basePositions, morphTargets, renderer, seeds],
  );
  const usingGpu = gpuRuntime !== null;
  const cpuRuntime = useMemo(
    () => usingGpu ? null : createCpuParticleResources(pointCount),
    [pointCount, usingGpu],
  );
  const { geometry, material: cloudMaterial } = (gpuRuntime ?? cpuRuntime)!;
  const cloud = useMemo(() => {
    const points = new THREE.Points(geometry, cloudMaterial);
    points.frustumCulled = false;
    return points;
  }, [cloudMaterial, geometry]);
  const cameraTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const desiredCamera = useMemo(() => new THREE.Vector3(0, 0, 4.9), []);
  const pointerTarget = useMemo(() => new THREE.Vector2(0, 0), []);
  const pointerCurrent = useMemo(() => new THREE.Vector2(0, 0), []);
  const pointerPresenceTarget = useRef(0);
  const pointerPresenceCurrent = useRef(0);
  const pointerInteractionResources = useMemo(
    () => createPointerParticleInteractionResources(),
    [],
  );
  const pointerParticleMotionActiveRef = useRef(false);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const interactionPlane = useMemo(() => new THREE.Plane(), []);
  const interactionPlaneNormal = useMemo(() => new THREE.Vector3(), []);
  const cloudWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const obstacleSnapshotRef = useRef<ParticleObstacleSnapshot>(
    getParticleObstacleSnapshot(),
  );
  const obstacleResources = useMemo(
    () => createParticleObstacleResources(),
    [],
  );
  const obstacleParticleMotionActiveRef = useRef(false);
  const gpuSettleTimeRef = useRef(0);
  const previousProgressRef = useRef(progress.get());
  const introCopyFrameRef = useIntroCopyFrame(invalidate);
  const outroContactFrameRef = useOutroContactFrame(invalidate);
  const layoutResources = useMemo(() => createCloudLayoutResources(), []);
  const elapsedTimeRef = useRef(0);
  const phaseIndexRef = useRef(0);
  const sceneSample = useMemo(() => createSampledScene(phases), [phases]);
  const compactPhases = useMemo(
    () => createCompactScenePhases(phases),
    [phases],
  );
  const particle = useMemo(() => createParticleState(), []);
  const diagnostics = useMemo(
    () =>
      process.env.NODE_ENV === "production" ? null : createSceneDiagnostics(),
    [],
  );

  usePointerParticleEvents({
    reducedMotion,
    pointerCurrent,
    pointerTarget,
    pointerPresenceTarget,
    resources: pointerInteractionResources,
    invalidate,
  });

  useEffect(() => {
    const unsubscribe = progress.on("change", () => {
      invalidate();
    });

    return () => {
      unsubscribe();
    };
  }, [invalidate, progress]);

  useEffect(() => {
    phaseIndexRef.current = 0;
    invalidate();
  }, [invalidate, phases]);

  useEffect(() => {
    invalidate();
  }, [invalidate, isDarkTheme]);

  useEffect(() => {
    if (cpuRuntime) {
      cpuRuntime.positions.set(morphTargets.face);
      cpuRuntime.geometry.attributes.position.needsUpdate = true;
    }
    invalidate();
  }, [cpuRuntime, invalidate, morphTargets]);

  useEffect(() => {
    const backend = gpuRuntime ? "gpu" : "cpu";
    renderer.domElement.dataset.particleBackend = backend;

    return () => {
      if (renderer.domElement.dataset.particleBackend === backend) {
        delete renderer.domElement.dataset.particleBackend;
      }
    };
  }, [gpuRuntime, renderer]);

  useEffect(() => {
    const invalidationTask = registerSceneFrameTask(() => {
      invalidate();
    }, { priority: SCENE_FRAME_PRIORITY.particleInvalidation });
    const unsubscribe = subscribeParticleObstacle(() => {
      invalidationTask.request();
    });

    return () => {
      unsubscribe();
      invalidationTask.dispose();
    };
  }, [invalidate]);

  useEffect(() => {
    if (!diagnostics) {
      return;
    }

    return exposeSceneDiagnostics(diagnostics);
  }, [diagnostics]);

  useEffect(() => {
    return () => {
      cpuRuntime?.geometry.dispose();
      cpuRuntime?.material.dispose();
    };
  }, [cpuRuntime]);

  useEffect(() => {
    return () => {
      gpuRuntime?.dispose();
    };
  }, [gpuRuntime]);

  useFrame(({ camera, size }, delta) => {
    const progressValue = progress.get();
    const compactViewport =
      size.width <= 900 || (size.width <= 1000 && size.height <= 500);
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const phaseState = sampleSceneProgress(
      progressValue,
      compactViewport ? compactPhases : phases,
      phaseIndexRef,
      sceneSample,
    );
    const currentTargetId = resolveMorphTargetId(phaseState.current.cloud);
    const nextTargetId = resolveMorphTargetId(phaseState.next.cloud);
    const shapeFrom = morphTargets[currentTargetId] ?? morphTargets.face;
    const shapeTo = morphTargets[nextTargetId] ?? morphTargets.face;
    const noise =
      phaseState.cloud.noise *
      profile.noiseMultiplier *
      particleVisualConfig.appearance.noiseScale;
    const blend = reducedMotion
      ? Math.min(phaseState.mix, 0.6)
      : phaseState.mix;
    elapsedTimeRef.current += delta;
    const pulse = reducedMotion
      ? 0.24
      : 0.34 +
        0.26 *
          Math.sin(progressValue * Math.PI * 6 + elapsedTimeRef.current * 0.2);
    updatePointerState(
      pointerCurrent,
      pointerTarget,
      pointerPresenceCurrent,
      pointerPresenceTarget.current,
      delta,
    );

    const trackingStrength =
      getFaceTrackingWeight(
        phaseState.current.cloud.shape,
        phaseState.next.cloud.shape,
        blend,
      ) * (reducedMotion ? 0.45 : 1);
    const pointerPitch =
      pointerCurrent.y *
      0.08 *
      trackingStrength *
      pointerPresenceCurrent.current;
    const pointerYaw =
      pointerCurrent.x *
      0.14 *
      trackingStrength *
      pointerPresenceCurrent.current;

    desiredCamera.set(...phaseState.camera.position);
    cameraTarget.set(...phaseState.camera.target);
    perspectiveCamera.position.copy(desiredCamera);
    perspectiveCamera.lookAt(cameraTarget);
    if (Math.abs(perspectiveCamera.fov - phaseState.camera.fov) > 0.0001) {
      perspectiveCamera.fov = phaseState.camera.fov;
      perspectiveCamera.updateProjectionMatrix();
    }
    perspectiveCamera.updateMatrixWorld();

    cloud.position.set(...phaseState.cloud.position);
    cloud.rotation.set(
      phaseState.cloud.rotation[0],
      phaseState.cloud.rotation[1],
      phaseState.cloud.rotation[2],
    );
    cloud.scale.setScalar(phaseState.cloud.scale);
    const layoutScaleMultiplier = applyViewportCloudLayout(
      cloud,
      perspectiveCamera,
      phaseState,
      blend,
      morphTargetBounds[currentTargetId],
      morphTargetBounds[nextTargetId],
      size.width,
      size.height,
      introCopyFrameRef.current,
      layoutResources,
      outroContactFrameRef.current,
    );
    const contactFrame = outroContactFrameRef.current;
    if (contactFrame && phaseState.current.key === "contact") {
      const bottom = (1 - layoutResources.currentFrame.minY) * size.height * 0.5 + 16;
      if (Math.abs(bottom - contactFrame.lastBottom) > 0.5) {
        contactFrame.element.style.setProperty("--outro-head-bottom", `${bottom}px`);
        contactFrame.lastBottom = bottom;
      }
    }
    cloud.rotation.x += pointerPitch;
    cloud.rotation.y += pointerYaw;
    cloud.updateMatrixWorld();

    cloudMaterial.size =
      phaseState.cloud.pointSize *
      layoutScaleMultiplier *
      particleVisualConfig.appearance.pointSizeScale;
    const projectCardPhaseWeight = getProjectCardPhaseWeight(
      phaseState.current.key,
      phaseState.next.key,
      phaseState.mix,
    );
    const themeOpacityMultiplier = isDarkTheme
      ? lerp(
          1,
          particleVisualConfig.appearance.darkProjectOpacityMultiplier,
          projectCardPhaseWeight,
        )
      : 1;
    cloudMaterial.opacity =
      phaseState.cloud.opacity * themeOpacityMultiplier;

    cloud.getWorldPosition(cloudWorldPosition);
    interactionPlaneNormal
      .copy(perspectiveCamera.position)
      .sub(cloudWorldPosition)
      .normalize();
    interactionPlane.setFromNormalAndCoplanarPoint(
      interactionPlaneNormal,
      cloudWorldPosition,
    );

    const obstacleFrame = resolveParticleObstacleFrame({
      obstacleFlow:
        phaseState.cloud.obstacleFlow *
        particleVisualConfig.interaction.cardFlowStrength,
      obstacleSnapshots: obstacleSnapshotRef.current,
      delta,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cloud,
      resources: obstacleResources,
    });
    const pointerInteractionFrame = resolvePointerParticleInteractionFrame({
      pointerPresence: pointerPresenceCurrent.current,
      pointerCurrent,
      currentShape: phaseState.current.cloud.shape,
      nextShape: phaseState.next.cloud.shape,
      blend,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cloud,
      viewportWidth: size.width,
      viewportHeight: size.height,
      hoverStrengthScale:
        particleVisualConfig.interaction.pointerFlowStrength,
      rippleStrengthScale:
        particleVisualConfig.interaction.pressureRippleStrength,
      delta,
      resources: pointerInteractionResources,
    });

    if (diagnostics) {
      updateSceneDiagnostics(
        diagnostics,
        phaseState.current.key,
        phaseState.next.key,
        phaseState.current.cloud.shape,
        phaseState.next.cloud.shape,
        phaseState.mix,
        pointerPresenceCurrent.current,
        pointerInteractionFrame.ripples.length,
        phaseState.cloud.obstacleFlow,
        obstacleFrame.fields,
      );
    }

    let obstacleParticleMotionActive = false;
    let pointerParticleMotionActive = false;
    let gpuParticleMotionActive = false;
    const progressChanged =
      Math.abs(progressValue - previousProgressRef.current) > 0.000001;
    previousProgressRef.current = progressValue;

    if (gpuRuntime) {
      gpuRuntime.update({
        currentTargetId,
        nextTargetId,
        blend,
        noise,
        intensity: phaseState.cloud.intensity,
        pulse,
        delta,
        obstacleFrame,
        pointerFrame: pointerInteractionFrame,
      });

      const pointerInputChanging =
        pointerCurrent.distanceToSquared(pointerTarget) > 0.00004 ||
        Math.abs(
          pointerPresenceCurrent.current - pointerPresenceTarget.current,
        ) > 0.00004 ||
        pointerInteractionFrame.unsettled ||
        pointerInteractionFrame.ripples.length > 0;
      const obstacleInputChanging =
        obstacleFrame.unsettled ||
        (progressChanged && obstacleFrame.fields.length > 0);

      if (pointerInputChanging || obstacleInputChanging) {
        gpuSettleTimeRef.current = 1.4;
      } else {
        gpuSettleTimeRef.current = Math.max(
          gpuSettleTimeRef.current - delta,
          0,
        );
      }
      gpuParticleMotionActive = gpuSettleTimeRef.current > 0;
    } else if (cpuRuntime) {
      const {
        positions: renderPositions,
        pointerFlowState,
        obstacleFlowState,
      } = cpuRuntime;
      const updateObstacleParticles =
        obstacleFrame.fields.length > 0 ||
        obstacleFrame.unsettled ||
        obstacleParticleMotionActiveRef.current;
      const updatePointerParticles =
        pointerInteractionFrame.hoverActive ||
        pointerInteractionFrame.ripples.length > 0 ||
        pointerInteractionFrame.unsettled ||
        pointerParticleMotionActiveRef.current;

      for (let index = 0; index < pointCount; index += 1) {
        const offset = index * 3;
        sampleParticlePosition(
          particle,
          index,
          offset,
          shapeFrom,
          shapeTo,
          blend,
          noise,
          phaseState.cloud.intensity,
          pulse,
          seeds,
        );

        if (updatePointerParticles) {
          const particleMotionActive = applyPointerParticleInteraction(
            particle,
            index,
            pointerInteractionFrame,
            pointerFlowState,
            delta,
          );
          pointerParticleMotionActive =
            particleMotionActive || pointerParticleMotionActive;
        }

        if (updateObstacleParticles) {
          const particleMotionActive = applyParticleObstacleFlow(
            particle,
            index,
            obstacleFrame.fields,
            obstacleFlowState,
            obstacleResources,
            delta,
          );
          obstacleParticleMotionActive =
            particleMotionActive || obstacleParticleMotionActive;
        }

        renderPositions[offset] = particle.x;
        renderPositions[offset + 1] = particle.y;
        renderPositions[offset + 2] = particle.z;
      }

      obstacleParticleMotionActiveRef.current = obstacleParticleMotionActive;
      pointerParticleMotionActiveRef.current = pointerParticleMotionActive;
      cpuRuntime.geometry.attributes.position.needsUpdate = true;
    }

    if (
      pointerCurrent.distanceToSquared(pointerTarget) > 0.00004 ||
      Math.abs(pointerPresenceCurrent.current - pointerPresenceTarget.current) >
        0.00004 ||
      pointerInteractionFrame.unsettled ||
      pointerInteractionFrame.ripples.length > 0 ||
      pointerParticleMotionActive ||
      obstacleFrame.unsettled ||
      obstacleParticleMotionActive ||
      gpuParticleMotionActive
    ) {
      invalidate();
    }
  });

  return <primitive object={cloud} />;
}

function createCpuParticleResources(pointCount: number) {
  const positions = new Float32Array(pointCount * 3);
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  geometry.computeBoundingSphere();

  return {
    positions,
    geometry,
    material: new THREE.PointsMaterial({
      color: new THREE.Color("#ffffff"),
      size: 0.018,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    pointerFlowState: createPointerParticleFlowState(pointCount),
    obstacleFlowState: createParticleObstacleFlowState(pointCount),
  };
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}
