"use client";

export type ParticleObstacleRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  cornerRadius: number;
};

export type ParticleObstacleEntry = {
  id: string;
  rect: ParticleObstacleRect;
  strength: number;
};

export type ParticleObstacleSnapshot = readonly ParticleObstacleEntry[];

const listeners = new Set<() => void>();
const entries = new Map<string, ParticleObstacleEntry>();
const emptySnapshot: ParticleObstacleSnapshot = [];
let activeSnapshot: ParticleObstacleSnapshot = emptySnapshot;

export function upsertParticleObstacle(
  id: string,
  rect: ParticleObstacleRect,
  strength: number,
) {
  const nextEntry = { id, rect, strength };
  const currentEntry = entries.get(id);

  if (currentEntry && areEntriesEqual(currentEntry, nextEntry)) {
    return;
  }

  entries.set(id, nextEntry);
  emitSnapshot();
}

export function removeParticleObstacle(id: string) {
  if (entries.delete(id)) {
    emitSnapshot();
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
      rect: { ...entry.rect },
    }));

  listeners.forEach((listener) => listener());
}

function isActiveEntry(entry: ParticleObstacleEntry) {
  return (
    entry.strength > 0.001 &&
    entry.rect.width > 0 &&
    entry.rect.height > 0
  );
}

function areEntriesEqual(
  previous: ParticleObstacleEntry,
  next: ParticleObstacleEntry,
) {
  return (
    previous.id === next.id &&
    Math.abs(previous.strength - next.strength) < 0.002 &&
    Math.abs(previous.rect.left - next.rect.left) < 0.25 &&
    Math.abs(previous.rect.top - next.rect.top) < 0.25 &&
    Math.abs(previous.rect.width - next.rect.width) < 0.25 &&
    Math.abs(previous.rect.height - next.rect.height) < 0.25 &&
    Math.abs(previous.rect.cornerRadius - next.rect.cornerRadius) < 0.25
  );
}
