/**
 * API Types.
 * 
 * This module re-exports types from @/types for backward compatibility.
 * New code should import directly from @/types.
 */

// Re-export all types from the new types module
export type {
  // Core types
  DataSource,
  ContentType,
  ContentSection,
  WebcomicType,
  OriginalLanguage,
  PublicationStatus,
  ContentRating,
  Demographic,
  // Provider types
  ConsumetProviderName,
  ProviderPriorityConfig,
  MangaProvider,
  // Data types
  NormalizedTag,
  NormalizedManga,
  MangaListItem,
  MangaDetails,
  NormalizedChapter,
  ChapterPage,
  ChapterPagesResponse,
  PaginationMeta,
  MangaListResponse,
  ChapterListResponse,
  SearchParams,
  MultiProviderSearchResult,
  // Utility types
  ApiError,
  Result,
  CachedManga,
  CacheConfig,
} from "@/types";

// Re-export constants
export {
  CONSUMET_PROVIDER_PRIORITIES,
  LANGUAGE_TO_CONTENT_TYPE,
  CONTENT_TYPE_TO_LANGUAGE,
  CONTENT_TYPE_TO_SECTION,
  SECTION_CONTENT_TYPES,
  getProviderForContentType,
  getProviderForLanguage,
  getSectionForContentType,
  isWebcomicType,
} from "@/types";

// =============================================================================
// LEGACY TYPES (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use NormalizedTag from @/types
 */
export interface MangaDexTag {
  id: string;
  type: string;
  attributes: {
    name: {
      en: string;
      [key: string]: string | undefined;
    };
    description: Record<string, unknown>;
    group: "genre" | "theme" | "format" | "content";
    version: number;
  };
  relationships: unknown[];
}

/**
 * @deprecated Use normalized types from @/types
 */
export interface MangaDexTitle {
  en?: string;
  ja?: string;
  "ja-ro"?: string;
  ko?: string;
  zh?: string;
  [key: string]: string | undefined;
}

/**
 * @deprecated Use normalized types from @/types
 */
export interface MangaDexAltTitle {
  en?: string;
  ja?: string;
  "ja-ro"?: string;
  ko?: string;
  zh?: string;
  [key: string]: string | undefined;
}

/**
 * @deprecated Use normalized types from @/types
 */
export interface MangaDexDescription {
  en?: string;
  ja?: string;
  [key: string]: string | undefined;
}

/**
 * @deprecated Use normalized types from @/types
 */
export interface MangaDexLinks {
  al?: string;
  ap?: string;
  bw?: string;
  kt?: string;
  mu?: string;
  mal?: string;
  raw?: string;
  amz?: string;
  [key: string]: string | undefined;
}

/**
 * @deprecated Use normalized types from @/types
 */
export interface MangaDexRelationship {
  id: string;
  type: string;
  related?: string;
  attributes?: Record<string, unknown>;
}

/**
 * @deprecated Use NormalizedManga from @/types
 */
export interface MangaDexMangaAttributes {
  title: MangaDexTitle;
  altTitles: MangaDexAltTitle[];
  description: MangaDexDescription;
  isLocked: boolean;
  links: MangaDexLinks;
  officialLinks: unknown[] | null;
  originalLanguage: string;
  lastVolume: string | null;
  lastChapter: string | null;
  publicationDemographic: string | null;
  status: "ongoing" | "completed" | "hiatus" | "cancelled";
  year: number | null;
  contentRating: "safe" | "suggestive" | "erotica" | "pornographic";
  tags: MangaDexTag[];
  state: string;
  chapterNumbersResetOnNewVolume: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  availableTranslatedLanguages: string[];
  latestUploadedChapter: string | null;
}

/**
 * @deprecated Use NormalizedManga from @/types
 */
export interface MangaDexManga {
  id: string;
  type: string;
  attributes: MangaDexMangaAttributes;
  relationships: MangaDexRelationship[];
}

/**
 * @deprecated Use MangaListResponse from @/types
 */
export interface MangaDexResponse {
  result: string;
  response: string;
  data: MangaDexManga[];
  limit: number;
  offset: number;
  total: number;
}

/**
 * @deprecated Use MangaListItem from @/types
 */
export interface LegacyMangaListItem {
  id: string;
  image: string;
  title: string;
  altTitles: string[];
  description: string;
  status: string;
  year: number | null;
  contentRating: string;
  tags: Array<{
    id: string;
    name: string;
    group: string;
  }>;
  publicationDemographic: string | null;
  originalLanguage: string;
  lastChapter: string | null;
  lastVolume: string | null;
  totalChapters: number | null;
  updatedAt: string;
  createdAt: string;
}

/**
 * @deprecated Use PaginationMeta from @/types
 */
export interface MangaListMetadata {
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
}

/**
 * @deprecated Use NormalizedChapter from @/types
 */
export interface Chapter {
  id: string;
  path: string;
  name: string;
  view: string;
  createdAt: string;
}

/**
 * @deprecated Use MangaDetails from @/types
 */
export interface Manga {
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
  tags: Array<{
    id: string;
    name: string;
    group: string;
  }>;
  year: number | null;
  contentRating: string;
  publicationDemographic: string | null;
  originalLanguage: string;
  lastChapter: string | null;
  chapterList: Chapter[];
}

/**
 * @deprecated Use ChapterPage from @/types
 */
export interface ChapterImage {
  title: string;
  image: string;
}

/**
 * @deprecated Use ChapterPagesResponse from @/types
 */
export interface ChapterData {
  title: string;
  currentChapter: string;
  chapterListIds: Array<{
    id: string;
    name: string;
  }>;
  images: ChapterImage[];
}

/**
 * @deprecated Use SearchParams from @/types
 */
export interface MangaListParams {
  title?: string;
  limit?: number;
  offset?: number;
  contentRating?: string[];
  includedTags?: string[];
  excludedTags?: string[];
  status?: string[];
  publicationDemographic?: string[];
  originalLanguage?: string[];
  order?: Record<string, string>;
  minChapters?: string;
  maxChapters?: string;
}

/**
 * @deprecated Use SearchParams from @/types
 */
export interface LegacySearchParams {
  query: string;
  limit?: number;
  offset?: number;
}
