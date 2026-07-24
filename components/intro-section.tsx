"use client";

import type { MotionValue } from "motion";
import { motion, useTransform } from "motion/react";
import {
  Fragment,
  type ReactNode,
  type Ref,
  useEffect,
  useRef,
  useState,
} from "react";

import { getSectionTimelineAttributes } from "@/components/portfolio-section-frame";
import type { SectionDefinition } from "@/config/sections";
import { introContent } from "@/config/site";
import { getTimelineProgressPoint } from "@/lib/scene-timeline";
import type { SceneTimeline } from "@/lib/scene-types";

export const INTRO_LOAD_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const INTRO_TEXT_REVEAL_DURATION = 1.72;
const INTRO_TEXT_FADE_DURATION = 0.92;
const INTRO_TEXT_MOVE_DELAY = 1.28;
export const INTRO_SCENE_DELAY = 2.08;
export const INTRO_CHROME_DELAY = 2.22;
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

export function IntroSection({
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
