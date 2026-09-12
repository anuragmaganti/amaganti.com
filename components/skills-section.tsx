"use client";

import { useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRef, type CSSProperties } from "react";

import {
  getSectionTimelineAttributes,
} from "@/components/portfolio-section-frame";
import { SkillsPrimaryList } from "@/components/skills-primary-list";
import { SkillsTechnologyTrack } from "@/components/skills-technology-track";
import type { SectionDefinition } from "@/config/sections";
import { skills, technologySkills } from "@/config/skills";
import { useSectionScrollProgress } from "@/hooks/use-portfolio-timeline";
import { getSkillsScrollHeightVh } from "@/lib/skills-technology-layout";
import type { SceneTimeline } from "@/lib/scene-types";

export function SkillsSection({
  section,
  timeline,
}: {
  section: SectionDefinition;
  timeline: SceneTimeline;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const headingId = `${section.id}-heading`;
  const scrollYProgress = useSectionScrollProgress(sectionRef, timeline);
  const targetProgress = useTransform(scrollYProgress, [0.06, 0.94], [0, 1]);
  // Share the track's existing easing with the list so a fast swipe does not
  // advance the highlighted skill in abrupt scroll-event-sized steps.
  const skillsProgress = useSpring(targetProgress, {
    damping: 28,
    mass: 0.24,
    stiffness: 115,
  });
  const scrollHeightVh = getSkillsScrollHeightVh(
    technologySkills.length,
    skills.length,
  );
  const sectionStyle = {
    "--skills-scroll-height": `${scrollHeightVh}svh`,
  } as CSSProperties;

  return (
    <section
      ref={sectionRef}
      id={section.id}
      className={`scroll-section scroll-section--${section.layout}`}
      aria-labelledby={headingId}
      style={sectionStyle}
      {...getSectionTimelineAttributes(section, timeline)}
    >
      <SkillsTechnologyTrack items={technologySkills} progress={skillsProgress} />
      <div className="skills-stage">
        <h2 className="skills-stage__title" id={headingId}>
          Skills
        </h2>
        <SkillsPrimaryList
          items={skills}
          progress={reducedMotion ? targetProgress : skillsProgress}
        />
      </div>
      <div className="sr-only">
        <h3>Technologies</h3>
        <ul>
          {technologySkills.map((technology) => (
            <li key={technology.id}>{technology.label}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
