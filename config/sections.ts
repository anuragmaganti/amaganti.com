import {
  projects,
  type ContentSectionId,
  type ProjectEntry,
  type ProjectSlug,
} from "@/config/portfolio";
import type { ScenePresetId } from "@/config/scene-presets";
import type { SceneTransitionEasing } from "@/lib/scene-types";

type SectionLayout =
  | "intro"
  | "transform"
  | "content"
  | "project"
  | "skills"
  | "outro";

export type BuiltInSectionRendererId =
  | "intro"
  | "content"
  | "particle-text"
  | "project-card"
  | "skills"
  | "outro";

type SectionRenderDefinition =
  | { type: "intro" }
  | { type: "content"; contentId: ContentSectionId }
  | { type: "particle-text" }
  | { type: "project-card"; projectSlug: ProjectSlug }
  | { type: "skills" }
  | { type: "outro" }
  | { type: "custom"; rendererId: string };

export type SceneBeatDefinition = {
  key: string;
  presetId: ScenePresetId;
  durationWeight: number;
  transitionEasing: SceneTransitionEasing;
};

export type SectionDefinition = {
  id: string;
  layout: SectionLayout;
  render: SectionRenderDefinition;
  ariaLabel?: string;
  snapLocalProgress?: number;
  sceneBeats: readonly SceneBeatDefinition[];
};

export function defineSection<const Section extends SectionDefinition>(
  section: Section,
) {
  return section;
}

export function sceneBeat(
  key: string,
  presetId: ScenePresetId,
  durationWeight: number,
  transitionEasing: SceneTransitionEasing = "smooth",
): SceneBeatDefinition {
  return { key, presetId, durationWeight, transitionEasing };
}

function createProjectSection<const Project extends ProjectEntry>(
  project: Project,
  projectIndex: number,
): SectionDefinition & { id: Project["slug"] } {
  const currentPresetId = `project-${project.particlePreset}` as ScenePresetId;
  const nextProject = projects[projectIndex + 1];
  const nextPresetId = nextProject
    ? (`project-${nextProject.particlePreset}` as ScenePresetId)
    : currentPresetId;

  return {
    id: project.slug,
    layout: "project",
    render: { type: "project-card", projectSlug: project.slug as ProjectSlug },
    snapLocalProgress: 0,
    sceneBeats: [
      sceneBeat(`project:${project.slug}:hold`, currentPresetId, 18),
      sceneBeat(`project:${project.slug}:handoff`, currentPresetId, 64),
      sceneBeat(`project:${project.slug}:settle`, nextPresetId, 18),
    ],
  };
}

const finalProject = projects.at(-1);

if (!finalProject) {
  throw new Error("At least one project is required to build the section registry.");
}

export const portfolioSections = [
  defineSection({
    id: "intro",
    layout: "intro",
    render: { type: "intro" },
    ariaLabel: "Point cloud introduction",
    sceneBeats: [sceneBeat("intro", "intro-face", 1)],
  }),
  defineSection({
    id: "about-stage",
    layout: "content",
    render: { type: "content", contentId: "about-me" },
    ariaLabel: "About Me",
    snapLocalProgress: 0.3,
    sceneBeats: [
      sceneBeat("about-transform", "about-transform", 44),
      sceneBeat("about-title", "about-title", 112),
    ],
  }),
  defineSection({
    id: "projects-stage",
    layout: "transform",
    render: { type: "particle-text" },
    ariaLabel: "Projects",
    snapLocalProgress: 0.45,
    sceneBeats: [
      sceneBeat("projects-transform", "projects-transform", 50),
      sceneBeat("projects-hero", "projects-hero", 50),
      sceneBeat("projects-reveal", "projects-reveal", 100),
    ],
  }),
  ...projects.map(createProjectSection),
  defineSection({
    id: "skills-stage",
    layout: "skills",
    render: { type: "skills" },
    ariaLabel: "Skills",
    sceneBeats: [
      sceneBeat(
        `project:${finalProject.slug}:skills-handoff`,
        `project-${finalProject.particlePreset}`,
        8,
      ),
      sceneBeat("skills-ambient", "skills-ambient", 92),
    ],
  }),
  defineSection({
    id: "outro",
    layout: "outro",
    render: { type: "outro" },
    ariaLabel: "Contact links",
    sceneBeats: [
      sceneBeat("skills-to-contact", "skills-ambient", 68, "direct"),
      sceneBeat("contact", "outro-face", 32),
    ],
  }),
] as const satisfies readonly SectionDefinition[];

export type SectionId = (typeof portfolioSections)[number]["id"];
