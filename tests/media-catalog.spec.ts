import { expect, test } from "@playwright/test";

import {
  mediaShelves,
  mediaShelfSortModes,
} from "../config/media-shelves";
import artworkManifest from "../config/media/artwork-manifest.json";
import type { MediaArtworkManifest } from "../config/media/types";

const artworkEntries = artworkManifest as unknown as MediaArtworkManifest;
const titleCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

test("keeps media catalogs unique, ordered, and locally mirrored", () => {
  for (const shelf of mediaShelves) {
    const ids = shelf.items.map((item) => item.id);
    const mode = mediaShelfSortModes[shelf.id];

    expect(shelf.items.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);

    if (mode === "alphabetical") {
      const titles = shelf.items.map((item) => item.title);
      expect(titles).toEqual([...titles].sort(titleCollator.compare));
    } else if (mode !== "manual") {
      const releaseDates = shelf.items.map(
        (item) => item.releaseDate ?? `${item.releaseYear}-00-00`,
      );
      const expectedDates = [...releaseDates].sort();

      expect(releaseDates).toEqual(
        mode === "newest-first" ? expectedDates.reverse() : expectedDates,
      );
    }
  }

  const catalogItems = mediaShelves.flatMap((shelf) => shelf.items);

  expect(Object.keys(artworkEntries)).toHaveLength(catalogItems.length);
  for (const item of catalogItems) {
    const artwork = artworkEntries[`${item.kind}:${item.id}`];

    expect(artwork).toHaveLength(3);
    expect(
      artwork?.every(([src]) => src.startsWith("/media-shelves/")),
    ).toBe(true);
  }
});
