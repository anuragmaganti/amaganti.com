"use client";

import type { MotionValue } from "motion";
import { type RefObject, useEffect } from "react";

import {
  batchParticleObstacleUpdates,
  removeParticleObstacle,
  type ParticleObstacleMotion,
  upsertParticleObstacle,
} from "@/lib/particle-obstacle-store";
import {
  measureParticleObstacleGeometry,
  type ParticleObstacleGeometry,
} from "@/lib/particle-obstacle-geometry";

const PREWARM_VERTICAL_VIEWPORT_RATIO = 0.55;
const PREWARM_HORIZONTAL_VIEWPORT_RATIO = 0.2;
const MAX_SCREEN_VELOCITY = 2400;
const MAX_ANGULAR_VELOCITY = Math.PI * 1.5;
const MOTION_SMOOTHING = 12;
const STICKY_SCROLL_COUPLING = 0.55;

type MeasurementFrame = {
  timestamp: number;
  scrollVelocityY: number;
};

const measurementListeners = new Set<(frame: MeasurementFrame) => void>();
const pendingMeasurementListeners = new Set<
  (frame: MeasurementFrame) => void
>();
let measurementFrameId = 0;
let lastMeasurementTimestamp = 0;
let lastScrollY = 0;
let smoothedScrollVelocityY = 0;
let measureAllOnNextFrame = false;

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
    let previousAngle = 0;
    let previousTimestamp = 0;
    let smoothedVelocityX = 0;
    let smoothedVelocityY = 0;
    let smoothedAngularVelocity = 0;

    const syncObstacle = (frame: MeasurementFrame) => {
      const geometry = measureParticleObstacleGeometry(element, cornerRadius);
      const strength = getViewportApproachStrength(geometry);
      const centerX = geometry.centerX;
      const centerY = geometry.centerY;
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
      const rawAngularVelocity = deltaSeconds
        ? clamp(
            normalizeAngle(geometry.angle - previousAngle) / deltaSeconds,
            -MAX_ANGULAR_VELOCITY,
            MAX_ANGULAR_VELOCITY,
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
      smoothedAngularVelocity = lerp(
        smoothedAngularVelocity,
        rawAngularVelocity,
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
        angularVelocity: smoothedAngularVelocity,
        sampledAt: frame.timestamp,
      };

      previousCenterX = centerX;
      previousCenterY = centerY;
      previousAngle = geometry.angle;
      previousTimestamp = frame.timestamp;

      if (strength > 0.001) {
        upsertParticleObstacle(id, geometry, strength, motion);
      } else {
        removeParticleObstacle(id);
      }
    };
    const resizeObserver = new ResizeObserver(() => {
      cornerRadius = readCornerRadius(element);
      scheduleListenerMeasurement(syncObstacle);
    });
    const unsubscribeMotion = motionDriver?.on("change", () => {
      scheduleListenerMeasurement(syncObstacle);
    });
    const unsubscribeMeasurements = subscribeMeasurements(syncObstacle);

    resizeObserver.observe(element);
    scheduleListenerMeasurement(syncObstacle);

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
    pendingMeasurementListeners.delete(listener);

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
      measureAllOnNextFrame = false;
      pendingMeasurementListeners.clear();
    }
  };
}

function scheduleMeasurements() {
  measureAllOnNextFrame = true;
  scheduleMeasurementFrame();
}

function scheduleListenerMeasurement(
  listener: (frame: MeasurementFrame) => void,
) {
  if (!measureAllOnNextFrame) {
    pendingMeasurementListeners.add(listener);
  }
  scheduleMeasurementFrame();
}

function scheduleMeasurementFrame() {
  if (measurementFrameId) {
    return;
  }

  measurementFrameId = window.requestAnimationFrame(flushMeasurements);
}

function flushMeasurements(timestamp: number) {
  measurementFrameId = 0;
  const listeners = measureAllOnNextFrame
    ? Array.from(measurementListeners)
    : Array.from(pendingMeasurementListeners);

  measureAllOnNextFrame = false;
  pendingMeasurementListeners.clear();
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
  batchParticleObstacleUpdates(() => {
    listeners.forEach((listener) => listener(frame));
  });
}

function getViewportApproachStrength(geometry: ParticleObstacleGeometry) {
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const horizontalDistance = getDistanceFromViewport(
    geometry.bounds.left,
    geometry.bounds.right,
    viewportWidth,
  );
  const verticalDistance = getDistanceFromViewport(
    geometry.bounds.top,
    geometry.bounds.bottom,
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

function readCornerRadius(element: HTMLElement) {
  const value = window.getComputedStyle(element).borderTopLeftRadius;
  const radius = Number.parseFloat(value);

  return Number.isFinite(radius) ? radius : 0;
}

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
