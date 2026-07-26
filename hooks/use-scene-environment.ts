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

export function resolveScenePixelRatio(
  devicePixelRatio: number,
  coarsePointer: boolean,
) {
  const validDevicePixelRatio =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;

  return coarsePointer
    ? Math.min(
        validDevicePixelRatio,
        particleVisualConfig.rendering.maxCoarsePointerDpr,
      )
    : validDevicePixelRatio;
}

export function useScenePixelRatio() {
  const [scenePixelRatio, setScenePixelRatio] = useState(1);

  useEffect(() => {
    let resolutionQuery: MediaQueryList | null = null;
    const coarsePointerQuery = window.matchMedia(
      "(hover: none) and (pointer: coarse)",
    );

    const updateScenePixelRatio = () => {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const nextScenePixelRatio = resolveScenePixelRatio(
        devicePixelRatio,
        coarsePointerQuery.matches,
      );

      setScenePixelRatio((currentScenePixelRatio) =>
        currentScenePixelRatio === nextScenePixelRatio
          ? currentScenePixelRatio
          : nextScenePixelRatio,
      );

      resolutionQuery?.removeEventListener(
        "change",
        updateScenePixelRatio,
      );
      resolutionQuery = window.matchMedia(
        `(resolution: ${devicePixelRatio}dppx)`,
      );
      resolutionQuery.addEventListener("change", updateScenePixelRatio);
    };

    updateScenePixelRatio();
    window.addEventListener("resize", updateScenePixelRatio, {
      passive: true,
    });
    coarsePointerQuery.addEventListener("change", updateScenePixelRatio);

    return () => {
      window.removeEventListener("resize", updateScenePixelRatio);
      coarsePointerQuery.removeEventListener(
        "change",
        updateScenePixelRatio,
      );
      resolutionQuery?.removeEventListener(
        "change",
        updateScenePixelRatio,
      );
    };
  }, []);

  return scenePixelRatio;
}
