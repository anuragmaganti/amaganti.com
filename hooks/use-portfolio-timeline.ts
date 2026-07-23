"use client";

import { useMotionValue } from "motion/react";
import { useEffect, useState, type RefObject } from "react";

import {
  portfolioSections,
  type SectionId,
} from "@/config/sections";
import { createSceneTimeline } from "@/lib/scene-timeline";
import type { SceneTimeline } from "@/lib/scene-types";

export function usePortfolioScrollProgress(
  shellRef: RefObject<HTMLDivElement | null>,
) {
  const progress = useMotionValue(0);

  useEffect(() => {
    let frameId = 0;
    let observer: ResizeObserver | null = null;

    const update = () => {
      frameId = 0;
      const shell = shellRef.current;

      if (!shell) {
        return;
      }

      const rect = shell.getBoundingClientRect();
      const scrollableHeight = Math.max(rect.height - window.innerHeight, 1);
      progress.set(clamp01(-rect.top / scrollableHeight));
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

    if (shellRef.current) {
      observer = new ResizeObserver(scheduleUpdate);
      observer.observe(shellRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("load", scheduleUpdate);
      observer?.disconnect();
    };
  }, [progress, shellRef]);

  return progress;
}

export function useMeasuredSceneTimeline(
  shellRef: RefObject<HTMLDivElement | null>,
) {
  const [timeline, setTimeline] = useState<SceneTimeline>(() =>
    createSceneTimeline(),
  );

  useEffect(() => {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    let frameId = 0;
    const observer = new ResizeObserver(() => scheduleMeasure());

    const measure = () => {
      frameId = 0;
      const shellRect = shell.getBoundingClientRect();
      const scrollableHeight = Math.max(
        shell.scrollHeight - window.innerHeight,
        1,
      );
      const starts = portfolioSections.map((section) => {
        const element = shell.querySelector<HTMLElement>(
          `[data-portfolio-section-id="${section.id}"]`,
        );

        if (!element) {
          return null;
        }

        return clamp01(
          (element.getBoundingClientRect().top - shellRect.top) /
            scrollableHeight,
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

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
