import { expect, test } from "@playwright/test";

import {
  openPortfolio,
  scrollToSection,
  stableCheckpoints,
  type PortfolioTheme,
} from "./helpers";

const themes: readonly PortfolioTheme[] = ["dark", "light"];

test.describe("stable visual checkpoints", () => {
  for (const theme of themes) {
    test(`captures the complete desktop sequence in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop");
      await openPortfolio(page, { theme });

      for (const checkpoint of stableCheckpoints) {
        await scrollToSection(page, checkpoint.id, checkpoint.progress);
        await expect(page).toHaveScreenshot(`${checkpoint.id}-${theme}.png`, {
          animations: "disabled",
          caret: "hide",
          maxDiffPixelRatio: 0.015,
        });
      }
    });

    test(`captures responsive content and card composition in ${theme} mode`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name === "desktop");
      await openPortfolio(page, { theme });

      for (const checkpoint of [stableCheckpoints[1], stableCheckpoints[3]]) {
        await scrollToSection(page, checkpoint.id, checkpoint.progress);
        await expect(page).toHaveScreenshot(`${checkpoint.id}-${theme}.png`, {
          animations: "disabled",
          caret: "hide",
          maxDiffPixelRatio: 0.015,
        });
      }
    });
  }
});
