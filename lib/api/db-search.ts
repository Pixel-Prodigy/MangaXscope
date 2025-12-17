import type { MangaListResponse, MangaListItem } from "./types";
import { parseNaturalQuery, parsedQueryToSearchParams } from "@/lib/sync/tag-mapping";

const DEFAULT_LIMIT = 20;

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
 * Search manga using the database-backed search API
 */
export async function searchMangaDb(
  params: DbSearchParams
): Promise<MangaListResponse> {
  const searchParams = new URLSearchParams();

  if (params.query) {
    searchParams.set("q", params.query);
  }

  searchParams.set("limit", String(params.limit || DEFAULT_LIMIT));
  searchParams.set("offset", String(params.offset || 0));

  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }
  if (params.sortOrder) {
    searchParams.set("sortOrder", params.sortOrder);
  }

  // Array params
  params.includedTags?.forEach((tag) => searchParams.append("includedTags[]", tag));
  params.excludedTags?.forEach((tag) => searchParams.append("excludedTags[]", tag));
  params.status?.forEach((s) => searchParams.append("status[]", s.toUpperCase()));
  params.contentRating?.forEach((r) => searchParams.append("contentRating[]", r.toUpperCase()));
  params.originalLanguage?.forEach((lang) => searchParams.append("originalLanguage[]", lang));

  if (params.minChapters) {
    searchParams.set("minChapters", params.minChapters);
  }
  if (params.maxChapters) {
    searchParams.set("maxChapters", params.maxChapters);
  }

  const response = await fetch(`/api/search?${searchParams.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform to match MangaListResponse format
  return {
    mangaList: data.mangaList as MangaListItem[],
    metaData: {
      total: data.metaData.total,
      limit: data.metaData.limit,
      offset: data.metaData.offset,
      totalPages: data.metaData.totalPages,
    },
  };
}

/**
 * Advanced search with tag-weighted scoring
 */
export async function advancedSearchMangaDb(params: {
  query?: string;
  includedTags?: string[];
  excludedTags?: string[];
  preferredTags?: string[]; // Tags that boost score but aren't required
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
      status: params.status?.map((s) => s.toUpperCase()),
      contentRating: params.contentRating?.map((r) => r.toUpperCase()),
    }),
  });

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get database sync status
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
 * Check if database has data (for deciding whether to use DB search)
 */
export async function isDbSearchAvailable(): Promise<boolean> {
  try {
    const status = await getDbSyncStatus();
    return status.totalMangaCount > 0;
  } catch {
    return false;
  }
}

/**
 * Smart search using natural language query parsing
 * Automatically extracts tags, status, language, and chapter requirements from query
 * 
 * Example queries:
 * - "dark revenge smart mc" -> preferredTags: [psychological, revenge]
 * - "cultivation without harem" -> preferredTags: [cultivation], excludedTags: [harem]
 * - "completed manhwa 100+ chapters" -> status: COMPLETED, language: ko, minChapters: 100
 */
export async function smartSearchMangaDb(
  naturalQuery: string,
  options: {
    limit?: number;
    offset?: number;
    additionalIncludedTags?: string[];
    additionalExcludedTags?: string[];
    contentRating?: string[];
  } = {}
): Promise<{
  results: Array<{ manga: MangaListItem; score: number }>;
  mangaList: MangaListItem[];
  metaData: {
    total: number;
    limit: number;
    offset: number;
    totalPages: number;
  };
  parsedQuery: {
    textQuery: string;
    includedTags: string[];
    excludedTags: string[];
    preferredTags: string[];
    status?: string;
    originalLanguage?: string;
    minChapters?: number;
    maxChapters?: number;
  };
}> {
  // Parse the natural language query
  const parsed = parseNaturalQuery(naturalQuery);
  const searchParams = parsedQueryToSearchParams(parsed);

  // Merge with additional tags
  const includedTags = [
    ...(searchParams.includedTags || []),
    ...(options.additionalIncludedTags || []),
  ];
  const excludedTags = [
    ...(searchParams.excludedTags || []),
    ...(options.additionalExcludedTags || []),
  ];

  // Make the search request
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: searchParams.query,
      includedTags: includedTags.length > 0 ? includedTags : undefined,
      excludedTags: excludedTags.length > 0 ? excludedTags : undefined,
      preferredTags: searchParams.preferredTags,
      status: searchParams.status ? [searchParams.status] : undefined,
      originalLanguage: searchParams.originalLanguage 
        ? [searchParams.originalLanguage] 
        : undefined,
      minChapters: searchParams.minChapters,
      maxChapters: searchParams.maxChapters,
      contentRating: options.contentRating?.map((r) => r.toUpperCase()),
      limit: options.limit || DEFAULT_LIMIT,
      offset: options.offset || 0,
      sortBy: "relevance",
      sortOrder: "desc",
    }),
  });

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    results: data.results || [],
    mangaList: data.mangaList || [],
    metaData: data.metaData,
    parsedQuery: parsed,
  };
}

