import type { ProjectFieldPresetId } from "@/lib/project-field-presets";

export type ProjectEntry = {
  slug: string;
  title: string;
  summary: string;
  proofs: readonly {
    label: string;
    body: string;
  }[];
  technologies: readonly string[];
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
      "A full-stack voice app that turns text and a custom voice sample into multilingual speech, with billing and saved projects built in.",
    proofs: [
      {
        label: "Built the path from sign-in to generation",
        body: "Built the generation screen, authenticated dashboard, Polar billing, credit system, and saved project history.",
      },
      {
        label: "Deployed multilingual TTS with serverless GPU inference",
        body: "Kept the customer app and account data in Next.js and PostgreSQL, then ran Chatterbox in a separate Python service on Modal’s L40S GPUs.",
      },
      {
        label: "Built a persistent audio pipeline",
        body: "Stored uploaded voice samples and generated audio in S3, with project metadata tied back to each user.",
      },
    ],
    technologies: [
      "Next.js 16",
      "TypeScript",
      "Python",
      "PostgreSQL",
      "Modal",
      "Chatterbox TTS",
      "AWS S3",
    ],
    imageSrc: "/projects/text2speech.jpg",
    imageAlt:
      "Text2Speech dashboard showing text input, language selection, voice upload, and speech generation settings.",
    imageWidth: 1600,
    imageHeight: 1568,
    href: "https://text2speech.dev",
    linkLabel: "Visit Website",
    githubHref: "https://github.com/anuragmaganti/text-to-speech",
    particlePreset: "contour-sheet",
  },
  {
    slug: "project-02",
    title: "ResumeLoomr.com",
    summary:
      "A local-first resume builder where people edit the document directly, organize multiple resumes, and import existing files with AI.",
    proofs: [
      {
        label: "Made the preview the editor",
        body: "People can click text to open its field, drag sections and bullets in place, and see the printable page update immediately.",
      },
      {
        label: "Protected every edit",
        body: "Saved every change to IndexedDB before any network request, then synced through a versioned outbox so stale cloud responses cannot overwrite newer work.",
      },
      {
        label: "Designed for messy input",
        body: "Built a block-first model and source-first import pipeline that preserve custom sections and content from PDF, DOCX, and images.",
      },
    ],
    technologies: [
      "React 19",
      "IndexedDB",
      "dnd-kit",
      "Firebase",
      "Vercel API Routes",
      "Gemini API",
    ],
    imageSrc: "/projects/resumeloomr-v2.jpg",
    imageAlt:
      "ResumeLoomr interface showing a resume editor, section navigation, and live printable resume preview.",
    imageWidth: 1600,
    imageHeight: 1322,
    href: "https://resumeloomr.com/",
    linkLabel: "Visit Website",
    githubHref: "https://github.com/anuragmaganti/ResumeLoomr",
    particlePreset: "torsion-column",
  },
  {
    slug: "project-03",
    title: "WebcamSign.com",
    summary:
      "A browser signature pad controlled with a pinch gesture, tuned so drawing in the air still feels stable and precise.",
    proofs: [
      {
        label: "Turned motion into input",
        body: "Mapped thumb and index landmarks from each webcam frame into pen-down, pen-up, and canvas coordinates.",
      },
      {
        label: "Tamed hand jitter",
        body: "Smoothed the pinch signal and used separate open and close thresholds so the pen stays stable while a hand moves.",
      },
      {
        label: "Kept React off the hot path",
        body: "Processed camera frames with requestAnimationFrame and ref-held state instead of rerendering the UI for every landmark update.",
      },
    ],
    technologies: [
      "React 19",
      "MediaPipe Tasks Vision",
      "WebRTC",
      "Canvas API",
    ],
    imageSrc: "/projects/webcamsign.jpg",
    imageAlt:
      "WebcamSign interface showing a signature canvas, step-by-step signing instructions, live preview, camera controls, and SVG export actions.",
    imageWidth: 1600,
    imageHeight: 1322,
    href: "https://webcamsign.com",
    linkLabel: "Visit Website",
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
