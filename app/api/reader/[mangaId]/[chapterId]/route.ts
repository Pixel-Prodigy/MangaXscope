/**
 * Chapter Pages API Route Handler.
 * 
 * Routes chapter page requests to the appropriate provider based on manga ID format.
 * Returns image URLs for reading chapters.
 * 
 * ARCHITECTURE NOTES:
 * - Single external API call per request
 * - Image URLs may be proxied for CORS handling
 * - Includes referer header if required by source
 */

import { NextRequest, NextResponse } from "next/server";
import { parseCompositeId, getChapterPages } from "@/lib/providers";
import type { DataSource } from "@/types";

// Cache durations (in seconds)
const CACHE_PAGES = 3600; // 1 hour for chapter pages (rarely change)
const CACHE_SWR = 86400;  // 24 hours stale-while-revalidate

/**
 * Create response with optimal caching headers.
 * Chapter pages rarely change so we can cache aggressively.
 */
function createCachedResponse(data: unknown) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_PAGES}, stale-while-revalidate=${CACHE_SWR}`,
      "Vary": "Accept-Encoding",
    },
  });
}

// =============================================================================
// TYPES
// =============================================================================

interface ChapterImagesResponse {
  baseUrl?: string;
  hash?: string;
  images: string[];
  dataSaverImages?: string[];
  chapterId: string;
  mangaId: string;
  source: DataSource;
  referer?: string;
  metadata: {
    chapter: string | null;
    volume: string | null;
    title: string | null;
    translatedLanguage: string;
    pages: number;
  };
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * GET /api/reader/[mangaId]/[chapterId] - Get chapter page images.
 * 
 * ID Formats:
 * - UUID: Treated as MangaDex ID
 * - Composite: source:id format
 * - Other: Treated as Consumet ID
 * 
 * Query Parameters:
 * - dataSaver: Use data-saver images (default: true)
 * - source: Explicit source override (mangadex|consumet)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mangaId: string; chapterId: string }> }
) {
  try {
    const { mangaId, chapterId } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const dataSaver = searchParams.get("dataSaver") !== "false";
    const explicitSource = searchParams.get("source") as DataSource | null;

    // Determine source from manga ID
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

    // Fetch chapter pages from provider
    const result = await getChapterPages(actualMangaId, chapterId, source);

    // Build response with proxied URLs for MangaDex (to handle CORS)
    const images = source === "mangadex"
      ? result.pages.map(
          (_, index) => `/api/reader/${mangaId}/${chapterId}/page/${index}${dataSaver ? "?dataSaver=true" : ""}`
        )
      : result.pages.map((page) => page.imageUrl);

    const response: ChapterImagesResponse = {
      images,
      dataSaverImages: source === "mangadex"
        ? result.pages.map(
            (_, index) => `/api/reader/${mangaId}/${chapterId}/page/${index}?dataSaver=true`
          )
        : undefined,
      chapterId,
      mangaId: actualMangaId,
      source,
      referer: result.referer,
      metadata: {
        chapter: result.metadata.chapter,
        volume: result.metadata.volume,
        title: result.metadata.title,
        translatedLanguage: result.metadata.language,
        pages: result.metadata.totalPages,
      },
    };

    return createCachedResponse(response);
  } catch (error) {
    console.error("[Chapter Pages API] Error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("404") || message.includes("not found")) {
      return NextResponse.json(
        { 
          error: "Chapter not found or unavailable",
          fallbackUrl: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch chapter pages", details: message },
      { status: 500 }
    );
  }
}
