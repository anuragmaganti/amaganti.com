import type { MediaShelfItem } from "@/config/media/types";

export const MEDIA_ARTWORK_HEIGHTS = [256, 512, 768] as const;

export function getMediaArtworkKey(item: MediaShelfItem) {
  return `${item.kind}:${item.id}`;
}
