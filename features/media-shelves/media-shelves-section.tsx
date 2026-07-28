"use client";

import { useRef } from "react";

import {
  getSectionTimelineAttributes,
  SectionSnapAnchor,
} from "@/components/portfolio-section-frame";
import { mediaShelves } from "@/config/media-shelves";
import type { CustomSectionRendererProps } from "@/config/custom-sections";
import { useStagedMediaArtworkPreload } from "@/features/media-shelves/media-artwork-preloader";
import { MediaShelf } from "@/features/media-shelves/media-shelf";

export function MediaShelvesSection({
  section,
  timeline,
}: CustomSectionRendererProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const headingId = `${section.id}-heading`;

  useStagedMediaArtworkPreload(stageRef, mediaShelves);

  return (
    <section
      id={section.id}
      className={`scroll-section scroll-section--${section.layout}`}
      aria-labelledby={headingId}
      {...getSectionTimelineAttributes(section, timeline)}
    >
      <SectionSnapAnchor section={section} />
      <h2 className="sr-only" id={headingId}>
        {section.ariaLabel ?? "Media shelves"}
      </h2>
      <div ref={stageRef} className="media-shelves-stage">
        {mediaShelves.map((shelf) => (
          <MediaShelf key={shelf.id} shelf={shelf} />
        ))}
      </div>
    </section>
  );
}
