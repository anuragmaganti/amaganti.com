import type { SectionDefinition } from "@/config/sections";
import type { SceneTimeline } from "@/lib/scene-types";

export function getSectionTimelineAttributes(
  section: SectionDefinition,
  timeline: SceneTimeline,
) {
  const [start, end] = timeline.sectionRanges[section.id];

  return {
    "data-portfolio-section-id": section.id,
    "data-timeline-start": start,
    "data-timeline-end": end,
  };
}

export function SectionSnapAnchor({
  section,
}: {
  section: SectionDefinition;
}) {
  if (section.snapLocalProgress === undefined) {
    return null;
  }

  return (
    <span
      className="section-snap-anchor"
      aria-hidden
      style={{ top: `${section.snapLocalProgress * 100}%` }}
    />
  );
}
