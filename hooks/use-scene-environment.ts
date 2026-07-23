"use client";

import { useEffect, useMemo, useState } from "react";

import { particleVisualConfig } from "@/config/visual";

export type PointCloudQualityProfile = {
  noiseMultiplier: number;
  textHaloMultiplier: number;
};

export function usePointCloudQualityProfile(reducedMotion: boolean) {
  return useMemo<PointCloudQualityProfile>(
    () =>
      reducedMotion
        ? particleVisualConfig.quality.reducedMotion
        : particleVisualConfig.quality.standard,
    [reducedMotion],
  );
}

export function useIsDarkTheme() {
  const [isDarkTheme, setIsDarkTheme] = useState(
    () =>
      typeof document === "undefined" ||
      document.documentElement.dataset.theme !== "light",
  );

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      setIsDarkTheme(root.dataset.theme !== "light");
    };
    const observer = new MutationObserver(syncTheme);

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    syncTheme();

    return () => {
      observer.disconnect();
    };
  }, []);

  return isDarkTheme;
}

export function useDevicePixelRatio() {
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);

  useEffect(() => {
    let resolutionQuery: MediaQueryList | null = null;

    const updateDevicePixelRatio = () => {
      const nextDevicePixelRatio = window.devicePixelRatio || 1;

      setDevicePixelRatio((currentDevicePixelRatio) =>
        currentDevicePixelRatio === nextDevicePixelRatio
          ? currentDevicePixelRatio
          : nextDevicePixelRatio,
      );

      resolutionQuery?.removeEventListener(
        "change",
        updateDevicePixelRatio,
      );
      resolutionQuery = window.matchMedia(
        `(resolution: ${nextDevicePixelRatio}dppx)`,
      );
      resolutionQuery.addEventListener("change", updateDevicePixelRatio);
    };

    updateDevicePixelRatio();
    window.addEventListener("resize", updateDevicePixelRatio, {
      passive: true,
    });

    return () => {
      window.removeEventListener("resize", updateDevicePixelRatio);
      resolutionQuery?.removeEventListener(
        "change",
        updateDevicePixelRatio,
      );
    };
  }, []);

  return devicePixelRatio;
}
