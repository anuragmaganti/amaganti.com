"use client";

import type { MotionValue } from "motion";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";

import type { SkillEntry } from "@/config/portfolio";

const VISIBLE_SLOTS = 8;
const EDGE_SLOTS = 1.5;
const PRIMARY_SKILL_STEP_VH = 56;
const TECHNOLOGY_STEP_VH = 14;
const MINIMUM_SCROLL_TRAVEL_VH = 280;

type TrackGeometry = {
  arcLength: number;
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

export function getSkillsScrollHeightVh(
  technologyCount: number,
  primarySkillCount: number,
) {
  const primaryTravel =
    Math.max(primarySkillCount - 1, 0) * PRIMARY_SKILL_STEP_VH;
  const technologyTravel =
    Math.max(technologyCount - 1, 0) * TECHNOLOGY_STEP_VH;
  const scrollTravel = Math.max(
    MINIMUM_SCROLL_TRAVEL_VH,
    primaryTravel,
    technologyTravel,
  );

  return 100 + scrollTravel;
}

export function SkillsTechnologyTrack({
  items,
  progress,
}: {
  items: readonly SkillEntry[];
  progress: MotionValue<number>;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pathId = `skills-technology-path-${useId().replace(/:/g, "")}`;
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
        <svg
          className="skills-technology-track__svg"
          preserveAspectRatio="none"
          viewBox={`0 0 ${Math.max(size.width, 1)} ${Math.max(size.height, 1)}`}
        >
          <defs>
            <path id={pathId} d={getTrackPath(geometry)} />
          </defs>
          {items.map((item, index) => (
            <TechnologyTrackItem
              key={item.id}
              geometry={geometry}
              index={index}
              itemCount={items.length}
              label={item.label}
              pathId={pathId}
              progress={renderedProgress}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function TechnologyTrackItem({
  geometry,
  index,
  itemCount,
  label,
  pathId,
  progress,
}: {
  geometry: TrackGeometry;
  index: number;
  itemCount: number;
  label: string;
  pathId: string;
  progress: MotionValue<number>;
}) {
  const itemProgress = useTransform(progress, (value) =>
    getItemProgress(value, index, itemCount),
  );
  const startOffset = useTransform(itemProgress, (value) =>
    getTrackOffset(geometry, value),
  );
  const opacity = useTransform(progress, (value) => {
    const itemValue = getItemProgress(value, index, itemCount);
    const trackFade =
      smoothstep(0, 0.045, value) * (1 - smoothstep(0.955, 1, value));

    return getItemOpacity(itemValue, geometry) * trackFade;
  });

  return (
    <motion.text
      className="skills-technology-track__label"
      dominantBaseline="central"
      style={{ opacity }}
      textAnchor="middle"
    >
      <motion.textPath href={`#${pathId}`} startOffset={startOffset}>
        {label}
      </motion.textPath>
    </motion.text>
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
  const startX = isMobile
    ? width * 0.12
    : clamp(width * 0.1, 72, 128);
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
    horizontalLength,
    pathLength,
    radius,
    rightX,
    startX,
    topY,
    verticalLength,
  };
}

function getTrackPath(geometry: TrackGeometry) {
  if (geometry.pathLength <= 0) {
    return "";
  }

  const cornerX = geometry.rightX - geometry.radius;
  const cornerY = geometry.topY + geometry.radius;
  const endY = cornerY + geometry.verticalLength;

  return [
    `M 0 ${geometry.topY}`,
    `H ${cornerX}`,
    `A ${geometry.radius} ${geometry.radius} 0 0 1 ${geometry.rightX} ${cornerY}`,
    `V ${endY}`,
  ].join(" ");
}

function getTrackOffset(geometry: TrackGeometry, progress: number) {
  return geometry.startX + clamp01(progress) * geometry.pathLength;
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

function getItemOpacity(itemProgress: number, geometry: TrackGeometry) {
  if (geometry.pathLength <= 0) {
    return 0;
  }

  const verticalStart =
    (geometry.horizontalLength + geometry.arcLength) / geometry.pathLength;
  const verticalProgress = clamp01(
    (itemProgress - verticalStart) / Math.max(1 - verticalStart, 0.0001),
  );
  const entranceOpacity = smoothstep(0, 0.035, itemProgress);
  const bottomFade = 1 - smoothstep(0.5, 1, verticalProgress);

  return entranceOpacity * bottomFade;
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
