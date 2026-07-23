import * as THREE from "three";

import type {
  SampledScene,
  SceneCloudState,
  SceneCameraState,
} from "@/lib/scene-types";

const REFERENCE_VIEWPORT_ASPECT = 1440 / 900;
const MIN_LAYOUT_SCALE = 0.2;
const MOBILE_VIEWPORT_MAX_WIDTH = 640;
const MOBILE_FACE_SCALE = 1.2;
const MOBILE_INTRO_FACE_OFFSET_Y = 0.12;
const MOBILE_OUTRO_FACE_OFFSET_Y = -0.105;

type ScreenFrame = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type IntroCopyFrame = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centered: boolean;
};

export type CloudLayoutResources = {
  bounds: THREE.Box3;
  boundsCenter: THREE.Vector3;
  corner: THREE.Vector3;
  currentFrame: ScreenFrame;
  referenceFrame: ScreenFrame;
  currentFramePoint: THREE.Vector3;
  targetFramePoint: THREE.Vector3;
  referenceCamera: THREE.PerspectiveCamera;
  referenceCameraTarget: THREE.Vector3;
  referenceCloud: THREE.Object3D;
};

export function createCloudLayoutResources(): CloudLayoutResources {
  return {
    bounds: new THREE.Box3(),
    boundsCenter: new THREE.Vector3(),
    corner: new THREE.Vector3(),
    currentFrame: createScreenFrame(),
    referenceFrame: createScreenFrame(),
    currentFramePoint: new THREE.Vector3(),
    targetFramePoint: new THREE.Vector3(),
    referenceCamera: new THREE.PerspectiveCamera(),
    referenceCameraTarget: new THREE.Vector3(),
    referenceCloud: new THREE.Object3D(),
  };
}

export function createPositionBounds(positions: Float32Array) {
  const bounds = new THREE.Box3();

  if (!positions.length) {
    return bounds.setFromCenterAndSize(
      new THREE.Vector3(),
      new THREE.Vector3(0.001, 0.001, 0.001),
    );
  }

  bounds.min.set(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  );
  bounds.max.set(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  );

  for (let index = 0; index < positions.length; index += 3) {
    bounds.min.x = Math.min(bounds.min.x, positions[index]);
    bounds.min.y = Math.min(bounds.min.y, positions[index + 1]);
    bounds.min.z = Math.min(bounds.min.z, positions[index + 2]);
    bounds.max.x = Math.max(bounds.max.x, positions[index]);
    bounds.max.y = Math.max(bounds.max.y, positions[index + 1]);
    bounds.max.z = Math.max(bounds.max.z, positions[index + 2]);
  }

  return bounds;
}

export function applyViewportCloudLayout(
  cloud: THREE.Points,
  camera: THREE.PerspectiveCamera,
  phaseState: SampledScene,
  blend: number,
  boundsFrom: THREE.Box3,
  boundsTo: THREE.Box3,
  viewportWidth: number,
  viewportHeight: number,
  introCopyFrame: IntroCopyFrame | null,
  resources: CloudLayoutResources,
) {
  const frameWeight = lerp(
    getViewportFrameWeight(phaseState.current.cloud.viewportFrame),
    getViewportFrameWeight(phaseState.next.cloud.viewportFrame),
    blend,
  );

  // Authored fields must not be reframed or their morph and obstacle geometry
  // no longer share the coordinate system used by the project presets.
  if (frameWeight <= 0.001) {
    return 1;
  }

  resources.bounds.min.lerpVectors(boundsFrom.min, boundsTo.min, blend);
  resources.bounds.max.lerpVectors(boundsFrom.max, boundsTo.max, blend);

  configureReferenceCamera(
    resources.referenceCamera,
    phaseState.camera,
    resources.referenceCameraTarget,
  );
  resources.referenceCloud.position.set(...phaseState.cloud.position);
  resources.referenceCloud.rotation.set(...phaseState.cloud.rotation);
  resources.referenceCloud.scale.setScalar(phaseState.cloud.scale);
  resources.referenceCloud.updateMatrixWorld(true);
  projectBoundsToScreenFrame(
    resources.bounds,
    resources.referenceCloud,
    resources.referenceCamera,
    resources.corner,
    resources.referenceFrame,
  );

  cloud.updateMatrixWorld();
  projectBoundsToScreenFrame(
    resources.bounds,
    cloud,
    camera,
    resources.corner,
    resources.currentFrame,
  );

  const preservedFrameScale = clamp(
    Math.min(
      resources.referenceFrame.width /
        Math.max(resources.currentFrame.width, 0.0001),
      resources.referenceFrame.height /
        Math.max(resources.currentFrame.height, 0.0001),
    ),
    MIN_LAYOUT_SCALE,
    1,
  );
  let layoutScale = lerp(1, preservedFrameScale, frameWeight);

  cloud.scale.multiplyScalar(layoutScale);
  cloud.updateMatrixWorld();
  projectBoundsToScreenFrame(
    resources.bounds,
    cloud,
    camera,
    resources.corner,
    resources.currentFrame,
  );

  const introPhaseWeight = lerp(
    phaseState.current.key === "intro" ? 1 : 0,
    phaseState.next.key === "intro" ? 1 : 0,
    blend,
  );
  const outroPhaseWeight = lerp(
    phaseState.current.key === "contact" ? 1 : 0,
    phaseState.next.key === "contact" ? 1 : 0,
    blend,
  );
  const mobileViewportWeight =
    viewportWidth <= MOBILE_VIEWPORT_MAX_WIDTH ? 1 : 0;
  let targetCenterX = lerp(
    resources.currentFrame.centerX,
    resources.referenceFrame.centerX,
    frameWeight,
  );
  let targetCenterY = lerp(
    resources.currentFrame.centerY,
    resources.referenceFrame.centerY,
    frameWeight,
  );

  if (introCopyFrame && introPhaseWeight > 0.001) {
    const frameMargin = clamp(viewportWidth * 0.025, 16, 32);
    const copyGap = clamp(viewportWidth * 0.03, 18, 36);
    const safeLeft = introCopyFrame.centered
      ? frameMargin
      : introCopyFrame.right + copyGap;
    const safeRight = viewportWidth - frameMargin;
    const safeTop = introCopyFrame.centered
      ? introCopyFrame.bottom + copyGap
      : frameMargin;
    const safeBottom = viewportHeight - Math.max(frameMargin, 52);
    const safeWidth = Math.max(safeRight - safeLeft, 1);
    const safeHeight = Math.max(safeBottom - safeTop, 1);
    const currentWidth = resources.currentFrame.width * viewportWidth * 0.5;
    const currentHeight = resources.currentFrame.height * viewportHeight * 0.5;
    const needsIntroFrame =
      introCopyFrame.centered || safeWidth < currentWidth * 0.88;

    if (needsIntroFrame) {
      const introFitScale = clamp(
        Math.min(1, safeWidth / currentWidth, safeHeight / currentHeight),
        MIN_LAYOUT_SCALE,
        1,
      );
      const weightedIntroScale = lerp(1, introFitScale, introPhaseWeight);
      cloud.scale.multiplyScalar(weightedIntroScale);
      layoutScale *= weightedIntroScale;
      cloud.updateMatrixWorld();
      projectBoundsToScreenFrame(
        resources.bounds,
        cloud,
        camera,
        resources.corner,
        resources.currentFrame,
      );

      const safeMinX = (safeLeft / viewportWidth) * 2 - 1;
      const safeMaxX = (safeRight / viewportWidth) * 2 - 1;
      const safeMinY = 1 - (safeBottom / viewportHeight) * 2;
      const safeMaxY = 1 - (safeTop / viewportHeight) * 2;
      const safeCenterX = introCopyFrame.centered
        ? (safeMinX + safeMaxX) * 0.5
        : clamp(
            resources.referenceFrame.centerX,
            safeMinX + resources.currentFrame.width * 0.5,
            safeMaxX - resources.currentFrame.width * 0.5,
          );
      const safeCenterY = introCopyFrame.centered
        ? (safeMinY + safeMaxY) * 0.5
        : clamp(
            resources.referenceFrame.centerY,
            safeMinY + resources.currentFrame.height * 0.5,
            safeMaxY - resources.currentFrame.height * 0.5,
          );
      targetCenterX = lerp(targetCenterX, safeCenterX, introPhaseWeight);
      targetCenterY = lerp(targetCenterY, safeCenterY, introPhaseWeight);
    }
  }

  const mobileFaceWeight =
    mobileViewportWeight * clamp(introPhaseWeight + outroPhaseWeight, 0, 1);

  if (mobileFaceWeight > 0.001) {
    const mobileFaceScale = lerp(1, MOBILE_FACE_SCALE, mobileFaceWeight);

    cloud.scale.multiplyScalar(mobileFaceScale);
    layoutScale *= mobileFaceScale;
    cloud.updateMatrixWorld();
    projectBoundsToScreenFrame(
      resources.bounds,
      cloud,
      camera,
      resources.corner,
      resources.currentFrame,
    );
    targetCenterY +=
      mobileViewportWeight *
      (introPhaseWeight * MOBILE_INTRO_FACE_OFFSET_Y +
        outroPhaseWeight * MOBILE_OUTRO_FACE_OFFSET_Y);
  }

  resources.bounds.getCenter(resources.boundsCenter);
  resources.boundsCenter.applyMatrix4(cloud.matrixWorld).project(camera);
  resources.currentFramePoint
    .set(
      resources.currentFrame.centerX,
      resources.currentFrame.centerY,
      resources.boundsCenter.z,
    )
    .unproject(camera);
  resources.targetFramePoint
    .set(targetCenterX, targetCenterY, resources.boundsCenter.z)
    .unproject(camera)
    .sub(resources.currentFramePoint);
  cloud.position.add(resources.targetFramePoint);
  cloud.updateMatrixWorld();

  return layoutScale;
}

function createScreenFrame(): ScreenFrame {
  return {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0,
  };
}

function configureReferenceCamera(
  camera: THREE.PerspectiveCamera,
  state: SceneCameraState,
  target: THREE.Vector3,
) {
  camera.position.set(...state.position);
  target.set(...state.target);
  camera.fov = state.fov;
  camera.aspect = REFERENCE_VIEWPORT_ASPECT;
  camera.near = 0.1;
  camera.far = 100;
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

function projectBoundsToScreenFrame(
  bounds: THREE.Box3,
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  corner: THREE.Vector3,
  frame: ScreenFrame,
) {
  frame.minX = Number.POSITIVE_INFINITY;
  frame.maxX = Number.NEGATIVE_INFINITY;
  frame.minY = Number.POSITIVE_INFINITY;
  frame.maxY = Number.NEGATIVE_INFINITY;

  for (let xIndex = 0; xIndex < 2; xIndex += 1) {
    for (let yIndex = 0; yIndex < 2; yIndex += 1) {
      for (let zIndex = 0; zIndex < 2; zIndex += 1) {
        corner
          .set(
            xIndex ? bounds.max.x : bounds.min.x,
            yIndex ? bounds.max.y : bounds.min.y,
            zIndex ? bounds.max.z : bounds.min.z,
          )
          .applyMatrix4(object.matrixWorld)
          .project(camera);
        frame.minX = Math.min(frame.minX, corner.x);
        frame.maxX = Math.max(frame.maxX, corner.x);
        frame.minY = Math.min(frame.minY, corner.y);
        frame.maxY = Math.max(frame.maxY, corner.y);
      }
    }
  }

  frame.width = frame.maxX - frame.minX;
  frame.height = frame.maxY - frame.minY;
  frame.centerX = (frame.minX + frame.maxX) * 0.5;
  frame.centerY = (frame.minY + frame.maxY) * 0.5;
}

function getViewportFrameWeight(
  viewportFrame: SceneCloudState["viewportFrame"],
) {
  return viewportFrame === "preserve" ? 1 : 0;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
