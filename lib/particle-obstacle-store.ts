"use client";

import type { ParticleObstacleGeometry } from "@/lib/particle-obstacle-geometry";

export type { ParticleObstacleGeometry } from "@/lib/particle-obstacle-geometry";

export type ParticleObstacleMotion = {
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  sampledAt: number;
};

export type ParticleObstacleEntry = {
  id: string;
  geometry: ParticleObstacleGeometry;
  strength: number;
  motion: ParticleObstacleMotion;
};

export type ParticleObstacleSnapshot = readonly ParticleObstacleEntry[];

const listeners = new Set<() => void>();
const entries = new Map<string, ParticleObstacleEntry>();
const emptySnapshot: ParticleObstacleSnapshot = [];
let activeSnapshot: ParticleObstacleSnapshot = emptySnapshot;
let batchDepth = 0;
let snapshotDirty = false;

export function upsertParticleObstacle(
  id: string,
  geometry: ParticleObstacleGeometry,
  strength: number,
  motion: ParticleObstacleMotion,
) {
  const nextEntry = { id, geometry, strength, motion };
  const currentEntry = entries.get(id);

  if (currentEntry && areEntriesEqual(currentEntry, nextEntry)) {
    return;
  }

  entries.set(id, nextEntry);
  scheduleSnapshot();
}

export function removeParticleObstacle(id: string) {
  if (entries.delete(id)) {
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

export function getParticleObstacleSnapshot() {
  return activeSnapshot;
}

function emitSnapshot() {
  activeSnapshot = Array.from(entries.values())
    .filter(isActiveEntry)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((entry) => ({
      ...entry,
      geometry: {
        ...entry.geometry,
        bounds: { ...entry.geometry.bounds },
      },
      motion: { ...entry.motion },
    }));

  listeners.forEach((listener) => listener());
}

function scheduleSnapshot() {
  if (batchDepth) {
    snapshotDirty = true;
    return;
  }

  emitSnapshot();
}

function isActiveEntry(entry: ParticleObstacleEntry) {
  return (
    entry.strength > 0.001 &&
    entry.geometry.width > 0 &&
    entry.geometry.height > 0
  );
}

function areEntriesEqual(
  previous: ParticleObstacleEntry,
  next: ParticleObstacleEntry,
) {
  const hasActiveMotion =
    Math.abs(next.motion.velocityX) > 0.75 ||
    Math.abs(next.motion.velocityY) > 0.75 ||
    Math.abs(next.motion.angularVelocity) > 0.002;

  return (
    previous.id === next.id &&
    Math.abs(previous.strength - next.strength) < 0.002 &&
    Math.abs(previous.geometry.centerX - next.geometry.centerX) < 0.25 &&
    Math.abs(previous.geometry.centerY - next.geometry.centerY) < 0.25 &&
    Math.abs(previous.geometry.width - next.geometry.width) < 0.25 &&
    Math.abs(previous.geometry.height - next.geometry.height) < 0.25 &&
    Math.abs(previous.geometry.angle - next.geometry.angle) < 0.0005 &&
    Math.abs(
      previous.geometry.cornerRadius - next.geometry.cornerRadius,
    ) < 0.25 &&
    Math.abs(previous.motion.velocityX - next.motion.velocityX) < 1 &&
    Math.abs(previous.motion.velocityY - next.motion.velocityY) < 1 &&
    Math.abs(
      previous.motion.angularVelocity - next.motion.angularVelocity,
    ) < 0.002 &&
    !hasActiveMotion
  );
}
