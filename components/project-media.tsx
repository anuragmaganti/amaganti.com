"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { ProjectEntry } from "@/config/projects";
import { observeViewportProximity } from "@/lib/viewport-proximity";

const imageSizes =
  "(max-width: 380px) 86vw, (max-width: 700px) 90vw, (max-width: 1024px) 29rem, (max-width: 1400px) 31rem, 36rem";

export function ProjectMedia({ project }: { project: ProjectEntry }) {
  const [videoFailed, setVideoFailed] = useState(false);

  if (project.video && !videoFailed) {
    return (
      <ProjectVideo
        video={project.video}
        onError={() => setVideoFailed(true)}
      />
    );
  }

  return (
    <Image
      src={project.imageSrc}
      alt={project.imageAlt}
      className="project-card__image"
      loading="lazy"
      sizes={imageSizes}
    />
  );
}

function ProjectVideo({
  video,
  onError,
}: {
  video: NonNullable<ProjectEntry["video"]>;
  onError: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldPreload, setShouldPreload] = useState(false);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    return observeViewportProximity(
      element,
      (isNearViewport) => {
        if (isNearViewport) setShouldPreload(true);
      },
      { marginViewportRatio: 0.75, once: true },
    );
  }, []);

  useEffect(() => {
    if (shouldPreload) videoRef.current?.load();
  }, [shouldPreload]);

  return (
    <video
      ref={videoRef}
      className="project-card__image project-card__video"
      controls
      playsInline
      preload={shouldPreload ? "metadata" : "none"}
      poster={video.posterSrc.src}
      aria-label={video.label}
      onError={onError}
    >
      <source src={video.src} type="video/mp4" />
      <a href={video.src}>{video.label}</a>
    </video>
  );
}
