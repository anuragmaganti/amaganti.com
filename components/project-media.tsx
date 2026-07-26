"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProjectEntry } from "@/config/projects";

const imageSizes =
  "(max-width: 380px) 86vw, (max-width: 700px) 90vw, (max-width: 1024px) 29rem, (max-width: 1400px) 31rem, 36rem";

export function ProjectMedia({ project }: { project: ProjectEntry }) {
  const [videoFailed, setVideoFailed] = useState(false);

  if (project.video && !videoFailed) {
    return (
      <video
        className="project-card__image project-card__video"
        controls
        playsInline
        preload="metadata"
        poster={project.video.posterSrc.src}
        aria-label={project.video.label}
        onError={() => setVideoFailed(true)}
      >
        <source src={project.video.src} type="video/mp4" />
        <a href={project.video.src}>{project.video.label}</a>
      </video>
    );
  }

  return (
    <Image
      src={project.imageSrc}
      alt={project.imageAlt}
      className="project-card__image"
      loading="eager"
      sizes={imageSizes}
    />
  );
}
