/**
 * Shared types for the manga discovery application.
 *
 * This module defines the normalized data structures used throughout the app,
 * ensuring consistency between different data providers (MangaDex, Consumet).
 *
 * ARCHITECTURE:
 * - Manga Section: MangaDex ONLY (Japanese content)
 * - Webcomics Section: Consumet with multi-provider fallback (Manhwa/Manhua/Webtoon)
 */

// =============================================================================
// CONTENT SECTIONS & TYPES
// =============================================================================

/**
 * Top-level content sections.
 * - manga: Japanese manga via MangaDex
 * - webcomics: Manhwa/Manhua/Webtoons via Consumet
 */
export type ContentSection = "manga" | "webcomics";

/**
 * Supported data sources for manga content.
 * - mangadex: Official MangaDex API (Japanese manga only)
 * - consumet: Consumet API (manhwa, manhua, webtoons)
 */
export type DataSource = "mangadex" | "consumet";

/**
 * Content type classification.
 * Used to determine which API provider to use.
 */
export type ContentType = "manga" | "manhwa" | "manhua" | "webtoon";

/**
 * Webcomic content types (non-manga).
 */
export type WebcomicType = "manhwa" | "manhua" | "webtoon";

/**
 * Original language codes mapped to content types.
 */
export type OriginalLanguage = "ja" | "ko" | "zh" | "en";

/**
 * Publication status of manga/manhwa.
 */
export type PublicationStatus =
  | "ongoing"
  | "completed"
  | "hiatus"
  | "cancelled"
  | "unknown";

/**
 * Content rating for age appropriateness.
 */
export type ContentRating = "safe" | "suggestive" | "erotica" | "pornographic";

/**
 * Publication demographic target.
 */
export type Demographic = "shounen" | "shoujo" | "seinen" | "josei" | null;

// =============================================================================
// CONSUMET PROVIDER CONFIGURATION
// =============================================================================

/**
 * Available Consumet manga providers.
 * ACTUAL manhwa/manhua/webtoon providers from Consumet.
 */
export type ConsumetProviderName =
  | "asurascans"
  | "reaperscans"
  | "flamescans"
  | "mangakakalot"
  | "mangapark";

/**
 * Provider priority configuration for different content types.
 */
export interface ProviderPriorityConfig {
  manhwa: ConsumetProviderName[];
  manhua: ConsumetProviderName[];
  webtoon: ConsumetProviderName[];
  default: ConsumetProviderName[];
}

/**
 * Default provider priorities for maximum coverage.
 * Uses actual manhwa/manhua providers from Consumet.
 */
export const CONSUMET_PROVIDER_PRIORITIES: ProviderPriorityConfig = {
  // Manhwa (Korean): Prioritize actual manhwa sources
  manhwa: [
    "asurascans",
    "reaperscans",
    "flamescans",
    "mangakakalot",
    "mangapark",
  ],

  // Manhua (Chinese): Aggregators have good Chinese content
  manhua: [
    "mangakakalot",
    "mangapark",
    "asurascans",
    "reaperscans",
    "flamescans",
  ],

  // Webtoon: All providers
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
// NORMALIZED DATA TYPES
// =============================================================================

/**
 * Normalized genre/tag structure.
 */
export interface NormalizedTag {
  id: string;
  name: string;
  group: "genre" | "theme" | "format" | "content";
}

/**
 * Normalized manga metadata - the core data structure.
 * All providers must transform their responses to this format.
 */
export interface NormalizedManga {
  /** Unique identifier (source-specific) */
  id: string;

  /** Which API this data came from */
  source: DataSource;

  /** Consumet provider name (if source is consumet) */
  provider?: ConsumetProviderName;

  /** Primary title (preferably English) */
  title: string;

  /** Alternative titles in various languages */
  altTitles: string[];

  /** Synopsis/description */
  description: string;

  /** Cover image URL (proxied through our API) */
  coverImage: string;

  /** Normalized genre/tag list */
  genres: NormalizedTag[];

  /** Publication status */
  status: PublicationStatus;

  /** Content type classification */
  contentType: ContentType;

  /** Original language code */
  language: OriginalLanguage;

  /** Content rating */
  contentRating: ContentRating;

  /** Target demographic */
  demographic: Demographic;

  /** Publication year */
  year: number | null;

  /** Total chapter count (if known) */
  totalChapters: number | null;

  /** Last chapter number */
  lastChapter: string | null;

  /** Last volume number */
  lastVolume: string | null;

  /** Author name(s) */
  authors: string[];

  /** Artist name(s) */
  artists: string[];

  /** Follower/popularity count */
  followedCount: number;

  /** Average rating (0-10) */
  rating: number | null;

  /** Last updated timestamp */
  updatedAt: string;

  /** Created timestamp */
  createdAt: string;
}

/**
 * Simplified manga item for list views.
 * Uses `image` for backward compatibility with existing UI components.
 */
export interface MangaListItem {
  id: string;
  source: DataSource;
  /** Consumet provider name (if source is consumet) */
  provider?: ConsumetProviderName;
  title: string;
  altTitles: string[];
  description: string;
  /** Cover image URL - named 'image' for backward compatibility */
  image: string;
  status: PublicationStatus;
  contentType: ContentType;
  language: OriginalLanguage;
  contentRating: ContentRating;
  genres: NormalizedTag[];
  year: number | null;
  totalChapters: number | null;
  lastChapter: string | null;
  updatedAt: string;
}

/**
 * Full manga details including author/artist info.
 */
export interface MangaDetails extends NormalizedManga {
  /** External links (MAL, AniList, etc.) */
  externalLinks: Record<string, string>;
}

// =============================================================================
// CHAPTER TYPES
// =============================================================================

/**
 * Normalized chapter data.
 */
export interface NormalizedChapter {
  /** Unique chapter identifier */
  id: string;

  /** Chapter number (e.g., "1", "10.5") */
  chapter: string | null;

  /** Volume number */
  volume: string | null;

  /** Chapter title */
  title: string | null;

  /** Translation language code */
  language: string;

  /** Number of pages */
  pages: number;

  /** Publish timestamp */
  publishedAt: string;

  /** Scanlation group name */
  scanlationGroup: string | null;

  /** External URL if chapter is hosted elsewhere */
  externalUrl: string | null;
}

/**
 * Chapter page/image data.
 */
export interface ChapterPage {
  /** 0-based page index */
  index: number;

  /** Image URL (may be proxied) */
  imageUrl: string;

  /** Image width if known */
  width?: number;

  /** Image height if known */
  height?: number;
}

/**
 * Response for chapter pages request.
 */
export interface ChapterPagesResponse {
  chapterId: string;
  mangaId: string;
  pages: ChapterPage[];

  /** Referer header needed for image requests (some sources require this) */
  referer?: string;

  /** Chapter metadata */
  metadata: {
    chapter: string | null;
    volume: string | null;
    title: string | null;
    language: string;
    totalPages: number;
  };
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Pagination metadata.
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
}

/**
 * Paginated manga list response.
 */
export interface MangaListResponse {
  mangaList: MangaListItem[];
  metaData: PaginationMeta;
  /** Provider used for this response (for webcomics) */
  provider?: ConsumetProviderName;
}

/**
 * Chapter list response.
 */
export interface ChapterListResponse {
  chapters: NormalizedChapter[];
  total: number;
  mangaId: string;
  source: DataSource;
  provider?: ConsumetProviderName;
}

// =============================================================================
// SEARCH & FILTER TYPES
// =============================================================================

/**
 * Search parameters for manga queries.
 */
export interface SearchParams {
  /** Text search query */
  query?: string;

  /** Content section (manga or webcomics) */
  section?: ContentSection;

  /** Content type filter - determines which API to use */
  type?: ContentType | ContentType[];

  /** Webcomic type for webcomics section */
  webcomicType?: WebcomicType;

  /** Tags that must be included (AND logic) */
  includedTags?: string[];

  /** Tags that must be excluded */
  excludedTags?: string[];

  /** Status filter */
  status?: PublicationStatus[];

  /** Content rating filter */
  contentRating?: ContentRating[];

  /** Demographic filter */
  demographic?: Demographic[];

  /** Language filter */
  language?: OriginalLanguage[];

  /** Minimum chapter count */
  minChapters?: number;

  /** Maximum chapter count */
  maxChapters?: number;

  /** Minimum publication year */
  minYear?: number;

  /** Maximum publication year */
  maxYear?: number;

  /** Results per page */
  limit?: number;

  /** Pagination offset */
  offset?: number;

  /** Sort field */
  sortBy?: "relevance" | "popularity" | "latest" | "title" | "year";

  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/**
 * Provider interface that all data sources must implement.
 */
export interface MangaProvider {
  /** Provider name for identification */
  readonly name: DataSource;

  /** Consumet provider name (if applicable) */
  readonly consumetProvider?: ConsumetProviderName;

  /**
   * Search for manga with filters.
   */
  search(params: SearchParams): Promise<MangaListResponse>;

  /**
   * Get detailed manga information.
   * @param id - Manga ID
   * @param provider - Optional: specific Consumet provider (for consumet source only)
   */
  getDetails(
    id: string,
    provider?: ConsumetProviderName
  ): Promise<MangaDetails>;

  /**
   * Get chapter list for a manga.
   */
  getChapters(
    mangaId: string,
    options?: {
      limit?: number;
      offset?: number;
      language?: string;
      provider?: ConsumetProviderName;
    }
  ): Promise<ChapterListResponse>;

  /**
   * Get page images for a chapter.
   */
  getChapterPages(
    mangaId: string,
    chapterId: string,
    provider?: ConsumetProviderName
  ): Promise<ChapterPagesResponse>;
}

/**
 * Multi-provider search result with provider info.
 */
export interface MultiProviderSearchResult {
  provider: ConsumetProviderName;
  results: MangaListResponse;
  success: boolean;
  error?: string;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

/**
 * Cached manga entry in database.
 */
export interface CachedManga {
  id: string;
  source: DataSource;
  sourceId: string;
  provider?: ConsumetProviderName;
  data: NormalizedManga;
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Cache configuration.
 */
export interface CacheConfig {
  /** TTL for search results in seconds */
  searchTtl: number;

  /** TTL for manga details in seconds */
  detailsTtl: number;

  /** TTL for chapter lists in seconds */
  chaptersTtl: number;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * API error response.
 */
export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

/**
 * Result type for operations that can fail.
 */
export type Result<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

// =============================================================================
// CONSTANTS & MAPPINGS
// =============================================================================

/**
 * Language code to content type mapping.
 */
export const LANGUAGE_TO_CONTENT_TYPE: Record<OriginalLanguage, ContentType> = {
  ja: "manga",
  ko: "manhwa",
  zh: "manhua",
  en: "manga", // English originals are treated as manga
} as const;

/**
 * Content type to language code mapping.
 */
export const CONTENT_TYPE_TO_LANGUAGE: Record<ContentType, OriginalLanguage> = {
  manga: "ja",
  manhwa: "ko",
  manhua: "zh",
  webtoon: "ko",
} as const;

/**
 * Content type to section mapping.
 */
export const CONTENT_TYPE_TO_SECTION: Record<ContentType, ContentSection> = {
  manga: "manga",
  manhwa: "webcomics",
  manhua: "webcomics",
  webtoon: "webcomics",
} as const;

/**
 * Section to allowed content types.
 */
export const SECTION_CONTENT_TYPES: Record<ContentSection, ContentType[]> = {
  manga: ["manga"],
  webcomics: ["manhwa", "manhua", "webtoon"],
} as const;

/**
 * Determine which provider to use based on content type.
 */
export function getProviderForContentType(
  contentType: ContentType
): DataSource {
  switch (contentType) {
    case "manga":
      return "mangadex";
    case "manhwa":
    case "manhua":
    case "webtoon":
      return "consumet";
    default:
      return "mangadex";
  }
}

/**
 * Determine which provider to use based on language.
 */
export function getProviderForLanguage(language: OriginalLanguage): DataSource {
  switch (language) {
    case "ja":
      return "mangadex";
    case "ko":
    case "zh":
      return "consumet";
    default:
      return "mangadex";
  }
}

/**
 * Get section from content type.
 */
export function getSectionForContentType(
  contentType: ContentType
): ContentSection {
  return CONTENT_TYPE_TO_SECTION[contentType];
}

/**
 * Check if content type belongs to webcomics section.
 */
export function isWebcomicType(
  contentType: ContentType
): contentType is WebcomicType {
  return (
    contentType === "manhwa" ||
    contentType === "manhua" ||
    contentType === "webtoon"
  );
}
