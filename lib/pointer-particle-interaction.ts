import * as THREE from "three";

import type { ParticleState } from "@/lib/particle-motion";
import type { PointCloudShape } from "@/lib/scene-types";

const POINTER_SMOOTHING = 14;
const POINTER_PRESENCE_SMOOTHING = 10;
const POINTER_FLOW_SMOOTHING = 18;
const POINTER_FLOW_DECAY = 12;
const POINTER_LENS_RADIUS_PX = 68;
const POINTER_FLOW_RADIUS = 2.35;
const POINTER_FLOW_RADIUS_SQUARED = POINTER_FLOW_RADIUS * POINTER_FLOW_RADIUS;
const POINTER_MAX_SPEED_RADII = 8;
const POINTER_FLOW_DISPLACEMENT = 0.27;
const POINTER_FLOW_SWIRL = 0.055;
const POINTER_LENS_DEPTH = 0.09;
const POINTER_FLOW_STIFFNESS = 52;
const POINTER_FLOW_DAMPING = 12.5;
const POINTER_RETURN_STIFFNESS = 26;
const POINTER_RETURN_DAMPING = 9.5;
const POINTER_MAX_OFFSET = 0.36;
const POINTER_MAX_PARTICLE_SPEED = 4.2;
const POINTER_MOTION_EPSILON = 0.0005;
const MAX_PRESSURE_RIPPLES = 2;
const PRESSURE_RIPPLE_DURATION = 0.95;
const PRESSURE_RIPPLE_SPEED = 9.4;
const PRESSURE_RIPPLE_START_RADIUS = 0.16;
const PRESSURE_RIPPLE_BAND_WIDTH = 0.3;
const PRESSURE_RIPPLE_DISPLACEMENT = 0.2;
const PRESSURE_RIPPLE_DEPTH = 0.052;

type PendingPressureRipple = {
  x: number;
  y: number;
};

export type PressureRipple = {
  age: number;
  strength: number;
  unitRadius: number;
  localPoint: THREE.Vector3;
};

export type PointerParticleInteractionFrame = {
  hoverActive: boolean;
  hoverStrength: number;
  hoverRadius: number;
  unsettled: boolean;
  localPoint: THREE.Vector3;
  localRight: THREE.Vector3;
  localUp: THREE.Vector3;
  localNormal: THREE.Vector3;
  flowVelocity: THREE.Vector2;
  ripples: PressureRipple[];
};

export type PointerParticleInteractionResources = {
  rayPoint: THREE.Vector2;
  worldPoint: THREE.Vector3;
  radiusWorldPoint: THREE.Vector3;
  radiusLocalPoint: THREE.Vector3;
  inverseCloudMatrix: THREE.Matrix4;
  previousPointer: THREE.Vector2;
  smoothedFlowVelocity: THREE.Vector2;
  hadHover: boolean;
  pendingRipples: PendingPressureRipple[];
  ripples: PressureRipple[];
  ripplePool: PressureRipple[];
  frame: PointerParticleInteractionFrame;
};

export type PointerParticleFlowState = {
  active: Uint8Array;
  offsets: Float32Array;
  velocities: Float32Array;
};

export function createPointerParticleInteractionResources(): PointerParticleInteractionResources {
  const ripples: PressureRipple[] = [];

  return {
    rayPoint: new THREE.Vector2(),
    worldPoint: new THREE.Vector3(),
    radiusWorldPoint: new THREE.Vector3(),
    radiusLocalPoint: new THREE.Vector3(),
    inverseCloudMatrix: new THREE.Matrix4(),
    previousPointer: new THREE.Vector2(),
    smoothedFlowVelocity: new THREE.Vector2(),
    hadHover: false,
    pendingRipples: [],
    ripples,
    ripplePool: [],
    frame: {
      hoverActive: false,
      hoverStrength: 0,
      hoverRadius: 0.001,
      unsettled: false,
      localPoint: new THREE.Vector3(),
      localRight: new THREE.Vector3(1, 0, 0),
      localUp: new THREE.Vector3(0, 1, 0),
      localNormal: new THREE.Vector3(0, 0, 1),
      flowVelocity: new THREE.Vector2(),
      ripples,
    },
  };
}

export function createPointerParticleFlowState(
  pointCount: number,
): PointerParticleFlowState {
  return {
    active: new Uint8Array(pointCount),
    offsets: new Float32Array(pointCount * 3),
    velocities: new Float32Array(pointCount * 3),
  };
}

export function updatePointerState(
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

export function queuePressureRipple(
  resources: PointerParticleInteractionResources,
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  resources.pendingRipples.push({
    x: (clientX / Math.max(viewportWidth, 1)) * 2 - 1,
    y: (clientY / Math.max(viewportHeight, 1)) * 2 - 1,
  });

  if (resources.pendingRipples.length > MAX_PRESSURE_RIPPLES) {
    resources.pendingRipples.shift();
  }
}

export function resolvePointerParticleInteractionFrame({
  pointerPresence,
  pointerCurrent,
  currentShape,
  nextShape,
  blend,
  perspectiveCamera,
  raycaster,
  interactionPlane,
  cloud,
  viewportWidth,
  viewportHeight,
  hoverStrengthScale,
  rippleStrengthScale,
  delta,
  resources,
}: {
  pointerPresence: number;
  pointerCurrent: THREE.Vector2;
  currentShape: PointCloudShape;
  nextShape: PointCloudShape;
  blend: number;
  perspectiveCamera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  interactionPlane: THREE.Plane;
  cloud: THREE.Points;
  viewportWidth: number;
  viewportHeight: number;
  hoverStrengthScale: number;
  rippleStrengthScale: number;
  delta: number;
  resources: PointerParticleInteractionResources;
}) {
  const { frame, smoothedFlowVelocity } = resources;
  const flowLerp = 1 - Math.exp(-delta * POINTER_FLOW_SMOOTHING);

  advancePressureRipples(resources, delta);
  updateLocalViewBasis(frame, perspectiveCamera, interactionPlane, cloud, resources);

  const rippleStrength =
    getPointerRippleWeight(currentShape, nextShape, blend) *
    rippleStrengthScale;
  activatePendingRipples({
    perspectiveCamera,
    raycaster,
    interactionPlane,
    cloud,
    viewportWidth,
    rippleStrength,
    resources,
  });

  frame.hoverActive = false;
  frame.hoverStrength =
    pointerPresence *
    getPointerHoverWeight(currentShape, nextShape, blend) *
    hoverStrengthScale;

  const projected =
    frame.hoverStrength > 0.001 &&
    projectNdcPointToLocal(
      pointerCurrent.x,
      pointerCurrent.y,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cloud,
      resources.rayPoint,
      resources.worldPoint,
      frame.localPoint,
    );

  if (projected) {
    frame.hoverRadius = resolveLocalInteractionRadius({
      ndcX: pointerCurrent.x,
      ndcY: pointerCurrent.y,
      localPoint: frame.localPoint,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cloud,
      viewportWidth,
      resources,
    });

    if (resources.hadHover) {
      const pixelDeltaX =
        (pointerCurrent.x - resources.previousPointer.x) *
        Math.max(viewportWidth, 1) *
        0.5;
      const pixelDeltaY =
        (pointerCurrent.y - resources.previousPointer.y) *
        Math.max(viewportHeight, 1) *
        0.5;
      const localUnitsPerPixel =
        frame.hoverRadius / POINTER_LENS_RADIUS_PX;
      let targetFlowX =
        (pixelDeltaX * localUnitsPerPixel) / Math.max(delta, 1 / 240);
      let targetFlowY =
        (-pixelDeltaY * localUnitsPerPixel) / Math.max(delta, 1 / 240);
      const targetSpeed = Math.hypot(targetFlowX, targetFlowY);
      const maxSpeed = frame.hoverRadius * POINTER_MAX_SPEED_RADII;

      if (targetSpeed > maxSpeed) {
        const scale = maxSpeed / targetSpeed;
        targetFlowX *= scale;
        targetFlowY *= scale;
      }

      smoothedFlowVelocity.x = lerp(
        smoothedFlowVelocity.x,
        targetFlowX,
        flowLerp,
      );
      smoothedFlowVelocity.y = lerp(
        smoothedFlowVelocity.y,
        targetFlowY,
        flowLerp,
      );
    } else {
      smoothedFlowVelocity.set(0, 0);
    }

    resources.previousPointer.copy(pointerCurrent);
    resources.hadHover = true;
    frame.hoverActive = true;
  } else {
    const decay = Math.exp(-delta * POINTER_FLOW_DECAY);
    smoothedFlowVelocity.multiplyScalar(decay);
    resources.previousPointer.copy(pointerCurrent);
    resources.hadHover = false;
  }

  frame.flowVelocity.copy(smoothedFlowVelocity);
  const velocityEpsilon = Math.max(frame.hoverRadius * 0.01, 0.0001);
  frame.unsettled =
    smoothedFlowVelocity.lengthSq() > velocityEpsilon * velocityEpsilon;

  return frame;
}

export function applyPointerParticleInteraction(
  particle: ParticleState,
  particleIndex: number,
  frame: PointerParticleInteractionFrame,
  flowState: PointerParticleFlowState,
  delta: number,
) {
  const offsetIndex = particleIndex * 3;
  const { active, offsets, velocities } = flowState;
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
  let targetX = 0;
  let targetY = 0;
  let targetZ = 0;

  if (frame.hoverActive) {
    const displacedX = particle.x + offsetX;
    const displacedY = particle.y + offsetY;
    const displacedZ = particle.z + offsetZ;
    const deltaX = displacedX - frame.localPoint.x;
    const deltaY = displacedY - frame.localPoint.y;
    const deltaZ = displacedZ - frame.localPoint.z;
    const planeX = dot3(deltaX, deltaY, deltaZ, frame.localRight);
    const planeY = dot3(deltaX, deltaY, deltaZ, frame.localUp);
    const planeDepth = dot3(deltaX, deltaY, deltaZ, frame.localNormal);
    const radius = frame.hoverRadius;
    const normalizedRadiusSquared =
      (planeX * planeX + planeY * planeY) / (radius * radius);

    if (normalizedRadiusSquared < POINTER_FLOW_RADIUS_SQUARED) {
      const normalizedRadius = Math.sqrt(normalizedRadiusSquared);
      const depthWeight = smoothstep01(
        1 - Math.abs(planeDepth) / Math.max(radius * 3.5, 0.001),
      );
      const lensWeight =
        smoothstep01(1 - normalizedRadius / 1.25) * depthWeight;
      const flowInfluence =
        smoothstep01(
          1 -
            clamp(
              (normalizedRadius - 1) / (POINTER_FLOW_RADIUS - 1),
              0,
              1,
            ),
        ) * depthWeight;
      const flowSpeed = frame.flowVelocity.length();
      const speedWeight = smoothstep01(
        clamp(flowSpeed / Math.max(radius * 5, 0.001), 0, 1),
      );
      let planeTargetX = 0;
      let planeTargetY = 0;

      if (flowInfluence > 0 && speedWeight > 0.0001) {
        const motionX = frame.flowVelocity.x / flowSpeed;
        const motionY = frame.flowVelocity.y / flowSpeed;
        const sideX = -motionY;
        const sideY = motionX;
        const directionLength = Math.max(normalizedRadius, 0.0001);
        const seedDirectionLength = Math.max(
          Math.hypot(particle.spreadX, particle.spreadY),
          0.0001,
        );
        const radialX =
          normalizedRadius > 0.0001
            ? planeX / radius / directionLength
            : particle.spreadX / seedDirectionLength;
        const radialY =
          normalizedRadius > 0.0001
            ? planeY / radius / directionLength
            : particle.spreadY / seedDirectionLength;
        const directionAlong = radialX * motionX + radialY * motionY;
        const directionSide = radialX * sideX + radialY * sideY;
        const sampleRadius = Math.max(normalizedRadius, 1);
        const inverseRadiusSquared = 1 / (sampleRadius * sampleRadius);
        const directionalViscosity = lerp(
          0.58,
          1,
          smoothstep01((directionAlong + 1) * 0.5),
        );
        const potentialWeight =
          inverseRadiusSquared * flowInfluence * directionalViscosity;
        const flowAlong =
          (directionAlong * directionAlong -
            directionSide * directionSide) *
          potentialWeight;
        const flowSide =
          2 * directionAlong * directionSide * potentialWeight +
          particle.spreadZ *
            POINTER_FLOW_SWIRL *
            flowInfluence *
            (1 - Math.abs(directionSide));
        const displacement =
          radius *
          POINTER_FLOW_DISPLACEMENT *
          speedWeight *
          frame.hoverStrength;

        planeTargetX =
          (motionX * flowAlong + sideX * flowSide) * displacement;
        planeTargetY =
          (motionY * flowAlong + sideY * flowSide) * displacement;
      }

      const depthTarget =
        -radius * POINTER_LENS_DEPTH * lensWeight * frame.hoverStrength;
      targetX =
        frame.localRight.x * planeTargetX +
        frame.localUp.x * planeTargetY +
        frame.localNormal.x * depthTarget;
      targetY =
        frame.localRight.y * planeTargetX +
        frame.localUp.y * planeTargetY +
        frame.localNormal.y * depthTarget;
      targetZ =
        frame.localRight.z * planeTargetX +
        frame.localUp.z * planeTargetY +
        frame.localNormal.z * depthTarget;
    }
  }

  const targetLength = Math.hypot(targetX, targetY, targetZ);
  const hasHoverInfluence = targetLength > POINTER_MOTION_EPSILON;

  if (!hasHoverInfluence && !wasTracked) {
    applyPressureRipples(particle, frame);
    return false;
  }

  const maxOffset = Math.max(
    frame.hoverRadius * POINTER_MAX_OFFSET,
    POINTER_MOTION_EPSILON,
  );

  if (targetLength > maxOffset) {
    const scale = maxOffset / targetLength;
    targetX *= scale;
    targetY *= scale;
    targetZ *= scale;
  }

  const timestep = Math.min(delta, 1 / 30);
  const stiffness = hasHoverInfluence
    ? POINTER_FLOW_STIFFNESS
    : POINTER_RETURN_STIFFNESS;
  const damping = hasHoverInfluence
    ? POINTER_FLOW_DAMPING
    : POINTER_RETURN_DAMPING;

  velocityX += ((targetX - offsetX) * stiffness - velocityX * damping) * timestep;
  velocityY += ((targetY - offsetY) * stiffness - velocityY * damping) * timestep;
  velocityZ += ((targetZ - offsetZ) * stiffness - velocityZ * damping) * timestep;

  const velocityLength = Math.hypot(velocityX, velocityY, velocityZ);
  const maxParticleSpeed = Math.max(
    frame.hoverRadius * POINTER_MAX_PARTICLE_SPEED,
    0.1,
  );

  if (velocityLength > maxParticleSpeed) {
    const scale = maxParticleSpeed / velocityLength;
    velocityX *= scale;
    velocityY *= scale;
    velocityZ *= scale;
  }

  offsetX += velocityX * timestep;
  offsetY += velocityY * timestep;
  offsetZ += velocityZ * timestep;

  const offsetLength = Math.hypot(offsetX, offsetY, offsetZ);
  if (offsetLength > maxOffset) {
    const scale = maxOffset / offsetLength;
    offsetX *= scale;
    offsetY *= scale;
    offsetZ *= scale;
  }

  const remainingError = Math.hypot(
    targetX - offsetX,
    targetY - offsetY,
    targetZ - offsetZ,
  );
  const remainingVelocity = Math.hypot(velocityX, velocityY, velocityZ);

  if (
    !hasHoverInfluence &&
    Math.abs(offsetX) <= POINTER_MOTION_EPSILON &&
    Math.abs(offsetY) <= POINTER_MOTION_EPSILON &&
    Math.abs(offsetZ) <= POINTER_MOTION_EPSILON &&
    remainingError <= POINTER_MOTION_EPSILON &&
    remainingVelocity <= POINTER_MOTION_EPSILON
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
  applyPressureRipples(particle, frame);

  return (
    remainingError > POINTER_MOTION_EPSILON ||
    remainingVelocity > POINTER_MOTION_EPSILON
  );
}

export function getFaceTrackingWeight(
  current: PointCloudShape,
  next: PointCloudShape,
  mix: number,
) {
  const currentWeight = current === "face" ? 1 : 0;
  const nextWeight = next === "face" ? 1 : 0;
  return lerp(currentWeight, nextWeight, mix);
}

function applyPressureRipples(
  particle: ParticleState,
  frame: PointerParticleInteractionFrame,
) {
  for (const ripple of frame.ripples) {
    const deltaX = particle.x - ripple.localPoint.x;
    const deltaY = particle.y - ripple.localPoint.y;
    const deltaZ = particle.z - ripple.localPoint.z;
    const planeX = dot3(deltaX, deltaY, deltaZ, frame.localRight);
    const planeY = dot3(deltaX, deltaY, deltaZ, frame.localUp);
    const planeDepth = dot3(deltaX, deltaY, deltaZ, frame.localNormal);
    const waveRadius =
      ripple.unitRadius *
      (PRESSURE_RIPPLE_START_RADIUS + ripple.age * PRESSURE_RIPPLE_SPEED);
    const bandWidth = ripple.unitRadius * PRESSURE_RIPPLE_BAND_WIDTH;
    const outerRadius = waveRadius + bandWidth;
    const innerRadius = Math.max(waveRadius - bandWidth * 1.45, 0);
    const planeDistanceSquared = planeX * planeX + planeY * planeY;

    if (
      planeDistanceSquared > outerRadius * outerRadius ||
      planeDistanceSquared < innerRadius * innerRadius
    ) {
      continue;
    }

    const planeDistance = Math.sqrt(planeDistanceSquared);
    const bandPosition = (planeDistance - waveRadius) / Math.max(bandWidth, 0.001);
    const compression = Math.exp(-bandPosition * bandPosition * 4.2);
    const recovery =
      bandPosition < 0
        ? 0.34 * Math.exp(-Math.pow((bandPosition + 0.76) * 2.4, 2))
        : 0;
    const attack = smoothstep01(ripple.age / 0.055);
    const decay =
      1 -
      smoothstep01(
        (ripple.age - PRESSURE_RIPPLE_DURATION * 0.55) /
          (PRESSURE_RIPPLE_DURATION * 0.45),
      );
    const depthWeight = smoothstep01(
      1 -
        Math.abs(planeDepth) /
          Math.max(ripple.unitRadius * 4.25, 0.001),
    );
    const wave =
      (compression - recovery) *
      attack *
      decay *
      depthWeight *
      ripple.strength;

    if (Math.abs(wave) <= 0.0001) {
      continue;
    }

    const seedLength = Math.max(
      Math.hypot(particle.spreadX, particle.spreadY),
      0.0001,
    );
    const radialX =
      planeDistance > 0.0001
        ? planeX / planeDistance
        : particle.spreadX / seedLength;
    const radialY =
      planeDistance > 0.0001
        ? planeY / planeDistance
        : particle.spreadY / seedLength;
    const displacement =
      ripple.unitRadius * PRESSURE_RIPPLE_DISPLACEMENT * wave;
    const depthDisplacement =
      ripple.unitRadius * PRESSURE_RIPPLE_DEPTH * wave;

    particle.x +=
      frame.localRight.x * radialX * displacement +
      frame.localUp.x * radialY * displacement +
      frame.localNormal.x * depthDisplacement;
    particle.y +=
      frame.localRight.y * radialX * displacement +
      frame.localUp.y * radialY * displacement +
      frame.localNormal.y * depthDisplacement;
    particle.z +=
      frame.localRight.z * radialX * displacement +
      frame.localUp.z * radialY * displacement +
      frame.localNormal.z * depthDisplacement;
  }
}

function activatePendingRipples({
  perspectiveCamera,
  raycaster,
  interactionPlane,
  cloud,
  viewportWidth,
  rippleStrength,
  resources,
}: {
  perspectiveCamera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  interactionPlane: THREE.Plane;
  cloud: THREE.Points;
  viewportWidth: number;
  rippleStrength: number;
  resources: PointerParticleInteractionResources;
}) {
  while (resources.pendingRipples.length > 0) {
    const pending = resources.pendingRipples.shift();
    if (!pending || rippleStrength <= 0.001) {
      continue;
    }

    const ripple =
      resources.ripplePool.pop() ?? {
        age: 0,
        strength: 0,
        unitRadius: 0,
        localPoint: new THREE.Vector3(),
      };
    const projected = projectNdcPointToLocal(
      pending.x,
      pending.y,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cloud,
      resources.rayPoint,
      resources.worldPoint,
      ripple.localPoint,
    );

    if (!projected) {
      resources.ripplePool.push(ripple);
      continue;
    }

    ripple.age = 0;
    ripple.strength = rippleStrength;
    ripple.unitRadius = resolveLocalInteractionRadius({
      ndcX: pending.x,
      ndcY: pending.y,
      localPoint: ripple.localPoint,
      perspectiveCamera,
      raycaster,
      interactionPlane,
      cloud,
      viewportWidth,
      resources,
    });

    if (resources.ripples.length >= MAX_PRESSURE_RIPPLES) {
      const retired = resources.ripples.shift();
      if (retired) resources.ripplePool.push(retired);
    }

    resources.ripples.push(ripple);
  }
}

function advancePressureRipples(
  resources: PointerParticleInteractionResources,
  delta: number,
) {
  for (let index = resources.ripples.length - 1; index >= 0; index -= 1) {
    const ripple = resources.ripples[index];
    ripple.age += delta;

    if (ripple.age >= PRESSURE_RIPPLE_DURATION) {
      resources.ripples.splice(index, 1);
      resources.ripplePool.push(ripple);
    }
  }
}

function updateLocalViewBasis(
  frame: PointerParticleInteractionFrame,
  perspectiveCamera: THREE.PerspectiveCamera,
  interactionPlane: THREE.Plane,
  cloud: THREE.Points,
  resources: PointerParticleInteractionResources,
) {
  resources.inverseCloudMatrix.copy(cloud.matrixWorld).invert();
  frame.localRight
    .setFromMatrixColumn(perspectiveCamera.matrixWorld, 0)
    .transformDirection(resources.inverseCloudMatrix);
  frame.localUp
    .setFromMatrixColumn(perspectiveCamera.matrixWorld, 1)
    .transformDirection(resources.inverseCloudMatrix);
  frame.localNormal
    .copy(interactionPlane.normal)
    .transformDirection(resources.inverseCloudMatrix);
}

function resolveLocalInteractionRadius({
  ndcX,
  ndcY,
  localPoint,
  perspectiveCamera,
  raycaster,
  interactionPlane,
  cloud,
  viewportWidth,
  resources,
}: {
  ndcX: number;
  ndcY: number;
  localPoint: THREE.Vector3;
  perspectiveCamera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  interactionPlane: THREE.Plane;
  cloud: THREE.Points;
  viewportWidth: number;
  resources: PointerParticleInteractionResources;
}) {
  const radiusNdcOffset =
    (POINTER_LENS_RADIUS_PX / Math.max(viewportWidth, 1)) * 2;
  const projected = projectNdcPointToLocal(
    ndcX + radiusNdcOffset,
    ndcY,
    perspectiveCamera,
    raycaster,
    interactionPlane,
    cloud,
    resources.rayPoint,
    resources.radiusWorldPoint,
    resources.radiusLocalPoint,
  );

  return projected
    ? Math.max(localPoint.distanceTo(resources.radiusLocalPoint), 0.001)
    : 0.2;
}

function projectNdcPointToLocal(
  ndcX: number,
  ndcY: number,
  perspectiveCamera: THREE.PerspectiveCamera,
  raycaster: THREE.Raycaster,
  interactionPlane: THREE.Plane,
  cloud: THREE.Points,
  rayPoint: THREE.Vector2,
  worldPoint: THREE.Vector3,
  localPoint: THREE.Vector3,
) {
  rayPoint.set(ndcX, -ndcY);
  raycaster.setFromCamera(rayPoint, perspectiveCamera);

  if (!raycaster.ray.intersectPlane(interactionPlane, worldPoint)) {
    return false;
  }

  localPoint.copy(worldPoint);
  cloud.worldToLocal(localPoint);
  return true;
}

function getPointerHoverShapeWeight(shape: PointCloudShape) {
  switch (shape) {
    case "face":
      return 1;
    case "text":
      return 0.16;
    case "project-field":
      return 0.44;
    case "settle":
      return 0.3;
  }
}

function getPointerRippleShapeWeight(shape: PointCloudShape) {
  switch (shape) {
    case "face":
      return 1;
    case "text":
      return 0.36;
    case "project-field":
      return 0.68;
    case "settle":
      return 0.52;
  }
}

function getPointerHoverWeight(
  current: PointCloudShape,
  next: PointCloudShape,
  mix: number,
) {
  return lerp(
    getPointerHoverShapeWeight(current),
    getPointerHoverShapeWeight(next),
    mix,
  );
}

function getPointerRippleWeight(
  current: PointCloudShape,
  next: PointCloudShape,
  mix: number,
) {
  return lerp(
    getPointerRippleShapeWeight(current),
    getPointerRippleShapeWeight(next),
    mix,
  );
}

function dot3(x: number, y: number, z: number, vector: THREE.Vector3) {
  return x * vector.x + y * vector.y + z * vector.z;
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
