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
