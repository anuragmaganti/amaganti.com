export type MediaShelfId = "songs" | "books" | "movies";

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

export const mediaShelves = [
  defineShelf({
    id: "songs",
    label: "Songs",
    sourceLabel: "Apple Music: Top Songs in the United States",
    sourceUrl:
      "https://rss.marketingtools.apple.com/api/v2/us/music/most-played/10/songs.json",
    capturedAt,
    items: [
      mediaItem(
        "6792676860",
        "Been By Now",
        "Morgan Wallen",
        "https://music.apple.com/us/album/been-by-now/6792676858?i=6792676860",
        "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/9f/8d/52/9f8d52a0-b6d9-d038-327b-4fe58bedce67/26UMGIM94572.rgb.jpg/420x420bb.jpg",
        420,
        420,
      ),
      mediaItem(
        "1844932150",
        "Choosin' Texas",
        "Ella Langley",
        "https://music.apple.com/us/album/choosin-texas/1844932149?i=1844932150",
        "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/e2/91/4d/e2914d0a-7f1d-f04c-fbf4-c50b38548838/196873638690.jpg/420x420bb.jpg",
        420,
        420,
      ),
      mediaItem(
        "6790569133",
        "Dead Fresh",
        "Lil Baby",
        "https://music.apple.com/us/album/dead-fresh/6790569132?i=6790569133",
        "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/74/80/37/748037d7-71c1-feff-4d38-3ef0a25578b6/26UMGIM85451.rgb.jpg/420x420bb.jpg",
        420,
        420,
      ),
      mediaItem(
        "6769568596",
        "Janice STFU",
        "Drake",
        "https://music.apple.com/us/album/janice-stfu/6769568449?i=6769568596",
        "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/35/b9/06/35b90629-a873-14f8-4789-ffc324960038/26UMGIM63614.rgb.jpg/420x420bb.jpg",
        420,
        420,
      ),
      mediaItem(
        "6763091996",
        "I Can't Love You Anymore",
        "Ella Langley & Morgan Wallen",
        "https://music.apple.com/us/album/i-cant-love-you-anymore/1895158676?i=6763091996",
        "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/d9/7a/6e/d97a6e25-ef5c-0c26-64e9-266c18641a57/196874324103.jpg/420x420bb.jpg",
        420,
        420,
      ),
      mediaItem(
        "1869436845",
        "Be Her",
        "Ella Langley",
        "https://music.apple.com/us/album/be-her/1869436835?i=1869436845",
        "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a1/ba/64/a1ba6484-f462-1b88-ddff-d4c014d5f265/196874018361.jpg/420x420bb.jpg",
        420,
        420,
      ),
      mediaItem(
        "6769568598",
        "Shabang",
        "Drake",
        "https://music.apple.com/us/album/shabang/6769568449?i=6769568598",
        "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/35/b9/06/35b90629-a873-14f8-4789-ffc324960038/26UMGIM63614.rgb.jpg/420x420bb.jpg",
        420,
        420,
      ),
      mediaItem(
        "1889992115",
        "stupid song",
        "Olivia Rodrigo",
        "https://music.apple.com/us/album/stupid-song/1889992111?i=1889992115",
        "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/1d/1b/f9/1d1bf9b1-44c6-9a6c-6ffb-c158488c06ce/26UMGIM39303.rgb.jpg/420x420bb.jpg",
        420,
        420,
      ),
      mediaItem(
        "1892189612",
        "Spend Dat",
        "Yung Miami",
        "https://music.apple.com/us/album/spend-dat/1892189610?i=1892189612",
        "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/bd/54/8d/bd548d85-4c33-2432-ecd8-e26f0585bdfd/26UMGIM41443.rgb.jpg/420x420bb.jpg",
        420,
        420,
      ),
      mediaItem(
        "1802104400",
        "Don't We",
        "Morgan Wallen",
        "https://music.apple.com/us/album/dont-we/1802103958?i=1802104400",
        "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/1e/ef/26/1eef2600-29f4-5423-3052-26874afd2947/25UMGIM46050.rgb.jpg/420x420bb.jpg",
        420,
        420,
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

