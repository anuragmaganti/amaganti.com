"use client";

import type { MotionValue } from "motion";
import { motion, useMotionTemplate, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

import {
  getSectionTimelineAttributes,
  SectionSnapAnchor,
} from "@/components/portfolio-section-frame";
import type {
  ContentParagraph,
  ContentSectionEntry,
} from "@/config/content-sections";
import type { SectionDefinition } from "@/config/sections";
import type { SceneTimeline } from "@/lib/scene-types";
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

function ContentStageOverlay({
  content,
  sectionRange,
  progress,
}: {
  content: ContentSectionEntry;
  sectionRange: [number, number];
  progress: MotionValue<number>;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const overflow = useMotionValue(0);
  const copyY = useTransform(() => {
    const localProgress =
      (progress.get() - sectionRange[0]) / (sectionRange[1] - sectionRange[0]);
    // Finish scrolling before the paragraph exit animation starts at 0.58.
    return -overflow.get() * Math.max(0, Math.min(1, localProgress / 0.5));
  });

  useEffect(() => {
    const shell = shellRef.current;
    const copy = copyRef.current;
    const section = shell?.closest<HTMLElement>("[data-portfolio-section-id]");
    if (!shell || !copy || !section) return;

    let frameId = 0;
    const measure = () => {
      frameId = 0;
      const styles = getComputedStyle(shell);
      const available =
        shell.clientHeight -
        parseFloat(styles.paddingTop) -
        parseFloat(styles.paddingBottom);
      const travel = styles.display === "flex"
        ? Math.max(0, copy.scrollHeight - available)
        : 0;
      overflow.set(travel);
      section.style.setProperty("--content-overflow", `${travel}px`);
    };
    const schedule = () => {
      if (!frameId) frameId = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(shell);
    observer.observe(copy);
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      section.style.removeProperty("--content-overflow");
    };
  }, [overflow]);

  if (content.paragraphs.length === 0) {
    return null;
  }

  return (
    <div
      className={`content-stage-overlay content-stage-overlay--${content.layout}`}
      data-content-stage={content.id}
    >
      <div className="content-stage-overlay__shell" ref={shellRef}>
        <div className="content-stage-overlay__window">
          <motion.div
            className="content-stage-overlay__copy"
            ref={copyRef}
            style={{ y: copyY }}
          >
            {content.paragraphs.map((paragraph) => (
              <ContentStageParagraph
                key={paragraph.id}
                paragraph={paragraph}
                progress={progress}
                sectionRange={sectionRange}
                exit={content.exit}
              />
            ))}
          </motion.div>
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

export function ParticleContentSection({
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
