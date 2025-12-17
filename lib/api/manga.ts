/**
 * Client-side API functions for manga data.
 * 
 * ARCHITECTURE:
 * 
 * Two distinct sections:
 * 
 * 1. MANGA SECTION
 *    - getMangaList() / searchManga() with section="manga"
 *    - Routes to MangaDex
 *    - Japanese manga only
 * 
 * 2. WEBCOMICS SECTION
 *    - getWebcomicsList() / searchWebcomics()
 *    - Routes to Consumet with multi-provider fallback
 *    - Manhwa, Manhua, Webtoons
 * 
 * Client NEVER merges providers - server handles all routing.
 * 
 * CACHING STRATEGY:
 * - Uses Next.js fetch caching with revalidation
 * - List data: 60 second cache, background revalidate
 * - Detail data: 5 minute cache
 * - Search: 30 second cache (more dynamic)
 */

import type { 
  MangaListResponse, 
  MangaListItem, 
  MangaDetails,
  ContentSection,
  WebcomicType,
  ConsumetProviderName,
} from "@/types";

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const PLACEHOLDER_IMAGE = "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover";

// Cache durations in seconds
const CACHE_LIST = 60;        // 1 minute for list data
const CACHE_SEARCH = 30;      // 30 seconds for search (more dynamic)
const CACHE_DETAILS = 300;    // 5 minutes for manga details

// =============================================================================
// TYPES
// =============================================================================

export interface GetMangaListParams {
  limit?: number;
  offset?: number;
  includedTags?: string[];
  excludedTags?: string[];
  status?: string[];
  contentRating?: string[];
  originalLanguage?: string[];
  minChapters?: string;
  maxChapters?: string;
  order?: Record<string, string>;
  /** Content section - "manga" or "webcomics" */
  section?: ContentSection;
}

export interface GetWebcomicsListParams {
  limit?: number;
  offset?: number;
  query?: string;
  /** Webcomic type: manhwa, manhua, or webtoon */
  webcomicType?: WebcomicType;
  status?: string[];
  contentRating?: string[];
  order?: Record<string, string>;
}

export interface SearchMangaParams {
  query: string;
  limit?: number;
  offset?: number;
  /** Content section - "manga" or "webcomics" */
  section?: ContentSection;
  /** Webcomic type for webcomics section */
  webcomicType?: WebcomicType;
}

export interface LegacyManga {
  id: string;
  imageUrl: string;
  name: string;
  altTitles: string[];
  author: string;
  artist: string;
  status: string;
  updated: string;
  description: string;
  genres: string[];
  tags: Array<{ id: string; name: string; group: string }>;
  year: number | null;
  contentRating: string;
  publicationDemographic: string | null;
  originalLanguage: string;
  lastChapter: string | null;
  chapterList: Array<{
    id: string;
    path: string;
    name: string;
    view: string;
    createdAt: string;
  }>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildSearchParams(params: GetMangaListParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset || 0;

  searchParams.set("limit", limit.toString());
  searchParams.set("offset", offset.toString());

  // Section determines provider routing
  if (params.section) {
    searchParams.set("section", params.section);
  }

  // Array params
  params.includedTags?.forEach((tag) => searchParams.append("includedTags[]", tag));
  params.excludedTags?.forEach((tag) => searchParams.append("excludedTags[]", tag));
  params.status?.forEach((s) => searchParams.append("status[]", s));
  params.contentRating?.forEach((r) => searchParams.append("contentRating[]", r));
  params.originalLanguage?.forEach((lang) => searchParams.append("originalLanguage[]", lang));

  // Chapter filters
  if (params.minChapters) {
    searchParams.set("minChapters", params.minChapters);
  }
  if (params.maxChapters) {
    searchParams.set("maxChapters", params.maxChapters);
  }

  // Sorting
  if (params.order) {
    if (params.order.followedCount) {
      searchParams.set("sortBy", "popularity");
      searchParams.set("sortOrder", params.order.followedCount);
    } else if (params.order.updatedAt) {
      searchParams.set("sortBy", "latest");
      searchParams.set("sortOrder", params.order.updatedAt);
    } else if (params.order.title) {
      searchParams.set("sortBy", "title");
      searchParams.set("sortOrder", params.order.title);
    }
  }

  return searchParams;
}

function buildWebcomicsSearchParams(params: GetWebcomicsListParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset || 0;

  searchParams.set("limit", limit.toString());
  searchParams.set("offset", offset.toString());
  searchParams.set("section", "webcomics");

  if (params.query) {
    searchParams.set("q", params.query);
  }

  if (params.webcomicType) {
    searchParams.set("webcomicType", params.webcomicType);
  }

  params.status?.forEach((s) => searchParams.append("status[]", s));
  params.contentRating?.forEach((r) => searchParams.append("contentRating[]", r));

  if (params.order) {
    if (params.order.updatedAt) {
      searchParams.set("sortBy", "latest");
      searchParams.set("sortOrder", params.order.updatedAt);
    }
  }

  return searchParams;
}

// =============================================================================
// MANGA SECTION API FUNCTIONS
// =============================================================================

/**
 * Get paginated manga list (MANGA SECTION).
 * Routes to MangaDex for Japanese manga.
 * 
 * Uses SWR-style caching: serve stale data immediately, revalidate in background.
 */
export async function getMangaList(params: GetMangaListParams = {}): Promise<MangaListResponse> {
  const searchParams = buildSearchParams({
    ...params,
    section: "manga", // Force manga section
  });
  
  const response = await fetch(`/api/search?${searchParams.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: { revalidate: CACHE_LIST }, // Cache for 60s, revalidate in background
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Manga list API error:", response.status, errorText);
    throw new Error(`Failed to fetch manga list: ${response.status}`);
  }

  return response.json();
}

/**
 * Search manga by title/query (MANGA SECTION).
 * Routes to MangaDex for Japanese manga.
 * 
 * Shorter cache for search as results are more dynamic.
 */
export async function searchManga(params: SearchMangaParams): Promise<MangaListResponse> {
  const searchParams = new URLSearchParams();
  
  searchParams.set("q", params.query);
  searchParams.set("limit", String(params.limit || DEFAULT_LIMIT));
  searchParams.set("offset", String(params.offset || 0));
  searchParams.set("section", params.section || "manga");
  
  if (params.webcomicType) {
    searchParams.set("webcomicType", params.webcomicType);
  }

  const response = await fetch(`/api/search?${searchParams.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: { revalidate: CACHE_SEARCH }, // 30s cache for search
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// WEBCOMICS SECTION API FUNCTIONS
// =============================================================================

/**
 * Get paginated webcomics list (WEBCOMICS SECTION).
 * Routes to Consumet with multi-provider fallback.
 * 
 * @param params - Search parameters including optional webcomicType
 * @returns Webcomics list from the best available provider
 */
export async function getWebcomicsList(params: GetWebcomicsListParams = {}): Promise<MangaListResponse> {
  const searchParams = buildWebcomicsSearchParams(params);
  
  const response = await fetch(`/api/search?${searchParams.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: { revalidate: CACHE_LIST }, // 60s cache
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Webcomics list API error:", response.status, errorText);
    throw new Error(`Failed to fetch webcomics list: ${response.status}`);
  }

  return response.json();
}

/**
 * Search webcomics by title/query (WEBCOMICS SECTION).
 * Routes to Consumet with multi-provider fallback.
 * 
 * @param query - Search query
 * @param options - Additional options (limit, offset, webcomicType, status)
 */
export async function searchWebcomics(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    webcomicType?: WebcomicType;
    status?: string[];
  } = {}
): Promise<MangaListResponse> {
  const searchParams = new URLSearchParams();
  
  searchParams.set("q", query);
  searchParams.set("limit", String(options.limit || DEFAULT_LIMIT));
  searchParams.set("offset", String(options.offset || 0));
  searchParams.set("section", "webcomics");
  
  if (options.webcomicType) {
    searchParams.set("webcomicType", options.webcomicType);
  }

  // Add status filters
  if (options.status?.length) {
    options.status.forEach(s => searchParams.append("status[]", s));
  }

  const response = await fetch(`/api/search?${searchParams.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: { revalidate: CACHE_SEARCH }, // 30s cache for search
  });

  if (!response.ok) {
    throw new Error(`Webcomics search failed: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// UNIFIED SEARCH (AUTO-ROUTING)
// =============================================================================

/**
 * Universal search that automatically routes to the correct section.
 * 
 * @param params - Search parameters
 * @returns Results from the appropriate section
 * 
 * @example
 * // Search manga
 * const manga = await universalSearch({ query: "naruto", section: "manga" });
 * 
 * // Search manhwa
 * const manhwa = await universalSearch({ query: "solo leveling", section: "webcomics", webcomicType: "manhwa" });
 */
export async function universalSearch(params: {
  query?: string;
  section: ContentSection;
  webcomicType?: WebcomicType;
  limit?: number;
  offset?: number;
  status?: string[];
  contentRating?: string[];
  includedTags?: string[];
  excludedTags?: string[];
  minChapters?: string;
  maxChapters?: string;
  order?: Record<string, string>;
}): Promise<MangaListResponse> {
  if (params.section === "webcomics") {
    return getWebcomicsList({
      query: params.query,
      webcomicType: params.webcomicType,
      limit: params.limit,
      offset: params.offset,
      status: params.status,
      contentRating: params.contentRating,
      order: params.order,
    });
  }

  // Manga section
  if (params.query) {
    return searchManga({
      query: params.query,
      section: "manga",
      limit: params.limit,
      offset: params.offset,
    });
  }

  return getMangaList({
    section: "manga",
    limit: params.limit,
    offset: params.offset,
    status: params.status,
    contentRating: params.contentRating,
    includedTags: params.includedTags,
    excludedTags: params.excludedTags,
    minChapters: params.minChapters,
    maxChapters: params.maxChapters,
    order: params.order,
  });
}

// =============================================================================
// MANGA DETAILS
// =============================================================================

/**
 * Get detailed manga information.
 * 
 * Uses longer cache for details as they change less frequently.
 */
export async function getManga(
  id: string, 
  source?: "mangadex" | "consumet",
  provider?: ConsumetProviderName
): Promise<LegacyManga> {
  const searchParams = new URLSearchParams();
  if (source) {
    searchParams.set("source", source);
  }
  if (provider) {
    searchParams.set("provider", provider);
  }

  const url = searchParams.toString() 
    ? `/api/manga/${id}?${searchParams.toString()}`
    : `/api/manga/${id}`;

  const response = await fetch(url, {
    next: { revalidate: CACHE_DETAILS }, // 5 minute cache for details
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch manga: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Handle both legacy MangaDex format and new normalized format
  if (data.normalized) {
    const details: MangaDetails = data.normalized;
    return {
      id: details.id,
      imageUrl: details.coverImage,
      name: details.title,
      altTitles: details.altTitles,
      author: details.authors[0] || "Unknown",
      artist: details.artists[0] || details.authors[0] || "Unknown",
      status: details.status.charAt(0).toUpperCase() + details.status.slice(1),
      updated: new Date(details.updatedAt).toLocaleDateString(),
      description: details.description,
      genres: details.genres.filter((g) => g.group === "genre").map((g) => g.name),
      tags: details.genres,
      year: details.year,
      contentRating: details.contentRating,
      publicationDemographic: details.demographic,
      originalLanguage: details.language,
      lastChapter: details.lastChapter,
      chapterList: [],
    };
  }
  
  // Legacy MangaDex format
  const mangaDexManga = data.data;
  const attrs = mangaDexManga.attributes;
  
  const getPreferredText = (obj: Record<string, string | undefined>, fallback = "") => {
    return obj?.en || obj?.ja || Object.values(obj || {})[0] || fallback;
  };

  const coverArt = mangaDexManga.relationships?.find((r: { type: string }) => r.type === "cover_art");
  const imageUrl = coverArt?.id 
    ? `/api/cover-image/${mangaDexManga.id}/${coverArt.id}`
    : PLACEHOLDER_IMAGE;

  return {
    id: mangaDexManga.id,
    imageUrl,
    name: getPreferredText(attrs.title, "Untitled"),
    altTitles: (attrs.altTitles || [])
      .map((alt: Record<string, string>) => Object.values(alt)[0])
      .filter(Boolean),
    author: mangaDexManga.relationships?.find((r: { type: string }) => r.type === "author")?.attributes?.name || "Unknown",
    artist: mangaDexManga.relationships?.find((r: { type: string }) => r.type === "artist")?.attributes?.name || "Unknown",
    status: attrs.status?.charAt(0).toUpperCase() + attrs.status?.slice(1) || "Unknown",
    updated: new Date(attrs.updatedAt).toLocaleDateString(),
    description: getPreferredText(attrs.description, ""),
    genres: (attrs.tags || [])
      .filter((tag: { attributes: { group: string } }) => tag.attributes.group === "genre")
      .map((tag: { attributes: { name: Record<string, string> } }) => getPreferredText(tag.attributes.name)),
    tags: (attrs.tags || []).map((tag: { id: string; attributes: { name: Record<string, string>; group: string } }) => ({
      id: tag.id,
      name: getPreferredText(tag.attributes.name, "Unknown"),
      group: tag.attributes.group,
    })),
    year: attrs.year,
    contentRating: attrs.contentRating,
    publicationDemographic: attrs.publicationDemographic,
    originalLanguage: attrs.originalLanguage,
    lastChapter: attrs.lastChapter,
    chapterList: [],
  };
}

// =============================================================================
// DATABASE SYNC STATUS
// =============================================================================

/**
 * Get database sync status.
 */
export async function getDbSyncStatus(): Promise<{
  status: "IDLE" | "SYNCING" | "ERROR";
  totalMangaCount: number;
  lastFullSync: string | null;
  lastIncrementalSync: string | null;
  lastError?: string;
}> {
  const response = await fetch("/api/sync/status", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Sync status API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if database search is available.
 */
export async function isDbSearchAvailable(): Promise<boolean> {
  try {
    const status = await getDbSyncStatus();
    return status.totalMangaCount > 0;
  } catch {
    return false;
  }
}

// =============================================================================
// LEGACY EXPORTS (BACKWARD COMPATIBILITY)
// =============================================================================

export interface DbSearchParams {
  query?: string;
  limit?: number;
  offset?: number;
  includedTags?: string[];
  excludedTags?: string[];
  status?: string[];
  contentRating?: string[];
  originalLanguage?: string[];
  minChapters?: string;
  maxChapters?: string;
  sortBy?: "relevance" | "popularity" | "latest" | "title" | "year";
  sortOrder?: "asc" | "desc";
}

/**
 * @deprecated Use getMangaList or getWebcomicsList instead
 */
export async function searchMangaDb(params: DbSearchParams): Promise<MangaListResponse> {
  return getMangaList({
    ...params,
    section: "manga",
    order: params.sortBy === "popularity" 
      ? { followedCount: params.sortOrder || "desc" }
      : params.sortBy === "latest"
      ? { updatedAt: params.sortOrder || "desc" }
      : undefined,
  });
}

/**
 * @deprecated Use universalSearch instead
 */
export async function advancedSearchMangaDb(params: {
  query?: string;
  includedTags?: string[];
  excludedTags?: string[];
  preferredTags?: string[];
  status?: string[];
  contentRating?: string[];
  originalLanguage?: string[];
  minChapters?: number;
  maxChapters?: number;
  minYear?: number;
  maxYear?: number;
  limit?: number;
  offset?: number;
  sortBy?: "relevance" | "popularity" | "latest" | "title" | "year";
  sortOrder?: "asc" | "desc";
}): Promise<{
  results: Array<{ manga: MangaListItem; score: number }>;
  metaData: {
    total: number;
    limit: number;
    offset: number;
    totalPages: number;
  };
}> {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...params,
      section: "manga",
      status: params.status?.map((s) => s.toUpperCase()),
      contentRating: params.contentRating?.map((r) => r.toUpperCase()),
    }),
  });

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`);
  }

  return response.json();
}

// Re-export for backward compatibility
export { searchMangaDb as smartSearchMangaDb };
