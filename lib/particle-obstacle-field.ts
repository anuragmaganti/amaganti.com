import * as THREE from "three";

import type { ParticleState } from "@/lib/particle-motion";
import { createParticleObstacleScreenFrame } from "@/lib/particle-obstacle-geometry";
import type {
  ParticleObstacleEntry,
  ParticleObstacleGeometry,
  ParticleObstacleMotion,
  ParticleObstacleSnapshot,
} from "@/lib/particle-obstacle-store";

const FIELD_STRENGTH_SMOOTHING = 11;
const FIELD_VELOCITY_SMOOTHING = 12;
const MOTION_DECAY_SECONDS = 0.3;
const MIN_FIELD_STRENGTH = 0.001;
const MIN_FLOW_SPEED = 0.008;
const FLOW_RADIUS_RATIO = 0.62;
const FLOW_RADIUS_MIN = 0.16;
const FLOW_DISPLACEMENT_RATIO = 0.24;
const LEADING_PRESSURE = 0.82;
const LEADING_SPLIT = 0.68;
const LEADING_SPLIT_BLEND_RATIO = 0.34;
const EDGE_SLIP = 0.5;
const TRAILING_REFILL_RESPONSE = 11;
const FLOW_DEPTH = 0.08;
const FLOW_RESPONSE = 15;
const FLOW_RETURN = 6;
const COLLISION_MARGIN = 0.018;
const MAX_PARTICLE_OFFSET = 0.42;
const PARTICLE_MOTION_EPSILON = 0.0005;

export type ParticleObstacleRuntime = {
  id: string;
  present: boolean;
  geometry: ParticleObstacleGeometry | null;
  motion: ParticleObstacleMotion | null;
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
  flowVelocity: THREE.Vector2;
  targetFlowVelocity: THREE.Vector2;
  angularVelocity: number;
  targetAngularVelocity: number;
};

export type ParticleObstacleFrame = {
  fields: ParticleObstacleRuntime[];
  unsettled: boolean;
};

type ParticleFlowAccumulator = {
  targetX: number;
  targetY: number;
  targetZ: number;
  correctionX: number;
  correctionY: number;
  correctionZ: number;
  refillWeight: number;
};

export type ParticleObstacleResources = {
  runtimes: Map<string, ParticleObstacleRuntime>;
  frame: ParticleObstacleFrame;
  ndcPoint: THREE.Vector2;
  worldPoint: THREE.Vector3;
  accumulator: ParticleFlowAccumulator;
};

export type ParticleObstacleFlowState = {
  offsets: Float32Array;
};

export function createParticleObstacleResources(): ParticleObstacleResources {
  return {
    runtimes: new Map(),
    frame: { fields: [], unsettled: false },
    ndcPoint: new THREE.Vector2(),
    worldPoint: new THREE.Vector3(),
    accumulator: {
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      correctionX: 0,
      correctionY: 0,
      correctionZ: 0,
      refillWeight: 0,
    },
  };
}

export function createParticleObstacleFlowState(
  pointCount: number,
): ParticleObstacleFlowState {
  return {
    offsets: new Float32Array(pointCount * 3),
  };
}

export function resolveParticleObstacleFrame({
  obstacleFlow,
  obstacleSnapshots,
  delta,
  perspectiveCamera,
  raycaster,
  interactionPlane,
  cloud,
  resources,
}: {
  obstacleFlow: number;
  obstacleSnapshots: ParticleObstacleSnapshot;
  delta: number;
  perspectiveCamera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  interactionPlane: THREE.Plane;
  cloud: THREE.Points;
  resources: ParticleObstacleResources;
}) {
  const { frame, ndcPoint, runtimes, worldPoint } = resources;
  const now = performance.now();
  const strengthLerp = 1 - Math.exp(-delta * FIELD_STRENGTH_SMOOTHING);
  const velocityLerp = 1 - Math.exp(-delta * FIELD_VELOCITY_SMOOTHING);

  frame.fields.length = 0;
  frame.unsettled = false;

  for (const runtime of runtimes.values()) {
    runtime.present = false;
    runtime.targetStrength = 0;
  }

  for (const snapshot of obstacleSnapshots) {
    const targetStrength = snapshot.strength * obstacleFlow;
    const runtime = getObstacleRuntime(runtimes, snapshot, targetStrength);

    runtime.present = true;
    runtime.geometry = snapshot.geometry;
    runtime.motion = snapshot.motion;
    runtime.targetStrength = targetStrength;
  }

  for (const [id, runtime] of runtimes) {
    runtime.strength = lerp(
      runtime.strength,
      runtime.targetStrength,
      strengthLerp,
    );

    const projected =
      runtime.geometry &&
      projectObstacleIntoCloud({
        runtime,
        perspectiveCamera,
        raycaster,
        interactionPlane,
        obstacleNdcPoint: ndcPoint,
        worldInteractionPoint: worldPoint,
        cloud,
      });

    if (projected) {
      updateRuntimeFlowVelocity(runtime, now, velocityLerp);
    } else {
      runtime.targetFlowVelocity.set(0, 0);
      runtime.flowVelocity.lerp(runtime.targetFlowVelocity, velocityLerp);
      runtime.targetAngularVelocity = 0;
      runtime.angularVelocity = lerp(
        runtime.angularVelocity,
        runtime.targetAngularVelocity,
        velocityLerp,
      );
    }

    const strengthUnsettled =
      Math.abs(runtime.strength - runtime.targetStrength) > 0.00004;
    const velocityUnsettled =
      runtime.flowVelocity.distanceToSquared(runtime.targetFlowVelocity) >
        0.00001 ||
      runtime.flowVelocity.lengthSq() > MIN_FLOW_SPEED * MIN_FLOW_SPEED ||
      Math.abs(runtime.angularVelocity - runtime.targetAngularVelocity) >
        0.0001 ||
      Math.abs(runtime.angularVelocity) > 0.0001;

    frame.unsettled ||= strengthUnsettled || velocityUnsettled;

    if (
      projected &&
      runtime.strength > MIN_FIELD_STRENGTH
    ) {
      frame.fields.push(runtime);
    }

    if (
      !runtime.present &&
      runtime.strength <= MIN_FIELD_STRENGTH &&
      runtime.flowVelocity.lengthSq() <= MIN_FLOW_SPEED * MIN_FLOW_SPEED
    ) {
      runtimes.delete(id);
    }
  }

  return frame;
}

export function applyParticleObstacleFlow(
  particle: ParticleState,
  particleIndex: number,
  fields: ParticleObstacleRuntime[],
  flowState: ParticleObstacleFlowState,
  resources: ParticleObstacleResources,
  delta: number,
) {
  const offsetIndex = particleIndex * 3;
  const { offsets } = flowState;
  const accumulator = resources.accumulator;
  let offsetX = offsets[offsetIndex];
  let offsetY = offsets[offsetIndex + 1];
  let offsetZ = offsets[offsetIndex + 2];

  accumulator.targetX = 0;
  accumulator.targetY = 0;
  accumulator.targetZ = 0;
  accumulator.correctionX = 0;
  accumulator.correctionY = 0;
  accumulator.correctionZ = 0;
  accumulator.refillWeight = 0;

  // The authored morph target stays immutable. The card contributes a
  // temporary viscous offset plus an immediate collision correction.
  const displacedX = particle.x + offsetX;
  const displacedY = particle.y + offsetY;
  const displacedZ = particle.z + offsetZ;

  for (const field of fields) {
    accumulateObstacleFlow(
      particle,
      displacedX,
      displacedY,
      displacedZ,
      field,
      accumulator,
    );
  }

  const targetLength = Math.hypot(
    accumulator.targetX,
    accumulator.targetY,
    accumulator.targetZ,
  );
  if (targetLength > MAX_PARTICLE_OFFSET) {
    const targetScale = MAX_PARTICLE_OFFSET / targetLength;
    accumulator.targetX *= targetScale;
    accumulator.targetY *= targetScale;
    accumulator.targetZ *= targetScale;
  }

  const responseRate =
    targetLength > PARTICLE_MOTION_EPSILON
      ? FLOW_RESPONSE
      : lerp(
          FLOW_RETURN,
          TRAILING_REFILL_RESPONSE,
          accumulator.refillWeight,
        );
  const response = 1 - Math.exp(-Math.min(delta, 1 / 30) * responseRate);
  offsetX = lerp(offsetX, accumulator.targetX, response);
  offsetY = lerp(offsetY, accumulator.targetY, response);
  offsetZ = lerp(offsetZ, accumulator.targetZ, response);

  if (
    targetLength <= PARTICLE_MOTION_EPSILON &&
    Math.abs(offsetX) <= PARTICLE_MOTION_EPSILON &&
    Math.abs(offsetY) <= PARTICLE_MOTION_EPSILON &&
    Math.abs(offsetZ) <= PARTICLE_MOTION_EPSILON
  ) {
    offsetX = 0;
    offsetY = 0;
    offsetZ = 0;
  }

  offsets[offsetIndex] = offsetX;
  offsets[offsetIndex + 1] = offsetY;
  offsets[offsetIndex + 2] = offsetZ;

  particle.x += offsetX + accumulator.correctionX;
  particle.y += offsetY + accumulator.correctionY;
  particle.z += offsetZ + accumulator.correctionZ;

  return (
    targetLength > PARTICLE_MOTION_EPSILON ||
    Math.abs(offsetX) > PARTICLE_MOTION_EPSILON ||
    Math.abs(offsetY) > PARTICLE_MOTION_EPSILON ||
    Math.abs(offsetZ) > PARTICLE_MOTION_EPSILON
  );
}

function getObstacleRuntime(
  runtimes: Map<string, ParticleObstacleRuntime>,
  snapshot: ParticleObstacleEntry,
  initialStrength: number,
) {
  const existing = runtimes.get(snapshot.id);

  if (existing) {
    return existing;
  }

  const runtime: ParticleObstacleRuntime = {
    id: snapshot.id,
    present: true,
    geometry: snapshot.geometry,
    motion: snapshot.motion,
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
    flowVelocity: new THREE.Vector2(),
    targetFlowVelocity: new THREE.Vector2(),
    angularVelocity: 0,
    targetAngularVelocity: 0,
  };

  runtimes.set(snapshot.id, runtime);
  return runtime;
}

function updateRuntimeFlowVelocity(
  runtime: ParticleObstacleRuntime,
  now: number,
  velocityLerp: number,
) {
  const geometry = runtime.geometry;
  const motion = runtime.motion;

  if (!geometry || !motion) {
    runtime.targetFlowVelocity.set(0, 0);
    runtime.flowVelocity.lerp(runtime.targetFlowVelocity, velocityLerp);
    runtime.targetAngularVelocity = 0;
    runtime.angularVelocity = lerp(
      runtime.angularVelocity,
      runtime.targetAngularVelocity,
      velocityLerp,
    );
    return;
  }

  const motionAge = Math.max((now - motion.sampledAt) / 1000, 0);
  const motionDecay = Math.exp(-motionAge / MOTION_DECAY_SECONDS);
  const localUnitsPerPixelX =
    (runtime.halfWidth * 2) / Math.max(geometry.width, 1);
  const localUnitsPerPixelY =
    (runtime.halfHeight * 2) / Math.max(geometry.height, 1);
  const cosine = Math.cos(geometry.angle);
  const sine = Math.sin(geometry.angle);
  const localVelocityX =
    motion.velocityX * cosine + motion.velocityY * sine;
  const localVelocityY =
    motion.velocityX * sine - motion.velocityY * cosine;

  runtime.targetFlowVelocity.set(
    localVelocityX * localUnitsPerPixelX * motionDecay,
    localVelocityY * localUnitsPerPixelY * motionDecay,
  );
  runtime.flowVelocity.lerp(runtime.targetFlowVelocity, velocityLerp);
  runtime.targetAngularVelocity = motion.angularVelocity * motionDecay;
  runtime.angularVelocity = lerp(
    runtime.angularVelocity,
    runtime.targetAngularVelocity,
    velocityLerp,
  );
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
  runtime: ParticleObstacleRuntime;
  perspectiveCamera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  interactionPlane: THREE.Plane;
  obstacleNdcPoint: THREE.Vector2;
  worldInteractionPoint: THREE.Vector3;
  cloud: THREE.Points;
}) {
  const geometry = runtime.geometry;

  if (!geometry) {
    return false;
  }

  const screenFrame = createParticleObstacleScreenFrame(geometry);
  const projected =
    projectScreenPointToLocal(
      screenFrame.center.x,
      screenFrame.center.y,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      obstacleNdcPoint,
      worldInteractionPoint,
      runtime.center,
      cloud,
    ) &&
    projectScreenPointToLocal(
      screenFrame.leftMid.x,
      screenFrame.leftMid.y,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      obstacleNdcPoint,
      worldInteractionPoint,
      runtime.leftMid,
      cloud,
    ) &&
    projectScreenPointToLocal(
      screenFrame.rightMid.x,
      screenFrame.rightMid.y,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      obstacleNdcPoint,
      worldInteractionPoint,
      runtime.rightMid,
      cloud,
    ) &&
    projectScreenPointToLocal(
      screenFrame.topMid.x,
      screenFrame.topMid.y,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      obstacleNdcPoint,
      worldInteractionPoint,
      runtime.topMid,
      cloud,
    ) &&
    projectScreenPointToLocal(
      screenFrame.bottomMid.x,
      screenFrame.bottomMid.y,
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
    (geometry.cornerRadius / Math.max(geometry.width, 1)) *
    runtime.halfWidth *
    2;
  const localRadiusY =
    (geometry.cornerRadius / Math.max(geometry.height, 1)) *
    runtime.halfHeight *
    2;
  runtime.cornerRadius = clamp(
    Math.min(localRadiusX, localRadiusY),
    0,
    Math.min(runtime.halfWidth, runtime.halfHeight) * 0.92,
  );

  return true;
}

function accumulateObstacleFlow(
  particle: ParticleState,
  particleX: number,
  particleY: number,
  particleZ: number,
  field: ParticleObstacleRuntime,
  accumulator: ParticleFlowAccumulator,
) {
  const deltaX = particleX - field.center.x;
  const deltaY = particleY - field.center.y;
  const deltaZ = particleZ - field.center.z;
  const planeX =
    deltaX * field.rightAxis.x +
    deltaY * field.rightAxis.y +
    deltaZ * field.rightAxis.z;
  const planeY =
    deltaX * field.upAxis.x +
    deltaY * field.upAxis.y +
    deltaZ * field.upAxis.z;
  const signX = planeX >= 0 ? 1 : -1;
  const signY = planeY >= 0 ? 1 : -1;
  const innerHalfWidth = Math.max(field.halfWidth - field.cornerRadius, 0);
  const innerHalfHeight = Math.max(field.halfHeight - field.cornerRadius, 0);
  const distanceX = Math.abs(planeX) - innerHalfWidth;
  const distanceY = Math.abs(planeY) - innerHalfHeight;
  const outsideX = Math.max(distanceX, 0);
  const outsideY = Math.max(distanceY, 0);
  const outsideLength = Math.hypot(outsideX, outsideY);
  const signedDistance =
    outsideLength +
    Math.min(Math.max(distanceX, distanceY), 0) -
    field.cornerRadius;
  let normalX = 0;
  let normalY = 0;

  if (outsideLength > 0.0001) {
    normalX = (outsideX / outsideLength) * signX;
    normalY = (outsideY / outsideLength) * signY;
  } else if (distanceX > distanceY) {
    normalX = signX;
  } else {
    normalY = signY;
  }

  // Card translation and rotation both contribute to the local surface flow.
  // CSS angles increase clockwise, so their local Cartesian rotation is
  // (angularVelocity * y, -angularVelocity * x).
  const flowX =
    field.flowVelocity.x + field.angularVelocity * planeY;
  const flowY =
    field.flowVelocity.y - field.angularVelocity * planeX;
  const flowSpeed = Math.hypot(flowX, flowY);
  const hasFlow = flowSpeed > MIN_FLOW_SPEED;
  const motionX = hasFlow ? flowX / flowSpeed : 0;
  const motionY = hasFlow ? flowY / flowSpeed : 0;
  const normalMotion = normalX * motionX + normalY * motionY;

  if (signedDistance < 0) {
    const nearestCorrection =
      (-signedDistance + COLLISION_MARGIN) * field.strength;

    if (hasFlow && normalMotion < -0.05) {
      const alongCoordinate = planeX * motionX + planeY * motionY;
      const alongExtent =
        Math.abs(motionX) * field.halfWidth +
        Math.abs(motionY) * field.halfHeight;
      const leadingCorrection =
        Math.max(
          alongExtent - alongCoordinate + COLLISION_MARGIN,
          -signedDistance + COLLISION_MARGIN,
        ) * field.strength;

      // A moving obstacle carries particles out through its leading face. It
      // never ejects them onto the trailing face, which would create a second
      // magnetic-looking particle line behind the card.
      addPlaneVector(
        accumulator,
        field,
        motionX * leadingCorrection,
        motionY * leadingCorrection,
        0,
        true,
      );
    } else {
      addPlaneVector(
        accumulator,
        field,
        normalX * nearestCorrection,
        normalY * nearestCorrection,
        0,
        true,
      );
    }
  }

  if (!hasFlow) {
    return;
  }

  const sideX = -motionY;
  const sideY = motionX;
  const minHalfSize = Math.min(field.halfWidth, field.halfHeight);
  const flowRadius = minHalfSize * FLOW_RADIUS_RATIO + FLOW_RADIUS_MIN;
  const surfaceWeight = smoothstep01(
    1 - clamp(Math.max(signedDistance, 0) / flowRadius, 0, 1),
  );
  const speedWeight = Math.sqrt(
    clamp(flowSpeed / Math.max(minHalfSize * 1.5, 0.001), 0, 1),
  );
  const displacement =
    minHalfSize *
    FLOW_DISPLACEMENT_RATIO *
    field.strength *
    speedWeight;
  const leadingWeight = Math.max(normalMotion, 0) * surfaceWeight;
  const tangentX = motionX - normalX * normalMotion;
  const tangentY = motionY - normalY * normalMotion;
  const sideCoordinate = planeX * sideX + planeY * sideY;
  const sideExtent =
    Math.abs(sideX) * field.halfWidth +
    Math.abs(sideY) * field.halfHeight;
  // Ease the flow through its centerline instead of sending each half of the
  // leading edge in an immediately opposite direction. The old binary split
  // created a visible slit through the particles directly in front of a card.
  const splitDirection = smoothSigned(
    sideCoordinate /
      Math.max(sideExtent * LEADING_SPLIT_BLEND_RATIO, 0.001),
  );
  const splitWeight =
    leadingWeight *
    (1 - clamp(Math.abs(sideCoordinate) / Math.max(sideExtent, 0.001), 0, 1));
  const targetX =
    normalX * leadingWeight * LEADING_PRESSURE +
    sideX * splitDirection * splitWeight * LEADING_SPLIT +
    tangentX * surfaceWeight * EDGE_SLIP;
  const targetY =
    normalY * leadingWeight * LEADING_PRESSURE +
    sideY * splitDirection * splitWeight * LEADING_SPLIT +
    tangentY * surfaceWeight * EDGE_SLIP;

  const alongCoordinate = planeX * motionX + planeY * motionY;
  const alongExtent =
    Math.abs(motionX) * field.halfWidth +
    Math.abs(motionY) * field.halfHeight;
  const behindDistance = -(alongCoordinate + alongExtent);
  const wakeLength = alongExtent * 0.9 + minHalfSize * 0.72;

  if (behindDistance >= 0 && behindDistance < wakeLength) {
    const longitudinalWeight = 1 - behindDistance / wakeLength;
    const lateralWeight =
      1 -
      clamp(
        (Math.abs(sideCoordinate) - sideExtent * 0.72) /
          Math.max(sideExtent * 0.72, 0.001),
        0,
        1,
      );
    const wakeWeight =
      longitudinalWeight * longitudinalWeight * smoothstep01(lateralWeight);
    // The wake only accelerates each particle's return to its authored field.
    // It does not pull particles toward either the card or its centerline.
    accumulator.refillWeight = Math.max(
      accumulator.refillWeight,
      wakeWeight * field.strength,
    );
  }

  const sideSurfaceWeight =
    (1 - Math.abs(normalMotion)) * surfaceWeight;
  const depthFlow =
    particle.spreadZ *
    Math.max(leadingWeight, sideSurfaceWeight) *
    FLOW_DEPTH;

  addPlaneVector(
    accumulator,
    field,
    targetX * displacement,
    targetY * displacement,
    depthFlow * displacement,
    false,
  );
}

function addPlaneVector(
  accumulator: ParticleFlowAccumulator,
  field: ParticleObstacleRuntime,
  planeX: number,
  planeY: number,
  depth: number,
  correction: boolean,
) {
  const x =
    field.rightAxis.x * planeX +
    field.upAxis.x * planeY +
    field.planeNormal.x * depth;
  const y =
    field.rightAxis.y * planeX +
    field.upAxis.y * planeY +
    field.planeNormal.y * depth;
  const z =
    field.rightAxis.z * planeX +
    field.upAxis.z * planeY +
    field.planeNormal.z * depth;

  if (correction) {
    accumulator.correctionX += x;
    accumulator.correctionY += y;
    accumulator.correctionZ += z;
    return;
  }

  accumulator.targetX += x;
  accumulator.targetY += y;
  accumulator.targetZ += z;
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

function smoothstep01(value: number) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function smoothSigned(value: number) {
  return Math.sign(value) * smoothstep01(Math.abs(value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
