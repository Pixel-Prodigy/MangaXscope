/**
 * Source abstraction types.
 * 
 * @deprecated Use types from @/types instead.
 * This file is kept for backward compatibility.
 */

// Unified chapter format used across all sources
export interface SourceChapter {
  id: string;
  chapter: string | null;
  volume: string | null;
  title: string | null;
  language: string;
  pages: number;
  publishedAt: string;
  externalUrl: string | null;
}

// Page data for reading
export interface SourcePage {
  index: number;
  imageUrl: string;
  width?: number;
  height?: number;
}

// Chapter pages response
export interface SourceChapterPages {
  chapterId: string;
  pages: SourcePage[];
  referer?: string;
}

// Result of fetching chapters from any source
export interface ChapterListResult {
  source: "mangadex" | "consumet";
  chapters: SourceChapter[];
  total: number;
  error?: string;
}

// Result of fetching chapter pages
export interface ChapterPagesResult {
  source: "mangadex" | "consumet";
  chapterId: string;
  pages: SourcePage[];
  referer?: string;
  error?: string;
}

// Source interface
export interface MangaSource {
  name: string;
  getChapters(id: string): Promise<SourceChapter[]>;
  getChapterPages(chapterId: string): Promise<SourceChapterPages>;
}
