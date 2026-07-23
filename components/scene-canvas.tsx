"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion";
import { useReducedMotion } from "motion/react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  POINT_CLOUD_ASSET_PATH,
  POINT_CLOUD_TEXT_TARGETS,
  RENDER_DEFAULTS,
  type PointCloudShape,
  type PointCloudTargetId,
  type PointCloudTextTargetId,
  type SceneCloudState,
  type ScenePhase,
  type SceneTimeline,
} from "@/lib/scene-config";
import {
  createMorphTargets,
  generateFallbackFacePoints,
  normalizePositions,
  orientImportedPositions,
  samplePositions,
} from "@/lib/point-cloud";
import {
  getParticleObstacleSnapshot,
  subscribeParticleObstacle,
  type ParticleObstacleEntry,
  type ParticleObstacleRect,
  type ParticleObstacleSnapshot,
} from "@/lib/particle-obstacle-store";

const POINTER_SMOOTHING = 14;
const POINTER_PRESENCE_SMOOTHING = 10;
const MOUSE_REPULSION_RADIUS = 0.34;
const MOUSE_REPULSION_RADIUS_SQ =
  MOUSE_REPULSION_RADIUS * MOUSE_REPULSION_RADIUS;
const MOUSE_REPULSION_DISPLACEMENT = 0.14;
const MOUSE_REPULSION_DEPTH_BOOST = 1.14;
const OBSTACLE_EXCLUSION_SMOOTHING = 13;
const OBSTACLE_EXCLUSION_SOFT_PAD = 0.22;
const OBSTACLE_EXCLUSION_SOFT_STRENGTH = 0.14;
const OBSTACLE_EXCLUSION_HARD_STRENGTH = 1;
const OBSTACLE_EXCLUSION_OVERSHOOT = 0.1;
const OBSTACLE_EXCLUSION_DEPTH_FACTOR = 0.16;
const OBSTACLE_INTERIOR_ROUTE_EXPONENT = 6;
const OBSTACLE_MAX_COMBINED_DISPLACEMENT = 0.9;
const OBSTACLE_STRENGTH_EPSILON = 0.001;
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
  profile: QualityProfile;
  phases: ScenePhase[];
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

type ObstacleExclusionRuntime = {
  id: string;
  present: boolean;
  rect: ParticleObstacleRect | null;
  halfWidth: number;
  halfHeight: number;
  cornerRadius: number;
  strength: number;
  targetStrength: number;
  center: THREE.Vector3;
  leftMid: THREE.Vector3;
  rightMid: THREE.Vector3;
  topMid: THREE.Vector3;
  bottomMid: THREE.Vector3;
  rightAxis: THREE.Vector3;
  upAxis: THREE.Vector3;
  planeNormal: THREE.Vector3;
};

type ObstacleExclusionFrame = {
  fields: ObstacleExclusionRuntime[];
  unsettled: boolean;
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
  const devicePixelRatio = useDevicePixelRatio();
  const profile = useQualityProfile(reducedMotion);
  const basePositions = usePointCloudSource(RENDER_DEFAULTS.maxPoints);

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
  const morphTargets = useMemo(() => {
    void typographyVersion;

    return createMorphTargets(basePositions, {
      textTargets: Object.values(POINT_CLOUD_TEXT_TARGETS),
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
  const pointerRayCurrent = useMemo(() => new THREE.Vector2(0, 0), []);
  const pointerPresenceTarget = useRef(0);
  const pointerPresenceCurrent = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const interactionPlane = useMemo(() => new THREE.Plane(), []);
  const interactionPlaneNormal = useMemo(() => new THREE.Vector3(), []);
  const cloudWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const worldInteractionPoint = useMemo(() => new THREE.Vector3(), []);
  const localInteractionPoint = useMemo(() => new THREE.Vector3(), []);
  const obstacleSnapshotRef = useRef<ParticleObstacleSnapshot>(
    getParticleObstacleSnapshot(),
  );
  const obstacleRuntimes = useMemo(
    () => new Map<string, ObstacleExclusionRuntime>(),
    [],
  );
  const activeObstacleFields = useMemo<ObstacleExclusionRuntime[]>(() => [], []);
  const obstacleNdcPoint = useMemo(() => new THREE.Vector2(), []);
  const localPointDelta = useMemo(() => new THREE.Vector3(), []);
  const obstacleDisplacement = useMemo(() => new THREE.Vector3(), []);
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
  const particle = useMemo<ParticleState>(
    () => ({ x: 0, y: 0, z: 0, spreadX: 0, spreadY: 0, spreadZ: 0 }),
    [],
  );

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
      phaseState.cloud.pointSize * layoutScaleMultiplier;
    cloudMaterial.opacity = phaseState.cloud.opacity;

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
      obstacleRepulsion: phaseState.cloud.obstacleRepulsion,
      obstacleSnapshots: obstacleSnapshotRef.current,
      obstacleRuntimes,
      activeObstacleFields,
      delta,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      obstacleNdcPoint,
      worldInteractionPoint,
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

      if (obstacleExclusionFrame.fields.length) {
        applyObstacleExclusions(
          particle,
          obstacleExclusionFrame.fields,
          localPointDelta,
          obstacleDisplacement,
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

function resolveObstacleExclusionFrame({
  obstacleRepulsion,
  obstacleSnapshots,
  obstacleRuntimes,
  activeObstacleFields,
  delta,
  perspectiveCamera,
  raycaster,
  interactionPlane,
  obstacleNdcPoint,
  worldInteractionPoint,
  cloud,
}: {
  obstacleRepulsion: number;
  obstacleSnapshots: ParticleObstacleSnapshot;
  obstacleRuntimes: Map<string, ObstacleExclusionRuntime>;
  activeObstacleFields: ObstacleExclusionRuntime[];
  delta: number;
  perspectiveCamera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  interactionPlane: THREE.Plane;
  obstacleNdcPoint: THREE.Vector2;
  worldInteractionPoint: THREE.Vector3;
  cloud: THREE.Points;
}): ObstacleExclusionFrame {
  activeObstacleFields.length = 0;

  for (const runtime of obstacleRuntimes.values()) {
    runtime.present = false;
    runtime.targetStrength = 0;
  }

  for (const snapshot of obstacleSnapshots) {
    const targetStrength = snapshot.strength * obstacleRepulsion;
    const runtime = getObstacleRuntime(
      obstacleRuntimes,
      snapshot,
      targetStrength,
    );
    runtime.present = true;
    runtime.rect = snapshot.rect;
    runtime.targetStrength = targetStrength;
  }

  const exclusionLerp =
    1 - Math.exp(-delta * OBSTACLE_EXCLUSION_SMOOTHING);
  let unsettled = false;

  for (const [id, runtime] of obstacleRuntimes) {
    runtime.strength = lerp(
      runtime.strength,
      runtime.targetStrength,
      exclusionLerp,
    );
    unsettled ||=
      Math.abs(runtime.strength - runtime.targetStrength) > 0.00004;

    if (
      !runtime.present &&
      runtime.strength <= OBSTACLE_STRENGTH_EPSILON &&
      runtime.targetStrength <= OBSTACLE_STRENGTH_EPSILON
    ) {
      obstacleRuntimes.delete(id);
      continue;
    }

    if (
      runtime.rect &&
      runtime.strength > OBSTACLE_STRENGTH_EPSILON &&
      projectObstacleIntoCloud({
        runtime,
        perspectiveCamera,
        raycaster,
        interactionPlane,
        obstacleNdcPoint,
        worldInteractionPoint,
        cloud,
      })
    ) {
      activeObstacleFields.push(runtime);
    }
  }

  return { fields: activeObstacleFields, unsettled };
}

function getObstacleRuntime(
  runtimes: Map<string, ObstacleExclusionRuntime>,
  snapshot: ParticleObstacleEntry,
  initialStrength: number,
) {
  const existing = runtimes.get(snapshot.id);

  if (existing) {
    return existing;
  }

  const runtime: ObstacleExclusionRuntime = {
    id: snapshot.id,
    present: true,
    rect: snapshot.rect,
    halfWidth: 0,
    halfHeight: 0,
    cornerRadius: 0,
    strength: initialStrength,
    targetStrength: initialStrength,
    center: new THREE.Vector3(),
    leftMid: new THREE.Vector3(),
    rightMid: new THREE.Vector3(),
    topMid: new THREE.Vector3(),
    bottomMid: new THREE.Vector3(),
    rightAxis: new THREE.Vector3(),
    upAxis: new THREE.Vector3(),
    planeNormal: new THREE.Vector3(),
  };
  runtimes.set(snapshot.id, runtime);

  return runtime;
}

function projectObstacleIntoCloud({
  runtime,
  perspectiveCamera,
  raycaster,
  interactionPlane,
  obstacleNdcPoint,
  worldInteractionPoint,
  cloud,
}: {
  runtime: ObstacleExclusionRuntime;
  perspectiveCamera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  interactionPlane: THREE.Plane;
  obstacleNdcPoint: THREE.Vector2;
  worldInteractionPoint: THREE.Vector3;
  cloud: THREE.Points;
}) {
  const rect = runtime.rect;

  if (!rect) {
    return false;
  }

  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const projected =
    projectScreenPointToLocal(
      centerX,
      centerY,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      obstacleNdcPoint,
      worldInteractionPoint,
      runtime.center,
      cloud,
    ) &&
    projectScreenPointToLocal(
      rect.left,
      centerY,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      obstacleNdcPoint,
      worldInteractionPoint,
      runtime.leftMid,
      cloud,
    ) &&
    projectScreenPointToLocal(
      rect.right,
      centerY,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      obstacleNdcPoint,
      worldInteractionPoint,
      runtime.rightMid,
      cloud,
    ) &&
    projectScreenPointToLocal(
      centerX,
      rect.top,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      obstacleNdcPoint,
      worldInteractionPoint,
      runtime.topMid,
      cloud,
    ) &&
    projectScreenPointToLocal(
      centerX,
      rect.bottom,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      obstacleNdcPoint,
      worldInteractionPoint,
      runtime.bottomMid,
      cloud,
    );

  if (!projected) {
    return false;
  }

  runtime.rightAxis.copy(runtime.rightMid).sub(runtime.leftMid);
  runtime.upAxis.copy(runtime.topMid).sub(runtime.bottomMid);
  runtime.halfWidth = runtime.rightAxis.length() * 0.5;
  runtime.halfHeight = runtime.upAxis.length() * 0.5;

  if (runtime.halfWidth <= 0.001 || runtime.halfHeight <= 0.001) {
    return false;
  }

  runtime.rightAxis.normalize();
  runtime.upAxis.normalize();
  runtime.planeNormal
    .crossVectors(runtime.rightAxis, runtime.upAxis)
    .normalize();
  runtime.upAxis
    .crossVectors(runtime.planeNormal, runtime.rightAxis)
    .normalize();

  const localRadiusX =
    (rect.cornerRadius / Math.max(rect.width, 1)) * runtime.halfWidth * 2;
  const localRadiusY =
    (rect.cornerRadius / Math.max(rect.height, 1)) * runtime.halfHeight * 2;
  runtime.cornerRadius = clamp(
    Math.min(localRadiusX, localRadiusY),
    0,
    Math.min(runtime.halfWidth, runtime.halfHeight) * 0.92,
  );

  return true;
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

function applyObstacleExclusions(
  particle: ParticleState,
  fields: ObstacleExclusionRuntime[],
  localPointDelta: THREE.Vector3,
  displacement: THREE.Vector3,
) {
  displacement.set(0, 0, 0);

  for (const field of fields) {
    accumulateObstacleExclusion(
      particle,
      field,
      localPointDelta,
      displacement,
    );
  }

  const displacementLengthSq = displacement.lengthSq();
  const maxDisplacementSq =
    OBSTACLE_MAX_COMBINED_DISPLACEMENT *
    OBSTACLE_MAX_COMBINED_DISPLACEMENT;

  if (displacementLengthSq > maxDisplacementSq) {
    displacement.multiplyScalar(
      OBSTACLE_MAX_COMBINED_DISPLACEMENT /
        Math.sqrt(displacementLengthSq),
    );
  }

  particle.x += displacement.x;
  particle.y += displacement.y;
  particle.z += displacement.z;
}

function accumulateObstacleExclusion(
  particle: ParticleState,
  field: ObstacleExclusionRuntime,
  localPointDelta: THREE.Vector3,
  displacement: THREE.Vector3,
) {
  localPointDelta.set(
    particle.x - field.center.x,
    particle.y - field.center.y,
    particle.z - field.center.z,
  );
  const planeX = localPointDelta.dot(field.rightAxis);
  const planeY = localPointDelta.dot(field.upAxis);
  const absX = Math.abs(planeX);
  const absY = Math.abs(planeY);
  const innerHalfWidth = Math.max(field.halfWidth - field.cornerRadius, 0);
  const innerHalfHeight = Math.max(field.halfHeight - field.cornerRadius, 0);
  const outsideX = Math.max(absX - innerHalfWidth, 0);
  const outsideY = Math.max(absY - innerHalfHeight, 0);
  const signedDistance =
    Math.hypot(outsideX, outsideY) +
    Math.min(
      Math.max(absX - innerHalfWidth, absY - innerHalfHeight),
      0,
    ) -
    field.cornerRadius;
  const softRadius =
    Math.min(field.halfWidth, field.halfHeight) *
      OBSTACLE_EXCLUSION_SOFT_PAD +
    0.045;

  if (signedDistance >= softRadius) {
    return;
  }

  let pushX = 0;
  let pushY = 0;
  let pushMagnitude = 0;

  if (signedDistance < 0) {
    let routeX = planeX / Math.max(field.halfWidth, 0.0001);
    let routeY = planeY / Math.max(field.halfHeight, 0.0001);

    if (Math.abs(routeX) + Math.abs(routeY) < 0.015) {
      routeX = particle.spreadX;
      routeY = particle.spreadY;
    }

    if (Math.abs(routeX) + Math.abs(routeY) < 0.0001) {
      routeY = 1;
    }

    const routeNorm = Math.pow(
      Math.pow(Math.abs(routeX), OBSTACLE_INTERIOR_ROUTE_EXPONENT) +
        Math.pow(Math.abs(routeY), OBSTACLE_INTERIOR_ROUTE_EXPONENT),
      1 / OBSTACLE_INTERIOR_ROUTE_EXPONENT,
    );
    const boundaryScale = 1 / Math.max(routeNorm, 0.0001);
    const targetX = routeX * boundaryScale * field.halfWidth;
    const targetY = routeY * boundaryScale * field.halfHeight;
    const deltaX = targetX - planeX;
    const deltaY = targetY - planeY;
    const deltaLength = Math.hypot(deltaX, deltaY);

    if (deltaLength > 0.0001) {
      pushX = deltaX / deltaLength;
      pushY = deltaY / deltaLength;
    }

    const overshoot =
      Math.min(field.halfWidth, field.halfHeight) *
        OBSTACLE_EXCLUSION_OVERSHOOT +
      0.03;
    pushMagnitude =
      (deltaLength + overshoot) * OBSTACLE_EXCLUSION_HARD_STRENGTH;
  } else {
    const clampedX = clamp(
      planeX,
      -innerHalfWidth,
      innerHalfWidth,
    );
    const clampedY = clamp(
      planeY,
      -innerHalfHeight,
      innerHalfHeight,
    );
    const deltaX = planeX - clampedX;
    const deltaY = planeY - clampedY;
    const deltaLength = Math.hypot(deltaX, deltaY);

    if (deltaLength > 0.0001) {
      pushX = deltaX / deltaLength;
      pushY = deltaY / deltaLength;
    } else if (field.halfWidth - absX < field.halfHeight - absY) {
      pushX = planeX >= 0 ? 1 : -1;
    } else {
      pushY = planeY >= 0 ? 1 : -1;
    }

    const falloff =
      1 - clamp(signedDistance / Math.max(softRadius, 0.0001), 0, 1);
    pushMagnitude =
      falloff * falloff * OBSTACLE_EXCLUSION_SOFT_STRENGTH;
  }

  pushMagnitude *= field.strength;

  if (pushMagnitude <= 0.0001) {
    return;
  }

  displacement.x +=
    (field.rightAxis.x * pushX + field.upAxis.x * pushY) *
      pushMagnitude +
    field.planeNormal.x *
      pushMagnitude *
      OBSTACLE_EXCLUSION_DEPTH_FACTOR *
      field.strength;
  displacement.y +=
    (field.rightAxis.y * pushX + field.upAxis.y * pushY) *
      pushMagnitude +
    field.planeNormal.y *
      pushMagnitude *
      OBSTACLE_EXCLUSION_DEPTH_FACTOR *
      field.strength;
  displacement.z +=
    (field.rightAxis.z * pushX + field.upAxis.z * pushY) *
      pushMagnitude +
    field.planeNormal.z *
      pushMagnitude *
      OBSTACLE_EXCLUSION_DEPTH_FACTOR *
      field.strength;
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

function usePointCloudSource(maxPoints: number) {
  const [rawAssetPositions, setRawAssetPositions] =
    useState<Float32Array | null>(null);
  const fallbackPositions = useMemo(
    () => generateFallbackFacePoints(maxPoints),
    [maxPoints],
  );

  useEffect(() => {
    const controller = new AbortController();
    const commitPositions = (positions: Float32Array | null) => {
      if (controller.signal.aborted || !positions || !positions.length) {
        return;
      }

      startTransition(() => {
        setRawAssetPositions(positions);
      });
    };
    void fetch(POINT_CLOUD_ASSET_PATH, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Point cloud request failed with ${response.status}`);
        }

        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (buffer.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
          throw new Error("Point cloud asset has an invalid byte length");
        }

        commitPositions(new Float32Array(buffer));
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("Falling back to the generated face point cloud.", error);
        }
      });

    return () => {
      controller.abort();
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
  return useMemo<QualityProfile>(
    () => ({
      noiseMultiplier: reducedMotion ? 0.18 : 0.48,
      textHaloMultiplier: reducedMotion ? 0.12 : 1,
    }),
    [reducedMotion],
  );
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

function sampleSceneProgress(
  progress: number,
  phases: ScenePhase[],
  phaseIndexRef: { current: number },
) {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
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
  const clampedMix = THREE.MathUtils.clamp(linearMix, 0, 1);
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
      shape: blendShape(current.cloud.shape, next.cloud.shape, mix),
      viewportFrame:
        mix < 0.5
          ? current.cloud.viewportFrame
          : next.cloud.viewportFrame,
      obstacleRepulsion: lerp(
        current.cloud.obstacleRepulsion,
        next.cloud.obstacleRepulsion,
        mix,
      ),
      textTargetId: blendTextTargetId(
        current.cloud.textTargetId,
        next.cloud.textTargetId,
        mix,
      ),
      projectFieldPresetId: blendProjectFieldPresetId(
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

function directTransition(value: number) {
  return -1.25 * value ** 3 + 1.5 * value ** 2 + 0.75 * value;
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

function blendProjectFieldPresetId(
  current: SceneCloudState["projectFieldPresetId"],
  next: SceneCloudState["projectFieldPresetId"],
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

function getMouseRepulsionShapeWeight(shape: PointCloudShape) {
  switch (shape) {
    case "face":
      return 1;
    case "text":
      return 0.18;
    case "project-field":
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
