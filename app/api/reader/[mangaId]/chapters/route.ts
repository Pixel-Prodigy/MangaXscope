/**
 * Chapter List API Route Handler.
 * 
 * Routes chapter list requests to the appropriate provider based on manga ID format.
 * 
 * ARCHITECTURE NOTES:
 * - Single external API call per request
 * - Results are normalized to shared chapter format
 * - Pagination is handled by the provider
 */

import { NextRequest, NextResponse } from "next/server";
import { parseCompositeId, getChapterList } from "@/lib/providers";
import type { DataSource, NormalizedChapter } from "@/types";

// Cache durations (in seconds)
const CACHE_CHAPTERS = 120; // 2 minutes for chapter lists (may update more frequently)
const CACHE_SWR = 600;      // 10 minutes stale-while-revalidate

/**
 * Create response with optimal caching headers.
 */
function createCachedResponse(data: unknown) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_CHAPTERS}, stale-while-revalidate=${CACHE_SWR}`,
      "Vary": "Accept-Encoding",
    },
  });
}

// =============================================================================
// TYPES
// =============================================================================

interface ChapterListResponse {
  chapters: Array<{
    id: string;
    chapter: string | null;
    volume: string | null;
    title: string | null;
    language: string;
    pages: number;
    publishedAt: string;
    externalUrl: string | null;
    scanlationGroup?: string;
  }>;
  total: number;
  totalExternal: number;
  totalByLanguage: Record<string, number>;
  limit: number;
  offset: number;
  source: DataSource;
  debug?: {
    requestUrl: string;
    queryParams: Record<string, string | string[]>;
  };
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * GET /api/reader/[mangaId]/chapters - Get chapter list for a manga.
 * 
 * ID Formats:
 * - UUID: Treated as MangaDex ID
 * - Composite: source:id format
 * - Other: Treated as Consumet ID
 * 
 * Query Parameters:
 * - limit: Max chapters to return (default: 100)
 * - offset: Pagination offset (default: 0)
 * - lang: Translation language filter (default: en)
 * - order: Chapter sort order (asc|desc, default: asc)
 * - source: Explicit source override (mangadex|consumet)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mangaId: string }> }
) {
  try {
    const { mangaId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Parse parameters
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      500 // Safety limit
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const language = searchParams.get("lang") || "en";
    const explicitSource = searchParams.get("source") as DataSource | null;

    // Determine source
    let source: DataSource;
    let actualMangaId: string;

    if (explicitSource) {
      source = explicitSource;
      actualMangaId = mangaId;
    } else {
      const parsed = parseCompositeId(mangaId);
      source = parsed.source;
      actualMangaId = parsed.id;
    }

    // Fetch chapters from provider
    const result = await getChapterList(actualMangaId, source, {
      limit,
      offset,
      language,
    });

    // Separate readable vs external chapters
    const readableChapters = result.chapters.filter(
      (ch) => !ch.externalUrl
    );
    const externalChaptersCount = result.chapters.length - readableChapters.length;

    // Calculate language breakdown
    const totalByLanguage: Record<string, number> = {};
    for (const chapter of result.chapters) {
      totalByLanguage[chapter.language] = (totalByLanguage[chapter.language] || 0) + 1;
    }

    // Transform to response format (compatible with existing frontend)
    const response: ChapterListResponse = {
      chapters: readableChapters.map((ch: NormalizedChapter) => ({
        id: ch.id,
        chapter: ch.chapter,
        volume: ch.volume,
        title: ch.title,
        language: ch.language,
        pages: ch.pages,
        publishedAt: ch.publishedAt,
        externalUrl: ch.externalUrl,
        scanlationGroup: ch.scanlationGroup || undefined,
      })),
      total: result.total,
      totalExternal: externalChaptersCount,
      totalByLanguage,
      limit,
      offset,
      source,
    };

    return createCachedResponse(response);
  } catch (error) {
    console.error("[Chapters API] Error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("404") || message.includes("not found")) {
      return NextResponse.json(
        { error: "Manga not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch chapters", details: message },
      { status: 500 }
    );
  }
}
