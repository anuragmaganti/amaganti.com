"use client";

import { useEffect, useRef } from "react";

import type { IntroCopyFrame } from "@/lib/viewport-cloud-layout";

export function useIntroCopyFrame(invalidate: () => void) {
  const frameRef = useRef<IntroCopyFrame | null>(null);

  useEffect(() => {
    let frameId = 0;
    const resizeObserver = new ResizeObserver(() => scheduleSync());
    const mutationObserver = new MutationObserver(() => scheduleSync());

    const syncFrame = () => {
      frameId = 0;
      const stage = document.querySelector<HTMLElement>(".intro-stage");
      const copy = stage?.querySelector<HTMLElement>(".intro-copy");
      const shell = copy?.closest<HTMLElement>(".intro-copy-shell");
      const copyBlocks = copy
        ? Array.from(copy.querySelectorAll<HTMLElement>(".intro-copy-block"))
        : [];

      if (!stage || !copy || !shell || !copyBlocks.length) {
        frameRef.current = null;
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const blockRects = copyBlocks.map((block) => block.getBoundingClientRect());
      const visualLeft = Math.min(...blockRects.map((rect) => rect.left));
      const visualRight = Math.max(...blockRects.map((rect) => rect.right));
      const visualTop = Math.min(...blockRects.map((rect) => rect.top));
      const visualBottom = Math.max(...blockRects.map((rect) => rect.bottom));
      const shellLayoutLeft = stageRect.left + shell.offsetLeft;
      const shellLayoutTop = stageRect.top + shell.offsetTop;
      const left = visualLeft + shellLayoutLeft - shellRect.left;
      const right = visualRight + shellLayoutLeft - shellRect.left;
      const top = visualTop + shellLayoutTop - shellRect.top;
      const bottom = visualBottom + shellLayoutTop - shellRect.top;

      frameRef.current = {
        left,
        right,
        top,
        bottom,
        centered: getComputedStyle(copy).textAlign === "center",
      };
      resizeObserver.observe(stage);
      resizeObserver.observe(copy);
      copyBlocks.forEach((block) => resizeObserver.observe(block));
      invalidate();
    };
    const scheduleSync = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(syncFrame);
    };

    scheduleSync();
    window.addEventListener("resize", scheduleSync, { passive: true });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleSync);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [invalidate]);

  return frameRef;
}
