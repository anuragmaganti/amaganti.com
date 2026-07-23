export type ParticleObstacleGeometry = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  angle: number;
  cornerRadius: number;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
};

export type ParticleObstacleScreenFrame = {
  center: { x: number; y: number };
  leftMid: { x: number; y: number };
  rightMid: { x: number; y: number };
  topMid: { x: number; y: number };
  bottomMid: { x: number; y: number };
};

export function createParticleObstacleGeometry(): ParticleObstacleGeometry {
  return {
    centerX: 0,
    centerY: 0,
    width: 0,
    height: 0,
    angle: 0,
    cornerRadius: 0,
    bounds: { left: 0, top: 0, right: 0, bottom: 0 },
  };
}

export function writeParticleObstacleGeometry(
  target: ParticleObstacleGeometry,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  angle: number,
  cornerRadius: number,
) {
  const cosine = Math.abs(Math.cos(angle));
  const sine = Math.abs(Math.sin(angle));
  const halfBoundsWidth = cosine * width * 0.5 + sine * height * 0.5;
  const halfBoundsHeight = sine * width * 0.5 + cosine * height * 0.5;

  target.centerX = centerX;
  target.centerY = centerY;
  target.width = width;
  target.height = height;
  target.angle = angle;
  target.cornerRadius = cornerRadius;
  target.bounds.left = centerX - halfBoundsWidth;
  target.bounds.top = centerY - halfBoundsHeight;
  target.bounds.right = centerX + halfBoundsWidth;
  target.bounds.bottom = centerY + halfBoundsHeight;

  return target;
}

export function createParticleObstacleScreenFrame(
  geometry: ParticleObstacleGeometry,
): ParticleObstacleScreenFrame {
  return writeParticleObstacleScreenFrame(geometry, {
    center: { x: 0, y: 0 },
    leftMid: { x: 0, y: 0 },
    rightMid: { x: 0, y: 0 },
    topMid: { x: 0, y: 0 },
    bottomMid: { x: 0, y: 0 },
  });
}

export function writeParticleObstacleScreenFrame(
  geometry: ParticleObstacleGeometry,
  target: ParticleObstacleScreenFrame,
) {
  const cosine = Math.cos(geometry.angle);
  const sine = Math.sin(geometry.angle);
  const halfWidth = geometry.width * 0.5;
  const halfHeight = geometry.height * 0.5;

  target.center.x = geometry.centerX;
  target.center.y = geometry.centerY;
  target.leftMid.x = geometry.centerX - cosine * halfWidth;
  target.leftMid.y = geometry.centerY - sine * halfWidth;
  target.rightMid.x = geometry.centerX + cosine * halfWidth;
  target.rightMid.y = geometry.centerY + sine * halfWidth;
  target.topMid.x = geometry.centerX + sine * halfHeight;
  target.topMid.y = geometry.centerY - cosine * halfHeight;
  target.bottomMid.x = geometry.centerX - sine * halfHeight;
  target.bottomMid.y = geometry.centerY + cosine * halfHeight;

  return target;
}
