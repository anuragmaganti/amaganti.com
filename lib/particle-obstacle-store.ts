"use client";

import {
  createParticleObstacleGeometry,
  type ParticleObstacleGeometry,
} from "@/lib/particle-obstacle-geometry";

export type { ParticleObstacleGeometry } from "@/lib/particle-obstacle-geometry";

export type ParticleObstacleMotion = {
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  sampledAt: number;
};

export type ParticleObstacleEntry = {
  readonly id: string;
  readonly geometry: ParticleObstacleGeometry;
  readonly motion: ParticleObstacleMotion;
  active: boolean;
  strength: number;
};

export type ParticleObstacleSnapshot = readonly ParticleObstacleEntry[];

const listeners = new Set<() => void>();
const entries = new Map<string, ParticleObstacleEntry>();
const snapshotEntries: ParticleObstacleEntry[] = [];
let batchDepth = 0;
let snapshotDirty = false;

export function registerParticleObstacle(id: string) {
  const existing = entries.get(id);
  if (existing) {
    return existing;
  }

  const entry: ParticleObstacleEntry = {
    id,
    geometry: createParticleObstacleGeometry(),
    motion: {
      velocityX: 0,
      velocityY: 0,
      angularVelocity: 0,
      sampledAt: 0,
    },
    active: false,
    strength: 0,
  };

  entries.set(id, entry);
  snapshotEntries.push(entry);
  snapshotEntries.sort((left, right) => left.id.localeCompare(right.id));
  return entry;
}

export function publishParticleObstacle(
  entry: ParticleObstacleEntry,
  strength: number,
) {
  if (
    strength <= 0.001 ||
    entry.geometry.width <= 0 ||
    entry.geometry.height <= 0
  ) {
    deactivateParticleObstacle(entry);
    return;
  }

  entry.active = true;
  entry.strength = strength;
  scheduleSnapshot();
}

export function deactivateParticleObstacle(entry: ParticleObstacleEntry) {
  if (!entry.active && entry.strength === 0) {
    return;
  }

  entry.active = false;
  entry.strength = 0;
  scheduleSnapshot();
}

export function unregisterParticleObstacle(entry: ParticleObstacleEntry) {
  if (entries.get(entry.id) !== entry) {
    return;
  }

  const wasActive = entry.active;
  entries.delete(entry.id);
  const index = snapshotEntries.indexOf(entry);
  if (index !== -1) {
    snapshotEntries.splice(index, 1);
  }
  entry.active = false;
  entry.strength = 0;

  if (wasActive) {
    scheduleSnapshot();
  }
}

export function batchParticleObstacleUpdates(update: () => void) {
  batchDepth += 1;

  try {
    update();
  } finally {
    batchDepth -= 1;

    if (!batchDepth && snapshotDirty) {
      snapshotDirty = false;
      emitSnapshot();
    }
  }
}

export function subscribeParticleObstacle(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getParticleObstacleSnapshot(): ParticleObstacleSnapshot {
  return snapshotEntries;
}

function emitSnapshot() {
  listeners.forEach((listener) => listener());
}

function scheduleSnapshot() {
  if (batchDepth) {
    snapshotDirty = true;
    return;
  }

  emitSnapshot();
}
