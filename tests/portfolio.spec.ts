import { expect, test } from "@playwright/test";

import {
  outroLinks,
  projects,
  type ProjectEntry,
} from "../config/portfolio";
import { portfolioSections } from "../config/sections";
import { themeConfig } from "../config/visual";
import {
  expectActiveParticleObstacle,
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

  test("uses the configured default and persists explicit themes", async ({ page }) => {
    const alternateTheme = themeConfig.defaultTheme === "dark" ? "light" : "dark";

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(
      (storageKey) => window.localStorage.removeItem(storageKey),
      themeConfig.storageKey,
    );
    await page.reload();

    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      themeConfig.defaultTheme,
    );
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      alternateTheme,
    );
    await expect
      .poll(() =>
        page.evaluate(
          (storageKey) => localStorage.getItem(storageKey),
          themeConfig.storageKey,
        ),
      )
      .toBe(alternateTheme);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      alternateTheme,
    );

    await page.getByRole("button", { name: "Toggle color theme" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      themeConfig.defaultTheme,
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      themeConfig.defaultTheme,
    );
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
    for (const link of outroLinks) {
      await expect(page.getByRole("link", { name: link.label })).toHaveAttribute(
        "href",
        link.href,
      );
    }
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
      await expectActiveParticleObstacle(page, project.slug);
    }

    await scrollToSection(page, "skills-stage", 0.7);

    for (const project of [...projects].reverse()) {
      await scrollToSection(page, project.slug);
      await expect(page.locator(`#${project.slug} .project-card`)).toBeInViewport();
      await expectActiveParticleObstacle(page, project.slug);
    }
  });

  test("loads and traverses without unexplained browser errors", async ({
    page,
  }) => {
    const problems: string[] = [];

    page.on("console", (message) => {
      if (
        (message.type() === "error" || message.type() === "warning") &&
        !isHeadlessGraphicsReadbackWarning(message.text())
      ) {
        problems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

    await openPortfolio(page, { reducedMotion: "no-preference" });
    await scrollToSection(page, "projects-stage", 0.45);
    await scrollToSection(page, projects.at(-1)!.slug);
    await scrollToSection(page, "skills-stage", 0.7);
    await scrollToSection(page, "outro", 0.78);

    await expect
      .poll(
        () =>
          page.evaluate(
            () => window.__portfolioSceneDiagnostics?.currentPhaseKey,
          ),
        { timeout: 2_500 },
      )
      .toBe("contact");

    const diagnostics = await page.evaluate(
      () => window.__portfolioSceneDiagnostics,
    );

    expect(problems).toEqual([]);
    expect(diagnostics?.frameCount).toBeGreaterThan(1);
  });

  test("reframes the scene after live resize and orientation changes", async (
    { page },
    testInfo,
  ) => {
    test.skip(testInfo.project.name !== "mobile");
    await openPortfolio(page);

    const initialFrameCount = await page.evaluate(
      () => window.__portfolioSceneDiagnostics?.frameCount ?? 0,
    );
    await page.setViewportSize({ width: 844, height: 390 });
    await scrollToSection(page, projects[0].slug);
    await expectNoHorizontalOverflow(page);
    await expectActiveParticleObstacle(page, projects[0].slug);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => window.__portfolioSceneDiagnostics?.frameCount ?? 0,
          ),
        { timeout: 2_000 },
      )
      .toBeGreaterThan(initialFrameCount);

    await page.setViewportSize({ width: 390, height: 844 });
    await scrollToSection(page, "about-stage", 0.3);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps controls keyboard reachable and visibly focused", async ({
    page,
  }) => {
    await openPortfolio(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);

    const themeToggle = page.getByRole("button", { name: "Toggle color theme" });
    await themeToggle.focus();
    await expect(themeToggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await scrollToSection(page, projects[0].slug);
    for (const link of await page.locator(`#${projects[0].slug} .project-action`).all()) {
      await link.focus();
      await expect(link).toBeFocused();
      await expect
        .poll(() => link.evaluate((element) => getComputedStyle(element).outlineWidth))
        .not.toBe("0px");
    }

    await scrollToSection(page, "outro", 0.9);
    for (const link of await page.locator(".outro-contact-label").all()) {
      await link.focus();
      await expect(link).toBeFocused();
    }
  });

  test("enables pointer interaction only for fine pointers", async (
    { page },
    testInfo,
  ) => {
    await openPortfolio(page, { reducedMotion: "no-preference" });

    if (testInfo.project.name === "mobile") {
      await page.locator("body").dispatchEvent("pointermove", {
        pointerType: "touch",
        clientX: 180,
        clientY: 320,
      });
      await page.waitForTimeout(180);

      const pointerPresence = await page.evaluate(
        () => window.__portfolioSceneDiagnostics?.pointerPresence ?? -1,
      );
      expect(pointerPresence).toBe(0);
      return;
    }

    await page.mouse.move(240, 260);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => window.__portfolioSceneDiagnostics?.pointerPresence ?? 0,
          ),
        { timeout: 2_000 },
      )
      .toBeGreaterThan(0.2);
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

function isHeadlessGraphicsReadbackWarning(message: string) {
  return (
    message.includes("GL Driver Message") &&
    message.includes("GPU stall due to ReadPixels")
  );
}
