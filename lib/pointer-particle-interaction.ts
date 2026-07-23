import * as THREE from "three";

import type { ParticleState } from "@/lib/particle-motion";
import type { PointCloudShape } from "@/lib/scene-types";

const POINTER_SMOOTHING = 14;
const POINTER_PRESENCE_SMOOTHING = 10;
const MOUSE_REPULSION_RADIUS = 0.34;
const MOUSE_REPULSION_RADIUS_SQ =
  MOUSE_REPULSION_RADIUS * MOUSE_REPULSION_RADIUS;
const MOUSE_REPULSION_DISPLACEMENT = 0.14;
const MOUSE_REPULSION_DEPTH_BOOST = 1.14;

export type MouseRepulsionResources = {
  rayPoint: THREE.Vector2;
  worldPoint: THREE.Vector3;
  frame: {
    active: boolean;
    strength: number;
    localPoint: THREE.Vector3;
  };
};

export function createMouseRepulsionResources(): MouseRepulsionResources {
  return {
    rayPoint: new THREE.Vector2(),
    worldPoint: new THREE.Vector3(),
    frame: {
      active: false,
      strength: 0,
      localPoint: new THREE.Vector3(),
    },
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

export function resolveMouseRepulsionFrame({
  pointerPresence,
  pointerCurrent,
  currentShape,
  nextShape,
  blend,
  perspectiveCamera,
  raycaster,
  interactionPlane,
  cloud,
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
  resources: MouseRepulsionResources;
}) {
  const { frame, rayPoint, worldPoint } = resources;
  frame.active = false;
  frame.strength = 0;

  if (pointerPresence <= 0.001) {
    return frame;
  }

  frame.strength =
    pointerPresence * getMouseRepulsionWeight(currentShape, nextShape, blend);

  if (frame.strength <= 0.001) {
    return frame;
  }

  rayPoint.set(pointerCurrent.x, -pointerCurrent.y);
  raycaster.setFromCamera(rayPoint, perspectiveCamera);

  if (!raycaster.ray.intersectPlane(interactionPlane, worldPoint)) {
    return frame;
  }

  frame.localPoint.copy(worldPoint);
  cloud.worldToLocal(frame.localPoint);
  frame.active = true;
  return frame;
}

export function applyMouseRepulsion(
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

export function getFaceTrackingWeight(
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

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}
