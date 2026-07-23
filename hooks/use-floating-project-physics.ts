"use client";

import Matter from "matter-js";
import { useReducedMotion } from "motion/react";
import { type RefObject, useLayoutEffect } from "react";

import {
  createFloatingProjectCardPlacements,
  floatingProjectCardRoles,
  type FloatingProjectArenaSize,
  type FloatingProjectCardRole,
  type PreservedFloatingProjectPlacement,
} from "@/lib/floating-project-layout";
import {
  FLOATING_PROJECT_SIMULATION,
  resolveFloatingProjectPhysicsSteps,
} from "@/lib/floating-project-simulation";
import { writeParticleObstacleGeometry } from "@/lib/particle-obstacle-geometry";
import {
  batchParticleObstacleUpdates,
  publishParticleObstacle,
  registerParticleObstacle,
  unregisterParticleObstacle,
  type ParticleObstacleEntry,
} from "@/lib/particle-obstacle-store";
import {
  registerSceneFrameTask,
  SCENE_FRAME_PRIORITY,
  type SceneFrameState,
  type SceneFrameTaskController,
} from "@/lib/scene-frame-scheduler";

const {
  Bodies,
  Body,
  Composite,
  Constraint,
  Engine,
  Sleeping,
  Vector,
} = Matter;

type CardBodyRecord = {
  role: FloatingProjectCardRole;
  element: HTMLElement;
  body: Matter.Body;
  width: number;
  height: number;
  driftPhase: number;
};

type CardObstacleState = {
  entry: ParticleObstacleEntry;
  cornerRadius: number;
  previousCenterX: number;
  previousCenterY: number;
  previousAngle: number;
  previousTimestamp: number;
  smoothedVelocityX: number;
  smoothedVelocityY: number;
  smoothedAngularVelocity: number;
};

type ActiveDrag = {
  pointerId: number;
  record: CardBodyRecord;
  constraint: Matter.Constraint;
  previousUserSelect: string;
};

type CardSize = {
  width: number;
  height: number;
};

const WALL_THICKNESS = 96;
const MAX_LINEAR_SPEED = 16;
const MAX_ANGULAR_SPEED = 0.025;
const AMBIENT_FORCE = 0.0000032;
const CENTERING_FORCE = 0.0000024;
const AMBIENT_TORQUE = 0.0000000025;
const PREWARM_VERTICAL_VIEWPORT_RATIO = 0.55;
const PREWARM_HORIZONTAL_VIEWPORT_RATIO = 0.2;
const MAX_SCREEN_VELOCITY = 2400;
const MAX_SCREEN_ANGULAR_VELOCITY = Math.PI * 1.5;
const MOTION_SMOOTHING = 12;
const STICKY_SCROLL_COUPLING = 0.55;

export function useFloatingProjectPhysics({
  layoutKey,
  arenaRef,
  mediaCardRef,
  copyCardRef,
  actionsCardRef,
}: {
  layoutKey: string;
  arenaRef: RefObject<HTMLDivElement | null>;
  mediaCardRef: RefObject<HTMLElement | null>;
  copyCardRef: RefObject<HTMLElement | null>;
  actionsCardRef: RefObject<HTMLElement | null>;
}) {
  const prefersReducedMotion = Boolean(useReducedMotion());

  useLayoutEffect(() => {
    const arena = arenaRef.current;
    const cardElements = {
      media: mediaCardRef.current,
      copy: copyCardRef.current,
      actions: actionsCardRef.current,
    } satisfies Record<FloatingProjectCardRole, HTMLElement | null>;

    if (
      !arena ||
      floatingProjectCardRoles.some((role) => !cardElements[role])
    ) {
      return;
    }

    const engine = Engine.create({ enableSleeping: true });
    engine.gravity.scale = 0;
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    engine.constraintIterations = 4;

    const records = new Map<FloatingProjectCardRole, CardBodyRecord>();
    const obstacleStates = new Map<
      FloatingProjectCardRole,
      CardObstacleState
    >();

    for (const role of floatingProjectCardRoles) {
      obstacleStates.set(role, {
        entry: registerParticleObstacle(`${layoutKey}:${role}`),
        cornerRadius: readCornerRadius(cardElements[role]!),
        previousCenterX: 0,
        previousCenterY: 0,
        previousAngle: 0,
        previousTimestamp: 0,
        smoothedVelocityX: 0,
        smoothedVelocityY: 0,
        smoothedAngularVelocity: 0,
      });
    }

    let arenaSize: FloatingProjectArenaSize = { width: 0, height: 0 };
    let activeDrag: ActiveDrag | null = null;
    let frameTask: SceneFrameTaskController | null = null;
    let buildPending = false;
    let preserveReducedMotionKeyboardFrame = false;
    let isVisible = false;
    let isDestroyed = false;
    let zIndex = 3;

    const publishBodies = (frame: SceneFrameState) => {
      if (!records.size) {
        return;
      }

      const arenaBounds = arena.getBoundingClientRect();
      const scaleX = arena.clientWidth
        ? arenaBounds.width / arena.clientWidth
        : 1;
      const scaleY = arena.clientHeight
        ? arenaBounds.height / arena.clientHeight
        : 1;
      const cornerScale = Math.min(scaleX, scaleY);

      batchParticleObstacleUpdates(() => {
        for (const record of records.values()) {
          const x = record.body.position.x - record.width * 0.5;
          const y = record.body.position.y - record.height * 0.5;
          const centerX = arenaBounds.left + record.body.position.x * scaleX;
          const centerY = arenaBounds.top + record.body.position.y * scaleY;
          const obstacleState = obstacleStates.get(record.role)!;

          record.element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${record.body.angle}rad)`;
          record.element.dataset.physicsX = record.body.position.x.toFixed(2);
          record.element.dataset.physicsY = record.body.position.y.toFixed(2);
          record.element.dataset.physicsAngle = record.body.angle.toFixed(6);

          writeParticleObstacleGeometry(
            obstacleState.entry.geometry,
            centerX,
            centerY,
            record.width * scaleX,
            record.height * scaleY,
            record.body.angle,
            obstacleState.cornerRadius * cornerScale,
          );
          updateObstacleMotion(
            obstacleState,
            frame,
            centerX,
            centerY,
            record.body.angle,
          );
          publishParticleObstacle(
            obstacleState.entry,
            getViewportApproachStrength(obstacleState.entry),
          );
        }
      });
    };

    const applyAmbientMotion = (timestamp: number, deltaMs: number) => {
      if (prefersReducedMotion || activeDrag) {
        return;
      }

      const time = timestamp / 1000;
      const centerX = arenaSize.width * 0.5;
      const centerY = arenaSize.height * 0.5;
      const forceCorrection =
        FLOATING_PROJECT_SIMULATION.referenceStepMs / deltaMs;

      for (const record of records.values()) {
        const { body, driftPhase } = record;
        const normalizedCenterX = (centerX - body.position.x) / arenaSize.width;
        const normalizedCenterY = (centerY - body.position.y) / arenaSize.height;
        const driftX = Math.sin(time * 0.58 + driftPhase);
        const driftY = Math.cos(time * 0.47 + driftPhase * 1.4);

        Sleeping.set(body, false);
        Body.applyForce(body, body.position, {
          x:
            body.mass *
            (driftX * AMBIENT_FORCE + normalizedCenterX * CENTERING_FORCE) *
            forceCorrection,
          y:
            body.mass *
            (driftY * AMBIENT_FORCE + normalizedCenterY * CENTERING_FORCE) *
            forceCorrection,
        });
        body.torque +=
          Math.sin(time * 0.34 + driftPhase) *
          body.inertia *
          AMBIENT_TORQUE *
          forceCorrection;
      }
    };

    const stabilizeBodies = () => {
      for (const record of records.values()) {
        const { body, width, height } = record;
        const cosine = Math.abs(Math.cos(body.angle));
        const sine = Math.abs(Math.sin(body.angle));
        const halfWidth = cosine * width * 0.5 + sine * height * 0.5;
        const halfHeight = sine * width * 0.5 + cosine * height * 0.5;
        const clampedX = clamp(
          body.position.x,
          halfWidth,
          Math.max(halfWidth, arenaSize.width - halfWidth),
        );
        const clampedY = clamp(
          body.position.y,
          halfHeight,
          Math.max(halfHeight, arenaSize.height - halfHeight),
        );

        if (clampedX !== body.position.x || clampedY !== body.position.y) {
          Body.setPosition(body, { x: clampedX, y: clampedY });
        }

        if (body.speed > MAX_LINEAR_SPEED) {
          Body.setVelocity(
            body,
            Vector.mult(Vector.normalise(body.velocity), MAX_LINEAR_SPEED),
          );
        }

        if (Math.abs(body.angularVelocity) > MAX_ANGULAR_SPEED) {
          Body.setAngularVelocity(
            body,
            Math.sign(body.angularVelocity) * MAX_ANGULAR_SPEED,
          );
        }

        if (Math.abs(body.angle) > FLOATING_PROJECT_SIMULATION.maxCardAngle) {
          Body.setAngle(
            body,
            clamp(
              body.angle,
              -FLOATING_PROJECT_SIMULATION.maxCardAngle,
              FLOATING_PROJECT_SIMULATION.maxCardAngle,
            ),
          );
          Body.setAngularVelocity(body, body.angularVelocity * -0.24);
        }
      }
    };

    const cancelDrag = () => {
      if (!activeDrag) {
        return;
      }

      Composite.remove(engine.world, activeDrag.constraint);
      activeDrag.record.element.removeAttribute("data-dragging");
      if (activeDrag.record.element.hasPointerCapture(activeDrag.pointerId)) {
        activeDrag.record.element.releasePointerCapture(activeDrag.pointerId);
      }
      document.documentElement.style.userSelect = activeDrag.previousUserSelect;

      if (prefersReducedMotion) {
        Body.setVelocity(activeDrag.record.body, { x: 0, y: 0 });
        Body.setAngularVelocity(activeDrag.record.body, 0);
        Sleeping.set(activeDrag.record.body, true);
      }

      activeDrag = null;
    };

    const buildWorld = () => {
      cancelDrag();

      const width = arena.clientWidth;
      const height = arena.clientHeight;

      if (width < 1 || height < 1) {
        return;
      }

      const preserved = preservePlacements(records, arenaSize);
      arenaSize = { width, height };
      Composite.clear(engine.world, false, true);
      records.clear();

      const cardSizes = Object.fromEntries(
        floatingProjectCardRoles.map((role) => {
          const element = cardElements[role]!;
          const obstacleState = obstacleStates.get(role)!;
          obstacleState.cornerRadius = readCornerRadius(element);

          return [
            role,
            {
              width: Math.min(element.offsetWidth, width),
              height: Math.min(element.offsetHeight, height),
            },
          ];
        }),
      ) as Record<FloatingProjectCardRole, CardSize>;
      const placements = createFloatingProjectCardPlacements(
        arenaSize,
        cardSizes,
        preserved,
        layoutKey,
      );

      Composite.add(engine.world, createArenaWalls(width, height));

      floatingProjectCardRoles.forEach((role, index) => {
        const element = cardElements[role]!;
        const size = cardSizes[role];
        const placement = placements[role];
        const body = Bodies.rectangle(
          placement.x,
          placement.y,
          size.width,
          size.height,
          {
            label: `project-card:${role}`,
            angle: placement.angle,
            chamfer: {
              radius: Math.min(24, size.width * 0.055, size.height * 0.12),
            },
            density: role === "copy" ? 0.00125 : 0.001,
            friction: 0.18,
            frictionAir: prefersReducedMotion ? 0.18 : 0.045,
            frictionStatic: 0.35,
            restitution: 0.52,
            sleepThreshold: prefersReducedMotion ? 8 : 180,
          },
        );

        records.set(role, {
          role,
          element,
          body,
          width: size.width,
          height: size.height,
          driftPhase: index * 2.17 + 0.63,
        });
        Composite.add(engine.world, body);
      });

      // Resolve tight responsive placements before the first painted frame.
      for (let step = 0; step < 12; step += 1) {
        Engine.update(engine, FLOATING_PROJECT_SIMULATION.referenceStepMs);
      }

      for (const { body } of records.values()) {
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);

        if (prefersReducedMotion) {
          Sleeping.set(body, true);
        }
      }

      stabilizeBodies();
    };

    const runFrame = (frame: SceneFrameState) => {
      if (isDestroyed) {
        return;
      }

      if (buildPending) {
        buildPending = false;
        buildWorld();
      }

      if (!records.size) {
        frameTask?.setContinuous(false);
        return;
      }

      if (isVisible && !preserveReducedMotionKeyboardFrame) {
        const physicsSteps = resolveFloatingProjectPhysicsSteps(frame.deltaMs);
        for (let step = 0; step < physicsSteps.count; step += 1) {
          const stepTimestamp =
            frame.timestamp -
            physicsSteps.deltaMs * (physicsSteps.count - step - 1);
          applyAmbientMotion(stepTimestamp, physicsSteps.deltaMs);
          Engine.update(engine, physicsSteps.deltaMs);
        }

        stabilizeBodies();
      }
      preserveReducedMotionKeyboardFrame = false;

      publishBodies(frame);

      let hasActiveBody = false;
      for (const { body } of records.values()) {
        if (
          !body.isSleeping &&
          (body.speed > 0.015 || Math.abs(body.angularSpeed) > 0.0001)
        ) {
          hasActiveBody = true;
          break;
        }
      }

      frameTask?.setContinuous(
        isVisible &&
          (!prefersReducedMotion || Boolean(activeDrag) || hasActiveBody),
      );
    };

    frameTask = registerSceneFrameTask(runFrame, {
      priority: SCENE_FRAME_PRIORITY.projectPhysics,
      runOnScroll: true,
      runOnResize: true,
    });

    const requestMotionFrame = () => {
      if (isVisible && !isDestroyed) {
        frameTask?.setContinuous(true);
      }
      frameTask?.request();
    };

    const scheduleBuild = () => {
      buildPending = true;
      frameTask?.request();
    };

    const getPointerPosition = (event: PointerEvent) => {
      const rect = arena.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (activeDrag || event.button > 0) {
        return;
      }

      const element = event.currentTarget as HTMLElement;
      const role = element.dataset.floatingCardRole as
        | FloatingProjectCardRole
        | undefined;
      const record = role ? records.get(role) : null;
      const target = event.target as HTMLElement;
      const isTouchLike =
        event.pointerType === "touch" || event.pointerType === "pen";
      const usedHandle = Boolean(
        target.closest(".project-float-card__handle"),
      );

      if (
        !record ||
        (!usedHandle && target.closest("a, button")) ||
        (isTouchLike && !usedHandle)
      ) {
        return;
      }

      event.preventDefault();
      const pointer = getPointerPosition(event);
      const worldOffset = {
        x: pointer.x - record.body.position.x,
        y: pointer.y - record.body.position.y,
      };
      const localOffset = Vector.rotate(worldOffset, -record.body.angle);
      const constraint = Constraint.create({
        label: `project-card-drag:${role}`,
        pointA: pointer,
        bodyB: record.body,
        pointB: localOffset,
        length: 0,
        stiffness: 0.24,
        damping: 0.14,
      });

      Sleeping.set(record.body, false);
      Composite.add(engine.world, constraint);
      element.dataset.dragging = "true";
      element.style.zIndex = String(++zIndex);
      element.setPointerCapture(event.pointerId);
      activeDrag = {
        pointerId: event.pointerId,
        record,
        constraint,
        previousUserSelect: document.documentElement.style.userSelect,
      };
      document.documentElement.style.userSelect = "none";
      requestMotionFrame();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const pointer = getPointerPosition(event);
      activeDrag.constraint.pointA.x = pointer.x;
      activeDrag.constraint.pointA.y = pointer.y;
      requestMotionFrame();
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
        return;
      }

      const { element } = activeDrag.record;
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      cancelDrag();
      requestMotionFrame();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const handle = event.currentTarget as HTMLElement;
      const role = handle.dataset.floatingCardHandle as
        | FloatingProjectCardRole
        | undefined;
      const record = role ? records.get(role) : null;

      if (!record) {
        return;
      }

      const step = event.shiftKey ? 36 : 12;
      const movement = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
      }[event.key];

      if (!movement) {
        return;
      }

      event.preventDefault();
      Sleeping.set(record.body, false);
      Body.translate(record.body, movement);
      Body.setVelocity(record.body, {
        x: movement.x * 0.08,
        y: movement.y * 0.08,
      });
      if (prefersReducedMotion) {
        Body.setVelocity(record.body, { x: 0, y: 0 });
        Body.setAngularVelocity(record.body, 0);
        Sleeping.set(record.body, true);
        preserveReducedMotionKeyboardFrame = true;
      }
      record.element.style.zIndex = String(++zIndex);
      stabilizeBodies();
      requestMotionFrame();
    };

    const resizeObserver = new ResizeObserver(scheduleBuild);
    resizeObserver.observe(arena);

    for (const role of floatingProjectCardRoles) {
      const element = cardElements[role]!;
      const handle = element.querySelector<HTMLElement>(
        ".project-float-card__handle",
      );

      resizeObserver.observe(element);
      element.addEventListener("pointerdown", handlePointerDown);
      element.addEventListener("pointermove", handlePointerMove, {
        passive: false,
      });
      element.addEventListener("pointerup", handlePointerEnd);
      element.addEventListener("pointercancel", handlePointerEnd);
      handle?.addEventListener("keydown", handleKeyDown);
    }

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting && entry.intersectionRatio > 0.01;

        if (isVisible) {
          requestMotionFrame();
        } else {
          cancelDrag();
          frameTask?.setContinuous(false);
          frameTask?.request();
        }
      },
      { threshold: [0, 0.01, 0.15] },
    );
    intersectionObserver.observe(arena);
    scheduleBuild();

    return () => {
      isDestroyed = true;
      cancelDrag();
      frameTask?.dispose();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      for (const role of floatingProjectCardRoles) {
        const element = cardElements[role]!;
        const handle = element.querySelector<HTMLElement>(
          ".project-float-card__handle",
        );

        element.removeEventListener("pointerdown", handlePointerDown);
        element.removeEventListener("pointermove", handlePointerMove);
        element.removeEventListener("pointerup", handlePointerEnd);
        element.removeEventListener("pointercancel", handlePointerEnd);
        handle?.removeEventListener("keydown", handleKeyDown);
      }

      batchParticleObstacleUpdates(() => {
        for (const state of obstacleStates.values()) {
          unregisterParticleObstacle(state.entry);
        }
      });
      Composite.clear(engine.world, false, true);
      Engine.clear(engine);
    };
  }, [
    actionsCardRef,
    arenaRef,
    copyCardRef,
    layoutKey,
    mediaCardRef,
    prefersReducedMotion,
  ]);
}

function updateObstacleMotion(
  state: CardObstacleState,
  frame: SceneFrameState,
  centerX: number,
  centerY: number,
  angle: number,
) {
  const deltaSeconds = state.previousTimestamp
    ? Math.max((frame.timestamp - state.previousTimestamp) / 1000, 0.001)
    : 0;
  const rawVelocityX = deltaSeconds
    ? clamp(
        (centerX - state.previousCenterX) / deltaSeconds,
        -MAX_SCREEN_VELOCITY,
        MAX_SCREEN_VELOCITY,
      )
    : 0;
  const rawVelocityY = deltaSeconds
    ? clamp(
        (centerY - state.previousCenterY) / deltaSeconds,
        -MAX_SCREEN_VELOCITY,
        MAX_SCREEN_VELOCITY,
      )
    : 0;
  const rawAngularVelocity = deltaSeconds
    ? clamp(
        normalizeAngle(angle - state.previousAngle) / deltaSeconds,
        -MAX_SCREEN_ANGULAR_VELOCITY,
        MAX_SCREEN_ANGULAR_VELOCITY,
      )
    : 0;
  const velocityLerp = deltaSeconds
    ? 1 - Math.exp(-deltaSeconds * MOTION_SMOOTHING)
    : 1;

  state.smoothedVelocityX = lerp(
    state.smoothedVelocityX,
    rawVelocityX,
    velocityLerp,
  );
  state.smoothedVelocityY = lerp(
    state.smoothedVelocityY,
    rawVelocityY,
    velocityLerp,
  );
  state.smoothedAngularVelocity = lerp(
    state.smoothedAngularVelocity,
    rawAngularVelocity,
    velocityLerp,
  );

  const scrollDrivenCardVelocityY = -frame.scrollVelocityY;
  const cardMovementShare = clamp(
    Math.abs(state.smoothedVelocityY) /
      (Math.abs(scrollDrivenCardVelocityY) + 1),
    0,
    1,
  );
  const stickyCurrentY =
    scrollDrivenCardVelocityY *
    (1 - cardMovementShare) *
    STICKY_SCROLL_COUPLING;

  state.entry.motion.velocityX = state.smoothedVelocityX;
  state.entry.motion.velocityY = clamp(
    state.smoothedVelocityY + stickyCurrentY,
    -MAX_SCREEN_VELOCITY,
    MAX_SCREEN_VELOCITY,
  );
  state.entry.motion.angularVelocity = state.smoothedAngularVelocity;
  state.entry.motion.sampledAt = frame.timestamp;
  state.previousCenterX = centerX;
  state.previousCenterY = centerY;
  state.previousAngle = angle;
  state.previousTimestamp = frame.timestamp;
}

function getViewportApproachStrength(entry: ParticleObstacleEntry) {
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const horizontalDistance = getDistanceFromViewport(
    entry.geometry.bounds.left,
    entry.geometry.bounds.right,
    viewportWidth,
  );
  const verticalDistance = getDistanceFromViewport(
    entry.geometry.bounds.top,
    entry.geometry.bounds.bottom,
    viewportHeight,
  );
  const normalizedDistance = Math.max(
    horizontalDistance /
      (viewportWidth * PREWARM_HORIZONTAL_VIEWPORT_RATIO),
    verticalDistance / (viewportHeight * PREWARM_VERTICAL_VIEWPORT_RATIO),
  );
  const approach = clamp(1 - normalizedDistance, 0, 1);

  return approach * approach * (3 - 2 * approach);
}

function getDistanceFromViewport(
  start: number,
  end: number,
  viewportSize: number,
) {
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

function preservePlacements(
  records: Map<FloatingProjectCardRole, CardBodyRecord>,
  arenaSize: FloatingProjectArenaSize,
) {
  if (!arenaSize.width || !arenaSize.height) {
    return null;
  }

  return Object.fromEntries(
    Array.from(records, ([role, record]) => [
      role,
      {
        x: record.body.position.x / arenaSize.width,
        y: record.body.position.y / arenaSize.height,
        angle: record.body.angle,
      },
    ]),
  ) as Partial<
    Record<FloatingProjectCardRole, PreservedFloatingProjectPlacement>
  >;
}

function createArenaWalls(width: number, height: number) {
  const options: Matter.IChamferableBodyDefinition = {
    isStatic: true,
    label: "project-card-boundary",
    friction: 0.12,
    restitution: 0.48,
  };

  return [
    Bodies.rectangle(
      width * 0.5,
      -WALL_THICKNESS * 0.5,
      width + WALL_THICKNESS * 2,
      WALL_THICKNESS,
      options,
    ),
    Bodies.rectangle(
      width * 0.5,
      height + WALL_THICKNESS * 0.5,
      width + WALL_THICKNESS * 2,
      WALL_THICKNESS,
      options,
    ),
    Bodies.rectangle(
      -WALL_THICKNESS * 0.5,
      height * 0.5,
      WALL_THICKNESS,
      height + WALL_THICKNESS * 2,
      options,
    ),
    Bodies.rectangle(
      width + WALL_THICKNESS * 0.5,
      height * 0.5,
      WALL_THICKNESS,
      height + WALL_THICKNESS * 2,
      options,
    ),
  ];
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
