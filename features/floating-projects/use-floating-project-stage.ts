"use client";

import { useReducedMotion } from "motion/react";
import { type RefObject, useLayoutEffect } from "react";

import {
  floatingProjectCardRoles,
  getFloatingProjectCardScale,
  mapFloatingProjectCards,
  type FloatingProjectCardRole,
  type FloatingProjectLayoutPresetId,
} from "@/features/floating-projects/config";
import { createFloatingProjectFrameRenderer } from "@/features/floating-projects/frame-renderer";
import {
  createFloatingProjectWorld,
  type FloatingProjectDragConstraint,
} from "@/features/floating-projects/physics-world";
import {
  registerSceneFrameTask,
  SCENE_FRAME_PRIORITY,
  type SceneFrameTaskController,
} from "@/lib/scene-frame-scheduler";
import { observeViewportProximity } from "@/lib/viewport-proximity";

type ActiveDrag = {
  pointerId: number;
  element: HTMLElement;
  drag: FloatingProjectDragConstraint;
  previousUserSelect: string;
};

export function useFloatingProjectStage({
  stageId,
  layoutPreset,
  arenaRef,
}: {
  stageId: string;
  layoutPreset: FloatingProjectLayoutPresetId;
  arenaRef: RefObject<HTMLDivElement | null>;
}) {
  const reducedMotion = Boolean(useReducedMotion());

  useLayoutEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;

    const elements = readCardElements(arena);
    if (!elements) return;

    const renderer = createFloatingProjectFrameRenderer(
      stageId,
      arena,
      elements,
    );
    arena.dataset.active = "false";
    const world = createFloatingProjectWorld(reducedMotion);
    let activeDrag: ActiveDrag | null = null;
    let frameTask: SceneFrameTaskController | null = null;
    let buildPending = false;
    let preserveReducedMotionKeyboardFrame = false;
    let isVisible = false;
    let isNearViewport = false;
    let isDestroyed = false;
    let zIndex = 3;

    const cancelDrag = () => {
      if (!activeDrag) return;

      world.endDrag(activeDrag.drag);
      activeDrag.element.removeAttribute("data-dragging");
      if (activeDrag.element.hasPointerCapture(activeDrag.pointerId)) {
        activeDrag.element.releasePointerCapture(activeDrag.pointerId);
      }
      document.documentElement.style.userSelect =
        activeDrag.previousUserSelect;
      activeDrag = null;
    };

    const buildWorld = () => {
      cancelDrag();

      const width = arena.clientWidth;
      const height = arena.clientHeight;
      if (width < 1 || height < 1) return;

      const cardScale = getFloatingProjectCardScale(window.innerWidth);
      renderer.refreshMeasurements(cardScale);
      const cardSizes = mapFloatingProjectCards((role) => ({
        width: Math.min(elements[role].offsetWidth * cardScale, width),
        height: Math.min(elements[role].offsetHeight * cardScale, height),
      }));
      world.rebuild({ width, height }, cardSizes, layoutPreset);
    };

    const runFrame = (frame: Parameters<typeof renderer.render>[1]) => {
      if (isDestroyed) return;

      if (buildPending) {
        buildPending = false;
        buildWorld();
      }

      if (!isNearViewport) {
        frameTask?.setContinuous(false);
        return;
      }

      if (!world.records.size) {
        frameTask?.setContinuous(false);
        return;
      }

      if (isVisible && !preserveReducedMotionKeyboardFrame) {
        world.step(frame.timestamp, frame.deltaMs, Boolean(activeDrag));
      }
      preserveReducedMotionKeyboardFrame = false;
      renderer.render(world.records, frame);
      frameTask?.setContinuous(
        isVisible &&
          (!reducedMotion || Boolean(activeDrag) || world.hasActiveBodies()),
      );
    };

    frameTask = registerSceneFrameTask(runFrame, {
      priority: SCENE_FRAME_PRIORITY.projectPhysics,
      runOnScroll: true,
      runOnResize: true,
    });

    function requestFrame() {
      if (!isNearViewport || isDestroyed) return;

      if (isVisible && !isDestroyed) frameTask?.setContinuous(true);
      frameTask?.request();
    }
    const scheduleBuild = () => {
      buildPending = true;
      frameTask?.request();
    };
    const getPointerPosition = (event: PointerEvent) => {
      const rect = arena.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (activeDrag || event.button > 0) return;

      const target = event.target as HTMLElement;
      const element = target.closest<HTMLElement>(
        "[data-floating-card-role]",
      );
      const role = readCardRole(element);
      const usedHandle = Boolean(
        target.closest(".project-float-card__handle"),
      );
      const usedInteractiveControl = Boolean(
        target.closest("a, button, input, select, textarea, video"),
      );
      const isTouchLike =
        event.pointerType === "touch" || event.pointerType === "pen";

      if (
        !element ||
        !role ||
        (!usedHandle && usedInteractiveControl) ||
        (isTouchLike && !usedHandle)
      ) {
        return;
      }

      const drag = world.beginDrag(role, getPointerPosition(event));
      if (!drag) return;

      event.preventDefault();
      element.dataset.dragging = "true";
      element.style.zIndex = String(++zIndex);
      element.setPointerCapture(event.pointerId);
      activeDrag = {
        pointerId: event.pointerId,
        element,
        drag,
        previousUserSelect: document.documentElement.style.userSelect,
      };
      document.documentElement.style.userSelect = "none";
      requestFrame();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      world.updateDrag(activeDrag.drag, getPointerPosition(event));
      requestFrame();
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
      cancelDrag();
      requestFrame();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const handle = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-floating-card-handle]",
      );
      const role = readCardRole(handle, "floatingCardHandle");
      if (!handle || !role) return;

      const step = event.shiftKey ? 36 : 12;
      const movement = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }[event.key];
      if (!movement) return;

      event.preventDefault();
      world.nudge(role, movement[0], movement[1]);
      preserveReducedMotionKeyboardFrame = reducedMotion;
      elements[role].style.zIndex = String(++zIndex);
      requestFrame();
    };

    const resizeObserver = new ResizeObserver(scheduleBuild);
    resizeObserver.observe(arena);
    for (const role of floatingProjectCardRoles) {
      resizeObserver.observe(elements[role]);
    }

    arena.addEventListener("pointerdown", handlePointerDown);
    arena.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    arena.addEventListener("pointerup", handlePointerEnd);
    arena.addEventListener("pointercancel", handlePointerEnd);
    arena.addEventListener("keydown", handleKeyDown);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting && entry.intersectionRatio > 0.01;
        arena.dataset.active = String(isVisible);

        if (isVisible) {
          requestFrame();
        } else {
          cancelDrag();
          frameTask?.setContinuous(false);
          frameTask?.request();
        }
      },
      { threshold: [0, 0.01, 0.15] },
    );
    intersectionObserver.observe(arena);
    const stopObservingProximity = observeViewportProximity(
      arena,
      (nextIsNearViewport) => {
        isNearViewport = nextIsNearViewport;

        if (isNearViewport) {
          requestFrame();
        } else {
          cancelDrag();
          frameTask?.setContinuous(false);
          renderer.deactivate();
        }
      },
      { marginViewportRatio: 0.75 },
    );
    scheduleBuild();

    return () => {
      isDestroyed = true;
      delete arena.dataset.active;
      cancelDrag();
      frameTask?.dispose();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      stopObservingProximity();
      arena.removeEventListener("pointerdown", handlePointerDown);
      arena.removeEventListener("pointermove", handlePointerMove);
      arena.removeEventListener("pointerup", handlePointerEnd);
      arena.removeEventListener("pointercancel", handlePointerEnd);
      arena.removeEventListener("keydown", handleKeyDown);
      renderer.destroy();
      world.destroy();
    };
  }, [arenaRef, layoutPreset, reducedMotion, stageId]);
}

function readCardElements(arena: HTMLElement) {
  const entries = floatingProjectCardRoles.map((role) => [
    role,
    arena.querySelector<HTMLElement>(`[data-floating-card-role="${role}"]`),
  ] as const);

  if (entries.some(([, element]) => !element)) return null;
  return Object.fromEntries(entries) as Record<
    FloatingProjectCardRole,
    HTMLElement
  >;
}

function readCardRole(
  element: HTMLElement | null,
  datasetKey: "floatingCardRole" | "floatingCardHandle" =
    "floatingCardRole",
) {
  const role = element?.dataset[datasetKey];
  return floatingProjectCardRoles.includes(role as FloatingProjectCardRole)
    ? (role as FloatingProjectCardRole)
    : null;
}
