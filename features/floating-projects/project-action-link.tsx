"use client";

import { useEffect, useRef } from "react";
import type { OrbState } from "thinking-orbs";

import {
  registerSceneFrameTask,
  SCENE_FRAME_PRIORITY,
} from "@/lib/scene-frame-scheduler";
import { TOUCH_PRIMARY_QUERY } from "@/hooks/use-media-query";
import { attachWorkerOrb } from "./orb-worker-client";
import { observeViewportProximity } from "@/lib/viewport-proximity";

type OrbPlayer = {
  playback: (playing: boolean, still: boolean, speed: number) => void;
  dispose: () => void;
};

function ProjectActionOrb({
  state,
  theme,
}: {
  state: OrbState;
  theme: "light" | "dark";
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const host = hostRef.current!;
    let dispose = () => {};
    const stop = observeViewportProximity(host, (near) => {
      dispose();
      dispose = near ? mountOrb(host, state, theme === "dark") : () => {};
    });
    return () => {
      stop();
      dispose();
    };
  }, [state, theme]);

  return <span ref={hostRef} className="project-action__orb" aria-hidden />;
}

function mountOrb(host: HTMLElement, state: OrbState, dark: boolean) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const action = host.closest("a");
  let disposed = false;
  let visible = false;
  let speed = 1;
  let player: OrbPlayer | null = null;

  const createCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.round(64 * pixelRatio);
    host.replaceChildren(canvas);
    return canvas;
  };
  const sync = () =>
    player?.playback(
      visible && !document.hidden && !motion.matches,
      motion.matches,
      speed,
    );
  const fallback = async () => {
    player?.dispose();
    player = null;
    const { createOrbPainter } = await import("./orb-painter");
    if (disposed) return;
    const context = createCanvas().getContext("2d");
    if (!context) return;
    const paint = createOrbPainter(context, pixelRatio, state, dark);
    const task = registerSceneFrameTask(
      (frame) => paint(frame.deltaMs, speed, false),
      { priority: SCENE_FRAME_PRIORITY.actionOrb },
    );
    player = {
      playback(playing, still) {
        task.setContinuous(playing);
        if (still) paint(0, 1, true);
      },
      dispose: task.dispose,
    };
    paint(0, 1, motion.matches);
    sync();
  };
  if (window.matchMedia(TOUCH_PRIMARY_QUERY).matches && !motion.matches) {
    player = attachWorkerOrb(createCanvas(), pixelRatio, state, dark, fallback);
  }
  if (!player) void fallback();

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  const enter = (event: PointerEvent) => {
    if (event.pointerType !== "touch") {
      speed = 2;
      sync();
    }
  };
  const leave = () => {
    speed = 1;
    sync();
  };
  observer.observe(host);
  action?.addEventListener("pointerenter", enter);
  action?.addEventListener("pointerleave", leave);
  motion.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  return () => {
    disposed = true;
    observer.disconnect();
    motion.removeEventListener("change", sync);
    document.removeEventListener("visibilitychange", sync);
    action?.removeEventListener("pointerenter", enter);
    action?.removeEventListener("pointerleave", leave);
    player?.dispose();
    host.replaceChildren();
  };
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
