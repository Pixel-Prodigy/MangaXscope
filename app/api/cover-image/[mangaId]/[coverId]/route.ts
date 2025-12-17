import { NextRequest, NextResponse } from "next/server";

const MANGA_DEX_API = "https://api.mangadex.org";
const MANGA_DEX_COVERS_BASE = "https://uploads.mangadex.org/covers";

/**
 * Fetch with retry logic to handle transient socket errors
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
      // Only retry on socket/network errors
      const errorMessage = (error as Error).message || "";
      const isRetryable = 
        errorMessage.includes("fetch failed") ||
        errorMessage.includes("socket") ||
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("UND_ERR");
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
  
  throw lastError;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mangaId: string; coverId: string }> }
) {
  try {
    const { mangaId, coverId } = await params;

    // First, get the cover metadata to get the filename
    const coverResponse = await fetchWithRetry(`${MANGA_DEX_API}/cover/${coverId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "force-cache",
    });

    if (!coverResponse.ok) {
      return NextResponse.json(
        { error: "Cover art not found" },
        { status: coverResponse.status }
      );
    }

    const coverData = await coverResponse.json();
    const fileName = coverData.data?.attributes?.fileName;

    if (!fileName) {
      return NextResponse.json(
        { error: "Cover filename not found" },
        { status: 404 }
      );
    }

    // Construct the image URL
    const imageUrl = `${MANGA_DEX_COVERS_BASE}/${mangaId}/${fileName}.512.jpg`;

    // Fetch the actual image from MangaDex with retry
    const imageResponse = await fetchWithRetry(imageUrl, {
      cache: "force-cache",
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: imageResponse.status }
      );
    }

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error proxying cover image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
