"use client";

import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type NativeShelfRailProps = {
  headingId: string;
  instructionsId: string;
  children: ReactNode;
};

export function NativeShelfRail({
  headingId,
  instructionsId,
  children,
}: NativeShelfRailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current!;
    const catalog = catalogRef.current!;
    let cycleWidth = 0;
    let timer = 0;
    let touching = false;

    const measure = () => {
      const nextWidth = catalog.getBoundingClientRect().width;
      if (!nextWidth || nextWidth === cycleWidth) return;
      const cycles = cycleWidth ? viewport.scrollLeft / cycleWidth : 1;
      cycleWidth = nextWidth;
      viewport.scrollLeft = cycles * cycleWidth;
    };
    // Neighboring copies let the browser finish its native fling. Only move
    // back to the equivalent position in the middle copy after it settles.
    const recenter = () => {
      if (!cycleWidth || touching) return;
      // scrollLeft may be rounded even when the CSS cycle width is fractional.
      const cycle = Math.floor((viewport.scrollLeft + 1) / cycleWidth);
      if (cycle !== 1) viewport.scrollLeft += (1 - cycle) * cycleWidth;
    };
    const scheduleRecenter = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(recenter, 180);
    };
    const touchStart = () => {
      touching = true;
      window.clearTimeout(timer);
    };
    const touchEnd = (event: TouchEvent) => {
      touching = event.touches.length > 0;
      if (!touching) scheduleRecenter();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(catalog);
    const hasScrollEnd = Reflect.has(viewport, "onscrollend");
    if (hasScrollEnd) {
      viewport.addEventListener("scrollend", recenter);
    } else {
      viewport.addEventListener("scroll", scheduleRecenter, { passive: true });
      viewport.addEventListener("touchstart", touchStart, { passive: true });
      viewport.addEventListener("touchend", touchEnd, { passive: true });
      viewport.addEventListener("touchcancel", touchEnd, { passive: true });
    }
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      viewport.removeEventListener("scroll", scheduleRecenter);
      viewport.removeEventListener("scrollend", recenter);
      viewport.removeEventListener("touchstart", touchStart);
      viewport.removeEventListener("touchend", touchEnd);
      viewport.removeEventListener("touchcancel", touchEnd);
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["Home", "End", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const viewport = event.currentTarget;
    const catalog = catalogRef.current!;
    const items = Array.from(
      catalog.children,
      (item) => (item as HTMLElement).offsetLeft,
    );
    if (!items.length) return;
    event.preventDefault();

    const width = catalog.getBoundingClientRect().width;
    if (!width) return;
    const offset = ((viewport.scrollLeft % width) + width) % width;
    const x = width - offset <= 1 ? 0 : offset;
    let target: number;
    if (event.key === "Home") target = 0;
    else if (event.key === "End") target = items[items.length - 1];
    else if (event.key === "ArrowRight")
      target = items.find((left) => left > x + 1) ?? 0;
    else
      target =
        items.filter((left) => left < x - 1).at(-1) ??
        items[items.length - 1];
    viewport.scrollLeft = width + target;
  }

  return (
    <div
      ref={viewportRef}
      className="media-shelf__viewport media-shelf__viewport--native"
      role="region"
      tabIndex={0}
      aria-labelledby={headingId}
      aria-describedby={instructionsId}
      onKeyDown={onKeyDown}
    >
      <div className="media-shelf__cycles">
        {[-1, 0, 1].map((cycle) => (
          <ol
            role="list"
            key={cycle}
            ref={cycle === 0 ? catalogRef : undefined}
            className="media-shelf__track"
            aria-hidden={cycle === 0 ? undefined : true}
          >
            {children}
          </ol>
        ))}
      </div>
    </div>
  );
}
