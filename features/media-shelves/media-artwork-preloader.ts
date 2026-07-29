"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  type RefObject,
} from "react";

import type {
  MediaShelfDefinition,
  MediaShelfItem,
} from "@/config/media/types";
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
  image.onload = image.onerror = resolveLoad;
  image.srcset = sources.srcSet;
  image.src = sources.src;

  const promise = image
    .decode()
    .catch(() => loaded)
    .then(() => undefined);

  artworkRequests.set(src, { image, promise });
  return promise;
}

async function decodeArtworkPool(
  items: readonly MediaShelfItem[],
  concurrency: number,
  priority: ArtworkPriority,
) {
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      await loadAndDecodeArtwork(items[nextIndex++]!, priority);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
}

export function decodeMediaArtwork(items: readonly MediaShelfItem[]) {
  if (typeof window !== "undefined") {
    void decodeArtworkPool(items, items.length, "high");
  }
}

function scheduleIdleWork(callback: () => void) {
  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 2_500 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = globalThis.setTimeout(callback, 600);
  return () => globalThis.clearTimeout(timeoutId);
}

export function useStagedMediaArtworkPreload(
  stageRef: RefObject<HTMLElement | null>,
  shelves: readonly MediaShelfDefinition[],
) {
  const { allItems, initialItems } = useMemo(
    () => ({
      allItems: shelves.flatMap((shelf) => shelf.items),
      initialItems: shelves.flatMap((shelf) => shelf.items.slice(0, 6)),
    }),
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

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          decodeMediaArtwork(initialItems);
          preloadAllArtwork(4, "high");
          observer.disconnect();
        }
      },
      { rootMargin: "250% 0px" },
    );
    const stage = stageRef.current;

    if (stage) {
      observer.observe(stage);
    }

    return () => {
      window.removeEventListener("load", beginIdlePreload);
      cancelIdleWork();
      observer.disconnect();
    };
  }, [initialItems, stageRef]);
}
