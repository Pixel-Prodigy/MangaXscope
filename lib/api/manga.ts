import type {
  MangaListResponse,
  Manga,
  ChapterData,
  MangaListParams,
  SearchParams,
  MangaDexResponse,
  MangaDexManga,
  MangaDexRelationship,
  MangaDexTag,
  MangaDexAltTitle,
  MangaListItem,
} from "./types";

const PLACEHOLDER_IMAGE =
  "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover";
const MANGA_DEX_COVERS_BASE = "https://uploads.mangadex.org/covers";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_CONTENT_RATINGS = ["safe", "suggestive"];

function getPreferredText(
  obj: Record<string, string | undefined>,
  fallback = ""
): string {
  return obj.en || obj.ja || Object.values(obj)[0] || fallback;
}

async function getCoverArtUrl(
  mangaId: string,
  coverArtId: string | null
): Promise<string> {
  if (!coverArtId) return PLACEHOLDER_IMAGE;

  try {
    const response = await fetch(`/api/cover/${coverArtId}`, {
      cache: "force-cache",
    });
    if (!response.ok) return PLACEHOLDER_IMAGE;

    const data = await response.json();
    const fileName = data.data?.attributes?.fileName;
    if (!fileName) return PLACEHOLDER_IMAGE;

    return `${MANGA_DEX_COVERS_BASE}/${mangaId}/${fileName}.512.jpg`;
  } catch {
    return PLACEHOLDER_IMAGE;
  }
}

async function fetchMangaStatistics(
  mangaIds: string[]
): Promise<Record<string, { chapters: number }>> {
  if (mangaIds.length === 0) return {};

  try {
    const idsParam = mangaIds.join("&ids[]=");
    const response = await fetch(`/api/statistics/manga?ids[]=${idsParam}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        "Failed to fetch statistics, continuing without chapter counts"
      );
      return {};
    }

    const data = await response.json();
    const statistics: Record<string, { chapters: number }> = {};

    if (data.statistics) {
      Object.entries(data.statistics).forEach(([mangaId, stats]) => {
        const typedStats = stats as
          | { chapters?: { total?: number } }
          | undefined;
        if (typedStats?.chapters?.total !== undefined) {
          statistics[mangaId] = { chapters: typedStats.chapters.total };
        }
      });
    }

    return statistics;
  } catch (error) {
    console.warn("Error fetching statistics:", error);
    return {};
  }
}

function findRelationship(
  relationships: MangaDexRelationship[],
  type: string
): MangaDexRelationship | undefined {
  return relationships.find((rel) => rel.type === type);
}

function transformTags(tags: MangaDexTag[]) {
  return tags.map((tag) => ({
    id: tag.id,
    name: getPreferredText(tag.attributes.name, "Unknown"),
    group: tag.attributes.group,
  }));
}

function normalizeChapterValue(value: string | null): string | null {
  return value && value.trim() !== "" ? value : null;
}

async function transformMangaDexManga(
  manga: MangaDexManga,
  statistics?: Record<string, { chapters: number }>
): Promise<MangaListItem> {
  const title = getPreferredText(manga.attributes.title, "Untitled");
  const altTitles = manga.attributes.altTitles
    .map((alt: MangaDexAltTitle) => alt.en || alt.ja || Object.values(alt)[0])
    .filter(Boolean) as string[];
  const description = getPreferredText(manga.attributes.description);
  const coverArtId =
    findRelationship(manga.relationships, "cover_art")?.id || null;
  const image = await getCoverArtUrl(manga.id, coverArtId);
  const tags = transformTags(manga.attributes.tags);
  const totalChapters = statistics?.[manga.id]?.chapters ?? null;

  return {
    id: manga.id,
    image,
    title,
    altTitles,
    description,
    status: manga.attributes.status,
    year: manga.attributes.year,
    contentRating: manga.attributes.contentRating,
    tags,
    publicationDemographic: manga.attributes.publicationDemographic,
    originalLanguage: manga.attributes.originalLanguage,
    lastChapter: normalizeChapterValue(manga.attributes.lastChapter),
    lastVolume: normalizeChapterValue(manga.attributes.lastVolume),
    totalChapters,
    updatedAt: manga.attributes.updatedAt,
    createdAt: manga.attributes.createdAt,
  };
}

async function fetchMangaDexAPI(
  params: URLSearchParams
): Promise<MangaDexResponse> {
  const response = await fetch(`/api/manga?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "MangaDex API Error:",
      response.status,
      response.statusText,
      errorText
    );
    throw new Error(
      `MangaDex API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

function appendArrayParams(
  searchParams: URLSearchParams,
  key: string,
  values?: string[]
) {
  if (values && values.length > 0) {
    values.forEach((value) => searchParams.append(key, value));
  }
}

function buildSearchParams(params: MangaListParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset || 0;

  searchParams.append("limit", limit.toString());
  searchParams.append("offset", offset.toString());
  searchParams.append("includes[]", "cover_art");
  searchParams.append("includes[]", "author");
  searchParams.append("includes[]", "artist");

  const contentRatings = params.contentRating?.length
    ? params.contentRating
    : DEFAULT_CONTENT_RATINGS;
  appendArrayParams(searchParams, "contentRating[]", contentRatings);

  appendArrayParams(searchParams, "status[]", params.status);
  appendArrayParams(searchParams, "includedTags[]", params.includedTags);
  appendArrayParams(searchParams, "excludedTags[]", params.excludedTags);
  appendArrayParams(
    searchParams,
    "originalLanguage[]",
    params.originalLanguage
  );

  if (params.order) {
    Object.entries(params.order).forEach(([key, value]) => {
      searchParams.append(`order[${key}]`, value);
    });
  } else {
    searchParams.append("order[updatedAt]", "desc");
  }

  return searchParams;
}

function getChapterNumber(manga: MangaListItem): number | null {
  if (manga.totalChapters !== null && manga.totalChapters !== undefined) {
    return manga.totalChapters;
  }
  if (manga.lastChapter) {
    const parsed = parseFloat(manga.lastChapter);
    return !isNaN(parsed) ? parsed : null;
  }
  return null;
}

function filterByChapterCount(
  mangaList: MangaListItem[],
  minChapters?: string,
  maxChapters?: string
): MangaListItem[] {
  if (!minChapters && !maxChapters) return mangaList;

  const min = minChapters ? parseFloat(minChapters) : null;
  const max = maxChapters ? parseFloat(maxChapters) : null;

  return mangaList.filter((manga) => {
    const chapterNum = getChapterNumber(manga);
    if (chapterNum === null) return false;
    if (min !== null && chapterNum < min) return false;
    if (max !== null && chapterNum > max) return false;
    return true;
  });
}

export async function getMangaList(
  params: MangaListParams = {}
): Promise<MangaListResponse> {
  const searchParams = buildSearchParams(params);
  const mangaDexResponse = await fetchMangaDexAPI(searchParams);

  const mangaIds = mangaDexResponse.data.map((manga) => manga.id);
  const statistics = await fetchMangaStatistics(mangaIds);

  let mangaList = await Promise.all(
    mangaDexResponse.data.map((manga) =>
      transformMangaDexManga(manga, statistics)
    )
  );

  mangaList = filterByChapterCount(
    mangaList,
    params.minChapters,
    params.maxChapters
  );

  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset || 0;
  const apiTotal = mangaDexResponse.total;

  return {
    mangaList,
    metaData: {
      total: apiTotal,
      limit,
      offset,
      totalPages: Math.ceil(apiTotal / limit),
    },
  };
}

export async function getManga(id: string): Promise<Manga> {
  const searchParams = new URLSearchParams();
  searchParams.append("includes[]", "cover_art");
  searchParams.append("includes[]", "author");
  searchParams.append("includes[]", "artist");

  const response = await fetch(`/api/manga/${id}?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch manga: ${response.statusText}`);
  }

  const data = await response.json();
  const mangaDexManga = data.data;

  const title = getPreferredText(mangaDexManga.attributes.title, "Untitled");
  const description = getPreferredText(mangaDexManga.attributes.description);
  const coverArtId =
    findRelationship(mangaDexManga.relationships, "cover_art")?.id || null;
  const imageUrl = await getCoverArtUrl(id, coverArtId);

  const authorRel = findRelationship(mangaDexManga.relationships, "author");
  const artistRel = findRelationship(mangaDexManga.relationships, "artist");
  const author = authorRel ? "Unknown Author" : "Unknown";
  const artist = artistRel ? "Unknown Artist" : "Unknown";

  const genres = mangaDexManga.attributes.tags
    .filter((tag: MangaDexTag) => tag.attributes.group === "genre")
    .map((tag: MangaDexTag) =>
      getPreferredText(tag.attributes.name, "Unknown")
    );

  const altTitles = mangaDexManga.attributes.altTitles
    .map((alt: MangaDexAltTitle) => alt.en || alt.ja || Object.values(alt)[0])
    .filter(Boolean) as string[];

  const tags = transformTags(mangaDexManga.attributes.tags);
  const status =
    mangaDexManga.attributes.status.charAt(0).toUpperCase() +
    mangaDexManga.attributes.status.slice(1);
  const updated = new Date(
    mangaDexManga.attributes.updatedAt
  ).toLocaleDateString();

  return {
    id: mangaDexManga.id,
    imageUrl,
    name: title,
    altTitles,
    author,
    artist,
    status,
    updated,
    description,
    genres,
    tags,
    year: mangaDexManga.attributes.year,
    contentRating: mangaDexManga.attributes.contentRating,
    publicationDemographic: mangaDexManga.attributes.publicationDemographic,
    originalLanguage: mangaDexManga.attributes.originalLanguage,
    lastChapter: normalizeChapterValue(mangaDexManga.attributes.lastChapter),
    chapterList: [],
  };
}

export async function searchManga(
  params: SearchParams
): Promise<MangaListResponse> {
  const searchParams = new URLSearchParams();
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset || 0;

  searchParams.append("limit", limit.toString());
  searchParams.append("offset", offset.toString());
  if (params.query) {
    searchParams.append("title", params.query);
  }
  searchParams.append("includes[]", "cover_art");
  searchParams.append("includes[]", "author");
  searchParams.append("includes[]", "artist");
  appendArrayParams(searchParams, "contentRating[]", DEFAULT_CONTENT_RATINGS);
  searchParams.append("order[relevance]", "desc");

  const mangaDexResponse = await fetchMangaDexAPI(searchParams);
  const mangaIds = mangaDexResponse.data.map((manga) => manga.id);
  const statistics = await fetchMangaStatistics(mangaIds);

  const mangaList = await Promise.all(
    mangaDexResponse.data.map((manga) =>
      transformMangaDexManga(manga, statistics)
    )
  );

  return {
    mangaList,
    metaData: {
      total: mangaDexResponse.total,
      limit,
      offset,
      totalPages: Math.ceil(mangaDexResponse.total / limit),
    },
  };
}

export async function getChapter(
  _mangaId: string,
  _chapterId: string
): Promise<ChapterData> {
  throw new Error("Chapter fetching not yet implemented with MangaDex API");
}
