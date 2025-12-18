/**
 * Webcomic Search Module
 * 
 * Provides database search functionality for webcomics (Consumet content)
 * using PostgreSQL trigram similarity for fuzzy text matching.
 */

import { prisma } from "@/lib/db";
import { Prisma, ContentType, Status, ContentRating } from "@prisma/client";
import type { 
  MangaListItem, 
  MangaListResponse,
  PublicationStatus,
  ContentType as ContentTypeApp,
  OriginalLanguage,
  ConsumetProviderName,
} from "@/types";

// =============================================================================
// TYPES
// =============================================================================

export interface WebcomicSearchParams {
  query?: string;
  webcomicType?: "manhwa" | "manhua" | "webtoon";
  status?: PublicationStatus[];
  contentRating?: ("safe" | "suggestive" | "erotica" | "pornographic")[];
  includedTags?: string[];
  excludedTags?: string[];
  minChapters?: number;
  maxChapters?: number;
  minYear?: number;
  maxYear?: number;
  limit: number;
  offset: number;
  sortBy?: "relevance" | "popularity" | "latest" | "title" | "year";
  sortOrder?: "asc" | "desc";
}

// =============================================================================
// CONSTANTS
// =============================================================================

const WEBCOMIC_CONTENT_TYPES = [
  ContentType.MANHWA,
  ContentType.MANHUA,
  ContentType.WEBTOON,
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Map string status to Prisma Status enum.
 */
function mapStatusFilter(statuses: PublicationStatus[]): Status[] {
  const statusMap: Record<PublicationStatus, Status> = {
    ongoing: Status.ONGOING,
    completed: Status.COMPLETED,
    hiatus: Status.HIATUS,
    cancelled: Status.CANCELLED,
    unknown: Status.UNKNOWN,
  };
  return statuses.map((s) => statusMap[s]).filter(Boolean);
}

/**
 * Map string content rating to Prisma ContentRating enum.
 */
function mapContentRatingFilter(
  ratings: ("safe" | "suggestive" | "erotica" | "pornographic")[]
): ContentRating[] {
  const ratingMap: Record<string, ContentRating> = {
    safe: ContentRating.SAFE,
    suggestive: ContentRating.SUGGESTIVE,
    erotica: ContentRating.EROTICA,
    pornographic: ContentRating.PORNOGRAPHIC,
  };
  return ratings.map((r) => ratingMap[r]).filter(Boolean);
}

/**
 * Map webcomic type to Prisma ContentType.
 */
function mapWebcomicType(type: "manhwa" | "manhua" | "webtoon"): ContentType {
  const typeMap: Record<string, ContentType> = {
    manhwa: ContentType.MANHWA,
    manhua: ContentType.MANHUA,
    webtoon: ContentType.WEBTOON,
  };
  return typeMap[type];
}

// =============================================================================
// SEARCH FUNCTIONS
// =============================================================================

/**
 * Build Prisma WHERE clause for webcomic search.
 */
function buildWhereClause(params: WebcomicSearchParams): Prisma.MangaWhereInput {
  const where: Prisma.MangaWhereInput = {
    source: "CONSUMET",
  };
  const AND: Prisma.MangaWhereInput[] = [];

  // Content type filter
  if (params.webcomicType) {
    AND.push({ contentType: mapWebcomicType(params.webcomicType) });
  } else {
    // Default: all webcomic types
    AND.push({ contentType: { in: WEBCOMIC_CONTENT_TYPES } });
  }

  // Text search (basic ILIKE for now, trigram handled separately)
  if (params.query?.trim()) {
    const searchTerms = params.query.trim();
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
    const validStatuses = mapStatusFilter(params.status);
    if (validStatuses.length > 0) {
      AND.push({ status: { in: validStatuses } });
    }
  }

  // Content rating filter
  if (params.contentRating?.length) {
    const validRatings = mapContentRatingFilter(params.contentRating);
    if (validRatings.length > 0) {
      AND.push({ contentRating: { in: validRatings } });
    }
  } else {
    // Default: safe and suggestive
    AND.push({ contentRating: { in: [ContentRating.SAFE, ContentRating.SUGGESTIVE] } });
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
 * Build ORDER BY clause for webcomic search.
 */
function buildOrderBy(params: WebcomicSearchParams): Prisma.MangaOrderByWithRelationInput[] {
  const sortOrder = params.sortOrder || "desc";

  switch (params.sortBy) {
    case "popularity":
      return [{ followedCount: sortOrder }];
    case "latest":
      return [{ sourceUpdatedAt: sortOrder }];
    case "title":
      return [{ title: sortOrder === "desc" ? "desc" : "asc" }];
    case "year":
      return [{ year: sortOrder }];
    case "relevance":
    default:
      // For relevance, we want popularity + recency
      return params.query
        ? [{ followedCount: "desc" }, { sourceUpdatedAt: "desc" }]
        : [{ sourceUpdatedAt: "desc" }];
  }
}

/**
 * Transform database manga to MangaListItem.
 */
function transformToMangaListItem(
  manga: Prisma.MangaGetPayload<{ include: { tags: { include: { tag: true } } } }>
): MangaListItem {
  return {
    id: manga.providerSeriesId || manga.id,
    source: "consumet",
    provider: manga.provider as ConsumetProviderName | undefined,
    title: manga.title,
    altTitles: manga.altTitles,
    description: manga.description || "",
    image: manga.coverImage || "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover",
    status: manga.status.toLowerCase() as PublicationStatus,
    contentType: manga.contentType.toLowerCase() as ContentTypeApp,
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
    updatedAt: manga.sourceUpdatedAt?.toISOString() || manga.updatedAt.toISOString(),
  };
}

/**
 * Search webcomics in the database.
 * Uses PostgreSQL for filtering and ordering.
 */
export async function searchWebcomicsInDb(
  params: WebcomicSearchParams
): Promise<MangaListResponse> {
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

  const mangaList = results.map(transformToMangaListItem);

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
 * Search webcomics using PostgreSQL trigram similarity.
 * This provides better fuzzy matching than simple ILIKE.
 * 
 * Note: Requires pg_trgm extension to be enabled.
 */
export async function searchWebcomicsWithTrigram(
  params: WebcomicSearchParams
): Promise<MangaListResponse> {
  // If no query, fall back to regular search
  if (!params.query?.trim()) {
    return searchWebcomicsInDb(params);
  }

  const searchQuery = params.query.trim();
  const { limit, offset, webcomicType, status, contentRating } = params;

  // Build content type filter
  const contentTypes = webcomicType 
    ? [mapWebcomicType(webcomicType)]
    : WEBCOMIC_CONTENT_TYPES;

  // Build status filter
  const statusFilter = status?.length 
    ? mapStatusFilter(status)
    : undefined;

  // Build content rating filter
  const ratingFilter = contentRating?.length
    ? mapContentRatingFilter(contentRating)
    : [ContentRating.SAFE, ContentRating.SUGGESTIVE];

  try {
    // Use raw query for trigram similarity ordering
    // This orders by similarity score for better relevance
    const results = await prisma.$queryRaw<Array<{
      id: string;
      provider: string | null;
      providerSeriesId: string | null;
      contentType: string;
      title: string;
      altTitles: string[];
      description: string | null;
      status: string;
      year: number | null;
      contentRating: string;
      originalLanguage: string;
      lastChapter: string | null;
      totalChapters: number | null;
      coverImage: string | null;
      sourceUpdatedAt: Date | null;
      updatedAt: Date;
      similarity: number;
    }>>`
      SELECT 
        m.id,
        m.provider,
        m."providerSeriesId",
        m."contentType",
        m.title,
        m."altTitles",
        m.description,
        m.status,
        m.year,
        m."contentRating",
        m."originalLanguage",
        m."lastChapter",
        m."totalChapters",
        m."coverImage",
        m."sourceUpdatedAt",
        m."updatedAt",
        similarity(m.title, ${searchQuery}) as similarity
      FROM "Manga" m
      WHERE m.source = 'CONSUMET'
        AND m."contentType"::text = ANY(${contentTypes.map(String)})
        ${statusFilter ? Prisma.sql`AND m.status::text = ANY(${statusFilter.map(String)})` : Prisma.empty}
        AND m."contentRating"::text = ANY(${ratingFilter.map(String)})
        AND (
          m.title % ${searchQuery}
          OR m.title ILIKE ${'%' + searchQuery + '%'}
          OR ${searchQuery} = ANY(m."altTitles")
        )
      ORDER BY similarity DESC, m."followedCount" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Manga" m
      WHERE m.source = 'CONSUMET'
        AND m."contentType"::text = ANY(${contentTypes.map(String)})
        ${statusFilter ? Prisma.sql`AND m.status::text = ANY(${statusFilter.map(String)})` : Prisma.empty}
        AND m."contentRating"::text = ANY(${ratingFilter.map(String)})
        AND (
          m.title % ${searchQuery}
          OR m.title ILIKE ${'%' + searchQuery + '%'}
          OR ${searchQuery} = ANY(m."altTitles")
        )
    `;

    const total = Number(countResult[0].count);

    // Fetch tags for each result
    const mangaIds = results.map((r) => r.id);
    const tagRelations = await prisma.mangaTag.findMany({
      where: { mangaId: { in: mangaIds } },
      include: { tag: true },
    });

    // Group tags by manga ID
    const tagsByManga = new Map<string, typeof tagRelations>();
    for (const rel of tagRelations) {
      const existing = tagsByManga.get(rel.mangaId) || [];
      existing.push(rel);
      tagsByManga.set(rel.mangaId, existing);
    }

    // Transform results
    const mangaList: MangaListItem[] = results.map((manga) => ({
      id: manga.providerSeriesId || manga.id,
      source: "consumet" as const,
      provider: manga.provider as ConsumetProviderName | undefined,
      title: manga.title,
      altTitles: manga.altTitles,
      description: manga.description || "",
      image: manga.coverImage || "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover",
      status: manga.status.toLowerCase() as PublicationStatus,
      contentType: manga.contentType.toLowerCase() as ContentTypeApp,
      language: manga.originalLanguage as OriginalLanguage,
      contentRating: manga.contentRating.toLowerCase() as "safe" | "suggestive" | "erotica" | "pornographic",
      genres: (tagsByManga.get(manga.id) || []).map((mt) => ({
        id: mt.tag.id,
        name: mt.tag.name,
        group: mt.tag.group.toLowerCase() as "genre" | "theme" | "format" | "content",
      })),
      year: manga.year,
      totalChapters: manga.totalChapters,
      lastChapter: manga.lastChapter,
      updatedAt: manga.sourceUpdatedAt?.toISOString() || manga.updatedAt.toISOString(),
    }));

    return {
      mangaList,
      metaData: {
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    // Fall back to regular search if trigram query fails
    // (e.g., if pg_trgm extension is not enabled)
    console.warn("[WebcomicSearch] Trigram search failed, falling back to ILIKE:", error);
    return searchWebcomicsInDb(params);
  }
}

/**
 * Check if the database has webcomic data available.
 */
export async function hasWebcomicData(): Promise<boolean> {
  try {
    const count = await prisma.manga.count({
      where: { source: "CONSUMET" },
    });
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Get webcomic statistics.
 */
export async function getWebcomicStats(): Promise<{
  total: number;
  byType: Record<string, number>;
  byProvider: Record<string, number>;
}> {
  const [total, byType, byProvider] = await Promise.all([
    prisma.manga.count({ where: { source: "CONSUMET" } }),
    prisma.manga.groupBy({
      by: ["contentType"],
      where: { source: "CONSUMET" },
      _count: { id: true },
    }),
    prisma.manga.groupBy({
      by: ["provider"],
      where: { source: "CONSUMET" },
      _count: { id: true },
    }),
  ]);

  return {
    total,
    byType: Object.fromEntries(
      byType.map((item) => [item.contentType.toLowerCase(), item._count.id])
    ),
    byProvider: Object.fromEntries(
      byProvider
        .filter((item) => item.provider)
        .map((item) => [item.provider!, item._count.id])
    ),
  };
}

