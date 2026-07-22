"use client";

import dynamic from "next/dynamic";
import type { MotionValue } from "motion";
import Image from "next/image";
import {
  MotionConfig,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from "motion/react";
import {
  type CSSProperties,
  Fragment,
  type ReactNode,
  type Ref,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  contentSectionsById,
  projectsBySlug,
  type ContentParagraph,
  type ContentSectionEntry,
  type ProjectEntry,
} from "@/lib/content";
import {
  createSceneTimeline,
  getTimelineProgressPoint,
  PORTFOLIO_SECTIONS,
  type SceneTimeline,
  type SectionDefinition,
  type SectionDomVariant,
  type SectionId,
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
const INTRO_TITLE_LINES = ["Hi, I'm", "Anurag"] as const;
const INTRO_SUBTITLE_TEXT =
  "a software engineer obsessed with building products that feel a little bit magical";
const INTRO_NOTE_TEXT = "(yep, that's a real LIDAR scan of my head)";
type OutroContactItem = {
  label: string;
  href?: string;
  external?: boolean;
};

const OUTRO_CONTACT_ITEMS: readonly OutroContactItem[] = [
  {
    label: "GitHub",
    href: "https://github.com/anuragmaganti",
    external: true,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/anuragmaganti/",
    external: true,
  },
  {
    label: "Email me",
    href: "mailto:amaganti.dev@gmail.com",
    external: false,
  },
  {
    label: "Nature publication",
    href: "https://www.nature.com/articles/s41586-018-0697-7",
    external: true,
  },
];
const CLICK_BURST_MAX_ACTIVE = 6;
const CLICK_BURST_PARTICLE_COUNT = 24;
const CLICK_BURST_MAX_LIFETIME_MS = 880;

type ClickBurstParticle = {
  dx: number;
  dy: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
};

type ClickBurst = {
  id: number;
  x: number;
  y: number;
  particles: ClickBurstParticle[];
};

type IntroCopyContentProps = {
  titleClassName: string;
  subtitleClassName: string;
  noteClassName: string;
  alignmentOffsets?: IntroCopyAlignmentOffsets;
  titleRef?: Ref<HTMLHeadingElement>;
  subtitleRef?: Ref<HTMLParagraphElement>;
  noteRef?: Ref<HTMLDivElement>;
  renderTitle?: (props: {
    className: string;
    children: ReactNode;
  }) => ReactNode;
  renderSubtitle?: (props: {
    className: string;
    children: ReactNode;
  }) => ReactNode;
  renderNote?: (props: {
    className: string;
    children: ReactNode;
  }) => ReactNode;
};

type IntroCopyAlignmentOffsets = {
  title: readonly number[];
  subtitle: readonly number[];
  note: readonly number[];
};

function IntroCopyToken({
  children,
  initialX,
}: {
  children: string;
  initialX?: number;
}) {
  if (initialX === undefined) {
    return (
      <span className="intro-copy-token" data-intro-token>
        {children}
      </span>
    );
  }

  return (
    <motion.span
      className="intro-copy-token"
      data-intro-token
      initial={{ x: initialX }}
      animate={{ x: 0 }}
      transition={{
        duration: INTRO_TEXT_REVEAL_DURATION,
        delay: INTRO_TEXT_MOVE_DELAY,
        ease: INTRO_LOAD_EASE,
      }}
    >
      {children}
    </motion.span>
  );
}

function renderIntroWordTokens(text: string, offsets?: readonly number[]) {
  return text.split(" ").map((word, index) => (
    <Fragment key={`${word}-${index}`}>
      {index > 0 ? " " : null}
      <IntroCopyToken initialX={offsets?.[index]}>{word}</IntroCopyToken>
    </Fragment>
  ));
}

function getIntroLineOffsets(block: HTMLElement) {
  const blockRect = block.getBoundingClientRect();
  const tokens = Array.from(
    block.querySelectorAll<HTMLElement>("[data-intro-token]"),
  );
  const offsets = Array<number>(tokens.length).fill(0);
  const lines: { top: number; tokens: { index: number; rect: DOMRect }[] }[] = [];

  tokens.forEach((token, index) => {
    const rect = token.getBoundingClientRect();
    const currentLine = lines.at(-1);

    if (!currentLine || Math.abs(rect.top - currentLine.top) > 1) {
      lines.push({ top: rect.top, tokens: [{ index, rect }] });
      return;
    }

    currentLine.tokens.push({ index, rect });
  });

  lines.forEach((line) => {
    const firstToken = line.tokens[0];
    const lastToken = line.tokens.at(-1);

    if (!firstToken || !lastToken) {
      return;
    }

    const lineLeft = firstToken.rect.left - blockRect.left;
    const lineWidth = lastToken.rect.right - firstToken.rect.left;
    const centeredLeft = (blockRect.width - lineWidth) * 0.5;
    const offset = centeredLeft - lineLeft;

    line.tokens.forEach(({ index }) => {
      offsets[index] = offset;
    });
  });

  return offsets;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function renderContentSegments(
  paragraph: ContentParagraph,
  pointerEvents: MotionValue<"auto" | "none">,
) {
  return paragraph.segments.map((segment, index) => {
    if (segment.type === "text") {
      return <span key={`${paragraph.id}-text-${index}`}>{segment.text}</span>;
    }

    return (
      <motion.a
        key={`${paragraph.id}-link-${index}`}
        className="content-stage-overlay__link"
        href={segment.href}
        target={segment.external ? "_blank" : undefined}
        rel={segment.external ? "noreferrer" : undefined}
        style={{ pointerEvents }}
      >
        {segment.text}
      </motion.a>
    );
  });
}

function createClickBurst(id: number, x: number, y: number): ClickBurst {
  const particles = Array.from({ length: CLICK_BURST_PARTICLE_COUNT }, (_, index) => {
    const angle =
      (Math.PI * 2 * index) / CLICK_BURST_PARTICLE_COUNT + (Math.random() - 0.5) * 0.22;
    const distance = 18 + Math.pow(Math.random(), 0.78) * 42;

    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      size: 1.15 + Math.random() * 1.45,
      opacity: 0.7 + Math.random() * 0.22,
      delay: Math.random() * 36,
      duration: 420 + Math.random() * 140,
    };
  });

  return { id, x, y, particles };
}

function getShellScrollProgress(rect: DOMRect, viewportHeight: number) {
  const scrollableHeight = Math.max(rect.height - viewportHeight, 1);

  return clamp01(-rect.top / scrollableHeight);
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

function useMeasuredSceneTimeline(shellRef: RefObject<HTMLDivElement | null>) {
  const [timeline, setTimeline] = useState<SceneTimeline>(() => createSceneTimeline());

  useEffect(() => {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    let frameId = 0;
    const observer = new ResizeObserver(() => {
      scheduleMeasure();
    });

    const measure = () => {
      frameId = 0;
      const shellRect = shell.getBoundingClientRect();
      const scrollableHeight = Math.max(shell.scrollHeight - window.innerHeight, 1);
      const starts = PORTFOLIO_SECTIONS.map((section) => {
        const element = shell.querySelector<HTMLElement>(
          `[data-portfolio-section-id="${section.id}"]`,
        );

        if (!element) {
          return null;
        }

        return clamp01(
          (element.getBoundingClientRect().top - shellRect.top) / scrollableHeight,
        );
      });
      const measuredRanges: Partial<Record<SectionId, [number, number]>> = {};

      PORTFOLIO_SECTIONS.forEach((section, index) => {
        const start = starts[index];

        if (start === null) {
          return;
        }

        const nextStart = starts[index + 1];
        const end = nextStart === null || nextStart === undefined ? 1 : nextStart;
        measuredRanges[section.id] = [start, Math.max(start + 0.0001, end)];
      });

      const nextTimeline = createSceneTimeline(measuredRanges);
      setTimeline((current) =>
        haveSameSectionRanges(current, nextTimeline) ? current : nextTimeline,
      );
    };

    const scheduleMeasure = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(measure);
    };

    observer.observe(shell);
    shell
      .querySelectorAll<HTMLElement>("[data-portfolio-section-id]")
      .forEach((element) => observer.observe(element));
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    window.addEventListener("load", scheduleMeasure);
    scheduleMeasure();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("load", scheduleMeasure);
      observer.disconnect();
    };
  }, [shellRef]);

  return timeline;
}

function haveSameSectionRanges(current: SceneTimeline, next: SceneTimeline) {
  return PORTFOLIO_SECTIONS.every((section) => {
    const currentRange = current.sectionRanges[section.id];
    const nextRange = next.sectionRanges[section.id];

    return (
      Math.abs(currentRange[0] - nextRange[0]) < 0.00001 &&
      Math.abs(currentRange[1] - nextRange[1]) < 0.00001
    );
  });
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

function syncActiveProjectCardExclusion(
  id: string,
  element: HTMLElement | null,
  strength: number,
  isActive: { current: boolean },
) {
  if (strength <= 0.002) {
    if (isActive.current) {
      isActive.current = false;
      removeProjectCardExclusion(id);
    }
    return;
  }

  isActive.current = true;
  syncProjectCardExclusion(id, element, strength);
}

function useProjectCardExclusion(
  id: string,
  cardRef: RefObject<HTMLElement | null>,
  exclusionStrength: MotionValue<number>,
) {
  const isActive = useRef(false);

  useEffect(() => {
    let frameId = 0;
    let observer: ResizeObserver | null = null;

    const syncCurrentRect = () => {
      syncActiveProjectCardExclusion(
        id,
        cardRef.current,
        exclusionStrength.get(),
        isActive,
      );
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

  useMotionValueEvent(exclusionStrength, "change", (latest) => {
    syncActiveProjectCardExclusion(id, cardRef.current, latest, isActive);
  });
}

function IntroCopyContent({
  titleClassName,
  subtitleClassName,
  noteClassName,
  alignmentOffsets,
  titleRef,
  subtitleRef,
  noteRef,
  renderTitle,
  renderSubtitle,
  renderNote,
}: IntroCopyContentProps) {
  const titleChildren = INTRO_TITLE_LINES.map((line, index) => (
    <IntroCopyToken key={line} initialX={alignmentOffsets?.title[index]}>
      {line}
    </IntroCopyToken>
  ));
  const subtitleChildren = renderIntroWordTokens(
    INTRO_SUBTITLE_TEXT,
    alignmentOffsets?.subtitle,
  );
  const noteChildren = (
    <p className="intro-note__text">
      {renderIntroWordTokens(INTRO_NOTE_TEXT, alignmentOffsets?.note)}
    </p>
  );

  return (
    <div className="intro-copy">
      {renderTitle ? (
        renderTitle({ className: titleClassName, children: titleChildren })
      ) : (
        <h1 ref={titleRef} className={titleClassName}>
          {titleChildren}
        </h1>
      )}

      {renderSubtitle ? (
        renderSubtitle({
          className: subtitleClassName,
          children: subtitleChildren,
        })
      ) : (
        <p ref={subtitleRef} className={subtitleClassName}>
          {subtitleChildren}
        </p>
      )}

      {renderNote ? (
        renderNote({ className: noteClassName, children: noteChildren })
      ) : (
        <div ref={noteRef} className={noteClassName}>
          {noteChildren}
        </div>
      )}
    </div>
  );
}

export function PortfolioExperience() {
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollYProgress = useElementScrollProgress(shellRef, getShellScrollProgress);
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

        <ClickBurstOverlay />

        <main className="page-stage" id="main-content">
          {PORTFOLIO_SECTIONS.map((section) => (
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

function ClickBurstOverlay() {
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const nextBurstId = useRef(0);
  const timeoutIds = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const burst = createClickBurst(nextBurstId.current++, event.clientX, event.clientY);

      setBursts((current) => [...current.slice(-(CLICK_BURST_MAX_ACTIVE - 1)), burst]);

      const timeoutId = window.setTimeout(() => {
        setBursts((current) => current.filter((item) => item.id !== burst.id));
        timeoutIds.current = timeoutIds.current.filter((value) => value !== timeoutId);
      }, CLICK_BURST_MAX_LIFETIME_MS);

      timeoutIds.current.push(timeoutId);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      timeoutIds.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutIds.current = [];
    };
  }, []);

  return (
    <div className="click-burst-overlay" aria-hidden>
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="click-burst"
          style={{ left: burst.x, top: burst.y }}
        >
          {burst.particles.map((particle, index) => (
            <span
              key={`${burst.id}-${index}`}
              className="click-burst__particle"
              style={
                {
                  "--click-burst-x": `${particle.dx}px`,
                  "--click-burst-y": `${particle.dy}px`,
                  "--click-burst-size": `${particle.size}px`,
                  "--click-burst-opacity": particle.opacity,
                  "--click-burst-delay": `${particle.delay}ms`,
                  "--click-burst-duration": `${particle.duration}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ContentStageOverlay({
  content,
  sectionRange,
  progress,
}: {
  content: ContentSectionEntry;
  sectionRange: [number, number];
  progress: MotionValue<number>;
}) {
  if (content.paragraphs.length === 0) {
    return null;
  }

  return (
    <div
      className={`content-stage-overlay content-stage-overlay--${content.layout}`}
      data-content-stage={content.id}
    >
      <div className="content-stage-overlay__shell">
        <div className="content-stage-overlay__copy">
          {content.paragraphs.map((paragraph) => (
            <ContentStageParagraph
              key={paragraph.id}
              paragraph={paragraph}
              progress={progress}
              sectionRange={sectionRange}
              exit={content.exit}
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
  sectionRange,
  exit,
}: {
  paragraph: ContentParagraph;
  progress: MotionValue<number>;
  sectionRange: [number, number];
  exit: readonly [number, number];
}) {
  const toGlobalProgress = (localProgress: number) =>
    sectionRange[0] + (sectionRange[1] - sectionRange[0]) * localProgress;
  const motionTimeline = [
    toGlobalProgress(paragraph.reveal.enter[0]),
    toGlobalProgress(paragraph.reveal.enter[1]),
    toGlobalProgress(exit[0]),
    toGlobalProgress(exit[1]),
  ];
  const fromX =
    paragraph.reveal.from === "left"
      ? -160
      : paragraph.reveal.from === "right"
        ? 160
        : 0;
  const fromY = paragraph.reveal.from === "bottom" ? 80 : 0;
  const exitX = paragraph.reveal.exitTo === "left" ? -60 : 60;
  const opacity = useTransform(progress, motionTimeline, [0, 1, 1, 0]);
  const pointerEvents = useTransform(opacity, (value) =>
    value > 0.5 ? "auto" : "none",
  );
  const x = useTransform(progress, motionTimeline, [fromX, 0, 0, exitX]);
  const y = useTransform(progress, motionTimeline, [fromY, 0, 0, -12]);
  const blur = useTransform(progress, motionTimeline, [8, 0, 0, 5]);
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <motion.p
      style={{ opacity, x, y, filter, pointerEvents }}
    >
      {renderContentSegments(paragraph, pointerEvents)}
    </motion.p>
  );
}

function getSectionTimelineAttributes(
  section: SectionDefinition,
  timeline: SceneTimeline,
) {
  const [start, end] = timeline.sectionRanges[section.id];

  return {
    "data-portfolio-section-id": section.id,
    "data-timeline-start": start,
    "data-timeline-end": end,
  };
}

function SectionSnapAnchor({ section }: { section: SectionDefinition }) {
  if (section.snapLocalProgress === undefined) {
    return null;
  }

  return (
    <span
      className="section-snap-anchor"
      aria-hidden
      style={{ top: `${section.snapLocalProgress * 100}%` }}
    />
  );
}

function PortfolioSectionRenderer({
  section,
  progress,
  timeline,
}: {
  section: SectionDefinition;
  progress: MotionValue<number>;
  timeline: SceneTimeline;
}) {
  switch (section.kind) {
    case "intro":
      return <IntroSection progress={progress} section={section} timeline={timeline} />;
    case "content-stage": {
      const content = section.contentId ? contentSectionsById[section.contentId] : null;

      return (
        <ParticleContentSection
          section={section}
          content={content ?? undefined}
          progress={progress}
          timeline={timeline}
        />
      );
    }
    case "particle-text":
      return <SceneStageSection section={section} timeline={timeline} />;
    case "outro":
      return <OutroSection section={section} progress={progress} timeline={timeline} />;
    case "card": {
      const project = section.projectSlug ? projectsBySlug[section.projectSlug] : null;

      return project ? (
        <ProjectCardSection
          project={project}
          section={section}
          progress={progress}
          timeline={timeline}
        />
      ) : null;
    }
    default:
      return null;
  }
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
      className={`scroll-section ${getScrollSectionClassName(section.domVariant)}`.trim()}
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

function OutroSection({
  section,
  progress,
  timeline,
}: {
  section: SectionDefinition;
  progress: MotionValue<number>;
  timeline: SceneTimeline;
}) {
  const headingId = `${section.id}-heading`;
  const revealStops = [
    getTimelineProgressPoint(timeline, section.id, 0.62),
    getTimelineProgressPoint(timeline, section.id, 0.8),
  ];

  return (
    <section
      id={section.id}
      className={`scroll-section ${getScrollSectionClassName(section.domVariant)}`.trim()}
      aria-labelledby={headingId}
      {...getSectionTimelineAttributes(section, timeline)}
    >
      <h2 className="sr-only" id={headingId}>
        Contact
      </h2>
      <div className="section-sticky section-sticky--center">
        <div className="transform-stage transform-stage--outro">
          <OutroContactOverlay progress={progress} revealStops={revealStops} />
        </div>
      </div>
    </section>
  );
}

function OutroContactOverlay({
  progress,
  revealStops,
}: {
  progress: MotionValue<number>;
  revealStops: number[];
}) {
  const opacity = useTransform(progress, revealStops, [0, 1]);
  const blur = useTransform(progress, revealStops, [10, 0]);
  const y = useTransform(progress, revealStops, [18, 0]);
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <div className="outro-contact-overlay-shell">
      <motion.div
        className="outro-contact-overlay"
        style={{ opacity, y, filter }}
      >
        {OUTRO_CONTACT_ITEMS.map((item) => (
          <div
            key={item.label}
            className={`outro-contact-overlay__item${
              item.href ? " outro-contact-overlay__item--interactive" : ""
            }`}
          >
            {item.href ? (
              <a
                className="outro-contact-label outro-contact-label--link"
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
              >
                {item.label}
              </a>
            ) : (
              <p className="outro-contact-label">{item.label}</p>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function ParticleContentSection({
  section,
  content,
  progress,
  timeline,
}: {
  section: SectionDefinition;
  content?: ContentSectionEntry;
  progress: MotionValue<number>;
  timeline: SceneTimeline;
}) {
  const headingId = `${section.id}-heading`;

  return (
    <section
      id={section.id}
      className={`scroll-section ${getScrollSectionClassName(section.domVariant)}`.trim()}
      aria-labelledby={headingId}
      {...getSectionTimelineAttributes(section, timeline)}
    >
      <SectionSnapAnchor section={section} />
      <h2 className="sr-only" id={headingId}>
        {content?.title ?? section.ariaLabel ?? "Content section"}
      </h2>
      {content ? (
        <ContentStageOverlay
          content={content}
          sectionRange={timeline.sectionRanges[section.id]}
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
  timeline,
}: {
  progress: MotionValue<number>;
  section: SectionDefinition;
  timeline: SceneTimeline;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const measureTitleRef = useRef<HTMLHeadingElement>(null);
  const measureSubtitleRef = useRef<HTMLParagraphElement>(null);
  const measureNoteRef = useRef<HTMLDivElement>(null);
  const [introLoadState, setIntroLoadState] = useState({
    ready: false,
    x: 0,
    y: 0,
    titleX: 0,
    subtitleX: 0,
    noteX: 0,
    titleLineOffsets: [] as number[],
    subtitleLineOffsets: [] as number[],
    noteLineOffsets: [] as number[],
  });
  const introCopyStops = [
    getTimelineProgressPoint(timeline, section.id, 0),
    getTimelineProgressPoint(timeline, section.id, 2 / 15),
    getTimelineProgressPoint(timeline, section.id, 2 / 3),
  ];
  const introCopyOpacity = useTransform(progress, introCopyStops, [1, 0.78, 0]);
  const introCopyX = useTransform(
    progress,
    [introCopyStops[0], introCopyStops[2]],
    [0, -420],
  );
  const introCopyStyle = { opacity: introCopyOpacity, x: introCopyX };
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
      const titleElement = measureTitleRef.current;
      const subtitleElement = measureSubtitleRef.current;
      const noteElement = measureNoteRef.current;
      const titleRect = titleElement?.getBoundingClientRect();
      const subtitleRect = subtitleElement?.getBoundingClientRect();
      const noteRect = noteElement?.getBoundingClientRect();

      if (
        !stageRect ||
        !copyRect ||
        !titleElement ||
        !subtitleElement ||
        !noteElement ||
        !titleRect ||
        !subtitleRect ||
        !noteRect
      ) {
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
        titleLineOffsets: getIntroLineOffsets(titleElement),
        subtitleLineOffsets: getIntroLineOffsets(subtitleElement),
        noteLineOffsets: getIntroLineOffsets(noteElement),
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

  return (
    <section
      id={section.id}
      className="scroll-section scroll-section--intro"
      {...getSectionTimelineAttributes(section, timeline)}
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
                  titleClassName="intro-title intro-copy-block"
                  subtitleClassName="intro-subtitle intro-copy-block"
                  noteClassName="intro-note intro-copy-block"
                  alignmentOffsets={{
                    title: introLoadState.titleLineOffsets,
                    subtitle: introLoadState.subtitleLineOffsets,
                    note: introLoadState.noteLineOffsets,
                  }}
                  renderTitle={({ className, children }) => (
                    <motion.h1
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
                    </motion.h1>
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
  section,
  progress,
  timeline,
}: {
  project: ProjectEntry;
  section: SectionDefinition;
  progress: MotionValue<number>;
  timeline: SceneTimeline;
}) {
  const cardRef = useRef<HTMLElement>(null);
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
  const exclusionStrength = useSpring(
    useTransform(
      sectionProgress,
      [0.04, 0.24, 0.86, 1],
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
  const copyOpacity = useTransform(focus, [0, 1], [0.84, 1]);
  const mediaScale = useTransform(focus, [0, 1], [1.01, 1.05]);
  const borderAlpha = useTransform(focus, [0, 1], [0.06, 0.15]);
  const glowAlpha = useTransform(focus, [0, 1], [0.012, 0.04]);
  const borderColor = useMotionTemplate`rgba(255, 255, 255, ${borderAlpha})`;
  const cardShadow = useMotionTemplate`0 30px 90px rgba(0, 0, 0, 0.52), 0 0 48px rgba(255, 255, 255, ${glowAlpha})`;
  const titleId = `${project.slug}-title`;
  useProjectCardExclusion(project.slug, cardRef, exclusionStrength);

  return (
    <section
      id={section.id}
      className="scroll-section scroll-section--project"
      aria-labelledby={titleId}
      {...getSectionTimelineAttributes(section, timeline)}
    >
      <SectionSnapAnchor section={section} />
      <div className="section-sticky section-sticky--project">
        <motion.article
          ref={cardRef}
          className="panel project-card"
          style={{ scale, y, borderColor, boxShadow: cardShadow }}
        >
          <div className="project-card__media">
            <motion.div className="project-card__media-inner" style={{ scale: mediaScale }}>
              <Image
                src={project.imageSrc}
                alt={project.imageAlt}
                width={project.imageWidth}
                height={project.imageHeight}
                className="project-card__image"
                loading="eager"
                sizes="(max-width: 640px) calc(100vw - 3rem), (max-width: 1280px) min(82vw, 40rem), 34rem"
              />
            </motion.div>
          </div>

          <motion.div className="project-card__copy" style={{ opacity: copyOpacity }}>
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

            <div className="project-card__actions">
              {project.href && project.linkLabel ? (
                <a
                  className="cta-link project-action project-action--primary"
                  href={project.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{project.linkLabel}</span>
                  <span className="project-action__arrow" aria-hidden>
                    ↗
                  </span>
                </a>
              ) : null}
              {project.githubHref ? (
                <a
                  className={`cta-link project-action ${
                    project.href
                      ? "project-action--secondary"
                      : "project-action--primary"
                  }`}
                  href={project.githubHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>View Source</span>
                  <span className="project-action__arrow" aria-hidden>
                    ↗
                  </span>
                </a>
              ) : null}
            </div>
          </motion.div>
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
