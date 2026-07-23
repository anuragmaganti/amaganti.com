"use client";

import type { MotionValue } from "motion";
import { motion, useMotionTemplate, useTransform } from "motion/react";

import {
  getSectionTimelineAttributes,
  SectionSnapAnchor,
} from "@/components/portfolio-section-frame";
import type {
  ContentParagraph,
  ContentSectionEntry,
} from "@/config/portfolio";
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
