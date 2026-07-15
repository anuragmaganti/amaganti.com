import type { ProjectFieldPresetId } from "@/lib/project-field-presets";

export type ProjectEntry = {
  slug: string;
  title: string;
  summary: string;
  description: readonly string[];
  highlights: readonly string[];
  tags: readonly string[];
  imageSrc: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  href: string;
  linkLabel: string;
  githubHref: string;
  particlePreset: ProjectFieldPresetId;
};

export const projects = [
  {
    slug: "project-01",
    title: "Text2Speech.dev",
    summary:
      "A full-stack AI voice generator for creating realistic speech with custom voices and multilingual support.",
    description: [
      "Under the hood, the product pairs a Next.js app with authentication, credits and billing, persistent project history, file storage, and a Python speech pipeline.",
    ],
    highlights: [
      "Natural TTS generation from typed prompts",
      "Voice cloning from uploaded samples",
      "23-language workflow with voice and style controls",
      "Dashboard for saved audio projects and history",
      "Auth, credits, and upgrade flow for productized use",
    ],
    tags: [
      "TypeScript",
      "Python",
      "Next.js",
      "React",
      "Tailwind",
      "Prisma",
      "Postgres",
      "Better Auth",
      "Polar",
      "AWS S3",
    ],
    imageSrc: "/projects/text2speech.jpg",
    imageAlt:
      "Text2Speech dashboard showing text input, language selection, voice upload, and speech generation settings.",
    imageWidth: 1600,
    imageHeight: 1568,
    href: "https://text2speech.dev",
    linkLabel: "View Website",
    githubHref: "https://github.com/anuragmaganti/text-to-speech",
    particlePreset: "contour-sheet",
  },
  {
    slug: "project-02",
    title: "ResumeLoomr.com",
    summary:
      "A resume builder with structured editing, live preview, and print-ready output in one place.",
    description: [
      "ResumeLoomr lets users build a resume section by section while the final document updates live beside the editor.",
      "It focuses on practical workflow details like autosave, section reordering, template switching, and a clean print flow.",
    ],
    highlights: [
      "Live resume preview that updates as you type",
      "Autosave with visible save-state feedback",
      "Reorderable sections and repeatable entries",
      "Template switching and print-ready output",
    ],
    tags: ["React", "JavaScript", "CSS", "Local storage"],
    imageSrc: "/projects/resumeloomr-v2.jpg",
    imageAlt:
      "ResumeLoomr interface showing a resume editor, section navigation, and live printable resume preview.",
    imageWidth: 1600,
    imageHeight: 1322,
    href: "https://resumeloomr.com/",
    linkLabel: "View Website",
    githubHref: "https://github.com/anuragmaganti/ResumeLoomr",
    particlePreset: "torsion-column",
  },
  {
    slug: "project-03",
    title: "WebcamSign.com",
    summary:
      "WebcamSign is a React web app that uses Google's MediaPipe hand tracking ML model and webcam input to turn pinch gestures into a real-time signature pad.",
    description: [
      "A thumb-to-index pinch acts as pen down and pen up, letting users draw signatures in the air without touching the screen. Built for smooth performance, it uses requestAnimationFrame, ref-based gesture state, flicker-reducing thresholds, and a canvas synced to the video feed for clean output.",
    ],
    highlights: [
      "Real-time canvas signature rendering from normalized landmarks",
      "Clear and export flow for finished signatures",
      "Performance-aware React patterns for stable gesture input",
    ],
    tags: ["React", "JavaScript", "MediaPipe", "HTML Canvas", "WebRTC"],
    imageSrc: "/projects/webcamsign.jpg",
    imageAlt:
      "WebcamSign interface showing a signature canvas, step-by-step signing instructions, live preview, camera controls, and SVG export actions.",
    imageWidth: 1600,
    imageHeight: 1322,
    href: "https://webcamsign.com",
    linkLabel: "View Website",
    githubHref: "https://github.com/anuragmaganti/signature-webcam-draw",
    particlePreset: "bloom-fan",
  },
] as const satisfies readonly ProjectEntry[];

export type ProjectSlug = (typeof projects)[number]["slug"];

export const projectsBySlug = projects.reduce<Record<ProjectSlug, ProjectEntry>>(
  (index, project) => {
    index[project.slug] = project;
    return index;
  },
  {} as Record<ProjectSlug, ProjectEntry>,
);

export type ContentTextSegment = {
  type: "text";
  text: string;
};

export type ContentLinkSegment = {
  type: "link";
  text: string;
  href: string;
  external?: boolean;
};

export type ContentParagraph = {
  id: string;
  segments: readonly (ContentTextSegment | ContentLinkSegment)[];
  reveal: {
    enter: readonly [number, number];
    from: "left" | "right" | "bottom";
    exitTo: "left" | "right";
  };
};

export type ContentSectionEntry = {
  id: string;
  title: string;
  layout: "top-overlay";
  exit: readonly [number, number];
  paragraphs: readonly ContentParagraph[];
};

export const contentSections = [
  {
    id: "about-me",
    title: "About Me",
    layout: "top-overlay",
    exit: [0.58, 0.82],
    paragraphs: [
      {
        id: "systems",
        segments: [
          {
            type: "text",
            text: "I fell in love with interconnected systems as a researcher in cell biology and cancer, where I saw delicate molecular interactions ripple outward and shape the behavior of cellular systems.",
          },
        ],
        reveal: { enter: [-0.22, -0.12], from: "left", exitTo: "right" },
      },
      {
        id: "software",
        segments: [
          {
            type: "text",
            text: "That same fascination drew me to software engineering. I’ve spent the past two years ",
          },
          {
            type: "link",
            text: "building a startup in the digital asset space by creating software for evolving markets.",
            href: "https://www.nuopact.com/",
            external: true,
          },
        ],
        reveal: { enter: [-0.17, -0.07], from: "right", exitTo: "left" },
      },
      {
        id: "curiosity",
        segments: [
          {
            type: "text",
            text: "My journey has been an extension of that same curiosity, a chance to explore how code and people interact and to build tools within systems that are constantly evolving.",
          },
        ],
        reveal: { enter: [-0.12, -0.02], from: "left", exitTo: "right" },
      },
    ],
  },
] as const satisfies readonly ContentSectionEntry[];

export type ContentSectionId = (typeof contentSections)[number]["id"];

export const contentSectionsById = contentSections.reduce<
  Record<ContentSectionId, ContentSectionEntry>
>(
  (index, section) => {
    index[section.id] = section;
    return index;
  },
  {} as Record<ContentSectionId, ContentSectionEntry>,
);
