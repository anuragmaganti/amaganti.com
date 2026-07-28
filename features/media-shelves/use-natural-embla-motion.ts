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
  id: number;
  lastTime: number;
  lastX: number;
  velocity: number;
};

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
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      stopInertia();
      pointerMotion = {
        id: event.pointerId,
        lastTime: event.timeStamp,
        lastX: event.clientX,
        velocity: 0,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerMotion || pointerMotion.id !== event.pointerId) {
        return;
      }

      const elapsed = Math.max(1, event.timeStamp - pointerMotion.lastTime);
      const instantaneousVelocity =
        (event.clientX - pointerMotion.lastX) / elapsed;

      pointerMotion.velocity =
        pointerMotion.velocity * (1 - KINETICS.velocityBlend) +
        instantaneousVelocity * KINETICS.velocityBlend;
      pointerMotion.lastTime = event.timeStamp;
      pointerMotion.lastX = event.clientX;
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (pointerMotion?.id === event.pointerId) {
        pointerMotion = null;
        stopInertia();
      }
    };

    const handleEmblaPointerUp = () => {
      if (!pointerMotion) {
        return;
      }

      const idleTime = Math.max(
        0,
        ownerWindow.performance.now() - pointerMotion.lastTime,
      );
      const releaseVelocity =
        pointerMotion.velocity *
        Math.exp(-KINETICS.dampingPerMillisecond * idleTime);

      pointerMotion = null;
      startInertia(releaseVelocity);
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
      passive: true,
    });
    ownerDocument.addEventListener("pointercancel", handlePointerCancel, {
      passive: true,
    });
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    ownerDocument.addEventListener("visibilitychange", handleVisibilityChange);
    emblaApi.on("pointerUp", handleEmblaPointerUp).on("reInit", handleReInit);

    return () => {
      stopInertia();
      if (wheelIdleTimer !== null) {
        ownerWindow.clearTimeout(wheelIdleTimer);
      }
      viewport.classList.remove("is-wheel-dragging");
      viewport.removeEventListener("pointerdown", handlePointerDown);
      ownerDocument.removeEventListener("pointermove", handlePointerMove);
      ownerDocument.removeEventListener("pointercancel", handlePointerCancel);
      viewport.removeEventListener("wheel", handleWheel);
      ownerDocument.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      emblaApi
        .off("pointerUp", handleEmblaPointerUp)
        .off("reInit", handleReInit);
    };
  }, [emblaApi, reducedMotion]);
}
