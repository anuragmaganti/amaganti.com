export const MAX_GPU_PARTICLE_OBSTACLES = 12;
export const MAX_GPU_PRESSURE_RIPPLES = 2;

export const PARTICLE_OFFSET_SHADER = /* glsl */ `
  uniform sampler2D uParticleSeeds;
  uniform float uDelta;
  uniform float uMaxOffset;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 seed = texture2D(uParticleSeeds, uv);

    if (seed.a < 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    float timestep = min(uDelta, 0.0333333333);
    vec3 offset = texture2D(textureParticleOffset, uv).xyz;
    vec3 velocity = texture2D(textureParticleVelocity, uv).xyz;
    offset += velocity * timestep;

    float offsetLength = length(offset);
    if (offsetLength > uMaxOffset) {
      offset *= uMaxOffset / offsetLength;
    }

    if (offsetLength < 0.00004 && length(velocity) < 0.00004) {
      offset = vec3(0.0);
    }

    gl_FragColor = vec4(offset, 1.0);
  }
`;

export const PARTICLE_VELOCITY_SHADER = /* glsl */ `
  #define MAX_OBSTACLES ${MAX_GPU_PARTICLE_OBSTACLES}

  uniform sampler2D uParticleSeeds;
  uniform sampler2D uShapeFrom;
  uniform sampler2D uShapeTo;
  uniform float uBlend;
  uniform float uNoiseAmount;
  uniform float uIntensity;
  uniform float uPulse;
  uniform float uDelta;
  uniform float uMaxOffset;

  uniform int uObstacleCount;
  uniform vec3 uObstacleCenters[MAX_OBSTACLES];
  uniform vec3 uObstacleRightAxes[MAX_OBSTACLES];
  uniform vec3 uObstacleUpAxes[MAX_OBSTACLES];
  uniform vec3 uObstacleNormals[MAX_OBSTACLES];
  uniform vec2 uObstacleHalfSizes[MAX_OBSTACLES];
  uniform float uObstacleCornerRadii[MAX_OBSTACLES];
  uniform float uObstacleStrengths[MAX_OBSTACLES];
  uniform vec2 uObstacleFlowVelocities[MAX_OBSTACLES];
  uniform float uObstacleAngularVelocities[MAX_OBSTACLES];

  uniform float uPointerActive;
  uniform float uPointerStrength;
  uniform float uPointerRadius;
  uniform vec3 uPointerPoint;
  uniform vec3 uPointerRight;
  uniform vec3 uPointerUp;
  uniform vec3 uPointerNormal;
  uniform vec2 uPointerFlowVelocity;

  float smoother(float value) {
    float clamped = clamp(value, 0.0, 1.0);
    return clamped * clamped * (3.0 - 2.0 * clamped);
  }

  vec3 authoredPosition(vec2 uv, vec4 seed) {
    vec3 position = mix(
      texture2D(uShapeFrom, uv).xyz,
      texture2D(uShapeTo, uv).xyz,
      uBlend
    );
    float drift = uNoiseAmount * seed.b * uIntensity * uPulse;
    vec3 spread = vec3(
      seed.r - 0.5,
      seed.g - 0.5,
      (seed.r + seed.g) * 0.5 - 0.5
    );
    position += spread * vec3(drift, drift * 0.8, drift * 1.15);
    return position;
  }

  void addPlaneVector(
    int index,
    float planeX,
    float planeY,
    float depth,
    inout vec3 target
  ) {
    target +=
      uObstacleRightAxes[index] * planeX +
      uObstacleUpAxes[index] * planeY +
      uObstacleNormals[index] * depth;
  }

  void accumulateObstacle(
    int index,
    vec3 particle,
    vec3 spread,
    inout vec3 target,
    inout float refillWeight,
    inout float influence
  ) {
    vec3 deltaPosition = particle - uObstacleCenters[index];
    float planeX = dot(deltaPosition, uObstacleRightAxes[index]);
    float planeY = dot(deltaPosition, uObstacleUpAxes[index]);
    vec2 halfSize = uObstacleHalfSizes[index];
    float strength = uObstacleStrengths[index];
    float cornerRadius = clamp(
      uObstacleCornerRadii[index],
      0.0,
      min(halfSize.x, halfSize.y)
    );
    float minHalfSize = min(halfSize.x, halfSize.y);
    vec2 innerHalfSize = max(halfSize - vec2(cornerRadius), vec2(0.0));
    vec2 flow = uObstacleFlowVelocities[index] + vec2(
      uObstacleAngularVelocities[index] * planeY,
      -uObstacleAngularVelocities[index] * planeX
    );
    float flowSpeedSquared = dot(flow, flow);
    bool hasFlow = flowSpeedSquared > 0.000064;
    float flowSpeed = 0.0;
    vec2 motion = vec2(0.0);
    vec2 side = vec2(0.0);
    float alongCoordinate = 0.0;
    float sideCoordinate = 0.0;
    float alongExtent = 0.0;
    float sideExtent = 0.0;
    float normalizedAlong = 0.0;
    float normalizedSide = 0.0;
    float normalizedRadiusSquared = 0.0;

    if (hasFlow) {
      flowSpeed = sqrt(flowSpeedSquared);
      motion = flow / flowSpeed;
      side = vec2(-motion.y, motion.x);
      alongCoordinate = dot(vec2(planeX, planeY), motion);
      sideCoordinate = dot(vec2(planeX, planeY), side);
      alongExtent =
        abs(motion.x) * innerHalfSize.x +
        abs(motion.y) * innerHalfSize.y +
        cornerRadius;
      sideExtent =
        abs(side.x) * innerHalfSize.x +
        abs(side.y) * innerHalfSize.y +
        cornerRadius;

      if (
        abs(alongCoordinate) > alongExtent * 2.7 ||
        abs(sideCoordinate) > sideExtent * 2.7
      ) {
        return;
      }

      normalizedAlong = alongCoordinate / max(alongExtent, 0.001);
      normalizedSide = sideCoordinate / max(sideExtent, 0.001);
      normalizedRadiusSquared =
        normalizedAlong * normalizedAlong +
        normalizedSide * normalizedSide;

      if (normalizedRadiusSquared > 7.29) {
        return;
      }
    } else if (abs(planeX) > halfSize.x || abs(planeY) > halfSize.y) {
      return;
    }

    float signX = abs(planeX) > 0.0001
      ? sign(planeX)
      : (spread.x >= 0.0 ? 1.0 : -1.0);
    float signY = abs(planeY) > 0.0001
      ? sign(planeY)
      : (spread.y >= 0.0 ? 1.0 : -1.0);
    vec2 distanceToInner = abs(vec2(planeX, planeY)) - innerHalfSize;
    vec2 outside = max(distanceToInner, vec2(0.0));
    float outsideLength = length(outside);
    float signedDistance =
      outsideLength +
      min(max(distanceToInner.x, distanceToInner.y), 0.0) -
      cornerRadius;
    vec2 normal = vec2(0.0);

    if (outsideLength > 0.0001) {
      normal = outside / outsideLength * vec2(signX, signY);
    } else if (distanceToInner.x > distanceToInner.y) {
      normal.x = signX;
    } else {
      normal.y = signY;
    }

    if (signedDistance < 0.0) {
      influence = 1.0;
      vec2 tangent = vec2(-normal.y, normal.x);
      float seedVariation = 1.0 + spread.z * 2.0 * 0.22;
      float restingPressure =
        -signedDistance * 0.38 * seedVariation * strength;
      float tangentDrift = spread.z * 2.0 * restingPressure * 0.16;
      addPlaneVector(
        index,
        normal.x * restingPressure + tangent.x * tangentDrift,
        normal.y * restingPressure + tangent.y * tangentDrift,
        spread.z * restingPressure * 0.14,
        target
      );
    }

    if (!hasFlow) {
      return;
    }

    float speedWeight = sqrt(clamp(
      flowSpeed / max(minHalfSize * 1.2, 0.001),
      0.0,
      1.0
    ));
    float displacement = minHalfSize * 0.28 * strength * speedWeight;
    float normalizedRadius = sqrt(normalizedRadiusSquared);
    float sampleRadius = max(normalizedRadius, 1.0);
    float influenceWeight = smoother(
      1.0 - clamp((sampleRadius - 1.0) / 1.7, 0.0, 1.0)
    );

    if (influenceWeight <= 0.0) {
      return;
    }

    influence = 1.0;
    float directionLength = max(normalizedRadius, 0.0001);
    float seedDirectionLength = max(length(spread.xy), 0.0001);
    float directionAlong = normalizedRadius > 0.0001
      ? normalizedAlong / directionLength
      : spread.x / seedDirectionLength;
    float directionSide = normalizedRadius > 0.0001
      ? normalizedSide / directionLength
      : spread.y / seedDirectionLength;
    float inverseRadiusSquared = 1.0 / (sampleRadius * sampleRadius);
    float doubleAngleAlong =
      directionAlong * directionAlong - directionSide * directionSide;
    float doubleAngleSide = 2.0 * directionAlong * directionSide;
    float directionalViscosity = mix(
      0.62,
      1.0,
      smoother((directionAlong + 1.0) * 0.5)
    );
    float potentialWeight =
      inverseRadiusSquared * influenceWeight * directionalViscosity;
    float viscousSwirl =
      spread.z * 0.075 * influenceWeight *
      (1.0 - clamp(abs(directionSide), 0.0, 1.0));
    float flowAlong = doubleAngleAlong * potentialWeight;
    float flowSide = doubleAngleSide * potentialWeight + viscousSwirl;
    vec2 planeTarget = motion * flowAlong + side * flowSide;

    float behindDistance = -(alongCoordinate + alongExtent);
    float wakeLength = alongExtent * 0.9 + minHalfSize * 0.72;
    if (behindDistance >= 0.0 && behindDistance < wakeLength) {
      float longitudinalWeight = 1.0 - behindDistance / wakeLength;
      float lateralWeight = 1.0 - clamp(
        (abs(sideCoordinate) - sideExtent * 0.72) /
          max(sideExtent * 0.72, 0.001),
        0.0,
        1.0
      );
      float wakeWeight =
        longitudinalWeight * longitudinalWeight * smoother(lateralWeight);
      refillWeight = max(refillWeight, wakeWeight * strength);
    }

    addPlaneVector(
      index,
      planeTarget.x * displacement,
      planeTarget.y * displacement,
      spread.z * potentialWeight * 0.12 * displacement,
      target
    );
  }

  vec3 pointerTarget(vec3 particle, vec3 spread, inout float influence) {
    if (uPointerActive < 0.5 || uPointerStrength <= 0.001) {
      return vec3(0.0);
    }

    vec3 deltaPosition = particle - uPointerPoint;
    float planeX = dot(deltaPosition, uPointerRight);
    float planeY = dot(deltaPosition, uPointerUp);
    float planeDepth = dot(deltaPosition, uPointerNormal);
    float radius = max(uPointerRadius, 0.001);
    float normalizedRadiusSquared =
      (planeX * planeX + planeY * planeY) / (radius * radius);

    if (normalizedRadiusSquared >= 5.5225) {
      return vec3(0.0);
    }

    float normalizedRadius = sqrt(normalizedRadiusSquared);
    float depthWeight = smoother(
      1.0 - abs(planeDepth) / max(radius * 3.5, 0.001)
    );
    float lensWeight = smoother(1.0 - normalizedRadius / 1.25) * depthWeight;
    float flowInfluence = smoother(
      1.0 - clamp((normalizedRadius - 1.0) / 1.35, 0.0, 1.0)
    ) * depthWeight;
    float flowSpeed = length(uPointerFlowVelocity);
    float speedWeight = smoother(clamp(
      flowSpeed / max(radius * 5.0, 0.001),
      0.0,
      1.0
    ));
    vec2 planeTarget = vec2(0.0);

    if (flowInfluence > 0.0 && speedWeight > 0.0001) {
      vec2 motion = uPointerFlowVelocity / flowSpeed;
      vec2 side = vec2(-motion.y, motion.x);
      float directionLength = max(normalizedRadius, 0.0001);
      float seedDirectionLength = max(length(spread.xy), 0.0001);
      vec2 radial = normalizedRadius > 0.0001
        ? vec2(planeX, planeY) / radius / directionLength
        : spread.xy / seedDirectionLength;
      float directionAlong = dot(radial, motion);
      float directionSide = dot(radial, side);
      float sampleRadius = max(normalizedRadius, 1.0);
      float potentialWeight =
        (1.0 / (sampleRadius * sampleRadius)) *
        flowInfluence *
        mix(0.58, 1.0, smoother((directionAlong + 1.0) * 0.5));
      float flowAlong =
        (directionAlong * directionAlong - directionSide * directionSide) *
        potentialWeight;
      float flowSide =
        2.0 * directionAlong * directionSide * potentialWeight +
        spread.z * 0.055 * flowInfluence * (1.0 - abs(directionSide));
      float displacement =
        radius * 0.27 * speedWeight * uPointerStrength;
      planeTarget = (motion * flowAlong + side * flowSide) * displacement;
    }

    float depthTarget =
      -radius * 0.09 * lensWeight * uPointerStrength;
    vec3 target =
      uPointerRight * planeTarget.x +
      uPointerUp * planeTarget.y +
      uPointerNormal * depthTarget;
    if (length(target) > 0.0005) {
      influence = 1.0;
    }
    return target;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 seed = texture2D(uParticleSeeds, uv);

    if (seed.a < 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec3 spread = vec3(
      seed.r - 0.5,
      seed.g - 0.5,
      (seed.r + seed.g) * 0.5 - 0.5
    );
    vec3 offset = texture2D(textureParticleOffset, uv).xyz;
    vec3 velocity = texture2D(textureParticleVelocity, uv).xyz;
    vec3 particle = authoredPosition(uv, seed) + offset;
    vec3 target = vec3(0.0);
    float refillWeight = 0.0;
    float obstacleInfluence = 0.0;

    for (int index = 0; index < MAX_OBSTACLES; index += 1) {
      if (index >= uObstacleCount) {
        break;
      }
      accumulateObstacle(
        index,
        particle,
        spread,
        target,
        refillWeight,
        obstacleInfluence
      );
    }

    float pointerInfluence = 0.0;
    target += pointerTarget(particle, spread, pointerInfluence);
    float targetLength = length(target);
    if (targetLength > uMaxOffset) {
      target *= uMaxOffset / targetLength;
      targetLength = uMaxOffset;
    }

    float activeInfluence = max(obstacleInfluence, pointerInfluence);
    float stiffness = activeInfluence > 0.5
      ? mix(46.0, 52.0, pointerInfluence)
      : mix(22.0, 42.0, refillWeight);
    float damping = activeInfluence > 0.5
      ? mix(10.5, 12.5, pointerInfluence)
      : mix(8.5, 10.5, refillWeight);
    float timestep = min(uDelta, 0.0333333333);
    velocity += ((target - offset) * stiffness - velocity * damping) * timestep;

    float maxSpeed = max(1.8, uPointerRadius * 4.2 * pointerInfluence);
    float velocityLength = length(velocity);
    if (velocityLength > maxSpeed) {
      velocity *= maxSpeed / velocityLength;
    }

    if (
      activeInfluence < 0.5 &&
      targetLength <= 0.0005 &&
      length(offset) <= 0.0005 &&
      velocityLength <= 0.0005
    ) {
      velocity = vec3(0.0);
    }

    gl_FragColor = vec4(velocity, 1.0);
  }
`;

export const PARTICLE_VERTEX_DECLARATIONS = /* glsl */ `
  #define MAX_PRESSURE_RIPPLES ${MAX_GPU_PRESSURE_RIPPLES}

  attribute vec2 particleUv;
  uniform sampler2D uParticleOffset;
  uniform sampler2D uParticleSeeds;
  uniform sampler2D uShapeFrom;
  uniform sampler2D uShapeTo;
  uniform float uBlend;
  uniform float uNoiseAmount;
  uniform float uIntensity;
  uniform float uPulse;
  uniform int uRippleCount;
  uniform vec3 uRipplePoints[MAX_PRESSURE_RIPPLES];
  uniform vec3 uRippleData[MAX_PRESSURE_RIPPLES];
  uniform vec3 uPointerRight;
  uniform vec3 uPointerUp;
  uniform vec3 uPointerNormal;

  float gpuSmoother(float value) {
    float clamped = clamp(value, 0.0, 1.0);
    return clamped * clamped * (3.0 - 2.0 * clamped);
  }

  vec3 applyGpuPressureRipples(vec3 particle, vec3 spread) {
    for (int index = 0; index < MAX_PRESSURE_RIPPLES; index += 1) {
      if (index >= uRippleCount) {
        break;
      }

      vec3 deltaPosition = particle - uRipplePoints[index];
      float planeX = dot(deltaPosition, uPointerRight);
      float planeY = dot(deltaPosition, uPointerUp);
      float planeDepth = dot(deltaPosition, uPointerNormal);
      float age = uRippleData[index].x;
      float strength = uRippleData[index].y;
      float unitRadius = uRippleData[index].z;
      float waveRadius = unitRadius * (0.16 + age * 9.4);
      float bandWidth = unitRadius * 0.3;
      float outerRadius = waveRadius + bandWidth;
      float innerRadius = max(waveRadius - bandWidth * 1.45, 0.0);
      float planeDistanceSquared = planeX * planeX + planeY * planeY;

      if (
        planeDistanceSquared > outerRadius * outerRadius ||
        planeDistanceSquared < innerRadius * innerRadius
      ) {
        continue;
      }

      float planeDistance = sqrt(planeDistanceSquared);
      float bandPosition =
        (planeDistance - waveRadius) / max(bandWidth, 0.001);
      float compression = exp(-bandPosition * bandPosition * 4.2);
      float recovery = bandPosition < 0.0
        ? 0.34 * exp(-pow((bandPosition + 0.76) * 2.4, 2.0))
        : 0.0;
      float attack = gpuSmoother(age / 0.055);
      float decay = 1.0 - gpuSmoother((age - 0.5225) / 0.4275);
      float depthWeight = gpuSmoother(
        1.0 - abs(planeDepth) / max(unitRadius * 4.25, 0.001)
      );
      float wave =
        (compression - recovery) * attack * decay * depthWeight * strength;

      if (abs(wave) <= 0.0001) {
        continue;
      }

      float seedLength = max(length(spread.xy), 0.0001);
      vec2 radial = planeDistance > 0.0001
        ? vec2(planeX, planeY) / planeDistance
        : spread.xy / seedLength;
      float displacement = unitRadius * 0.2 * wave;
      float depthDisplacement = unitRadius * 0.052 * wave;
      particle +=
        uPointerRight * radial.x * displacement +
        uPointerUp * radial.y * displacement +
        uPointerNormal * depthDisplacement;
    }

    return particle;
  }
`;

export const PARTICLE_VERTEX_POSITION = /* glsl */ `
  vec4 gpuSeed = texture2D(uParticleSeeds, particleUv);
  vec3 gpuSpread = vec3(
    gpuSeed.r - 0.5,
    gpuSeed.g - 0.5,
    (gpuSeed.r + gpuSeed.g) * 0.5 - 0.5
  );
  vec3 transformed = mix(
    texture2D(uShapeFrom, particleUv).xyz,
    texture2D(uShapeTo, particleUv).xyz,
    uBlend
  );
  float gpuDrift = uNoiseAmount * gpuSeed.b * uIntensity * uPulse;
  transformed += gpuSpread * vec3(
    gpuDrift,
    gpuDrift * 0.8,
    gpuDrift * 1.15
  );
  transformed += texture2D(uParticleOffset, particleUv).xyz;
  transformed = applyGpuPressureRipples(transformed, gpuSpread);
`;
