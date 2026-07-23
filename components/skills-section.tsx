"use client";

import { useScroll, useTransform } from "motion/react";
import { useRef, type CSSProperties } from "react";

import {
  getSectionTimelineAttributes,
} from "@/components/portfolio-section-frame";
import { SkillsPrimaryList } from "@/components/skills-primary-list";
import {
  getSkillsScrollHeightVh,
  SkillsTechnologyTrack,
} from "@/components/skills-technology-track";
import { skills, technologySkills } from "@/config/portfolio";
import type { SectionDefinition } from "@/config/sections";
import type { SceneTimeline } from "@/lib/scene-types";
export function SkillsSection({
  section,
  timeline,
}: {
  section: SectionDefinition;
  timeline: SceneTimeline;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const headingId = `${section.id}-heading`;
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const skillsProgress = useTransform(scrollYProgress, [0.06, 0.94], [0, 1]);
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
        <SkillsPrimaryList items={skills} progress={skillsProgress} />
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
