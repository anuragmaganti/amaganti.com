import { expect, test } from "@playwright/test";

import { projects, type ProjectEntry } from "../config/portfolio";
import { portfolioSections } from "../config/sections";
import { themeConfig } from "../config/visual";
import {
  expectNoHorizontalOverflow,
  openPortfolio,
  scrollToSection,
} from "./helpers";

test.describe("portfolio behavior contract", () => {
  test("renders the registry in one accessible DOM order", async ({ page }) => {
    await openPortfolio(page);

    const renderedOrder = await page
      .locator("[data-portfolio-section-id]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-portfolio-section-id")),
      );

    expect(renderedOrder).toEqual(portfolioSections.map((section) => section.id));
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });

  test("defaults to dark and persists an explicit light theme", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(
      (storageKey) => window.localStorage.removeItem(storageKey),
      themeConfig.storageKey,
    );
    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect
      .poll(() =>
        page.evaluate(
          (storageKey) => localStorage.getItem(storageKey),
          themeConfig.storageKey,
        ),
      )
      .toBe("light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("keeps project and contact destinations explicit", async ({ page }) => {
    await openPortfolio(page);

    for (const project of projects as readonly ProjectEntry[]) {
      const card = page.locator(`#${project.slug}`);

      if (project.href && project.linkLabel) {
        await expect(card.getByRole("link", { name: project.linkLabel })).toHaveAttribute(
          "href",
          project.href,
        );
      }

      if (project.githubHref) {
        await expect(card.getByRole("link", { name: "View Source" })).toHaveAttribute(
          "href",
          project.githubHref,
        );
      }
    }

    await scrollToSection(page, "outro", 0.9);
    await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/anuragmaganti",
    );
    await expect(page.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/anuragmaganti/",
    );
    await expect(page.getByRole("link", { name: "Email me" })).toHaveAttribute(
      "href",
      "mailto:amaganti.dev@gmail.com",
    );
  });

  test("fits every project card without a nested scroll trap", async ({ page }) => {
    await openPortfolio(page);

    for (const project of projects) {
      await scrollToSection(page, project.slug);
      const card = page.locator(`#${project.slug} .project-card`);
      const copy = card.locator(".project-card__scroll");
      const cardBox = await card.boundingBox();
      const overflow = await copy.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          overflowX: style.overflowX,
          overflowY: style.overflowY,
        };
      });

      expect(cardBox).not.toBeNull();
      expect(cardBox!.x).toBeGreaterThanOrEqual(-1);
      expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(
        (page.viewportSize()?.width ?? 0) + 1,
      );
      expect(overflow.overflowX).not.toMatch(/auto|scroll/);
      expect(overflow.overflowY).not.toMatch(/auto|scroll/);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("supports fast reverse traversal after Skills", async ({ page }) => {
    await openPortfolio(page);

    for (const project of projects) {
      await scrollToSection(page, project.slug);
      await expect(page.locator(`#${project.slug} .project-card`)).toBeInViewport();
    }

    await scrollToSection(page, "skills-stage", 0.7);

    for (const project of [...projects].reverse()) {
      await scrollToSection(page, project.slug);
      await expect(page.locator(`#${project.slug} .project-card`)).toBeInViewport();
      await expect(page.locator(".scene-frame canvas")).toBeVisible();
    }
  });

  test("honors reduced motion without removing content", async ({ page }) => {
    await openPortfolio(page, { reducedMotion: "reduce" });

    const motionStyles = await page.evaluate(() => ({
      actionAnimation: getComputedStyle(
        document.querySelector(".project-action__label")!,
        "::before",
      ).animationName,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      scrollSnapType: getComputedStyle(document.documentElement).scrollSnapType,
    }));

    expect(motionStyles.actionAnimation).toBe("none");
    expect(motionStyles.scrollBehavior).toBe("auto");
    expect(motionStyles.scrollSnapType).toBe("none");
    await expect(page.getByRole("heading", { name: "About Me" })).toBeAttached();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeAttached();
    await expect(page.getByRole("heading", { name: "Skills" })).toBeAttached();
  });
});
