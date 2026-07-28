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
  clampMediaShelfScroll,
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

export function useInertialHorizontalScroll() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const scrollStateFrameRef = useRef<number | null>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollBackward, setCanScrollBackward] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const cancelInertia = () => {
    if (inertiaFrameRef.current !== null) {
      window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
  };

  const updateScrollState = () => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const maximumScroll = Math.max(
      0,
      viewport.scrollWidth - viewport.clientWidth,
    );

    setCanScrollBackward(viewport.scrollLeft > 1);
    setCanScrollForward(viewport.scrollLeft < maximumScroll - 1);
  };

  const scheduleScrollStateUpdate = () => {
    if (scrollStateFrameRef.current !== null) {
      return;
    }

    scrollStateFrameRef.current = window.requestAnimationFrame(() => {
      scrollStateFrameRef.current = null;
      updateScrollState();
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
      const nextScroll = clampMediaShelfScroll(
        viewport.scrollLeft + velocity * elapsed,
        viewport.clientWidth,
        viewport.scrollWidth,
      );
      const reachedBoundary = nextScroll === viewport.scrollLeft;

      viewport.scrollLeft = nextScroll;
      velocity = decayMediaShelfVelocity(velocity, elapsed);
      previousTime = time;
      scheduleScrollStateUpdate();

      if (
        !reachedBoundary &&
        Math.abs(velocity) >= MEDIA_SHELF_INERTIA.stopVelocity
      ) {
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

    if (
      !viewport ||
      !dragState ||
      dragState.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();
    const elapsed = Math.max(1, event.timeStamp - dragState.previousTime);
    const scrollDelta = dragState.previousClientX - event.clientX;
    const instantaneousVelocity = scrollDelta / elapsed;

    viewport.scrollLeft = clampMediaShelfScroll(
      viewport.scrollLeft + scrollDelta,
      viewport.clientWidth,
      viewport.scrollWidth,
    );
    dragState.velocity =
      dragState.velocity * 0.64 + instantaneousVelocity * 0.36;
    dragState.previousClientX = event.clientX;
    dragState.previousTime = event.timeStamp;
    scheduleScrollStateUpdate();
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
      left: viewport.clientWidth * 0.78 * direction,
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
      viewport.scrollTo({
        left:
          event.key === "Home"
            ? 0
            : viewport.scrollWidth - viewport.clientWidth,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
  };

  const cancelInertiaFromEffect = useEffectEvent(cancelInertia);
  const scheduleScrollStateUpdateFromEffect = useEffectEvent(
    scheduleScrollStateUpdate,
  );
  const updateScrollStateFromEffect = useEffectEvent(updateScrollState);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const handleScroll = () => scheduleScrollStateUpdateFromEffect();
    const handleWheel = () => cancelInertiaFromEffect();
    const resizeObserver = new ResizeObserver(handleScroll);
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelInertiaFromEffect();
      }
    };

    resizeObserver.observe(viewport);
    viewport.addEventListener("scroll", handleScroll, {
      passive: true,
    });
    viewport.addEventListener("wheel", handleWheel, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    updateScrollStateFromEffect();

    return () => {
      cancelInertiaFromEffect();
      if (scrollStateFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollStateFrameRef.current);
      }
      resizeObserver.disconnect();
      viewport.removeEventListener("scroll", handleScroll);
      viewport.removeEventListener("wheel", handleWheel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return {
    viewportRef,
    isDragging,
    canScrollBackward,
    canScrollForward,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onKeyDown,
    scrollByPage,
  };
}
