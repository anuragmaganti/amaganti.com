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

export function measureParticleObstacleGeometry(
  element: HTMLElement,
  cornerRadius: number,
): ParticleObstacleGeometry {
  const bounds = element.getBoundingClientRect();
  const transform = readElementTransform(element);
  const width = element.offsetWidth * transform.scaleX;
  const height = element.offsetHeight * transform.scaleY;

  return {
    centerX: bounds.left + bounds.width * 0.5,
    centerY: bounds.top + bounds.height * 0.5,
    width,
    height,
    angle: transform.angle,
    cornerRadius: cornerRadius * Math.min(transform.scaleX, transform.scaleY),
    bounds: {
      left: bounds.left,
      top: bounds.top,
      right: bounds.right,
      bottom: bounds.bottom,
    },
  };
}

export function createParticleObstacleScreenFrame(
  geometry: ParticleObstacleGeometry,
): ParticleObstacleScreenFrame {
  const cosine = Math.cos(geometry.angle);
  const sine = Math.sin(geometry.angle);
  const rightX = cosine;
  const rightY = sine;
  const upX = sine;
  const upY = -cosine;
  const halfWidth = geometry.width * 0.5;
  const halfHeight = geometry.height * 0.5;

  return {
    center: { x: geometry.centerX, y: geometry.centerY },
    leftMid: {
      x: geometry.centerX - rightX * halfWidth,
      y: geometry.centerY - rightY * halfWidth,
    },
    rightMid: {
      x: geometry.centerX + rightX * halfWidth,
      y: geometry.centerY + rightY * halfWidth,
    },
    topMid: {
      x: geometry.centerX + upX * halfHeight,
      y: geometry.centerY + upY * halfHeight,
    },
    bottomMid: {
      x: geometry.centerX - upX * halfHeight,
      y: geometry.centerY - upY * halfHeight,
    },
  };
}

function readElementTransform(element: HTMLElement) {
  const transformValue = window.getComputedStyle(element).transform;

  if (!transformValue || transformValue === "none") {
    return { angle: 0, scaleX: 1, scaleY: 1 };
  }

  const matrix = new DOMMatrixReadOnly(transformValue);
  const measuredAngle = Math.atan2(matrix.b, matrix.a);
  const physicsAngle = Number.parseFloat(element.dataset.physicsAngle ?? "");

  return {
    angle: Number.isFinite(physicsAngle) ? physicsAngle : measuredAngle,
    scaleX: Math.max(Math.hypot(matrix.a, matrix.b), 0.0001),
    scaleY: Math.max(Math.hypot(matrix.c, matrix.d), 0.0001),
  };
}
