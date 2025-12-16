import type {
  MangaListResponse,
  Manga,
  ChapterData,
  MangaListParams,
  SearchParams,
  MangaDexResponse,
  MangaDexManga,
  MangaDexRelationship,
  MangaDexTag,
  MangaDexAltTitle,
  MangaListItem,
} from "./types";

/**
 * Get cover art URL for a manga from MangaDex
 */
async function getCoverArtUrl(
  mangaId: string,
  coverArtId: string | null
): Promise<string> {
  if (!coverArtId) {
    return `https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover`;
  }

  try {
    // Use Next.js API route to proxy the request
    const response = await fetch(`/api/cover/${coverArtId}`, {
      cache: "force-cache", // Cache cover art requests
    });
    if (!response.ok) {
      return `https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover`;
    }
    const data = await response.json();
    const fileName = data.data?.attributes?.fileName;
    if (!fileName) {
      return `https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover`;
    }
    // MangaDex cover art URL format
    return `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.512.jpg`;
  } catch {
    return `https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover`;
  }
}

/**
 * Fetch statistics for manga from MangaDex API
 */
async function fetchMangaStatistics(
  mangaIds: string[]
): Promise<Record<string, { chapters: number }>> {
  if (mangaIds.length === 0) {
    return {};
  }

  try {
    // MangaDex statistics endpoint supports bulk requests
    const idsParam = mangaIds.join("&ids[]=");
    const url = `/api/statistics/manga?ids[]=${idsParam}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        "Failed to fetch statistics, continuing without chapter counts"
      );
      return {};
    }

    const data = await response.json();
    const statistics: Record<string, { chapters: number }> = {};

    // MangaDex statistics response format: { statistics: { [mangaId]: { chapters: { total: number } } } }
    if (data.statistics) {
      Object.keys(data.statistics).forEach((mangaId) => {
        const stats = data.statistics[mangaId];
        if (stats?.chapters?.total !== undefined) {
          statistics[mangaId] = { chapters: stats.chapters.total };
        }
      });
    }

    return statistics;
  } catch (error) {
    console.warn("Error fetching statistics:", error);
    return {};
  }
}

/**
 * Transform MangaDex manga to UI format
 */
async function transformMangaDexManga(
  manga: MangaDexManga,
  statistics?: Record<string, { chapters: number }>
): Promise<MangaListItem> {
  // Get title (prefer English, fallback to first available)
  const title =
    manga.attributes.title.en ||
    manga.attributes.title.ja ||
    Object.values(manga.attributes.title)[0] ||
    "Untitled";

  // Get alt titles
  const altTitles = manga.attributes.altTitles
    .map((alt: MangaDexAltTitle) => alt.en || alt.ja || Object.values(alt)[0])
    .filter(Boolean) as string[];

  // Get description (prefer English, fallback to first available)
  const description =
    manga.attributes.description.en ||
    manga.attributes.description.ja ||
    Object.values(manga.attributes.description)[0] ||
    "";

  // Get cover art ID from relationships
  const coverArtRelationship = manga.relationships.find(
    (rel: MangaDexRelationship) => rel.type === "cover_art"
  );
  const coverArtId = coverArtRelationship?.id || null;

  // Get cover art URL
  const image = await getCoverArtUrl(manga.id, coverArtId);

  // Transform tags
  const tags = manga.attributes.tags.map((tag: MangaDexTag) => ({
    id: tag.id,
    name:
      tag.attributes.name.en ||
      Object.values(tag.attributes.name)[0] ||
      "Unknown",
    group: tag.attributes.group,
  }));

  // Get chapter count from statistics
  const totalChapters = statistics?.[manga.id]?.chapters ?? null;

  return {
    id: manga.id,
    image,
    title,
    altTitles,
    description,
    status: manga.attributes.status,
    year: manga.attributes.year,
    contentRating: manga.attributes.contentRating,
    tags,
    publicationDemographic: manga.attributes.publicationDemographic,
    originalLanguage: manga.attributes.originalLanguage,
    lastChapter:
      manga.attributes.lastChapter && manga.attributes.lastChapter.trim() !== ""
        ? manga.attributes.lastChapter
        : null,
    lastVolume:
      manga.attributes.lastVolume && manga.attributes.lastVolume.trim() !== ""
        ? manga.attributes.lastVolume
        : null,
    totalChapters,
    updatedAt: manga.attributes.updatedAt,
    createdAt: manga.attributes.createdAt,
  };
}

/**
 * Fetch manga list from MangaDex API via Next.js API route
 */
async function fetchMangaDexAPI(
  params: URLSearchParams
): Promise<MangaDexResponse> {
  // Use Next.js API route to proxy the request
  const url = `/api/manga?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "MangaDex API Error:",
      response.status,
      response.statusText,
      errorText
    );
    throw new Error(
      `MangaDex API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function getMangaList(
  params: MangaListParams = {}
): Promise<MangaListResponse> {
  const searchParams = new URLSearchParams();

  // Set limit (default 20, max 100)
  const limit = params.limit || 20;
  searchParams.append("limit", Math.min(limit, 100).toString());

  // Set offset for pagination
  const offset = params.offset || 0;
  searchParams.append("offset", offset.toString());

  // Include relationships for cover art
  searchParams.append("includes[]", "cover_art");
  searchParams.append("includes[]", "author");
  searchParams.append("includes[]", "artist");

  // Content rating filter
  if (params.contentRating && params.contentRating.length > 0) {
    params.contentRating.forEach((rating) => {
      searchParams.append("contentRating[]", rating);
    });
  } else {
    // Default to safe and suggestive
    searchParams.append("contentRating[]", "safe");
    searchParams.append("contentRating[]", "suggestive");
  }

  // Status filter
  if (params.status && params.status.length > 0) {
    params.status.forEach((status) => {
      searchParams.append("status[]", status);
    });
  }

  // Tags filter
  if (params.includedTags && params.includedTags.length > 0) {
    params.includedTags.forEach((tag) => {
      searchParams.append("includedTags[]", tag);
    });
  }

  if (params.excludedTags && params.excludedTags.length > 0) {
    params.excludedTags.forEach((tag) => {
      searchParams.append("excludedTags[]", tag);
    });
  }

  // Original language filter (for category: manga/manhua/manhwa)
  if (params.originalLanguage && params.originalLanguage.length > 0) {
    params.originalLanguage.forEach((lang) => {
      searchParams.append("originalLanguage[]", lang);
    });
  }

  // Order by
  if (params.order) {
    Object.entries(params.order).forEach(([key, value]) => {
      searchParams.append(`order[${key}]`, value);
    });
  } else {
    // Default order by latest upload
    searchParams.append("order[updatedAt]", "desc");
  }

  const mangaDexResponse = await fetchMangaDexAPI(searchParams);

  // Fetch statistics for all mangas to get chapter counts
  const mangaIds = mangaDexResponse.data.map((manga) => manga.id);
  const statistics = await fetchMangaStatistics(mangaIds);

  // Transform all mangas with statistics
  let mangaList = await Promise.all(
    mangaDexResponse.data.map((manga) =>
      transformMangaDexManga(manga, statistics)
    )
  );

  // Filter by chapter count if specified
  if (params.minChapters || params.maxChapters) {
    const minChapters = params.minChapters
      ? parseFloat(params.minChapters)
      : null;
    const maxChapters = params.maxChapters
      ? parseFloat(params.maxChapters)
      : null;

    mangaList = mangaList.filter((manga) => {
      // Prefer totalChapters if available, otherwise use lastChapter
      let chapterNum: number | null = null;

      if (manga.totalChapters !== null && manga.totalChapters !== undefined) {
        chapterNum = manga.totalChapters;
      } else if (manga.lastChapter) {
        const parsed = parseFloat(manga.lastChapter);
        if (!isNaN(parsed)) {
          chapterNum = parsed;
        }
      }

      if (chapterNum === null) return false; // Exclude mangas without chapter info

      if (minChapters !== null && chapterNum < minChapters) return false;
      if (maxChapters !== null && chapterNum > maxChapters) return false;

      return true;
    });
  }

  // Calculate pagination metadata
  // Use the API's total for pagination (before chapter filtering)
  // Note: After chapter filtering, the actual results per page may be less,
  // but we use the API total to show correct pagination controls
  const apiTotal = mangaDexResponse.total;
  const totalPages = Math.ceil(apiTotal / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return {
    mangaList,
    metaData: {
      total: apiTotal,
      limit,
      offset,
      totalPages,
    },
  };
}

export async function getManga(id: string): Promise<Manga> {
  const searchParams = new URLSearchParams();
  searchParams.append("includes[]", "cover_art");
  searchParams.append("includes[]", "author");
  searchParams.append("includes[]", "artist");

  // Use Next.js API route to proxy the request
  const response = await fetch(`/api/manga/${id}?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch manga: ${response.statusText}`);
  }

  const data = await response.json();
  const mangaDexManga = data.data;

  // Get title
  const title =
    mangaDexManga.attributes.title.en ||
    mangaDexManga.attributes.title.ja ||
    Object.values(mangaDexManga.attributes.title)[0] ||
    "Untitled";

  // Get description
  const description =
    mangaDexManga.attributes.description.en ||
    mangaDexManga.attributes.description.ja ||
    Object.values(mangaDexManga.attributes.description)[0] ||
    "";

  // Get cover art
  const coverArtRelationship = mangaDexManga.relationships.find(
    (rel: MangaDexRelationship) => rel.type === "cover_art"
  );
  const coverArtId = coverArtRelationship?.id || null;
  const imageUrl = await getCoverArtUrl(id, coverArtId);

  // Get author and artist
  const authorRel = mangaDexManga.relationships.find(
    (rel: MangaDexRelationship) => rel.type === "author"
  );
  const artistRel = mangaDexManga.relationships.find(
    (rel: MangaDexRelationship) => rel.type === "artist"
  );

  // Note: We'd need to fetch author/artist details separately, for now use placeholder
  const author = authorRel ? "Unknown Author" : "Unknown";
  const artist = artistRel ? "Unknown Artist" : "Unknown";

  // Transform tags to genres
  const genres = mangaDexManga.attributes.tags
    .filter((tag: MangaDexTag) => tag.attributes.group === "genre")
    .map(
      (tag: MangaDexTag) =>
        tag.attributes.name.en ||
        Object.values(tag.attributes.name)[0] ||
        "Unknown"
    );

  // Get alt titles
  const altTitles = mangaDexManga.attributes.altTitles
    .map((alt: MangaDexAltTitle) => alt.en || alt.ja || Object.values(alt)[0])
    .filter(Boolean) as string[];

  // Transform tags
  const tags = mangaDexManga.attributes.tags.map((tag: MangaDexTag) => ({
    id: tag.id,
    name:
      tag.attributes.name.en ||
      Object.values(tag.attributes.name)[0] ||
      "Unknown",
    group: tag.attributes.group,
  }));

  // Format status
  const status =
    mangaDexManga.attributes.status.charAt(0).toUpperCase() +
    mangaDexManga.attributes.status.slice(1);

  // Format updated date
  const updated = new Date(
    mangaDexManga.attributes.updatedAt
  ).toLocaleDateString();

  return {
    id: mangaDexManga.id,
    imageUrl,
    name: title,
    altTitles,
    author,
    artist,
    status,
    updated,
    description,
    genres,
    tags,
    year: mangaDexManga.attributes.year,
    contentRating: mangaDexManga.attributes.contentRating,
    publicationDemographic: mangaDexManga.attributes.publicationDemographic,
    originalLanguage: mangaDexManga.attributes.originalLanguage,
    lastChapter:
      mangaDexManga.attributes.lastChapter &&
      mangaDexManga.attributes.lastChapter.trim() !== ""
        ? mangaDexManga.attributes.lastChapter
        : null,
    chapterList: [], // Will need to fetch chapters separately
  };
}

export async function searchManga(
  params: SearchParams
): Promise<MangaListResponse> {
  const searchParams = new URLSearchParams();

  // Set limit
  const limit = params.limit || 20;
  searchParams.append("limit", Math.min(limit, 100).toString());

  // Set offset for pagination
  const offset = params.offset || 0;
  searchParams.append("offset", offset.toString());

  // Search query
  if (params.query) {
    searchParams.append("title", params.query);
  }

  // Include relationships
  searchParams.append("includes[]", "cover_art");
  searchParams.append("includes[]", "author");
  searchParams.append("includes[]", "artist");

  // Content rating (default to safe and suggestive)
  searchParams.append("contentRating[]", "safe");
  searchParams.append("contentRating[]", "suggestive");

  // Order by relevance
  searchParams.append("order[relevance]", "desc");

  const mangaDexResponse = await fetchMangaDexAPI(searchParams);

  // Fetch statistics for all mangas to get chapter counts
  const mangaIds = mangaDexResponse.data.map((manga) => manga.id);
  const statistics = await fetchMangaStatistics(mangaIds);

  // Transform all mangas with statistics
  const mangaList = await Promise.all(
    mangaDexResponse.data.map((manga) =>
      transformMangaDexManga(manga, statistics)
    )
  );

  // Calculate pagination metadata
  const totalPages = Math.ceil(mangaDexResponse.total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return {
    mangaList,
    metaData: {
      total: mangaDexResponse.total,
      limit,
      offset,
      totalPages,
    },
  };
}

export async function getChapter(
  mangaId: string,
  chapterId: string
): Promise<ChapterData> {
  // This would need to be implemented with MangaDex chapter API
  // For now, return a placeholder
  throw new Error("Chapter fetching not yet implemented with MangaDex API");
}
