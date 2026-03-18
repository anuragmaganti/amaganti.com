"use client";

export type ProjectCardExclusionRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type ProjectCardExclusionEntry = {
  id: string;
  rect: ProjectCardExclusionRect;
  strength: number;
};

type ProjectCardExclusionSnapshot = {
  id: string;
  rect: ProjectCardExclusionRect;
  strength: number;
} | null;

const listeners = new Set<() => void>();
const entries = new Map<string, ProjectCardExclusionEntry>();
let activeSnapshot: ProjectCardExclusionSnapshot = null;

export function upsertProjectCardExclusion(
  id: string,
  rect: ProjectCardExclusionRect,
  strength: number,
) {
  entries.set(id, {
    id,
    rect,
    strength,
  });
  emitIfChanged();
}

export function removeProjectCardExclusion(id: string) {
  if (!entries.delete(id)) {
    return;
  }

  emitIfChanged();
}

export function subscribeProjectCardExclusion(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getProjectCardExclusionSnapshot() {
  return activeSnapshot;
}

function emitIfChanged() {
  const nextSnapshot = selectActiveSnapshot();

  if (areSnapshotsEqual(activeSnapshot, nextSnapshot)) {
    return;
  }

  activeSnapshot = nextSnapshot;
  listeners.forEach((listener) => listener());
}

function selectActiveSnapshot(): ProjectCardExclusionSnapshot {
  let active: ProjectCardExclusionEntry | undefined;

  for (const entry of entries.values()) {
    if (entry.strength <= 0.001 || entry.rect.width <= 0 || entry.rect.height <= 0) {
      continue;
    }

    if (!active || entry.strength > active.strength) {
      active = entry;
    }
  }

  if (!active) {
    return null;
  }

  return {
    id: active.id,
    rect: active.rect,
    strength: active.strength,
  };
}

function areSnapshotsEqual(
  previous: ProjectCardExclusionSnapshot,
  next: ProjectCardExclusionSnapshot,
) {
  if (previous === next) {
    return true;
  }

  if (!previous || !next) {
    return false;
  }

  return (
    previous.id === next.id &&
    Math.abs(previous.strength - next.strength) < 0.002 &&
    Math.abs(previous.rect.left - next.rect.left) < 0.5 &&
    Math.abs(previous.rect.top - next.rect.top) < 0.5 &&
    Math.abs(previous.rect.width - next.rect.width) < 0.5 &&
    Math.abs(previous.rect.height - next.rect.height) < 0.5
  );
}
