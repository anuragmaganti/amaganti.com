"use client";

import { useRef } from "react";

import {
  themeConfig,
  type PortfolioTheme,
} from "@/config/visual";

const MIN_THEME_TRANSITION_DURATION = 620;
const MAX_THEME_TRANSITION_DURATION = 860;
const THEME_TRANSITION_MS_PER_PIXEL = 0.52;

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition;
};

function applyTheme(theme: PortfolioTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  try {
    window.localStorage.setItem(themeConfig.storageKey, theme);
  } catch {
    // The selected theme still applies when storage is unavailable.
  }
}

function getRevealGeometry(button: HTMLButtonElement | null) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const bounds = button?.getBoundingClientRect();
  const unclampedX = bounds
    ? bounds.left + bounds.width / 2
    : viewportWidth;
  const unclampedY = bounds
    ? bounds.top + bounds.height / 2
    : viewportHeight;
  const originX = Math.min(viewportWidth, Math.max(0, unclampedX));
  const originY = Math.min(viewportHeight, Math.max(0, unclampedY));
  const originXPercent = (originX / viewportWidth) * 100;
  const originYPercent = (originY / viewportHeight) * 100;
  const radius =
    Math.hypot(
      Math.max(originX, viewportWidth - originX),
      Math.max(originY, viewportHeight - originY),
    ) + 2;
  const duration = Math.min(
    MAX_THEME_TRANSITION_DURATION,
    Math.max(
      MIN_THEME_TRANSITION_DURATION,
      radius * THEME_TRANSITION_MS_PER_PIXEL,
    ),
  );

  return { duration, originXPercent, originYPercent };
}

export function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const transitionInProgress = useRef(false);

  const toggleTheme = async () => {
    if (transitionInProgress.current) {
      return;
    }

    const documentTheme = document.documentElement.dataset.theme;
    const currentTheme: PortfolioTheme =
      documentTheme === "light" || documentTheme === "dark"
        ? documentTheme
        : themeConfig.defaultTheme;
    const nextTheme: PortfolioTheme =
      currentTheme === "dark" ? "light" : "dark";
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const transitionDocument = document as ViewTransitionDocument;
    const updateTheme = () => {
      applyTheme(nextTheme);
    };

    if (!transitionDocument.startViewTransition || reducedMotion) {
      updateTheme();
      return;
    }

    transitionInProgress.current = true;

    try {
      const transition = transitionDocument.startViewTransition(updateTheme);
      await transition.ready;
      const { duration, originXPercent, originYPercent } = getRevealGeometry(
        buttonRef.current,
      );
      const revealOrigin = `${originXPercent}% ${originYPercent}%`;

      const reveal = document.documentElement.animate(
        {
          clipPath: [
            `circle(0% at ${revealOrigin})`,
            `circle(150% at ${revealOrigin})`,
          ],
        },
        {
          duration,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );

      await Promise.allSettled([reveal.finished, transition.finished]);
    } catch {
      updateTheme();
    } finally {
      transitionInProgress.current = false;
    }
  };

  return (
    <button
      ref={buttonRef}
      className="theme-toggle"
      type="button"
      aria-label="Toggle color theme"
      onClick={toggleTheme}
    >
      <svg
        className="theme-toggle__icon theme-toggle__icon--sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.28 5.28l1.42 1.42M17.3 17.3l1.42 1.42M18.72 5.28 17.3 6.7M6.7 17.3l-1.42 1.42" />
      </svg>
      <svg
        className="theme-toggle__icon theme-toggle__icon--moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20.25 14.35A8.55 8.55 0 0 1 9.65 3.75a8.55 8.55 0 1 0 10.6 10.6Z" />
      </svg>
    </button>
  );
}
