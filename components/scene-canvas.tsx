"use client";

import { AdaptiveDpr } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion";
import { useReducedMotion } from "motion/react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

import {
  FACE_SCAN_GLB_PATH,
  POINT_CLOUD_ASSET_PATH,
  POINT_CLOUD_TEXT_TARGETS,
  RENDER_DEFAULTS,
  SCENE_PHASES,
  type PointCloudShape,
  type PointCloudTargetId,
  type PointCloudTextTargetId,
} from "@/lib/scene-config";
import {
  createMorphTargets,
  generateFallbackFacePoints,
  normalizePositions,
  orientImportedPositions,
  samplePositions,
} from "@/lib/point-cloud";
import {
  getProjectCardExclusionSnapshot,
  subscribeProjectCardExclusion,
  type ProjectCardExclusionRect,
} from "@/lib/project-card-exclusion-store";

const POINTER_SMOOTHING = 14;
const POINTER_PRESENCE_SMOOTHING = 10;
const MOUSE_REPULSION_RADIUS = 0.34;
const MOUSE_REPULSION_RADIUS_SQ =
  MOUSE_REPULSION_RADIUS * MOUSE_REPULSION_RADIUS;
const MOUSE_REPULSION_DISPLACEMENT = 0.14;
const MOUSE_REPULSION_DEPTH_BOOST = 1.14;
const CARD_EXCLUSION_SMOOTHING = 10;
const CARD_EXCLUSION_SOFT_PAD = 0.18;
const CARD_EXCLUSION_SOFT_STRENGTH = 0.12;
const CARD_EXCLUSION_HARD_STRENGTH = 1.08;
const CARD_EXCLUSION_OVERSHOOT = 0.1;
const CARD_EXCLUSION_DEPTH_FACTOR = 0.18;

type SceneCanvasProps = {
  progress: MotionValue<number>;
};

type QualityProfile = {
  maxPoints: number;
  dpr: [number, number];
  sizeMultiplier: number;
  noiseMultiplier: number;
  textHaloMultiplier: number;
  textScaleMultiplier: number;
  faceScaleMultiplier: number;
  aboutTextScaleMultiplier: number;
  projectsTextScaleMultiplier: number;
  introFaceOffset: [number, number];
  introCameraYOffset: number;
  introTargetYOffset: number;
};

type PointCloudSystemProps = {
  basePositions: Float32Array;
  progress: MotionValue<number>;
  reducedMotion: boolean;
  profile: QualityProfile;
};

type ParticleState = {
  x: number;
  y: number;
  z: number;
  spreadX: number;
  spreadY: number;
  spreadZ: number;
};

type MouseRepulsionState = {
  active: boolean;
  strength: number;
};

type CardExclusionState = {
  active: boolean;
  halfWidth: number;
  halfHeight: number;
  strength: number;
  targetStrength: number;
};

export function SceneCanvas({ progress }: SceneCanvasProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const profile = useQualityProfile(reducedMotion);
  const basePositions = usePointCloudSource(profile.maxPoints);

  return (
    <Canvas
      dpr={profile.dpr}
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
      <AdaptiveDpr pixelated />
      <PointCloudSystem
        basePositions={basePositions}
        progress={progress}
        reducedMotion={reducedMotion}
        profile={profile}
      />
    </Canvas>
  );
}

function PointCloudSystem({
  basePositions,
  progress,
  reducedMotion,
  profile,
}: PointCloudSystemProps) {
  const invalidate = useThree((state) => state.invalidate);
  const pointCount = Math.floor(basePositions.length / 3);
  const renderPositions = useMemo(
    () => new Float32Array(basePositions.length),
    [basePositions.length],
  );
  const typographyDescriptors = useMemo(
    () =>
      Object.values(POINT_CLOUD_TEXT_TARGETS).map(
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
  const seeds = useMemo(() => {
    const values = new Float32Array(pointCount * 2);

    for (let index = 0; index < pointCount; index += 1) {
      values[index * 2] = hash(index, 0.13);
      values[index * 2 + 1] = hash(index, 0.79);
    }

    return values;
  }, [pointCount]);
  const morphTargets = useMemo(
    () =>
      createMorphTargets(basePositions, {
        textTargets: Object.values(POINT_CLOUD_TEXT_TARGETS),
        haloDensityMultiplier: profile.textHaloMultiplier,
        textScaleMultiplier: profile.textScaleMultiplier,
      }),
    [
      basePositions,
      profile.textScaleMultiplier,
      profile.textHaloMultiplier,
      typographyVersion,
    ],
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
  const pointerRayCurrent = useMemo(() => new THREE.Vector2(0, 0), []);
  const pointerPresenceTarget = useRef(0);
  const pointerPresenceCurrent = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const interactionPlane = useMemo(() => new THREE.Plane(), []);
  const interactionPlaneNormal = useMemo(() => new THREE.Vector3(), []);
  const cloudWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const worldInteractionPoint = useMemo(() => new THREE.Vector3(), []);
  const localInteractionPoint = useMemo(() => new THREE.Vector3(), []);
  const exclusionSnapshotRef = useRef<{
    rect: ProjectCardExclusionRect;
    strength: number;
  } | null>(getProjectCardExclusionSnapshot());
  const exclusionStrengthCurrent = useRef(0);
  const localCardCenter = useMemo(() => new THREE.Vector3(), []);
  const localCardLeftMid = useMemo(() => new THREE.Vector3(), []);
  const localCardRightMid = useMemo(() => new THREE.Vector3(), []);
  const localCardTopMid = useMemo(() => new THREE.Vector3(), []);
  const localCardBottomMid = useMemo(() => new THREE.Vector3(), []);
  const localCardRightAxis = useMemo(() => new THREE.Vector3(), []);
  const localCardUpAxis = useMemo(() => new THREE.Vector3(), []);
  const localCardPlaneNormal = useMemo(() => new THREE.Vector3(), []);
  const cardNdcPoint = useMemo(() => new THREE.Vector2(), []);
  const localPointDelta = useMemo(() => new THREE.Vector3(), []);
  const elapsedTimeRef = useRef(0);

  useEffect(() => {
    const unsubscribe = progress.on("change", () => {
      invalidate();
    });

    return () => {
      unsubscribe();
    };
  }, [invalidate, progress]);

  useEffect(() => {
    renderPositions.set(morphTargets.face);
    geometry.attributes.position.needsUpdate = true;
    invalidate();
  }, [geometry, invalidate, morphTargets, renderPositions]);

  useEffect(() => {
    const unsubscribe = subscribeProjectCardExclusion(() => {
      exclusionSnapshotRef.current = getProjectCardExclusionSnapshot();
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

  useFrame(({ camera }, delta) => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const phaseState = sampleSceneProgress(progress.get());
    const shapeFrom =
      morphTargets[resolveMorphTargetId(phaseState.current.cloud)] ??
      morphTargets.face;
    const shapeTo =
      morphTargets[resolveMorphTargetId(phaseState.next.cloud)] ??
      morphTargets.face;
    const noise = phaseState.cloud.noise * profile.noiseMultiplier;
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

    const responsiveCloudScaleMultiplier = getResponsiveCloudScaleMultiplier(
      phaseState.current.cloud,
      phaseState.next.cloud,
      blend,
      profile,
    );
    const responsiveIntroFaceOffset = getResponsiveIntroFaceOffset(
      phaseState.current.key,
      phaseState.next.key,
      blend,
      profile,
    );
    cloud.position.set(
      phaseState.cloud.position[0] + responsiveIntroFaceOffset[0],
      phaseState.cloud.position[1] + responsiveIntroFaceOffset[1],
      phaseState.cloud.position[2],
    );
    cloud.rotation.set(
      phaseState.cloud.rotation[0] + pointerPitch,
      phaseState.cloud.rotation[1] + pointerYaw,
      phaseState.cloud.rotation[2],
    );
    cloud.scale.setScalar(
      phaseState.cloud.scale * responsiveCloudScaleMultiplier,
    );
    cloudMaterial.size = phaseState.cloud.pointSize * profile.sizeMultiplier;
    cloudMaterial.opacity = phaseState.cloud.opacity;

    const responsiveIntroCameraYOffset = getResponsiveIntroCameraYOffset(
      phaseState.current.key,
      phaseState.next.key,
      blend,
      profile,
    );
    const responsiveIntroTargetYOffset = getResponsiveIntroTargetYOffset(
      phaseState.current.key,
      phaseState.next.key,
      blend,
      profile,
    );
    desiredCamera.set(...phaseState.camera.position);
    cameraTarget.set(...phaseState.camera.target);
    desiredCamera.y += responsiveIntroCameraYOffset;
    cameraTarget.y += responsiveIntroTargetYOffset;

    perspectiveCamera.position.copy(desiredCamera);
    perspectiveCamera.lookAt(cameraTarget);
    perspectiveCamera.fov = phaseState.camera.fov;
    perspectiveCamera.updateProjectionMatrix();
    perspectiveCamera.updateMatrixWorld();

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

    const cardExclusionState = resolveCardExclusionState({
      currentShape: phaseState.current.cloud.shape,
      nextShape: phaseState.next.cloud.shape,
      blend,
      exclusionSnapshot: exclusionSnapshotRef.current,
      exclusionStrengthCurrent,
      delta,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cardNdcPoint,
      worldInteractionPoint,
      localCardCenter,
      localCardLeftMid,
      localCardRightMid,
      localCardTopMid,
      localCardBottomMid,
      localCardRightAxis,
      localCardUpAxis,
      localCardPlaneNormal,
      cloud,
    });
    const mouseRepulsionState = resolveMouseRepulsionState({
      pointerPresence: pointerPresenceCurrent.current,
      pointerCurrent,
      pointerRayCurrent,
      currentShape: phaseState.current.cloud.shape,
      nextShape: phaseState.next.cloud.shape,
      blend,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      worldInteractionPoint,
      localInteractionPoint,
      cloud,
    });
    const particle: ParticleState = {
      x: 0,
      y: 0,
      z: 0,
      spreadX: 0,
      spreadY: 0,
      spreadZ: 0,
    };

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
          localInteractionPoint,
          mouseRepulsionState.strength,
        );
      }

      if (cardExclusionState.active) {
        applyCardExclusion(
          particle,
          cardExclusionState,
          localCardCenter,
          localCardRightAxis,
          localCardUpAxis,
          localCardPlaneNormal,
          localPointDelta,
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
      Math.abs(
        exclusionStrengthCurrent.current - cardExclusionState.targetStrength,
      ) > 0.00004
    ) {
      invalidate();
    }
  });

  return <primitive object={cloud} />;
}

function updatePointerState(
  pointerCurrent: THREE.Vector2,
  pointerTarget: THREE.Vector2,
  pointerPresenceCurrent: { current: number },
  pointerPresenceTarget: number,
  delta: number,
) {
  const pointerLerp = 1 - Math.exp(-delta * POINTER_SMOOTHING);
  const pointerPresenceLerp = 1 - Math.exp(-delta * POINTER_PRESENCE_SMOOTHING);

  pointerCurrent.lerp(pointerTarget, pointerLerp);
  pointerPresenceCurrent.current = lerp(
    pointerPresenceCurrent.current,
    pointerPresenceTarget,
    pointerPresenceLerp,
  );
}

function resolveMouseRepulsionState({
  pointerPresence,
  pointerCurrent,
  pointerRayCurrent,
  currentShape,
  nextShape,
  blend,
  perspectiveCamera,
  raycaster,
  interactionPlane,
  worldInteractionPoint,
  localInteractionPoint,
  cloud,
}: {
  pointerPresence: number;
  pointerCurrent: THREE.Vector2;
  pointerRayCurrent: THREE.Vector2;
  currentShape: PointCloudShape;
  nextShape: PointCloudShape;
  blend: number;
  perspectiveCamera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  interactionPlane: THREE.Plane;
  worldInteractionPoint: THREE.Vector3;
  localInteractionPoint: THREE.Vector3;
  cloud: THREE.Points;
}): MouseRepulsionState {
  if (pointerPresence <= 0.001) {
    return { active: false, strength: 0 };
  }

  const strength =
    pointerPresence * getMouseRepulsionWeight(currentShape, nextShape, blend);

  if (strength <= 0.001) {
    return { active: false, strength };
  }

  pointerRayCurrent.set(pointerCurrent.x, -pointerCurrent.y);
  raycaster.setFromCamera(pointerRayCurrent, perspectiveCamera);

  if (!raycaster.ray.intersectPlane(interactionPlane, worldInteractionPoint)) {
    return { active: false, strength };
  }

  localInteractionPoint.copy(worldInteractionPoint);
  cloud.worldToLocal(localInteractionPoint);

  return { active: true, strength };
}

function resolveCardExclusionState({
  currentShape,
  nextShape,
  blend,
  exclusionSnapshot,
  exclusionStrengthCurrent,
  delta,
  perspectiveCamera,
  raycaster,
  interactionPlane,
  cardNdcPoint,
  worldInteractionPoint,
  localCardCenter,
  localCardLeftMid,
  localCardRightMid,
  localCardTopMid,
  localCardBottomMid,
  localCardRightAxis,
  localCardUpAxis,
  localCardPlaneNormal,
  cloud,
}: {
  currentShape: PointCloudShape;
  nextShape: PointCloudShape;
  blend: number;
  exclusionSnapshot: {
    rect: ProjectCardExclusionRect;
    strength: number;
  } | null;
  exclusionStrengthCurrent: { current: number };
  delta: number;
  perspectiveCamera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  interactionPlane: THREE.Plane;
  cardNdcPoint: THREE.Vector2;
  worldInteractionPoint: THREE.Vector3;
  localCardCenter: THREE.Vector3;
  localCardLeftMid: THREE.Vector3;
  localCardRightMid: THREE.Vector3;
  localCardTopMid: THREE.Vector3;
  localCardBottomMid: THREE.Vector3;
  localCardRightAxis: THREE.Vector3;
  localCardUpAxis: THREE.Vector3;
  localCardPlaneNormal: THREE.Vector3;
  cloud: THREE.Points;
}): CardExclusionState {
  const phaseWeight = getCardExclusionWeight(currentShape, nextShape, blend);
  const targetStrength =
    exclusionSnapshot && phaseWeight > 0.001
      ? exclusionSnapshot.strength * phaseWeight
      : 0;
  const exclusionLerp = 1 - Math.exp(-delta * CARD_EXCLUSION_SMOOTHING);
  exclusionStrengthCurrent.current = lerp(
    exclusionStrengthCurrent.current,
    targetStrength,
    exclusionLerp,
  );

  if (!exclusionSnapshot || exclusionStrengthCurrent.current <= 0.001) {
    return {
      active: false,
      halfWidth: 0,
      halfHeight: 0,
      strength: exclusionStrengthCurrent.current,
      targetStrength,
    };
  }

  const centerX =
    exclusionSnapshot.rect.left + exclusionSnapshot.rect.width * 0.5;
  const centerY =
    exclusionSnapshot.rect.top + exclusionSnapshot.rect.height * 0.5;

  const hasCardProjection =
    projectScreenPointToLocal(
      centerX,
      centerY,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cardNdcPoint,
      worldInteractionPoint,
      localCardCenter,
      cloud,
    ) &&
    projectScreenPointToLocal(
      exclusionSnapshot.rect.left,
      centerY,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cardNdcPoint,
      worldInteractionPoint,
      localCardLeftMid,
      cloud,
    ) &&
    projectScreenPointToLocal(
      exclusionSnapshot.rect.right,
      centerY,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cardNdcPoint,
      worldInteractionPoint,
      localCardRightMid,
      cloud,
    ) &&
    projectScreenPointToLocal(
      centerX,
      exclusionSnapshot.rect.top,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cardNdcPoint,
      worldInteractionPoint,
      localCardTopMid,
      cloud,
    ) &&
    projectScreenPointToLocal(
      centerX,
      exclusionSnapshot.rect.bottom,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cardNdcPoint,
      worldInteractionPoint,
      localCardBottomMid,
      cloud,
    );

  if (!hasCardProjection) {
    return {
      active: false,
      halfWidth: 0,
      halfHeight: 0,
      strength: exclusionStrengthCurrent.current,
      targetStrength,
    };
  }

  localCardRightAxis.copy(localCardRightMid).sub(localCardLeftMid).normalize();
  localCardUpAxis.copy(localCardTopMid).sub(localCardBottomMid).normalize();
  localCardPlaneNormal
    .crossVectors(localCardRightAxis, localCardUpAxis)
    .normalize();
  localCardUpAxis
    .crossVectors(localCardPlaneNormal, localCardRightAxis)
    .normalize();

  const halfWidth = localCardCenter.distanceTo(localCardRightMid);
  const halfHeight = localCardCenter.distanceTo(localCardTopMid);
  const active = halfWidth > 0.001 && halfHeight > 0.001;

  return {
    active,
    halfWidth,
    halfHeight,
    strength: exclusionStrengthCurrent.current,
    targetStrength,
  };
}

function sampleParticlePosition(
  particle: ParticleState,
  index: number,
  offset: number,
  shapeFrom: Float32Array,
  shapeTo: Float32Array,
  blend: number,
  noise: number,
  intensity: number,
  pulse: number,
  seeds: Float32Array,
) {
  particle.x = lerp(shapeFrom[offset], shapeTo[offset], blend);
  particle.y = lerp(shapeFrom[offset + 1], shapeTo[offset + 1], blend);
  particle.z = lerp(shapeFrom[offset + 2], shapeTo[offset + 2], blend);

  const drift = noise * (0.01 + (index % 5) * 0.0012) * intensity * pulse;
  const seedA = seeds[index * 2];
  const seedB = seeds[index * 2 + 1];

  particle.spreadX = seedA - 0.5;
  particle.spreadY = seedB - 0.5;
  particle.spreadZ = (seedA + seedB) * 0.5 - 0.5;
  particle.x += particle.spreadX * drift;
  particle.y += particle.spreadY * drift * 0.8;
  particle.z += particle.spreadZ * drift * 1.15;
}

function applyMouseRepulsion(
  particle: ParticleState,
  localInteractionPoint: THREE.Vector3,
  interactionStrength: number,
) {
  let repelX = particle.x - localInteractionPoint.x;
  let repelY = particle.y - localInteractionPoint.y;
  let repelZ = particle.z - localInteractionPoint.z;
  let repelLengthSq = repelX * repelX + repelY * repelY + repelZ * repelZ;

  if (repelLengthSq >= MOUSE_REPULSION_RADIUS_SQ) {
    return;
  }

  if (repelLengthSq < 0.000001) {
    repelX = particle.spreadX || 0.001;
    repelY = particle.spreadY || 0.001;
    repelZ = particle.spreadZ || 0.001;
    repelLengthSq = repelX * repelX + repelY * repelY + repelZ * repelZ;
  }

  const repelLength = Math.sqrt(repelLengthSq);
  const falloff = 1 - repelLength / MOUSE_REPULSION_RADIUS;
  const displacement =
    MOUSE_REPULSION_DISPLACEMENT * falloff * falloff * interactionStrength;
  const inverseLength = 1 / repelLength;

  particle.x += repelX * inverseLength * displacement;
  particle.y += repelY * inverseLength * displacement;
  particle.z +=
    repelZ * inverseLength * displacement * MOUSE_REPULSION_DEPTH_BOOST;
}

function applyCardExclusion(
  particle: ParticleState,
  cardExclusion: CardExclusionState,
  localCardCenter: THREE.Vector3,
  localCardRightAxis: THREE.Vector3,
  localCardUpAxis: THREE.Vector3,
  localCardPlaneNormal: THREE.Vector3,
  localPointDelta: THREE.Vector3,
) {
  localPointDelta.set(
    particle.x - localCardCenter.x,
    particle.y - localCardCenter.y,
    particle.z - localCardCenter.z,
  );
  const planeX = localPointDelta.dot(localCardRightAxis);
  const planeY = localPointDelta.dot(localCardUpAxis);
  const absX = Math.abs(planeX);
  const absY = Math.abs(planeY);
  const softPadX = cardExclusion.halfWidth * CARD_EXCLUSION_SOFT_PAD + 0.045;
  const softPadY = cardExclusion.halfHeight * CARD_EXCLUSION_SOFT_PAD + 0.045;
  const softHalfWidth = cardExclusion.halfWidth + softPadX;
  const softHalfHeight = cardExclusion.halfHeight + softPadY;

  if (absX >= softHalfWidth || absY >= softHalfHeight) {
    return;
  }

  let pushX = 0;
  let pushY = 0;
  let pushMagnitude = 0;

  if (absX < cardExclusion.halfWidth && absY < cardExclusion.halfHeight) {
    const xToEdge = cardExclusion.halfWidth - absX;
    const yToEdge = cardExclusion.halfHeight - absY;
    const overshoot =
      Math.min(cardExclusion.halfWidth, cardExclusion.halfHeight) *
        CARD_EXCLUSION_OVERSHOOT +
      0.03;

    if (xToEdge < yToEdge) {
      pushX = planeX >= 0 ? 1 : -1;
      pushMagnitude = (xToEdge + overshoot) * CARD_EXCLUSION_HARD_STRENGTH;
    } else {
      pushY = planeY >= 0 ? 1 : -1;
      pushMagnitude = (yToEdge + overshoot) * CARD_EXCLUSION_HARD_STRENGTH;
    }
  } else {
    const clampedX = clamp(
      planeX,
      -cardExclusion.halfWidth,
      cardExclusion.halfWidth,
    );
    const clampedY = clamp(
      planeY,
      -cardExclusion.halfHeight,
      cardExclusion.halfHeight,
    );
    const deltaX = planeX - clampedX;
    const deltaY = planeY - clampedY;
    const deltaLength = Math.hypot(deltaX, deltaY);

    if (deltaLength > 0.0001) {
      pushX = deltaX / deltaLength;
      pushY = deltaY / deltaLength;
    } else if (softHalfWidth - absX < softHalfHeight - absY) {
      pushX = planeX >= 0 ? 1 : -1;
    } else {
      pushY = planeY >= 0 ? 1 : -1;
    }

    const softRadius = Math.max(softPadX, softPadY);
    const falloff = 1 - clamp(deltaLength / Math.max(softRadius, 0.0001), 0, 1);
    pushMagnitude = falloff * falloff * CARD_EXCLUSION_SOFT_STRENGTH;
  }

  pushMagnitude *= cardExclusion.strength;

  if (pushMagnitude <= 0.0001) {
    return;
  }

  particle.x +=
    (localCardRightAxis.x * pushX + localCardUpAxis.x * pushY) * pushMagnitude +
    localCardPlaneNormal.x *
      pushMagnitude *
      CARD_EXCLUSION_DEPTH_FACTOR *
      cardExclusion.strength;
  particle.y +=
    (localCardRightAxis.y * pushX + localCardUpAxis.y * pushY) * pushMagnitude +
    localCardPlaneNormal.y *
      pushMagnitude *
      CARD_EXCLUSION_DEPTH_FACTOR *
      cardExclusion.strength;
  particle.z +=
    (localCardRightAxis.z * pushX + localCardUpAxis.z * pushY) * pushMagnitude +
    localCardPlaneNormal.z *
      pushMagnitude *
      CARD_EXCLUSION_DEPTH_FACTOR *
      cardExclusion.strength;
}

function usePointCloudSource(maxPoints: number) {
  const [rawAssetPositions, setRawAssetPositions] =
    useState<Float32Array | null>(null);
  const fallbackPositions = useMemo(
    () => generateFallbackFacePoints(maxPoints),
    [maxPoints],
  );

  useEffect(() => {
    let cancelled = false;
    const commitPositions = (positions: Float32Array | null) => {
      if (cancelled || !positions || !positions.length) {
        return;
      }

      startTransition(() => {
        setRawAssetPositions(positions);
      });
    };
    const loadGlbFallback = () => {
      const gltfLoader = new GLTFLoader();

      gltfLoader.load(
        FACE_SCAN_GLB_PATH,
        (gltf) => {
          if (cancelled) {
            return;
          }

          commitPositions(samplePointsFromScene(gltf.scene, 18000));
        },
        undefined,
        () => undefined,
      );
    };
    const plyLoader = new PLYLoader();

    plyLoader.load(
      POINT_CLOUD_ASSET_PATH,
      (geometry) => {
        if (cancelled) {
          return;
        }

        const positions = geometry.getAttribute("position");

        if (!positions || positions.count === 0) {
          loadGlbFallback();
          return;
        }

        commitPositions(new Float32Array(positions.array as ArrayLike<number>));
      },
      undefined,
      () => {
        loadGlbFallback();
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    if (!rawAssetPositions) {
      return fallbackPositions;
    }

    return normalizePositions(
      orientImportedPositions(samplePositions(rawAssetPositions, maxPoints)),
    );
  }, [fallbackPositions, maxPoints, rawAssetPositions]);
}

function useQualityProfile(reducedMotion: boolean) {
  const [profile, setProfile] = useState<QualityProfile>({
    maxPoints: reducedMotion
      ? RENDER_DEFAULTS.reducedMaxPoints
      : RENDER_DEFAULTS.desktopMaxPoints,
    dpr: reducedMotion ? RENDER_DEFAULTS.mobileDpr : RENDER_DEFAULTS.desktopDpr,
    sizeMultiplier: reducedMotion ? 1.2 : 1,
    noiseMultiplier: reducedMotion ? 0.5 : 1,
    textHaloMultiplier: reducedMotion ? 0.2 : 1,
    textScaleMultiplier: 1,
    faceScaleMultiplier: 1,
    aboutTextScaleMultiplier: 1,
    projectsTextScaleMultiplier: 1,
    introFaceOffset: [0, 0],
    introCameraYOffset: 0,
    introTargetYOffset: 0,
  });

  useEffect(() => {
    const computeProfile = () => {
      const width = window.innerWidth;
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const mobileTextScale =
        width >= 900
          ? 1
          : 0.42 +
            Math.pow(THREE.MathUtils.clamp((width - 300) / 600, 0, 1), 1.35) *
              0.58;
      const mobileFaceScale = mobileTextScale;
      const aboutDesktopScale = width >= 900 ? 0.84 : width <= 640 ? 1.32 : 1;
      const projectsDesktopScale = width >= 1280 ? 0.86 : width <= 640 ? 1.42 : 1;
      const introFaceOffset: [number, number] =
        width <= 640 ? [-0.12, -0.15] : [0, 0];
      const introCameraYOffset = width <= 640 ? 0.08 : 0;
      const introTargetYOffset = width <= 640 ? 0.26 : 0;
      const memory =
        "deviceMemory" in navigator
          ? ((navigator as Navigator & { deviceMemory?: number })
              .deviceMemory ?? 8)
          : 8;
      const cores = navigator.hardwareConcurrency ?? 8;
      const constrainedDevice =
        coarsePointer || width < 900 || memory <= 4 || cores <= 4;

      if (reducedMotion) {
        setProfile({
          maxPoints: RENDER_DEFAULTS.reducedMaxPoints,
          dpr: RENDER_DEFAULTS.mobileDpr,
          sizeMultiplier: 1.18,
          noiseMultiplier: 0.18,
          textHaloMultiplier: 0.12,
          textScaleMultiplier: mobileTextScale,
          faceScaleMultiplier: mobileFaceScale,
          aboutTextScaleMultiplier: aboutDesktopScale,
          projectsTextScaleMultiplier: projectsDesktopScale,
          introFaceOffset,
          introCameraYOffset,
          introTargetYOffset,
        });
        return;
      }

      setProfile({
        maxPoints: constrainedDevice
          ? RENDER_DEFAULTS.mobileMaxPoints
          : RENDER_DEFAULTS.desktopMaxPoints,
        dpr: constrainedDevice
          ? RENDER_DEFAULTS.mobileDpr
          : RENDER_DEFAULTS.desktopDpr,
        sizeMultiplier: constrainedDevice ? 1.12 : 1,
        noiseMultiplier: constrainedDevice ? 0.3 : 0.48,
        textHaloMultiplier: constrainedDevice ? 0.42 : 1,
        textScaleMultiplier: mobileTextScale,
        faceScaleMultiplier: mobileFaceScale,
        aboutTextScaleMultiplier: aboutDesktopScale,
        projectsTextScaleMultiplier: projectsDesktopScale,
        introFaceOffset,
        introCameraYOffset,
        introTargetYOffset,
      });
    };

    computeProfile();
    window.addEventListener("resize", computeProfile);

    return () => {
      window.removeEventListener("resize", computeProfile);
    };
  }, [reducedMotion]);

  return profile;
}

function getResponsiveCloudScaleMultiplier(
  currentCloud: {
    shape: PointCloudShape;
    textTargetId?: PointCloudTextTargetId;
  },
  nextCloud: {
    shape: PointCloudShape;
    textTargetId?: PointCloudTextTargetId;
  },
  mix: number,
  profile: QualityProfile,
) {
  const currentMultiplier =
    currentCloud.shape === "face"
      ? profile.faceScaleMultiplier
      : currentCloud.shape === "text"
        ? profile.textScaleMultiplier *
          (currentCloud.textTargetId === "projects"
            ? profile.projectsTextScaleMultiplier
            : currentCloud.textTargetId === "about-me"
              ? profile.aboutTextScaleMultiplier
              : 1)
        : 1;
  const nextMultiplier =
    nextCloud.shape === "face"
      ? profile.faceScaleMultiplier
      : nextCloud.shape === "text"
        ? profile.textScaleMultiplier *
          (nextCloud.textTargetId === "projects"
            ? profile.projectsTextScaleMultiplier
            : nextCloud.textTargetId === "about-me"
              ? profile.aboutTextScaleMultiplier
              : 1)
        : 1;

  return lerp(currentMultiplier, nextMultiplier, mix);
}

function getResponsiveIntroFaceOffset(
  currentPhaseKey: string,
  nextPhaseKey: string,
  mix: number,
  profile: QualityProfile,
) {
  const currentOffset =
    currentPhaseKey === "intro" ? profile.introFaceOffset : ([0, 0] as const);
  const nextOffset =
    nextPhaseKey === "intro" ? profile.introFaceOffset : ([0, 0] as const);

  return [
    lerp(currentOffset[0], nextOffset[0], mix),
    lerp(currentOffset[1], nextOffset[1], mix),
  ] as const;
}

function getResponsiveIntroCameraYOffset(
  currentPhaseKey: string,
  nextPhaseKey: string,
  mix: number,
  profile: QualityProfile,
) {
  const currentOffset = currentPhaseKey === "intro" ? profile.introCameraYOffset : 0;
  const nextOffset = nextPhaseKey === "intro" ? profile.introCameraYOffset : 0;

  return lerp(currentOffset, nextOffset, mix);
}

function getResponsiveIntroTargetYOffset(
  currentPhaseKey: string,
  nextPhaseKey: string,
  mix: number,
  profile: QualityProfile,
) {
  const currentOffset = currentPhaseKey === "intro" ? profile.introTargetYOffset : 0;
  const nextOffset = nextPhaseKey === "intro" ? profile.introTargetYOffset : 0;

  return lerp(currentOffset, nextOffset, mix);
}

function sampleSceneProgress(progress: number) {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
  let activeIndex = SCENE_PHASES.findIndex(
    (phase, index) =>
      clampedProgress >= phase.range[0] &&
      (clampedProgress <= phase.range[1] || index === SCENE_PHASES.length - 1),
  );

  if (activeIndex < 0) {
    activeIndex = 0;
  }

  const current = SCENE_PHASES[activeIndex];
  const next = SCENE_PHASES[Math.min(activeIndex + 1, SCENE_PHASES.length - 1)];
  const rangeSpan = Math.max(current.range[1] - current.range[0], 0.0001);
  const linearMix = (clampedProgress - current.range[0]) / rangeSpan;
  const mix = smoothstep(THREE.MathUtils.clamp(linearMix, 0, 1));

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
      shape: blendShape(current.cloud.shape, next.cloud.shape, mix),
      textTargetId: blendTextTargetId(
        current.cloud.textTargetId,
        next.cloud.textTargetId,
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

function blendShape(
  current: PointCloudShape,
  next: PointCloudShape,
  mix: number,
): PointCloudShape {
  return mix < 0.5 ? current : next;
}

function blendTextTargetId(
  current: PointCloudTextTargetId | undefined,
  next: PointCloudTextTargetId | undefined,
  mix: number,
) {
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

function getFaceTrackingWeight(
  current: PointCloudShape,
  next: PointCloudShape,
  mix: number,
) {
  const currentWeight = current === "face" ? 1 : 0;
  const nextWeight = next === "face" ? 1 : 0;
  return lerp(currentWeight, nextWeight, mix);
}

function getCardExclusionShapeWeight(shape: PointCloudShape) {
  switch (shape) {
    case "project-field-1":
    case "project-field-2":
    case "project-field-3":
      return 1;
    default:
      return 0;
  }
}

function getCardExclusionWeight(
  current: PointCloudShape,
  next: PointCloudShape,
  mix: number,
) {
  return lerp(
    getCardExclusionShapeWeight(current),
    getCardExclusionShapeWeight(next),
    mix,
  );
}

function getMouseRepulsionShapeWeight(shape: PointCloudShape) {
  switch (shape) {
    case "face":
      return 1;
    case "text":
      return 0.18;
    case "project-field-1":
      return 0.44;
    case "project-field-2":
      return 0.52;
    case "project-field-3":
      return 0.48;
    case "settle":
      return 0.3;
    default:
      return 0.4;
  }
}

function getMouseRepulsionWeight(
  current: PointCloudShape,
  next: PointCloudShape,
  mix: number,
) {
  return lerp(
    getMouseRepulsionShapeWeight(current),
    getMouseRepulsionShapeWeight(next),
    mix,
  );
}

function hash(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

function projectScreenPointToLocal(
  clientX: number,
  clientY: number,
  camera: THREE.PerspectiveCamera,
  raycaster: THREE.Raycaster,
  plane: THREE.Plane,
  ndcPoint: THREE.Vector2,
  worldPoint: THREE.Vector3,
  localPoint: THREE.Vector3,
  cloud: THREE.Points,
) {
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  ndcPoint.set(
    (clientX / viewportWidth) * 2 - 1,
    1 - (clientY / viewportHeight) * 2,
  );
  raycaster.setFromCamera(ndcPoint, camera);

  if (!raycaster.ray.intersectPlane(plane, worldPoint)) {
    return false;
  }

  localPoint.copy(worldPoint);
  cloud.worldToLocal(localPoint);
  return true;
}

function resolveMorphTargetId(cloud: {
  shape: PointCloudShape;
  textTargetId?: PointCloudTextTargetId;
}): PointCloudTargetId {
  if (cloud.shape === "text" && cloud.textTargetId) {
    return cloud.textTargetId;
  }

  return cloud.shape === "text" ? "settle" : cloud.shape;
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

function samplePointsFromScene(scene: THREE.Object3D, pointCount: number) {
  const meshes: Array<
    THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>
  > = [];

  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if ("isMesh" in child && child.isMesh) {
      const mesh = child as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.Material | THREE.Material[]
      >;

      if (mesh.geometry.getAttribute("position")) {
        meshes.push(mesh);
      }
    }
  });

  if (!meshes.length) {
    return new Float32Array();
  }

  const totalWeight = meshes.reduce((sum, mesh) => {
    return sum + mesh.geometry.getAttribute("position").count;
  }, 0);
  const samples: number[] = [];
  const tempPosition = new THREE.Vector3();

  meshes.forEach((mesh, meshIndex) => {
    const weight = mesh.geometry.getAttribute("position").count / totalWeight;
    const sampleCount =
      meshIndex === meshes.length - 1
        ? pointCount - Math.floor(samples.length / 3)
        : Math.max(256, Math.floor(pointCount * weight));
    const sampler = new MeshSurfaceSampler(mesh).build();

    for (let index = 0; index < sampleCount; index += 1) {
      sampler.sample(tempPosition);
      tempPosition.applyMatrix4(mesh.matrixWorld);
      samples.push(tempPosition.x, tempPosition.y, tempPosition.z);
    }
  });

  return new Float32Array(samples);
}
