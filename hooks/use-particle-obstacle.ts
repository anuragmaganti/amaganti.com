"use client";

import type { MotionValue } from "motion";
import { type RefObject, useEffect } from "react";

import {
  removeParticleObstacle,
  type ParticleObstacleMotion,
  type ParticleObstacleRect,
  upsertParticleObstacle,
} from "@/lib/particle-obstacle-store";

const PREWARM_VERTICAL_VIEWPORT_RATIO = 0.55;
const PREWARM_HORIZONTAL_VIEWPORT_RATIO = 0.2;
const MAX_SCREEN_VELOCITY = 2400;
const MOTION_SMOOTHING = 12;
const STICKY_SCROLL_COUPLING = 0.55;

type MeasurementFrame = {
  timestamp: number;
  scrollVelocityY: number;
};

const measurementListeners = new Set<(frame: MeasurementFrame) => void>();
let measurementFrameId = 0;
let lastMeasurementTimestamp = 0;
let lastScrollY = 0;
let smoothedScrollVelocityY = 0;

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
    let previousCenterX = 0;
    let previousCenterY = 0;
    let previousTimestamp = 0;
    let smoothedVelocityX = 0;
    let smoothedVelocityY = 0;

    const syncObstacle = (frame: MeasurementFrame) => {
      const rect = readParticleObstacleRect(element, cornerRadius);
      const strength = getViewportApproachStrength(rect);
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;
      const deltaSeconds = previousTimestamp
        ? Math.max((frame.timestamp - previousTimestamp) / 1000, 0.001)
        : 0;
      const rawVelocityX = deltaSeconds
        ? clamp(
            (centerX - previousCenterX) / deltaSeconds,
            -MAX_SCREEN_VELOCITY,
            MAX_SCREEN_VELOCITY,
          )
        : 0;
      const rawVelocityY = deltaSeconds
        ? clamp(
            (centerY - previousCenterY) / deltaSeconds,
            -MAX_SCREEN_VELOCITY,
            MAX_SCREEN_VELOCITY,
          )
        : 0;
      const velocityLerp = deltaSeconds
        ? 1 - Math.exp(-deltaSeconds * MOTION_SMOOTHING)
        : 1;

      smoothedVelocityX = lerp(
        smoothedVelocityX,
        rawVelocityX,
        velocityLerp,
      );
      smoothedVelocityY = lerp(
        smoothedVelocityY,
        rawVelocityY,
        velocityLerp,
      );

      const scrollDrivenCardVelocityY = -frame.scrollVelocityY;
      const cardMovementShare = clamp(
        Math.abs(smoothedVelocityY) /
          (Math.abs(scrollDrivenCardVelocityY) + 1),
        0,
        1,
      );
      // A sticky card barely moves on screen, so retain a smaller scroll-driven
      // current to keep its surrounding field responsive while it is locked.
      const stickyCurrentY =
        scrollDrivenCardVelocityY *
        (1 - cardMovementShare) *
        STICKY_SCROLL_COUPLING;
      const motion: ParticleObstacleMotion = {
        velocityX: smoothedVelocityX,
        velocityY: clamp(
          smoothedVelocityY + stickyCurrentY,
          -MAX_SCREEN_VELOCITY,
          MAX_SCREEN_VELOCITY,
        ),
        sampledAt: frame.timestamp,
      };

      previousCenterX = centerX;
      previousCenterY = centerY;
      previousTimestamp = frame.timestamp;

      if (strength > 0.001) {
        upsertParticleObstacle(id, rect, strength, motion);
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

function subscribeMeasurements(listener: (frame: MeasurementFrame) => void) {
  measurementListeners.add(listener);

  if (measurementListeners.size === 1) {
    lastMeasurementTimestamp = 0;
    lastScrollY = window.scrollY;
    smoothedScrollVelocityY = 0;
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

function flushMeasurements(timestamp: number) {
  measurementFrameId = 0;
  const deltaSeconds = lastMeasurementTimestamp
    ? clamp((timestamp - lastMeasurementTimestamp) / 1000, 0.001, 0.08)
    : 0;
  const scrollY = window.scrollY;
  const rawScrollVelocityY = deltaSeconds
    ? clamp(
        (scrollY - lastScrollY) / deltaSeconds,
        -MAX_SCREEN_VELOCITY,
        MAX_SCREEN_VELOCITY,
      )
    : 0;
  const scrollVelocityLerp = deltaSeconds
    ? 1 - Math.exp(-deltaSeconds * MOTION_SMOOTHING)
    : 1;

  smoothedScrollVelocityY = lerp(
    smoothedScrollVelocityY,
    rawScrollVelocityY,
    scrollVelocityLerp,
  );
  lastMeasurementTimestamp = timestamp;
  lastScrollY = scrollY;

  const frame = {
    timestamp,
    scrollVelocityY: smoothedScrollVelocityY,
  };
  measurementListeners.forEach((listener) => listener(frame));
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

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
