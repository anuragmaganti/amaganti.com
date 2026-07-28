export const MEDIA_SHELF_INERTIA = {
  minimumVelocity: 0.018,
  stopVelocity: 0.006,
  dampingPerMillisecond: 0.0046,
  maximumFrameDuration: 34,
} as const;

export function decayMediaShelfVelocity(velocity: number, elapsedMs: number) {
  return (
    velocity *
    Math.exp(-MEDIA_SHELF_INERTIA.dampingPerMillisecond * elapsedMs)
  );
}

export function clampMediaShelfScroll(
  scrollLeft: number,
  viewportWidth: number,
  contentWidth: number,
) {
  return Math.min(
    Math.max(scrollLeft, 0),
    Math.max(0, contentWidth - viewportWidth),
  );
}

