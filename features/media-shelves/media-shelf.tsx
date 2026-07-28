"use client";

import Image from "next/image";
import {
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { MediaShelfDefinition } from "@/config/media-shelves";
import { useInertialHorizontalScroll } from "@/features/media-shelves/use-inertial-horizontal-scroll";

const shelfCopies = [0, 1, 2] as const;
const UNFADED_EDGE_INSET_PX = 8;

type HoveredTitle = {
  title: string;
  x: number;
};

function ShelfItems({
  shelf,
  reflection = false,
  onArtworkPointerEnter,
  onArtworkPointerLeave,
}: {
  shelf: MediaShelfDefinition;
  reflection?: boolean;
  onArtworkPointerEnter?: (
    event: ReactPointerEvent<HTMLElement>,
    title: string,
  ) => void;
  onArtworkPointerLeave?: () => void;
}) {
  return shelfCopies.flatMap((copyIndex) =>
    shelf.items.map((item, itemIndex) => {
      const isPrimaryCopy = copyIndex === 1;

      if (reflection) {
        return (
          <li
            className="media-shelf__reflection-item"
            key={`reflection-${copyIndex}-${item.id}`}
            data-media-item-index={itemIndex}
          >
            <Image
              className="media-shelf__reflection-image"
              src={item.artwork.src}
              width={item.artwork.width}
              height={item.artwork.height}
              sizes="(max-width: 640px) 26vw, (max-width: 1100px) 18vw, 13vw"
              alt=""
              draggable={false}
            />
          </li>
        );
      }

      return (
        <li
          className="media-shelf__item"
          key={`${copyIndex}-${item.id}`}
          data-media-copy={isPrimaryCopy ? "primary" : "clone"}
          data-media-item-index={itemIndex}
          aria-hidden={!isPrimaryCopy}
        >
          <figure
            className="media-shelf__artwork"
            onPointerEnter={(event) =>
              onArtworkPointerEnter?.(event, item.title)
            }
            onPointerLeave={onArtworkPointerLeave}
          >
            <Image
              className="media-shelf__cover"
              src={item.artwork.src}
              width={item.artwork.width}
              height={item.artwork.height}
              sizes="(max-width: 640px) 26vw, (max-width: 1100px) 18vw, 13vw"
              alt=""
              draggable={false}
            />
            <figcaption className="sr-only">
              {itemIndex + 1}. {item.title}
              {item.creator ? ` by ${item.creator}` : ""}
            </figcaption>
          </figure>
        </li>
      );
    }),
  );
}

export function MediaShelf({ shelf }: { shelf: MediaShelfDefinition }) {
  const [hoveredTitle, setHoveredTitle] = useState<HoveredTitle | null>(null);
  const {
    viewportRef,
    reflectionTrackRef,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onKeyDown,
  } = useInertialHorizontalScroll();
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
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onLostPointerCapture={onLostPointerCapture}
          onKeyDown={onKeyDown}
          onScroll={() => setHoveredTitle(null)}
        >
          <ol className="media-shelf__track">
            <ShelfItems
              shelf={shelf}
              onArtworkPointerEnter={handleArtworkPointerEnter}
              onArtworkPointerLeave={() => setHoveredTitle(null)}
            />
          </ol>
        </div>
        <div className="media-shelf__reflection-plane" aria-hidden>
          <ol ref={reflectionTrackRef} className="media-shelf__reflection-track">
            <ShelfItems shelf={shelf} reflection />
          </ol>
        </div>
      </div>

      <p className="sr-only" id={instructionsId}>
        Drag horizontally, use a two-finger horizontal trackpad gesture, or use
        the left and right arrow keys to browse the endlessly repeating list of
        ten ranked items.
      </p>
    </article>
  );
}
