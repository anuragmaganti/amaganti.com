import Matter from "matter-js";

import {
  floatingProjectCardRoles,
  type FloatingProjectCardRole,
  type FloatingProjectLayoutPresetId,
} from "@/features/floating-projects/config";
import {
  createFloatingProjectCardPlacements,
  type FloatingProjectArenaSize,
  type FloatingProjectCardSize,
  type PreservedFloatingProjectPlacement,
} from "@/features/floating-projects/layout";
import {
  FLOATING_PROJECT_SIMULATION,
  resolveFloatingProjectPhysicsSteps,
} from "@/features/floating-projects/simulation";

const { Bodies, Body, Composite, Constraint, Engine, Sleeping, Vector } = Matter;

export type FloatingProjectCardBody = {
  role: FloatingProjectCardRole;
  body: Matter.Body;
  width: number;
  height: number;
  driftPhase: number;
};

export type FloatingProjectDragConstraint = {
  role: FloatingProjectCardRole;
  constraint: Matter.Constraint;
};

const WALL_THICKNESS = 96;
const MAX_LINEAR_SPEED = 16;
const MAX_ANGULAR_SPEED = 0.025;
const AMBIENT_FORCE = 0.0000032;
const CENTERING_FORCE = 0.0000024;
const AMBIENT_TORQUE = 0.0000000025;

export function createFloatingProjectWorld(reducedMotion: boolean) {
  const engine = Engine.create({ enableSleeping: true });
  const records = new Map<FloatingProjectCardRole, FloatingProjectCardBody>();
  let arenaSize: FloatingProjectArenaSize = { width: 0, height: 0 };

  engine.gravity.scale = 0;
  engine.positionIterations = 8;
  engine.velocityIterations = 6;
  engine.constraintIterations = 4;

  const stabilize = () => {
    for (const { body, width, height } of records.values()) {
      const cosine = Math.abs(Math.cos(body.angle));
      const sine = Math.abs(Math.sin(body.angle));
      const halfWidth = cosine * width * 0.5 + sine * height * 0.5;
      const halfHeight = sine * width * 0.5 + cosine * height * 0.5;
      const x = clamp(
        body.position.x,
        halfWidth,
        Math.max(halfWidth, arenaSize.width - halfWidth),
      );
      const y = clamp(
        body.position.y,
        halfHeight,
        Math.max(halfHeight, arenaSize.height - halfHeight),
      );

      if (x !== body.position.x || y !== body.position.y) {
        Body.setPosition(body, { x, y });
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

  const rebuild = (
    nextArenaSize: FloatingProjectArenaSize,
    cardSizes: Record<FloatingProjectCardRole, FloatingProjectCardSize>,
    presetId: FloatingProjectLayoutPresetId,
  ) => {
    const preserved = preservePlacements(records, arenaSize);
    arenaSize = nextArenaSize;
    Composite.clear(engine.world, false, true);
    records.clear();

    const placements = createFloatingProjectCardPlacements(
      arenaSize,
      cardSizes,
      preserved,
      presetId,
    );
    Composite.add(engine.world, createArenaWalls(arenaSize));

    floatingProjectCardRoles.forEach((role, index) => {
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
          frictionAir: reducedMotion ? 0.18 : 0.045,
          frictionStatic: 0.35,
          restitution: 0.52,
          sleepThreshold: reducedMotion ? 8 : 180,
        },
      );

      records.set(role, {
        role,
        body,
        ...size,
        driftPhase: index * 2.17 + 0.63,
      });
      Composite.add(engine.world, body);
    });

    for (let step = 0; step < 12; step += 1) {
      Engine.update(engine, FLOATING_PROJECT_SIMULATION.referenceStepMs);
    }

    for (const { body } of records.values()) {
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
      if (reducedMotion) Sleeping.set(body, true);
    }
    stabilize();
  };

  const step = (timestamp: number, deltaMs: number, isDragging: boolean) => {
    const physicsSteps = resolveFloatingProjectPhysicsSteps(deltaMs);

    for (let index = 0; index < physicsSteps.count; index += 1) {
      const stepTimestamp =
        timestamp -
        physicsSteps.deltaMs * (physicsSteps.count - index - 1);
      applyAmbientMotion(
        records,
        arenaSize,
        stepTimestamp,
        physicsSteps.deltaMs,
        reducedMotion || isDragging,
      );
      Engine.update(engine, physicsSteps.deltaMs);
    }
    stabilize();
  };

  const beginDrag = (
    role: FloatingProjectCardRole,
    pointer: Matter.Vector,
  ): FloatingProjectDragConstraint | null => {
    const record = records.get(role);
    if (!record) return null;

    const worldOffset = {
      x: pointer.x - record.body.position.x,
      y: pointer.y - record.body.position.y,
    };
    const constraint = Constraint.create({
      label: `project-card-drag:${role}`,
      pointA: pointer,
      bodyB: record.body,
      pointB: Vector.rotate(worldOffset, -record.body.angle),
      length: 0,
      stiffness: 0.24,
      damping: 0.14,
    });

    Sleeping.set(record.body, false);
    Composite.add(engine.world, constraint);
    return { role, constraint };
  };

  const endDrag = (drag: FloatingProjectDragConstraint) => {
    Composite.remove(engine.world, drag.constraint);
    const body = records.get(drag.role)?.body;

    if (body && reducedMotion) {
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
      Sleeping.set(body, true);
    }
  };

  return {
    records,
    rebuild,
    step,
    stabilize,
    beginDrag,
    updateDrag(drag: FloatingProjectDragConstraint, pointer: Matter.Vector) {
      drag.constraint.pointA.x = pointer.x;
      drag.constraint.pointA.y = pointer.y;
    },
    endDrag,
    nudge(role: FloatingProjectCardRole, x: number, y: number) {
      const body = records.get(role)?.body;
      if (!body) return;

      Sleeping.set(body, false);
      Body.translate(body, { x, y });
      Body.setVelocity(body, { x: x * 0.08, y: y * 0.08 });

      if (reducedMotion) {
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
        Sleeping.set(body, true);
      }
      stabilize();
    },
    hasActiveBodies() {
      for (const { body } of records.values()) {
        if (
          !body.isSleeping &&
          (body.speed > 0.015 || Math.abs(body.angularSpeed) > 0.0001)
        ) {
          return true;
        }
      }
      return false;
    },
    destroy() {
      Composite.clear(engine.world, false, true);
      Engine.clear(engine);
      records.clear();
    },
  };
}

function applyAmbientMotion(
  records: Map<FloatingProjectCardRole, FloatingProjectCardBody>,
  arena: FloatingProjectArenaSize,
  timestamp: number,
  deltaMs: number,
  disabled: boolean,
) {
  if (disabled) return;

  const time = timestamp / 1000;
  const forceCorrection =
    FLOATING_PROJECT_SIMULATION.referenceStepMs / deltaMs;

  for (const { body, driftPhase } of records.values()) {
    const driftX = Math.sin(time * 0.58 + driftPhase);
    const driftY = Math.cos(time * 0.47 + driftPhase * 1.4);
    const centerX = (arena.width * 0.5 - body.position.x) / arena.width;
    const centerY = (arena.height * 0.5 - body.position.y) / arena.height;

    Sleeping.set(body, false);
    Body.applyForce(body, body.position, {
      x:
        body.mass *
        (driftX * AMBIENT_FORCE + centerX * CENTERING_FORCE) *
        forceCorrection,
      y:
        body.mass *
        (driftY * AMBIENT_FORCE + centerY * CENTERING_FORCE) *
        forceCorrection,
    });
    body.torque +=
      Math.sin(time * 0.34 + driftPhase) *
      body.inertia *
      AMBIENT_TORQUE *
      forceCorrection;
  }
}

function preservePlacements(
  records: Map<FloatingProjectCardRole, FloatingProjectCardBody>,
  arena: FloatingProjectArenaSize,
) {
  if (!arena.width || !arena.height) return null;

  return Object.fromEntries(
    Array.from(records, ([role, { body }]) => [
      role,
      {
        x: body.position.x / arena.width,
        y: body.position.y / arena.height,
        angle: body.angle,
      },
    ]),
  ) as Partial<
    Record<FloatingProjectCardRole, PreservedFloatingProjectPlacement>
  >;
}

function createArenaWalls({ width, height }: FloatingProjectArenaSize) {
  const options: Matter.IChamferableBodyDefinition = {
    isStatic: true,
    label: "project-card-boundary",
    friction: 0.12,
    restitution: 0.48,
  };
  const wall = WALL_THICKNESS;

  return [
    Bodies.rectangle(width * 0.5, -wall * 0.5, width + wall * 2, wall, options),
    Bodies.rectangle(
      width * 0.5,
      height + wall * 0.5,
      width + wall * 2,
      wall,
      options,
    ),
    Bodies.rectangle(-wall * 0.5, height * 0.5, wall, height + wall * 2, options),
    Bodies.rectangle(
      width + wall * 0.5,
      height * 0.5,
      wall,
      height + wall * 2,
      options,
    ),
  ];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
