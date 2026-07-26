import * as THREE from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";

import type {
  ParticleObstacleFrame,
  ParticleObstacleRuntime,
} from "@/lib/particle-obstacle-field";
import type { PointerParticleInteractionFrame } from "@/lib/pointer-particle-interaction";
import type { PointCloudTargetId } from "@/lib/scene-types";
import {
  MAX_GPU_PARTICLE_OBSTACLES,
  MAX_GPU_PRESSURE_RIPPLES,
  PARTICLE_OFFSET_SHADER,
  PARTICLE_VELOCITY_SHADER,
  PARTICLE_VERTEX_DECLARATIONS,
  PARTICLE_VERTEX_POSITION,
} from "@/lib/gpu-particles/shaders";
import {
  createGpuParticleGeometry,
  createParticleTextureSet,
  type ParticleTextureSet,
} from "@/lib/gpu-particles/textures";

export type GpuParticleFrame = {
  currentTargetId: PointCloudTargetId;
  nextTargetId: PointCloudTargetId;
  blend: number;
  noise: number;
  intensity: number;
  pulse: number;
  delta: number;
  obstacleFrame: ParticleObstacleFrame;
  pointerFrame: PointerParticleInteractionFrame;
};

export type GpuParticleRuntime = {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  update: (frame: GpuParticleFrame) => void;
  dispose: () => void;
};

type ParticleUniforms = ReturnType<typeof createParticleUniforms>;

export function createGpuParticleRuntime({
  renderer,
  basePositions,
  morphTargets,
  seeds,
  allowSoftwareRenderer = false,
}: {
  renderer: THREE.WebGLRenderer;
  basePositions: Float32Array;
  morphTargets: Record<PointCloudTargetId, Float32Array>;
  seeds: Float32Array;
  allowSoftwareRenderer?: boolean;
}): GpuParticleRuntime | null {
  const gl = renderer.getContext();
  if (
    renderer.capabilities.maxVertexTextures <= 0 ||
    !gl.getExtension("EXT_color_buffer_float") ||
    (!allowSoftwareRenderer && isSoftwareRenderer(gl))
  ) {
    return null;
  }

  const pointCount = Math.floor(basePositions.length / 3);
  const textureSet = createParticleTextureSet({
    morphTargets,
    seeds,
    pointCount,
  });
  const gpuCompute = new GPUComputationRenderer(
    textureSet.size,
    textureSet.size,
    renderer,
  );
  const initialOffset = gpuCompute.createTexture();
  const initialVelocity = gpuCompute.createTexture();
  (initialOffset.image.data as Float32Array).fill(0);
  (initialVelocity.image.data as Float32Array).fill(0);

  const offsetVariable = gpuCompute.addVariable(
    "textureParticleOffset",
    PARTICLE_OFFSET_SHADER,
    initialOffset,
  );
  const velocityVariable = gpuCompute.addVariable(
    "textureParticleVelocity",
    PARTICLE_VELOCITY_SHADER,
    initialVelocity,
  );
  gpuCompute.setVariableDependencies(offsetVariable, [
    offsetVariable,
    velocityVariable,
  ]);
  gpuCompute.setVariableDependencies(velocityVariable, [
    offsetVariable,
    velocityVariable,
  ]);

  const uniforms = createParticleUniforms(textureSet);
  Object.assign(offsetVariable.material.uniforms, {
    uParticleSeeds: uniforms.uParticleSeeds,
    uDelta: uniforms.uDelta,
    uMaxOffset: uniforms.uMaxOffset,
  });
  Object.assign(velocityVariable.material.uniforms, simulationUniforms(uniforms));

  const initError = gpuCompute.init();
  if (initError) {
    offsetVariable.material.dispose();
    velocityVariable.material.dispose();
    gpuCompute.dispose();
    textureSet.dispose();
    return null;
  }

  uniforms.uParticleOffset.value = gpuCompute.getCurrentRenderTarget(
    offsetVariable,
  ).texture;
  const geometry = createGpuParticleGeometry(basePositions, textureSet.size);
  const material = createGpuParticleMaterial(uniforms);
  const selectedObstacles: ParticleObstacleRuntime[] = [];

  return {
    geometry,
    material,
    update(frame) {
      updateFrameUniforms(
        uniforms,
        textureSet,
        frame,
        selectedObstacles,
      );
      gpuCompute.compute();
      uniforms.uParticleOffset.value = gpuCompute.getCurrentRenderTarget(
        offsetVariable,
      ).texture;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      offsetVariable.material.dispose();
      velocityVariable.material.dispose();
      gpuCompute.dispose();
      textureSet.dispose();
    },
  };
}

function createParticleUniforms(textureSet: ParticleTextureSet) {
  const fallbackTarget = textureSet.targets.face;

  return {
    uParticleOffset: new THREE.Uniform<THREE.Texture>(textureSet.seeds),
    uParticleSeeds: new THREE.Uniform<THREE.Texture>(textureSet.seeds),
    uShapeFrom: new THREE.Uniform<THREE.Texture>(fallbackTarget),
    uShapeTo: new THREE.Uniform<THREE.Texture>(fallbackTarget),
    uBlend: new THREE.Uniform(0),
    uNoiseAmount: new THREE.Uniform(0),
    uIntensity: new THREE.Uniform(1),
    uPulse: new THREE.Uniform(0),
    uDelta: new THREE.Uniform(0),
    uMaxOffset: new THREE.Uniform(0.38),
    uObstacleCount: new THREE.Uniform(0),
    uObstacleCenters: new THREE.Uniform(
      createVector3Array(MAX_GPU_PARTICLE_OBSTACLES),
    ),
    uObstacleRightAxes: new THREE.Uniform(
      createVector3Array(MAX_GPU_PARTICLE_OBSTACLES),
    ),
    uObstacleUpAxes: new THREE.Uniform(
      createVector3Array(MAX_GPU_PARTICLE_OBSTACLES),
    ),
    uObstacleNormals: new THREE.Uniform(
      createVector3Array(MAX_GPU_PARTICLE_OBSTACLES),
    ),
    uObstacleHalfSizes: new THREE.Uniform(
      createVector2Array(MAX_GPU_PARTICLE_OBSTACLES),
    ),
    uObstacleCornerRadii: new THREE.Uniform(
      new Float32Array(MAX_GPU_PARTICLE_OBSTACLES),
    ),
    uObstacleStrengths: new THREE.Uniform(
      new Float32Array(MAX_GPU_PARTICLE_OBSTACLES),
    ),
    uObstacleFlowVelocities: new THREE.Uniform(
      createVector2Array(MAX_GPU_PARTICLE_OBSTACLES),
    ),
    uObstacleAngularVelocities: new THREE.Uniform(
      new Float32Array(MAX_GPU_PARTICLE_OBSTACLES),
    ),
    uPointerActive: new THREE.Uniform(0),
    uPointerStrength: new THREE.Uniform(0),
    uPointerRadius: new THREE.Uniform(0.001),
    uPointerPoint: new THREE.Uniform(new THREE.Vector3()),
    uPointerRight: new THREE.Uniform(new THREE.Vector3(1, 0, 0)),
    uPointerUp: new THREE.Uniform(new THREE.Vector3(0, 1, 0)),
    uPointerNormal: new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
    uPointerFlowVelocity: new THREE.Uniform(new THREE.Vector2()),
    uRippleCount: new THREE.Uniform(0),
    uRipplePoints: new THREE.Uniform(
      createVector3Array(MAX_GPU_PRESSURE_RIPPLES),
    ),
    uRippleData: new THREE.Uniform(
      createVector3Array(MAX_GPU_PRESSURE_RIPPLES),
    ),
  };
}

function simulationUniforms(uniforms: ParticleUniforms) {
  return {
    uParticleSeeds: uniforms.uParticleSeeds,
    uShapeFrom: uniforms.uShapeFrom,
    uShapeTo: uniforms.uShapeTo,
    uBlend: uniforms.uBlend,
    uNoiseAmount: uniforms.uNoiseAmount,
    uIntensity: uniforms.uIntensity,
    uPulse: uniforms.uPulse,
    uDelta: uniforms.uDelta,
    uMaxOffset: uniforms.uMaxOffset,
    uObstacleCount: uniforms.uObstacleCount,
    uObstacleCenters: uniforms.uObstacleCenters,
    uObstacleRightAxes: uniforms.uObstacleRightAxes,
    uObstacleUpAxes: uniforms.uObstacleUpAxes,
    uObstacleNormals: uniforms.uObstacleNormals,
    uObstacleHalfSizes: uniforms.uObstacleHalfSizes,
    uObstacleCornerRadii: uniforms.uObstacleCornerRadii,
    uObstacleStrengths: uniforms.uObstacleStrengths,
    uObstacleFlowVelocities: uniforms.uObstacleFlowVelocities,
    uObstacleAngularVelocities: uniforms.uObstacleAngularVelocities,
    uPointerActive: uniforms.uPointerActive,
    uPointerStrength: uniforms.uPointerStrength,
    uPointerRadius: uniforms.uPointerRadius,
    uPointerPoint: uniforms.uPointerPoint,
    uPointerRight: uniforms.uPointerRight,
    uPointerUp: uniforms.uPointerUp,
    uPointerNormal: uniforms.uPointerNormal,
    uPointerFlowVelocity: uniforms.uPointerFlowVelocity,
  };
}

function createGpuParticleMaterial(uniforms: ParticleUniforms) {
  const material = new THREE.PointsMaterial({
    color: new THREE.Color("#ffffff"),
    size: 0.018,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uParticleOffset: uniforms.uParticleOffset,
      uParticleSeeds: uniforms.uParticleSeeds,
      uShapeFrom: uniforms.uShapeFrom,
      uShapeTo: uniforms.uShapeTo,
      uBlend: uniforms.uBlend,
      uNoiseAmount: uniforms.uNoiseAmount,
      uIntensity: uniforms.uIntensity,
      uPulse: uniforms.uPulse,
      uRippleCount: uniforms.uRippleCount,
      uRipplePoints: uniforms.uRipplePoints,
      uRippleData: uniforms.uRippleData,
      uPointerRight: uniforms.uPointerRight,
      uPointerUp: uniforms.uPointerUp,
      uPointerNormal: uniforms.uPointerNormal,
    });
    shader.vertexShader = `${PARTICLE_VERTEX_DECLARATIONS}\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      PARTICLE_VERTEX_POSITION,
    );
  };
  material.customProgramCacheKey = () => "gpu-particle-points-v1";
  return material;
}

function updateFrameUniforms(
  uniforms: ParticleUniforms,
  textureSet: ParticleTextureSet,
  frame: GpuParticleFrame,
  selectedObstacles: ParticleObstacleRuntime[],
) {
  uniforms.uShapeFrom.value =
    textureSet.targets[frame.currentTargetId] ?? textureSet.targets.face;
  uniforms.uShapeTo.value =
    textureSet.targets[frame.nextTargetId] ?? textureSet.targets.face;
  uniforms.uBlend.value = frame.blend;
  uniforms.uNoiseAmount.value = frame.noise;
  uniforms.uIntensity.value = frame.intensity;
  uniforms.uPulse.value = frame.pulse;
  uniforms.uDelta.value = frame.delta;
  uniforms.uMaxOffset.value = Math.max(
    0.38,
    frame.pointerFrame.hoverRadius * 0.36,
  );

  updateObstacleUniforms(
    uniforms,
    frame.obstacleFrame,
    selectedObstacles,
  );
  updatePointerUniforms(uniforms, frame.pointerFrame);
}

function updateObstacleUniforms(
  uniforms: ParticleUniforms,
  frame: ParticleObstacleFrame,
  selectedObstacles: ParticleObstacleRuntime[],
) {
  selectedObstacles.length = 0;
  selectedObstacles.push(...frame.fields);
  selectedObstacles.sort((left, right) => right.strength - left.strength);
  selectedObstacles.length = Math.min(
    selectedObstacles.length,
    MAX_GPU_PARTICLE_OBSTACLES,
  );
  uniforms.uObstacleCount.value = selectedObstacles.length;

  const centers = uniforms.uObstacleCenters.value;
  const rightAxes = uniforms.uObstacleRightAxes.value;
  const upAxes = uniforms.uObstacleUpAxes.value;
  const normals = uniforms.uObstacleNormals.value;
  const halfSizes = uniforms.uObstacleHalfSizes.value;
  const cornerRadii = uniforms.uObstacleCornerRadii.value;
  const strengths = uniforms.uObstacleStrengths.value;
  const flowVelocities = uniforms.uObstacleFlowVelocities.value;
  const angularVelocities = uniforms.uObstacleAngularVelocities.value;

  for (let index = 0; index < selectedObstacles.length; index += 1) {
    const field = selectedObstacles[index];
    centers[index].copy(field.center);
    rightAxes[index].copy(field.rightAxis);
    upAxes[index].copy(field.upAxis);
    normals[index].copy(field.planeNormal);
    halfSizes[index].set(field.halfWidth, field.halfHeight);
    cornerRadii[index] = field.cornerRadius;
    strengths[index] = field.strength;
    flowVelocities[index].copy(field.flowVelocity);
    angularVelocities[index] = field.angularVelocity;
  }
}

function updatePointerUniforms(
  uniforms: ParticleUniforms,
  frame: PointerParticleInteractionFrame,
) {
  uniforms.uPointerActive.value = frame.hoverActive ? 1 : 0;
  uniforms.uPointerStrength.value = frame.hoverStrength;
  uniforms.uPointerRadius.value = frame.hoverRadius;
  uniforms.uPointerPoint.value.copy(frame.localPoint);
  uniforms.uPointerRight.value.copy(frame.localRight);
  uniforms.uPointerUp.value.copy(frame.localUp);
  uniforms.uPointerNormal.value.copy(frame.localNormal);
  uniforms.uPointerFlowVelocity.value.copy(frame.flowVelocity);

  const rippleCount = Math.min(
    frame.ripples.length,
    MAX_GPU_PRESSURE_RIPPLES,
  );
  uniforms.uRippleCount.value = rippleCount;

  for (let index = 0; index < rippleCount; index += 1) {
    const ripple = frame.ripples[index];
    uniforms.uRipplePoints.value[index].copy(ripple.localPoint);
    uniforms.uRippleData.value[index].set(
      ripple.age,
      ripple.strength,
      ripple.unitRadius,
    );
  }
}

function createVector2Array(length: number) {
  return Array.from({ length }, () => new THREE.Vector2());
}

function createVector3Array(length: number) {
  return Array.from({ length }, () => new THREE.Vector3());
}

function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (!debugInfo) {
    return false;
  }

  const rendererName = String(
    gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
  );
  return /swiftshader|llvmpipe|software rasterizer/i.test(rendererName);
}
