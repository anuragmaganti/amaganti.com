import { books } from "@/config/media/books";
import { movies } from "@/config/media/movies";
import { tvShows } from "@/config/media/tv-shows";
import type {
  MediaShelfDefinition as ShelfDefinition,
  MediaShelfId as ShelfId,
  MediaShelfItem,
  MediaShelfSortMode,
} from "@/config/media/types";

export type {
  MediaShelfDefinition,
  MediaShelfId,
  MediaShelfItem,
  MediaShelfSortMode,
} from "@/config/media/types";

const capturedAt = "2026-07-28";

export const mediaShelfOrder = ["books", "movies", "tv-shows"] as const;

// Change any value to "newest-first", "alphabetical", or "manual".
// "manual" preserves the order authored in that category's catalog file.
export const mediaShelfSortModes: Readonly<
  Record<ShelfId, MediaShelfSortMode>
> = {
  books: "oldest-first",
  movies: "oldest-first",
  "tv-shows": "oldest-first",
};

const titleCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function compareReleaseDates(a: MediaShelfItem, b: MediaShelfItem) {
  const yearDifference = a.releaseYear - b.releaseYear;

  if (yearDifference !== 0) {
    return yearDifference;
  }

  if (a.releaseDate && b.releaseDate) {
    return a.releaseDate.localeCompare(b.releaseDate);
  }

  return 0;
}

export function sortMediaShelfItems<T extends MediaShelfItem>(
  items: readonly T[],
  mode: MediaShelfSortMode,
): readonly T[] {
  if (mode === "manual") {
    return items;
  }

  return items
    .map((item, manualIndex) => ({ item, manualIndex }))
    .sort((a, b) => {
      let comparison = 0;

      if (mode === "alphabetical") {
        comparison = titleCollator.compare(a.item.title, b.item.title);
      } else {
        comparison = compareReleaseDates(a.item, b.item);

        if (mode === "newest-first") {
          comparison *= -1;
        }
      }

      return comparison || a.manualIndex - b.manualIndex;
    })
    .map(({ item }) => item);
}

const mediaShelfCatalog: Record<ShelfId, ShelfDefinition> = {
  books: {
    id: "books",
    label: "Books",
    sourceLabel: "Open Library",
    sourceUrl: "https://openlibrary.org/dev/docs/api/search",
    capturedAt,
    items: books,
  },
  movies: {
    id: "movies",
    label: "Movies",
    sourceLabel: "The Movie Database (TMDB)",
    sourceUrl: "https://developer.themoviedb.org/reference/movie-details",
    capturedAt,
    items: movies,
  },
  "tv-shows": {
    id: "tv-shows",
    label: "TV Shows",
    sourceLabel: "TVmaze",
    sourceUrl: "https://www.tvmaze.com/api",
    capturedAt,
    items: tvShows,
  },
};

export const mediaShelves: readonly ShelfDefinition[] = mediaShelfOrder.map(
  (id) => {
    const shelf = mediaShelfCatalog[id];

    return {
      ...shelf,
      items: sortMediaShelfItems(shelf.items, mediaShelfSortModes[id]),
    };
  },
);
