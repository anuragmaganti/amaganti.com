"use client";

import { useReducedMotion } from "motion/react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import {
  decayMediaShelfVelocity,
  MEDIA_SHELF_INERTIA,
} from "@/features/media-shelves/inertia";

type ScrollDirection = -1 | 1;

type DragState = {
  pointerId: number;
  previousClientX: number;
  previousTime: number;
  velocity: number;
};

const COPY_COUNT = 3;

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function useInertialHorizontalScroll() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const reflectionTrackRef = useRef<HTMLOListElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const viewportStateFrameRef = useRef<number | null>(null);
  const cycleWidthRef = useRef(0);
  const initializedRef = useRef(false);
  const reflectionOffsetRef = useRef(0);
  const reducedMotion = Boolean(useReducedMotion());
  const [isDragging, setIsDragging] = useState(false);

  const cancelInertia = () => {
    if (inertiaFrameRef.current !== null) {
      window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
  };

  const measureCycle = () => {
    const viewport = viewportRef.current;
    const reflectionTrack = reflectionTrackRef.current;

    if (!viewport) {
      return;
    }

    const firstItems = viewport.querySelectorAll<HTMLElement>(
      '[data-media-item-index="0"]',
    );

    if (firstItems.length < COPY_COUNT) {
      return;
    }

    const previousCycleWidth = cycleWidthRef.current;
    const nextCycleWidth = firstItems[1].offsetLeft - firstItems[0].offsetLeft;

    if (nextCycleWidth <= 0) {
      return;
    }

    const cycleProgress = previousCycleWidth
      ? modulo(viewport.scrollLeft, previousCycleWidth) / previousCycleWidth
      : 0;

    cycleWidthRef.current = nextCycleWidth;
    viewport.scrollLeft = nextCycleWidth * (1 + cycleProgress);
    const reflectionPlane = reflectionTrack?.parentElement;

    if (reflectionPlane) {
      reflectionOffsetRef.current =
        viewport.getBoundingClientRect().left -
        reflectionPlane.getBoundingClientRect().left;
    }
    initializedRef.current = true;
  };

  const syncReflectionTrack = () => {
    const viewport = viewportRef.current;
    const reflectionTrack = reflectionTrackRef.current;

    if (!viewport || !reflectionTrack) {
      return;
    }

    reflectionTrack.style.transform = `translate3d(${reflectionOffsetRef.current - viewport.scrollLeft}px, 0, 0)`;
  };

  const normalizeInfiniteScroll = () => {
    const viewport = viewportRef.current;
    const cycleWidth = cycleWidthRef.current;

    if (!viewport || !initializedRef.current || cycleWidth <= 0) {
      return;
    }

    if (viewport.scrollLeft < cycleWidth * 0.5) {
      viewport.scrollLeft += cycleWidth;
    } else if (viewport.scrollLeft >= cycleWidth * 1.5) {
      viewport.scrollLeft -= cycleWidth;
    }
  };

  const updateViewportState = () => {
    normalizeInfiniteScroll();
    syncReflectionTrack();
  };

  const scheduleViewportStateUpdate = () => {
    if (viewportStateFrameRef.current !== null) {
      return;
    }

    viewportStateFrameRef.current = window.requestAnimationFrame(() => {
      viewportStateFrameRef.current = null;
      updateViewportState();
    });
  };

  const startInertia = (initialVelocity: number) => {
    const viewport = viewportRef.current;

    if (
      !viewport ||
      reducedMotion ||
      Math.abs(initialVelocity) < MEDIA_SHELF_INERTIA.minimumVelocity
    ) {
      return;
    }

    cancelInertia();
    let velocity = initialVelocity;
    let previousTime = performance.now();

    const tick = (time: number) => {
      const elapsed = Math.min(
        time - previousTime,
        MEDIA_SHELF_INERTIA.maximumFrameDuration,
      );

      viewport.scrollLeft += velocity * elapsed;
      normalizeInfiniteScroll();
      syncReflectionTrack();
      velocity = decayMediaShelfVelocity(velocity, elapsed);
      previousTime = time;
      scheduleViewportStateUpdate();

      if (Math.abs(velocity) >= MEDIA_SHELF_INERTIA.stopVelocity) {
        inertiaFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        inertiaFrameRef.current = null;
      }
    };

    inertiaFrameRef.current = window.requestAnimationFrame(tick);
  };

  const finishDrag = (pointerId: number) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);
    startInertia(dragState.velocity);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 0) {
      return;
    }

    cancelInertia();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      previousClientX: event.clientX,
      previousTime: event.timeStamp,
      velocity: 0,
    };
    setIsDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const dragState = dragStateRef.current;

    if (!viewport || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const elapsed = Math.max(1, event.timeStamp - dragState.previousTime);
    const scrollDelta = dragState.previousClientX - event.clientX;
    const instantaneousVelocity = scrollDelta / elapsed;

    viewport.scrollLeft += scrollDelta;
    normalizeInfiniteScroll();
    syncReflectionTrack();
    dragState.velocity =
      dragState.velocity * 0.64 + instantaneousVelocity * 0.36;
    dragState.previousClientX = event.clientX;
    dragState.previousTime = event.timeStamp;
    scheduleViewportStateUpdate();
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    finishDrag(event.pointerId);
  };

  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    finishDrag(event.pointerId);
  };

  const onLostPointerCapture = (event: PointerEvent<HTMLDivElement>) => {
    finishDrag(event.pointerId);
  };

  const scrollByPage = (direction: ScrollDirection) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    cancelInertia();
    viewport.scrollBy({
      left: viewport.clientWidth * 0.68 * direction,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      scrollByPage(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      cancelInertia();
      const cycleWidth = cycleWidthRef.current;
      viewport.scrollTo({
        left:
          event.key === "Home"
            ? cycleWidth
            : cycleWidth * 2 - viewport.clientWidth,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
  };

  const cancelInertiaFromEffect = useEffectEvent(cancelInertia);
  const measureCycleFromEffect = useEffectEvent(measureCycle);
  const scheduleViewportStateUpdateFromEffect = useEffectEvent(
    scheduleViewportStateUpdate,
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const track = viewport.querySelector<HTMLElement>(".media-shelf__track");
    const handleScroll = () => {
      syncReflectionTrack();
      scheduleViewportStateUpdateFromEffect();
    };
    const handleWheel = () => cancelInertiaFromEffect();
    const resizeObserver = new ResizeObserver(() => {
      measureCycleFromEffect();
      scheduleViewportStateUpdateFromEffect();
    });
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelInertiaFromEffect();
      }
    };

    resizeObserver.observe(viewport);
    if (track) {
      resizeObserver.observe(track);
    }
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    viewport.addEventListener("wheel", handleWheel, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const initialFrame = window.requestAnimationFrame(() => {
      measureCycleFromEffect();
      scheduleViewportStateUpdateFromEffect();
    });

    return () => {
      cancelInertiaFromEffect();
      window.cancelAnimationFrame(initialFrame);
      if (viewportStateFrameRef.current !== null) {
        window.cancelAnimationFrame(viewportStateFrameRef.current);
      }
      resizeObserver.disconnect();
      viewport.removeEventListener("scroll", handleScroll);
      viewport.removeEventListener("wheel", handleWheel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return {
    viewportRef,
    reflectionTrackRef,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onKeyDown,
  };
}
