import { expect, test } from "@playwright/test";

import { technologySkills } from "../config/skills";
import {
  createLabelFrames,
  createTrackGeometry,
  getItemOpacity,
  getItemProgress,
  getTrackOffset,
  getTrackRenderMode,
  smoothstep,
} from "../lib/skills-technology-layout";
import { expectNoHorizontalOverflow, openPortfolio, scrollToSection } from "./helpers";

test("preserves the original curved lettering through forward and reverse Skills scrolling", async ({ page }) => {
  await openPortfolio(page, { reducedMotion: "no-preference" });
  const size = await page.locator(".skills-technology-track").evaluate((element) => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height };
  });
  const geometry = createTrackGeometry(size);

  // A full-size copy of the original SVG is the reference for individual glyph
  // positions. This catches clipped letters and jumps between cached segments.
  await page.locator(".skills-technology-track").evaluate((track, size) => {
    const reference = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    reference.id = "skills-path-reference";
    reference.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
    reference.style.cssText = `position:fixed;inset:0;width:${size.width}px;height:${size.height}px;visibility:hidden;pointer-events:none`;
    const path = track.querySelector("path")!.cloneNode(true) as SVGPathElement;
    path.id = "skills-reference-path";
    const defs = document.createElementNS(reference.namespaceURI, "defs");
    defs.append(path);
    reference.append(defs);
    for (const label of track.querySelectorAll("text")) {
      const copy = label.cloneNode(true) as SVGTextElement;
      copy.querySelector("textPath")!.setAttribute("href", "#skills-reference-path");
      reference.append(copy);
    }
    document.body.append(reference);
  }, size);

  for (const target of [0.12, 0.3, 0.42, 0.62, 0.82, 0.62, 0.3]) {
    await scrollToSection(page, "skills-stage", target);
    const progress = await page.locator("#skills-stage").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const local = -rect.top / (element.scrollHeight - window.innerHeight);
      return Math.max(0, Math.min(1, (local - 0.06) / 0.88));
    });
    const fade = smoothstep(0, 0.045, progress) * (1 - smoothstep(0.955, 1, progress));
    const expected = technologySkills.map((_, index) => {
      const itemProgress = getItemProgress(progress, index, technologySkills.length);
      return {
        offset: getTrackOffset(geometry, itemProgress),
        opacity: getItemOpacity(itemProgress, geometry) * fade,
      };
    });

    await expect.poll(() => page.evaluate((expected) => {
      const labels = document.querySelectorAll<SVGTextElement>(".skills-technology-track text");
      const references = document.querySelectorAll<SVGTextElement>("#skills-path-reference text");
      let maxError = 0;
      labels.forEach((label, index) => {
        const reference = references[index];
        reference.querySelector("textPath")!.setAttribute("startOffset", `${expected[index].offset}`);
        const wrapper = label.closest(".skills-technology-track__item")!;
        maxError = Math.max(maxError, Math.abs(Number(getComputedStyle(wrapper).opacity) - expected[index].opacity) * 100);
        if (expected[index].opacity < 0.01) return;
        if (label.getNumberOfChars() !== reference.getNumberOfChars()) {
          // While the spring catches up, WebKit may still have some characters
          // outside the path. Wait for the target before comparing glyphs.
          maxError = Number.POSITIVE_INFINITY;
          return;
        }
        const bounds = wrapper.getBoundingClientRect();
        for (let character = 0; character < reference.getNumberOfChars(); character++) {
          const extent = reference.getExtentOfChar(character);
          if (!extent.width || !extent.height) continue;
          const point = label.getStartPositionOfChar(character);
          const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(label.getScreenCTM()!);
          const original = reference.getStartPositionOfChar(character);
          maxError = Math.max(
            maxError,
            Math.hypot(screenPoint.x - original.x, screenPoint.y - original.y),
            Math.abs(label.getRotationOfChar(character) - reference.getRotationOfChar(character)),
            bounds.left - extent.x,
            bounds.top - extent.y,
            extent.x + extent.width - bounds.right,
            extent.y + extent.height - bounds.bottom,
          );
        }
      });
      return maxError;
    }, expected), { timeout: 3000 }).toBeLessThan(0.5);
  }
  await expectNoHorizontalOverflow(page);
});

test("moves straight Skills labels without rewriting their SVG text paths", async ({ page }) => {
  await openPortfolio(page, { reducedMotion: "no-preference" });
  await scrollToSection(page, "skills-stage", 0.5);
  const size = await page.locator(".skills-technology-track").evaluate((element) => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height };
  });
  const geometry = createTrackGeometry(size);
  const metrics = await page.locator(".skills-technology-track text").evaluateAll((labels) =>
    labels.map((label) => ({
      width: (label as SVGTextElement).getComputedTextLength(),
      fontSize: Number.parseFloat(getComputedStyle(label).fontSize),
    })),
  );
  const candidate = metrics.map(({ width, fontSize }, index) => {
    const frames = createLabelFrames(geometry, width, fontSize);
    const from = getItemProgress(0.5, index, technologySkills.length);
    const to = getItemProgress((0.508 - 0.06) / 0.88, index, technologySkills.length);
    const mode = getTrackRenderMode(geometry, getTrackOffset(geometry, from), frames.halfWidth);
    const nextMode = getTrackRenderMode(geometry, getTrackOffset(geometry, to), frames.halfWidth);
    return { index, mode, nextMode, frames, opacity: Math.min(getItemOpacity(from, geometry), getItemOpacity(to, geometry)) };
  }).find(({ mode, nextMode, opacity }) =>
    (mode === "horizontal" || mode === "vertical") && mode === nextMode && opacity > 0.2,
  )!;
  expect(candidate).toBeTruthy();
  const label = page.locator(".skills-technology-track__item").nth(candidate.index);
  await expect(label.locator("textPath")).toHaveAttribute("startOffset", `${candidate.frames.viewports[candidate.mode].offset}`);
  const before = await label.evaluate((element) => ({
    offset: element.querySelector("textPath")!.getAttribute("startOffset"),
    transform: (element as HTMLElement).style.transform,
  }));
  await label.evaluate((element) => {
    element.setAttribute("data-path-writes", "0");
    const observer = new MutationObserver((changes) => {
      const count = Number(element.getAttribute("data-path-writes"));
      element.setAttribute("data-path-writes", `${count + changes.length}`);
    });
    observer.observe(element, { subtree: true, attributes: true, attributeFilter: ["startOffset"] });
  });

  await scrollToSection(page, "skills-stage", 0.508);
  expect(await label.evaluate((element) => (element as HTMLElement).style.transform)).not.toBe(before.transform);
  expect(await label.locator("textPath").getAttribute("startOffset")).toBe(before.offset);
  await expect(label).toHaveAttribute("data-path-writes", "0");
  await expectNoHorizontalOverflow(page);
});
