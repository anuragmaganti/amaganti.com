import { defineConfig } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const contractTestFiles = [
  "**/floating-project-layout.spec.ts",
  "**/floating-project-simulation.spec.ts",
  "**/gpu-particle-textures.spec.ts",
  "**/media-catalog.spec.ts",
  "**/particle-obstacle.spec.ts",
  "**/pointer-particle-interaction.spec.ts",
  "**/scene-engine.spec.ts",
];

export default defineConfig({
  testDir: "./tests",
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: isCi ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    colorScheme: "dark",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
  projects: [
    {
      name: "contracts",
      testMatch: contractTestFiles,
    },
    {
      name: "desktop",
      testIgnore: contractTestFiles,
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet",
      testIgnore: contractTestFiles,
      use: { viewport: { width: 768, height: 900 } },
    },
    {
      name: "mobile",
      testIgnore: contractTestFiles,
      use: {
        hasTouch: true,
        isMobile: true,
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
