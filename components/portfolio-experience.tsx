"use client";

import dynamic from "next/dynamic";
import type { MotionValue } from "motion";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from "motion/react";
import { type ReactNode, type Ref, type RefObject, useEffect, useRef, useState } from "react";

import {
  contentSectionsById,
  projectsBySlug,
  type ContentSectionEntry,
  type ProjectEntry,
} from "@/lib/content";
import {
  ABOUT_PROGRESS_MARKERS,
  INTRO_COPY_PROGRESS_STOPS,
  PORTFOLIO_SECTIONS,
  type SectionDefinition,
  type SectionDomVariant,
} from "@/lib/scene-config";
import {
  removeProjectCardExclusion,
  type ProjectCardExclusionRect,
  upsertProjectCardExclusion,
} from "@/lib/project-card-exclusion-store";

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
const INTRO_COPY_SCROLL_STOPS: [number, number, number] = [...INTRO_COPY_PROGRESS_STOPS];
const INTRO_BACKDROP_SCROLL_STOPS: [number, number, number, number] = [
  ...ABOUT_PROGRESS_MARKERS.introBackdrop,
];
const ABOUT_MAGNET_TARGET_PROGRESS = ABOUT_PROGRESS_MARKERS.magnetTarget;
const ABOUT_BODY_EXIT_SCROLL_STOPS: [number, number] = [...ABOUT_PROGRESS_MARKERS.bodyExit];
const ABOUT_PARAGRAPH_ENTER_SPAN =
  ABOUT_MAGNET_TARGET_PROGRESS - INTRO_COPY_SCROLL_STOPS[0];
const ABOUT_PARAGRAPH_REVEALS = [
  {
    enterStart: INTRO_COPY_SCROLL_STOPS[0] + ABOUT_PARAGRAPH_ENTER_SPAN * 0.22,
    enterEnd: INTRO_COPY_SCROLL_STOPS[0] + ABOUT_PARAGRAPH_ENTER_SPAN * 0.5,
    fromX: -160,
    fromY: 0,
    exitX: 60,
  },
  {
    enterStart: INTRO_COPY_SCROLL_STOPS[0] + ABOUT_PARAGRAPH_ENTER_SPAN * 0.38,
    enterEnd: INTRO_COPY_SCROLL_STOPS[0] + ABOUT_PARAGRAPH_ENTER_SPAN * 0.66,
    fromX: 160,
    fromY: 0,
    exitX: -60,
  },
  {
    enterStart: INTRO_COPY_SCROLL_STOPS[0] + ABOUT_PARAGRAPH_ENTER_SPAN * 0.54,
    enterEnd: INTRO_COPY_SCROLL_STOPS[0] + ABOUT_PARAGRAPH_ENTER_SPAN * 0.82,
    fromX: -160,
    fromY: 0,
    exitX: 60,
  },
] as const;
const CONTENT_STAGE_MAGNET_RADIUS = 140;
const CONTENT_STAGE_RELEASE_RADIUS = 260;
const CONTENT_STAGE_STRONG_WHEEL_DELTA = 52;
const CONTENT_STAGE_STRONG_TOUCH_DELTA = 42;
const CONTENT_STAGE_SNAP_SUPPRESS_MS = 420;
const CONTENT_STAGE_SNAP_LOCK_MS = 520;
const CONTENT_STAGE_SNAP_VELOCITY = 0.72;
const INTRO_TITLE_LINES = ["Hi, I'm", "Anurag"] as const;
const INTRO_SUBTITLE_TEXT =
  "a software engineer obsessed with building products that feel a little bit magical";
const INTRO_NOTE_TEXT = "(yep, that's a real LIDAR scan of my head)";
const PROJECT_STACK_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const PROJECT_TAG_LIST_VARIANTS = {
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
      height: { duration: 0.38, ease: PROJECT_STACK_EASE },
      opacity: { duration: 0.22, ease: PROJECT_STACK_EASE },
      y: { duration: 0.3, ease: PROJECT_STACK_EASE },
      staggerChildren: 0.028,
      delayChildren: 0.04,
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    y: -4,
    transition: {
      height: { duration: 0.26, ease: PROJECT_STACK_EASE },
      opacity: { duration: 0.16, ease: PROJECT_STACK_EASE },
      y: { duration: 0.2, ease: PROJECT_STACK_EASE },
      staggerChildren: 0.018,
      staggerDirection: -1,
    },
  },
} as const;
const PROJECT_TAG_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: -4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: PROJECT_STACK_EASE },
  },
  exit: {
    opacity: 0,
    y: -3,
    transition: { duration: 0.14, ease: PROJECT_STACK_EASE },
  },
} as const;

type ContentStageOverlayLayout = ContentSectionEntry["layout"];

type ContentStageParagraphReveal = {
  enterStart: number;
  enterEnd: number;
  fromX: number;
  fromY: number;
  exitX: number;
};

type ContentStageOverlayConfig = {
  layout: ContentStageOverlayLayout;
  exitStops: readonly [number, number];
  paragraphs: readonly ContentStageParagraphReveal[];
};

const CONTENT_STAGE_OVERLAY_CONFIG: Record<
  ContentSectionEntry["id"],
  ContentStageOverlayConfig
> = {
  "about-me": {
    layout: "top-overlay",
    exitStops: ABOUT_BODY_EXIT_SCROLL_STOPS,
    paragraphs: ABOUT_PARAGRAPH_REVEALS,
  },
} as const;

type IntroCopyContentProps = {
  titleClassName: string;
  subtitleClassName: string;
  noteClassName: string;
  titleRef?: Ref<HTMLParagraphElement>;
  subtitleRef?: Ref<HTMLParagraphElement>;
  noteRef?: Ref<HTMLDivElement>;
  renderTitle?: (props: {
    className: string;
    ref?: Ref<HTMLParagraphElement>;
    children: ReactNode;
  }) => ReactNode;
  renderSubtitle?: (props: {
    className: string;
    ref?: Ref<HTMLParagraphElement>;
    children: ReactNode;
  }) => ReactNode;
  renderNote?: (props: {
    className: string;
    ref?: Ref<HTMLDivElement>;
    children: ReactNode;
  }) => ReactNode;
};

type ProjectTagListProps = {
  compact: boolean;
  showStack: boolean;
  stackId: string;
  tags: string[];
  onToggle: () => void;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getShellScrollProgress(rect: DOMRect, viewportHeight: number) {
  const scrollableHeight = Math.max(rect.height - viewportHeight, 1);

  return clamp01(-rect.top / scrollableHeight);
}

function getViewportCrossProgress(rect: DOMRect, viewportHeight: number) {
  const travel = Math.max(rect.height + viewportHeight, 1);

  return clamp01((viewportHeight - rect.top) / travel);
}

function useElementScrollProgress<T extends HTMLElement>(
  targetRef: RefObject<T | null>,
  measureProgress: (rect: DOMRect, viewportHeight: number) => number,
) {
  const progress = useMotionValue(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let frameId = 0;
    let observer: ResizeObserver | null = null;

    const update = () => {
      frameId = 0;

      const target = targetRef.current;

      if (!target) {
        return;
      }

      progress.set(measureProgress(target.getBoundingClientRect(), window.innerHeight || 1));
    };

    const scheduleUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(update);
    };

    scheduleUpdate();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    window.addEventListener("load", scheduleUpdate);

    if (targetRef.current) {
      observer = new ResizeObserver(scheduleUpdate);
      observer.observe(targetRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("load", scheduleUpdate);
      observer?.disconnect();
    };
  }, [measureProgress, progress, targetRef]);

  return progress;
}

function readProjectCardExclusionRect(element: HTMLElement): ProjectCardExclusionRect {
  const rect = element.getBoundingClientRect();

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function syncProjectCardExclusion(
  id: string,
  element: HTMLElement | null,
  strength: number,
) {
  if (!element) {
    return;
  }

  upsertProjectCardExclusion(id, readProjectCardExclusionRect(element), strength);
}

function useProjectCardExclusion(
  id: string,
  cardRef: RefObject<HTMLElement | null>,
  exclusionStrength: MotionValue<number>,
  scrollYProgress: MotionValue<number>,
) {
  useEffect(() => {
    let frameId = 0;
    let observer: ResizeObserver | null = null;

    const syncCurrentRect = () => {
      syncProjectCardExclusion(id, cardRef.current, exclusionStrength.get());
    };

    const scheduleSync = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(syncCurrentRect);
    };

    scheduleSync();
    window.addEventListener("resize", scheduleSync, { passive: true });

    if (cardRef.current) {
      observer = new ResizeObserver(scheduleSync);
      observer.observe(cardRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleSync);
      observer?.disconnect();
      removeProjectCardExclusion(id);
    };
  }, [cardRef, exclusionStrength, id]);

  useMotionValueEvent(scrollYProgress, "change", () => {
    syncProjectCardExclusion(id, cardRef.current, exclusionStrength.get());
  });

  useMotionValueEvent(exclusionStrength, "change", (latest) => {
    syncProjectCardExclusion(id, cardRef.current, latest);
  });
}

function IntroCopyContent({
  titleClassName,
  subtitleClassName,
  noteClassName,
  titleRef,
  subtitleRef,
  noteRef,
  renderTitle,
  renderSubtitle,
  renderNote,
}: IntroCopyContentProps) {
  const titleChildren = INTRO_TITLE_LINES.map((line) => <span key={line}>{line}</span>);
  const noteChildren = <p className="intro-note__text">{INTRO_NOTE_TEXT}</p>;

  return (
    <div className="intro-copy">
      {renderTitle ? (
        renderTitle({ className: titleClassName, ref: titleRef, children: titleChildren })
      ) : (
        <p ref={titleRef} className={titleClassName}>
          {titleChildren}
        </p>
      )}

      {renderSubtitle ? (
        renderSubtitle({
          className: subtitleClassName,
          ref: subtitleRef,
          children: INTRO_SUBTITLE_TEXT,
        })
      ) : (
        <p ref={subtitleRef} className={subtitleClassName}>
          {INTRO_SUBTITLE_TEXT}
        </p>
      )}

      {renderNote ? (
        renderNote({ className: noteClassName, ref: noteRef, children: noteChildren })
      ) : (
        <div ref={noteRef} className={noteClassName}>
          {noteChildren}
        </div>
      )}
    </div>
  );
}

function ProjectTagList({
  compact,
  showStack,
  stackId,
  tags,
  onToggle,
}: ProjectTagListProps) {
  if (!compact) {
    return (
      <ul id={stackId} className="project-tags" role="list">
        {tags.map((tag) => (
          <li key={tag} className="tag">
            {tag}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <button
        type="button"
        className="cta-link project-stack-toggle"
        aria-controls={stackId}
        aria-expanded={showStack}
        onClick={onToggle}
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
            variants={PROJECT_TAG_LIST_VARIANTS}
          >
            {tags.map((tag) => (
              <motion.li
                key={tag}
                className="tag"
                variants={PROJECT_TAG_ITEM_VARIANTS}
              >
                {tag}
              </motion.li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function PortfolioExperience() {
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollYProgress = useElementScrollProgress(shellRef, getShellScrollProgress);
  const sceneProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.24,
  });
  useMagneticSectionSnap(shellRef, ABOUT_MAGNET_TARGET_PROGRESS);
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

function useMagneticSectionSnap(
  shellRef: RefObject<HTMLDivElement | null>,
  targetProgress: number,
) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    let frameId = 0;
    let touchStartY = 0;
    let isTouching = false;
    const suppressUntil = { current: 0 };
    const lockUntil = { current: 0 };
    const scrollMetrics = {
      y: window.scrollY,
      time: performance.now(),
    };

    const getTargetScrollTop = () => {
      const shellRect = shell.getBoundingClientRect();
      const shellTop = window.scrollY + shellRect.top;
      const scrollableHeight = Math.max(shell.scrollHeight - window.innerHeight, 1);

      return shellTop + scrollableHeight * targetProgress;
    };

    const evaluateSnap = () => {
      frameId = 0;

      const now = performance.now();
      const currentY = window.scrollY;
      const targetY = getTargetScrollTop();
      const distance = targetY - currentY;
      const absoluteDistance = Math.abs(distance);
      const deltaTime = Math.max(now - scrollMetrics.time, 1);
      const velocity = Math.abs(currentY - scrollMetrics.y) / deltaTime;

      scrollMetrics.y = currentY;
      scrollMetrics.time = now;

      if (absoluteDistance < 2) {
        return;
      }

      if (now < suppressUntil.current || now < lockUntil.current) {
        return;
      }

      if (absoluteDistance > CONTENT_STAGE_RELEASE_RADIUS) {
        return;
      }

      if (
        absoluteDistance <= CONTENT_STAGE_MAGNET_RADIUS ||
        velocity <= CONTENT_STAGE_SNAP_VELOCITY
      ) {
        lockUntil.current = now + CONTENT_STAGE_SNAP_LOCK_MS;
        window.scrollTo({
          top: targetY,
          behavior: "smooth",
        });
      }
    };

    const scheduleEvaluate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(evaluateSnap);
    };

    const handleScroll = () => {
      scheduleEvaluate();
    };

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) >= CONTENT_STAGE_STRONG_WHEEL_DELTA) {
        suppressUntil.current = performance.now() + CONTENT_STAGE_SNAP_SUPPRESS_MS;
      }

      scheduleEvaluate();
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
      isTouching = true;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isTouching) {
        return;
      }

      const currentY = event.touches[0]?.clientY ?? touchStartY;

      if (Math.abs(currentY - touchStartY) >= CONTENT_STAGE_STRONG_TOUCH_DELTA) {
        suppressUntil.current = performance.now() + CONTENT_STAGE_SNAP_SUPPRESS_MS;
      }
    };

    const handleTouchEnd = () => {
      isTouching = false;
      scheduleEvaluate();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("resize", scheduleEvaluate, { passive: true });

    scheduleEvaluate();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("resize", scheduleEvaluate);
    };
  }, [shellRef, targetProgress]);
}

function ContentStageOverlay({
  contentId,
  layout,
  body,
  exitStops,
  paragraphReveals,
  progress,
}: {
  contentId: ContentSectionEntry["id"];
  layout: ContentStageOverlayLayout;
  body: string[];
  exitStops: readonly [number, number];
  paragraphReveals: readonly ContentStageParagraphReveal[];
  progress: MotionValue<number>;
}) {
  if (body.length === 0) {
    return null;
  }

  return (
    <div
      className={`content-stage-overlay content-stage-overlay--${layout}`}
      data-content-stage={contentId}
    >
      <div className="content-stage-overlay__shell">
        <div className="content-stage-overlay__copy">
          {body.map((paragraph, index) => (
            <ContentStageParagraph
              key={paragraph}
              paragraph={paragraph}
              progress={progress}
              exitStops={exitStops}
              reveal={paragraphReveals[Math.min(index, paragraphReveals.length - 1)]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentStageParagraph({
  paragraph,
  progress,
  exitStops,
  reveal,
}: {
  paragraph: string;
  progress: MotionValue<number>;
  exitStops: readonly [number, number];
  reveal: {
    enterStart: number;
    enterEnd: number;
    fromX: number;
    fromY: number;
    exitX: number;
  };
}) {
  const timeline = [
    reveal.enterStart,
    reveal.enterEnd,
    exitStops[0],
    exitStops[1],
  ];
  const opacity = useTransform(
    progress,
    timeline,
    [0, 1, 1, 0],
  );
  const x = useTransform(
    progress,
    timeline,
    [reveal.fromX, 0, 0, reveal.exitX],
  );
  const y = useTransform(
    progress,
    timeline,
    [reveal.fromY, 0, 0, -12],
  );
  const blur = useTransform(
    progress,
    timeline,
    [8, 0, 0, 5],
  );
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <motion.p
      style={{
        opacity,
        x,
        y,
        filter,
      }}
    >
      {paragraph}
    </motion.p>
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
    case "content-stage": {
      const content = section.contentId ? contentSectionsById[section.contentId] : null;

      return (
        <ParticleContentSection
          section={section}
          content={content ?? undefined}
          progress={progress}
        />
      );
    }
    case "particle-text":
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

function ParticleContentSection({
  section,
  content,
  progress,
}: {
  section: SectionDefinition;
  content?: ContentSectionEntry;
  progress: MotionValue<number>;
}) {
  const body = content?.body ?? [];
  const overlayConfig = content ? CONTENT_STAGE_OVERLAY_CONFIG[content.id] : null;

  return (
    <section
      className={`scroll-section ${getScrollSectionClassName(section.domVariant)}`.trim()}
      aria-label={section.ariaLabel ?? "Content section"}
    >
      {body.length > 0 && content && overlayConfig ? (
        <ContentStageOverlay
          contentId={content.id}
          layout={overlayConfig.layout}
          body={body}
          exitStops={overlayConfig.exitStops}
          paragraphReveals={overlayConfig.paragraphs}
          progress={progress}
        />
      ) : null}
      <div className="section-sticky section-sticky--content" />
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
              <IntroCopyContent
                titleClassName="intro-title intro-copy-block"
                subtitleClassName="intro-subtitle intro-copy-block"
                noteClassName="intro-note intro-copy-block"
                titleRef={measureTitleRef}
                subtitleRef={measureSubtitleRef}
                noteRef={measureNoteRef}
              />
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
                <IntroCopyContent
                  titleClassName={[
                    "intro-title",
                    "intro-copy-block",
                    isIntroLeadCentered ? "intro-title--centered" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  subtitleClassName={[
                    "intro-subtitle",
                    "intro-copy-block",
                    isIntroLeadCentered ? "intro-subtitle--centered" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  noteClassName="intro-note intro-copy-block"
                  renderTitle={({ className, children }) => (
                    <motion.p
                      className={className}
                      initial={{ x: introLoadState.titleX }}
                      animate={{ x: 0 }}
                      transition={{
                        duration: INTRO_TEXT_REVEAL_DURATION,
                        delay: INTRO_TEXT_MOVE_DELAY,
                        ease: INTRO_LOAD_EASE,
                      }}
                    >
                      {children}
                    </motion.p>
                  )}
                  renderSubtitle={({ className, children }) => (
                    <motion.p
                      className={className}
                      initial={{ x: introLoadState.subtitleX }}
                      animate={{ x: 0 }}
                      transition={{
                        duration: INTRO_TEXT_REVEAL_DURATION,
                        delay: INTRO_TEXT_MOVE_DELAY,
                        ease: INTRO_LOAD_EASE,
                      }}
                    >
                      {children}
                    </motion.p>
                  )}
                  renderNote={({ className, children }) => (
                    <motion.div
                      className={className}
                      initial={{ x: introLoadState.noteX }}
                      animate={{ x: 0 }}
                      transition={{
                        duration: INTRO_TEXT_REVEAL_DURATION,
                        delay: INTRO_TEXT_MOVE_DELAY,
                        ease: INTRO_LOAD_EASE,
                      }}
                    >
                      {children}
                    </motion.div>
                  )}
                />
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
  const cardRef = useRef<HTMLElement>(null);
  const scrollYProgress = useElementScrollProgress(
    sectionRef,
    getViewportCrossProgress,
  );
  const focus = useSpring(
    useTransform(scrollYProgress, [0.04, 0.28, 0.72, 0.96], [0, 1, 1, 0]),
    {
      stiffness: 180,
      damping: 26,
      mass: 0.2,
    },
  );
  const exclusionStrength = useSpring(
    useTransform(
      scrollYProgress,
      project.slug === "project-03" ? [0.04, 0.28, 0.88, 1] : [0.04, 0.28, 0.76, 0.98],
      [0, 1, 1, 0],
    ),
    {
      stiffness: 150,
      damping: 24,
      mass: 0.24,
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
  useProjectCardExclusion(project.slug, cardRef, exclusionStrength, scrollYProgress);

  return (
    <section
      ref={sectionRef}
      className="scroll-section scroll-section--project"
      aria-labelledby={titleId}
    >
      <div className="section-sticky section-sticky--project">
        <motion.article
          ref={cardRef}
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

            <ProjectTagList
              compact={compactStack}
              showStack={showStack}
              stackId={stackId}
              tags={project.tags}
              onToggle={() => {
                setShowStack((current) => !current);
              }}
            />

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
    case "content":
      return "scroll-section--content";
    case "project":
      return "scroll-section--project";
    case "outro":
      return "scroll-section--outro";
    default:
      return "";
  }
}
