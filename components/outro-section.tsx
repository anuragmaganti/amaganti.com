"use client";

import type { MotionValue } from "motion";
import { motion, useMotionTemplate, useTransform } from "motion/react";

import {
  getSectionTimelineAttributes,
} from "@/components/portfolio-section-frame";
import type { SectionDefinition } from "@/config/sections";
import { outroLinks } from "@/config/site";
import { getTimelineProgressPoint } from "@/lib/scene-timeline";
import type { SceneTimeline } from "@/lib/scene-types";
export function OutroSection({
  section,
  progress,
  timeline,
}: {
  section: SectionDefinition;
  progress: MotionValue<number>;
  timeline: SceneTimeline;
}) {
  const headingId = `${section.id}-heading`;
  const revealStops = [
    getTimelineProgressPoint(timeline, section.id, 0.7),
    getTimelineProgressPoint(timeline, section.id, 0.84),
  ];

  return (
    <section
      id={section.id}
      className={`scroll-section scroll-section--${section.layout}`}
      aria-labelledby={headingId}
      {...getSectionTimelineAttributes(section, timeline)}
    >
      <h2 className="sr-only" id={headingId}>
        Contact
      </h2>
      <div className="section-sticky section-sticky--center">
        <div className="transform-stage transform-stage--outro">
          <OutroContactOverlay progress={progress} revealStops={revealStops} />
        </div>
      </div>
    </section>
  );
}

function OutroContactOverlay({
  progress,
  revealStops,
}: {
  progress: MotionValue<number>;
  revealStops: number[];
}) {
  const opacity = useTransform(progress, revealStops, [0, 1]);
  const blur = useTransform(progress, revealStops, [10, 0]);
  const y = useTransform(progress, revealStops, [18, 0]);
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <div className="outro-contact-overlay-shell">
      <motion.div
        className="outro-contact-overlay"
        style={{ opacity, y, filter }}
      >
        {outroLinks.map((item) => (
          <div
            key={item.label}
            className="outro-contact-overlay__item outro-contact-overlay__item--interactive"
          >
            <a
              className="outro-contact-label outro-contact-label--link"
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
            >
              {item.label}
            </a>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
