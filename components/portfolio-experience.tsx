"use client";

import dynamic from "next/dynamic";
import type { MotionValue } from "motion";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { type Ref, useEffect, useRef, useState } from "react";

import { projectsBySlug, type ProjectEntry } from "@/lib/content";
import {
  PORTFOLIO_SECTIONS,
  getSectionProgressPoint,
  type SectionDefinition,
  type SectionDomVariant,
} from "@/lib/scene-config";

const SceneCanvas = dynamic(
  () => import("@/components/scene-canvas").then((module) => module.SceneCanvas),
  {
    ssr: false,
    loading: () => <div className="scene-placeholder" aria-hidden />,
  },
);

const INTRO_LOAD_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const INTRO_TEXT_REVEAL_DURATION = 1.72;
const INTRO_TEXT_FADE_DURATION = 0.92;
const INTRO_TEXT_MOVE_DELAY = 1.28;
const INTRO_SCENE_DELAY = 2.08;
const INTRO_CHROME_DELAY = 2.22;
const INTRO_COPY_SCROLL_STOPS = [
  getSectionProgressPoint("intro", 0),
  getSectionProgressPoint("intro", 2 / 15),
  getSectionProgressPoint("intro", 2 / 3),
];
const INTRO_BACKDROP_SCROLL_STOPS = [
  getSectionProgressPoint("intro", 0),
  getSectionProgressPoint("projects-stage", 5 / 118),
  getSectionProgressPoint("projects-stage", 65 / 118),
  getSectionProgressPoint("projects-stage", 95 / 118),
];

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
  const introBackdropOpacity = useTransform(sceneProgress, INTRO_BACKDROP_SCROLL_STOPS, [
    1, 1, 0.18, 0,
  ]);

  return (
    <div className="portfolio-shell" ref={shellRef}>
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
        transition={{ delay: INTRO_SCENE_DELAY, duration: 1.08, ease: INTRO_LOAD_EASE }}
      >
        <SceneCanvas progress={sceneProgress} />
      </motion.div>

      <motion.div
        className="site-chrome"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: INTRO_CHROME_DELAY, duration: 0.72, ease: INTRO_LOAD_EASE }}
      >
        <div className="scroll-meter-shell" aria-hidden>
          <motion.span className="scroll-meter" style={{ scaleX: meterScale }} />
        </div>
      </motion.div>

      <main className="page-stage" id="top">
        {PORTFOLIO_SECTIONS.map((section) => (
          <PortfolioSectionRenderer
            key={section.id}
            section={section}
            progress={sceneProgress}
          />
        ))}
      </main>
    </div>
  );
}

function PortfolioSectionRenderer({
  section,
  progress,
}: {
  section: SectionDefinition;
  progress: MotionValue<number>;
}) {
  switch (section.kind) {
    case "intro":
      return <IntroSection progress={progress} section={section} />;
    case "particle-text":
    case "spacer":
    case "outro":
      return <SceneStageSection section={section} />;
    case "card": {
      const project = section.projectSlug ? projectsBySlug[section.projectSlug] : null;

      return project ? <ProjectCardSection project={project} /> : null;
    }
    default:
      return null;
  }
}

function SceneStageSection({ section }: { section: SectionDefinition }) {
  return (
    <section
      className={`scroll-section ${getScrollSectionClassName(section.domVariant)}`.trim()}
      aria-hidden="true"
    >
      <div className="section-sticky section-sticky--center">
        <div className="transform-stage" />
      </div>
    </section>
  );
}

function IntroSection({
  progress,
  section,
}: {
  progress: MotionValue<number>;
  section: SectionDefinition;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const measureTitleRef = useRef<HTMLParagraphElement>(null);
  const measureSubtitleRef = useRef<HTMLParagraphElement>(null);
  const measureNoteRef = useRef<HTMLDivElement>(null);
  const [isIntroLeadCentered, setIsIntroLeadCentered] = useState(true);
  const [introLoadState, setIntroLoadState] = useState({
    ready: false,
    x: 0,
    y: 0,
    titleX: 0,
    subtitleX: 0,
    noteX: 0,
  });
  const introCopyStyle = {
    opacity: useTransform(progress, INTRO_COPY_SCROLL_STOPS, [1, 0.78, 0]),
    x: useTransform(
      progress,
      [INTRO_COPY_SCROLL_STOPS[0], INTRO_COPY_SCROLL_STOPS[2]],
      [0, -420],
    ),
  };
  const getCenteredOffset = (copyRect: DOMRect, childRect: DOMRect) => {
    const finalLeft = childRect.left - copyRect.left;
    const centeredLeft = (copyRect.width - childRect.width) * 0.5;

    return centeredLeft - finalLeft;
  };
  const renderIntroCopy = (refs?: {
    titleRef?: Ref<HTMLParagraphElement>;
    subtitleRef?: Ref<HTMLParagraphElement>;
    noteRef?: Ref<HTMLDivElement>;
  }) => (
    <div className="intro-copy">
      <p ref={refs?.titleRef} className="intro-title intro-copy-block">
        <span>Hi, I'm</span>
        <span>Anurag</span>
      </p>
      <p ref={refs?.subtitleRef} className="intro-subtitle intro-copy-block">
        a software engineer obsessed with building products that feel a little bit magical
      </p>
      <div ref={refs?.noteRef} className="intro-note intro-copy-block">
        <p className="intro-note__text">(yep, that&apos;s a real LIDAR scan of my head)</p>
      </div>
    </div>
  );

  useEffect(() => {
    let frameA = 0;
    let frameB = 0;

    const measureIntroCopy = () => {
      const stageRect = stageRef.current?.getBoundingClientRect();
      const copyRect = measureRef.current?.getBoundingClientRect();
      const titleRect = measureTitleRef.current?.getBoundingClientRect();
      const subtitleRect = measureSubtitleRef.current?.getBoundingClientRect();
      const noteRect = measureNoteRef.current?.getBoundingClientRect();

      if (!stageRect || !copyRect || !titleRect || !subtitleRect || !noteRect) {
        return;
      }

      const finalLeft = copyRect.left - stageRect.left;
      const finalTop = copyRect.top - stageRect.top;
      const centeredLeft = (stageRect.width - copyRect.width) * 0.5;
      const centeredTop = (stageRect.height - copyRect.height) * 0.5;

      setIntroLoadState({
        ready: true,
        x: centeredLeft - finalLeft,
        y: centeredTop - finalTop,
        titleX: getCenteredOffset(copyRect, titleRect),
        subtitleX: getCenteredOffset(copyRect, subtitleRect),
        noteX: getCenteredOffset(copyRect, noteRect),
      });
    };

    frameA = window.requestAnimationFrame(() => {
      frameB = window.requestAnimationFrame(measureIntroCopy);
    });

    return () => {
      window.cancelAnimationFrame(frameA);
      window.cancelAnimationFrame(frameB);
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsIntroLeadCentered(false);
    }, INTRO_TEXT_MOVE_DELAY * 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section
      className="scroll-section scroll-section--intro"
      aria-label={section.ariaLabel ?? "Point cloud introduction"}
    >
      <div className="section-sticky section-sticky--intro">
        <div className="intro-stage" ref={stageRef}>
          {!introLoadState.ready ? (
            <div
              ref={measureRef}
              className="intro-copy-shell intro-copy-shell--measure"
              aria-hidden="true"
            >
              {renderIntroCopy({
                titleRef: measureTitleRef,
                subtitleRef: measureSubtitleRef,
                noteRef: measureNoteRef,
              })}
            </div>
          ) : null}

          {introLoadState.ready ? (
            <motion.div
              className="intro-copy-shell"
              initial={{
                opacity: 0,
                x: introLoadState.x,
                y: introLoadState.y,
              }}
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
              }}
              transition={{
                opacity: {
                  duration: INTRO_TEXT_FADE_DURATION,
                  ease: INTRO_LOAD_EASE,
                },
                x: {
                  duration: INTRO_TEXT_REVEAL_DURATION,
                  delay: INTRO_TEXT_MOVE_DELAY,
                  ease: INTRO_LOAD_EASE,
                },
                y: {
                  duration: INTRO_TEXT_REVEAL_DURATION,
                  delay: INTRO_TEXT_MOVE_DELAY,
                  ease: INTRO_LOAD_EASE,
                },
              }}
            >
              <motion.div style={introCopyStyle}>
                <div className="intro-copy">
                  <motion.p
                    className={[
                      "intro-title",
                      "intro-copy-block",
                      isIntroLeadCentered ? "intro-title--centered" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    initial={{ x: introLoadState.titleX }}
                    animate={{ x: 0 }}
                    transition={{
                      duration: INTRO_TEXT_REVEAL_DURATION,
                      delay: INTRO_TEXT_MOVE_DELAY,
                      ease: INTRO_LOAD_EASE,
                    }}
                  >
                    <span>Hi, I'm</span>
                    <span>Anurag</span>
                  </motion.p>

                  <motion.p
                    className={[
                      "intro-subtitle",
                      "intro-copy-block",
                      isIntroLeadCentered ? "intro-subtitle--centered" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    initial={{ x: introLoadState.subtitleX }}
                    animate={{ x: 0 }}
                    transition={{
                      duration: INTRO_TEXT_REVEAL_DURATION,
                      delay: INTRO_TEXT_MOVE_DELAY,
                      ease: INTRO_LOAD_EASE,
                    }}
                  >
                    a software engineer obsessed with building products that feel a little bit magical
                  </motion.p>

                  <motion.div
                    className="intro-note intro-copy-block"
                    initial={{ x: introLoadState.noteX }}
                    animate={{ x: 0 }}
                    transition={{
                      duration: INTRO_TEXT_REVEAL_DURATION,
                      delay: INTRO_TEXT_MOVE_DELAY,
                      ease: INTRO_LOAD_EASE,
                    }}
                  >
                    <p className="intro-note__text">
                      (yep, that&apos;s a real LIDAR scan of my head)
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
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
  const [showStack, setShowStack] = useState(false);
  const [compactStack, setCompactStack] = useState(false);
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
  const borderAlpha = useTransform(focus, [0, 1], [0.06, 0.15]);
  const glowAlpha = useTransform(focus, [0, 1], [0.012, 0.04]);
  const overlayAlpha = useTransform(focus, [0, 1], [0.22, 0.4]);
  const borderColor = useMotionTemplate`rgba(255, 255, 255, ${borderAlpha})`;
  const cardShadow = useMotionTemplate`0 30px 90px rgba(0, 0, 0, 0.52), 0 0 48px rgba(255, 255, 255, ${glowAlpha})`;
  const imageOverlay = useMotionTemplate`linear-gradient(180deg, rgba(4, 4, 4, 0.02) 0%, rgba(4, 4, 4, ${overlayAlpha}) 100%)`;
  const titleId = `${project.slug}-title`;
  const stackId = `${project.slug}-stack`;
  const copyStyle = {
    paddingLeft: "clamp(0.55rem, 0.9vw, 0.8rem)",
    paddingRight: "clamp(0.9rem, 1.3vw, 1.1rem)",
  };
  const titleStyle = {
    maxWidth: "100%",
    fontSize: "clamp(1.78rem, 2.65vw, 2.9rem)",
    lineHeight: 0.96,
  };
  const stackEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const syncCompactStack = () => {
      setCompactStack(media.matches);

      if (!media.matches) {
        setShowStack(false);
      }
    };

    syncCompactStack();
    media.addEventListener("change", syncCompactStack);

    return () => {
      media.removeEventListener("change", syncCompactStack);
    };
  }, []);

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

            {compactStack ? (
              <>
                <button
                  type="button"
                  className="cta-link project-stack-toggle"
                  aria-controls={stackId}
                  aria-expanded={showStack}
                  onClick={() => {
                    setShowStack((current) => !current);
                  }}
                >
                  {showStack ? "Hide Stack" : "Show Stack"}
                </button>

                <AnimatePresence initial={false}>
                  {showStack ? (
                    <motion.ul
                      id={stackId}
                      className="project-tags project-tags--collapsible"
                      role="list"
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={{
                        hidden: {
                          height: 0,
                          opacity: 0,
                          y: -6,
                        },
                        visible: {
                          height: "auto",
                          opacity: 1,
                          y: 0,
                          transition: {
                            height: { duration: 0.38, ease: stackEase },
                            opacity: { duration: 0.22, ease: stackEase },
                            y: { duration: 0.3, ease: stackEase },
                            staggerChildren: 0.028,
                            delayChildren: 0.04,
                          },
                        },
                        exit: {
                          height: 0,
                          opacity: 0,
                          y: -4,
                          transition: {
                            height: { duration: 0.26, ease: stackEase },
                            opacity: { duration: 0.16, ease: stackEase },
                            y: { duration: 0.2, ease: stackEase },
                            staggerChildren: 0.018,
                            staggerDirection: -1,
                          },
                        },
                      }}
                    >
                      {project.tags.map((tag) => (
                        <motion.li
                          key={tag}
                          className="tag"
                          variants={{
                            hidden: { opacity: 0, y: -4 },
                            visible: {
                              opacity: 1,
                              y: 0,
                              transition: { duration: 0.22, ease: stackEase },
                            },
                            exit: {
                              opacity: 0,
                              y: -3,
                              transition: { duration: 0.14, ease: stackEase },
                            },
                          }}
                        >
                          {tag}
                        </motion.li>
                      ))}
                    </motion.ul>
                  ) : null}
                </AnimatePresence>
              </>
            ) : (
              <ul id={stackId} className="project-tags" role="list">
                {project.tags.map((tag) => (
                  <li key={tag} className="tag">
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            <div className="project-card__actions">
              <a
                className="cta-link"
                href={project.href}
                target="_blank"
                rel="noreferrer"
              >
                {project.linkLabel}
              </a>
              <a
                className="cta-link"
                href={project.githubHref}
                target="_blank"
                rel="noreferrer"
              >
                View GitHub
              </a>
            </div>
          </div>
        </motion.article>
      </div>
    </section>
  );
}

function getScrollSectionClassName(domVariant: SectionDomVariant) {
  switch (domVariant) {
    case "intro":
      return "scroll-section--intro";
    case "transform":
      return "scroll-section--transform";
    case "project":
      return "scroll-section--project";
    case "outro":
      return "scroll-section--outro";
    default:
      return "";
  }
}
