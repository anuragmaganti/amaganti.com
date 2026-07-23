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
  getParticleObstacleSnapshot,
  subscribeParticleObstacle,
  type ParticleObstacleSnapshot,
} from "@/lib/particle-obstacle-store";

const REFERENCE_VIEWPORT_ASPECT = 1440 / 900;
const MIN_LAYOUT_SCALE = 0.2;

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

type ScreenFrame = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

type IntroCopyFrame = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centered: boolean;
};

type CloudLayoutResources = {
  bounds: THREE.Box3;
  boundsCenter: THREE.Vector3;
  corner: THREE.Vector3;
  currentFrame: ScreenFrame;
  referenceFrame: ScreenFrame;
  currentFramePoint: THREE.Vector3;
  targetFramePoint: THREE.Vector3;
  referenceCamera: THREE.PerspectiveCamera;
  referenceCameraTarget: THREE.Vector3;
  referenceCloud: THREE.Object3D;
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
  const layoutResources = useMemo<CloudLayoutResources>(
    () => ({
      bounds: new THREE.Box3(),
      boundsCenter: new THREE.Vector3(),
      corner: new THREE.Vector3(),
      currentFrame: createScreenFrame(),
      referenceFrame: createScreenFrame(),
      currentFramePoint: new THREE.Vector3(),
      targetFramePoint: new THREE.Vector3(),
      referenceCamera: new THREE.PerspectiveCamera(),
      referenceCameraTarget: new THREE.Vector3(),
      referenceCloud: new THREE.Object3D(),
    }),
    [],
  );
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

function createPositionBounds(positions: Float32Array) {
  const bounds = new THREE.Box3();

  if (!positions.length) {
    return bounds.setFromCenterAndSize(
      new THREE.Vector3(),
      new THREE.Vector3(0.001, 0.001, 0.001),
    );
  }

  bounds.min.set(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  );
  bounds.max.set(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  );

  for (let index = 0; index < positions.length; index += 3) {
    bounds.min.x = Math.min(bounds.min.x, positions[index]);
    bounds.min.y = Math.min(bounds.min.y, positions[index + 1]);
    bounds.min.z = Math.min(bounds.min.z, positions[index + 2]);
    bounds.max.x = Math.max(bounds.max.x, positions[index]);
    bounds.max.y = Math.max(bounds.max.y, positions[index + 1]);
    bounds.max.z = Math.max(bounds.max.z, positions[index + 2]);
  }

  return bounds;
}

function createScreenFrame(): ScreenFrame {
  return {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0,
  };
}

function applyViewportCloudLayout(
  cloud: THREE.Points,
  camera: THREE.PerspectiveCamera,
  phaseState: ReturnType<typeof sampleSceneProgress>,
  blend: number,
  boundsFrom: THREE.Box3,
  boundsTo: THREE.Box3,
  viewportWidth: number,
  viewportHeight: number,
  introCopyFrame: IntroCopyFrame | null,
  resources: CloudLayoutResources,
) {
  const frameWeight = lerp(
    getViewportFrameWeight(phaseState.current.cloud.viewportFrame),
    getViewportFrameWeight(phaseState.next.cloud.viewportFrame),
    blend,
  );

  // Authored fields must not be reframed or their morph and obstacle geometry
  // no longer share the coordinate system used by the project presets.
  if (frameWeight <= 0.001) {
    return 1;
  }

  resources.bounds.min.lerpVectors(boundsFrom.min, boundsTo.min, blend);
  resources.bounds.max.lerpVectors(boundsFrom.max, boundsTo.max, blend);

  configureReferenceCamera(
    resources.referenceCamera,
    phaseState.camera,
    resources.referenceCameraTarget,
  );
  resources.referenceCloud.position.set(...phaseState.cloud.position);
  resources.referenceCloud.rotation.set(...phaseState.cloud.rotation);
  resources.referenceCloud.scale.setScalar(phaseState.cloud.scale);
  resources.referenceCloud.updateMatrixWorld(true);
  projectBoundsToScreenFrame(
    resources.bounds,
    resources.referenceCloud,
    resources.referenceCamera,
    resources.corner,
    resources.referenceFrame,
  );

  cloud.updateMatrixWorld();
  projectBoundsToScreenFrame(
    resources.bounds,
    cloud,
    camera,
    resources.corner,
    resources.currentFrame,
  );

  const preservedFrameScale = clamp(
    Math.min(
      resources.referenceFrame.width /
        Math.max(resources.currentFrame.width, 0.0001),
      resources.referenceFrame.height /
        Math.max(resources.currentFrame.height, 0.0001),
    ),
    MIN_LAYOUT_SCALE,
    1,
  );
  let layoutScale = lerp(1, preservedFrameScale, frameWeight);

  cloud.scale.multiplyScalar(layoutScale);
  cloud.updateMatrixWorld();
  projectBoundsToScreenFrame(
    resources.bounds,
    cloud,
    camera,
    resources.corner,
    resources.currentFrame,
  );

  const introPhaseWeight = lerp(
    phaseState.current.key === "intro" ? 1 : 0,
    phaseState.next.key === "intro" ? 1 : 0,
    blend,
  );
  let targetCenterX = lerp(
    resources.currentFrame.centerX,
    resources.referenceFrame.centerX,
    frameWeight,
  );
  let targetCenterY = lerp(
    resources.currentFrame.centerY,
    resources.referenceFrame.centerY,
    frameWeight,
  );

  if (introCopyFrame && introPhaseWeight > 0.001) {
    const frameMargin = clamp(viewportWidth * 0.025, 16, 32);
    const copyGap = clamp(viewportWidth * 0.03, 18, 36);
    const safeLeft = introCopyFrame.centered
      ? frameMargin
      : introCopyFrame.right + copyGap;
    const safeRight = viewportWidth - frameMargin;
    const safeTop = introCopyFrame.centered
      ? introCopyFrame.bottom + copyGap
      : frameMargin;
    const safeBottom = viewportHeight - Math.max(frameMargin, 52);
    const safeWidth = Math.max(safeRight - safeLeft, 1);
    const safeHeight = Math.max(safeBottom - safeTop, 1);
    const currentWidth = resources.currentFrame.width * viewportWidth * 0.5;
    const currentHeight = resources.currentFrame.height * viewportHeight * 0.5;
    const needsIntroFrame =
      introCopyFrame.centered || safeWidth < currentWidth * 0.88;

    if (needsIntroFrame) {
      const introFitScale = clamp(
        Math.min(1, safeWidth / currentWidth, safeHeight / currentHeight),
        MIN_LAYOUT_SCALE,
        1,
      );
      const weightedIntroScale = lerp(1, introFitScale, introPhaseWeight);
      cloud.scale.multiplyScalar(weightedIntroScale);
      layoutScale *= weightedIntroScale;
      cloud.updateMatrixWorld();
      projectBoundsToScreenFrame(
        resources.bounds,
        cloud,
        camera,
        resources.corner,
        resources.currentFrame,
      );

      const safeMinX = (safeLeft / viewportWidth) * 2 - 1;
      const safeMaxX = (safeRight / viewportWidth) * 2 - 1;
      const safeMinY = 1 - (safeBottom / viewportHeight) * 2;
      const safeMaxY = 1 - (safeTop / viewportHeight) * 2;
      const safeCenterX = introCopyFrame.centered
        ? (safeMinX + safeMaxX) * 0.5
        : clamp(
            resources.referenceFrame.centerX,
            safeMinX + resources.currentFrame.width * 0.5,
            safeMaxX - resources.currentFrame.width * 0.5,
          );
      const safeCenterY = introCopyFrame.centered
        ? (safeMinY + safeMaxY) * 0.5
        : clamp(
            resources.referenceFrame.centerY,
            safeMinY + resources.currentFrame.height * 0.5,
            safeMaxY - resources.currentFrame.height * 0.5,
          );
      targetCenterX = lerp(targetCenterX, safeCenterX, introPhaseWeight);
      targetCenterY = lerp(targetCenterY, safeCenterY, introPhaseWeight);
    }
  }

  resources.bounds.getCenter(resources.boundsCenter);
  resources.boundsCenter.applyMatrix4(cloud.matrixWorld).project(camera);
  resources.currentFramePoint
    .set(
      resources.currentFrame.centerX,
      resources.currentFrame.centerY,
      resources.boundsCenter.z,
    )
    .unproject(camera);
  resources.targetFramePoint
    .set(targetCenterX, targetCenterY, resources.boundsCenter.z)
    .unproject(camera)
    .sub(resources.currentFramePoint);
  cloud.position.add(resources.targetFramePoint);
  cloud.updateMatrixWorld();

  return layoutScale;
}

function configureReferenceCamera(
  camera: THREE.PerspectiveCamera,
  state: ReturnType<typeof sampleSceneProgress>["camera"],
  target: THREE.Vector3,
) {
  camera.position.set(...state.position);
  target.set(...state.target);
  camera.fov = state.fov;
  camera.aspect = REFERENCE_VIEWPORT_ASPECT;
  camera.near = 0.1;
  camera.far = 100;
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

function projectBoundsToScreenFrame(
  bounds: THREE.Box3,
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  corner: THREE.Vector3,
  frame: ScreenFrame,
) {
  frame.minX = Number.POSITIVE_INFINITY;
  frame.maxX = Number.NEGATIVE_INFINITY;
  frame.minY = Number.POSITIVE_INFINITY;
  frame.maxY = Number.NEGATIVE_INFINITY;

  for (let xIndex = 0; xIndex < 2; xIndex += 1) {
    for (let yIndex = 0; yIndex < 2; yIndex += 1) {
      for (let zIndex = 0; zIndex < 2; zIndex += 1) {
        corner
          .set(
            xIndex ? bounds.max.x : bounds.min.x,
            yIndex ? bounds.max.y : bounds.min.y,
            zIndex ? bounds.max.z : bounds.min.z,
          )
          .applyMatrix4(object.matrixWorld)
          .project(camera);
        frame.minX = Math.min(frame.minX, corner.x);
        frame.maxX = Math.max(frame.maxX, corner.x);
        frame.minY = Math.min(frame.minY, corner.y);
        frame.maxY = Math.max(frame.maxY, corner.y);
      }
    }
  }

  frame.width = frame.maxX - frame.minX;
  frame.height = frame.maxY - frame.minY;
  frame.centerX = (frame.minX + frame.maxX) * 0.5;
  frame.centerY = (frame.minY + frame.maxY) * 0.5;
}

function getViewportFrameWeight(
  viewportFrame: SceneCloudState["viewportFrame"],
) {
  return viewportFrame === "preserve" ? 1 : 0;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
