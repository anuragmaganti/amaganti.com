import * as THREE from "three";

import type {
  ParticleObstacleEntry,
  ParticleObstacleRect,
  ParticleObstacleSnapshot,
} from "@/lib/particle-obstacle-store";
import type { ParticleState } from "@/lib/particle-motion";

const OBSTACLE_EXCLUSION_SMOOTHING = 13;
const OBSTACLE_EXCLUSION_SOFT_PAD = 0.22;
const OBSTACLE_EXCLUSION_SOFT_STRENGTH = 0.14;
const OBSTACLE_EXCLUSION_HARD_STRENGTH = 1;
const OBSTACLE_EXCLUSION_OVERSHOOT = 0.1;
const OBSTACLE_EXCLUSION_DEPTH_FACTOR = 0.16;
const OBSTACLE_INTERIOR_ROUTE_EXPONENT = 6;
const OBSTACLE_MAX_COMBINED_DISPLACEMENT = 0.9;
const OBSTACLE_STRENGTH_EPSILON = 0.001;

export type ObstacleExclusionRuntime = {
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

export type ObstacleExclusionResources = {
  runtimes: Map<string, ObstacleExclusionRuntime>;
  frame: ObstacleExclusionFrame;
  ndcPoint: THREE.Vector2;
  worldPoint: THREE.Vector3;
  localPointDelta: THREE.Vector3;
  displacement: THREE.Vector3;
};

export function createObstacleExclusionResources(): ObstacleExclusionResources {
  return {
    runtimes: new Map(),
    frame: { fields: [], unsettled: false },
    ndcPoint: new THREE.Vector2(),
    worldPoint: new THREE.Vector3(),
    localPointDelta: new THREE.Vector3(),
    displacement: new THREE.Vector3(),
  };
}

export function resolveObstacleExclusionFrame({
  obstacleRepulsion,
  obstacleSnapshots,
  delta,
  perspectiveCamera,
  raycaster,
  interactionPlane,
  cloud,
  resources,
}: {
  obstacleRepulsion: number;
  obstacleSnapshots: ParticleObstacleSnapshot;
  delta: number;
  perspectiveCamera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  interactionPlane: THREE.Plane;
  cloud: THREE.Points;
  resources: ObstacleExclusionResources;
}) {
  const { frame, ndcPoint, runtimes, worldPoint } = resources;
  frame.fields.length = 0;

  for (const runtime of runtimes.values()) {
    runtime.present = false;
    runtime.targetStrength = 0;
  }

  for (const snapshot of obstacleSnapshots) {
    const targetStrength = snapshot.strength * obstacleRepulsion;
    const runtime = getObstacleRuntime(runtimes, snapshot, targetStrength);
    runtime.present = true;
    runtime.rect = snapshot.rect;
    runtime.targetStrength = targetStrength;
  }

  const exclusionLerp =
    1 - Math.exp(-delta * OBSTACLE_EXCLUSION_SMOOTHING);
  frame.unsettled = false;

  for (const [id, runtime] of runtimes) {
    runtime.strength = lerp(
      runtime.strength,
      runtime.targetStrength,
      exclusionLerp,
    );
    frame.unsettled ||=
      Math.abs(runtime.strength - runtime.targetStrength) > 0.00004;

    if (
      !runtime.present &&
      runtime.strength <= OBSTACLE_STRENGTH_EPSILON &&
      runtime.targetStrength <= OBSTACLE_STRENGTH_EPSILON
    ) {
      runtimes.delete(id);
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
        obstacleNdcPoint: ndcPoint,
        worldInteractionPoint: worldPoint,
        cloud,
      })
    ) {
      frame.fields.push(runtime);
    }
  }

  return frame;
}

export function applyObstacleExclusions(
  particle: ParticleState,
  fields: ObstacleExclusionRuntime[],
  resources: ObstacleExclusionResources,
) {
  const { displacement, localPointDelta } = resources;
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
    const clampedX = clamp(planeX, -innerHalfWidth, innerHalfWidth);
    const clampedY = clamp(planeY, -innerHalfHeight, innerHalfHeight);
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
    (field.rightAxis.x * pushX + field.upAxis.x * pushY) * pushMagnitude +
    field.planeNormal.x *
      pushMagnitude *
      OBSTACLE_EXCLUSION_DEPTH_FACTOR *
      field.strength;
  displacement.y +=
    (field.rightAxis.y * pushX + field.upAxis.y * pushY) * pushMagnitude +
    field.planeNormal.y *
      pushMagnitude *
      OBSTACLE_EXCLUSION_DEPTH_FACTOR *
      field.strength;
  displacement.z +=
    (field.rightAxis.z * pushX + field.upAxis.z * pushY) * pushMagnitude +
    field.planeNormal.z *
      pushMagnitude *
      OBSTACLE_EXCLUSION_DEPTH_FACTOR *
      field.strength;
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

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
