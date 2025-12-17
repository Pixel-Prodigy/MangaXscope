/**
 * Consumet Multi-Provider Implementation.
 *
 * This provider handles communication with the Consumet API for:
 * - Manhwa (Korean comics)
 * - Manhua (Chinese comics)
 * - Webtoons
 *
 * ARCHITECTURE:
 * - Uses ACTUAL manhwa/manhua providers from Consumet
 * - Always uses SEARCH endpoint (never /hot or /latest)
 * - Paginates until results.length === 0 (ignores hasNextPage)
 * - Provider-aware deduplication (provider:id)
 * - Sequential provider iteration with deep pagination
 *
 * Consumet API documentation: https://docs.consumet.org/
 */

import type {
  MangaProvider,
  MangaListResponse,
  MangaDetails,
  ChapterListResponse,
  ChapterPagesResponse,
  SearchParams,
  MangaListItem,
  NormalizedChapter,
  NormalizedTag,
  PublicationStatus,
  ContentRating,
  ContentType,
  OriginalLanguage,
  Demographic,
  ConsumetProviderName,
  WebcomicType,
} from "@/types";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Consumet API base URL.
 * Uses the official hosted API by default.
 * Override with CONSUMET_API_URL for local development.
 */
const CONSUMET_API = process.env.CONSUMET_API_URL || "https://api.consumet.org";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const REQUEST_TIMEOUT = 8000; // Fast timeout
const PLACEHOLDER_IMAGE =
  "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover";

/**
 * SPEED OPTIMIZED CONFIGURATION
 * - Parallel provider fetching
 * - Concurrent page batches
 * - No artificial delays
 */
const MAX_PAGES_PER_PROVIDER = 50; // Cap per provider
const CONCURRENT_PAGES = 10; // Fetch N pages at once per provider

/**
 * Fallback query for browsing when no search query is provided.
 * Using "a" gives access to full catalog through search endpoint.
 */
const BROWSE_FALLBACK_QUERY = "a";

/**
 * Provider priority configuration for manhwa/manhua/webtoon content.
 *
 * ACTUAL manhwa/manhua providers from Consumet:
 * - asurascans: Quality manhwa scanlations
 * - reaperscans: Manhwa/manhua scanlations
 * - flamescans: Manhwa/manhua scanlations
 * - mangakakalot: Large aggregator with manhwa/manhua
 * - mangapark: Good manhwa/manhua coverage
 */
const PROVIDER_PRIORITIES: Record<
  WebcomicType | "default",
  ConsumetProviderName[]
> = {
  // Manhwa (Korean): Prioritize actual manhwa sources
  manhwa: [
    "asurascans",
    "reaperscans",
    "flamescans",
    "mangakakalot",
    "mangapark",
  ],

  // Manhua (Chinese): Similar sources work for manhua
  manhua: [
    "mangakakalot",
    "mangapark",
    "asurascans",
    "reaperscans",
    "flamescans",
  ],

  // Webtoon: Aggregators have best webtoon coverage
  webtoon: [
    "mangakakalot",
    "mangapark",
    "asurascans",
    "reaperscans",
    "flamescans",
  ],

  // Default: All providers
  default: [
    "asurascans",
    "reaperscans",
    "flamescans",
    "mangakakalot",
    "mangapark",
  ],
};

// =============================================================================
// CONSUMET API TYPES
// =============================================================================

interface ConsumetMangaResult {
  id: string;
  title: string;
  altTitles?: string[];
  image?: string;
  description?: string;
  status?: string;
  genres?: string[];
  releaseDate?: string;
  rating?: number;
}

interface ConsumetMangaInfo {
  id: string;
  title: string;
  altTitles?: string[];
  image?: string;
  headerForImage?: string;
  description?: string;
  status?: string;
  genres?: string[];
  authors?: string[];
  releaseDate?: string;
  rating?: number;
  chapters?: ConsumetChapter[];
}

interface ConsumetChapter {
  id: string;
  title?: string;
  chapterNumber?: string | number;
  volumeNumber?: string | number;
  releaseDate?: string;
}

interface ConsumetChapterPages {
  id: string;
  title?: string;
  pages: Array<{
    img: string;
    page: number;
    headerForImage?: string;
  }>;
}

interface ConsumetSearchResponse {
  currentPage: number;
  hasNextPage: boolean;
  results: ConsumetMangaResult[];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Fetch with timeout and error handling.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MangaXScope/1.0",
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Map Consumet status to normalized status.
 */
function mapStatus(status: string | undefined): PublicationStatus {
  if (!status) return "unknown";

  const normalized = status.toLowerCase();
  if (normalized.includes("ongoing") || normalized.includes("publishing")) {
    return "ongoing";
  }
  if (normalized.includes("completed") || normalized.includes("finished")) {
    return "completed";
  }
  if (normalized.includes("hiatus")) {
    return "hiatus";
  }
  if (normalized.includes("cancelled") || normalized.includes("canceled")) {
    return "cancelled";
  }
  return "unknown";
}

/**
 * Infer content type from genres, title, and provider hints.
 */
function inferContentType(
  genres: string[] = [],
  title: string = "",
  requestedType?: WebcomicType
): ContentType {
  // If explicitly requested, use that
  if (requestedType) {
    return requestedType;
  }

  const genresLower = genres.map((g) => g.toLowerCase());
  const titleLower = title.toLowerCase();

  // Check for manhua indicators (Chinese)
  if (
    genresLower.some(
      (g) =>
        g.includes("manhua") ||
        g.includes("chinese") ||
        g.includes("cultivation") ||
        g.includes("wuxia") ||
        g.includes("xianxia") ||
        g.includes("martial arts")
    ) ||
    titleLower.includes("manhua")
  ) {
    return "manhua";
  }

  // Check for webtoon indicators
  if (
    genresLower.some(
      (g) =>
        g.includes("webtoon") ||
        g.includes("web comic") ||
        g.includes("full color")
    ) ||
    titleLower.includes("webtoon")
  ) {
    return "webtoon";
  }

  // Check for manhwa indicators (Korean)
  if (
    genresLower.some((g) => g.includes("manhwa") || g.includes("korean")) ||
    titleLower.includes("manhwa")
  ) {
    return "manhwa";
  }

  // Default to manhwa for Korean content (most common webcomic type)
  return "manhwa";
}

/**
 * Infer language from content type.
 */
function inferLanguage(contentType: ContentType): OriginalLanguage {
  switch (contentType) {
    case "manhua":
      return "zh";
    case "manhwa":
    case "webtoon":
      return "ko";
    default:
      return "ko";
  }
}

/**
 * Transform genre strings to normalized tags.
 */
function transformGenres(genres: string[] = []): NormalizedTag[] {
  return genres.map((genre) => ({
    id: `consumet-genre-${genre.toLowerCase().replace(/\s+/g, "-")}`,
    name: genre,
    group: inferTagGroup(genre),
  }));
}

/**
 * Infer tag group from genre name.
 */
function inferTagGroup(
  genre: string
): "genre" | "theme" | "format" | "content" {
  const genreLower = genre.toLowerCase();

  // Format types
  if (
    ["webtoon", "full color", "long strip", "4-koma"].some((f) =>
      genreLower.includes(f)
    )
  ) {
    return "format";
  }

  // Content warnings
  if (
    ["mature", "adult", "gore", "violence", "sexual"].some((c) =>
      genreLower.includes(c)
    )
  ) {
    return "content";
  }

  // Themes
  if (
    [
      "isekai",
      "reincarnation",
      "time travel",
      "video game",
      "virtual reality",
      "school",
      "martial arts",
      "cultivation",
    ].some((t) => genreLower.includes(t))
  ) {
    return "theme";
  }

  // Default to genre
  return "genre";
}

/**
 * Parse release date to year.
 */
function parseYear(
  releaseDate: string | number | undefined | null
): number | null {
  if (releaseDate === undefined || releaseDate === null) return null;

  // If it's already a number, return it directly (assuming it's a year)
  if (typeof releaseDate === "number") {
    // Validate it looks like a year (1900-2100)
    return releaseDate >= 1900 && releaseDate <= 2100 ? releaseDate : null;
  }

  // Convert to string and extract year
  const releaseDateStr = String(releaseDate);
  const yearMatch = releaseDateStr.match(/\d{4}/);
  if (yearMatch) {
    return parseInt(yearMatch[0], 10);
  }
  return null;
}

/**
 * Estimate total chapters from chapter list.
 */
function estimateTotalChapters(
  chapters: ConsumetChapter[] | undefined
): number | null {
  if (!chapters || chapters.length === 0) return null;

  const maxChapter = chapters.reduce((max, ch) => {
    const num =
      typeof ch.chapterNumber === "number"
        ? ch.chapterNumber
        : parseFloat(String(ch.chapterNumber || "0"));
    return !isNaN(num) && num > max ? num : max;
  }, 0);

  return maxChapter > 0 ? Math.floor(maxChapter) : chapters.length;
}

// =============================================================================
// DEDUPLICATION UTILITIES
// =============================================================================

/**
 * Provider quality ranking for display preference when showing results.
 * Higher number = higher quality (more metadata, better images).
 */
const PROVIDER_QUALITY: Record<ConsumetProviderName, number> = {
  asurascans: 10, // Quality scans, best metadata
  reaperscans: 10, // Quality scans
  flamescans: 10, // Quality scans
  mangakakalot: 8, // Large catalog, decent metadata
  mangapark: 7, // Good coverage
};

/**
 * Deduplicate manga results with PROVIDER-AWARE deduplication.
 *
 * CRITICAL: We dedupe by provider:id combination, NOT global titles.
 * This preserves coverage across providers while removing true duplicates
 * (same manga from same provider appearing multiple times).
 */
function deduplicateResults(results: MangaListItem[]): MangaListItem[] {
  // Provider-aware deduplication: provider:id is the unique key
  const seenProviderIds = new Map<string, MangaListItem>();

  for (const manga of results) {
    // Unique key is provider + id
    const providerKey = `${manga.provider || "unknown"}:${manga.id}`;

    if (!seenProviderIds.has(providerKey)) {
      seenProviderIds.set(providerKey, manga);
    }
    // If we've already seen this exact provider:id, skip it (true duplicate)
  }

  return Array.from(seenProviderIds.values());
}

/**
 * Infer content rating from genres.
 */
function inferContentRating(genres: string[] = []): ContentRating {
  const genresLower = genres.map((g) => g.toLowerCase());

  if (
    genresLower.some((g) => g.includes("hentai") || g.includes("pornographic"))
  ) {
    return "pornographic";
  }
  if (genresLower.some((g) => g.includes("erotica") || g.includes("smut"))) {
    return "erotica";
  }
  if (
    genresLower.some(
      (g) => g.includes("ecchi") || g.includes("mature") || g.includes("adult")
    )
  ) {
    return "suggestive";
  }
  return "safe";
}

/**
 * Check if a response body looks like JSON.
 */
async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
    console.error(
      "[Consumet] Received HTML instead of JSON. API may be unavailable."
    );
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("[Consumet] Failed to parse JSON:", text.substring(0, 200));
    return null;
  }
}

// =============================================================================
// TRANSFORMER FUNCTIONS
// =============================================================================

/**
 * Transform Consumet manga result to normalized format.
 */
function transformMangaResult(
  manga: ConsumetMangaResult,
  provider: ConsumetProviderName,
  requestedType?: WebcomicType
): MangaListItem {
  const genres = manga.genres || [];
  const contentType = inferContentType(genres, manga.title, requestedType);
  const language = inferLanguage(contentType);

  return {
    id: manga.id,
    source: "consumet",
    provider,
    title: manga.title,
    altTitles: manga.altTitles || [],
    description: manga.description || "",
    image: manga.image || PLACEHOLDER_IMAGE,
    status: mapStatus(manga.status),
    contentType,
    language,
    contentRating: inferContentRating(genres),
    genres: transformGenres(genres),
    year: parseYear(manga.releaseDate),
    totalChapters: null,
    lastChapter: null,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Transform Consumet manga info to full details format.
 */
function transformMangaInfo(
  manga: ConsumetMangaInfo,
  provider: ConsumetProviderName,
  requestedType?: WebcomicType
): MangaDetails {
  const genres = manga.genres || [];
  const contentType = inferContentType(genres, manga.title, requestedType);
  const language = inferLanguage(contentType);
  const totalChapters = estimateTotalChapters(manga.chapters);

  return {
    id: manga.id,
    source: "consumet",
    provider,
    title: manga.title,
    altTitles: manga.altTitles || [],
    description: manga.description || "",
    coverImage: manga.image || PLACEHOLDER_IMAGE,
    genres: transformGenres(genres),
    status: mapStatus(manga.status),
    contentType,
    language,
    contentRating: inferContentRating(genres),
    demographic: null as Demographic,
    year: parseYear(manga.releaseDate),
    totalChapters,
    lastChapter: totalChapters ? String(totalChapters) : null,
    lastVolume: null,
    authors: manga.authors || [],
    artists: [],
    followedCount: 0,
    rating: manga.rating || null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    externalLinks: {},
  };
}

/**
 * Transform Consumet chapter to normalized format.
 */
function transformChapter(chapter: ConsumetChapter): NormalizedChapter {
  return {
    id: chapter.id,
    chapter:
      chapter.chapterNumber != null ? String(chapter.chapterNumber) : null,
    volume: chapter.volumeNumber != null ? String(chapter.volumeNumber) : null,
    title: chapter.title || null,
    language: "en",
    pages: 0,
    publishedAt: chapter.releaseDate || new Date().toISOString(),
    scanlationGroup: null,
    externalUrl: null,
  };
}

// =============================================================================
// SINGLE PROVIDER SEARCH
// =============================================================================

/**
 * Search using a single Consumet provider.
 *
 * ALWAYS uses the search endpoint: /manga/{provider}/{query}?page=
 * Never uses /hot or /latest (those are curated subsets).
 *
 * @param provider - The Consumet provider to use
 * @param params - Search parameters
 * @param pageOverride - Optional page number override (for deep pagination)
 */
async function searchWithProvider(
  provider: ConsumetProviderName,
  params: SearchParams,
  pageOverride?: number
): Promise<{
  success: boolean;
  data: MangaListResponse | null;
  error?: string;
}> {
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset || 0;
  const page = pageOverride ?? Math.floor(offset / limit) + 1;

  // Always use search endpoint - use fallback query for browsing
  const searchQuery = params.query?.trim() || BROWSE_FALLBACK_QUERY;

  // ALWAYS use search endpoint - never /hot or /latest
  const url = `${CONSUMET_API}/manga/${provider}/${encodeURIComponent(
    searchQuery
  )}?page=${page}`;

  console.log(`[Consumet] Provider ${provider} page ${page}:`, url);

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data = await parseJsonSafe<ConsumetSearchResponse>(response);

    if (!data || !data.results) {
      return {
        success: false,
        data: null,
        error: "Invalid response structure",
      };
    }

    const webcomicType = params.webcomicType;
    let mangaList = data.results.map((m) =>
      transformMangaResult(m, provider, webcomicType)
    );

    // Apply client-side filters since Consumet doesn't support them
    if (params.status?.length) {
      mangaList = mangaList.filter((manga) =>
        params.status!.includes(manga.status)
      );
    }

    if (params.contentRating?.length) {
      mangaList = mangaList.filter((manga) =>
        params.contentRating!.includes(manga.contentRating)
      );
    }

    return {
      success: true,
      data: {
        mangaList,
        provider,
        metaData: {
          // Don't estimate totals - we'll paginate until empty
          total: mangaList.length,
          limit,
          offset,
          totalPages: 1, // Ignored - we paginate until empty
        },
      },
    };
  } catch (error) {
    console.error(`[Consumet] Provider ${provider} error:`, error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// BLAZING FAST MULTI-PROVIDER AGGREGATION
// =============================================================================

/**
 * Fetch a batch of pages in PARALLEL.
 * Returns results and whether we should continue (any page had results).
 */
async function fetchPageBatch(
  provider: ConsumetProviderName,
  params: SearchParams,
  startPage: number,
  batchSize: number
): Promise<{ results: MangaListItem[]; hasMore: boolean }> {
  const pagePromises = Array.from({ length: batchSize }, (_, i) =>
    searchWithProvider(provider, params, startPage + i)
  );

  const batchResults = await Promise.allSettled(pagePromises);
  const results: MangaListItem[] = [];
  let hasMore = false;

  for (const result of batchResults) {
    if (
      result.status === "fulfilled" &&
      result.value.success &&
      result.value.data
    ) {
      const pageData = result.value.data.mangaList;
      if (pageData.length > 0) {
        results.push(...pageData);
        hasMore = true; // At least one page had results
      }
    }
  }

  return { results, hasMore };
}

/**
 * Fetch all pages from a single provider using PARALLEL BATCHES.
 * Blazing fast - fetches CONCURRENT_PAGES at a time.
 */
async function fetchAllPagesFromProvider(
  provider: ConsumetProviderName,
  params: SearchParams
): Promise<MangaListItem[]> {
  const allResults: MangaListItem[] = [];
  let currentPage = 1;

  while (currentPage <= MAX_PAGES_PER_PROVIDER) {
    const { results, hasMore } = await fetchPageBatch(
      provider,
      params,
      currentPage,
      CONCURRENT_PAGES
    );

    allResults.push(...results);

    if (!hasMore) {
      console.log(
        `[Consumet] ${provider}: exhausted at page ${currentPage} (${allResults.length} total)`
      );
      break;
    }

    currentPage += CONCURRENT_PAGES;
  }

  return allResults;
}

/**
 * Aggregate results from ALL providers with PARALLEL fetching.
 *
 * BLAZING FAST:
 * - ALL providers fetched in PARALLEL
 * - Each provider uses PARALLEL page batches
 * - No artificial delays
 */
export async function aggregateFromAllProviders(
  params: SearchParams
): Promise<MangaListResponse> {
  const webcomicType = params.webcomicType || "default";
  const providers =
    PROVIDER_PRIORITIES[webcomicType as keyof typeof PROVIDER_PRIORITIES] ||
    PROVIDER_PRIORITIES.default;

  console.log(`[Consumet] ⚡ PARALLEL fetch from: ${providers.join(", ")}`);
  const startTime = Date.now();

  // PARALLEL: Fetch from ALL providers simultaneously
  const providerPromises = providers.map(async (provider) => {
    try {
      const results = await fetchAllPagesFromProvider(provider, params);
      return { provider, results, count: results.length };
    } catch (error) {
      console.error(`[Consumet] ${provider} failed:`, error);
      return { provider, results: [] as MangaListItem[], count: 0 };
    }
  });

  const providerResults = await Promise.all(providerPromises);

  // Combine all results
  const allResults: MangaListItem[] = [];
  const providerStats: Record<string, number> = {};

  for (const { provider, results, count } of providerResults) {
    allResults.push(...results);
    providerStats[provider] = count;
  }

  const elapsed = Date.now() - startTime;
  console.log(`[Consumet] ⚡ Fetched ${allResults.length} in ${elapsed}ms`);
  console.log(`[Consumet] Stats:`, providerStats);

  // Provider-aware deduplication
  const deduplicatedResults = deduplicateResults(allResults);
  console.log(`[Consumet] After dedupe: ${deduplicatedResults.length}`);

  // Apply pagination
  const limit = params.limit || DEFAULT_LIMIT;
  const offset = params.offset || 0;
  const paginatedResults = deduplicatedResults.slice(offset, offset + limit);

  return {
    mangaList: paginatedResults,
    metaData: {
      total: deduplicatedResults.length,
      limit,
      offset,
      totalPages: Math.ceil(deduplicatedResults.length / limit),
    },
  };
}

/**
 * Search across all providers.
 *
 * Always uses aggregation - both browse and search modes use the same
 * search endpoint with deep pagination.
 */
export async function searchWithFallback(
  params: SearchParams
): Promise<MangaListResponse> {
  const hasQuery = !!params.query?.trim();
  console.log(
    `[Consumet] ${hasQuery ? `Search: "${params.query}"` : "Browse mode"}`
  );

  // Always aggregate from all providers
  return aggregateFromAllProviders(params);
}

// =============================================================================
// PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * Consumet multi-provider implementation.
 * Uses priority-based fallback for maximum coverage.
 */
export const consumetProvider: MangaProvider = {
  name: "consumet",

  /**
   * Search for manhwa/manhua/webtoon using multi-provider fallback.
   */
  async search(params: SearchParams): Promise<MangaListResponse> {
    return searchWithFallback(params);
  },

  /**
   * Get detailed manga information from Consumet.
   * Tries multiple providers if needed.
   */
  async getDetails(
    id: string,
    provider?: ConsumetProviderName
  ): Promise<MangaDetails> {
    const providers = provider ? [provider] : PROVIDER_PRIORITIES.default;

    for (const prov of providers) {
      try {
        const url = `${CONSUMET_API}/manga/${prov}/info?id=${encodeURIComponent(
          id
        )}`;
        const response = await fetchWithTimeout(url);

        if (!response.ok) continue;

        const data = await parseJsonSafe<ConsumetMangaInfo>(response);
        if (!data) continue;

        return transformMangaInfo(data, prov);
      } catch {
        continue;
      }
    }

    throw new Error(
      `Consumet details failed: No provider could fetch manga ${id}`
    );
  },

  /**
   * Get chapter list for a manga from Consumet.
   */
  async getChapters(
    mangaId: string,
    options: {
      limit?: number;
      offset?: number;
      language?: string;
      provider?: ConsumetProviderName;
    } = {}
  ): Promise<ChapterListResponse> {
    const providers = options.provider
      ? [options.provider]
      : PROVIDER_PRIORITIES.default;

    for (const provider of providers) {
      try {
        const url = `${CONSUMET_API}/manga/${provider}/info?id=${encodeURIComponent(
          mangaId
        )}`;
        const response = await fetchWithTimeout(url);

        if (!response.ok) continue;

        const data = await parseJsonSafe<ConsumetMangaInfo>(response);
        if (!data || !data.chapters) continue;

        const allChapters = data.chapters.map(transformChapter);
        const limit = options.limit || 100;
        const offset = options.offset || 0;
        const chapters = allChapters.slice(offset, offset + limit);

        return {
          chapters,
          total: allChapters.length,
          mangaId,
          source: "consumet",
          provider,
        };
      } catch {
        continue;
      }
    }

    throw new Error(`Consumet chapters failed for manga ${mangaId}`);
  },

  /**
   * Get chapter pages from Consumet.
   */
  async getChapterPages(
    mangaId: string,
    chapterId: string,
    provider?: ConsumetProviderName
  ): Promise<ChapterPagesResponse> {
    const providers = provider ? [provider] : PROVIDER_PRIORITIES.default;

    for (const prov of providers) {
      try {
        const url = `${CONSUMET_API}/manga/${prov}/read?chapterId=${encodeURIComponent(
          chapterId
        )}`;
        const response = await fetchWithTimeout(url);

        if (!response.ok) continue;

        const data = await parseJsonSafe<ConsumetChapterPages>(response);
        if (!data || !data.pages) continue;

        const referer = data.pages[0]?.headerForImage;
        const pages = data.pages.map((page) => ({
          index: page.page - 1,
          imageUrl: page.img,
        }));

        return {
          chapterId,
          mangaId,
          pages,
          referer,
          metadata: {
            chapter: null,
            volume: null,
            title: data.title || null,
            language: "en",
            totalPages: pages.length,
          },
        };
      } catch {
        continue;
      }
    }

    throw new Error(`Consumet pages failed for chapter ${chapterId}`);
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export default consumetProvider;

/**
 * Available Consumet manga providers.
 * These are ACTUAL manhwa/manhua/webtoon providers from Consumet.
 */
export const CONSUMET_PROVIDERS = [
  "asurascans",
  "reaperscans",
  "flamescans",
  "mangakakalot",
  "mangapark",
] as const;

/**
 * All Consumet manga providers.
 */
export const ALL_CONSUMET_PROVIDERS = CONSUMET_PROVIDERS;

/**
 * Create a Consumet provider instance for a specific manga source.
 * This bypasses the priority fallback and uses only the specified provider.
 */
export function createConsumetProvider(
  provider: ConsumetProviderName
): MangaProvider {
  return {
    name: "consumet",
    consumetProvider: provider,

    async search(params: SearchParams): Promise<MangaListResponse> {
      const result = await searchWithProvider(provider, params);
      if (result.success && result.data) {
        return result.data;
      }
      return {
        mangaList: [],
        metaData: {
          total: 0,
          limit: params.limit || DEFAULT_LIMIT,
          offset: params.offset || 0,
          totalPages: 0,
        },
      };
    },

    async getDetails(id: string): Promise<MangaDetails> {
      const url = `${CONSUMET_API}/manga/${provider}/info?id=${encodeURIComponent(
        id
      )}`;
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`Consumet details failed: ${response.status}`);
      }

      const data = await response.json();
      return transformMangaInfo(data, provider);
    },

    async getChapters(
      mangaId: string,
      options = {}
    ): Promise<ChapterListResponse> {
      const url = `${CONSUMET_API}/manga/${provider}/info?id=${encodeURIComponent(
        mangaId
      )}`;
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`Consumet chapters failed: ${response.status}`);
      }

      const data: ConsumetMangaInfo = await response.json();
      const allChapters = (data.chapters || []).map(transformChapter);

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      return {
        chapters: allChapters.slice(offset, offset + limit),
        total: allChapters.length,
        mangaId,
        source: "consumet",
        provider,
      };
    },

    async getChapterPages(
      mangaId: string,
      chapterId: string
    ): Promise<ChapterPagesResponse> {
      const url = `${CONSUMET_API}/manga/${provider}/read?chapterId=${encodeURIComponent(
        chapterId
      )}`;
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`Consumet pages failed: ${response.status}`);
      }

      const data: ConsumetChapterPages = await response.json();
      const referer = data.pages[0]?.headerForImage;

      return {
        chapterId,
        mangaId,
        pages: data.pages.map((page) => ({
          index: page.page - 1,
          imageUrl: page.img,
        })),
        referer,
        metadata: {
          chapter: null,
          volume: null,
          title: data.title || null,
          language: "en",
          totalPages: data.pages.length,
        },
      };
    },
  };
}

/**
 * Get providers for a specific webcomic type.
 */
export function getProvidersForType(
  type: WebcomicType
): ConsumetProviderName[] {
  return PROVIDER_PRIORITIES[type] || PROVIDER_PRIORITIES.default;
}
