/**
 * Search API Route Handler.
 * 
 * ARCHITECTURE:
 * 
 * Two distinct sections with clear separation:
 * 
 * 1. MANGA SECTION (?section=manga)
 *    - Source: MangaDex ONLY
 *    - Content: Japanese manga (originalLanguage=ja)
 *    - Full tag/filter support from MangaDex
 * 
 * 2. WEBCOMICS SECTION (?section=webcomics)
 *    - Source: Consumet with multi-provider fallback
 *    - Content: Manhwa, Manhua, Webtoons
 *    - Providers tried sequentially for maximum coverage
 * 
 * ROUTING RULES:
 * - section=manga → MangaDex (DB cache or direct API)
 * - section=webcomics → Consumet multi-provider
 * - type=manhwa|manhua|webtoon → Consumet
 * - Default (no section) → MangaDex for backward compatibility
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma, Status, ContentRating, Demographic } from "@prisma/client";
import { 
  mangadexProvider,
  searchWithFallback,
} from "@/lib/providers";
import type { 
  ContentType, 
  ContentSection,
  OriginalLanguage, 
  SearchParams,
  PublicationStatus,
  MangaListItem,
  WebcomicType,
} from "@/types";

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Cache durations (in seconds)
const CACHE_MAX_AGE = 60;        // Browser cache: 1 minute
const CACHE_STALE_REVALIDATE = 300; // CDN can serve stale for 5 minutes while revalidating

/**
 * Create response with optimal caching headers.
 * Uses stale-while-revalidate for instant responses.
 */
function createCachedResponse(data: unknown, maxAge = CACHE_MAX_AGE) {
  return NextResponse.json(data, {
    headers: {
      // Browser can cache for maxAge, CDN can serve stale for longer while revalidating
      "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${CACHE_STALE_REVALIDATE}`,
      // Vary by these headers to ensure proper cache keys
      "Vary": "Accept-Encoding",
    },
  });
}

// =============================================================================
// DATABASE SEARCH (CACHE LAYER - MANGA SECTION ONLY)
// =============================================================================

interface DbSearchParams {
  query?: string;
  includedTags?: string[];
  excludedTags?: string[];
  status?: string[];
  contentRating?: string[];
  demographic?: string[];
  originalLanguage?: string[];
  minChapters?: number;
  maxChapters?: number;
  minYear?: number;
  maxYear?: number;
  limit: number;
  offset: number;
  sortBy?: "relevance" | "popularity" | "latest" | "title" | "year";
  sortOrder?: "asc" | "desc";
}

/**
 * Build Prisma WHERE clause from search params.
 */
function buildWhereClause(params: DbSearchParams): Prisma.MangaWhereInput {
  const where: Prisma.MangaWhereInput = {};
  const AND: Prisma.MangaWhereInput[] = [];

  // Text search
  if (params.query?.trim()) {
    const searchTerms = params.query.trim().toLowerCase();
    AND.push({
      OR: [
        { title: { contains: searchTerms, mode: "insensitive" } },
        { description: { contains: searchTerms, mode: "insensitive" } },
        { altTitles: { hasSome: [searchTerms] } },
      ],
    });
  }

  // Status filter
  if (params.status?.length) {
    const validStatuses = params.status.filter(
      (s): s is Status => Object.values(Status).includes(s as Status)
    );
    if (validStatuses.length > 0) {
      AND.push({ status: { in: validStatuses } });
    }
  }

  // Content rating filter
  if (params.contentRating?.length) {
    const validRatings = params.contentRating.filter(
      (r): r is ContentRating => Object.values(ContentRating).includes(r as ContentRating)
    );
    if (validRatings.length > 0) {
      AND.push({ contentRating: { in: validRatings } });
    }
  } else {
    AND.push({ contentRating: { in: [ContentRating.SAFE, ContentRating.SUGGESTIVE] } });
  }

  // Demographic filter
  if (params.demographic?.length) {
    const validDemos = params.demographic.filter(
      (d): d is Demographic => Object.values(Demographic).includes(d as Demographic)
    );
    if (validDemos.length > 0) {
      AND.push({ publicationDemographic: { in: validDemos } });
    }
  }

  // Language filter
  if (params.originalLanguage?.length) {
    AND.push({ originalLanguage: { in: params.originalLanguage } });
  }

  // Chapter count filters
  if (params.minChapters !== undefined) {
    AND.push({ totalChapters: { gte: params.minChapters } });
  }
  if (params.maxChapters !== undefined) {
    AND.push({ totalChapters: { lte: params.maxChapters } });
  }

  // Year filters
  if (params.minYear !== undefined) {
    AND.push({ year: { gte: params.minYear } });
  }
  if (params.maxYear !== undefined) {
    AND.push({ year: { lte: params.maxYear } });
  }

  // Tag filters
  if (params.includedTags?.length) {
    for (const tagId of params.includedTags) {
      AND.push({ tags: { some: { tagId } } });
    }
  }
  if (params.excludedTags?.length) {
    AND.push({
      NOT: { tags: { some: { tagId: { in: params.excludedTags } } } },
    });
  }

  if (AND.length > 0) {
    where.AND = AND;
  }

  return where;
}

/**
 * Build ORDER BY clause from search params.
 */
function buildOrderBy(params: DbSearchParams): Prisma.MangaOrderByWithRelationInput[] {
  const sortOrder = params.sortOrder || "desc";

  switch (params.sortBy) {
    case "popularity":
      return [{ followedCount: sortOrder }];
    case "latest":
      return [{ mangaDexUpdatedAt: sortOrder }];
    case "title":
      return [{ title: sortOrder === "desc" ? "desc" : "asc" }];
    case "year":
      return [{ year: sortOrder }];
    case "relevance":
    default:
      return params.query
        ? [{ followedCount: "desc" }, { mangaDexUpdatedAt: "desc" }]
        : [{ mangaDexUpdatedAt: "desc" }];
  }
}

/**
 * Search the database cache for manga.
 */
async function searchDatabase(params: DbSearchParams) {
  const where = buildWhereClause(params);
  const orderBy = buildOrderBy(params);

  const [total, results] = await Promise.all([
    prisma.manga.count({ where }),
    prisma.manga.findMany({
      where,
      orderBy,
      skip: params.offset,
      take: params.limit,
      include: { tags: { include: { tag: true } } },
    }),
  ]);

  const mangaList: MangaListItem[] = results.map((manga) => ({
    id: manga.id,
    source: "mangadex" as const,
    title: manga.title,
    altTitles: manga.altTitles,
    description: manga.description || "",
    image: manga.coverArtId
      ? `/api/cover-image/${manga.id}/${manga.coverArtId}`
      : "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover",
    status: manga.status.toLowerCase() as PublicationStatus,
    contentType: "manga" as ContentType,
    language: manga.originalLanguage as OriginalLanguage,
    contentRating: manga.contentRating.toLowerCase() as "safe" | "suggestive" | "erotica" | "pornographic",
    genres: manga.tags.map((mt) => ({
      id: mt.tag.id,
      name: mt.tag.name,
      group: mt.tag.group.toLowerCase() as "genre" | "theme" | "format" | "content",
    })),
    year: manga.year,
    totalChapters: manga.totalChapters,
    lastChapter: manga.lastChapter,
    updatedAt: manga.mangaDexUpdatedAt.toISOString(),
  }));

  return {
    mangaList,
    metaData: {
      total,
      limit: params.limit,
      offset: params.offset,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

/**
 * Check if database has data available.
 */
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const count = await prisma.manga.count();
    return count > 0;
  } catch {
    return false;
  }
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * Parse search parameters from request.
 */
function parseSearchParams(searchParams: URLSearchParams): SearchParams & DbSearchParams {
  const getArray = (key: string): string[] | undefined => {
    const values = searchParams.getAll(key).flatMap((v) => v.split(","));
    const altValues = searchParams.getAll(`${key}[]`);
    const combined = [...values, ...altValues].filter(Boolean);
    return combined.length > 0 ? combined : undefined;
  };

  const getNumber = (key: string): number | undefined => {
    const value = searchParams.get(key);
    if (!value) return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  };

  const limit = Math.min(getNumber("limit") || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = getNumber("offset") || 0;

  // Get section (new architecture)
  const section = searchParams.get("section") as ContentSection | null;
  
  // Get content type filter (legacy + webcomic type)
  const typeParam = searchParams.get("type") as ContentType | null;
  const webcomicType = searchParams.get("webcomicType") as WebcomicType | null;

  // Determine language from type or explicit param
  const languageFromType: OriginalLanguage | undefined = 
    typeParam === "manhwa" || typeParam === "webtoon" ? "ko" 
    : typeParam === "manhua" ? "zh" 
    : typeParam === "manga" ? "ja" 
    : undefined;
  const languageParam = getArray("originalLanguage") || getArray("language");
  
  // Validate and cast language params
  const validLanguages = new Set<OriginalLanguage>(["ja", "ko", "zh", "en"]);
  const parsedLanguageParam: OriginalLanguage[] | undefined = languageParam?.filter(
    (l): l is OriginalLanguage => validLanguages.has(l as OriginalLanguage)
  );
  
  const language: OriginalLanguage[] | undefined = languageFromType 
    ? [languageFromType] 
    : (parsedLanguageParam?.length ? parsedLanguageParam : undefined);

  return {
    query: searchParams.get("q") || searchParams.get("query") || undefined,
    section: section || undefined,
    type: typeParam || undefined,
    webcomicType: webcomicType || (typeParam && typeParam !== "manga" ? typeParam as WebcomicType : undefined),
    includedTags: getArray("includedTags"),
    excludedTags: getArray("excludedTags"),
    status: getArray("status") as PublicationStatus[] | undefined,
    contentRating: getArray("contentRating") as ("safe" | "suggestive" | "erotica" | "pornographic")[] | undefined,
    demographic: getArray("demographic")?.filter((d): d is "shounen" | "shoujo" | "seinen" | "josei" => d !== null && d !== "null"),
    language: language,
    originalLanguage: language,
    minChapters: getNumber("minChapters"),
    maxChapters: getNumber("maxChapters"),
    minYear: getNumber("minYear"),
    maxYear: getNumber("maxYear"),
    limit,
    offset,
    sortBy: searchParams.get("sortBy") as DbSearchParams["sortBy"] || "relevance",
    sortOrder: searchParams.get("sortOrder") as DbSearchParams["sortOrder"] || "desc",
  };
}

/**
 * GET /api/search - Search for manga/webcomics with section-based routing.
 * 
 * Query Parameters:
 * - section: "manga" or "webcomics" (determines provider)
 * - q: Search query text
 * - type: Content type filter (manga|manhwa|manhua|webtoon)
 * - webcomicType: Specific webcomic type for priority routing
 * - includedTags[]: Tags that must be present
 * - excludedTags[]: Tags that must not be present
 * - status[]: Publication status filter
 * - contentRating[]: Content rating filter
 * - minChapters/maxChapters: Chapter count range
 * - limit: Results per page (default: 20, max: 100)
 * - offset: Pagination offset
 * - sortBy: Sort field (relevance|popularity|latest|title|year)
 * - sortOrder: Sort direction (asc|desc)
 */
export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.nextUrl.searchParams);

    // =========================================================================
    // SECTION-BASED ROUTING (PRIMARY)
    // =========================================================================

    // WEBCOMICS SECTION: Use Consumet with multi-provider aggregation for MAXIMUM COVERAGE
    if (params.section === "webcomics") {
      console.log("[Search API] Routing to WEBCOMICS section (Consumet multi-provider aggregation)");
      
      // ===== STRATEGY FOR MAXIMUM COVERAGE =====
      // Use Consumet aggregation for ALL webcomics requests.
      // The aggregation function:
      // 1. Iterates through ALL providers (no early return)
      // 2. Deep paginates each provider (up to 25 pages)
      // 3. Deduplicates results by normalized title
      // 4. Returns aggregated, unique results
      
      const consumetResult = await searchWithFallback(params);
      
      // If Consumet returned results, use them
      if (consumetResult.mangaList.length > 0) {
        console.log(`[Search API] Consumet aggregation returned ${consumetResult.mangaList.length} results (total: ${consumetResult.metaData.total})`);
        return createCachedResponse(consumetResult);
      }
      
      // Only fallback to MangaDex if ALL Consumet providers completely failed
      console.log("[Search API] Consumet returned 0 results, falling back to MangaDex cache");
      
      // Determine target languages based on webcomicType
      let languages: string[] = ["ko", "zh"]; // Default: both Korean and Chinese
      if (params.webcomicType === "manhwa" || params.webcomicType === "webtoon") {
        languages = ["ko"];
      } else if (params.webcomicType === "manhua") {
        languages = ["zh"];
      }
      
      const dbAvailable = await isDatabaseAvailable();
      
      if (dbAvailable) {
        const dbParams: DbSearchParams = {
          ...params,
          originalLanguage: languages,
          sortBy: params.sortBy || "latest",
        };
        const dbResult = await searchDatabase(dbParams);
        
        // Transform to indicate content type
        dbResult.mangaList = dbResult.mangaList.map(manga => ({
          ...manga,
          contentType: manga.language === "ko" ? "manhwa" as const : "manhua" as const,
        }));
        
        return createCachedResponse(dbResult);
      }
      
      // If no DB, try MangaDex API directly
      const mangadexResult = await mangadexProvider.search({
        ...params,
        language: languages as OriginalLanguage[],
      });
      
      return createCachedResponse(mangadexResult);
    }

    // MANGA SECTION: Use MangaDex (DB cache or direct API)
    if (params.section === "manga") {
      console.log("[Search API] Routing to MANGA section (MangaDex)");
      const dbAvailable = await isDatabaseAvailable();
      
      if (dbAvailable) {
        const dbParams: DbSearchParams = {
          ...params,
          originalLanguage: ["ja"], // Manga section = Japanese only
        };
        return createCachedResponse(await searchDatabase(dbParams));
      }
      
      // Fallback to direct MangaDex API
      return createCachedResponse(await mangadexProvider.search(params));
    }

    // =========================================================================
    // LEGACY ROUTING (BACKWARD COMPATIBILITY)
    // =========================================================================

    const contentType = params.type;

    // Route to Consumet for non-Japanese content types
    if (contentType && contentType !== "manga") {
      console.log(`[Search API] Legacy routing: type=${contentType} → Consumet`);
      const result = await searchWithFallback({
        ...params,
        webcomicType: contentType as WebcomicType,
      });
      return createCachedResponse(result);
    }

    // Route by language (Korean/Chinese → Consumet)
    const hasKoreanOrChinese = params.language?.some(l => l === "ko" || l === "zh");
    if (hasKoreanOrChinese) {
      console.log("[Search API] Legacy routing: language=ko|zh → Consumet");
      const result = await searchWithFallback(params);
      return createCachedResponse(result);
    }

    // =========================================================================
    // DEFAULT: MANGA SECTION (Japanese content)
    // =========================================================================

    console.log("[Search API] Default routing → MangaDex (Japanese manga)");
    const dbAvailable = await isDatabaseAvailable();

    if (dbAvailable) {
      const dbParams: DbSearchParams = {
        ...params,
        originalLanguage: ["ja"],
      };
      return createCachedResponse(await searchDatabase(dbParams));
    }

    // Fallback to direct MangaDex API
    return createCachedResponse(await mangadexProvider.search(params));

  } catch (error) {
    console.error("[Search API] Error:", error);
    return NextResponse.json(
      { 
        error: "Search failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/search - Advanced search with body parameters.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const params: SearchParams & DbSearchParams = {
      query: body.query,
      section: body.section,
      type: body.type,
      webcomicType: body.webcomicType,
      includedTags: body.includedTags,
      excludedTags: body.excludedTags,
      status: body.status,
      contentRating: body.contentRating,
      demographic: body.demographic,
      language: body.language || body.originalLanguage,
      originalLanguage: body.originalLanguage || body.language,
      minChapters: body.minChapters,
      maxChapters: body.maxChapters,
      minYear: body.minYear,
      maxYear: body.maxYear,
      limit: Math.min(body.limit || DEFAULT_LIMIT, MAX_LIMIT),
      offset: body.offset || 0,
      sortBy: body.sortBy || "relevance",
      sortOrder: body.sortOrder || "desc",
    };

    // Section-based routing
    if (params.section === "webcomics") {
      const result = await searchWithFallback(params);
      return createCachedResponse(result);
    }

    if (params.section === "manga") {
      const dbAvailable = await isDatabaseAvailable();
      if (dbAvailable) {
        return createCachedResponse(await searchDatabase({ ...params, originalLanguage: ["ja"] }));
      }
      return createCachedResponse(await mangadexProvider.search(params));
    }

    // Legacy content type routing
    const contentType = params.type;
    if (contentType && contentType !== "manga") {
      const result = await searchWithFallback({
        ...params,
        webcomicType: contentType as WebcomicType,
      });
      return createCachedResponse(result);
    }

    // Default to MangaDex
    const dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      return createCachedResponse(await searchDatabase({ ...params, originalLanguage: ["ja"] }));
    }
    return createCachedResponse(await mangadexProvider.search(params));

  } catch (error) {
    console.error("[Search API] POST Error:", error);
    return NextResponse.json(
      { 
        error: "Search failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
