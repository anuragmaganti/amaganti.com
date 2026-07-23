export const FLOATING_PROJECT_SIMULATION = {
  referenceStepMs: 1000 / 60,
  maxFrameDeltaMs: 1000 / 20,
  maxSubsteps: 3,
  maxCardAngle: Math.PI / 60,
} as const;

export type FloatingProjectPhysicsSteps = {
  count: number;
  deltaMs: number;
};

/**
 * Advances once per display frame. Slow frames are subdivided so Matter never
 * receives a step larger than its recommended 60 Hz reference interval.
 */
export function resolveFloatingProjectPhysicsSteps(
  frameDeltaMs: number,
): FloatingProjectPhysicsSteps {
  if (!Number.isFinite(frameDeltaMs) || frameDeltaMs <= 0) {
    return { count: 0, deltaMs: 0 };
  }

  const boundedDelta = Math.min(
    frameDeltaMs,
    FLOATING_PROJECT_SIMULATION.maxFrameDeltaMs,
  );
  const count = Math.min(
    FLOATING_PROJECT_SIMULATION.maxSubsteps,
    Math.max(
      1,
      Math.ceil(
        boundedDelta / FLOATING_PROJECT_SIMULATION.referenceStepMs,
      ),
    ),
  );

  return {
    count,
    deltaMs: boundedDelta / count,
  };
}
