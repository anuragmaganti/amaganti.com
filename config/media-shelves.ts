export type MediaShelfId = "books" | "movies" | "tv-shows";

export type MediaShelfItem = {
  id: string;
  title: string;
  creator?: string;
  href: string;
  artwork: {
    src: string;
    width: number;
    height: number;
  };
};

export type MediaShelfDefinition = {
  id: MediaShelfId;
  label: string;
  sourceLabel: string;
  sourceUrl: string;
  capturedAt: string;
  items: readonly MediaShelfItem[];
};

const capturedAt = "2026-07-28";
const mediaShelfOrder = ["books", "movies", "tv-shows"] as const;

function defineShelf(shelf: MediaShelfDefinition) {
  return shelf;
}

function mediaItem(
  id: string,
  title: string,
  creator: string | undefined,
  href: string,
  src: string,
  width: number,
  height: number,
): MediaShelfItem {
  return {
    id,
    title,
    creator,
    href,
    artwork: { src, width, height },
  };
}

const mediaShelfCatalog = [
  defineShelf({
    id: "tv-shows",
    label: "TV Shows",
    sourceLabel: "iTunes Store: Top TV Seasons in the United States",
    sourceUrl: "https://itunes.apple.com/us/rss/toptvseasons/limit=10/json",
    capturedAt,
    items: [
      mediaItem(
        "1889898691",
        "World War II with Tom Hanks, Season 1",
        "World War II with Tom Hanks",
        "https://itunes.apple.com/us/tv-season/world-war-ii-with-tom-hanks-season-1/id1889898691?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video211/v4/41/6a/51/416a513c-c370-2b5c-c2bd-7c37f9b226e1/World_War_II_with_Tom_Hanks_S1_3000x3000.jpg/600x600bb.png",
        600,
        600,
      ),
      mediaItem(
        "1061810188",
        "Knight Rider (Original), The Complete Series",
        "Knight Rider (Original)",
        "https://itunes.apple.com/us/tv-season/knight-rider-original-the-complete-series/id1061810188?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video221/v4/ba/21/01/ba210157-64f4-3ed6-e008-f9991948dbb4/mzl.kdzmrvqf.png/600x600bb.png",
        600,
        600,
      ),
      mediaItem(
        "1834971229",
        "Arcane League of Legends, The Complete Series",
        "Arcane League of Legends",
        "https://itunes.apple.com/us/tv-season/arcane-league-of-legends-the-complete-series/id1834971229?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video211/v4/01/62/bc/0162bc30-d48c-ff5e-d7f7-fb83f2e705b5/ARCN_3000x3000.jpg/600x600bb.png",
        600,
        600,
      ),
      mediaItem(
        "6779321681",
        "Tales from the Crypt, The Complete Original Series",
        "Tales from the Crypt",
        "https://itunes.apple.com/us/tv-season/tales-from-the-crypt-the-complete-original-series/id6779321681?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video211/v4/37/d8/32/37d83242-7081-8acb-6ab3-7379d410a682/TFTC_Bundle_3000x3000_ca__U00281_U0029.png/600x600bb.png",
        600,
        600,
      ),
      mediaItem(
        "1893091452",
        "Rick and Morty, Season 9",
        "Rick and Morty",
        "https://itunes.apple.com/us/tv-season/rick-and-morty-season-9/id1893091452?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video211/v4/9b/4e/c5/9b4ec522-a0a2-86ab-bc51-6d04db97eead/RickMorty_S9_S_KA_TT_3000x3000_300dpi_EN.jpg/600x600bb.png",
        600,
        600,
      ),
      mediaItem(
        "1701118918",
        "Teenage Mutant Ninja Turtles (1987), The Complete Series",
        "Teenage Mutant Ninja Turtles (1987)",
        "https://itunes.apple.com/us/tv-season/teenage-mutant-ninja-turtles-1987-the-complete-series/id1701118918?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video126/v4/12/ea/05/12ea0538-e0eb-8999-963c-4ba4937755cd/dfdcf405-09f6-43bd-855a-c56da63356a4_TMNT_CL_Bundle_ITUNES_COVER_ART_3000x3000.jpg/600x600bb.png",
        600,
        600,
      ),
      mediaItem(
        "6788493540",
        "President Curtis, Season 1",
        "President Curtis",
        "https://itunes.apple.com/us/tv-season/president-curtis-season-1/id6788493540?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video211/v4/d8/36/21/d83621c4-38b5-c7f6-2689-eccf1abbd534/PresidentCurtis_S1_S_KA_TT_3000x3000_300dpi_EN.jpg/600x600bb.png",
        600,
        600,
      ),
      mediaItem(
        "1438574362",
        "House: The Complete Series",
        "House",
        "https://itunes.apple.com/us/tv-season/house-the-complete-series/id1438574362?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video118/v4/43/8a/36/438a3696-ce52-eca4-080f-4133d1ac57d2/mzl.sclfonxk.lsr/600x600bb.png",
        600,
        600,
      ),
      mediaItem(
        "6792876570",
        "The Walking Dead: Dead City, Season 3",
        "The Walking Dead: Dead City",
        "https://itunes.apple.com/us/tv-season/the-walking-dead-dead-city-season-3/id6792876570?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video221/v4/60/18/89/601889d2-436b-1471-b241-a63c6bfd7af8/iTunes_3000x3000.png/600x600bb.png",
        600,
        600,
      ),
      mediaItem(
        "6787311097",
        "Reacher, Season 3",
        "Reacher",
        "https://itunes.apple.com/us/tv-season/reacher-season-3/id6787311097?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video211/v4/5c/da/3d/5cda3d5e-1073-4341-6f79-57a7cc3790c1/Reacher_S03_CoverArt_3000x3000.png/600x600bb.png",
        600,
        600,
      ),
    ],
  }),
  defineShelf({
    id: "books",
    label: "Books",
    sourceLabel: "Apple Books: Top Paid Books in the United States",
    sourceUrl:
      "https://rss.marketingtools.apple.com/api/v2/us/books/top-paid/10/books.json",
    capturedAt,
    items: [
      mediaItem(
        "6755203836",
        "Backtrack",
        "Marc Cameron",
        "https://books.apple.com/us/book/backtrack/id6755203836",
        "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/1b/08/ad/1b08ad50-0381-cd0e-9cee-f20908c0ecda/9781496752758.jpg/420x638bb.png",
        420,
        638,
      ),
      mediaItem(
        "6754621092",
        "Getting Away with Murder",
        "Shari Lapena",
        "https://books.apple.com/us/book/getting-away-with-murder/id6754621092",
        "https://is1-ssl.mzstatic.com/image/thumb/Publication221/v4/54/08/53/54085344-d474-bf14-828c-fa38c8415506/9780593832486.d.jpg/420x634bb.png",
        420,
        634,
      ),
      mediaItem(
        "6753977559",
        "Ransom",
        "Daniel Silva",
        "https://books.apple.com/us/book/ransom/id6753977559",
        "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/a8/9d/ac/a89dacdd-331a-d880-8c3f-4acfac2de03c/9780063384262.jpg/420x634bb.png",
        420,
        634,
      ),
      mediaItem(
        "6754252697",
        "Meet Me in Paris",
        "Kristin Harmel",
        "https://books.apple.com/us/book/meet-me-in-paris/id6754252697",
        "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/58/b3/07/58b30784-2bf0-b82f-3e4c-9c9595651b3f/9781668092552.jpg/420x634bb.png",
        420,
        634,
      ),
      mediaItem(
        "6756187808",
        "Just a Little Tempted",
        "Carly Phillips",
        "https://books.apple.com/us/book/just-a-little-tempted/id6756187808",
        "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/71/6b/23/716b23b7-b20d-3ed4-223a-fd94ac845d3a/234dbbfe-8358-4e08-902b-b457145b5f5c_cover_image.jpg/420x693bb.png",
        420,
        693,
      ),
      mediaItem(
        "6742906151",
        "The Calamity Club",
        "Kathryn Stockett",
        "https://books.apple.com/us/book/the-calamity-club/id6742906151",
        "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/39/64/45/3964459f-f5f3-d0b9-8623-d792b4ee584d/9781954118829.jpg/420x634bb.png",
        420,
        634,
      ),
      mediaItem(
        "6753592922",
        "Theo of Golden",
        "Allen Levi",
        "https://books.apple.com/us/book/theo-of-golden/id6753592922",
        "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/ca/94/ee/ca94ee35-57c1-9f26-2a89-7530f60797ac/9781668236536.jpg/420x638bb.png",
        420,
        638,
      ),
      mediaItem(
        "6753892862",
        "Whistler",
        "Ann Patchett",
        "https://books.apple.com/us/book/whistler/id6753892862",
        "https://is1-ssl.mzstatic.com/image/thumb/Publication221/v4/e1/f4/a5/e1f4a502-9136-f220-0c92-facdfaa78e58/9780063511651.jpg/420x638bb.png",
        420,
        638,
      ),
      mediaItem(
        "6754621648",
        "Biological War",
        "Annie Jacobsen",
        "https://books.apple.com/us/book/biological-war/id6754621648",
        "https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/97/13/46/9713469e-4c3d-0c9d-a215-96613012fdbc/9798217046041.d.jpg/420x634bb.png",
        420,
        634,
      ),
      mediaItem(
        "6753333148",
        "Ravenous",
        "Kresley Cole",
        "https://books.apple.com/us/book/ravenous/id6753333148",
        "https://is1-ssl.mzstatic.com/image/thumb/Publication221/v4/a7/fd/c7/a7fdc7ba-d7a2-dca7-331a-d1fada09bc58/9781464279324.jpg/420x630bb.png",
        420,
        630,
      ),
    ],
  }),
  defineShelf({
    id: "movies",
    label: "Movies",
    sourceLabel: "Apple Movies: Top Movies in the United States",
    sourceUrl: "https://itunes.apple.com/us/rss/topmovies/limit=10/json",
    capturedAt,
    items: [
      mediaItem(
        "1896844187",
        "Disclosure Day",
        "Steven Spielberg",
        "https://itunes.apple.com/us/movie/disclosure-day/id1896844187?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video221/v4/c4/e1/7f/c4e17f16-e085-54d5-bc1d-7c99258bf053/UNI_DISCLOSURE_DAY_TH_ITUNES_EPO_WW_ARTWORK_EN_2000x3000_5F1LFI0000046N.png/452x680bb.png",
        452,
        680,
      ),
      mediaItem(
        "6783861554",
        "Star Wars: The Mandalorian and Grogu",
        "Jon Favreau",
        "https://itunes.apple.com/us/movie/star-wars-the-mandalorian-and-grogu/id6783861554?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video211/v4/d4/2d/8f/d42d8fde-2fc0-92b9-9348-ae30c1917426/DIS_MANDALORIAN_AND_GROGU_TH_ITUNES_WW_ARTWORK_EN_2000x3000_5G47MS00000CLS.png/452x680bb.png",
        452,
        680,
      ),
      mediaItem(
        "1896873728",
        "Backrooms",
        "Kane Parsons",
        "https://itunes.apple.com/us/movie/backrooms/id1896873728?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video211/v4/20/41/bb/2041bbbe-e18b-35a8-eafc-6d679a684bf7/A24-Backrooms-Transactional-Movies-Cover.png/452x680bb.png",
        452,
        680,
      ),
      mediaItem(
        "1895945921",
        "Obsession (2026)",
        "Curry Barker",
        "https://itunes.apple.com/us/movie/obsession-2026/id1895945921?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video221/v4/26/db/16/26db1681-d180-1d95-cb5d-7c6f3199e8fe/OBSESSION_PVOD_LSR_2000x3000_Poster.jpg/452x680bb.png",
        452,
        680,
      ),
      mediaItem(
        "1896841142",
        "Supergirl",
        undefined,
        "https://itunes.apple.com/us/movie/supergirl/id1896841142?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video211/v4/aa/89/3c/aa893c1c-44b6-1257-4280-8bd4af136a39/Supergirl_STD_PREM_V_KA_TT_2000x3000_300dpi_EN.jpg/452x680bb.png",
        452,
        680,
      ),
      mediaItem(
        "6788901468",
        "Scary Movie (2026) Extended Cut",
        "Michael Tiddes",
        "https://itunes.apple.com/us/movie/scary-movie-2026-extended-cut/id6788901468?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video221/v4/5d/de/d2/5dded24d-e3a2-cee8-1860-2f215b44580d/SCARYMOVIE6_VariantArt_Cover_Art_2000x3000_V10.png/452x680bb.png",
        452,
        680,
      ),
      mediaItem(
        "1895068395",
        "Michael",
        "Antoine Fuqua",
        "https://itunes.apple.com/us/movie/michael/id1895068395?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video221/v4/96/6f/02/966f02ff-4212-fafe-3c8c-fc03b4541ca3/Michael_iTunesStore_Movies_Cvr.png/452x680bb.png",
        452,
        680,
      ),
      mediaItem(
        "1886871755",
        "The Super Mario Galaxy Movie",
        "Aaron Horvath & Michael Jelenic",
        "https://itunes.apple.com/us/movie/the-super-mario-galaxy-movie/id1886871755?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video221/v4/a3/5c/e7/a35ce775-baf8-f066-ab8e-c97a550a771d/UNI_SUPER_MARIO_GALAXY_MOVIE_THE_TH_ITUNES_EPO_WW_ARTWORK_EN_2000x3000_5BL7AB000001VT.lsr/452x680bb.png",
        452,
        680,
      ),
      mediaItem(
        "1896801400",
        "The Devil Wears Prada 2",
        "David Frankel",
        "https://itunes.apple.com/us/movie/the-devil-wears-prada-2/id1896801400?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video221/v4/1d/0f/f5/1d0ff5a0-3cc1-b558-9bdb-02f488fb71d9/FOX_DEVIL_WEARS_PRADA_2_TH_ITUNES_WW_ARTWORK_EN_2000x3000_5EFE6T00000C4A.png/452x680bb.png",
        452,
        680,
      ),
      mediaItem(
        "295210182",
        "Troy",
        "Wolfgang Petersen",
        "https://itunes.apple.com/us/movie/troy/id295210182?uo=2",
        "https://is1-ssl.mzstatic.com/image/thumb/Video124/v4/3b/7e/09/3b7e09d2-aebd-5bcc-2194-06bcb8dbe3d7/pr_source.lsr/452x680bb.png",
        452,
        680,
      ),
    ],
  }),
] as const satisfies readonly MediaShelfDefinition[];

export const mediaShelves = mediaShelfOrder.map((id) => {
  const shelf = mediaShelfCatalog.find((candidate) => candidate.id === id);

  if (!shelf) {
    throw new Error(`Missing media shelf configuration for ${id}`);
  }

  return shelf;
});
