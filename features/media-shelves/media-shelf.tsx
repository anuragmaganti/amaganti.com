"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import Image from "next/image";

import type { MediaShelfDefinition } from "@/config/media-shelves";
import { useInertialHorizontalScroll } from "@/features/media-shelves/use-inertial-horizontal-scroll";

export function MediaShelf({ shelf }: { shelf: MediaShelfDefinition }) {
  const {
    viewportRef,
    isDragging,
    canScrollBackward,
    canScrollForward,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onKeyDown,
    scrollByPage,
  } = useInertialHorizontalScroll();
  const headingId = `media-shelf-${shelf.id}-heading`;
  const instructionsId = `media-shelf-${shelf.id}-instructions`;

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
        <div className="media-shelf__slab" aria-hidden />
        <button
          className="media-shelf__arrow media-shelf__arrow--backward"
          type="button"
          aria-label={`Scroll ${shelf.label.toLowerCase()} backward`}
          disabled={!canScrollBackward}
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
            {shelf.items.map((item, index) => (
              <li className="media-shelf__item" key={item.id}>
                <figure className="media-shelf__artwork">
                  <Image
                    className="media-shelf__cover"
                    src={item.artwork.src}
                    width={item.artwork.width}
                    height={item.artwork.height}
                    sizes="(max-width: 640px) 34vw, (max-width: 1100px) 23vw, 15vw"
                    alt=""
                    draggable={false}
                  />
                  <span className="media-shelf__reflection" aria-hidden>
                    <Image
                      src={item.artwork.src}
                      width={item.artwork.width}
                      height={item.artwork.height}
                      sizes="(max-width: 640px) 34vw, (max-width: 1100px) 23vw, 15vw"
                      alt=""
                      draggable={false}
                    />
                  </span>
                  <figcaption className="sr-only">
                    {index + 1}. {item.title}
                    {item.creator ? ` by ${item.creator}` : ""}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ol>
        </div>
        <button
          className="media-shelf__arrow media-shelf__arrow--forward"
          type="button"
          aria-label={`Scroll ${shelf.label.toLowerCase()} forward`}
          disabled={!canScrollForward}
          onClick={() => scrollByPage(1)}
        >
          <CaretRight aria-hidden weight="regular" />
        </button>
      </div>

      <p className="sr-only" id={instructionsId}>
        Drag horizontally, use a two-finger horizontal trackpad gesture, or use
        the left and right arrow keys to browse the ten ranked items.
      </p>
    </article>
  );
}
