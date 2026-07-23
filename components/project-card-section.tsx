"use client";

import Image from "next/image";
import type { MotionValue } from "motion";
import {
  MODE_DRAWS,
  resolvePreset,
  type OrbState,
} from "thinking-orbs";
import {
  motion,
  useMotionTemplate,
  useSpring,
  useTransform,
} from "motion/react";
import { type CSSProperties, useEffect, useRef } from "react";

import {
  getSectionTimelineAttributes,
  SectionSnapAnchor,
} from "@/components/portfolio-section-frame";
import type { ProjectEntry } from "@/config/portfolio";
import type { SectionDefinition } from "@/config/sections";
import { useFloatingProjectPhysics } from "@/hooks/use-floating-project-physics";
import { useParticleObstacle } from "@/hooks/use-particle-obstacle";
import type { FloatingProjectCardRole } from "@/lib/floating-project-layout";
import { createProjectImageSizingVariables } from "@/lib/project-card-presentation";
import type { SceneTimeline } from "@/lib/scene-types";
const PROJECT_ACTION_ORB_SIZE = 64;

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
    canvas.width = Math.round(PROJECT_ACTION_ORB_SIZE * pixelRatio);
    canvas.height = Math.round(PROJECT_ACTION_ORB_SIZE * pixelRatio);

    const context = canvas.getContext("2d");
    if (!context) return;

    const preset = resolvePreset(state, PROJECT_ACTION_ORB_SIZE);
    const draw = MODE_DRAWS[preset.mode];
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const action = canvas.closest<HTMLElement>(".project-action");
    let reducedMotion = reducedMotionQuery.matches;
    let speedMultiplier = 1;
    let isIntersecting = true;
    let isDocumentVisible = document.visibilityState !== "hidden";
    let frameId = 0;
    let running = false;
    let lastTimestamp = performance.now();
    let phase = (lastTimestamp / 1000) * preset.speed;

    const paint = (time: number) => {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(
        0,
        0,
        PROJECT_ACTION_ORB_SIZE,
        PROJECT_ACTION_ORB_SIZE,
      );
      draw(
        context,
        PROJECT_ACTION_ORB_SIZE,
        time,
        theme === "dark",
        preset.opts,
      );
    };

    const advancePhase = (timestamp: number) => {
      phase +=
        ((timestamp - lastTimestamp) / 1000) *
        preset.speed *
        speedMultiplier;
      lastTimestamp = timestamp;
    };

    const frame = (timestamp: number) => {
      advancePhase(timestamp);
      paint(phase);
      if (running) frameId = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
    };

    const start = () => {
      if (running || reducedMotion || !isIntersecting || !isDocumentVisible) {
        return;
      }

      advancePhase(performance.now());
      running = true;
      frameId = requestAnimationFrame(frame);
    };

    const syncPlayback = () => {
      if (reducedMotion) {
        stop();
        paint(0.6);
        return;
      }

      if (isIntersecting && isDocumentVisible) start();
      else stop();
    };

    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      syncPlayback();
    });
    const handleVisibilityChange = () => {
      isDocumentVisible = document.visibilityState !== "hidden";
      syncPlayback();
    };
    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      lastTimestamp = performance.now();
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
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
    syncPlayback();

    return () => {
      stop();
      observer.disconnect();
      action?.removeEventListener("pointerenter", handlePointerEnter);
      action?.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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

function ProjectActionLink({
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

function ProjectCardDragHandle({
  role,
  projectTitle,
}: {
  role: FloatingProjectCardRole;
  projectTitle: string;
}) {
  return (
    <button
      type="button"
      className="project-float-card__handle"
      data-floating-card-handle={role}
      aria-label={`Move ${projectTitle} ${role} card`}
      title="Drag to move. Use arrow keys for precise movement."
    >
      <span aria-hidden />
    </button>
  );
}

export function ProjectCardSection({
  project,
  section,
  progress,
  timeline,
}: {
  project: ProjectEntry;
  section: SectionDefinition;
  progress: MotionValue<number>;
  timeline: SceneTimeline;
}) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const mediaCardRef = useRef<HTMLDivElement>(null);
  const copyCardRef = useRef<HTMLDivElement>(null);
  const actionsCardRef = useRef<HTMLDivElement>(null);
  const [sectionStart, sectionEnd] = timeline.sectionRanges[section.id];
  const sectionProgress = useTransform(
    progress,
    [sectionStart, sectionEnd],
    [0, 1],
    { clamp: true },
  );
  const focus = useSpring(
    useTransform(sectionProgress, [0.04, 0.24, 0.78, 0.98], [0, 1, 1, 0]),
    {
      stiffness: 180,
      damping: 26,
      mass: 0.2,
    },
  );
  const copyOpacity = useTransform(focus, [0, 1], [0.84, 1]);
  const mediaScale = useTransform(focus, [0, 1], [1.01, 1.05]);
  const borderAlpha = useTransform(focus, [0, 1], [0.06, 0.15]);
  const glowAlpha = useTransform(focus, [0, 1], [0.012, 0.04]);
  const borderColor = useMotionTemplate`rgba(var(--project-card-border-rgb), ${borderAlpha})`;
  const cardShadow = useMotionTemplate`0 30px 90px rgba(var(--project-card-shadow-rgb), 0.52), 0 0 48px rgba(var(--project-card-glow-rgb), ${glowAlpha})`;
  const titleId = `${project.slug}-title`;
  const imageSizingStyle = createProjectImageSizingVariables(
    project.imageSrc.width,
    project.imageSrc.height,
  ) as CSSProperties;
  const physicsMeasurementDriver = useFloatingProjectPhysics({
    layoutKey: project.slug,
    arenaRef,
    mediaCardRef,
    copyCardRef,
    actionsCardRef,
  });

  useParticleObstacle(
    `${project.slug}:media`,
    mediaCardRef,
    physicsMeasurementDriver,
  );
  useParticleObstacle(
    `${project.slug}:copy`,
    copyCardRef,
    physicsMeasurementDriver,
  );
  useParticleObstacle(
    `${project.slug}:actions`,
    actionsCardRef,
    physicsMeasurementDriver,
  );

  return (
    <section
      id={section.id}
      className="scroll-section scroll-section--project"
      aria-labelledby={titleId}
      {...getSectionTimelineAttributes(section, timeline)}
    >
      <SectionSnapAnchor section={section} />
      <div className="section-sticky section-sticky--project">
        <article className="project-float-stage" aria-labelledby={titleId}>
          <div className="project-float-arena" ref={arenaRef}>
            <motion.div
              ref={mediaCardRef}
              className="panel project-float-card project-float-card--media"
              data-floating-card-role="media"
              style={{ borderColor, boxShadow: cardShadow }}
            >
              <ProjectCardDragHandle role="media" projectTitle={project.title} />
              <div className="project-card__media" style={imageSizingStyle}>
                <motion.div
                  className="project-card__media-inner"
                  style={{ scale: mediaScale }}
                >
                  <Image
                    src={project.imageSrc}
                    alt={project.imageAlt}
                    className="project-card__image"
                    loading="eager"
                    sizes="(max-width: 380px) 86vw, (max-width: 700px) 90vw, (max-width: 1024px) 29rem, (max-width: 1400px) 31rem, 36rem"
                  />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              ref={copyCardRef}
              className="panel project-float-card project-float-card--copy"
              data-floating-card-role="copy"
              style={{ opacity: copyOpacity, borderColor, boxShadow: cardShadow }}
            >
              <ProjectCardDragHandle role="copy" projectTitle={project.title} />
              <div className="project-card__scroll">
                <div className="project-headline">
                  <h2 id={titleId}>{project.title}</h2>
                  <p className="project-card__summary">{project.summary}</p>
                </div>

                <dl className="project-proofs">
                  {project.proofs.map((proof) => (
                    <div key={proof.label} className="project-proof">
                      <dt>{proof.label}</dt>
                      <dd>{proof.body}</dd>
                    </div>
                  ))}
                </dl>

                <ul
                  className="project-technologies"
                  aria-label={`${project.title} technologies`}
                >
                  {project.technologies.map((technology) => (
                    <li key={technology}>{technology}</li>
                  ))}
                </ul>
              </div>
            </motion.div>

            <motion.div
              ref={actionsCardRef}
              className="panel project-float-card project-float-card--actions"
              data-floating-card-role="actions"
              style={{ opacity: copyOpacity, borderColor, boxShadow: cardShadow }}
            >
              <ProjectCardDragHandle
                role="actions"
                projectTitle={project.title}
              />
              <div className="project-card__actions">
                {project.href && project.linkLabel ? (
                  <ProjectActionLink
                    href={project.href}
                    label={project.linkLabel}
                    variant="primary"
                    state="composing"
                    theme="light"
                  />
                ) : null}
                {project.githubHref ? (
                  <ProjectActionLink
                    href={project.githubHref}
                    label="View Source"
                    variant="secondary"
                    state="working"
                    theme="dark"
                  />
                ) : null}
              </div>
            </motion.div>
          </div>
        </article>
      </div>
    </section>
  );
}
