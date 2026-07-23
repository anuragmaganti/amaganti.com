"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { particleVisualConfig } from "@/config/visual";
import {
  generateFallbackFacePoints,
  normalizePositions,
  orientImportedPositions,
  parsePointCloudBuffer,
  samplePositions,
} from "@/lib/point-cloud-asset";

export function usePointCloudSource(maxPoints: number) {
  const [rawAssetPositions, setRawAssetPositions] =
    useState<Float32Array | null>(null);
  const fallbackPositions = useMemo(
    () => generateFallbackFacePoints(maxPoints),
    [maxPoints],
  );

  useEffect(() => {
    const controller = new AbortController();
    const commitPositions = (positions: Float32Array | null) => {
      if (controller.signal.aborted || !positions || !positions.length) {
        return;
      }

      startTransition(() => {
        setRawAssetPositions(positions);
      });
    };

    void fetch(particleVisualConfig.headAsset.path, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Point cloud request failed with ${response.status}`);
        }

        return response.arrayBuffer();
      })
      .then((buffer) => {
        commitPositions(parsePointCloudBuffer(buffer));
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("Falling back to the generated face point cloud.", error);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  return useMemo(() => {
    if (!rawAssetPositions) {
      return fallbackPositions;
    }

    return normalizePositions(
      orientImportedPositions(samplePositions(rawAssetPositions, maxPoints)),
    );
  }, [fallbackPositions, maxPoints, rawAssetPositions]);
}
