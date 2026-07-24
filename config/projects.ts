import type { StaticImageData } from "next/image";

import type { FloatingProjectLayoutPresetId } from "@/features/floating-projects/config";
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
  imageSrc: StaticImageData;
  imageAlt: string;
  href?: string;
  linkLabel?: string;
  githubHref?: string;
  floatingLayout: FloatingProjectLayoutPresetId;
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
    imageSrc: projectImage("/projects/ctrl-say.png", 812, 1060),
    imageAlt:
      "Ctrl-Say floating clipboard showing numbered and named voice-controlled slots for text, an image, and files on macOS.",
    githubHref: "https://github.com/anuragmaganti/Ctrl-Say",
    floatingLayout: "high-stagger",
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
    imageSrc: projectImage("/projects/thesistrace.png", 3146, 1954),
    imageAlt:
      "ThesisTrace Grid Infrastructure workspace showing recent developments, market coverage, AI research actions, and a market map.",
    href: "https://thesistrace.vercel.app/",
    linkLabel: "Visit Website",
    githubHref: "https://github.com/anuragmaganti/thesistrace",
    floatingLayout: "low-stagger",
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
    imageSrc: projectImage("/projects/air-ink.png", 2394, 1424),
    imageAlt:
      "Air Ink signature studio showing its camera preview, gesture guidance, drawing stage, and download controls.",
    href: "https://webcamsign.com",
    linkLabel: "Visit Website",
    githubHref: "https://github.com/anuragmaganti/air-ink",
    floatingLayout: "center-stagger",
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
    imageSrc: projectImage("/projects/resumeloomr-v2.png", 2934, 1750),
    imageAlt:
      "ResumeLoomr interface showing a resume editor, section navigation, and live printable resume preview.",
    href: "https://resumeloomr.com/",
    linkLabel: "Visit Website",
    githubHref: "https://github.com/anuragmaganti/ResumeLoomr",
    floatingLayout: "right-balanced",
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
    imageSrc: projectImage("/projects/text2speech.png", 2152, 1952),
    imageAlt:
      "Text2Speech dashboard showing account statistics, generation shortcuts, recent audio projects, and available credits.",
    href: "https://text2speech.dev",
    linkLabel: "Visit Website",
    githubHref: "https://github.com/anuragmaganti/text-to-speech",
    floatingLayout: "left-balanced",
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

function projectImage(
  src: string,
  width: number,
  height: number,
): StaticImageData {
  return { src, width, height };
}
