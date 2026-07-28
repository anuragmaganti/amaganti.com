"use client";

import {
  getSectionTimelineAttributes,
  SectionSnapAnchor,
} from "@/components/portfolio-section-frame";
import { mediaShelves } from "@/config/media-shelves";
import type { CustomSectionRendererProps } from "@/config/custom-sections";
import { MediaShelf } from "@/features/media-shelves/media-shelf";

export function MediaShelvesSection({
  section,
  timeline,
}: CustomSectionRendererProps) {
  const headingId = `${section.id}-heading`;

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
      <div className="media-shelves-stage">
        {mediaShelves.map((shelf) => (
          <MediaShelf key={shelf.id} shelf={shelf} />
        ))}
      </div>
    </section>
  );
}

