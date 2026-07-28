import artworkManifest from "@/config/media/artwork-manifest.json";
import type { MediaShelfItem } from "@/config/media/types";

export const MEDIA_ARTWORK_HEIGHTS = [256, 512, 768] as const;

type MediaArtworkVariant = {
  height: number;
  src: string;
  width: number;
};

type MediaArtworkManifestEntry = {
  src: string;
  srcSet: string;
  variants: readonly MediaArtworkVariant[];
};

type MediaArtworkManifest = {
  entries: Readonly<Record<string, MediaArtworkManifestEntry>>;
  version: number;
};

const localArtwork = artworkManifest as MediaArtworkManifest;

export function getMediaArtworkKey(item: MediaShelfItem) {
  return `${item.kind}:${item.id}`;
}

export function getMediaArtworkSources(
  item: MediaShelfItem,
): MediaArtworkManifestEntry {
  return (
    localArtwork.entries[getMediaArtworkKey(item)] ?? {
      src: item.artwork.src,
      srcSet: "",
      variants: [
        {
          height: item.artwork.height,
          src: item.artwork.src,
          width: item.artwork.width,
        },
      ],
    }
  );
}

export function getPreferredMediaArtworkSource(
  item: MediaShelfItem,
  devicePixelRatio = 1,
) {
  const { variants } = getMediaArtworkSources(item);
  const densityIndex = Math.min(
    variants.length - 1,
    Math.max(0, Math.ceil(devicePixelRatio) - 1),
  );

  return variants[densityIndex]?.src ?? variants[0]?.src ?? item.artwork.src;
}
