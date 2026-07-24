"use client";

import { useEffect, useRef } from "react";
import {
  MODE_DRAWS,
  resolvePreset,
  type OrbState,
} from "thinking-orbs";

import {
  registerSceneFrameTask,
  SCENE_FRAME_PRIORITY,
} from "@/lib/scene-frame-scheduler";

const ORB_SIZE = 64;

function ProjectActionOrb({
  state,
  theme,
}: {
  state: OrbState;
  theme: "light" | "dark";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(ORB_SIZE * pixelRatio);
    canvas.height = Math.round(ORB_SIZE * pixelRatio);

    const context = canvas.getContext("2d");
    if (!context) return;

    const preset = resolvePreset(state, ORB_SIZE);
    const draw = MODE_DRAWS[preset.mode];
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const action = canvas.closest<HTMLElement>(".project-action");
    let reducedMotion = reducedMotionQuery.matches;
    let speedMultiplier = 1;
    let isIntersecting = true;
    let phase = (performance.now() / 1000) * preset.speed;

    const paint = (time: number) => {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, ORB_SIZE, ORB_SIZE);
      draw(context, ORB_SIZE, time, theme === "dark", preset.opts);
    };
    const frameTask = registerSceneFrameTask(
      (frame) => {
        phase +=
          (frame.deltaMs / 1000) * preset.speed * speedMultiplier;
        paint(phase);
      },
      { priority: SCENE_FRAME_PRIORITY.actionOrb },
    );
    const syncPlayback = () => {
      if (reducedMotion) {
        frameTask.setContinuous(false);
        paint(0.6);
      } else {
        frameTask.setContinuous(isIntersecting);
        if (isIntersecting) frameTask.request();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      syncPlayback();
    });
    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      syncPlayback();
    };
    const handlePointerEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      speedMultiplier = 2;
      canvas.dataset.orbSpeed = "2";
    };
    const handlePointerLeave = () => {
      speedMultiplier = 1;
      canvas.dataset.orbSpeed = "1";
    };

    paint(reducedMotion ? 0.6 : phase);
    observer.observe(canvas);
    action?.addEventListener("pointerenter", handlePointerEnter);
    action?.addEventListener("pointerleave", handlePointerLeave);
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
    syncPlayback();

    return () => {
      frameTask.dispose();
      observer.disconnect();
      action?.removeEventListener("pointerenter", handlePointerEnter);
      action?.removeEventListener("pointerleave", handlePointerLeave);
      reducedMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange,
      );
    };
  }, [state, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="project-action__orb"
      data-orb-speed="1"
      aria-hidden
    />
  );
}

export function ProjectActionLink({
  href,
  label,
  variant,
  state,
  theme,
}: {
  href: string;
  label: string;
  variant: "primary" | "secondary";
  state: "composing" | "working";
  theme: "light" | "dark";
}) {
  return (
    <a
      className={`project-action project-action--${variant}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
    >
      <ProjectActionOrb state={state} theme={theme} />
      <span className="project-action__label" data-text={label} aria-hidden>
        {label}
      </span>
    </a>
  );
}
