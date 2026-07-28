import { createHash } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { mediaShelves } from "../config/media-shelves";
import type { MediaShelfItem } from "../config/media/types";
import {
  getMediaArtworkKey,
  MEDIA_ARTWORK_HEIGHTS,
} from "../features/media-shelves/media-artwork";

const OUTPUT_ROOT = path.join(process.cwd(), "public", "media-shelves");
const TEMP_ROOT = path.join(
  process.cwd(),
  "public",
  `.media-shelves-${process.pid}`,
);
const MANIFEST_PATH = path.join(
  process.cwd(),
  "config",
  "media",
  "artwork-manifest.json",
);
const DOWNLOAD_CONCURRENCY = 4;

type ArtworkVariant = {
  height: number;
  src: string;
  width: number;
};

type ArtworkManifestEntry = {
  src: string;
  srcSet: string;
  variants: readonly ArtworkVariant[];
};

async function downloadArtwork(item: MediaShelfItem) {
  const response = await fetch(item.artwork.src);

  if (!response.ok) {
    throw new Error(
      `Unable to download ${item.title}: ${response.status} ${response.statusText}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function optimizeArtwork(item: MediaShelfItem) {
  const source = await downloadArtwork(item);
  const outputDirectory = path.join(TEMP_ROOT, item.kind);

  await mkdir(outputDirectory, { recursive: true });

  const variants = await Promise.all(
    MEDIA_ARTWORK_HEIGHTS.map(async (height) => {
      const { data, info } = await sharp(source)
        .rotate()
        .resize({ height, fit: "inside" })
        .webp({ effort: 5, quality: 84, smartSubsample: true })
        .toBuffer({ resolveWithObject: true });
      const outputHash = createHash("sha256")
        .update(data)
        .digest("hex")
        .slice(0, 10);
      const filename = `${item.id}-${outputHash}-${height}.webp`;

      await writeFile(path.join(outputDirectory, filename), data);

      return {
        height: info.height,
        src: `/media-shelves/${item.kind}/${filename}`,
        width: info.width,
      } satisfies ArtworkVariant;
    }),
  );

  return {
    src: variants[1]?.src ?? variants[0]?.src ?? item.artwork.src,
    srcSet: variants
      .map((variant, index) => `${variant.src} ${index + 1}x`)
      .join(", "),
    variants,
  } satisfies ArtworkManifestEntry;
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapValue: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      const value = values[index];

      if (value !== undefined) {
        results[index] = await mapValue(value);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );

  return results;
}

async function main() {
  const items = mediaShelves.flatMap((shelf) => shelf.items);

  await rm(TEMP_ROOT, { force: true, recursive: true });
  await mkdir(TEMP_ROOT, { recursive: true });

  try {
    const optimizedArtwork = await mapWithConcurrency(
      items,
      DOWNLOAD_CONCURRENCY,
      async (item) => [getMediaArtworkKey(item), await optimizeArtwork(item)] as const,
    );
    const manifest = {
      version: 1,
      entries: Object.fromEntries(optimizedArtwork),
    };

    await rm(OUTPUT_ROOT, { force: true, recursive: true });
    await rename(TEMP_ROOT, OUTPUT_ROOT);
    await writeFile(
      MANIFEST_PATH,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    process.stdout.write(
      `Optimized ${items.length} media covers into ${MEDIA_ARTWORK_HEIGHTS.length} local variants each.\n`,
    );
  } catch (error) {
    await rm(TEMP_ROOT, { force: true, recursive: true });
    throw error;
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
