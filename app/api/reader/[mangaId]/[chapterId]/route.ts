import { NextRequest, NextResponse } from "next/server";

const MANGADEX_API = "https://api.mangadex.org";

interface AtHomeResponse {
  result: string;
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}

interface ChapterMetadata {
  chapter: string | null;
  volume: string | null;
  title: string | null;
  translatedLanguage: string;
  pages: number;
}

interface ChapterImagesResponse {
  baseUrl: string;
  hash: string;
  images: string[];
  dataSaverImages: string[];
  chapterId: string;
  mangaId: string;
  metadata: ChapterMetadata;
}

/**
 * Fetch chapter metadata from MangaDex
 */
async function fetchChapterMetadata(chapterId: string): Promise<ChapterMetadata | null> {
  try {
    const response = await fetch(`${MANGADEX_API}/chapter/${chapterId}`, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MangaHook/1.0",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const attrs = data.data?.attributes;
    
    if (!attrs) return null;

    return {
      chapter: attrs.chapter,
      volume: attrs.volume,
      title: attrs.title,
      translatedLanguage: attrs.translatedLanguage,
      pages: attrs.pages,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/reader/[mangaId]/[chapterId]
 * Fetches chapter image URLs from MangaDex at-home servers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mangaId: string; chapterId: string }> }
) {
  try {
    const { mangaId, chapterId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const dataSaver = searchParams.get("dataSaver") === "true";

    // Fetch at-home server URL and chapter metadata in parallel
    const [atHomeResponse, metadata] = await Promise.all([
      fetch(`${MANGADEX_API}/at-home/server/${chapterId}`, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MangaHook/1.0",
        },
      }),
      fetchChapterMetadata(chapterId),
    ]);

    if (!atHomeResponse.ok) {
      const errorText = await atHomeResponse.text();
      console.error("MangaDex at-home API error:", atHomeResponse.status, errorText);
      
      // If chapter not found or unavailable, return a helpful message
      if (atHomeResponse.status === 404) {
        return NextResponse.json(
          { 
            error: "Chapter not found or unavailable",
            fallbackUrl: `https://mangadex.org/chapter/${chapterId}`,
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to fetch chapter images" },
        { status: atHomeResponse.status }
      );
    }

    const atHomeData: AtHomeResponse = await atHomeResponse.json();

    // Build proxied image URLs (through our API to avoid CORS issues on deployment)
    const imageList = dataSaver ? atHomeData.chapter.dataSaver : atHomeData.chapter.data;
    const dataSaverParam = dataSaver ? "?dataSaver=true" : "";

    const response: ChapterImagesResponse = {
      baseUrl: atHomeData.baseUrl,
      hash: atHomeData.chapter.hash,
      // Use proxied URLs through our API
      images: imageList.map(
        (_, index) => `/api/reader/${mangaId}/${chapterId}/page/${index}${dataSaverParam}`
      ),
      dataSaverImages: atHomeData.chapter.dataSaver.map(
        (_, index) => `/api/reader/${mangaId}/${chapterId}/page/${index}?dataSaver=true`
      ),
      chapterId,
      mangaId,
      metadata: metadata || {
        chapter: null,
        volume: null,
        title: null,
        translatedLanguage: "en",
        pages: imageList.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching chapter images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

