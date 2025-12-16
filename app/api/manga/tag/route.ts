import { NextResponse } from "next/server";

const MANGA_DEX_API = "https://api.mangadex.org";

export async function GET() {
  try {
    // Fetch tags from MangaDex API
    const response = await fetch(`${MANGA_DEX_API}/manga/tag`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "force-cache",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MangaDex API Error:", response.status, response.statusText, errorText);
      return NextResponse.json(
        { error: "Failed to fetch tags" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

