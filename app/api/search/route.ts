import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma, Status, ContentRating, Demographic } from "@prisma/client";
import type { SearchParams } from "@/lib/db/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Build the WHERE clause for search filters
 */
function buildWhereClause(params: SearchParams): Prisma.MangaWhereInput {
  const where: Prisma.MangaWhereInput = {};
  const AND: Prisma.MangaWhereInput[] = [];

  // Text search on title, description, and alt titles
  if (params.query && params.query.trim()) {
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
  if (params.status && params.status.length > 0) {
    const validStatuses = params.status.filter(
      (s): s is Status => Object.values(Status).includes(s as Status)
    );
    if (validStatuses.length > 0) {
      AND.push({ status: { in: validStatuses } });
    }
  }

  // Content rating filter
  if (params.contentRating && params.contentRating.length > 0) {
    const validRatings = params.contentRating.filter(
      (r): r is ContentRating => Object.values(ContentRating).includes(r as ContentRating)
    );
    if (validRatings.length > 0) {
      AND.push({ contentRating: { in: validRatings } });
    }
  } else {
    // Default to safe and suggestive
    AND.push({ contentRating: { in: [ContentRating.SAFE, ContentRating.SUGGESTIVE] } });
  }

  // Demographic filter
  if (params.demographic && params.demographic.length > 0) {
    const validDemos = params.demographic.filter(
      (d): d is Demographic => Object.values(Demographic).includes(d as Demographic)
    );
    if (validDemos.length > 0) {
      AND.push({ publicationDemographic: { in: validDemos } });
    }
  }

  // Original language filter
  if (params.originalLanguage && params.originalLanguage.length > 0) {
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

  // Included tags (must have ALL)
  if (params.includedTags && params.includedTags.length > 0) {
    for (const tagId of params.includedTags) {
      AND.push({
        tags: {
          some: { tagId },
        },
      });
    }
  }

  // Excluded tags (must NOT have ANY)
  if (params.excludedTags && params.excludedTags.length > 0) {
    AND.push({
      NOT: {
        tags: {
          some: {
            tagId: { in: params.excludedTags },
          },
        },
      },
    });
  }

  if (AND.length > 0) {
    where.AND = AND;
  }

  return where;
}

/**
 * Build the ORDER BY clause
 */
function buildOrderBy(
  params: SearchParams
): Prisma.MangaOrderByWithRelationInput[] {
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
      // For relevance, we'll sort by a combination if there's a query
      // Otherwise, sort by latest
      if (params.query) {
        return [
          { followedCount: "desc" },
          { mangaDexUpdatedAt: "desc" },
        ];
      }
      return [{ mangaDexUpdatedAt: "desc" }];
  }
}

/**
 * Parse search params from request
 */
function parseSearchParams(searchParams: URLSearchParams): SearchParams {
  const getArray = (key: string): string[] | undefined => {
    const values = searchParams.getAll(key);
    return values.length > 0 ? values : undefined;
  };

  const getNumber = (key: string): number | undefined => {
    const value = searchParams.get(key);
    if (value === null) return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  };

  return {
    query: searchParams.get("q") || undefined,
    includedTags: getArray("includedTags[]") || getArray("includedTags"),
    excludedTags: getArray("excludedTags[]") || getArray("excludedTags"),
    status: getArray("status[]") || getArray("status"),
    contentRating: getArray("contentRating[]") || getArray("contentRating"),
    demographic: getArray("demographic[]") || getArray("demographic"),
    originalLanguage: getArray("originalLanguage[]") || getArray("originalLanguage"),
    minChapters: getNumber("minChapters"),
    maxChapters: getNumber("maxChapters"),
    minYear: getNumber("minYear"),
    maxYear: getNumber("maxYear"),
    limit: Math.min(getNumber("limit") || DEFAULT_LIMIT, MAX_LIMIT),
    offset: getNumber("offset") || 0,
    sortBy: (searchParams.get("sortBy") as SearchParams["sortBy"]) || "relevance",
    sortOrder: (searchParams.get("sortOrder") as SearchParams["sortOrder"]) || "desc",
  };
}

/**
 * GET /api/search - Database-backed search endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.nextUrl.searchParams);
    const { limit, offset } = params;

    const where = buildWhereClause(params);
    const orderBy = buildOrderBy(params);

    // Execute count and search in parallel
    const [total, results] = await Promise.all([
      prisma.manga.count({ where }),
      prisma.manga.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
    ]);

    // Transform results to match expected format
    const mangaList = results.map((manga) => {
      const tags = manga.tags.map((mt) => ({
        id: mt.tag.id,
        name: mt.tag.name,
        group: mt.tag.group.toLowerCase(),
      }));

      return {
        id: manga.id,
        image: manga.coverArtId 
          ? `/api/cover-image/${manga.id}/${manga.coverArtId}`
          : "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover",
        title: manga.title,
        altTitles: manga.altTitles,
        description: manga.description || "",
        status: manga.status.toLowerCase(),
        year: manga.year,
        contentRating: manga.contentRating.toLowerCase(),
        tags,
        publicationDemographic: manga.publicationDemographic?.toLowerCase() || null,
        originalLanguage: manga.originalLanguage,
        lastChapter: manga.lastChapter,
        lastVolume: manga.lastVolume,
        totalChapters: manga.totalChapters,
        updatedAt: manga.mangaDexUpdatedAt.toISOString(),
        createdAt: manga.createdAt.toISOString(),
      };
    });

    // Return in format compatible with existing frontend
    return NextResponse.json({
      mangaList,
      metaData: {
        total,
        limit: limit!,
        offset: offset!,
        totalPages: Math.ceil(total / limit!),
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/search - Advanced search with body parameters
 * Allows more complex queries like tag-weighted scoring
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params: SearchParams = {
      query: body.query,
      includedTags: body.includedTags,
      excludedTags: body.excludedTags,
      status: body.status,
      contentRating: body.contentRating,
      demographic: body.demographic,
      originalLanguage: body.originalLanguage,
      minChapters: body.minChapters,
      maxChapters: body.maxChapters,
      minYear: body.minYear,
      maxYear: body.maxYear,
      limit: Math.min(body.limit || DEFAULT_LIMIT, MAX_LIMIT),
      offset: body.offset || 0,
      sortBy: body.sortBy || "relevance",
      sortOrder: body.sortOrder || "desc",
    };

    const where = buildWhereClause(params);
    const orderBy = buildOrderBy(params);

    const [total, results] = await Promise.all([
      prisma.manga.count({ where }),
      prisma.manga.findMany({
        where,
        orderBy,
        skip: params.offset,
        take: params.limit,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
    ]);

    // Calculate scores for tag-weighted results if preferred tags provided
    const preferredTags = body.preferredTags as string[] | undefined;
    
    const mangaList = results.map((manga) => {
      const tags = manga.tags.map((mt) => ({
        id: mt.tag.id,
        name: mt.tag.name,
        group: mt.tag.group.toLowerCase(),
      }));

      // Calculate score
      let score = 1.0;
      
      if (preferredTags && preferredTags.length > 0) {
        const mangaTagIds = new Set(tags.map((t) => t.id));
        const matchedPreferred = preferredTags.filter((t) => mangaTagIds.has(t));
        score += matchedPreferred.length * 0.2; // +0.2 per preferred tag match
      }

      // Popularity boost
      if (manga.followedCount > 0) {
        score += Math.min(manga.followedCount / 100000, 0.3); // Max 0.3 boost
      }

      return {
        manga: {
          id: manga.id,
          image: manga.coverArtId 
            ? `/api/cover-image/${manga.id}/${manga.coverArtId}`
            : "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover",
          title: manga.title,
          altTitles: manga.altTitles,
          description: manga.description || "",
          status: manga.status.toLowerCase(),
          year: manga.year,
          contentRating: manga.contentRating.toLowerCase(),
          tags,
          publicationDemographic: manga.publicationDemographic?.toLowerCase() || null,
          originalLanguage: manga.originalLanguage,
          lastChapter: manga.lastChapter,
          lastVolume: manga.lastVolume,
          totalChapters: manga.totalChapters,
          updatedAt: manga.mangaDexUpdatedAt.toISOString(),
          createdAt: manga.createdAt.toISOString(),
        },
        score,
      };
    });

    // Sort by score if preferred tags were provided
    if (preferredTags && preferredTags.length > 0) {
      mangaList.sort((a, b) => b.score - a.score);
    }

    return NextResponse.json({
      results: mangaList,
      mangaList: mangaList.map((m) => m.manga),
      metaData: {
        total,
        limit: params.limit!,
        offset: params.offset!,
        totalPages: Math.ceil(total / params.limit!),
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


