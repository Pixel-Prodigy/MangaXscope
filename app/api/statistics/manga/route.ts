import { NextRequest, NextResponse } from "next/server";

const MANGA_DEX_API = "https://api.mangadex.org";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Build the MangaDex API URL for statistics
    const mangaDexUrl = new URL(`${MANGA_DEX_API}/statistics/manga`);
    
    // Copy all query parameters to the MangaDex API URL
    searchParams.forEach((value, key) => {
      mangaDexUrl.searchParams.append(key, value);
    });
    
    // Fetch from MangaDex API
    const response = await fetch(mangaDexUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MangaDex Statistics API Error:", response.status, response.statusText, errorText);
      return NextResponse.json(
        { error: `MangaDex Statistics API Error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching manga statistics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

