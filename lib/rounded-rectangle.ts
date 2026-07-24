const EPSILON = 0.00001;

export function getRoundedRectangleExitDistance(
  originX: number,
  originY: number,
  directionX: number,
  directionY: number,
  halfWidth: number,
  halfHeight: number,
  cornerRadius: number,
) {
  const radius = clampRadius(cornerRadius, halfWidth, halfHeight);
  const innerHalfWidth = Math.max(halfWidth - radius, 0);
  const innerHalfHeight = Math.max(halfHeight - radius, 0);
  let nearestExit = Number.POSITIVE_INFINITY;

  if (Math.abs(directionX) > EPSILON) {
    const boundaryX = directionX > 0 ? halfWidth : -halfWidth;
    const distance = (boundaryX - originX) / directionX;
    const intersectionY = originY + directionY * distance;

    if (
      distance >= 0 &&
      Math.abs(intersectionY) <= innerHalfHeight + EPSILON
    ) {
      nearestExit = Math.min(nearestExit, distance);
    }
  }

  if (Math.abs(directionY) > EPSILON) {
    const boundaryY = directionY > 0 ? halfHeight : -halfHeight;
    const distance = (boundaryY - originY) / directionY;
    const intersectionX = originX + directionX * distance;

    if (
      distance >= 0 &&
      Math.abs(intersectionX) <= innerHalfWidth + EPSILON
    ) {
      nearestExit = Math.min(nearestExit, distance);
    }
  }

  if (radius > EPSILON) {
    for (let cornerX = -1; cornerX <= 1; cornerX += 2) {
      for (let cornerY = -1; cornerY <= 1; cornerY += 2) {
        const centerX = cornerX * innerHalfWidth;
        const centerY = cornerY * innerHalfHeight;
        const offsetX = originX - centerX;
        const offsetY = originY - centerY;
        const projection = offsetX * directionX + offsetY * directionY;
        const discriminant =
          projection * projection -
          (offsetX * offsetX + offsetY * offsetY - radius * radius);

        if (discriminant < 0) continue;

        const distance = -projection + Math.sqrt(discriminant);
        if (distance < 0 || distance >= nearestExit) continue;

        const intersectionX = originX + directionX * distance;
        const intersectionY = originY + directionY * distance;
        if (
          (intersectionX - centerX) * cornerX >= -EPSILON &&
          (intersectionY - centerY) * cornerY >= -EPSILON
        ) {
          nearestExit = distance;
        }
      }
    }
  }

  return Number.isFinite(nearestExit) ? nearestExit : 0;
}

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
