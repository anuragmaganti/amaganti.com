"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion";
import { useReducedMotion } from "motion/react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  particleTextTargets,
  particleVisualConfig,
  type PointCloudTextTargetId,
} from "@/config/visual";
import { usePointCloudSource } from "@/hooks/use-point-cloud-source";
import {
  applyObstacleExclusions,
  createObstacleExclusionResources,
  resolveObstacleExclusionFrame,
} from "@/lib/particle-obstacle-field";
import {
  createParticleSeeds,
  createParticleState,
  sampleParticlePosition,
} from "@/lib/particle-motion";
import {
  applyMouseRepulsion,
  createMouseRepulsionResources,
  getFaceTrackingWeight,
  resolveMouseRepulsionFrame,
  updatePointerState,
} from "@/lib/pointer-particle-interaction";
import { createMorphTargets } from "@/lib/point-cloud-targets";
import {
  getProjectCardPhaseWeight,
  sampleSceneProgress,
} from "@/lib/scene-timeline";
import type {
  PointCloudShape,
  PointCloudTargetId,
  SceneCloudState,
  ScenePhase,
  SceneTimeline,
} from "@/lib/scene-types";
import {
  applyViewportCloudLayout,
  createCloudLayoutResources,
  createPositionBounds,
  type IntroCopyFrame,
} from "@/lib/viewport-cloud-layout";
import {
  getParticleObstacleSnapshot,
  subscribeParticleObstacle,
  type ParticleObstacleSnapshot,
} from "@/lib/particle-obstacle-store";

type SceneCanvasProps = {
  progress: MotionValue<number>;
  timeline: SceneTimeline;
};

type QualityProfile = {
  noiseMultiplier: number;
  textHaloMultiplier: number;
};

type PointCloudSystemProps = {
  basePositions: Float32Array;
  progress: MotionValue<number>;
  reducedMotion: boolean;
  isDarkTheme: boolean;
  profile: QualityProfile;
  phases: ScenePhase[];
};

export function SceneCanvas({ progress, timeline }: SceneCanvasProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const isDarkTheme = useIsDarkTheme();
  const devicePixelRatio = useDevicePixelRatio();
  const profile = useQualityProfile(reducedMotion);
  const basePositions = usePointCloudSource(
    particleVisualConfig.density.maxPoints,
  );

  return (
    <Canvas
      dpr={devicePixelRatio}
      camera={{ position: [0, 0, 4.9], fov: 30 }}
      frameloop="demand"
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
  const pointCount = Math.floor(basePositions.length / 3);
  const renderPositions = useMemo(
    () => new Float32Array(basePositions.length),
    [basePositions.length],
  );
  const typographyDescriptors = useMemo(
    () =>
      Object.values(particleTextTargets).map(
        (target) => `${target.fontWeight} 220px "${target.fontFamily}"`,
      ),
    [],
  );
  const typographyVersion = useTypographyVersion(typographyDescriptors);
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry();
    const attribute = new THREE.BufferAttribute(renderPositions, 3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    nextGeometry.setAttribute("position", attribute);
    nextGeometry.computeBoundingSphere();
    return nextGeometry;
  }, [renderPositions]);
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
  const cloudMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color("#ffffff"),
        size: 0.018,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
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
  const mouseRepulsionResources = useMemo(
    () => createMouseRepulsionResources(),
    [],
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const interactionPlane = useMemo(() => new THREE.Plane(), []);
  const interactionPlaneNormal = useMemo(() => new THREE.Vector3(), []);
  const cloudWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const obstacleSnapshotRef = useRef<ParticleObstacleSnapshot>(
    getParticleObstacleSnapshot(),
  );
  const obstacleResources = useMemo(
    () => createObstacleExclusionResources(),
    [],
  );
  const introCopyFrameRef = useIntroCopyFrame(invalidate);
  const layoutResources = useMemo(() => createCloudLayoutResources(), []);
  const elapsedTimeRef = useRef(0);
  const phaseIndexRef = useRef(0);
  const particle = useMemo(() => createParticleState(), []);

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
    renderPositions.set(morphTargets.face);
    geometry.attributes.position.needsUpdate = true;
    invalidate();
  }, [geometry, invalidate, morphTargets, renderPositions]);

  useEffect(() => {
    const unsubscribe = subscribeParticleObstacle(() => {
      obstacleSnapshotRef.current = getParticleObstacleSnapshot();
      invalidate();
    });

    return () => {
      unsubscribe();
    };
  }, [invalidate]);

  useEffect(() => {
    if (reducedMotion || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointerTarget.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      );
      pointerPresenceTarget.current = 1;
      invalidate();
    };
    const resetPointer = () => {
      pointerTarget.set(0, 0);
      pointerPresenceTarget.current = 0;
      invalidate();
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerleave", resetPointer);
    window.addEventListener("blur", resetPointer);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", resetPointer);
      window.removeEventListener("blur", resetPointer);
    };
  }, [invalidate, pointerTarget, reducedMotion]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      cloudMaterial.dispose();
    };
  }, [cloudMaterial, geometry]);

  useFrame(({ camera, size }, delta) => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const phaseState = sampleSceneProgress(
      progress.get(),
      phases,
      phaseIndexRef,
    );
    const shapeFrom =
      morphTargets[resolveMorphTargetId(phaseState.current.cloud)] ??
      morphTargets.face;
    const shapeTo =
      morphTargets[resolveMorphTargetId(phaseState.next.cloud)] ??
      morphTargets.face;
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
          Math.sin(progress.get() * Math.PI * 6 + elapsedTimeRef.current * 0.2);
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
    const pointerPitch = pointerCurrent.y * 0.08 * trackingStrength;
    const pointerYaw = pointerCurrent.x * 0.14 * trackingStrength;

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
      morphTargetBounds[resolveMorphTargetId(phaseState.current.cloud)],
      morphTargetBounds[resolveMorphTargetId(phaseState.next.cloud)],
      size.width,
      size.height,
      introCopyFrameRef.current,
      layoutResources,
    );
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

    cloud.updateMatrixWorld();
    cloud.getWorldPosition(cloudWorldPosition);
    interactionPlaneNormal
      .copy(perspectiveCamera.position)
      .sub(cloudWorldPosition)
      .normalize();
    interactionPlane.setFromNormalAndCoplanarPoint(
      interactionPlaneNormal,
      cloudWorldPosition,
    );

    const obstacleExclusionFrame = resolveObstacleExclusionFrame({
      obstacleRepulsion:
        phaseState.cloud.obstacleRepulsion *
        particleVisualConfig.interaction.cardRepulsionStrength,
      obstacleSnapshots: obstacleSnapshotRef.current,
      delta,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cloud,
      resources: obstacleResources,
    });
    const mouseRepulsionState = resolveMouseRepulsionFrame({
      pointerPresence: pointerPresenceCurrent.current,
      pointerCurrent,
      currentShape: phaseState.current.cloud.shape,
      nextShape: phaseState.next.cloud.shape,
      blend,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cloud,
      resources: mouseRepulsionResources,
    });
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

      if (mouseRepulsionState.active) {
        applyMouseRepulsion(
          particle,
          mouseRepulsionState.localPoint,
          mouseRepulsionState.strength *
            particleVisualConfig.interaction.pointerRepulsionStrength,
        );
      }

      if (obstacleExclusionFrame.fields.length) {
        applyObstacleExclusions(
          particle,
          obstacleExclusionFrame.fields,
          obstacleResources,
        );
      }

      renderPositions[offset] = particle.x;
      renderPositions[offset + 1] = particle.y;
      renderPositions[offset + 2] = particle.z;
    }

    geometry.attributes.position.needsUpdate = true;

    if (
      pointerCurrent.distanceToSquared(pointerTarget) > 0.00004 ||
      Math.abs(pointerPresenceCurrent.current - pointerPresenceTarget.current) >
        0.00004 ||
      obstacleExclusionFrame.unsettled
    ) {
      invalidate();
    }
  });

  return <primitive object={cloud} />;
}

function useIntroCopyFrame(invalidate: () => void) {
  const frameRef = useRef<IntroCopyFrame | null>(null);

  useEffect(() => {
    let frameId = 0;
    const resizeObserver = new ResizeObserver(() => scheduleSync());
    const mutationObserver = new MutationObserver(() => scheduleSync());

    const syncFrame = () => {
      frameId = 0;
      const stage = document.querySelector<HTMLElement>(".intro-stage");
      const copy = stage?.querySelector<HTMLElement>(".intro-copy");
      const shell = copy?.closest<HTMLElement>(".intro-copy-shell");
      const copyBlocks = copy
        ? Array.from(copy.querySelectorAll<HTMLElement>(".intro-copy-block"))
        : [];

      if (!stage || !copy || !shell || !copyBlocks.length) {
        frameRef.current = null;
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const blockRects = copyBlocks.map((block) => block.getBoundingClientRect());
      const visualLeft = Math.min(...blockRects.map((rect) => rect.left));
      const visualRight = Math.max(...blockRects.map((rect) => rect.right));
      const visualTop = Math.min(...blockRects.map((rect) => rect.top));
      const visualBottom = Math.max(...blockRects.map((rect) => rect.bottom));
      const shellLayoutLeft = stageRect.left + shell.offsetLeft;
      const shellLayoutTop = stageRect.top + shell.offsetTop;
      const left = visualLeft + shellLayoutLeft - shellRect.left;
      const right = visualRight + shellLayoutLeft - shellRect.left;
      const top = visualTop + shellLayoutTop - shellRect.top;
      const bottom = visualBottom + shellLayoutTop - shellRect.top;

      frameRef.current = {
        left,
        right,
        top,
        bottom,
        centered: getComputedStyle(copy).textAlign === "center",
      };
      resizeObserver.observe(stage);
      resizeObserver.observe(copy);
      copyBlocks.forEach((block) => resizeObserver.observe(block));
      invalidate();
    };
    const scheduleSync = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(syncFrame);
    };

    scheduleSync();
    window.addEventListener("resize", scheduleSync, { passive: true });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleSync);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [invalidate]);

  return frameRef;
}

function useQualityProfile(reducedMotion: boolean) {
  return useMemo<QualityProfile>(
    () =>
      reducedMotion
        ? particleVisualConfig.quality.reducedMotion
        : particleVisualConfig.quality.standard,
    [reducedMotion],
  );
}

function useIsDarkTheme() {
  const [isDarkTheme, setIsDarkTheme] = useState(
    () =>
      typeof document === "undefined" ||
      document.documentElement.dataset.theme !== "light",
  );

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      setIsDarkTheme(root.dataset.theme !== "light");
    };
    const observer = new MutationObserver(syncTheme);

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    syncTheme();

    return () => {
      observer.disconnect();
    };
  }, []);

  return isDarkTheme;
}

function useDevicePixelRatio() {
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);

  useEffect(() => {
    let resolutionQuery: MediaQueryList | null = null;

    const updateDevicePixelRatio = () => {
      const nextDevicePixelRatio = window.devicePixelRatio || 1;

      setDevicePixelRatio((currentDevicePixelRatio) =>
        currentDevicePixelRatio === nextDevicePixelRatio
          ? currentDevicePixelRatio
          : nextDevicePixelRatio,
      );

      resolutionQuery?.removeEventListener(
        "change",
        updateDevicePixelRatio,
      );
      resolutionQuery = window.matchMedia(
        `(resolution: ${nextDevicePixelRatio}dppx)`,
      );
      resolutionQuery.addEventListener("change", updateDevicePixelRatio);
    };

    updateDevicePixelRatio();
    window.addEventListener("resize", updateDevicePixelRatio, {
      passive: true,
    });

    return () => {
      window.removeEventListener("resize", updateDevicePixelRatio);
      resolutionQuery?.removeEventListener(
        "change",
        updateDevicePixelRatio,
      );
    };
  }, []);

  return devicePixelRatio;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function resolveMorphTargetId(cloud: {
  shape: PointCloudShape;
  textTargetId?: PointCloudTextTargetId;
  projectFieldPresetId?: SceneCloudState["projectFieldPresetId"];
}): PointCloudTargetId {
  if (cloud.shape === "text" && cloud.textTargetId) {
    return cloud.textTargetId;
  }

  if (cloud.shape === "project-field" && cloud.projectFieldPresetId) {
    return cloud.projectFieldPresetId;
  }

  return cloud.shape === "text" || cloud.shape === "project-field"
    ? "settle"
    : cloud.shape;
}

function useTypographyVersion(fontDescriptor: string | string[]) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) {
      return;
    }

    let cancelled = false;
    const descriptors = Array.isArray(fontDescriptor)
      ? fontDescriptor
      : [fontDescriptor];

    if (descriptors.every((descriptor) => document.fonts.check(descriptor))) {
      return;
    }

    Promise.all([
      ...descriptors.map((descriptor) =>
        document.fonts.load(descriptor).catch(() => undefined),
      ),
      document.fonts.ready.catch(() => undefined),
    ]).then(() => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setVersion((current) => current + 1);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [fontDescriptor]);

  return version;
}
