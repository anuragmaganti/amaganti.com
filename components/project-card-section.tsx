"use client";

import Image from "next/image";
import type { MotionValue } from "motion";
import {
  motion,
  useMotionTemplate,
  useSpring,
  useTransform,
} from "motion/react";
import { type CSSProperties, useRef } from "react";

import {
  getSectionTimelineAttributes,
  SectionSnapAnchor,
} from "@/components/portfolio-section-frame";
import type { ProjectEntry } from "@/config/projects";
import type { SectionDefinition } from "@/config/sections";
import {
  createProjectImageSizingVariables,
  FloatingProjectCard,
  ProjectActionLink,
  useFloatingProjectStage,
} from "@/features/floating-projects";
import type { SceneTimeline } from "@/lib/scene-types";

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
  useFloatingProjectStage({
    stageId: project.slug,
    layoutPreset: project.floatingLayout,
    arenaRef,
  });

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
            <FloatingProjectCard
              role="media"
              projectTitle={project.title}
              className="project-float-card--media"
              style={{ borderColor, boxShadow: cardShadow }}
            >
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
            </FloatingProjectCard>

            <FloatingProjectCard
              role="copy"
              projectTitle={project.title}
              className="project-float-card--copy"
              style={{ opacity: copyOpacity, borderColor, boxShadow: cardShadow }}
            >
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
            </FloatingProjectCard>

            <FloatingProjectCard
              role="actions"
              projectTitle={project.title}
              className="project-float-card--actions"
              style={{ opacity: copyOpacity, borderColor, boxShadow: cardShadow }}
            >
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
            </FloatingProjectCard>
          </div>
        </article>
      </div>
    </section>
  );
}
