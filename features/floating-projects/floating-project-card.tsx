"use client";

import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";

import type { FloatingProjectCardRole } from "@/features/floating-projects/config";

export function FloatingProjectCard({
  role,
  projectTitle,
  className,
  style,
  children,
}: {
  role: FloatingProjectCardRole;
  projectTitle: string;
  className: string;
  style: ComponentProps<typeof motion.div>["style"];
  children: ReactNode;
}) {
  return (
    <motion.div
      className={`panel project-float-card ${className}`}
      data-floating-card-role={role}
      style={style}
    >
      <button
        type="button"
        className="project-float-card__handle"
        data-floating-card-handle={role}
        aria-label={`Move ${projectTitle} ${role} card`}
        title="Drag to move. Use arrow keys for precise movement."
      >
        <span aria-hidden />
      </button>
      {children}
    </motion.div>
  );
}
