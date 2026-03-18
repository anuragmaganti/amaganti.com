"use client";

import { AdaptiveDpr } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion";
import { useReducedMotion } from "motion/react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

import {
  FACE_SCAN_GLB_PATH,
  POINT_CLOUD_ASSET_PATH,
  POINT_CLOUD_TEXT_TARGETS,
  RENDER_DEFAULTS,
  SCENE_PHASES,
  type PointCloudShape,
  type PointCloudTargetId,
  type PointCloudTextTargetId,
} from "@/lib/scene-config";
import {
  createMorphTargets,
  generateFallbackFacePoints,
  normalizePositions,
  orientImportedPositions,
  samplePositions,
} from "@/lib/point-cloud";

const POINTER_SMOOTHING = 14;
const POINTER_PRESENCE_SMOOTHING = 10;
const MOUSE_REPULSION_RADIUS = 0.34;
const MOUSE_REPULSION_RADIUS_SQ = MOUSE_REPULSION_RADIUS * MOUSE_REPULSION_RADIUS;
const MOUSE_REPULSION_DISPLACEMENT = 0.14;
const MOUSE_REPULSION_DEPTH_BOOST = 1.14;

type SceneCanvasProps = {
  progress: MotionValue<number>;
};

type QualityProfile = {
  maxPoints: number;
  dpr: [number, number];
  sizeMultiplier: number;
  noiseMultiplier: number;
  textHaloMultiplier: number;
  textScaleMultiplier: number;
  faceScaleMultiplier: number;
};

type PointCloudSystemProps = {
  basePositions: Float32Array;
  progress: MotionValue<number>;
  reducedMotion: boolean;
  profile: QualityProfile;
};

export function SceneCanvas({ progress }: SceneCanvasProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const profile = useQualityProfile(reducedMotion);
  const basePositions = usePointCloudSource(profile.maxPoints);

  return (
    <Canvas
      dpr={profile.dpr}
      camera={{ position: [0, 0, 4.9], fov: 30 }}
      frameloop="demand"
      gl={{
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: "high-performance",
        stencil: false,
      }}
      performance={{ min: 0.55 }}
    >
      <AdaptiveDpr pixelated />
      <PointCloudSystem
        basePositions={basePositions}
        progress={progress}
        reducedMotion={reducedMotion}
        profile={profile}
      />
    </Canvas>
  );
}

function PointCloudSystem({
  basePositions,
  progress,
  reducedMotion,
  profile,
}: PointCloudSystemProps) {
  const invalidate = useThree((state) => state.invalidate);
  const pointCount = Math.floor(basePositions.length / 3);
  const renderPositions = useMemo(
    () => new Float32Array(basePositions.length),
    [basePositions.length],
  );
  const typographyVersion = useTypographyVersion('700 220px "Montserrat"');
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry();
    const attribute = new THREE.BufferAttribute(renderPositions, 3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    nextGeometry.setAttribute("position", attribute);
    nextGeometry.computeBoundingSphere();
    return nextGeometry;
  }, [renderPositions]);
  const seeds = useMemo(() => {
    const values = new Float32Array(pointCount * 2);

    for (let index = 0; index < pointCount; index += 1) {
      values[index * 2] = hash(index, 0.13);
      values[index * 2 + 1] = hash(index, 0.79);
    }

    return values;
  }, [pointCount]);
  const morphTargets = useMemo(
    () =>
      createMorphTargets(basePositions, {
        textTargets: Object.values(POINT_CLOUD_TEXT_TARGETS),
        haloDensityMultiplier: profile.textHaloMultiplier,
        textScaleMultiplier: profile.textScaleMultiplier,
      }),
    [
      basePositions,
      profile.textScaleMultiplier,
      profile.textHaloMultiplier,
      typographyVersion,
    ],
  );
  const cloudMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color("#ffffff"),
        size: 0.018,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const cloud = useMemo(() => {
    const points = new THREE.Points(geometry, cloudMaterial);
    points.frustumCulled = false;
    return points;
  }, [cloudMaterial, geometry]);
  const cameraTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const desiredCamera = useMemo(() => new THREE.Vector3(0, 0, 4.9), []);
  const pointerTarget = useMemo(() => new THREE.Vector2(0, 0), []);
  const pointerCurrent = useMemo(() => new THREE.Vector2(0, 0), []);
  const pointerRayCurrent = useMemo(() => new THREE.Vector2(0, 0), []);
  const pointerPresenceTarget = useRef(0);
  const pointerPresenceCurrent = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const interactionPlane = useMemo(() => new THREE.Plane(), []);
  const interactionPlaneNormal = useMemo(() => new THREE.Vector3(), []);
  const cloudWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const worldInteractionPoint = useMemo(() => new THREE.Vector3(), []);
  const localInteractionPoint = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const unsubscribe = progress.on("change", () => {
      invalidate();
    });

    return () => {
      unsubscribe();
    };
  }, [invalidate, progress]);

  useEffect(() => {
    renderPositions.set(morphTargets.face);
    geometry.attributes.position.needsUpdate = true;
    invalidate();
  }, [geometry, invalidate, morphTargets, renderPositions]);

  useEffect(() => {
    if (reducedMotion || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointerTarget.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      );
      pointerPresenceTarget.current = 1;
      invalidate();
    };
    const resetPointer = () => {
      pointerTarget.set(0, 0);
      pointerPresenceTarget.current = 0;
      invalidate();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", resetPointer);
    window.addEventListener("blur", resetPointer);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", resetPointer);
      window.removeEventListener("blur", resetPointer);
    };
  }, [invalidate, pointerTarget, reducedMotion]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      cloudMaterial.dispose();
    };
  }, [cloudMaterial, geometry]);

  useFrame(({ camera, clock }, delta) => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const phaseState = sampleSceneProgress(progress.get());
    const shapeFrom =
      morphTargets[resolveMorphTargetId(phaseState.current.cloud)] ?? morphTargets.face;
    const shapeTo =
      morphTargets[resolveMorphTargetId(phaseState.next.cloud)] ?? morphTargets.face;
    const noise = phaseState.cloud.noise * profile.noiseMultiplier;
    const blend = reducedMotion ? Math.min(phaseState.mix, 0.6) : phaseState.mix;
    const pulse = reducedMotion
      ? 0.24
      : 0.34 + 0.26 * Math.sin(progress.get() * Math.PI * 6 + clock.elapsedTime * 0.2);
    const pointerLerp = 1 - Math.exp(-delta * POINTER_SMOOTHING);
    const pointerPresenceLerp = 1 - Math.exp(-delta * POINTER_PRESENCE_SMOOTHING);

    pointerCurrent.lerp(pointerTarget, pointerLerp);
    pointerPresenceCurrent.current = lerp(
      pointerPresenceCurrent.current,
      pointerPresenceTarget.current,
      pointerPresenceLerp,
    );

    const trackingStrength =
      getFaceTrackingWeight(phaseState.current.cloud.shape, phaseState.next.cloud.shape, blend) *
      (reducedMotion ? 0.45 : 1);
    const pointerPitch = pointerCurrent.y * 0.08 * trackingStrength;
    const pointerYaw = pointerCurrent.x * 0.14 * trackingStrength;

    cloud.position.set(...phaseState.cloud.position);
    cloud.rotation.set(
      phaseState.cloud.rotation[0] + pointerPitch,
      phaseState.cloud.rotation[1] + pointerYaw,
      phaseState.cloud.rotation[2],
    );
    const responsiveCloudScaleMultiplier = getResponsiveCloudScaleMultiplier(
      phaseState.current.cloud.shape,
      phaseState.next.cloud.shape,
      blend,
      profile,
    );
    cloud.scale.setScalar(phaseState.cloud.scale * responsiveCloudScaleMultiplier);
    cloudMaterial.size = phaseState.cloud.pointSize * profile.sizeMultiplier;
    cloudMaterial.opacity = phaseState.cloud.opacity;

    desiredCamera.set(...phaseState.camera.position);
    cameraTarget.set(...phaseState.camera.target);

    perspectiveCamera.position.copy(desiredCamera);
    perspectiveCamera.lookAt(cameraTarget);
    perspectiveCamera.fov = phaseState.camera.fov;
    perspectiveCamera.updateProjectionMatrix();
    perspectiveCamera.updateMatrixWorld();

    cloud.updateMatrixWorld();

    let hasInteractionPoint = false;
    let interactionStrength = 0;

    if (pointerPresenceCurrent.current > 0.001) {
      interactionStrength =
        pointerPresenceCurrent.current *
        getMouseRepulsionWeight(
          phaseState.current.cloud.shape,
          phaseState.next.cloud.shape,
          blend,
        );

      if (interactionStrength > 0.001) {
        cloud.getWorldPosition(cloudWorldPosition);
        interactionPlaneNormal
          .copy(perspectiveCamera.position)
          .sub(cloudWorldPosition)
          .normalize();
        interactionPlane.setFromNormalAndCoplanarPoint(
          interactionPlaneNormal,
          cloudWorldPosition,
        );
        pointerRayCurrent.set(pointerCurrent.x, -pointerCurrent.y);
        raycaster.setFromCamera(pointerRayCurrent, perspectiveCamera);

        if (raycaster.ray.intersectPlane(interactionPlane, worldInteractionPoint)) {
          localInteractionPoint.copy(worldInteractionPoint);
          cloud.worldToLocal(localInteractionPoint);
          hasInteractionPoint = true;
        }
      }
    }

    for (let index = 0; index < pointCount; index += 1) {
      const offset = index * 3;
      let x = lerp(shapeFrom[offset], shapeTo[offset], blend);
      let y = lerp(shapeFrom[offset + 1], shapeTo[offset + 1], blend);
      let z = lerp(shapeFrom[offset + 2], shapeTo[offset + 2], blend);

      const drift =
        noise * (0.01 + ((index % 5) * 0.0012)) * phaseState.cloud.intensity * pulse;
      const seedA = seeds[index * 2];
      const seedB = seeds[index * 2 + 1];
      const spreadX = seedA - 0.5;
      const spreadY = seedB - 0.5;
      const spreadZ = (seedA + seedB) * 0.5 - 0.5;

      x += spreadX * drift;
      y += spreadY * drift * 0.8;
      z += spreadZ * drift * 1.15;

      if (hasInteractionPoint) {
        let repelX = x - localInteractionPoint.x;
        let repelY = y - localInteractionPoint.y;
        let repelZ = z - localInteractionPoint.z;
        let repelLengthSq = repelX * repelX + repelY * repelY + repelZ * repelZ;

        if (repelLengthSq < MOUSE_REPULSION_RADIUS_SQ) {
          if (repelLengthSq < 0.000001) {
            repelX = spreadX || 0.001;
            repelY = spreadY || 0.001;
            repelZ = spreadZ || 0.001;
            repelLengthSq = repelX * repelX + repelY * repelY + repelZ * repelZ;
          }

          const repelLength = Math.sqrt(repelLengthSq);
          const falloff = 1 - repelLength / MOUSE_REPULSION_RADIUS;
          const displacement =
            MOUSE_REPULSION_DISPLACEMENT * falloff * falloff * interactionStrength;
          const inverseLength = 1 / repelLength;

          x += repelX * inverseLength * displacement;
          y += repelY * inverseLength * displacement;
          z += repelZ * inverseLength * displacement * MOUSE_REPULSION_DEPTH_BOOST;
        }
      }

      renderPositions[offset] = x;
      renderPositions[offset + 1] = y;
      renderPositions[offset + 2] = z;
    }

    geometry.attributes.position.needsUpdate = true;

    if (
      pointerCurrent.distanceToSquared(pointerTarget) > 0.00004 ||
      Math.abs(pointerPresenceCurrent.current - pointerPresenceTarget.current) > 0.00004
    ) {
      invalidate();
    }
  });

  return <primitive object={cloud} />;
}

function usePointCloudSource(maxPoints: number) {
  const [rawAssetPositions, setRawAssetPositions] = useState<Float32Array | null>(null);
  const fallbackPositions = useMemo(
    () => generateFallbackFacePoints(maxPoints),
    [maxPoints],
  );

  useEffect(() => {
    let cancelled = false;
    const commitPositions = (positions: Float32Array | null) => {
      if (cancelled || !positions || !positions.length) {
        return;
      }

      startTransition(() => {
        setRawAssetPositions(positions);
      });
    };
    const loadGlbFallback = () => {
      const gltfLoader = new GLTFLoader();

      gltfLoader.load(
        FACE_SCAN_GLB_PATH,
        (gltf) => {
          if (cancelled) {
            return;
          }

          commitPositions(samplePointsFromScene(gltf.scene, 18000));
        },
        undefined,
        () => undefined,
      );
    };
    const plyLoader = new PLYLoader();

    plyLoader.load(
      POINT_CLOUD_ASSET_PATH,
      (geometry) => {
        if (cancelled) {
          return;
        }

        const positions = geometry.getAttribute("position");

        if (!positions || positions.count === 0) {
          loadGlbFallback();
          return;
        }

        commitPositions(new Float32Array(positions.array as ArrayLike<number>));
      },
      undefined,
      () => {
        loadGlbFallback();
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    if (!rawAssetPositions) {
      return fallbackPositions;
    }

    return normalizePositions(
      orientImportedPositions(samplePositions(rawAssetPositions, maxPoints)),
    );
  }, [fallbackPositions, maxPoints, rawAssetPositions]);
}

function useQualityProfile(reducedMotion: boolean) {
  const [profile, setProfile] = useState<QualityProfile>({
    maxPoints: reducedMotion
      ? RENDER_DEFAULTS.reducedMaxPoints
      : RENDER_DEFAULTS.desktopMaxPoints,
    dpr: reducedMotion ? RENDER_DEFAULTS.mobileDpr : RENDER_DEFAULTS.desktopDpr,
    sizeMultiplier: reducedMotion ? 1.2 : 1,
    noiseMultiplier: reducedMotion ? 0.5 : 1,
    textHaloMultiplier: reducedMotion ? 0.2 : 1,
    textScaleMultiplier: 1,
    faceScaleMultiplier: 1,
  });

  useEffect(() => {
    const computeProfile = () => {
      const width = window.innerWidth;
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const mobileTextScale =
        width >= 900
          ? 1
          : 0.42 +
            Math.pow(THREE.MathUtils.clamp((width - 300) / 600, 0, 1), 1.35) * 0.58;
      const mobileFaceScale = mobileTextScale;
      const memory =
        "deviceMemory" in navigator
          ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
          : 8;
      const cores = navigator.hardwareConcurrency ?? 8;
      const constrainedDevice = coarsePointer || width < 900 || memory <= 4 || cores <= 4;

      if (reducedMotion) {
        setProfile({
          maxPoints: RENDER_DEFAULTS.reducedMaxPoints,
          dpr: RENDER_DEFAULTS.mobileDpr,
          sizeMultiplier: 1.18,
          noiseMultiplier: 0.18,
          textHaloMultiplier: 0.12,
          textScaleMultiplier: mobileTextScale,
          faceScaleMultiplier: mobileFaceScale,
        });
        return;
      }

      setProfile({
        maxPoints: constrainedDevice
          ? RENDER_DEFAULTS.mobileMaxPoints
          : RENDER_DEFAULTS.desktopMaxPoints,
        dpr: constrainedDevice
          ? RENDER_DEFAULTS.mobileDpr
          : RENDER_DEFAULTS.desktopDpr,
        sizeMultiplier: constrainedDevice ? 1.12 : 1,
        noiseMultiplier: constrainedDevice ? 0.3 : 0.48,
        textHaloMultiplier: constrainedDevice ? 0.42 : 1,
        textScaleMultiplier: mobileTextScale,
        faceScaleMultiplier: mobileFaceScale,
      });
    };

    computeProfile();
    window.addEventListener("resize", computeProfile);

    return () => {
      window.removeEventListener("resize", computeProfile);
    };
  }, [reducedMotion]);

  return profile;
}

function getResponsiveCloudScaleMultiplier(
  currentShape: PointCloudShape,
  nextShape: PointCloudShape,
  mix: number,
  profile: QualityProfile,
) {
  const currentMultiplier =
    currentShape === "face"
      ? profile.faceScaleMultiplier
      : currentShape === "text"
        ? profile.textScaleMultiplier
        : 1;
  const nextMultiplier =
    nextShape === "face"
      ? profile.faceScaleMultiplier
      : nextShape === "text"
        ? profile.textScaleMultiplier
        : 1;

  return lerp(currentMultiplier, nextMultiplier, mix);
}

function sampleSceneProgress(progress: number) {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
  let activeIndex = SCENE_PHASES.findIndex(
    (phase, index) =>
      clampedProgress >= phase.range[0] &&
      (clampedProgress <= phase.range[1] || index === SCENE_PHASES.length - 1),
  );

  if (activeIndex < 0) {
    activeIndex = 0;
  }

  const current = SCENE_PHASES[activeIndex];
  const next = SCENE_PHASES[Math.min(activeIndex + 1, SCENE_PHASES.length - 1)];
  const rangeSpan = Math.max(current.range[1] - current.range[0], 0.0001);
  const linearMix = (clampedProgress - current.range[0]) / rangeSpan;
  const mix = smoothstep(THREE.MathUtils.clamp(linearMix, 0, 1));

  return {
    current,
    next,
    mix,
    camera: {
      position: lerpVector3(current.camera.position, next.camera.position, mix),
      target: lerpVector3(current.camera.target, next.camera.target, mix),
      fov: lerp(current.camera.fov, next.camera.fov, mix),
    },
    cloud: {
      shape: blendShape(current.cloud.shape, next.cloud.shape, mix),
      textTargetId: blendTextTargetId(
        current.cloud.textTargetId,
        next.cloud.textTargetId,
        mix,
      ),
      position: lerpVector3(current.cloud.position, next.cloud.position, mix),
      rotation: lerpVector3(current.cloud.rotation, next.cloud.rotation, mix),
      scale: lerp(current.cloud.scale, next.cloud.scale, mix),
      pointSize: lerp(current.cloud.pointSize, next.cloud.pointSize, mix),
      noise: lerp(current.cloud.noise, next.cloud.noise, mix),
      intensity: lerp(current.cloud.intensity, next.cloud.intensity, mix),
      opacity: lerp(current.cloud.opacity, next.cloud.opacity, mix),
    },
  };
}

function blendShape(
  current: PointCloudShape,
  next: PointCloudShape,
  mix: number,
): PointCloudShape {
  return mix < 0.5 ? current : next;
}

function blendTextTargetId(
  current: PointCloudTextTargetId | undefined,
  next: PointCloudTextTargetId | undefined,
  mix: number,
) {
  return mix < 0.5 ? current : next;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function lerpVector3(
  start: [number, number, number],
  end: [number, number, number],
  progress: number,
): [number, number, number] {
  return [
    lerp(start[0], end[0], progress),
    lerp(start[1], end[1], progress),
    lerp(start[2], end[2], progress),
  ];
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function getFaceTrackingWeight(
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
    case "project-field-1":
      return 0.44;
    case "project-field-2":
      return 0.52;
    case "project-field-3":
      return 0.48;
    case "orbital":
      return 0.34;
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

function hash(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

function resolveMorphTargetId(cloud: {
  shape: PointCloudShape;
  textTargetId?: PointCloudTextTargetId;
}): PointCloudTargetId {
  if (cloud.shape === "text" && cloud.textTargetId) {
    return cloud.textTargetId;
  }

  return cloud.shape === "text" ? "settle" : cloud.shape;
}

function useTypographyVersion(fontDescriptor: string) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) {
      return;
    }

    let cancelled = false;

    if (document.fonts.check(fontDescriptor)) {
      return;
    }

    Promise.all([
      document.fonts.load(fontDescriptor).catch(() => undefined),
      document.fonts.ready.catch(() => undefined),
    ]).then(() => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setVersion((current) => current + 1);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [fontDescriptor]);

  return version;
}

function samplePointsFromScene(scene: THREE.Object3D, pointCount: number) {
  const meshes: Array<
    THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>
  > = [];

  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if ("isMesh" in child && child.isMesh) {
      const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;

      if (mesh.geometry.getAttribute("position")) {
        meshes.push(mesh);
      }
    }
  });

  if (!meshes.length) {
    return new Float32Array();
  }

  const totalWeight = meshes.reduce((sum, mesh) => {
    return sum + mesh.geometry.getAttribute("position").count;
  }, 0);
  const samples: number[] = [];
  const tempPosition = new THREE.Vector3();

  meshes.forEach((mesh, meshIndex) => {
    const weight = mesh.geometry.getAttribute("position").count / totalWeight;
    const sampleCount =
      meshIndex === meshes.length - 1
        ? pointCount - Math.floor(samples.length / 3)
        : Math.max(256, Math.floor(pointCount * weight));
    const sampler = new MeshSurfaceSampler(mesh).build();

    for (let index = 0; index < sampleCount; index += 1) {
      sampler.sample(tempPosition);
      tempPosition.applyMatrix4(mesh.matrixWorld);
      samples.push(tempPosition.x, tempPosition.y, tempPosition.z);
    }
  });

  return new Float32Array(samples);
}
