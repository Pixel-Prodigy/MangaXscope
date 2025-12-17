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

// Cache for at-home server data (in-memory, per-instance)
const atHomeCache = new Map<string, { data: AtHomeResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch with retry logic to handle transient network errors
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = (error as Error).message || "";
      const isRetryable = 
        errorMessage.includes("fetch failed") ||
        errorMessage.includes("socket") ||
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("UND_ERR");
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
  
  throw lastError;
}

/**
 * Get at-home server data with caching
 */
async function getAtHomeData(chapterId: string): Promise<AtHomeResponse> {
  const cached = atHomeCache.get(chapterId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const response = await fetchWithRetry(`${MANGADEX_API}/at-home/server/${chapterId}`, {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "MangaHook/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`at-home server error: ${response.status}`);
  }

  const data: AtHomeResponse = await response.json();
  atHomeCache.set(chapterId, { data, timestamp: Date.now() });
  return data;
}

/**
 * GET /api/reader/[mangaId]/[chapterId]/page/[pageNum]
 * Proxies chapter page images from MangaDex at-home servers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mangaId: string; chapterId: string; pageNum: string }> }
) {
  try {
    const { chapterId, pageNum } = await params;
    const searchParams = request.nextUrl.searchParams;
    const dataSaver = searchParams.get("dataSaver") === "true";
    const pageIndex = parseInt(pageNum, 10);

    if (isNaN(pageIndex) || pageIndex < 0) {
      return NextResponse.json(
        { error: "Invalid page number" },
        { status: 400 }
      );
    }

    // Get at-home server data
    const atHomeData = await getAtHomeData(chapterId);
    
    const imageList = dataSaver ? atHomeData.chapter.dataSaver : atHomeData.chapter.data;
    
    if (pageIndex >= imageList.length) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    const filename = imageList[pageIndex];
    const imageMode = dataSaver ? "data-saver" : "data";
    const imageUrl = `${atHomeData.baseUrl}/${imageMode}/${atHomeData.chapter.hash}/${filename}`;

    // Fetch the actual image
    const imageResponse = await fetchWithRetry(imageUrl, {
      headers: {
        "User-Agent": "MangaHook/1.0",
      },
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch page image" },
        { status: imageResponse.status }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error proxying chapter page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

