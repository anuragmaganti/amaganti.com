"use client";

import dynamic from "next/dynamic";
import type { MotionValue } from "motion";
import Image from "next/image";
import {
  motion,
  useMotionTemplate,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import { projects, type ProjectEntry } from "@/lib/content";

const SceneCanvas = dynamic(
  () => import("@/components/scene-canvas").then((module) => module.SceneCanvas),
  {
    ssr: false,
    loading: () => <div className="scene-placeholder" aria-hidden />,
  },
);

export function PortfolioExperience() {
  const shellRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: shellRef,
    offset: ["start start", "end end"],
  });
  const sceneProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.24,
  });
  const meterScale = useTransform(sceneProgress, [0, 1], [0.08, 1]);
  const introBackdropOpacity = useTransform(
    sceneProgress,
    [0, 0.16, 0.28, 0.34],
    [1, 1, 0.18, 0],
  );

  return (
    <div className="portfolio-shell" ref={shellRef}>
      <motion.div
        className="intro-backdrop"
        aria-hidden
        style={{ opacity: introBackdropOpacity }}
      />

      <div className="scene-frame" aria-hidden>
        <SceneCanvas progress={sceneProgress} />
      </div>

      <div className="site-chrome">
        <div className="scroll-meter-shell" aria-hidden>
          <motion.span className="scroll-meter" style={{ scaleX: meterScale }} />
        </div>
      </div>

      <main className="page-stage" id="top">
        <IntroSection progress={sceneProgress} />
        <SceneStageSection className="scroll-section--transform" />
        {projects.map((project) => (
          <ProjectCardSection key={project.slug} project={project} />
        ))}
        <EndSection />
      </main>
    </div>
  );
}

function SceneStageSection({ className = "" }: { className?: string }) {
  return (
    <section className={`scroll-section ${className}`.trim()} aria-hidden="true">
      <div className="section-sticky section-sticky--center">
        <div className="transform-stage" />
      </div>
    </section>
  );
}

function IntroSection({ progress }: { progress: MotionValue<number> }) {
  const [isIntroNoteVisible, setIsIntroNoteVisible] = useState(false);
  const introCopyStyle = {
    opacity: useTransform(progress, [0, 0.02, 0.1], [1, 0.78, 0]),
    x: useTransform(progress, [0, 0.1], [0, -420]),
  };
  const introNoteOpacity = useTransform(progress, [0, 0.02, 0.1], [1, 0.8, 0]);
  const introNoteStyle = {
    opacity: isIntroNoteVisible ? introNoteOpacity : 0,
    x: useTransform(progress, [0, 0.1], [0, 320]),
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsIntroNoteVisible(true);
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section className="scroll-section scroll-section--intro" aria-label="Point cloud introduction">
      <div className="section-sticky section-sticky--intro">
        <div className="intro-stage">
          <motion.div className="intro-copy-shell" style={introCopyStyle}>
            <div className="intro-copy">
              <p className="intro-title">
                <span>Hi, I'm</span>
                <span>Anurag</span>
              </p>
              <p className="intro-subtitle">
                a software engineer obsessed with building products that feel a little bit
                magical
              </p>
            </div>
          </motion.div>

          <motion.div className="intro-note" style={introNoteStyle}>
            <p className="intro-note__text">(yep, that&apos;s a real LIDAR scan of my head)</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ProjectCardSection({
  project,
}: {
  project: ProjectEntry;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const focus = useSpring(
    useTransform(scrollYProgress, [0.04, 0.28, 0.72, 0.96], [0, 1, 1, 0]),
    {
      stiffness: 180,
      damping: 26,
      mass: 0.2,
    },
  );
  const scale = useTransform(focus, [0, 1], [0.986, 1]);
  const y = useTransform(focus, [0, 1], [26, 0]);
  const opacity = useTransform(focus, [0, 1], [0.84, 1]);
  const mediaScale = useTransform(focus, [0, 1], [1.01, 1.05]);
  const borderAlpha = useTransform(focus, [0, 1], [0.12, 0.28]);
  const glowAlpha = useTransform(focus, [0, 1], [0.02, 0.08]);
  const overlayAlpha = useTransform(focus, [0, 1], [0.22, 0.4]);
  const borderColor = useMotionTemplate`rgba(255, 255, 255, ${borderAlpha})`;
  const cardShadow = useMotionTemplate`0 30px 90px rgba(0, 0, 0, 0.52), 0 0 48px rgba(255, 255, 255, ${glowAlpha})`;
  const imageOverlay = useMotionTemplate`linear-gradient(180deg, rgba(4, 4, 4, 0.02) 0%, rgba(4, 4, 4, ${overlayAlpha}) 100%)`;
  const titleId = `${project.slug}-title`;
  const copyStyle = {
    paddingLeft: "clamp(0.28rem, 0.55vw, 0.45rem)",
    paddingRight: "clamp(0.9rem, 1.3vw, 1.1rem)",
  };
  const titleStyle = {
    maxWidth: "100%",
    fontSize: "clamp(1.78rem, 2.65vw, 2.9rem)",
    lineHeight: 0.96,
  };

  return (
    <section
      ref={sectionRef}
      className="scroll-section scroll-section--project"
      aria-labelledby={titleId}
    >
      <div className="section-sticky section-sticky--project">
        <motion.article
          className="panel project-card"
          style={{ scale, y, opacity, borderColor, boxShadow: cardShadow }}
        >
          <div className="project-card__media">
            <motion.div className="project-card__media-inner" style={{ scale: mediaScale }}>
              <Image
                src={project.imageSrc}
                alt={project.imageAlt}
                width={project.imageWidth}
                height={project.imageHeight}
                className="project-card__image"
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            </motion.div>
            <motion.span
              className="project-card__image-overlay"
              aria-hidden
              style={{ backgroundImage: imageOverlay }}
            />
          </div>

          <div className="project-card__copy" style={copyStyle}>
            <div className="project-headline">
              <h2 id={titleId} style={titleStyle}>
                {project.title}
              </h2>
              <p className="project-card__summary">{project.summary}</p>
            </div>

            <div className="project-body">
              {project.description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <ul className="project-highlights" role="list">
              {project.highlights.map((highlight) => (
                <li key={highlight} className="project-highlight">
                  {highlight}
                </li>
              ))}
            </ul>

            <ul className="project-tags" role="list">
              {project.tags.map((tag) => (
                <li key={tag} className="tag">
                  {tag}
                </li>
              ))}
            </ul>

            <div className="project-card__actions">
              <a
                className="cta-link"
                href={project.href}
                target="_blank"
                rel="noreferrer"
              >
                {project.linkLabel}
              </a>
            </div>
          </div>
        </motion.article>
      </div>
    </section>
  );
}

function EndSection() {
  return (
    <section className="scroll-section scroll-section--outro" aria-hidden="true">
      <div className="section-sticky section-sticky--center">
        <div className="transform-stage" />
      </div>
    </section>
  );
}
