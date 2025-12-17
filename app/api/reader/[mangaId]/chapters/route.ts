import { NextRequest, NextResponse } from "next/server";

const MANGADEX_API = "https://api.mangadex.org";

interface MangaDexChapter {
  id: string;
  type: string;
  attributes: {
    volume: string | null;
    chapter: string | null;
    title: string | null;
    translatedLanguage: string;
    externalUrl: string | null;
    publishAt: string;
    readableAt: string;
    createdAt: string;
    updatedAt: string;
    pages: number;
  };
  relationships: Array<{
    id: string;
    type: string;
  }>;
}

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
  }>;
  total: number;
  totalExternal: number; // Count of external chapters that were filtered out
  limit: number;
  offset: number;
}

/**
 * GET /api/reader/[mangaId]/chapters
 * Fetches chapter list for a manga from MangaDex
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mangaId: string }> }
) {
  try {
    const { mangaId } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 100); // MangaDex max is 100
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const translatedLanguage = searchParams.get("lang") || "en";
    const order = searchParams.get("order") || "asc"; // asc = oldest first, desc = newest first

    // Build MangaDex API request
    const apiParams = new URLSearchParams();
    apiParams.set("manga", mangaId);
    apiParams.set("limit", limit.toString());
    apiParams.set("offset", offset.toString());
    apiParams.append("translatedLanguage[]", translatedLanguage);
    apiParams.set("order[chapter]", order);
    // Include all content ratings to ensure we get all chapters
    // MangaDex chapters can have different content ratings than the manga itself
    apiParams.append("contentRating[]", "safe");
    apiParams.append("contentRating[]", "suggestive");
    apiParams.append("contentRating[]", "erotica");
    apiParams.append("contentRating[]", "pornographic");
    apiParams.append("includes[]", "scanlation_group");

    const response = await fetch(`${MANGADEX_API}/chapter?${apiParams.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MangaHook/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MangaDex chapters API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch chapters" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const chapters: MangaDexChapter[] = data.data;

    // Separate external and readable chapters
    const readableChapters = chapters.filter((ch) => !ch.attributes.externalUrl);
    const externalChaptersInBatch = chapters.length - readableChapters.length;

    // Transform to simpler format
    const transformedChapters: ChapterListResponse = {
      chapters: readableChapters.map((ch) => ({
        id: ch.id,
        chapter: ch.attributes.chapter,
        volume: ch.attributes.volume,
        title: ch.attributes.title,
        language: ch.attributes.translatedLanguage,
        pages: ch.attributes.pages,
        publishedAt: ch.attributes.publishAt,
        externalUrl: ch.attributes.externalUrl,
      })),
      // Keep original total for pagination purposes, but track external chapters in this batch
      total: data.total,
      totalExternal: externalChaptersInBatch,
      limit: data.limit,
      offset: data.offset,
    };

    return NextResponse.json(transformedChapters);
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

