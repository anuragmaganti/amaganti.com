import {
  floatingProjectCardRoles,
  mapFloatingProjectCards,
  type FloatingProjectCardRole,
} from "@/features/floating-projects/config";
import type { FloatingProjectCardBody } from "@/features/floating-projects/physics-world";
import { writeParticleObstacleGeometry } from "@/lib/particle-obstacle-geometry";
import {
  batchParticleObstacleUpdates,
  publishParticleObstacle,
  registerParticleObstacle,
  unregisterParticleObstacle,
  type ParticleObstacleEntry,
} from "@/lib/particle-obstacle-store";
import type { SceneFrameState } from "@/lib/scene-frame-scheduler";

type CardObstacleState = {
  entry: ParticleObstacleEntry;
  cornerRadius: number;
  previousCenterX: number;
  previousCenterY: number;
  previousAngle: number;
  previousTimestamp: number;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
};

const PREWARM_VERTICAL_VIEWPORT_RATIO = 0.55;
const PREWARM_HORIZONTAL_VIEWPORT_RATIO = 0.2;
const MAX_SCREEN_VELOCITY = 2400;
const MAX_SCREEN_ANGULAR_VELOCITY = Math.PI * 1.5;
const MOTION_SMOOTHING = 12;
const STICKY_SCROLL_COUPLING = 0.55;

export function createFloatingProjectFrameRenderer(
  stageId: string,
  arena: HTMLElement,
  elements: Record<FloatingProjectCardRole, HTMLElement>,
) {
  const states = mapFloatingProjectCards<CardObstacleState>((role) => ({
    entry: registerParticleObstacle(`${stageId}:${role}`),
    cornerRadius: readCornerRadius(elements[role]),
    previousCenterX: 0,
    previousCenterY: 0,
    previousAngle: 0,
    previousTimestamp: 0,
    velocityX: 0,
    velocityY: 0,
    angularVelocity: 0,
  }));

  return {
    refreshMeasurements() {
      for (const role of floatingProjectCardRoles) {
        states[role].cornerRadius = readCornerRadius(elements[role]);
      }
    },
    render(
      records: Map<FloatingProjectCardRole, FloatingProjectCardBody>,
      frame: SceneFrameState,
    ) {
      if (!records.size) return;

      const arenaBounds = arena.getBoundingClientRect();
      const scaleX = arena.clientWidth
        ? arenaBounds.width / arena.clientWidth
        : 1;
      const scaleY = arena.clientHeight
        ? arenaBounds.height / arena.clientHeight
        : 1;
      const cornerScale = Math.min(scaleX, scaleY);

      batchParticleObstacleUpdates(() => {
        for (const record of records.values()) {
          const { body, role, width, height } = record;
          const element = elements[role];
          const state = states[role];
          const centerX = arenaBounds.left + body.position.x * scaleX;
          const centerY = arenaBounds.top + body.position.y * scaleY;

          element.style.transform = `translate3d(${body.position.x - width * 0.5}px, ${body.position.y - height * 0.5}px, 0) rotate(${body.angle}rad)`;
          element.dataset.physicsX = body.position.x.toFixed(2);
          element.dataset.physicsY = body.position.y.toFixed(2);
          element.dataset.physicsAngle = body.angle.toFixed(6);

          writeParticleObstacleGeometry(
            state.entry.geometry,
            centerX,
            centerY,
            width * scaleX,
            height * scaleY,
            body.angle,
            state.cornerRadius * cornerScale,
          );
          updateObstacleMotion(state, frame, centerX, centerY, body.angle);
          publishParticleObstacle(
            state.entry,
            getViewportApproachStrength(state.entry),
          );
        }
      });
    },
    destroy() {
      batchParticleObstacleUpdates(() => {
        for (const role of floatingProjectCardRoles) {
          unregisterParticleObstacle(states[role].entry);
        }
      });
    },
  };
}

function updateObstacleMotion(
  state: CardObstacleState,
  frame: SceneFrameState,
  centerX: number,
  centerY: number,
  angle: number,
) {
  const deltaSeconds = state.previousTimestamp
    ? Math.max((frame.timestamp - state.previousTimestamp) / 1000, 0.001)
    : 0;
  const velocityLerp = deltaSeconds
    ? 1 - Math.exp(-deltaSeconds * MOTION_SMOOTHING)
    : 1;
  const rawVelocityX = deltaSeconds
    ? clamp(
        (centerX - state.previousCenterX) / deltaSeconds,
        -MAX_SCREEN_VELOCITY,
        MAX_SCREEN_VELOCITY,
      )
    : 0;
  const rawVelocityY = deltaSeconds
    ? clamp(
        (centerY - state.previousCenterY) / deltaSeconds,
        -MAX_SCREEN_VELOCITY,
        MAX_SCREEN_VELOCITY,
      )
    : 0;
  const rawAngularVelocity = deltaSeconds
    ? clamp(
        normalizeAngle(angle - state.previousAngle) / deltaSeconds,
        -MAX_SCREEN_ANGULAR_VELOCITY,
        MAX_SCREEN_ANGULAR_VELOCITY,
      )
    : 0;

  state.velocityX = lerp(state.velocityX, rawVelocityX, velocityLerp);
  state.velocityY = lerp(state.velocityY, rawVelocityY, velocityLerp);
  state.angularVelocity = lerp(
    state.angularVelocity,
    rawAngularVelocity,
    velocityLerp,
  );

  const scrollVelocityY = -frame.scrollVelocityY;
  const cardMovementShare = clamp(
    Math.abs(state.velocityY) / (Math.abs(scrollVelocityY) + 1),
    0,
    1,
  );
  const stickyCurrentY =
    scrollVelocityY *
    (1 - cardMovementShare) *
    STICKY_SCROLL_COUPLING;

  state.entry.motion.velocityX = state.velocityX;
  state.entry.motion.velocityY = clamp(
    state.velocityY + stickyCurrentY,
    -MAX_SCREEN_VELOCITY,
    MAX_SCREEN_VELOCITY,
  );
  state.entry.motion.angularVelocity = state.angularVelocity;
  state.entry.motion.sampledAt = frame.timestamp;
  state.previousCenterX = centerX;
  state.previousCenterY = centerY;
  state.previousAngle = angle;
  state.previousTimestamp = frame.timestamp;
}

function getViewportApproachStrength(entry: ParticleObstacleEntry) {
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const horizontalDistance = getViewportDistance(
    entry.geometry.bounds.left,
    entry.geometry.bounds.right,
    viewportWidth,
  );
  const verticalDistance = getViewportDistance(
    entry.geometry.bounds.top,
    entry.geometry.bounds.bottom,
    viewportHeight,
  );
  const normalizedDistance = Math.max(
    horizontalDistance /
      (viewportWidth * PREWARM_HORIZONTAL_VIEWPORT_RATIO),
    verticalDistance / (viewportHeight * PREWARM_VERTICAL_VIEWPORT_RATIO),
  );
  const approach = clamp(1 - normalizedDistance, 0, 1);

  return approach * approach * (3 - 2 * approach);
}

function getViewportDistance(start: number, end: number, viewportSize: number) {
  if (end < 0) return -end;
  if (start > viewportSize) return start - viewportSize;
  return 0;
}

function readCornerRadius(element: HTMLElement) {
  const radius = Number.parseFloat(
    window.getComputedStyle(element).borderTopLeftRadius,
  );
  return Number.isFinite(radius) ? radius : 0;
}

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
