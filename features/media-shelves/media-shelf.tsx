"use client";

import {
  BookOpenText,
  CaretLeft,
  CaretRight,
  FilmSlate,
  MusicNote,
  type Icon,
} from "@phosphor-icons/react";
import Image from "next/image";

import type {
  MediaShelfDefinition,
  MediaShelfId,
} from "@/config/media-shelves";
import { useInertialHorizontalScroll } from "@/features/media-shelves/use-inertial-horizontal-scroll";

const shelfIcons = {
  songs: MusicNote,
  books: BookOpenText,
  movies: FilmSlate,
} satisfies Record<MediaShelfId, Icon>;

const shelfCopies = [0, 1, 2] as const;

function ShelfItems({
  shelf,
  reflection = false,
}: {
  shelf: MediaShelfDefinition;
  reflection?: boolean;
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
          <figure className="media-shelf__artwork">
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
  const {
    viewportRef,
    reflectionTrackRef,
    isDragging,
    isScrolling,
    activeIndex,
    activeLabelX,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onKeyDown,
    scrollByPage,
  } = useInertialHorizontalScroll(shelf.items.length);
  const headingId = `media-shelf-${shelf.id}-heading`;
  const instructionsId = `media-shelf-${shelf.id}-instructions`;
  const activeItem = shelf.items[activeIndex] ?? shelf.items[0];
  const ShelfIcon = shelfIcons[shelf.id];

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
        <div
          className="media-shelf__active-label"
          data-visible={!isScrolling}
          style={{ left: activeLabelX ?? "50%" }}
          aria-hidden
        >
          <span className="media-shelf__active-label-content" key={activeItem.id}>
            <ShelfIcon aria-hidden weight="regular" />
            <span>{activeItem.title}</span>
          </span>
        </div>
        <button
          className="media-shelf__arrow media-shelf__arrow--backward"
          type="button"
          aria-label={`Scroll ${shelf.label.toLowerCase()} backward`}
          onClick={() => scrollByPage(-1)}
        >
          <CaretLeft aria-hidden weight="regular" />
        </button>
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
        >
          <ol className="media-shelf__track">
            <ShelfItems shelf={shelf} />
          </ol>
        </div>
        <div className="media-shelf__reflection-plane" aria-hidden>
          <ol ref={reflectionTrackRef} className="media-shelf__reflection-track">
            <ShelfItems shelf={shelf} reflection />
          </ol>
        </div>
        <button
          className="media-shelf__arrow media-shelf__arrow--forward"
          type="button"
          aria-label={`Scroll ${shelf.label.toLowerCase()} forward`}
          onClick={() => scrollByPage(1)}
        >
          <CaretRight aria-hidden weight="regular" />
        </button>
      </div>

      <p className="sr-only" id={instructionsId}>
        Drag horizontally, use a two-finger horizontal trackpad gesture, or use
        the left and right arrow keys to browse the endlessly repeating list of
        ten ranked items.
      </p>
    </article>
  );
}
