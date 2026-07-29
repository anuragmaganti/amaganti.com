import type {
  BookMediaShelfItem,
  MediaArtwork,
  MediaArtworkTuple,
  MovieMediaShelfItem,
  TvShowMediaShelfItem,
} from "@/config/media/types";

type Creators = readonly [string, ...string[]];
type BookInput = Omit<
  BookMediaShelfItem,
  "artwork" | "authors" | "creator" | "kind"
> & {
  artwork: MediaArtworkTuple;
  authors: Creators;
};
type MovieInput = Omit<
  MovieMediaShelfItem,
  "artwork" | "creator" | "directors" | "kind"
> & {
  artwork: string;
  directors: Creators;
};
type TvShowInput = Omit<
  TvShowMediaShelfItem,
  | "artwork"
  | "country"
  | "creator"
  | "creators"
  | "format"
  | "kind"
  | "language"
  | "status"
> & {
  artwork: MediaArtworkTuple;
  country?: string;
  creators: Creators;
  format?: TvShowMediaShelfItem["format"];
  language?: string;
};

const creatorFormatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

function createArtwork([src, width, height]: MediaArtworkTuple): MediaArtwork {
  return { src, width, height };
}

function formatCreators(creators: Creators) {
  return creatorFormatter.format(creators);
}

export function defineBooks(items: readonly BookInput[]) {
  return items.map(
    (item): BookMediaShelfItem => ({
      ...item,
      artwork: createArtwork(item.artwork),
      creator: formatCreators(item.authors),
      kind: "book",
    }),
  );
}

export function defineMovies(items: readonly MovieInput[]) {
  return items.map(
    (item): MovieMediaShelfItem => ({
      ...item,
      artwork: { src: item.artwork, width: 500, height: 750 },
      creator: formatCreators(item.directors),
      kind: "movie",
    }),
  );
}

export function defineTvShows(items: readonly TvShowInput[]) {
  return items.map(
    (item): TvShowMediaShelfItem => ({
      ...item,
      artwork: createArtwork(item.artwork),
      country: item.country ?? "United States",
      creator: formatCreators(item.creators),
      format: item.format ?? "series",
      kind: "tv-show",
      language: item.language ?? "English",
      status: item.endYear === undefined ? "running" : "ended",
    }),
  );
}
