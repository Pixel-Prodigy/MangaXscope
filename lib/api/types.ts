// MangaDex API Types
export interface MangaDexTitle {
  en?: string;
  ja?: string;
  "ja-ro"?: string;
  ko?: string;
  zh?: string;
  [key: string]: string | undefined;
}

export interface MangaDexAltTitle {
  en?: string;
  ja?: string;
  "ja-ro"?: string;
  ko?: string;
  zh?: string;
  [key: string]: string | undefined;
}

export interface MangaDexDescription {
  en?: string;
  ja?: string;
  [key: string]: string | undefined;
}

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

export interface MangaDexRelationship {
  id: string;
  type: string;
  related?: string;
}

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

export interface MangaDexManga {
  id: string;
  type: string;
  attributes: MangaDexMangaAttributes;
  relationships: MangaDexRelationship[];
}

export interface MangaDexResponse {
  result: string;
  response: string;
  data: MangaDexManga[];
  limit: number;
  offset: number;
  total: number;
}

// Transformed types for UI
export interface MangaListItem {
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
  updatedAt: string;
  createdAt: string;
}

export interface MangaListMetadata {
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
}

export interface MangaListResponse {
  mangaList: MangaListItem[];
  metaData: MangaListMetadata;
}

export interface Chapter {
  id: string;
  path: string;
  name: string;
  view: string;
  createdAt: string;
}

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

export interface ChapterImage {
  title: string;
  image: string;
}

export interface ChapterData {
  title: string;
  currentChapter: string;
  chapterListIds: Array<{
    id: string;
    name: string;
  }>;
  images: ChapterImage[];
}

export interface MangaListParams {
  title?: string;
  limit?: number;
  offset?: number;
  contentRating?: string[];
  includedTags?: string[];
  excludedTags?: string[];
  status?: string[];
  publicationDemographic?: string[];
  order?: Record<string, string>;
}

export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
}

