import * as THREE from "three";

import type { ParticleState } from "@/lib/particle-motion";
import {
  createParticleObstacleScreenFrame,
  writeParticleObstacleScreenFrame,
  type ParticleObstacleScreenFrame,
} from "@/lib/particle-obstacle-geometry";
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
const FLOW_INFLUENCE_RADIUS = 2.7;
const FLOW_INFLUENCE_RADIUS_SQUARED =
  FLOW_INFLUENCE_RADIUS * FLOW_INFLUENCE_RADIUS;
const FLOW_DISPLACEMENT_RATIO = 0.28;
const FLOW_VISCOSITY_SWIRL = 0.075;
const TRAILING_FLOW_RATIO = 0.62;
const RESTING_PRESSURE_RATIO = 0.38;
const RESTING_PRESSURE_VARIANCE = 0.22;
const RESTING_TANGENTIAL_DRIFT = 0.16;
const RESTING_DEPTH_DRIFT = 0.14;
const TRAILING_REFILL_STIFFNESS = 42;
const FLOW_DEPTH = 0.12;
const FLOW_STIFFNESS = 46;
const FLOW_DAMPING = 10.5;
const RETURN_STIFFNESS = 22;
const RETURN_DAMPING = 8.5;
const MAX_PARTICLE_SPEED = 1.8;
const MAX_PARTICLE_OFFSET = 0.38;
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
  screenFrame: ParticleObstacleScreenFrame;
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
  active: Uint8Array;
  offsets: Float32Array;
  velocities: Float32Array;
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
      refillWeight: 0,
    },
  };
}

export function createParticleObstacleFlowState(
  pointCount: number,
): ParticleObstacleFlowState {
  return {
    active: new Uint8Array(pointCount),
    offsets: new Float32Array(pointCount * 3),
    velocities: new Float32Array(pointCount * 3),
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
    if (!snapshot.active) {
      continue;
    }

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
  const { active, offsets, velocities } = flowState;
  const accumulator = resources.accumulator;
  let offsetX = offsets[offsetIndex];
  let offsetY = offsets[offsetIndex + 1];
  let offsetZ = offsets[offsetIndex + 2];
  let velocityX = velocities[offsetIndex];
  let velocityY = velocities[offsetIndex + 1];
  let velocityZ = velocities[offsetIndex + 2];
  const wasTracked =
    active[particleIndex] === 1 ||
    offsetX !== 0 ||
    offsetY !== 0 ||
    offsetZ !== 0 ||
    velocityX !== 0 ||
    velocityY !== 0 ||
    velocityZ !== 0;

  accumulator.targetX = 0;
  accumulator.targetY = 0;
  accumulator.targetZ = 0;
  accumulator.refillWeight = 0;

  // The authored morph target stays immutable. Card pressure only changes the
  // persistent offset and velocity, so the response carries momentum instead
  // of snapping particles onto the obstacle boundary.
  const displacedX = particle.x + offsetX;
  const displacedY = particle.y + offsetY;
  const displacedZ = particle.z + offsetZ;
  let hasFieldInfluence = false;

  for (const field of fields) {
    hasFieldInfluence =
      accumulateObstacleFlow(
        particle,
        displacedX,
        displacedY,
        displacedZ,
        field,
        accumulator,
      ) || hasFieldInfluence;
  }

  // Untouched particles stop after the conservative broad phase. Tracked
  // particles continue through the spring until all stored motion is gone.
  if (!hasFieldInfluence && !wasTracked) {
    return false;
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

  const timestep = Math.min(delta, 1 / 30);
  const targetActive = targetLength > PARTICLE_MOTION_EPSILON;
  const stiffness = targetActive
    ? FLOW_STIFFNESS
    : lerp(
        RETURN_STIFFNESS,
        TRAILING_REFILL_STIFFNESS,
        accumulator.refillWeight,
      );
  const damping = targetActive
    ? FLOW_DAMPING
    : lerp(RETURN_DAMPING, FLOW_DAMPING, accumulator.refillWeight);

  velocityX +=
    ((accumulator.targetX - offsetX) * stiffness - velocityX * damping) *
    timestep;
  velocityY +=
    ((accumulator.targetY - offsetY) * stiffness - velocityY * damping) *
    timestep;
  velocityZ +=
    ((accumulator.targetZ - offsetZ) * stiffness - velocityZ * damping) *
    timestep;

  const velocityLength = Math.hypot(velocityX, velocityY, velocityZ);
  if (velocityLength > MAX_PARTICLE_SPEED) {
    const velocityScale = MAX_PARTICLE_SPEED / velocityLength;
    velocityX *= velocityScale;
    velocityY *= velocityScale;
    velocityZ *= velocityScale;
  }

  offsetX += velocityX * timestep;
  offsetY += velocityY * timestep;
  offsetZ += velocityZ * timestep;

  const offsetLength = Math.hypot(offsetX, offsetY, offsetZ);
  if (offsetLength > MAX_PARTICLE_OFFSET) {
    const offsetScale = MAX_PARTICLE_OFFSET / offsetLength;
    offsetX *= offsetScale;
    offsetY *= offsetScale;
    offsetZ *= offsetScale;
  }

  const remainingError = Math.hypot(
    accumulator.targetX - offsetX,
    accumulator.targetY - offsetY,
    accumulator.targetZ - offsetZ,
  );
  const remainingVelocity = Math.hypot(velocityX, velocityY, velocityZ);

  if (
    !hasFieldInfluence &&
    Math.abs(offsetX) <= PARTICLE_MOTION_EPSILON &&
    Math.abs(offsetY) <= PARTICLE_MOTION_EPSILON &&
    Math.abs(offsetZ) <= PARTICLE_MOTION_EPSILON &&
    remainingError <= PARTICLE_MOTION_EPSILON &&
    remainingVelocity <= PARTICLE_MOTION_EPSILON
  ) {
    offsetX = 0;
    offsetY = 0;
    offsetZ = 0;
    velocityX = 0;
    velocityY = 0;
    velocityZ = 0;
  }

  offsets[offsetIndex] = offsetX;
  offsets[offsetIndex + 1] = offsetY;
  offsets[offsetIndex + 2] = offsetZ;
  velocities[offsetIndex] = velocityX;
  velocities[offsetIndex + 1] = velocityY;
  velocities[offsetIndex + 2] = velocityZ;
  active[particleIndex] =
    offsetX !== 0 ||
    offsetY !== 0 ||
    offsetZ !== 0 ||
    velocityX !== 0 ||
    velocityY !== 0 ||
    velocityZ !== 0
      ? 1
      : 0;

  particle.x += offsetX;
  particle.y += offsetY;
  particle.z += offsetZ;

  return (
    remainingVelocity > PARTICLE_MOTION_EPSILON ||
    remainingError > PARTICLE_MOTION_EPSILON
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
    screenFrame: createParticleObstacleScreenFrame(snapshot.geometry),
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

  const screenFrame = writeParticleObstacleScreenFrame(
    geometry,
    runtime.screenFrame,
  );
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
  // Card translation and rotation both contribute to the local surface flow.
  // CSS angles increase clockwise, so their local Cartesian rotation is
  // (angularVelocity * y, -angularVelocity * x).
  const flowX = field.flowVelocity.x + field.angularVelocity * planeY;
  const flowY = field.flowVelocity.y - field.angularVelocity * planeX;
  const flowSpeedSquared = flowX * flowX + flowY * flowY;
  const hasFlow = flowSpeedSquared > MIN_FLOW_SPEED * MIN_FLOW_SPEED;
  const cornerRadius = clamp(
    field.cornerRadius,
    0,
    Math.min(field.halfWidth, field.halfHeight),
  );
  const minHalfSize = Math.min(field.halfWidth, field.halfHeight);
  const innerHalfWidth = Math.max(field.halfWidth - cornerRadius, 0);
  const innerHalfHeight = Math.max(field.halfHeight - cornerRadius, 0);
  let flowSpeed = 0;
  let motionX = 0;
  let motionY = 0;
  let sideX = 0;
  let sideY = 0;
  let alongCoordinate = 0;
  let sideCoordinate = 0;
  let alongExtent = 0;
  let sideExtent = 0;
  let normalizedAlong = 0;
  let normalizedSide = 0;
  let normalizedRadiusSquared = 0;

  if (hasFlow) {
    flowSpeed = Math.sqrt(flowSpeedSquared);
    motionX = flowX / flowSpeed;
    motionY = flowY / flowSpeed;
    sideX = -motionY;
    sideY = motionX;
    alongCoordinate = planeX * motionX + planeY * motionY;
    sideCoordinate = planeX * sideX + planeY * sideY;
    // The flow basis is normalized, so the rounded-rectangle support needs no
    // direction-length square root. This rectangle is the cheap first reject.
    alongExtent =
      Math.abs(motionX) * innerHalfWidth +
      Math.abs(motionY) * innerHalfHeight +
      cornerRadius;
    sideExtent =
      Math.abs(sideX) * innerHalfWidth +
      Math.abs(sideY) * innerHalfHeight +
      cornerRadius;

    if (
      Math.abs(alongCoordinate) >
        alongExtent * FLOW_INFLUENCE_RADIUS ||
      Math.abs(sideCoordinate) > sideExtent * FLOW_INFLUENCE_RADIUS
    ) {
      return false;
    }

    normalizedAlong = alongCoordinate / Math.max(alongExtent, 0.001);
    normalizedSide = sideCoordinate / Math.max(sideExtent, 0.001);
    normalizedRadiusSquared =
      normalizedAlong * normalizedAlong + normalizedSide * normalizedSide;

    // This is the exact zero-influence boundary used by the potential flow.
    // Rejecting here skips rounded-SDF work in the outer rectangle's corners.
    if (normalizedRadiusSquared > FLOW_INFLUENCE_RADIUS_SQUARED) {
      return false;
    }
  } else if (
    Math.abs(planeX) > field.halfWidth ||
    Math.abs(planeY) > field.halfHeight
  ) {
    // With no card motion, only the soft interior pressure can contribute.
    return false;
  }

  const signX =
    Math.abs(planeX) > 0.0001
      ? Math.sign(planeX)
      : particle.spreadX >= 0
        ? 1
        : -1;
  const signY =
    Math.abs(planeY) > 0.0001
      ? Math.sign(planeY)
      : particle.spreadY >= 0
        ? 1
        : -1;
  const distanceX = Math.abs(planeX) - innerHalfWidth;
  const distanceY = Math.abs(planeY) - innerHalfHeight;
  const outsideX = Math.max(distanceX, 0);
  const outsideY = Math.max(distanceY, 0);
  const outsideLength = Math.hypot(outsideX, outsideY);
  const signedDistance =
    outsideLength +
    Math.min(Math.max(distanceX, distanceY), 0) -
    cornerRadius;
  let normalX = 0;
  let normalY = 0;
  let influenced = false;

  if (outsideLength > 0.0001) {
    normalX = (outsideX / outsideLength) * signX;
    normalY = (outsideY / outsideLength) * signY;
  } else if (distanceX > distanceY) {
    normalX = signX;
  } else {
    normalY = signY;
  }

  if (signedDistance < 0) {
    influenced = true;
    const surfaceTangentX = -normalY;
    const surfaceTangentY = normalX;
    const seedVariation =
      1 + particle.spreadZ * 2 * RESTING_PRESSURE_VARIANCE;
    const restingPressure =
      -signedDistance *
      RESTING_PRESSURE_RATIO *
      seedVariation *
      field.strength;
    const tangentDrift =
      particle.spreadZ * 2 * restingPressure * RESTING_TANGENTIAL_DRIFT;

    // A resting card creates a compliant low-density volume, not a rigid
    // contour. Deep particles move more than shallow ones and retain seeded
    // tangential/depth variation, so they never converge on one support line.
    addPlaneVector(
      accumulator,
      field,
      normalX * restingPressure + surfaceTangentX * tangentDrift,
      normalY * restingPressure + surfaceTangentY * tangentDrift,
      particle.spreadZ * restingPressure * RESTING_DEPTH_DRIFT,
    );
  }

  if (!hasFlow) {
    return influenced;
  }

  const speedWeight = Math.sqrt(
    clamp(flowSpeed / Math.max(minHalfSize * 1.2, 0.001), 0, 1),
  );
  const displacement =
    minHalfSize * FLOW_DISPLACEMENT_RATIO * field.strength * speedWeight;
  const normalizedRadius = Math.sqrt(normalizedRadiusSquared);
  const sampleRadius = Math.max(normalizedRadius, 1);
  const influenceWeight = smoothstep01(
    1 -
      clamp(
        (sampleRadius - 1) / Math.max(FLOW_INFLUENCE_RADIUS - 1, 0.001),
        0,
        1,
      ),
  );

  if (influenceWeight <= 0) {
    return influenced;
  }

  influenced = true;

  const directionLength = Math.max(normalizedRadius, 0.0001);
  const seedDirectionLength = Math.max(
    Math.hypot(particle.spreadX, particle.spreadY),
    0.0001,
  );
  const directionAlong =
    normalizedRadius > 0.0001
      ? normalizedAlong / directionLength
      : particle.spreadX / seedDirectionLength;
  const directionSide =
    normalizedRadius > 0.0001
      ? normalizedSide / directionLength
      : particle.spreadY / seedDirectionLength;
  const inverseRadiusSquared = 1 / (sampleRadius * sampleRadius);
  const doubleAngleAlong =
    directionAlong * directionAlong - directionSide * directionSide;
  const doubleAngleSide = 2 * directionAlong * directionSide;
  const directionalViscosity = lerp(
    TRAILING_FLOW_RATIO,
    1,
    smoothstep01((directionAlong + 1) * 0.5),
  );
  const potentialWeight =
    inverseRadiusSquared * influenceWeight * directionalViscosity;
  const viscousSwirl =
    particle.spreadZ *
    FLOW_VISCOSITY_SWIRL *
    influenceWeight *
    (1 - clamp(Math.abs(directionSide), 0, 1));
  const flowAlong = doubleAngleAlong * potentialWeight;
  const flowSide = doubleAngleSide * potentialWeight + viscousSwirl;
  const targetX = motionX * flowAlong + sideX * flowSide;
  const targetY = motionY * flowAlong + sideY * flowSide;

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

  const depthFlow =
    particle.spreadZ * potentialWeight * FLOW_DEPTH;

  addPlaneVector(
    accumulator,
    field,
    targetX * displacement,
    targetY * displacement,
    depthFlow * displacement,
  );

  return influenced;
}

function addPlaneVector(
  accumulator: ParticleFlowAccumulator,
  field: ParticleObstacleRuntime,
  planeX: number,
  planeY: number,
  depth: number,
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

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
