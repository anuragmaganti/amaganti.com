"use client";

import { useEffect, useRef } from "react";

import type { OutroContactFrame } from "@/lib/viewport-cloud-layout";

type ContactFrame = OutroContactFrame & {
  element: HTMLElement;
  lastBottom: number;
};

export function useOutroContactFrame(invalidate: () => void) {
  const frameRef = useRef<ContactFrame | null>(null);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".outro-contact-overlay-shell");
    const links = shell?.querySelector<HTMLElement>(".outro-contact-overlay");
    if (!shell || !links) return;

    let frameId = 0;
    const measure = () => {
      frameId = 0;
      const styles = getComputedStyle(shell);
      frameRef.current = styles.position === "fixed"
        ? {
            element: shell,
            height: links.offsetHeight,
            bottomInset: Number.parseFloat(styles.paddingBottom) || 0,
            lastBottom: Number.NEGATIVE_INFINITY,
          }
        : null;
      invalidate();
    };
    const scheduleMeasure = () => {
      if (!frameId) frameId = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(links);
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    scheduleMeasure();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      shell.style.removeProperty("--outro-head-bottom");
      frameRef.current = null;
    };
  }, [invalidate]);

  return frameRef;
}
