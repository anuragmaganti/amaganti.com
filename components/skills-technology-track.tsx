"use client";

import type { MotionValue } from "motion";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";

import type { SkillEntry } from "@/lib/content";

const VISIBLE_SLOTS = 8;
const EDGE_SLOTS = 1.5;
const BASELINE_ITEM_COUNT = 12;
const SCROLL_VH_PER_EXTRA_ITEM = 8;

type TrackGeometry = {
  arcLength: number;
  focusProgress: number;
  horizontalLength: number;
  pathLength: number;
  radius: number;
  rightX: number;
  startX: number;
  topY: number;
  verticalLength: number;
};

type ViewportSize = {
  height: number;
  width: number;
};

export function getTechnologyTrackGapExtraVh(
  technologyCount: number,
  primarySkillCount: number,
) {
  const extraScrollVh =
    Math.max(technologyCount - BASELINE_ITEM_COUNT, 0) *
    SCROLL_VH_PER_EXTRA_ITEM;

  return primarySkillCount > 1 ? extraScrollVh / (primarySkillCount - 1) : 0;
}

export function SkillsTechnologyTrack({
  items,
  progress,
}: {
  items: readonly SkillEntry[];
  progress: MotionValue<number>;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const size = useObservedSize(trackRef);
  const geometry = createTrackGeometry(size);
  const reducedMotion = Boolean(useReducedMotion());
  const smoothedProgress = useSpring(progress, {
    damping: 28,
    mass: 0.24,
    stiffness: 115,
  });
  const renderedProgress = useTransform(smoothedProgress, (value) =>
    reducedMotion ? 0.5 : value,
  );

  return (
    <div className="skills-technology-layer" aria-hidden="true">
      <div
        ref={trackRef}
        className="skills-technology-track"
        data-skills-technology-track
      >
        {items.map((item, index) => (
          <TechnologyTrackItem
            key={item.id}
            geometry={geometry}
            index={index}
            itemCount={items.length}
            label={item.label}
            progress={renderedProgress}
          />
        ))}
      </div>
    </div>
  );
}

function TechnologyTrackItem({
  geometry,
  index,
  itemCount,
  label,
  progress,
}: {
  geometry: TrackGeometry;
  index: number;
  itemCount: number;
  label: string;
  progress: MotionValue<number>;
}) {
  const itemProgress = useTransform(progress, (value) =>
    getItemProgress(value, index, itemCount),
  );
  const transform = useTransform(itemProgress, (value) => {
    const point = getTrackPoint(geometry, value);
    const scale = 0.985 + getItemFocus(value, geometry) * 0.035;

    return `translate3d(${point.x}px, ${point.y}px, 0) rotate(${point.rotate}deg) scale(${scale})`;
  });
  const opacity = useTransform(progress, (value) => {
    const itemValue = getItemProgress(value, index, itemCount);
    const trackFade =
      smoothstep(0, 0.045, value) * (1 - smoothstep(0.955, 1, value));

    return getItemOpacity(itemValue, geometry) * trackFade;
  });

  return (
    <motion.span
      className="skills-technology-track__position"
      style={{ opacity, transform }}
    >
      <span className="skills-technology-track__label">{label}</span>
    </motion.span>
  );
}

function useObservedSize<T extends HTMLElement>(targetRef: RefObject<T | null>) {
  const [size, setSize] = useState<ViewportSize>({ height: 0, width: 0 });

  useEffect(() => {
    const target = targetRef.current;

    if (!target) {
      return;
    }

    const update = () => {
      const rect = target.getBoundingClientRect();
      const nextSize = { height: rect.height, width: rect.width };

      setSize((current) =>
        Math.abs(current.height - nextSize.height) < 0.5 &&
        Math.abs(current.width - nextSize.width) < 0.5
          ? current
          : nextSize,
      );
    };
    const observer = new ResizeObserver(update);

    observer.observe(target);
    update();

    return () => observer.disconnect();
  }, [targetRef]);

  return size;
}

function createTrackGeometry({ height, width }: ViewportSize): TrackGeometry {
  if (height <= 0 || width <= 0) {
    return {
      arcLength: 0,
      focusProgress: 0.5,
      horizontalLength: 0,
      pathLength: 0,
      radius: 0,
      rightX: 0,
      startX: 0,
      topY: 0,
      verticalLength: 0,
    };
  }

  const isMobile = width <= 640;
  const topY = clamp(
    height * (isMobile ? 0.022 : 0.026),
    isMobile ? 12 : 16,
    isMobile ? 20 : 24,
  );
  const rightX =
    width -
    clamp(width * 0.034, isMobile ? 16 : 28, isMobile ? 24 : 56);
  const startX = isMobile ? width * 0.12 : Math.max(width * 0.28, 240);
  const radius = clamp(
    Math.min(width, height) * (isMobile ? 0.07 : 0.085),
    isMobile ? 28 : 48,
    isMobile ? 46 : 88,
  );
  const horizontalLength = Math.max(rightX - radius - startX, 1);
  const arcLength = radius * (Math.PI / 2);
  const verticalLength = Math.max(
    height * (isMobile ? 0.92 : 0.9) - (topY + radius),
    1,
  );
  const pathLength = horizontalLength + arcLength + verticalLength;

  return {
    arcLength,
    focusProgress: (horizontalLength + arcLength * 0.55) / pathLength,
    horizontalLength,
    pathLength,
    radius,
    rightX,
    startX,
    topY,
    verticalLength,
  };
}

function getTrackPoint(geometry: TrackGeometry, progress: number) {
  if (geometry.pathLength <= 0) {
    return { rotate: 0, x: 0, y: 0 };
  }

  const distance = clamp01(progress) * geometry.pathLength;

  if (distance <= geometry.horizontalLength) {
    return {
      rotate: 0,
      x: geometry.startX + distance,
      y: geometry.topY,
    };
  }

  if (distance <= geometry.horizontalLength + geometry.arcLength) {
    const angle =
      -Math.PI / 2 + (distance - geometry.horizontalLength) / geometry.radius;
    const centerX = geometry.rightX - geometry.radius;
    const centerY = geometry.topY + geometry.radius;

    return {
      rotate: (angle * 180) / Math.PI + 90,
      x: centerX + Math.cos(angle) * geometry.radius,
      y: centerY + Math.sin(angle) * geometry.radius,
    };
  }

  return {
    rotate: 90,
    x: geometry.rightX,
    y:
      geometry.topY +
      geometry.radius +
      Math.min(
        distance - geometry.horizontalLength - geometry.arcLength,
        geometry.verticalLength,
      ),
  };
}

function getItemProgress(
  sectionProgress: number,
  index: number,
  itemCount: number,
) {
  const travelSlots =
    Math.max(itemCount - 1, 0) + VISIBLE_SLOTS - EDGE_SLOTS * 2;

  return (
    (clamp01(sectionProgress) * travelSlots - index + EDGE_SLOTS) /
    VISIBLE_SLOTS
  );
}

function getItemFocus(itemProgress: number, geometry: TrackGeometry) {
  const distance =
    (itemProgress - geometry.focusProgress) / (geometry.pathLength > 0 ? 0.085 : 1);

  return Math.exp(-0.5 * distance * distance);
}

function getItemOpacity(itemProgress: number, geometry: TrackGeometry) {
  const edgeOpacity =
    smoothstep(0, 0.1, itemProgress) *
    (1 - smoothstep(0.9, 1, itemProgress));

  return edgeOpacity * (0.17 + getItemFocus(itemProgress, geometry) * 0.68);
}

function smoothstep(min: number, max: number, value: number) {
  const progress = clamp01((value - min) / Math.max(max - min, 0.0001));

  return progress * progress * (3 - 2 * progress);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}
