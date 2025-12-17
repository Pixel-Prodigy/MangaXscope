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
import { searchMangaDb, isDbSearchAvailable } from "./db-search";

const PLACEHOLDER_IMAGE =
  "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_CONTENT_RATINGS = ["safe", "suggestive"];

// Cache the DB availability check
let dbAvailable: boolean | null = null;
let dbCheckTime = 0;
const DB_CHECK_CACHE_MS = 60000; // Check every minute

async function checkDbAvailable(): Promise<boolean> {
  const now = Date.now();
  if (dbAvailable !== null && now - dbCheckTime < DB_CHECK_CACHE_MS) {
    return dbAvailable;
  }

  try {
    dbAvailable = await isDbSearchAvailable();
    dbCheckTime = now;
    return dbAvailable;
  } catch {
    dbAvailable = false;
    dbCheckTime = now;
    return false;
  }
}

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

  // Use our proxy API route to serve images (bypasses CORS issues)
  // This works in both local and production environments
  return `/api/cover-image/${mangaId}/${coverArtId}`;
}

async function fetchMangaStatistics(
  mangaIds: string[]
): Promise<Record<string, { chapters: number }>> {
  if (mangaIds.length === 0) return {};

  try {
    const idsParam = mangaIds.map((id) => `manga[]=${id}`).join("&");
    const response = await fetch(`/api/statistics/manga?${idsParam}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        `Failed to fetch statistics (${response.status}), continuing without chapter counts`
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

    // Log if some mangas are missing statistics (for debugging)
    const mangasWithStats = Object.keys(statistics).length;
    const totalMangas = mangaIds.length;
    if (mangasWithStats < totalMangas) {
      console.debug(
        `Statistics available for ${mangasWithStats}/${totalMangas} mangas. Some mangas may not have statistics in MangaDex database.`
      );
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

/**
 * Estimates total chapters from lastChapter if it's a simple numeric value.
 * This is a fallback when statistics API doesn't provide total chapters.
 */
function estimateTotalChaptersFromLastChapter(
  lastChapter: string | null
): number | null {
  if (!lastChapter) return null;

  // Try to parse as a simple number (e.g., "10", "100")
  const numericValue = parseFloat(lastChapter);
  if (!isNaN(numericValue) && numericValue > 0 && numericValue % 1 === 0) {
    // Only use if it's a whole number and matches the string exactly
    // (to avoid using "10.5" as 10)
    if (lastChapter.trim() === numericValue.toString()) {
      return Math.floor(numericValue);
    }
  }

  return null;
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

  // Try to get total chapters from statistics first, fallback to estimating from lastChapter
  const lastChapter = normalizeChapterValue(manga.attributes.lastChapter);
  const totalChapters =
    statistics?.[manga.id]?.chapters ??
    estimateTotalChaptersFromLastChapter(lastChapter);

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
    lastChapter,
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
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset || 0;

  // Try database search first if available
  const useDb = await checkDbAvailable();

  if (useDb) {
    try {
      const sortBy = params.order?.followedCount
        ? "popularity"
        : params.order?.updatedAt
        ? "latest"
        : "latest";

      return await searchMangaDb({
        limit,
        offset,
        includedTags: params.includedTags,
        excludedTags: params.excludedTags,
        status: params.status,
        originalLanguage: params.originalLanguage,
        minChapters: params.minChapters,
        maxChapters: params.maxChapters,
        sortBy,
        sortOrder: "desc",
      });
    } catch (error) {
      console.warn("DB search failed, falling back to MangaDex:", error);
      // Fall through to MangaDex
    }
  }

  // Fallback to MangaDex API
  return getMangaListFromMangaDex(params);
}

/**
 * Original MangaDex-based manga list fetching
 */
async function getMangaListFromMangaDex(
  params: MangaListParams = {}
): Promise<MangaListResponse> {
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset || 0;
  const hasChapterFilter = !!(params.minChapters || params.maxChapters);

  if (!hasChapterFilter) {
    // No chapter filter - use normal pagination
    const searchParams = buildSearchParams(params);
    const mangaDexResponse = await fetchMangaDexAPI(searchParams);
    const apiTotal = mangaDexResponse.total;

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
        total: apiTotal,
        limit,
        offset,
        totalPages: Math.ceil(apiTotal / limit),
      },
    };
  }

  // Chapter filtering is active - need to fetch and filter, then paginate
  // Fetch a large batch and filter it, then slice to the requested page
  const batchSize = Math.min(MAX_LIMIT, 100); // Fetch up to 100 items at a time
  let allFilteredManga: MangaListItem[] = [];
  let currentOffset = 0;
  let apiTotal = 0;
  let filterRatio = 1; // Will be calculated after first batch

  // Keep fetching batches until we have enough filtered items for the requested page
  while (allFilteredManga.length < offset + limit && currentOffset < 1000) {
    const searchParams = buildSearchParams({
      ...params,
      limit: batchSize,
      offset: currentOffset,
    });

    const mangaDexResponse = await fetchMangaDexAPI(searchParams);

    if (mangaDexResponse.data.length === 0) break; // No more data

    apiTotal = mangaDexResponse.total;
    const mangaIds = mangaDexResponse.data.map((manga) => manga.id);
    const statistics = await fetchMangaStatistics(mangaIds);

    const batchManga = await Promise.all(
      mangaDexResponse.data.map((manga) =>
        transformMangaDexManga(manga, statistics)
      )
    );

    // Filter the batch
    const filteredBatch = filterByChapterCount(
      batchManga,
      params.minChapters,
      params.maxChapters
    );

    allFilteredManga = [...allFilteredManga, ...filteredBatch];

    // Calculate filter ratio from first batch
    if (currentOffset === 0 && mangaDexResponse.data.length > 0) {
      filterRatio = Math.max(
        0.01,
        filteredBatch.length / mangaDexResponse.data.length
      ); // Minimum 1% to avoid division issues
    }

    currentOffset += batchSize;

    // If we got fewer items than requested, we might have reached the end
    if (mangaDexResponse.data.length < batchSize) break;
  }

  // Slice to get the requested page
  const pageManga = allFilteredManga.slice(offset, offset + limit);

  // Estimate total based on filter ratio
  const estimatedTotal = Math.max(
    allFilteredManga.length,
    Math.ceil(apiTotal * filterRatio)
  );

  return {
    mangaList: pageManga,
    metaData: {
      total: estimatedTotal,
      limit,
      offset,
      totalPages: Math.ceil(estimatedTotal / limit) || 1,
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
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset || 0;

  // Try database search first if available
  const useDb = await checkDbAvailable();

  if (useDb && params.query) {
    try {
      return await searchMangaDb({
        query: params.query,
        limit,
        offset,
        sortBy: "relevance",
        sortOrder: "desc",
      });
    } catch (error) {
      console.warn("DB search failed, falling back to MangaDex:", error);
      // Fall through to MangaDex
    }
  }

  // Fallback to MangaDex API
  return searchMangaFromMangaDex(params);
}

/**
 * Original MangaDex-based search
 */
async function searchMangaFromMangaDex(
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

export async function getChapter(): Promise<ChapterData> {
  throw new Error("Chapter fetching not yet implemented with MangaDex API");
}

// Re-export DB search functions for convenience
export {
  searchMangaDb,
  advancedSearchMangaDb,
  smartSearchMangaDb,
  isDbSearchAvailable,
  getDbSyncStatus,
} from "./db-search";
