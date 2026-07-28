"use client";

import type { EmblaCarouselType, EngineType } from "embla-carousel";
import { useEffect } from "react";

const KINETICS = {
  dampingPerMillisecond: 0.0046,
  maximumFrameDuration: 34,
  stopVelocity: 0.006,
  velocityBlend: 0.36,
  wheelIdleDelay: 140,
  wheelLinePixels: 16,
} as const;

type PointerMotion = {
  axis: "pending" | "horizontal" | "vertical";
  id: number;
  lastTime: number;
  lastX: number;
  startX: number;
  startY: number;
  velocity: number;
};

const POINTER_AXIS_THRESHOLD = 3;

function normalizedWheelDelta(
  delta: number,
  deltaMode: number,
  viewportWidth: number,
) {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return delta * KINETICS.wheelLinePixels;
  }

  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return delta * viewportWidth;
  }

  return delta;
}

function updateSelectedIndex(engine: EngineType) {
  const currentIndex = engine.index.get();
  const nextIndex = engine.scrollTarget.byDistance(0, false).index;

  if (nextIndex === currentIndex) {
    return;
  }

  engine.indexPrevious.set(currentIndex);
  engine.index.set(nextIndex);
  engine.eventHandler.emit("select");
}

function settleAtRenderedPosition(engine: EngineType) {
  const renderedPosition = engine.offsetLocation.get();

  engine.animation.stop();
  engine.location.set(renderedPosition);
  engine.previousLocation.set(renderedPosition);
  engine.offsetLocation.set(renderedPosition);
  engine.target.set(renderedPosition);
  engine.scrollBody
    .useDuration(0)
    .seek()
    .useBaseDuration()
    .useBaseFriction();
}

function moveEngine(engine: EngineType, distance: number) {
  if (!distance) {
    return;
  }

  engine.previousLocation.set(engine.location);
  engine.location.add(distance);
  engine.offsetLocation.set(engine.location);
  engine.target.set(engine.location);

  if (engine.options.loop) {
    engine.scrollLooper.loop(Math.sign(distance));
    engine.slideLooper.loop();
  }

  engine.translate.to(engine.offsetLocation.get());
  updateSelectedIndex(engine);
  engine.eventHandler.emit("scroll");
}

function integrateVelocity(velocity: number, elapsed: number) {
  const decay = Math.exp(-KINETICS.dampingPerMillisecond * elapsed);

  return {
    distance:
      (velocity * (1 - decay)) / KINETICS.dampingPerMillisecond,
    velocity: velocity * decay,
  };
}

export function useNaturalEmblaMotion(
  emblaApi: EmblaCarouselType | undefined,
  reducedMotion: boolean,
) {
  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const viewport = emblaApi.rootNode();
    const ownerDocument = viewport.ownerDocument;
    const ownerWindow = ownerDocument.defaultView;

    if (!ownerWindow) {
      return;
    }

    let engine = emblaApi.internalEngine();
    let inertiaFrame: number | null = null;
    let pointerMotion: PointerMotion | null = null;
    let wheelIdleTimer: number | null = null;

    const stopInertia = () => {
      if (inertiaFrame !== null) {
        ownerWindow.cancelAnimationFrame(inertiaFrame);
        inertiaFrame = null;
      }
    };

    const finishWheelGesture = () => {
      wheelIdleTimer = null;
      viewport.classList.remove("is-wheel-dragging");
      engine.eventHandler.emit("settle");
    };

    const scheduleWheelEnd = () => {
      if (wheelIdleTimer !== null) {
        ownerWindow.clearTimeout(wheelIdleTimer);
      }

      wheelIdleTimer = ownerWindow.setTimeout(
        finishWheelGesture,
        KINETICS.wheelIdleDelay,
      );
    };

    const startInertia = (initialVelocity: number) => {
      stopInertia();
      settleAtRenderedPosition(engine);

      if (
        reducedMotion ||
        Math.abs(initialVelocity) < KINETICS.stopVelocity
      ) {
        engine.eventHandler.emit("settle");
        return;
      }

      let velocity = initialVelocity;
      let previousTime = ownerWindow.performance.now();

      const tick = (time: number) => {
        const elapsed = Math.min(
          Math.max(0, time - previousTime),
          KINETICS.maximumFrameDuration,
        );
        const next = integrateVelocity(velocity, elapsed);

        moveEngine(engine, next.distance);
        velocity = next.velocity;
        previousTime = time;

        if (Math.abs(velocity) >= KINETICS.stopVelocity) {
          inertiaFrame = ownerWindow.requestAnimationFrame(tick);
        } else {
          inertiaFrame = null;
          engine.eventHandler.emit("settle");
        }
      };

      inertiaFrame = ownerWindow.requestAnimationFrame(tick);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        !event.isPrimary ||
        (event.pointerType === "mouse" && event.button !== 0)
      ) {
        return;
      }

      stopInertia();
      settleAtRenderedPosition(engine);
      pointerMotion = {
        axis: event.pointerType === "mouse" ? "horizontal" : "pending",
        id: event.pointerId,
        lastTime: event.timeStamp,
        lastX: event.clientX,
        startX: event.clientX,
        startY: event.clientY,
        velocity: 0,
      };

      if (pointerMotion.axis === "horizontal") {
        viewport.setPointerCapture(event.pointerId);
        engine.eventHandler.emit("pointerDown");
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerMotion || pointerMotion.id !== event.pointerId) {
        return;
      }

      const coalescedEvents = event.getCoalescedEvents?.() ?? [];
      const sample = coalescedEvents.at(-1) ?? event;

      if (pointerMotion.axis === "pending") {
        const totalX = sample.clientX - pointerMotion.startX;
        const totalY = sample.clientY - pointerMotion.startY;

        if (
          Math.max(Math.abs(totalX), Math.abs(totalY)) <
          POINTER_AXIS_THRESHOLD
        ) {
          return;
        }

        if (Math.abs(totalY) >= Math.abs(totalX)) {
          pointerMotion.axis = "vertical";
          return;
        }

        pointerMotion.axis = "horizontal";
        viewport.setPointerCapture(event.pointerId);
        engine.eventHandler.emit("pointerDown");
      }

      if (pointerMotion.axis !== "horizontal") {
        return;
      }

      event.preventDefault();
      const elapsed = Math.max(1, sample.timeStamp - pointerMotion.lastTime);
      const instantaneousVelocity =
        (sample.clientX - pointerMotion.lastX) / elapsed;

      moveEngine(engine, sample.clientX - pointerMotion.lastX);

      pointerMotion.velocity =
        pointerMotion.velocity * (1 - KINETICS.velocityBlend) +
        instantaneousVelocity * KINETICS.velocityBlend;
      pointerMotion.lastTime = sample.timeStamp;
      pointerMotion.lastX = sample.clientX;
    };

    const finishPointerGesture = (
      event: PointerEvent,
      shouldStartInertia: boolean,
    ) => {
      if (!pointerMotion || pointerMotion.id !== event.pointerId) {
        return;
      }

      const completedMotion = pointerMotion;
      pointerMotion = null;

      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }

      if (completedMotion.axis !== "horizontal") {
        return;
      }

      const idleTime = Math.max(
        0,
        ownerWindow.performance.now() - completedMotion.lastTime,
      );
      const releaseVelocity =
        completedMotion.velocity *
        Math.exp(-KINETICS.dampingPerMillisecond * idleTime);

      engine.eventHandler.emit("pointerUp");

      if (shouldStartInertia) {
        startInertia(releaseVelocity);
      } else {
        stopInertia();
        settleAtRenderedPosition(engine);
        engine.eventHandler.emit("settle");
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      finishPointerGesture(event, true);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      finishPointerGesture(event, false);
    };

    const handleWheel = (event: WheelEvent) => {
      const deltaX = normalizedWheelDelta(
        event.deltaX,
        event.deltaMode,
        viewport.clientWidth,
      );
      const deltaY = normalizedWheelDelta(
        event.deltaY,
        event.deltaMode,
        viewport.clientWidth,
      );

      if (Math.abs(deltaX) <= Math.abs(deltaY) || !deltaX) {
        return;
      }

      event.preventDefault();
      stopInertia();
      settleAtRenderedPosition(engine);
      moveEngine(engine, -deltaX);
      viewport.classList.add("is-wheel-dragging");
      scheduleWheelEnd();
    };

    const handleVisibilityChange = () => {
      if (ownerDocument.hidden) {
        stopInertia();
      }
    };

    const handleReInit = () => {
      stopInertia();
      engine = emblaApi.internalEngine();
    };

    viewport.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    ownerDocument.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    ownerDocument.addEventListener("pointerup", handlePointerUp, {
      passive: true,
    });
    ownerDocument.addEventListener("pointercancel", handlePointerCancel, {
      passive: true,
    });
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    ownerDocument.addEventListener("visibilitychange", handleVisibilityChange);
    emblaApi.on("reInit", handleReInit);

    return () => {
      stopInertia();
      if (wheelIdleTimer !== null) {
        ownerWindow.clearTimeout(wheelIdleTimer);
      }
      viewport.classList.remove("is-wheel-dragging");
      viewport.removeEventListener("pointerdown", handlePointerDown);
      ownerDocument.removeEventListener("pointermove", handlePointerMove);
      ownerDocument.removeEventListener("pointerup", handlePointerUp);
      ownerDocument.removeEventListener("pointercancel", handlePointerCancel);
      viewport.removeEventListener("wheel", handleWheel);
      ownerDocument.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      emblaApi.off("reInit", handleReInit);
    };
  }, [emblaApi, reducedMotion]);
}
