export type MediaShelfId = "books" | "movies" | "tv-shows";

export type MediaShelfSortMode =
  | "oldest-first"
  | "newest-first"
  | "alphabetical"
  | "manual";

export type MediaArtwork = {
  src: string;
  width: number;
  height: number;
};

type BaseMediaShelfItem = {
  id: string;
  title: string;
  creator: string;
  summary: string;
  releaseYear: number;
  releaseDate?: string;
  genres: readonly string[];
  href: string;
  sourceId: string;
  artwork: MediaArtwork;
};

export type BookMediaShelfItem = BaseMediaShelfItem & {
  kind: "book";
  authors: readonly string[];
  publisher: string;
  pageCount: number;
  isbn13: string;
};

export type MovieMediaShelfItem = BaseMediaShelfItem & {
  kind: "movie";
  directors: readonly string[];
  runtimeMinutes: number;
};

export type TvShowMediaShelfItem = BaseMediaShelfItem & {
  kind: "tv-show";
  creators: readonly string[];
  network: string;
  format: "animated series" | "series" | "miniseries";
  language: string;
  country: string;
  status: "running" | "ended";
  endYear?: number;
  runtimeMinutes: number;
  imdbId: string;
};

export type MediaShelfItem =
  | BookMediaShelfItem
  | MovieMediaShelfItem
  | TvShowMediaShelfItem;

export type MediaShelfDefinition = {
  id: MediaShelfId;
  label: string;
  sourceLabel: string;
  sourceUrl: string;
  capturedAt: string;
  items: readonly MediaShelfItem[];
};
