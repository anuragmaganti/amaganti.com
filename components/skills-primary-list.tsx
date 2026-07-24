"use client";

import type { MotionValue } from "motion";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react";
import { useEffect, useRef, type RefObject } from "react";

import type { SkillEntry } from "@/config/skills";

type ListTravel = {
  end: number;
  start: number;
};

const PRIMARY_SKILL_ANCHOR_RATIO = 0.25;

export function SkillsPrimaryList({
  items,
  progress,
}: {
  items: readonly SkillEntry[];
  progress: MotionValue<number>;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const y = useAnchoredListTravel(progress, railRef, listRef);

  return (
    <div ref={railRef} className="skills-stage__rail">
      <motion.ul ref={listRef} className="skills-stage__list" style={{ y }}>
        {items.map((skill, index) => (
          <SkillHighlightItem
            key={skill.id}
            index={index}
            itemCount={items.length}
            progress={progress}
            skill={skill}
          />
        ))}
      </motion.ul>
    </div>
  );
}

function SkillHighlightItem({
  index,
  itemCount,
  progress,
  skill,
}: {
  index: number;
  itemCount: number;
  progress: MotionValue<number>;
  skill: SkillEntry;
}) {
  const step = itemCount > 1 ? 1 / (itemCount - 1) : 1;
  const center = itemCount > 1 ? index * step : 0.5;
  const inputRange = [
    center - step * 0.52,
    center - step * 0.18,
    center + step * 0.18,
    center + step * 0.52,
  ];
  const opacity = useTransform(
    progress,
    inputRange,
    [0.3, 1, 1, 0.3],
  );
  const scale = useTransform(progress, inputRange, [1, 1.02, 1.02, 1]);

  return (
    <motion.li className="skills-stage__item" style={{ opacity, scale }}>
      {skill.label}
    </motion.li>
  );
}

function useAnchoredListTravel(
  progress: MotionValue<number>,
  railRef: RefObject<HTMLDivElement | null>,
  listRef: RefObject<HTMLUListElement | null>,
) {
  const y = useMotionValue(0);
  const travelRef = useRef<ListTravel>({ end: 0, start: 0 });

  useMotionValueEvent(progress, "change", (value) => {
    y.set(mixTravel(travelRef.current, value));
  });

  useEffect(() => {
    const rail = railRef.current;
    const list = listRef.current;

    if (!rail || !list) {
      return;
    }

    let frameId = 0;

    const measure = () => {
      frameId = 0;

      const firstItem = list.firstElementChild as HTMLElement | null;
      const lastItem = list.lastElementChild as HTMLElement | null;

      if (!firstItem || !lastItem) {
        return;
      }

      const railAnchor = rail.clientHeight * PRIMARY_SKILL_ANCHOR_RATIO;
      const firstCenter = firstItem.offsetTop + firstItem.offsetHeight / 2;
      const lastCenter = lastItem.offsetTop + lastItem.offsetHeight / 2;
      const travel = {
        start: railAnchor - firstCenter,
        end: railAnchor - lastCenter,
      };

      travelRef.current = travel;
      y.set(mixTravel(travel, progress.get()));
    };
    const scheduleMeasure = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(scheduleMeasure);

    observer.observe(rail);
    observer.observe(list);
    scheduleMeasure();

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [listRef, progress, railRef, y]);

  return y;
}

function mixTravel({ end, start }: ListTravel, progress: number) {
  return start + (end - start) * Math.max(0, Math.min(1, progress));
}
