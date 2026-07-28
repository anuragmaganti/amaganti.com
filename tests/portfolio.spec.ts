import { expect, test } from "@playwright/test";

import {
  mediaShelves,
  mediaShelfSortModes,
} from "../config/media-shelves";
import { projects, type ProjectEntry } from "../config/projects";
import { portfolioSections } from "../config/sections";
import { outroLinks } from "../config/site";
import { themeConfig } from "../config/visual";
import {
  expectActiveParticleObstacle,
  expectNoHorizontalOverflow,
  openPortfolio,
  scrollToSection,
} from "./helpers";

test.describe("portfolio behavior contract", () => {
  test("keeps media catalogs unique and applies their configured order", () => {
    const titleCollator = new Intl.Collator("en", {
      numeric: true,
      sensitivity: "base",
    });

    for (const shelf of mediaShelves) {
      const ids = shelf.items.map((item) => item.id);
      const mode = mediaShelfSortModes[shelf.id];

      expect(shelf.items.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);

      if (mode === "manual") {
        continue;
      }

      if (mode === "alphabetical") {
        const titles = shelf.items.map((item) => item.title);
        const expectedTitles = [...titles].sort(titleCollator.compare);

        expect(titles).toEqual(expectedTitles);
        continue;
      }

      const releaseDates = shelf.items.map(
        (item) => item.releaseDate ?? `${item.releaseYear}-00-00`,
      );
      const expectedReleaseDates = [...releaseDates].sort();

      if (mode === "newest-first") {
        expectedReleaseDates.reverse();
      }

      expect(releaseDates).toEqual(expectedReleaseDates);
    }
  });

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

  test("renders three complete, responsive media shelves", async ({
    page,
  }) => {
    await openPortfolio(page);
    await scrollToSection(page, "media-shelves-stage");

    const section = page.locator("#media-shelves-stage");
    const shelves = section.locator("[data-media-shelf]");

    await expect(shelves).toHaveCount(mediaShelves.length);
    await expectNoHorizontalOverflow(page);

    const sectionGeometry = await section.evaluate((element) => {
      const stage = element.querySelector<HTMLElement>(".media-shelves-stage")!;
      const stageRect = stage.getBoundingClientRect();

      return {
        top: stageRect.top,
        bottom: stageRect.bottom,
        height: stageRect.height,
        viewportHeight: window.innerHeight,
      };
    });

    expect(sectionGeometry.top).toBeGreaterThanOrEqual(-1);
    expect(sectionGeometry.bottom).toBeLessThanOrEqual(
      sectionGeometry.viewportHeight + 1,
    );
    expect(
      sectionGeometry.height / sectionGeometry.viewportHeight,
    ).toBeGreaterThan(0.88);

    for (const shelf of mediaShelves) {
      const shelfElement = section.locator(`[data-media-shelf="${shelf.id}"]`);
      const viewport = shelfElement.locator(".media-shelf__viewport");
      const primaryItems = shelfElement.locator(
        '.media-shelf__item[data-media-copy="primary"]',
      );
      const covers = primaryItems.locator(".media-shelf__cover");

      await expect(shelfElement.getByRole("heading", { name: shelf.label })).toBeVisible();
      await expect(primaryItems).toHaveCount(shelf.items.length);
      await expect(shelfElement.locator(".media-shelf__item")).toHaveCount(
        shelf.items.length * 3,
      );
      await expect(
        shelfElement.locator(".media-shelf__reflection-item"),
      ).toHaveCount(shelf.items.length * 3);
      await expect(covers).toHaveCount(shelf.items.length);
      await expect(viewport).toHaveAttribute("tabindex", "0");
      await expect(shelfElement.locator(".media-shelf__arrow")).toHaveCount(0);
      await expect(
        shelfElement.locator(".media-shelf__active-label"),
      ).toHaveCount(0);
      await expect(shelfElement.locator(".media-shelf__hover-title")).toHaveCount(1);

      const geometry = await shelfElement.evaluate((element) => {
        const shelfViewport = element.querySelector<HTMLElement>(
          ".media-shelf__viewport",
        )!;
        const coverElements = Array.from(
          element.querySelectorAll<HTMLElement>(
            '[data-media-copy="primary"] .media-shelf__cover',
          ),
        );
        const trackItems = Array.from(
          element.querySelectorAll<HTMLElement>(".media-shelf__item"),
        );
        const reflectionItems = Array.from(
          element.querySelectorAll<HTMLElement>(
            ".media-shelf__reflection-item",
          ),
        );
        const measureGapSpread = (items: HTMLElement[]) => {
          const gaps = items.slice(1).map((item, index) => {
            const previousRect = items[index].getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();

            return itemRect.left - previousRect.right;
          });

          return Math.max(...gaps) - Math.min(...gaps);
        };
        const shelfRect = element.getBoundingClientRect();
        const viewportRect = shelfViewport.getBoundingClientRect();
        const reflectionPlaneRect = element
          .querySelector<HTMLElement>(".media-shelf__reflection-plane")!
          .getBoundingClientRect();
        const surfaceRect = element
          .querySelector<HTMLElement>(".media-shelf__surface")!
          .getBoundingClientRect();
        const frontRect = element
          .querySelector<HTMLElement>(".media-shelf__front")!
          .getBoundingClientRect();
        const bottoms = coverElements.map(
          (cover) => cover.getBoundingClientRect().bottom,
        );
        const visibleCovers = coverElements.filter((cover) => {
          const coverRect = cover.getBoundingClientRect();
          const viewportRect = shelfViewport.getBoundingClientRect();

          return (
            coverRect.right > viewportRect.left &&
            coverRect.left < viewportRect.right
          );
        }).length;

        return {
          baselineSpread: Math.max(...bottoms) - Math.min(...bottoms),
          canOverflow: shelfViewport.scrollWidth > shelfViewport.clientWidth,
          coverDepthFraction:
            (Math.min(...bottoms) - surfaceRect.top) / surfaceRect.height,
          frontHeightRatio: frontRect.height / shelfRect.width,
          shelfWidthRatio: shelfRect.width / window.innerWidth,
          surfaceToFrontRatio: surfaceRect.height / frontRect.height,
          viewportBleedsLeft: viewportRect.left < shelfRect.left,
          viewportBleedsRight: viewportRect.right > shelfRect.right,
          reflectionInsideShelf:
            reflectionPlaneRect.left >= shelfRect.left - 1 &&
            reflectionPlaneRect.right <= shelfRect.right + 1 &&
            reflectionPlaneRect.top >= Math.min(...bottoms) - 1 &&
            reflectionPlaneRect.bottom <= surfaceRect.bottom + 1,
          reflectionTrackGapSpread: measureGapSpread(reflectionItems),
          hasSoftEdgeMask:
            getComputedStyle(shelfViewport).maskImage !== "none" ||
            getComputedStyle(shelfViewport).webkitMaskImage !== "none",
          trackGapSpread: measureGapSpread(trackItems),
          visibleCovers,
        };
      });

      expect(geometry.baselineSpread).toBeLessThan(1);
      expect(geometry.canOverflow).toBe(true);
      expect(geometry.coverDepthFraction).toBeGreaterThan(0.22);
      expect(geometry.coverDepthFraction).toBeLessThan(0.28);
      expect(geometry.frontHeightRatio).toBeLessThan(0.035);
      expect(geometry.shelfWidthRatio).toBeGreaterThan(0.82);
      expect(geometry.surfaceToFrontRatio).toBeGreaterThan(0.75);
      expect(geometry.viewportBleedsLeft).toBe(true);
      expect(geometry.viewportBleedsRight).toBe(true);
      expect(geometry.reflectionInsideShelf).toBe(true);
      expect(geometry.reflectionTrackGapSpread).toBeLessThanOrEqual(1);
      expect(geometry.hasSoftEdgeMask).toBe(true);
      expect(geometry.trackGapSpread).toBeLessThanOrEqual(1);
      expect(geometry.visibleCovers).toBeGreaterThanOrEqual(2);
      expect(geometry.visibleCovers).toBeLessThan(shelf.items.length);
    }
  });

  test("wraps every shelf seamlessly in both directions", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
    await openPortfolio(page);
    await scrollToSection(page, "media-shelves-stage");

    const viewport = page.locator(
      '[data-media-shelf="books"] .media-shelf__viewport',
    );
    const cycleWidth = await viewport.evaluate((element) => {
      const firstItems = element.querySelectorAll<HTMLElement>(
        '[data-media-item-index="0"]',
      );

      return firstItems[1].offsetLeft - firstItems[0].offsetLeft;
    });

    await viewport.evaluate((element, cycle) => {
      element.scrollLeft = cycle * 1.51;
      element.dispatchEvent(new Event("scroll"));
    }, cycleWidth);
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeLessThan(cycleWidth);

    await viewport.evaluate((element, cycle) => {
      element.scrollLeft = cycle * 0.49;
      element.dispatchEvent(new Event("scroll"));
    }, cycleWidth);
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(cycleWidth);
    const reflectionAlignment = await viewport.evaluate((element) => {
      const shelf = element.closest<HTMLElement>("[data-media-shelf]")!;
      const primaryItem = element.querySelector<HTMLElement>(
        '[data-media-copy="primary"]',
      )!;
      const primaryItemCount = element.querySelectorAll(
        '[data-media-copy="primary"]',
      ).length;
      const reflectionItem = shelf.querySelectorAll<HTMLElement>(
        ".media-shelf__reflection-item",
      )[primaryItemCount];

      return Math.abs(
        primaryItem.getBoundingClientRect().left -
          reflectionItem.getBoundingClientRect().left,
      );
    });

    expect(reflectionAlignment).toBeLessThan(1);
  });

  test("continues a fast shelf drag with inertia without trapping vertical scroll", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
    await openPortfolio(page, { reducedMotion: "no-preference" });
    await scrollToSection(page, "media-shelves-stage");

    const viewport = page.locator(
      '[data-media-shelf="books"] .media-shelf__viewport',
    );
    const box = await viewport.boundingBox();

    expect(box).not.toBeNull();
    if (!box) {
      return;
    }

    await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.34, box.y + box.height * 0.45, {
      steps: 5,
    });
    await page.mouse.up();

    const cycleWidth = await viewport.evaluate((element) => {
      const firstItems = element.querySelectorAll<HTMLElement>(
        '[data-media-item-index="0"]',
      );

      return firstItems[1].offsetLeft - firstItems[0].offsetLeft;
    });
    const releasedScroll = await viewport.evaluate((element) => element.scrollLeft);
    await page.waitForTimeout(180);
    const inertialScroll = await viewport.evaluate((element) => element.scrollLeft);
    const inertialDistance =
      ((inertialScroll - releasedScroll) % cycleWidth + cycleWidth) % cycleWidth;

    expect(releasedScroll).toBeGreaterThan(20);
    expect(inertialDistance).toBeGreaterThan(4);

    const pageScrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 180);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(pageScrollBefore + 20);
  });

  test("supports shelf keyboard navigation without persistent controls", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
    await openPortfolio(page);
    await scrollToSection(page, "media-shelves-stage");

    const shelf = page.locator('[data-media-shelf="books"]');
    const viewport = shelf.locator(".media-shelf__viewport");
    await expect(shelf.locator("button")).toHaveCount(0);

    await viewport.focus();
    await page.keyboard.press("Home");
    const cycleWidth = await viewport.evaluate((element) => {
      const firstItems = element.querySelectorAll<HTMLElement>(
        '[data-media-item-index="0"]',
      );

      return firstItems[1].offsetLeft - firstItems[0].offsetLeft;
    });
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeCloseTo(cycleWidth, -1);
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() =>
        viewport.evaluate(
          (element, cycle) =>
            ((element.scrollLeft - cycle) % cycle + cycle) % cycle,
          cycleWidth,
        ),
      )
      .toBeGreaterThan(100);
  });

  test("disables post-release shelf inertia for reduced motion", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
    await openPortfolio(page, { reducedMotion: "reduce" });
    await scrollToSection(page, "media-shelves-stage");

    const viewport = page.locator(
      '[data-media-shelf="books"] .media-shelf__viewport',
    );
    const box = await viewport.boundingBox();

    expect(box).not.toBeNull();
    if (!box) {
      return;
    }

    await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.34, box.y + box.height * 0.45, {
      steps: 3,
    });
    await page.mouse.up();

    const releasedScroll = await viewport.evaluate((element) => element.scrollLeft);
    await page.waitForTimeout(180);
    const settledScroll = await viewport.evaluate((element) => element.scrollLeft);

    expect(settledScroll).toBeCloseTo(releasedScroll, 0);
  });

  test("uses the configured default and persists explicit themes", async ({ page }) => {
    const oppositeTheme = {
      dark: "light",
      light: "dark",
    } as const;
    const persistedTheme = oppositeTheme[themeConfig.defaultTheme];

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
      persistedTheme,
    );
    await expect
      .poll(() =>
        page.evaluate(
          (storageKey) => localStorage.getItem(storageKey),
          themeConfig.storageKey,
        ),
      )
      .toBe(persistedTheme);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      persistedTheme,
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

  test("runs project compositor effects only near the active stage", async ({
    page,
  }) => {
    await openPortfolio(page, { reducedMotion: "no-preference" });
    const firstProject = projects[0];
    const firstArena = page.locator(
      `#${firstProject.slug} .project-float-arena`,
    );

    await expect(firstArena).toHaveAttribute("data-active", "false");
    const actionLabel = firstArena.locator(".project-action__label").first();
    const readShimmerAnimation = () =>
      actionLabel.evaluate(
        (element) => getComputedStyle(element, "::before").animationName,
      );

    await expect.poll(readShimmerAnimation).toBe("none");

    await scrollToSection(page, firstProject.slug);
    await expect(firstArena).toHaveAttribute("data-active", "true");
    await expect.poll(readShimmerAnimation).toBe("project-action-shimmer");
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

      if (project.video) {
        const video = card.getByLabel(project.video.label);

        await expect(video).toHaveAttribute("controls", "");
        await expect(video).toHaveAttribute("playsinline", "");
        await expect(video).toHaveAttribute("preload", "none");
        await expect(video).toHaveAttribute("poster", project.video.posterSrc.src);
        await expect(video.locator("source")).toHaveAttribute(
          "src",
          project.video.src,
        );
        await expect(video).not.toHaveAttribute("autoplay", "");

        await scrollToSection(page, project.slug);
        await expect(video).toHaveAttribute("preload", "metadata");
      } else {
        await expect(card.locator("img")).toHaveAttribute("loading", "lazy");
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

  test("fits every floating project card without a nested scroll trap", async ({ page }) => {
    await openPortfolio(page);

    for (const project of projects) {
      await scrollToSection(page, project.slug);
      const cards = page.locator(`#${project.slug} .project-float-card`);
      const copy = page.locator(`#${project.slug} .project-card__scroll`);
      const cardCount = await cards.count();
      const overflow = await copy.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          overflowX: style.overflowX,
          overflowY: style.overflowY,
        };
      });

      expect(cardCount).toBe(3);
      const cardBoxes = await cards.evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
          };
        }),
      );
      const cardScales = await cards.evaluateAll((elements) =>
        elements.map((element) => {
          const matrix = new DOMMatrixReadOnly(
            getComputedStyle(element).transform,
          );
          return Math.hypot(matrix.a, matrix.b);
        }),
      );
      const expectedCardScale =
        (page.viewportSize()?.width ?? Number.POSITIVE_INFINITY) <= 700
          ? 0.9
          : 1;

      for (const box of cardBoxes) {
        expect(box.left).toBeGreaterThanOrEqual(-2);
        expect(box.top).toBeGreaterThanOrEqual(-2);
        expect(box.right).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 2);
        expect(box.bottom).toBeLessThanOrEqual(
          (page.viewportSize()?.height ?? 0) + 2,
        );
      }
      for (const cardScale of cardScales) {
        expect(cardScale).toBeCloseTo(expectedCardScale, 2);
      }
      expect(overflow.overflowX).not.toMatch(/auto|scroll/);
      expect(overflow.overflowY).not.toMatch(/auto|scroll/);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("supports fast reverse traversal after Skills", async ({ page }) => {
    await openPortfolio(page);

    for (const project of projects) {
      await scrollToSection(page, project.slug);
      await expect(page.locator(`#${project.slug} .project-float-stage`)).toBeInViewport();
      await expectActiveParticleObstacle(page, project.slug);
    }

    await scrollToSection(page, "skills-stage", 0.7);

    for (const project of [...projects].reverse()) {
      await scrollToSection(page, project.slug);
      await expect(page.locator(`#${project.slug} .project-float-stage`)).toBeInViewport();
      await expectActiveParticleObstacle(page, project.slug);
    }
  });

  test("keeps overflowing skill labels inside the top fade mask", async (
    { page },
    testInfo,
  ) => {
    test.skip(testInfo.project.name !== "desktop");
    await openPortfolio(page, { theme: "light" });

    const geometry = await page.evaluate(() => {
      const rail = document.querySelector<HTMLElement>(".skills-stage__rail")!;
      const railRect = rail.getBoundingClientRect();
      const style = getComputedStyle(rail);
      const maskWidth = Number.parseFloat(style.maskSize);
      const labels = Array.from(
        document.querySelectorAll<HTMLElement>(".skills-stage__item"),
      ).map((element) => {
        const range = document.createRange();

        range.selectNodeContents(element);
        return {
          label: element.textContent?.trim(),
          right: range.getBoundingClientRect().right,
        };
      });

      return {
        labels,
        maskRepeat: style.maskRepeat,
        maskRight: railRect.left + maskWidth,
        railRight: railRect.right,
      };
    });

    expect(geometry.maskRepeat).toBe("no-repeat");
    expect(geometry.labels.some(({ right }) => right > geometry.railRight)).toBe(
      true,
    );
    for (const label of geometry.labels) {
      expect(label.right, label.label).toBeLessThanOrEqual(
        geometry.maskRight + 1,
      );
    }
  });

  test("registers all three floating cards as particle obstacles", async ({ page }) => {
    await openPortfolio(page);
    const project = projects[0];
    await scrollToSection(page, project.slug);

    await expect
      .poll(
        () =>
          page.evaluate((projectSlug) => {
            const ids = window.__portfolioSceneDiagnostics?.obstacleIds ?? [];
            return ids.filter((id) => id.startsWith(`${projectSlug}:`)).sort();
          }, project.slug),
        { timeout: 2_500 },
      )
      .toEqual([
        `${project.slug}:actions`,
        `${project.slug}:copy`,
        `${project.slug}:media`,
      ]);
  });

  test("supports keyboard repositioning without persisting the layout", async ({
    page,
  }) => {
    await openPortfolio(page);
    const project = projects[0];
    await scrollToSection(page, project.slug);

    const mediaCard = page.locator(
      `#${project.slug} [data-floating-card-role="media"]`,
    );
    const handle = mediaCard.getByRole("button", {
      name: `Move ${project.title} media card`,
    });
    const initialX = Number(await mediaCard.getAttribute("data-physics-x"));

    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(async () => Number(await mediaCard.getAttribute("data-physics-x")))
      .toBeGreaterThan(initialX + 4);

    await page.reload();
    await scrollToSection(page, project.slug);
    const resetX = Number(await mediaCard.getAttribute("data-physics-x"));
    expect(resetX).toBeCloseTo(initialX, 0);
  });

  test("loads and traverses without unexplained browser errors", async ({
    page,
  }) => {
    const problems: string[] = [];

    page.on("console", (message) => {
      if (
        (message.type() === "error" || message.type() === "warning") &&
        !isExpectedDevelopmentWarning(message.text())
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

  test("runs the GPU particle backend through project interactions", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
    const problems: string[] = [];

    page.on("console", (message) => {
      if (
        (message.type() === "error" || message.type() === "warning") &&
        !isExpectedDevelopmentWarning(message.text())
      ) {
        problems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

    await openPortfolio(page, {
      reducedMotion: "no-preference",
      particleBackend: "gpu",
    });
    await expect(page.locator(".scene-frame canvas")).toHaveAttribute(
      "data-particle-backend",
      "gpu",
    );
    await scrollToSection(page, projects[0].slug, 0.5);
    await expectActiveParticleObstacle(page, projects[0].slug);
    await page.mouse.move(240, 260);
    await page.mouse.click(240, 260);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              window.__portfolioSceneDiagnostics?.pressureRippleCount ?? 0,
          ),
        { timeout: 2_000 },
      )
      .toBeGreaterThan(0);
    expect(problems).toEqual([]);
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

  test("gates hover to fine pointers and supports pressure ripples", async (
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

      await page.touchscreen.tap(180, 320);
      await expect
        .poll(
          () =>
            page.evaluate(
              () =>
                window.__portfolioSceneDiagnostics?.pressureRippleCount ?? 0,
            ),
          { timeout: 2_000 },
        )
        .toBeGreaterThan(0);
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

    await page.mouse.click(240, 260);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => window.__portfolioSceneDiagnostics?.pressureRippleCount ?? 0,
          ),
        { timeout: 2_000 },
      )
      .toBeGreaterThan(0);
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

function isExpectedDevelopmentWarning(message: string) {
  return (
    (message.includes("GL Driver Message") &&
      message.includes("GPU stall due to ReadPixels")) ||
    (message.includes("was detected as the Largest Contentful Paint") &&
      message.includes("/projects/") &&
      message.includes('loading="eager"'))
  );
}
