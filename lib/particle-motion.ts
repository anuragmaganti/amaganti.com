export type ParticleState = {
  x: number;
  y: number;
  z: number;
  spreadX: number;
  spreadY: number;
  spreadZ: number;
};

export function createParticleState(): ParticleState {
  return { x: 0, y: 0, z: 0, spreadX: 0, spreadY: 0, spreadZ: 0 };
}

export function createParticleSeeds(pointCount: number) {
  const seeds = new Float32Array(pointCount * 2);

  for (let index = 0; index < pointCount; index += 1) {
    seeds[index * 2] = hash(index, 0.13);
    seeds[index * 2 + 1] = hash(index, 0.79);
  }

  return seeds;
}

export function sampleParticlePosition(
  particle: ParticleState,
  index: number,
  offset: number,
  shapeFrom: Float32Array,
  shapeTo: Float32Array,
  blend: number,
  noise: number,
  intensity: number,
  pulse: number,
  seeds: Float32Array,
) {
  particle.x = lerp(shapeFrom[offset], shapeTo[offset], blend);
  particle.y = lerp(shapeFrom[offset + 1], shapeTo[offset + 1], blend);
  particle.z = lerp(shapeFrom[offset + 2], shapeTo[offset + 2], blend);

  const drift = noise * (0.01 + (index % 5) * 0.0012) * intensity * pulse;
  const seedA = seeds[index * 2];
  const seedB = seeds[index * 2 + 1];

  particle.spreadX = seedA - 0.5;
  particle.spreadY = seedB - 0.5;
  particle.spreadZ = (seedA + seedB) * 0.5 - 0.5;
  particle.x += particle.spreadX * drift;
  particle.y += particle.spreadY * drift * 0.8;
  particle.z += particle.spreadZ * drift * 1.15;
}

function hash(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}
