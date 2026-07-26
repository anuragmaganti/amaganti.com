export function getRoundedRectangleSupportExtent(
  directionX: number,
  directionY: number,
  halfWidth: number,
  halfHeight: number,
  cornerRadius: number,
) {
  const radius = clampRadius(cornerRadius, halfWidth, halfHeight);

  return (
    Math.abs(directionX) * Math.max(halfWidth - radius, 0) +
    Math.abs(directionY) * Math.max(halfHeight - radius, 0) +
    Math.hypot(directionX, directionY) * radius
  );
}

function clampRadius(radius: number, halfWidth: number, halfHeight: number) {
  return Math.min(Math.max(radius, 0), halfWidth, halfHeight);
}
