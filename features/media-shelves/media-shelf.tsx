"use client";

import {
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { MediaShelfDefinition } from "@/config/media-shelves";
import type { MediaShelfItem } from "@/config/media/types";
import {
  getMediaArtworkSources,
} from "@/features/media-shelves/media-artwork";
import { decodeMediaArtwork } from "@/features/media-shelves/media-artwork-preloader";
import { useMediaShelfCarousel } from "@/features/media-shelves/use-media-shelf-carousel";

const UNFADED_EDGE_INSET_PX = 8;
const PRELOAD_NEIGHBOR_COUNT = 2;

type HoveredTitle = {
  title: string;
  x: number;
};

function MediaArtworkImage({
  item,
  reflection = false,
}: {
  item: MediaShelfItem;
  reflection?: boolean;
}) {
  const sources = getMediaArtworkSources(item);

  return (
    // Local variants are generated ahead of time; bypassing Next's optimizer
    // avoids a second transform and lets the browser select by display density.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={
        reflection ? "media-shelf__reflection-image" : "media-shelf__cover"
      }
      src={sources.src}
      srcSet={sources.srcSet || undefined}
      width={item.artwork.width}
      height={item.artwork.height}
      alt=""
      decoding="async"
      fetchPriority="low"
      loading="lazy"
      draggable={false}
    />
  );
}

function ShelfItems({
  items,
  shelf,
  reflection = false,
  onArtworkPointerEnter,
  onArtworkPointerLeave,
}: {
  items: readonly MediaShelfItem[];
  shelf: MediaShelfDefinition;
  reflection?: boolean;
  onArtworkPointerEnter?: (
    event: ReactPointerEvent<HTMLElement>,
    title: string,
  ) => void;
  onArtworkPointerLeave?: () => void;
}) {
  return items.map((item) => {
    const itemIndex = shelf.items.indexOf(item);

    if (reflection) {
      return (
        <li
          className="media-shelf__reflection-item"
          key={`reflection-${item.id}`}
          data-media-item-index={itemIndex}
        >
          <MediaArtworkImage item={item} reflection />
        </li>
      );
    }

    return (
      <li
        className="media-shelf__item"
        key={item.id}
        data-media-item-index={itemIndex}
      >
        <figure
          className="media-shelf__artwork"
          onPointerEnter={(event) =>
            onArtworkPointerEnter?.(event, item.title)
          }
          onPointerLeave={onArtworkPointerLeave}
        >
          <MediaArtworkImage item={item} />
          <figcaption className="sr-only">
            {itemIndex + 1}. {item.title}
            {item.creator ? ` by ${item.creator}` : ""}
          </figcaption>
        </figure>
      </li>
    );
  });
}

function getNearbyItems(
  items: readonly MediaShelfItem[],
  visibleIndexes: readonly number[],
) {
  const nearbyIndexes = new Set<number>();

  for (const visibleIndex of visibleIndexes) {
    for (
      let offset = -PRELOAD_NEIGHBOR_COUNT;
      offset <= PRELOAD_NEIGHBOR_COUNT;
      offset += 1
    ) {
      nearbyIndexes.add(
        (visibleIndex + offset + items.length) % items.length,
      );
    }
  }

  return [...nearbyIndexes].flatMap((index) => items[index] ?? []);
}

function getCarouselItems(shelf: MediaShelfDefinition) {
  const finalItem = shelf.items.at(-1);

  return finalItem ? [finalItem, ...shelf.items.slice(0, -1)] : [];
}

export function MediaShelf({ shelf }: { shelf: MediaShelfDefinition }) {
  const carouselItems = getCarouselItems(shelf);
  const [hoveredTitle, setHoveredTitle] = useState<HoveredTitle | null>(null);
  const {
    isDragging,
    onKeyDown,
    reflectionTrackRef,
    viewportRef,
  } = useMediaShelfCarousel({
    onScroll: () => setHoveredTitle(null),
    onSlidesInView: (indexes) => {
      decodeMediaArtwork(getNearbyItems(carouselItems, indexes));
    },
  });
  const headingId = `media-shelf-${shelf.id}-heading`;
  const instructionsId = `media-shelf-${shelf.id}-instructions`;

  const handleArtworkPointerEnter = (
    event: ReactPointerEvent<HTMLElement>,
    title: string,
  ) => {
    const shelfElement = event.currentTarget.closest<HTMLElement>(
      ".media-shelf",
    );

    if (!shelfElement) {
      return;
    }

    const artworkRect = event.currentTarget.getBoundingClientRect();
    const shelfRect = shelfElement.getBoundingClientRect();
    const isInsideUnfadedBounds =
      artworkRect.left >= shelfRect.left + UNFADED_EDGE_INSET_PX &&
      artworkRect.right <= shelfRect.right - UNFADED_EDGE_INSET_PX;

    setHoveredTitle(
      isInsideUnfadedBounds
        ? {
            title,
            x: artworkRect.left + artworkRect.width / 2 - shelfRect.left,
          }
        : null,
    );
  };

  return (
    <article
      className={`media-shelf media-shelf--${shelf.id}`}
      aria-labelledby={headingId}
      data-media-shelf={shelf.id}
    >
      <header className="media-shelf__header">
        <h3 className="media-shelf__title" id={headingId}>
          {shelf.label}
        </h3>
      </header>

      <div className="media-shelf__display">
        <div className="media-shelf__slab" aria-hidden>
          <span className="media-shelf__surface" />
          <span className="media-shelf__front" />
        </div>
        <span
          className="media-shelf__hover-title"
          data-visible={hoveredTitle !== null}
          style={{ left: hoveredTitle?.x ?? "50%" }}
          aria-hidden
        >
          {hoveredTitle?.title}
        </span>
        <div
          ref={viewportRef}
          className="media-shelf__viewport"
          data-dragging={isDragging}
          role="region"
          tabIndex={0}
          aria-labelledby={headingId}
          aria-describedby={instructionsId}
          onKeyDown={onKeyDown}
        >
          <ol className="media-shelf__track">
            <ShelfItems
              items={carouselItems}
              shelf={shelf}
              onArtworkPointerEnter={handleArtworkPointerEnter}
              onArtworkPointerLeave={() => setHoveredTitle(null)}
            />
          </ol>
        </div>
        <div className="media-shelf__reflection-plane" aria-hidden>
          <ol ref={reflectionTrackRef} className="media-shelf__reflection-track">
            <ShelfItems items={carouselItems} shelf={shelf} reflection />
          </ol>
        </div>
      </div>

      <p className="sr-only" id={instructionsId}>
        Drag horizontally, use a two-finger horizontal trackpad gesture, or use
        the left and right arrow keys to browse the endlessly repeating list of
        {shelf.items.length} items.
      </p>
    </article>
  );
}
