"use client";

import type { RefObject } from "react";
import { useEffect, useEffectEvent, useMemo } from "react";

import type { MediaShelfDefinition } from "@/config/media-shelves";
import type { MediaShelfItem } from "@/config/media/types";
import {
  getMediaArtworkSources,
  getPreferredMediaArtworkSource,
} from "@/features/media-shelves/media-artwork";

type ArtworkPriority = "high" | "low";

type ArtworkRequest = {
  image: HTMLImageElement;
  promise: Promise<void>;
};

const artworkRequests = new Map<string, ArtworkRequest>();

function getDevicePixelRatio() {
  return Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
}

function loadAndDecodeArtwork(
  item: MediaShelfItem,
  priority: ArtworkPriority,
) {
  const sources = getMediaArtworkSources(item);
  const src = getPreferredMediaArtworkSource(item, getDevicePixelRatio());
  const existingRequest = artworkRequests.get(src);

  if (existingRequest) {
    if (priority === "high") {
      existingRequest.image.fetchPriority = "high";
    }

    return existingRequest.promise;
  }

  const image = new Image();
  let resolveLoad = () => {};
  const loaded = new Promise<void>((resolve) => {
    resolveLoad = resolve;
  });

  image.decoding = "async";
  image.fetchPriority = priority;
  image.onload = resolveLoad;
  image.onerror = resolveLoad;
  if (sources.srcSet) {
    image.srcset = sources.srcSet;
  }
  image.src = sources.src;

  const promise = image
    .decode()
    .catch(() => loaded)
    .then(() => undefined);

  artworkRequests.set(src, { image, promise });
  return promise;
}

export function decodeMediaArtwork(items: readonly MediaShelfItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  for (const item of items) {
    void loadAndDecodeArtwork(item, "high");
  }
}

async function decodeArtworkPool(
  items: readonly MediaShelfItem[],
  concurrency: number,
  priority: ArtworkPriority,
) {
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;

      if (item) {
        await loadAndDecodeArtwork(item, priority);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
}

function scheduleIdleWork(callback: () => void) {
  const idleWindow = window as unknown as {
    cancelIdleCallback?: (id: number) => void;
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number },
    ) => number;
  };

  if (idleWindow.requestIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout: 2_500 });

    return () => idleWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(callback, 600);
  return () => window.clearTimeout(timeoutId);
}

export function useStagedMediaArtworkPreload(
  stageRef: RefObject<HTMLElement | null>,
  shelves: readonly MediaShelfDefinition[],
) {
  const allItems = useMemo(
    () => shelves.flatMap((shelf) => shelf.items),
    [shelves],
  );
  const initialItems = useMemo(
    () => shelves.flatMap((shelf) => shelf.items.slice(0, 6)),
    [shelves],
  );

  const preloadAllArtwork = useEffectEvent(
    (concurrency: number, priority: ArtworkPriority) => {
      void decodeArtworkPool(allItems, concurrency, priority);
    },
  );

  const preloadInitialArtwork = useEffectEvent(() => {
    void decodeArtworkPool(initialItems, 2, "low").then(() => {
      preloadAllArtwork(2, "low");
    });
  });

  useEffect(() => {
    let cancelIdleWork = () => {};
    const beginIdlePreload = () => {
      cancelIdleWork = scheduleIdleWork(preloadInitialArtwork);
    };

    if (document.readyState === "complete") {
      beginIdlePreload();
    } else {
      window.addEventListener("load", beginIdlePreload, { once: true });
    }

    const stage = stageRef.current;
    let observer: IntersectionObserver | null = null;

    if (stage) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            decodeMediaArtwork(initialItems);
            preloadAllArtwork(4, "high");
            observer?.disconnect();
          }
        },
        { rootMargin: "250% 0px" },
      );
    }

    if (stage && observer) {
      observer.observe(stage);
    }

    return () => {
      window.removeEventListener("load", beginIdlePreload);
      cancelIdleWork();
      observer?.disconnect();
    };
  }, [initialItems, stageRef]);
}
