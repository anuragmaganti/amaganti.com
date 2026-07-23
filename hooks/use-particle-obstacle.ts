"use client";

import type { MotionValue } from "motion";
import { type RefObject, useEffect } from "react";

import {
  removeParticleObstacle,
  type ParticleObstacleRect,
  upsertParticleObstacle,
} from "@/lib/particle-obstacle-store";

const PREWARM_VERTICAL_VIEWPORT_RATIO = 0.55;
const PREWARM_HORIZONTAL_VIEWPORT_RATIO = 0.2;
const measurementListeners = new Set<() => void>();
let measurementFrameId = 0;

export function useParticleObstacle(
  id: string,
  elementRef: RefObject<HTMLElement | null>,
  motionDriver?: MotionValue<number>,
) {
  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    let cornerRadius = readCornerRadius(element);

    const syncObstacle = () => {
      const rect = readParticleObstacleRect(element, cornerRadius);
      const strength = getViewportApproachStrength(rect);

      if (strength > 0.001) {
        upsertParticleObstacle(id, rect, strength);
      } else {
        removeParticleObstacle(id);
      }
    };
    const resizeObserver = new ResizeObserver(() => {
      cornerRadius = readCornerRadius(element);
      scheduleMeasurements();
    });
    const unsubscribeMotion = motionDriver?.on("change", scheduleMeasurements);
    const unsubscribeMeasurements = subscribeMeasurements(syncObstacle);

    resizeObserver.observe(element);
    scheduleMeasurements();

    return () => {
      resizeObserver.disconnect();
      unsubscribeMotion?.();
      unsubscribeMeasurements();
      removeParticleObstacle(id);
    };
  }, [elementRef, id, motionDriver]);
}

function subscribeMeasurements(listener: () => void) {
  measurementListeners.add(listener);

  if (measurementListeners.size === 1) {
    window.addEventListener("scroll", scheduleMeasurements, {
      passive: true,
    });
    window.addEventListener("resize", scheduleMeasurements, {
      passive: true,
    });
    window.addEventListener("load", scheduleMeasurements);
    window.visualViewport?.addEventListener("resize", scheduleMeasurements, {
      passive: true,
    });
    window.visualViewport?.addEventListener("scroll", scheduleMeasurements, {
      passive: true,
    });
  }

  return () => {
    measurementListeners.delete(listener);

    if (!measurementListeners.size) {
      window.removeEventListener("scroll", scheduleMeasurements);
      window.removeEventListener("resize", scheduleMeasurements);
      window.removeEventListener("load", scheduleMeasurements);
      window.visualViewport?.removeEventListener(
        "resize",
        scheduleMeasurements,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        scheduleMeasurements,
      );
      window.cancelAnimationFrame(measurementFrameId);
      measurementFrameId = 0;
    }
  };
}

function scheduleMeasurements() {
  if (measurementFrameId) {
    return;
  }

  measurementFrameId = window.requestAnimationFrame(flushMeasurements);
}

function flushMeasurements() {
  measurementFrameId = 0;
  measurementListeners.forEach((listener) => listener());
}

function getViewportApproachStrength(rect: ParticleObstacleRect) {
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const horizontalDistance = getDistanceFromViewport(
    rect.left,
    rect.right,
    viewportWidth,
  );
  const verticalDistance = getDistanceFromViewport(
    rect.top,
    rect.bottom,
    viewportHeight,
  );
  const normalizedDistance = Math.max(
    horizontalDistance /
      (viewportWidth * PREWARM_HORIZONTAL_VIEWPORT_RATIO),
    verticalDistance / (viewportHeight * PREWARM_VERTICAL_VIEWPORT_RATIO),
  );
  const approach = Math.min(Math.max(1 - normalizedDistance, 0), 1);

  return approach * approach * (3 - 2 * approach);
}

function getDistanceFromViewport(start: number, end: number, viewportSize: number) {
  if (end < 0) {
    return -end;
  }

  if (start > viewportSize) {
    return start - viewportSize;
  }

  return 0;
}

function readParticleObstacleRect(
  element: HTMLElement,
  cornerRadius: number,
): ParticleObstacleRect {
  const rect = element.getBoundingClientRect();
  const transformScale = element.offsetWidth
    ? rect.width / element.offsetWidth
    : 1;

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    cornerRadius: cornerRadius * transformScale,
  };
}

function readCornerRadius(element: HTMLElement) {
  const value = window.getComputedStyle(element).borderTopLeftRadius;
  const radius = Number.parseFloat(value);

  return Number.isFinite(radius) ? radius : 0;
}
