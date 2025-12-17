/**
 * Manga Details API Route Handler.
 * 
 * Routes detail requests to the appropriate provider based on ID format:
 * - UUID format → MangaDex
 * - Composite ID (source:id) → Parse and route to correct provider
 * - Other formats → Consumet
 * 
 * ARCHITECTURE NOTES:
 * - Single external API call per request
 * - Results are normalized to shared types
 * - Proper error handling with meaningful messages
 */

import { NextRequest, NextResponse } from "next/server";
import { parseCompositeId, getMangaDetails, mangadexProvider } from "@/lib/providers";
import type { DataSource } from "@/types";

// Cache durations (in seconds)
const CACHE_DETAILS = 300; // 5 minutes for manga details
const CACHE_SWR = 3600;    // 1 hour stale-while-revalidate

/**
 * Create response with optimal caching headers.
 */
function createCachedResponse(data: unknown) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_DETAILS}, stale-while-revalidate=${CACHE_SWR}`,
      "Vary": "Accept-Encoding",
    },
  });
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * GET /api/manga/[id] - Get detailed manga information.
 * 
 * ID Formats:
 * - UUID: Treated as MangaDex ID (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * - Composite: source:id format (e.g., "consumet:manga-123")
 * - Other: Treated as Consumet ID
 * 
 * Query Parameters:
 * - source: Optional explicit source (mangadex|consumet)
 * - includes[]: MangaDex includes (cover_art, author, artist)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    // Allow explicit source override
    const explicitSource = searchParams.get("source") as DataSource | null;
    
    let source: DataSource;
    let mangaId: string;
    
    if (explicitSource) {
      // Use explicit source
      source = explicitSource;
      mangaId = id;
    } else {
      // Parse composite ID or infer source
      const parsed = parseCompositeId(id);
      source = parsed.source;
      mangaId = parsed.id;
    }
    
    // Fetch details from appropriate provider
    const details = await getMangaDetails(mangaId, source);
    
    // Return in a format compatible with existing frontend
    // Wrap in MangaDex-like response structure for backward compatibility
    return createCachedResponse({
      result: "ok",
      data: {
        id: details.id,
        type: "manga",
        attributes: {
          title: { en: details.title },
          altTitles: details.altTitles.map((t) => ({ en: t })),
          description: { en: details.description },
          status: details.status,
          year: details.year,
          contentRating: details.contentRating,
          publicationDemographic: details.demographic,
          originalLanguage: details.language,
          lastChapter: details.lastChapter,
          lastVolume: details.lastVolume,
          tags: details.genres.map((g) => ({
            id: g.id,
            type: "tag",
            attributes: {
              name: { en: g.name },
              group: g.group,
            },
          })),
          createdAt: details.createdAt,
          updatedAt: details.updatedAt,
        },
        relationships: [
          // Cover art relationship
          {
            id: details.coverImage.includes("/api/cover-image/") 
              ? details.coverImage.split("/").pop() 
              : null,
            type: "cover_art",
          },
          // Author relationships
          ...details.authors.map((author) => ({
            id: `author-${author.toLowerCase().replace(/\s+/g, "-")}`,
            type: "author",
            attributes: { name: author },
          })),
          // Artist relationships
          ...details.artists.map((artist) => ({
            id: `artist-${artist.toLowerCase().replace(/\s+/g, "-")}`,
            type: "artist",
            attributes: { name: artist },
          })),
        ].filter((rel) => rel.id !== null),
      },
      // Include normalized data for new frontend components
      normalized: details,
    });
  } catch (error) {
    console.error("[Manga API] Error fetching details:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    
    if (message.includes("404") || message.includes("not found")) {
      return NextResponse.json(
        { error: "Manga not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch manga details", details: message },
      { status: 500 }
    );
  }
}
