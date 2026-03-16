export type ProjectEntry = {
  slug: string;
  title: string;
  summary: string;
  description: string[];
  highlights: string[];
  tags: string[];
  imageSrc: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  href: string;
  linkLabel: string;
};

export const projects: ProjectEntry[] = [
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
      "Next.js",
      "TypeScript",
      "Python",
      "Prisma",
      "Postgres",
      "Better Auth",
      "Polar",
      "AWS S3",
    ],
    imageSrc: "/projects/text2speech.png",
    imageAlt:
      "Text2Speech dashboard showing text input, language selection, voice upload, and speech generation settings.",
    imageWidth: 2412,
    imageHeight: 2364,
    href: "https://text2speech.dev",
    linkLabel: "View Website",
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
    tags: ["React", "JavaScript", "Vite", "CSS", "Local storage"],
    imageSrc: "/projects/resumeloomr-v2.png",
    imageAlt:
      "ResumeLoomr interface showing a resume editor, section navigation, and live printable resume preview.",
    imageWidth: 2860,
    imageHeight: 2364,
    href: "https://resumeloomr.com/",
    linkLabel: "View Website",
  },
  {
    slug: "project-03",
    title: "WebcamSign.com",
    summary:
      "WebcamSign is a React web app that uses MediaPipe hand tracking and webcam input to turn pinch gestures into a real-time signature pad.",
    description: [
      "A thumb-to-index pinch acts as pen down and pen up, letting users draw signatures in the air without touching the screen. Built for smooth performance, it uses requestAnimationFrame, ref-based gesture state, flicker-reducing thresholds, and a canvas synced to the video feed for clean output.",
    ],
    highlights: [
      "Real-time canvas signature rendering from normalized landmarks",
      "Clear and export flow for finished signatures",
      "Performance-aware React patterns for stable gesture input",
    ],
    tags: ["React", "MediaPipe", "HTML Canvas", "WebRTC"],
    imageSrc: "/projects/webcamsign-black.svg",
    imageAlt:
      "Placeholder visual for WebcamSign until a final product screenshot is added.",
    imageWidth: 1600,
    imageHeight: 1200,
    href: "https://webcamsign.com",
    linkLabel: "VIEW WEBSITE",
  },
];
