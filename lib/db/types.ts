import type {
  Manga,
  Tag,
  Status,
  ContentRating,
  Demographic,
  TagGroup,
  SyncStatus,
} from "@prisma/client";

// Re-export Prisma types for convenience
export type {
  Manga,
  Tag,
  Status,
  ContentRating,
  Demographic,
  TagGroup,
  SyncStatus,
};

// Extended manga type with tags
export interface MangaWithTags extends Manga {
  tags: Array<{
    tag: Tag;
  }>;
}

// Search parameters (accepts strings for API flexibility)
export interface SearchParams {
  query?: string;
  includedTags?: string[];
  excludedTags?: string[];
  status?: string[]; // Will be validated against Status enum
  contentRating?: string[]; // Will be validated against ContentRating enum
  demographic?: string[]; // Will be validated against Demographic enum
  originalLanguage?: string[];
  minChapters?: number;
  maxChapters?: number;
  minYear?: number;
  maxYear?: number;
  limit?: number;
  offset?: number;
  sortBy?: "relevance" | "popularity" | "latest" | "title" | "year";
  sortOrder?: "asc" | "desc";
}

// Search result
export interface SearchResult {
  manga: MangaWithTags;
  score: number;
}

// Search response
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
}

// Tag query for weighted scoring
export interface TagQuery {
  required: string[]; // Must have ALL these tags
  preferred: string[]; // Boost score if present
  excluded: string[]; // Must NOT have these tags
}

// Sync progress
export interface SyncProgress {
  status: SyncStatus;
  totalProcessed: number;
  totalToProcess: number;
  currentOffset: number;
  lastError?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// MangaDex API types for sync
export interface MangaDexMangaForSync {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles: Array<Record<string, string>>;
    description: Record<string, string>;
    status: string;
    year: number | null;
    contentRating: string;
    publicationDemographic: string | null;
    originalLanguage: string;
    lastChapter: string | null;
    lastVolume: string | null;
    tags: Array<{
      id: string;
      attributes: {
        name: Record<string, string>;
        group: string;
      };
    }>;
    updatedAt: string;
    createdAt: string;
  };
  relationships: Array<{
    id: string;
    type: string;
  }>;
}

// Transformed manga for database insert
export interface MangaUpsertData {
  id: string;
  title: string;
  altTitles: string[];
  description: string | null;
  status: Status;
  year: number | null;
  contentRating: ContentRating;
  publicationDemographic: Demographic | null;
  originalLanguage: string;
  lastChapter: string | null;
  lastVolume: string | null;
  totalChapters: number | null;
  coverArtId: string | null;
  followedCount: number;
  sourceUpdatedAt: Date;
  tagIds: string[];
}

// Tag upsert data
export interface TagUpsertData {
  id: string;
  name: string;
  group: TagGroup;
}


