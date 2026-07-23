"use client";

import dynamic from "next/dynamic";
import type { MotionValue } from "motion";
import {
  MotionConfig,
  motion,
  useSpring,
  useTransform,
} from "motion/react";
import { type ComponentType, useMemo, useRef } from "react";

import {
  INTRO_CHROME_DELAY,
  INTRO_LOAD_EASE,
  INTRO_SCENE_DELAY,
  IntroSection,
} from "@/components/intro-section";
import { ParticleContentSection } from "@/components/content-stage-section";
import {
  getSectionTimelineAttributes,
  SectionSnapAnchor,
} from "@/components/portfolio-section-frame";
import { OutroSection } from "@/components/outro-section";
import { ProjectCardSection } from "@/components/project-card-section";
import { SkillsSection } from "@/components/skills-section";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  customSectionRenderers,
  type CustomSectionRendererProps,
} from "@/config/custom-sections";
import {
  useMeasuredSceneTimeline,
  usePortfolioScrollProgress,
} from "@/hooks/use-portfolio-timeline";
import {
  contentSectionsById,
  projectsBySlug,
} from "@/config/portfolio";
import {
  portfolioSections,
  type BuiltInSectionRendererId,
  type SectionDefinition,
} from "@/config/sections";
import {
  getTimelineProgressPoint,
} from "@/lib/scene-timeline";
import type { SceneTimeline } from "@/lib/scene-types";

const SceneCanvas = dynamic(
  () => import("@/components/scene-canvas").then((module) => module.SceneCanvas),
  {
    ssr: false,
    loading: () => <div className="scene-placeholder" aria-hidden />,
  },
);

export function PortfolioExperience() {
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollYProgress = usePortfolioScrollProgress(shellRef);
  const timeline = useMeasuredSceneTimeline(shellRef);
  const sceneProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.24,
  });
  const introBackdropStops = useMemo(
    () =>
      [
        getTimelineProgressPoint(timeline, "intro", 0),
        getTimelineProgressPoint(timeline, "about-stage", 0.3),
        getTimelineProgressPoint(timeline, "about-stage", 0.58),
        getTimelineProgressPoint(timeline, "about-stage", 0.92),
      ] as [number, number, number, number],
    [timeline],
  );
  const meterScale = useTransform(sceneProgress, [0, 1], [0.08, 1]);
  const introBackdropOpacity = useTransform(sceneProgress, introBackdropStops, [
    1, 1, 0.18, 0,
  ]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="portfolio-shell" ref={shellRef}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>

        <motion.div
          className="intro-backdrop"
          aria-hidden
          style={{ opacity: introBackdropOpacity }}
        />

        <motion.div
          className="scene-frame"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: INTRO_SCENE_DELAY,
            duration: 1.08,
            ease: INTRO_LOAD_EASE,
          }}
        >
          <SceneCanvas progress={sceneProgress} timeline={timeline} />
        </motion.div>

        <motion.div
          className="site-chrome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: INTRO_CHROME_DELAY,
            duration: 0.72,
            ease: INTRO_LOAD_EASE,
          }}
        >
          <div className="scroll-meter-shell" aria-hidden>
            <motion.span className="scroll-meter" style={{ scaleX: meterScale }} />
          </div>
        </motion.div>

        <ThemeToggle />

        <main className="page-stage" id="main-content">
          {portfolioSections.map((section) => (
            <PortfolioSectionRenderer
              key={section.id}
              section={section}
              progress={sceneProgress}
              timeline={timeline}
            />
          ))}
        </main>
      </div>
    </MotionConfig>
  );
}

type SectionRendererComponent = ComponentType<CustomSectionRendererProps>;

function ContentSectionRenderer({
  section,
  progress,
  timeline,
}: CustomSectionRendererProps) {
  if (section.render.type !== "content") {
    return null;
  }

  return (
    <ParticleContentSection
      section={section}
      content={contentSectionsById[section.render.contentId]}
      progress={progress}
      timeline={timeline}
    />
  );
}

function ProjectSectionRenderer({
  section,
  progress,
  timeline,
}: CustomSectionRendererProps) {
  if (section.render.type !== "project-card") {
    return null;
  }

  const project = projectsBySlug[section.render.projectSlug];

  return (
    <ProjectCardSection
      project={project}
      section={section}
      progress={progress}
      timeline={timeline}
    />
  );
}

const builtInSectionRenderers = {
  intro: IntroSection,
  content: ContentSectionRenderer,
  "particle-text": SceneStageSection,
  "project-card": ProjectSectionRenderer,
  skills: SkillsSection,
  outro: OutroSection,
} satisfies Record<BuiltInSectionRendererId, SectionRendererComponent>;

function PortfolioSectionRenderer({
  section,
  progress,
  timeline,
}: {
  section: SectionDefinition;
  progress: MotionValue<number>;
  timeline: SceneTimeline;
}) {
  const renderer =
    section.render.type === "custom"
      ? (customSectionRenderers as Record<string, SectionRendererComponent>)[
          section.render.rendererId
        ]
      : builtInSectionRenderers[section.render.type];

  if (!renderer) {
    return null;
  }

  const Renderer = renderer;
  return <Renderer section={section} progress={progress} timeline={timeline} />;
}

function SceneStageSection({
  section,
  timeline,
}: {
  section: SectionDefinition;
  timeline: SceneTimeline;
}) {
  const headingId = `${section.id}-heading`;

  return (
    <section
      id={section.id}
      className={`scroll-section scroll-section--${section.layout}`}
      aria-labelledby={headingId}
      {...getSectionTimelineAttributes(section, timeline)}
    >
      <SectionSnapAnchor section={section} />
      <h2 className="sr-only" id={headingId}>
        {section.ariaLabel ?? section.id}
      </h2>
      <div className="section-sticky section-sticky--center">
        <div className="transform-stage" />
      </div>
    </section>
  );
}
