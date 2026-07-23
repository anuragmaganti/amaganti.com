import type { StaticImageData } from "next/image";

import type { ProjectFieldPresetId } from "@/lib/project-field-presets";

const ctrlSayImage = projectImage("/projects/ctrl-say.png", 812, 1060);
const thesisTraceImage = projectImage(
  "/projects/thesistrace.png",
  3146,
  1954,
);
const airInkImage = projectImage("/projects/air-ink.png", 2394, 1424);
const resumeLoomrImage = projectImage(
  "/projects/resumeloomr-v2.png",
  2934,
  1750,
);
const text2SpeechImage = projectImage(
  "/projects/text2speech.png",
  2152,
  1952,
);

function projectImage(
  src: string,
  width: number,
  height: number,
): StaticImageData {
  return { src, width, height };
}

type SiteConfig = {
  name: string;
  shortName: string;
  title: string;
  description: string;
  url: string;
  email: string;
  socialPreview: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
};

export const siteConfig = {
  name: "Anurag Maganti",
  shortName: "Anurag",
  title: "amaganti.com",
  description: "Anurag Maganti's personal website",
  url: "https://amaganti.com",
  email: "amaganti.dev@gmail.com",
  socialPreview: {
    src: "/metadata/metadataImg.png",
    width: 1210,
    height: 778,
    alt: "amaganti.com share preview image",
  },
} as const satisfies SiteConfig;

type IntroContent = {
  greeting: string;
  name: string;
  summary: string;
  note: string;
};

export const introContent = {
  greeting: "Hi, I'm",
  name: siteConfig.shortName,
  summary:
    "a software engineer obsessed with building products that feel a little bit magical",
  note: "(yep, that's a real LIDAR scan of my head)",
} as const satisfies IntroContent;

type PortfolioLink = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
};

export const outroLinks = [
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/anuragmaganti",
    external: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/anuragmaganti/",
    external: true,
  },
  {
    id: "email",
    label: "Email me",
    href: `mailto:${siteConfig.email}`,
    external: false,
  },
  {
    id: "publication",
    label: "Nature publication",
    href: "https://www.nature.com/articles/s41586-018-0697-7",
    external: true,
  },
] as const satisfies readonly PortfolioLink[];

export type ProjectEntry = {
  slug: string;
  title: string;
  summary: string;
  proofs: readonly {
    label: string;
    body: string;
  }[];
  technologies: readonly string[];
  imageSrc: StaticImageData;
  imageAlt: string;
  href?: string;
  linkLabel?: string;
  githubHref?: string;
  particlePreset: ProjectFieldPresetId;
};

export const projects = [
  {
    slug: "project-05",
    title: "Ctrl-Say",
    summary:
      "A native macOS clipboard that lets people save and paste text, images, and files by voice without leaving the app they are working in.",
    proofs: [
      {
        label: "Made voice commands feel immediate",
        body: "Right Option starts listening, complete commands can run from partial on-device transcripts, and the floating HUD confirms each action without taking focus from the current app.",
      },
      {
        label: "Kept everything the user copied",
        body: "Preserved rich text, images, files, mixed content, and multiple pasteboard items instead of flattening every saved slot into plain text.",
      },
      {
        label: "Designed quick recall and long-term storage",
        body: "Numbered and named copies stay in memory for the session, while explicitly permanent copies persist locally with SwiftData and remain paste-ready after relaunch.",
      },
    ],
    technologies: [
      "Swift 6",
      "SwiftUI",
      "AppKit",
      "SpeechAnalyzer",
      "AVFoundation",
      "SwiftData",
      "Core Animation",
    ],
    imageSrc: ctrlSayImage,
    imageAlt:
      "Ctrl-Say floating clipboard showing numbered and named voice-controlled slots for text, an image, and files on macOS.",
    githubHref: "https://github.com/anuragmaganti/Ctrl-Say",
    particlePreset: "torsion-column",
  },
  {
    slug: "project-04",
    title: "ThesisTrace",
    summary:
      "An AI-assisted investment research workspace that finds experts and companies, preserves the evidence behind every result, and carries a market thesis into diligence.",
    proofs: [
      {
        label: "Built a two-stage research pipeline",
        body: "Used Exa to retrieve people, companies, affiliations, and sources, then OpenAI to turn that evidence into Zod-validated candidate records.",
      },
      {
        label: "Added review before database writes",
        body: "Kept generated candidates separate from approved records, with duplicate detection, merge logic, confidence scores, missing fields, and source links preserved through approval.",
      },
      {
        label: "Modeled the full diligence trail",
        body: "Designed the Prisma and PostgreSQL schema for research runs, evidence, expert-company relationships, shortlists, saved developments, call prep, and generated diligence artifacts.",
      },
    ],
    technologies: [
      "Next.js 15",
      "TypeScript",
      "PostgreSQL",
      "Prisma",
      "Exa",
      "OpenAI",
      "Zod",
    ],
    imageSrc: thesisTraceImage,
    imageAlt:
      "ThesisTrace Grid Infrastructure workspace showing recent developments, market coverage, AI research actions, and a market map.",
    href: "https://thesistrace.vercel.app/",
    linkLabel: "Visit Website",
    githubHref: "https://github.com/anuragmaganti/thesistrace",
    particlePreset: "contour-sheet",
  },
  {
    slug: "project-03",
    title: "Air Ink",
    summary:
      "A web app that uses your webcam to track your fingers, letting you draw a signature in the air and export it as an SVG.",
    proofs: [
      {
        label: "Made a pinch behave like a pen",
        body: "Normalized thumb-to-index distance against palm size, then used separate start and release thresholds, time-based confirmation, and tracking-loss recovery to prevent jitter and accidental lines.",
      },
      {
        label: "Kept hand tracking off the main thread",
        body: "Transferred inference-sized video frames to a Web Worker, allowed only one MediaPipe request at a time, and skipped stale frames instead of building input lag.",
      },
      {
        label: "Matched the download to the preview",
        body: "Stored normalized stroke points and shared the same smoothing geometry between incremental Canvas rendering and SVG export, so the saved signature matches what the user drew.",
      },
    ],
    technologies: [
      "React 19",
      "Vite 8",
      "MediaPipe Tasks Vision",
      "WebRTC",
      "Web Workers",
      "Canvas API",
    ],
    imageSrc: airInkImage,
    imageAlt:
      "Air Ink signature studio showing its camera preview, gesture guidance, drawing stage, and download controls.",
    href: "https://webcamsign.com",
    linkLabel: "Visit Website",
    githubHref: "https://github.com/anuragmaganti/air-ink",
    particlePreset: "bloom-fan",
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
    imageSrc: resumeLoomrImage,
    imageAlt:
      "ResumeLoomr interface showing a resume editor, section navigation, and live printable resume preview.",
    href: "https://resumeloomr.com/",
    linkLabel: "Visit Website",
    githubHref: "https://github.com/anuragmaganti/ResumeLoomr",
    particlePreset: "torsion-column",
  },
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
    imageSrc: text2SpeechImage,
    imageAlt:
      "Text2Speech dashboard showing account statistics, generation shortcuts, recent audio projects, and available credits.",
    href: "https://text2speech.dev",
    linkLabel: "Visit Website",
    githubHref: "https://github.com/anuragmaganti/text-to-speech",
    particlePreset: "contour-sheet",
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

export type SkillEntry = {
  id: string;
  label: string;
};

export const skills = [
  { id: "product-engineering", label: "Product Engineering" },
  { id: "full-stack-web", label: "Full-Stack Web" },
  { id: "applied-ai", label: "Applied AI" },
  { id: "systems-integration", label: "Systems Integration" },
  { id: "product-design", label: "Product Design" },
  { id: "interaction-design", label: "Interaction Design" },
] as const satisfies readonly SkillEntry[];

export const technologySkills = [
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "sql", label: "SQL" },
  { id: "html-css", label: "HTML/CSS" },
  { id: "react", label: "React" },
  { id: "nextjs", label: "Next.js" },
  { id: "tailwind-css", label: "Tailwind CSS" },
  { id: "nodejs", label: "Node.js" },
  { id: "expressjs", label: "Express.js" },
  { id: "zod", label: "Zod" },
  { id: "rest-apis", label: "REST APIs" },
  { id: "postgresql", label: "PostgreSQL" },
  { id: "prisma", label: "Prisma" },
  { id: "supabase", label: "Supabase" },
  { id: "neon", label: "Neon" },
  { id: "better-auth", label: "Better Auth" },
  { id: "aws-s3", label: "AWS S3" },
  { id: "vercel", label: "Vercel" },
  { id: "render", label: "Render" },
  { id: "solana", label: "Solana" },
  { id: "llm-api-integration", label: "LLM API Integration" },
] as const satisfies readonly SkillEntry[];

type ContentTextSegment = {
  type: "text";
  text: string;
};

type ContentLinkSegment = {
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
