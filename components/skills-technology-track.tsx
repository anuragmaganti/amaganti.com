"use client";

import type { MotionValue } from "motion";
import { cancelFrame, frame, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";

import type { SkillEntry } from "@/config/skills";
import {
  createLabelFrames,
  createTrackGeometry,
  getItemOpacity,
  getItemProgress,
  getTrackOffset,
  getTrackPath,
  getTrackRenderMode,
  smoothstep,
  type LabelFrames,
  type TrackGeometry,
  type TrackRenderMode,
  type ViewportSize,
} from "@/lib/skills-technology-layout";

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
  const geometry = useMemo(() => createTrackGeometry(size), [size]);
  const reducedMotion = Boolean(useReducedMotion());
  const renderedProgress = useTransform(progress, (value) =>
    reducedMotion ? 0.5 : value,
  );

  useTrackAnimation(trackRef, geometry, renderedProgress, items);

  return (
    <div className="skills-technology-layer" aria-hidden="true">
      <div
        ref={trackRef}
        className="skills-technology-track"
        data-skills-technology-track
      >
        {items.map((item) => (
          <div key={item.id} className="skills-technology-track__item">
            <svg
              className="skills-technology-track__svg"
              preserveAspectRatio="none"
            >
              <defs>
                <path id={`${pathId}-${item.id}`} d={getTrackPath(geometry)} />
              </defs>
              <text
                className="skills-technology-track__label"
                dominantBaseline="central"
                textAnchor="middle"
              >
                <textPath href={`#${pathId}-${item.id}`}>{item.label}</textPath>
              </text>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

type LabelRuntime = {
  element: HTMLDivElement;
  svg: SVGSVGElement;
  textPath: SVGTextPathElement;
  frames: LabelFrames;
  index: number;
  mode: TrackRenderMode | null;
  opacity: number;
  offset: number;
  x: number;
  y: number;
};

function useTrackAnimation(
  trackRef: RefObject<HTMLDivElement | null>,
  geometry: TrackGeometry,
  progress: MotionValue<number>,
  items: readonly SkillEntry[],
) {
  useEffect(() => {
    const track = trackRef.current;

    if (!track || geometry.pathLength <= 0) return;

    let disposed = false;
    let labels: LabelRuntime[] = [];

    const render = () => {
      const value = progress.get();
      const trackFade =
        smoothstep(0, 0.045, value) * (1 - smoothstep(0.955, 1, value));

      for (const label of labels) {
        const itemProgress = getItemProgress(value, label.index, items.length);
        const opacity = getItemOpacity(itemProgress, geometry) * trackFade;

        if (opacity !== label.opacity) {
          label.element.style.opacity = `${opacity}`;
          label.element.style.visibility = opacity > 0 ? "visible" : "hidden";
          label.opacity = opacity;
        }

        // Hidden labels neither move nor invalidate SVG layout. On re-entry,
        // render directly from the current progress, including reverse swipes.
        if (opacity === 0) continue;

        const offset = getTrackOffset(geometry, itemProgress);
        const mode = getTrackRenderMode(geometry, offset, label.frames.halfWidth);
        const viewport = label.frames.viewports[mode];
        const pathOffset =
          mode === "horizontal" || mode === "vertical" ? viewport.offset : offset;
        const x = viewport.x + (mode === "horizontal" ? offset - pathOffset : 0);
        const y = viewport.y + (mode === "vertical" ? offset - pathOffset : 0);

        if (mode !== label.mode) {
          label.element.style.width = `${viewport.width}px`;
          label.element.style.height = `${viewport.height}px`;
          label.svg.setAttribute(
            "viewBox",
            `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`,
          );
          label.mode = mode;
        }

        if (pathOffset !== label.offset) {
          label.textPath.setAttribute("startOffset", `${pathOffset}`);
          label.offset = pathOffset;
        }

        if (x !== label.x || y !== label.y) {
          label.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          label.x = x;
          label.y = y;
        }
      }
    };
    const scheduleRender = () => frame.render(render);
    const measure = () => {
      // Read all font metrics together, only on resize/font load. Straight
      // travel then moves cached, tightly bounded SVGs with HTML transforms;
      // the original textPath still shapes every letter at bends and edges.
      const elements = Array.from(track.children);
      const measurementSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      measurementSvg.setAttribute("width", "1");
      measurementSvg.setAttribute("height", "1");
      measurementSvg.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
      const measurementLabels = elements.map((element, index) => {
        const text = element.querySelector("text")!.cloneNode(false) as SVGTextElement;

        // WebKit can report only the characters currently inside a textPath.
        // Measure unpathed text so an entering label never gets a cropped cache.
        text.textContent = items[index].label;
        measurementSvg.append(text);
        return text;
      });
      track.append(measurementSvg);

      labels = elements.map((element, index) => {
        const svg = element.querySelector("svg")!;
        const text = measurementLabels[index];
        const textPath = svg.querySelector("textPath")!;
        const fontSize = Number.parseFloat(getComputedStyle(text).fontSize);

        return {
          element: element as HTMLDivElement,
          svg,
          textPath,
          frames: createLabelFrames(geometry, text.getComputedTextLength(), fontSize),
          index,
          mode: null,
          opacity: Number.NaN,
          offset: Number.NaN,
          x: Number.NaN,
          y: Number.NaN,
        };
      });
      measurementSvg.remove();
      scheduleRender();
    };
    const scheduleMeasure = () => {
      if (!disposed) frame.read(measure);
    };
    const unsubscribe = progress.on("change", scheduleRender);

    scheduleMeasure();
    void document.fonts.ready.then(scheduleMeasure);
    document.fonts.addEventListener("loadingdone", scheduleMeasure);

    return () => {
      disposed = true;
      unsubscribe();
      cancelFrame(measure);
      cancelFrame(render);
      document.fonts.removeEventListener("loadingdone", scheduleMeasure);
    };
  }, [geometry, items, progress, trackRef]);
}

function useObservedSize<T extends HTMLElement>(targetRef: RefObject<T | null>) {
  const [size, setSize] = useState<ViewportSize>({ height: 0, width: 0 });

  useEffect(() => {
    const target = targetRef.current;

    if (!target) return;

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
