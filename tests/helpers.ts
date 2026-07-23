import { expect, type Page } from "@playwright/test";

import type { PortfolioTheme } from "../config/visual";

export type { PortfolioTheme } from "../config/visual";

export const stableCheckpoints = [
  { id: "intro", progress: 0 },
  { id: "about-stage", progress: 0.3 },
  { id: "projects-stage", progress: 0.45 },
  { id: "project-05", progress: 0 },
  { id: "skills-stage", progress: 0.42 },
  { id: "outro", progress: 0.78 },
] as const;

export async function openPortfolio(
  page: Page,
  options: {
    reducedMotion?: "no-preference" | "reduce";
    theme?: PortfolioTheme;
  } = {},
) {
  const theme = options.theme ?? "dark";

  await page.emulateMedia({
    colorScheme: theme,
    reducedMotion: options.reducedMotion ?? "reduce",
  });
  await page.addInitScript((initialTheme) => {
    window.localStorage.setItem("portfolio-theme", initialTheme);
  }, theme);

  const pointCloudResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/models/face-points.bin") && response.ok(),
  );

  await page.goto("/");
  await pointCloudResponse;
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete),
  );
  await expect(page.locator(".scene-frame canvas")).toBeVisible();
  await page.waitForTimeout(350);
}

export async function scrollToSection(
  page: Page,
  sectionId: string,
  localProgress = 0,
) {
  const targetScroll = await page
    .locator(`[data-portfolio-section-id="${sectionId}"]`)
    .evaluate((element, requestedProgress) => {
      const section = element as HTMLElement;
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + window.scrollY;
      const travel = Math.max(rect.height - window.innerHeight, 0);
      const progress = Math.max(0, Math.min(1, requestedProgress));
      const target = sectionTop + travel * progress;

      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, target);
      return target;
    }, localProgress);

  await page.waitForFunction(
    (target) => Math.abs(window.scrollY - target) < 2,
    targetScroll,
  );
  await page.waitForTimeout(650);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}
