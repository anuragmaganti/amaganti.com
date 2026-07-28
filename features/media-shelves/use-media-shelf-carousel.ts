"use client";

import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useNaturalEmblaMotion } from "@/features/media-shelves/use-natural-embla-motion";

type MediaShelfCarouselOptions = {
  onScroll: () => void;
  onSlidesInView: (indexes: readonly number[]) => void;
};

type EmblaCarouselApi = NonNullable<UseEmblaCarouselType[1]>;
type EmblaOptions = NonNullable<Parameters<typeof useEmblaCarousel>[0]>;

function readShelfStartAlignment(viewport: HTMLElement | null) {
  const shelf = viewport?.closest<HTMLElement>(".media-shelf");
  const firstSlide = viewport?.querySelector<HTMLElement>(
    ".media-shelf__item",
  );

  if (!viewport || !shelf || !firstSlide) {
    return 0;
  }

  const viewportMargin = Number.parseFloat(
    getComputedStyle(viewport).marginLeft,
  );
  const itemGap = Number.parseFloat(getComputedStyle(firstSlide).paddingLeft);
  const sideSpaceProbe = document.createElement("span");

  sideSpaceProbe.style.cssText =
    "position:absolute;display:block;visibility:hidden;width:var(--media-shelf-side-space);";
  shelf.append(sideSpaceProbe);
  const sideSpace = sideSpaceProbe.getBoundingClientRect().width;
  sideSpaceProbe.remove();

  return Math.abs(viewportMargin) + sideSpace - itemGap;
}

function syncReflectionTrack(
  emblaApi: EmblaCarouselApi,
  reflectionTrack: HTMLOListElement | null,
) {
  if (!reflectionTrack) {
    return;
  }

  reflectionTrack.style.transform = emblaApi.containerNode().style.transform;
  const slides = emblaApi.slideNodes();
  const reflectionSlides = reflectionTrack.children;

  for (let index = 0; index < reflectionSlides.length; index += 1) {
    const reflectionSlide = reflectionSlides.item(index);
    const slide = slides[index];

    if (reflectionSlide instanceof HTMLElement && slide) {
      reflectionSlide.style.transform = slide.style.transform;
    }
  }
}

function findCatalogBoundarySlide(
  emblaApi: EmblaCarouselApi,
  boundary: "first" | "last",
) {
  const slideIndexes = emblaApi.slideNodes().map((slide) =>
    Number(slide.dataset.mediaItemIndex),
  );
  const catalogIndex =
    boundary === "first" ? Math.min(...slideIndexes) : Math.max(...slideIndexes);

  return slideIndexes.indexOf(catalogIndex);
}

export function useMediaShelfCarousel({
  onScroll,
  onSlidesInView,
}: MediaShelfCarouselOptions) {
  const reducedMotion = Boolean(useReducedMotion());
  const viewportNodeRef = useRef<HTMLDivElement>(null);
  const reflectionTrackRef = useRef<HTMLOListElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const options = useMemo<EmblaOptions>(
    () => ({
      align: () => readShelfStartAlignment(viewportNodeRef.current),
      containScroll: false,
      dragFree: !reducedMotion,
      duration: reducedMotion ? 0 : 25,
      loop: true,
      slidesToScroll: 1,
      startIndex: 1,
      watchDrag: false,
    }),
    [reducedMotion],
  );
  const [emblaViewportRef, emblaApi] = useEmblaCarousel(options);
  const viewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      viewportNodeRef.current = node;
      emblaViewportRef(node);
    },
    [emblaViewportRef],
  );
  const notifyScroll = useEffectEvent(onScroll);
  const notifySlidesInView = useEffectEvent(onSlidesInView);

  useNaturalEmblaMotion(emblaApi, reducedMotion);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const syncReflection = () => {
      syncReflectionTrack(emblaApi, reflectionTrackRef.current);
    };
    const handleScroll = () => {
      syncReflection();
      notifyScroll();
    };
    const handleSlidesInView = () => {
      syncReflection();
      notifySlidesInView(emblaApi.slidesInView());
    };
    const handlePointerDown = () => setIsDragging(true);
    const handlePointerUp = () => setIsDragging(false);

    emblaApi
      .on("scroll", handleScroll)
      .on("slidesInView", handleSlidesInView)
      .on("pointerDown", handlePointerDown)
      .on("pointerUp", handlePointerUp)
      .on("settle", handlePointerUp)
      .on("resize", handleSlidesInView)
      .on("reInit", handleSlidesInView);

    const initialFrame = window.requestAnimationFrame(handleSlidesInView);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      emblaApi
        .off("scroll", handleScroll)
        .off("slidesInView", handleSlidesInView)
        .off("pointerDown", handlePointerDown)
        .off("pointerUp", handlePointerUp)
        .off("settle", handlePointerUp)
        .off("resize", handleSlidesInView)
        .off("reInit", handleSlidesInView);
    };
  }, [emblaApi]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!emblaApi) {
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (event.key === "ArrowLeft") {
        emblaApi.scrollPrev(reducedMotion);
      } else {
        emblaApi.scrollNext(reducedMotion);
      }
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const targetSlide = findCatalogBoundarySlide(
        emblaApi,
        event.key === "Home" ? "first" : "last",
      );

      if (targetSlide >= 0) {
        emblaApi.scrollTo(targetSlide, reducedMotion);
      }
    }
  };

  return {
    emblaApi,
    isDragging,
    onKeyDown,
    reflectionTrackRef,
    viewportRef,
  };
}
