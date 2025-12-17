/**
 * MangaDex Provider Implementation.
 * 
 * This provider handles all communication with the MangaDex API.
 * Use ONLY for Japanese manga (originalLanguage === "ja").
 * 
 * All API calls are server-side through Next.js route handlers.
 */

import type {
  MangaProvider,
  MangaListResponse,
  MangaDetails,
  ChapterListResponse,
  ChapterPagesResponse,
  SearchParams,
  NormalizedManga,
  MangaListItem,
  NormalizedChapter,
  NormalizedTag,
  PublicationStatus,
  ContentRating,
  ContentType,
  OriginalLanguage,
  Demographic,
} from "@/types";

// =============================================================================
// CONSTANTS
// =============================================================================

const MANGADEX_API = "https://api.mangadex.org";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const PLACEHOLDER_IMAGE = "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover";

const DEFAULT_CONTENT_RATINGS: ContentRating[] = ["safe", "suggestive"];

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 15000;

// =============================================================================
// MANGADEX API TYPES
// =============================================================================

interface MangaDexTitle {
  en?: string;
  ja?: string;
  "ja-ro"?: string;
  ko?: string;
  zh?: string;
  [key: string]: string | undefined;
}

interface MangaDexDescription {
  en?: string;
  ja?: string;
  [key: string]: string | undefined;
}

interface MangaDexTag {
  id: string;
  type: string;
  attributes: {
    name: Record<string, string>;
    group: "genre" | "theme" | "format" | "content";
  };
}

interface MangaDexRelationship {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    [key: string]: unknown;
  };
}

interface MangaDexMangaAttributes {
  title: MangaDexTitle;
  altTitles: Array<Record<string, string>>;
  description: MangaDexDescription;
  status: string;
  year: number | null;
  contentRating: string;
  publicationDemographic: string | null;
  originalLanguage: string;
  lastChapter: string | null;
  lastVolume: string | null;
  tags: MangaDexTag[];
  createdAt: string;
  updatedAt: string;
  links?: Record<string, string>;
}

interface MangaDexManga {
  id: string;
  type: string;
  attributes: MangaDexMangaAttributes;
  relationships: MangaDexRelationship[];
}

interface MangaDexListResponse {
  result: string;
  data: MangaDexManga[];
  limit: number;
  offset: number;
  total: number;
}

interface MangaDexChapterAttributes {
  volume: string | null;
  chapter: string | null;
  title: string | null;
  translatedLanguage: string;
  externalUrl: string | null;
  publishAt: string;
  pages: number;
}

interface MangaDexChapter {
  id: string;
  type: string;
  attributes: MangaDexChapterAttributes;
  relationships: MangaDexRelationship[];
}

interface MangaDexChapterListResponse {
  result: string;
  data: MangaDexChapter[];
  limit: number;
  offset: number;
  total: number;
}

interface MangaDexAtHomeResponse {
  result: string;
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get preferred text from a multi-language object.
 * Prioritizes English, then Japanese, then first available.
 */
function getPreferredText(
  obj: Record<string, string | undefined> | undefined,
  fallback = ""
): string {
  if (!obj) return fallback;
  return obj.en || obj.ja || obj["ja-ro"] || Object.values(obj).find(v => v) || fallback;
}

/**
 * Find a relationship by type.
 */
function findRelationship(
  relationships: MangaDexRelationship[],
  type: string
): MangaDexRelationship | undefined {
  return relationships.find((rel) => rel.type === type);
}

/**
 * Extract cover art ID from relationships.
 */
function getCoverArtId(relationships: MangaDexRelationship[]): string | null {
  const coverArt = findRelationship(relationships, "cover_art");
  return coverArt?.id || null;
}

/**
 * Get cover image URL (proxied through our API).
 */
function getCoverImageUrl(mangaId: string, coverArtId: string | null): string {
  if (!coverArtId) return PLACEHOLDER_IMAGE;
  return `/api/cover-image/${mangaId}/${coverArtId}`;
}

/**
 * Map MangaDex status to normalized status.
 */
function mapStatus(status: string): PublicationStatus {
  switch (status.toLowerCase()) {
    case "ongoing":
      return "ongoing";
    case "completed":
      return "completed";
    case "hiatus":
      return "hiatus";
    case "cancelled":
      return "cancelled";
    default:
      return "unknown";
  }
}

/**
 * Map MangaDex content rating to normalized rating.
 */
function mapContentRating(rating: string): ContentRating {
  switch (rating.toLowerCase()) {
    case "safe":
      return "safe";
    case "suggestive":
      return "suggestive";
    case "erotica":
      return "erotica";
    case "pornographic":
      return "pornographic";
    default:
      return "safe";
  }
}

/**
 * Map MangaDex demographic to normalized demographic.
 */
function mapDemographic(demographic: string | null): Demographic {
  if (!demographic) return null;
  switch (demographic.toLowerCase()) {
    case "shounen":
      return "shounen";
    case "shoujo":
      return "shoujo";
    case "seinen":
      return "seinen";
    case "josei":
      return "josei";
    default:
      return null;
  }
}

/**
 * Transform MangaDex tags to normalized tags.
 */
function transformTags(tags: MangaDexTag[]): NormalizedTag[] {
  return tags.map((tag) => ({
    id: tag.id,
    name: getPreferredText(tag.attributes.name, "Unknown"),
    group: tag.attributes.group,
  }));
}

/**
 * Extract alt titles from MangaDex format.
 */
function extractAltTitles(altTitles: Array<Record<string, string>>): string[] {
  return altTitles
    .map((alt) => Object.values(alt)[0])
    .filter((title): title is string => Boolean(title));
}

/**
 * Extract author/artist names from relationships.
 */
function extractCreators(
  relationships: MangaDexRelationship[],
  type: "author" | "artist"
): string[] {
  return relationships
    .filter((rel) => rel.type === type)
    .map((rel) => rel.attributes?.name)
    .filter((name): name is string => Boolean(name));
}

/**
 * Estimate total chapters from lastChapter string.
 */
function estimateTotalChapters(lastChapter: string | null): number | null {
  if (!lastChapter) return null;
  const num = parseFloat(lastChapter);
  return !isNaN(num) && num > 0 ? Math.floor(num) : null;
}

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

// =============================================================================
// TRANSFORMER FUNCTIONS
// =============================================================================

/**
 * Infer content type from original language.
 */
function inferContentTypeFromLanguage(language: string): ContentType {
  switch (language) {
    case "ko":
      return "manhwa";
    case "zh":
    case "zh-hk":
      return "manhua";
    default:
      return "manga";
  }
}

/**
 * Transform MangaDex manga to normalized format.
 */
function transformManga(manga: MangaDexManga): MangaListItem {
  const attrs = manga.attributes;
  const coverArtId = getCoverArtId(manga.relationships);
  const originalLang = attrs.originalLanguage || "ja";
  const contentType = inferContentTypeFromLanguage(originalLang);

  return {
    id: manga.id,
    source: "mangadex",
    title: getPreferredText(attrs.title, "Untitled"),
    altTitles: extractAltTitles(attrs.altTitles),
    description: getPreferredText(attrs.description, ""),
    image: getCoverImageUrl(manga.id, coverArtId),
    status: mapStatus(attrs.status),
    contentType,
    language: originalLang as OriginalLanguage,
    contentRating: mapContentRating(attrs.contentRating),
    genres: transformTags(attrs.tags),
    year: attrs.year,
    totalChapters: estimateTotalChapters(attrs.lastChapter),
    lastChapter: attrs.lastChapter,
    updatedAt: attrs.updatedAt,
  };
}

/**
 * Transform MangaDex manga to full details format.
 */
function transformMangaDetails(manga: MangaDexManga): MangaDetails {
  const attrs = manga.attributes;
  const coverArtId = getCoverArtId(manga.relationships);
  const originalLang = attrs.originalLanguage || "ja";
  const contentType = inferContentTypeFromLanguage(originalLang);

  return {
    id: manga.id,
    source: "mangadex",
    title: getPreferredText(attrs.title, "Untitled"),
    altTitles: extractAltTitles(attrs.altTitles),
    description: getPreferredText(attrs.description, ""),
    coverImage: getCoverImageUrl(manga.id, coverArtId),
    genres: transformTags(attrs.tags),
    status: mapStatus(attrs.status),
    contentType,
    language: originalLang as OriginalLanguage,
    contentRating: mapContentRating(attrs.contentRating),
    demographic: mapDemographic(attrs.publicationDemographic),
    year: attrs.year,
    totalChapters: estimateTotalChapters(attrs.lastChapter),
    lastChapter: attrs.lastChapter,
    lastVolume: attrs.lastVolume,
    authors: extractCreators(manga.relationships, "author"),
    artists: extractCreators(manga.relationships, "artist"),
    followedCount: 0, // Would need statistics API call
    rating: null, // Would need statistics API call
    updatedAt: attrs.updatedAt,
    createdAt: attrs.createdAt,
    externalLinks: attrs.links || {},
  };
}

/**
 * Transform MangaDex chapter to normalized format.
 */
function transformChapter(chapter: MangaDexChapter): NormalizedChapter {
  const attrs = chapter.attributes;
  const scanlationGroup = chapter.relationships.find(
    (rel) => rel.type === "scanlation_group"
  );

  return {
    id: chapter.id,
    chapter: attrs.chapter,
    volume: attrs.volume,
    title: attrs.title,
    language: attrs.translatedLanguage,
    pages: attrs.pages,
    publishedAt: attrs.publishAt,
    scanlationGroup: scanlationGroup?.attributes?.name || null,
    externalUrl: attrs.externalUrl,
  };
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Build search params for MangaDex API.
 */
function buildSearchParams(params: SearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset || 0;

  searchParams.set("limit", limit.toString());
  searchParams.set("offset", offset.toString());
  
  // Include related entities
  searchParams.append("includes[]", "cover_art");
  searchParams.append("includes[]", "author");
  searchParams.append("includes[]", "artist");

  // Text search
  if (params.query) {
    searchParams.set("title", params.query);
  }

  // Content rating
  const contentRatings = params.contentRating?.length 
    ? params.contentRating 
    : DEFAULT_CONTENT_RATINGS;
  contentRatings.forEach((rating) => {
    searchParams.append("contentRating[]", rating);
  });

  // Status filter
  params.status?.forEach((status) => {
    searchParams.append("status[]", status);
  });

  // Tag filters
  params.includedTags?.forEach((tagId) => {
    searchParams.append("includedTags[]", tagId);
  });
  params.excludedTags?.forEach((tagId) => {
    searchParams.append("excludedTags[]", tagId);
  });

  // Language filter - use provided languages or default to Japanese
  const languages = params.language?.length ? params.language : ["ja"];
  languages.forEach((lang) => {
    searchParams.append("originalLanguage[]", lang);
  });

  // Demographic filter
  params.demographic?.forEach((demo) => {
    if (demo) searchParams.append("publicationDemographic[]", demo);
  });

  // Sorting
  switch (params.sortBy) {
    case "popularity":
      searchParams.set("order[followedCount]", params.sortOrder || "desc");
      break;
    case "latest":
      searchParams.set("order[updatedAt]", params.sortOrder || "desc");
      break;
    case "title":
      searchParams.set("order[title]", params.sortOrder || "asc");
      break;
    case "year":
      searchParams.set("order[year]", params.sortOrder || "desc");
      break;
    case "relevance":
    default:
      if (params.query) {
        searchParams.set("order[relevance]", "desc");
      } else {
        searchParams.set("order[updatedAt]", "desc");
      }
      break;
  }

  return searchParams;
}

// =============================================================================
// PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * MangaDex provider implementation.
 * 
 * @remarks
 * This provider should ONLY be used for Japanese manga.
 * For manhwa, manhua, and webtoons, use the Consumet provider.
 */
export const mangadexProvider: MangaProvider = {
  name: "mangadex",

  /**
   * Search for manga on MangaDex.
   */
  async search(params: SearchParams): Promise<MangaListResponse> {
    const searchParams = buildSearchParams(params);
    
    const response = await fetchWithTimeout(
      `${MANGADEX_API}/manga?${searchParams.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MangaDex] Search error:", response.status, errorText);
      throw new Error(`MangaDex search failed: ${response.status}`);
    }

    const data: MangaDexListResponse = await response.json();

    const mangaList = data.data.map(transformManga);

    // Apply chapter count filter if specified (client-side since MangaDex doesn't support this)
    let filteredList = mangaList;
    if (params.minChapters !== undefined || params.maxChapters !== undefined) {
      filteredList = mangaList.filter((manga) => {
        const chapters = manga.totalChapters;
        if (chapters === null) return false;
        if (params.minChapters !== undefined && chapters < params.minChapters) return false;
        if (params.maxChapters !== undefined && chapters > params.maxChapters) return false;
        return true;
      });
    }

    const limit = params.limit || DEFAULT_LIMIT;
    return {
      mangaList: filteredList,
      metaData: {
        total: data.total,
        limit,
        offset: params.offset || 0,
        totalPages: Math.ceil(data.total / limit),
      },
    };
  },

  /**
   * Get detailed manga information from MangaDex.
   */
  async getDetails(id: string, _provider?: unknown): Promise<MangaDetails> {
    const searchParams = new URLSearchParams();
    searchParams.append("includes[]", "cover_art");
    searchParams.append("includes[]", "author");
    searchParams.append("includes[]", "artist");

    const response = await fetchWithTimeout(
      `${MANGADEX_API}/manga/${id}?${searchParams.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MangaDex] Details error:", response.status, errorText);
      throw new Error(`MangaDex details failed: ${response.status}`);
    }

    const data = await response.json();
    return transformMangaDetails(data.data);
  },

  /**
   * Get chapter list for a manga from MangaDex.
   */
  async getChapters(
    mangaId: string,
    options: { limit?: number; offset?: number; language?: string } = {}
  ): Promise<ChapterListResponse> {
    const limit = Math.min(options.limit || 100, 100); // MangaDex max is 100
    const offset = options.offset || 0;
    const language = options.language || "en";

    const searchParams = new URLSearchParams();
    searchParams.set("manga", mangaId);
    searchParams.set("limit", limit.toString());
    searchParams.set("offset", offset.toString());
    searchParams.append("translatedLanguage[]", language);
    searchParams.set("order[chapter]", "asc");
    searchParams.append("includes[]", "scanlation_group");
    
    // Include all content ratings
    ["safe", "suggestive", "erotica", "pornographic"].forEach((rating) => {
      searchParams.append("contentRating[]", rating);
    });

    const response = await fetchWithTimeout(
      `${MANGADEX_API}/chapter?${searchParams.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MangaDex] Chapters error:", response.status, errorText);
      throw new Error(`MangaDex chapters failed: ${response.status}`);
    }

    const data: MangaDexChapterListResponse = await response.json();

    // Filter out external chapters
    const chapters = data.data
      .filter((ch) => !ch.attributes.externalUrl)
      .map(transformChapter);

    return {
      chapters,
      total: data.total,
      mangaId,
      source: "mangadex",
    };
  },

  /**
   * Get chapter pages from MangaDex at-home servers.
   */
  async getChapterPages(
    mangaId: string,
    chapterId: string,
    _provider?: unknown
  ): Promise<ChapterPagesResponse> {
    // Fetch at-home server URL
    const atHomeResponse = await fetchWithTimeout(
      `${MANGADEX_API}/at-home/server/${chapterId}`
    );

    if (!atHomeResponse.ok) {
      const errorText = await atHomeResponse.text();
      console.error("[MangaDex] At-home error:", atHomeResponse.status, errorText);
      throw new Error(`MangaDex at-home failed: ${atHomeResponse.status}`);
    }

    const atHomeData: MangaDexAtHomeResponse = await atHomeResponse.json();

    // Fetch chapter metadata
    const metaResponse = await fetchWithTimeout(
      `${MANGADEX_API}/chapter/${chapterId}`
    );

    let metadata = {
      chapter: null as string | null,
      volume: null as string | null,
      title: null as string | null,
      language: "en",
      totalPages: atHomeData.chapter.data.length,
    };

    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      const attrs = metaData.data?.attributes;
      if (attrs) {
        metadata = {
          chapter: attrs.chapter,
          volume: attrs.volume,
          title: attrs.title,
          language: attrs.translatedLanguage,
          totalPages: attrs.pages,
        };
      }
    }

    // Build proxied image URLs
    const pages = atHomeData.chapter.data.map((_, index) => ({
      index,
      imageUrl: `/api/reader/${mangaId}/${chapterId}/page/${index}`,
    }));

    return {
      chapterId,
      mangaId,
      pages,
      metadata,
    };
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export default mangadexProvider;

/**
 * Direct API functions for use in route handlers.
 * These bypass the provider interface for more control.
 */
export const mangadexApi = {
  /**
   * Fetch manga list directly from MangaDex.
   */
  async fetchMangaList(params: URLSearchParams): Promise<MangaDexListResponse> {
    const response = await fetchWithTimeout(
      `${MANGADEX_API}/manga?${params.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`MangaDex API error: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Fetch chapter at-home data directly.
   */
  async fetchAtHome(chapterId: string): Promise<MangaDexAtHomeResponse> {
    const response = await fetchWithTimeout(
      `${MANGADEX_API}/at-home/server/${chapterId}`
    );
    
    if (!response.ok) {
      throw new Error(`MangaDex at-home error: ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Get available tags from MangaDex.
   */
  async fetchTags(): Promise<MangaDexTag[]> {
    const response = await fetchWithTimeout(`${MANGADEX_API}/manga/tag`);
    
    if (!response.ok) {
      throw new Error(`MangaDex tags error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data;
  },
};

