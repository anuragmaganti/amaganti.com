"use client";

import dynamic from "next/dynamic";
import type { MotionValue } from "motion";
import Image from "next/image";
import {
  MODE_DRAWS,
  resolvePreset,
  type OrbState,
} from "thinking-orbs";
import {
  MotionConfig,
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import {
  type CSSProperties,
  type ComponentType,
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
  getSkillsScrollHeightVh,
  SkillsTechnologyTrack,
} from "@/components/skills-technology-track";
import { SkillsPrimaryList } from "@/components/skills-primary-list";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  customSectionRenderers,
  type CustomSectionRendererProps,
} from "@/config/custom-sections";
import { useParticleObstacle } from "@/hooks/use-particle-obstacle";
import {
  contentSectionsById,
  introContent,
  outroLinks,
  projectsBySlug,
  skills,
  technologySkills,
  type ContentParagraph,
  type ContentSectionEntry,
  type ProjectEntry,
} from "@/config/portfolio";
import {
  portfolioSections,
  type BuiltInSectionRendererId,
  type SectionDefinition,
  type SectionId,
} from "@/config/sections";
import {
  createSceneTimeline,
  getTimelineProgressPoint,
  type SceneTimeline,
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
      const starts = portfolioSections.map((section) => {
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

      portfolioSections.forEach((section, index) => {
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
  return portfolioSections.every((section) => {
    const currentRange = current.sectionRanges[section.id];
    const nextRange = next.sectionRanges[section.id];

    return (
      Math.abs(currentRange[0] - nextRange[0]) < 0.00001 &&
      Math.abs(currentRange[1] - nextRange[1]) < 0.00001
    );
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
  const titleChildren = [introContent.greeting, introContent.name].map((line, index) => (
    <IntroCopyToken key={line} initialX={alignmentOffsets?.title[index]}>
      {line}
    </IntroCopyToken>
  ));
  const subtitleChildren = renderIntroWordTokens(
    introContent.summary,
    alignmentOffsets?.subtitle,
  );
  const noteChildren = (
    <p className="intro-note__text">
      {renderIntroWordTokens(introContent.note, alignmentOffsets?.note)}
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

function SkillsSection({
  section,
  timeline,
}: {
  section: SectionDefinition;
  timeline: SceneTimeline;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const headingId = `${section.id}-heading`;
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const skillsProgress = useTransform(scrollYProgress, [0.06, 0.94], [0, 1]);
  const scrollHeightVh = getSkillsScrollHeightVh(
    technologySkills.length,
    skills.length,
  );
  const sectionStyle = {
    "--skills-scroll-height": `${scrollHeightVh}svh`,
  } as CSSProperties;

  return (
    <section
      ref={sectionRef}
      id={section.id}
      className={`scroll-section scroll-section--${section.layout}`}
      aria-labelledby={headingId}
      style={sectionStyle}
      {...getSectionTimelineAttributes(section, timeline)}
    >
      <SkillsTechnologyTrack items={technologySkills} progress={skillsProgress} />
      <div className="skills-stage">
        <h2 className="skills-stage__title" id={headingId}>
          Skills
        </h2>
        <SkillsPrimaryList items={skills} progress={skillsProgress} />
      </div>
      <div className="sr-only">
        <h3>Technologies</h3>
        <ul>
          {technologySkills.map((technology) => (
            <li key={technology.id}>{technology.label}</li>
          ))}
        </ul>
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
    getTimelineProgressPoint(timeline, section.id, 0.7),
    getTimelineProgressPoint(timeline, section.id, 0.84),
  ];

  return (
    <section
      id={section.id}
      className={`scroll-section scroll-section--${section.layout}`}
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
        {outroLinks.map((item) => (
          <div
            key={item.label}
            className={`outro-contact-overlay__item${
              " outro-contact-overlay__item--interactive"
            }`}
          >
            <a
              className="outro-contact-label outro-contact-label--link"
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
            >
              {item.label}
            </a>
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
      className={`scroll-section scroll-section--${section.layout}`}
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
                      initial={{ opacity: 0, x: introLoadState.subtitleX }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        opacity: {
                          duration: INTRO_TEXT_REVEAL_DURATION,
                          delay: INTRO_TEXT_MOVE_DELAY,
                          ease: INTRO_LOAD_EASE,
                        },
                        x: {
                          duration: INTRO_TEXT_REVEAL_DURATION,
                          delay: INTRO_TEXT_MOVE_DELAY,
                          ease: INTRO_LOAD_EASE,
                        },
                      }}
                    >
                      {children}
                    </motion.p>
                  )}
                  renderNote={({ className, children }) => (
                    <motion.div
                      className={className}
                      initial={{ opacity: 0, x: introLoadState.noteX }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        opacity: {
                          duration: INTRO_TEXT_REVEAL_DURATION,
                          delay: INTRO_TEXT_MOVE_DELAY,
                          ease: INTRO_LOAD_EASE,
                        },
                        x: {
                          duration: INTRO_TEXT_REVEAL_DURATION,
                          delay: INTRO_TEXT_MOVE_DELAY,
                          ease: INTRO_LOAD_EASE,
                        },
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
  const scale = useTransform(focus, [0, 1], [0.986, 1]);
  const y = useTransform(focus, [0, 1], [26, 0]);
  const copyOpacity = useTransform(focus, [0, 1], [0.84, 1]);
  const mediaScale = useTransform(focus, [0, 1], [1.01, 1.05]);
  const borderAlpha = useTransform(focus, [0, 1], [0.06, 0.15]);
  const glowAlpha = useTransform(focus, [0, 1], [0.012, 0.04]);
  const borderColor = useMotionTemplate`rgba(var(--project-card-border-rgb), ${borderAlpha})`;
  const cardShadow = useMotionTemplate`0 30px 90px rgba(var(--project-card-shadow-rgb), 0.52), 0 0 48px rgba(var(--project-card-glow-rgb), ${glowAlpha})`;
  const titleId = `${project.slug}-title`;
  useParticleObstacle(project.slug, cardRef, focus);

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

          <div className="project-card__copy">
            <motion.div
              className="project-card__scroll"
              style={{ opacity: copyOpacity }}
            >
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
            </motion.div>

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
          </div>
        </motion.article>
      </div>
    </section>
  );
}
