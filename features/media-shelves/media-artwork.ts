import artworkManifest from "@/config/media/artwork-manifest.json";
import { getMediaArtworkKey } from "@/config/media/artwork";
import type {
  MediaArtworkManifest,
  MediaArtworkVariant,
  MediaShelfItem,
} from "@/config/media/types";

type MediaArtworkSources = {
  src: string;
  srcSet: string;
  variants: readonly MediaArtworkVariant[];
};

const manifest = artworkManifest as unknown as MediaArtworkManifest;
const localArtwork = Object.fromEntries(
  Object.entries(manifest).map(([key, variants]) => [
    key,
    {
      src: variants[1]?.[0] ?? variants[0]?.[0] ?? "",
      srcSet: variants
        .map(([src], index) => `${src} ${index + 1}x`)
        .join(", "),
      variants,
    },
  ]),
) as Readonly<Record<string, MediaArtworkSources>>;

export function getMediaArtworkSources(
  item: MediaShelfItem,
): MediaArtworkSources {
  return (
    localArtwork[getMediaArtworkKey(item)] ?? {
      src: item.artwork.src,
      srcSet: "",
      variants: [[item.artwork.src, item.artwork.width, item.artwork.height]],
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

  return variants[densityIndex]?.[0] ?? variants[0]?.[0] ?? item.artwork.src;
}
