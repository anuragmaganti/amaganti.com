import type { MotionValue } from "motion";
import type { ComponentType } from "react";

import type { SectionDefinition } from "@/config/sections";
import type { SceneTimeline } from "@/lib/scene-types";

export type CustomSectionRendererProps = {
  section: SectionDefinition;
  progress: MotionValue<number>;
  timeline: SceneTimeline;
};

// Add custom section components here, then reference the key with
// `render: { type: "custom", rendererId: "your-key" }` in `sections.ts`.
export const customSectionRenderers = {} satisfies Record<
  string,
  ComponentType<CustomSectionRendererProps>
>;
