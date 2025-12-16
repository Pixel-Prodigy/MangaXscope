import type {
  MangaListResponse,
  Manga,
  ChapterData,
  MangaListParams,
  SearchParams,
  MangaDexResponse,
  MangaDexManga,
  MangaListItem,
} from "./types";

const MANGA_DEX_API = "https://api.mangadex.org";

/**
 * Get cover art URL for a manga from MangaDex
 */
async function getCoverArtUrl(mangaId: string, coverArtId: string | null): Promise<string> {
  if (!coverArtId) {
    return `https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover`;
  }

  try {
    const response = await fetch(`${MANGA_DEX_API}/cover/${coverArtId}`, {
      cache: 'force-cache', // Cache cover art requests
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
 * Transform MangaDex manga to UI format
 */
async function transformMangaDexManga(manga: MangaDexManga): Promise<MangaListItem> {
  // Get title (prefer English, fallback to first available)
  const title = manga.attributes.title.en || 
                manga.attributes.title.ja || 
                Object.values(manga.attributes.title)[0] || 
                "Untitled";

  // Get alt titles
  const altTitles = manga.attributes.altTitles
    .map(alt => alt.en || alt.ja || Object.values(alt)[0])
    .filter(Boolean) as string[];

  // Get description (prefer English, fallback to first available)
  const description = manga.attributes.description.en || 
                     manga.attributes.description.ja || 
                     Object.values(manga.attributes.description)[0] || 
                     "";

  // Get cover art ID from relationships
  const coverArtRelationship = manga.relationships.find(
    rel => rel.type === "cover_art"
  );
  const coverArtId = coverArtRelationship?.id || null;

  // Get cover art URL
  const image = await getCoverArtUrl(manga.id, coverArtId);

  // Transform tags
  const tags = manga.attributes.tags.map(tag => ({
    id: tag.id,
    name: tag.attributes.name.en || Object.values(tag.attributes.name)[0] || "Unknown",
    group: tag.attributes.group,
  }));

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
    lastChapter: manga.attributes.lastChapter,
    lastVolume: manga.attributes.lastVolume,
    updatedAt: manga.attributes.updatedAt,
    createdAt: manga.attributes.createdAt,
  };
}

/**
 * Fetch manga list from MangaDex API
 */
async function fetchMangaDexAPI(
  params: URLSearchParams
): Promise<MangaDexResponse> {
  const url = `${MANGA_DEX_API}/manga?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('MangaDex API Error:', response.status, response.statusText, errorText);
    throw new Error(`MangaDex API Error: ${response.status} ${response.statusText}`);
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
    params.contentRating.forEach(rating => {
      searchParams.append("contentRating[]", rating);
    });
  } else {
    // Default to safe and suggestive
    searchParams.append("contentRating[]", "safe");
    searchParams.append("contentRating[]", "suggestive");
  }
  
  // Status filter
  if (params.status && params.status.length > 0) {
    params.status.forEach(status => {
      searchParams.append("status[]", status);
    });
  }
  
  // Tags filter
  if (params.includedTags && params.includedTags.length > 0) {
    params.includedTags.forEach(tag => {
      searchParams.append("includedTags[]", tag);
    });
  }
  
  if (params.excludedTags && params.excludedTags.length > 0) {
    params.excludedTags.forEach(tag => {
      searchParams.append("excludedTags[]", tag);
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
  
  // Transform all mangas
  const mangaList = await Promise.all(
    mangaDexResponse.data.map(transformMangaDexManga)
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

export async function getManga(id: string): Promise<Manga> {
  const searchParams = new URLSearchParams();
  searchParams.append("includes[]", "cover_art");
  searchParams.append("includes[]", "author");
  searchParams.append("includes[]", "artist");
  
  const response = await fetch(`${MANGA_DEX_API}/manga/${id}?${searchParams.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch manga: ${response.statusText}`);
  }

  const data = await response.json();
  const mangaDexManga = data.data;

  // Get title
  const title = mangaDexManga.attributes.title.en || 
                mangaDexManga.attributes.title.ja || 
                Object.values(mangaDexManga.attributes.title)[0] || 
                "Untitled";

  // Get description
  const description = mangaDexManga.attributes.description.en || 
                     mangaDexManga.attributes.description.ja || 
                     Object.values(mangaDexManga.attributes.description)[0] || 
                     "";

  // Get cover art
  const coverArtRelationship = mangaDexManga.relationships.find(
    rel => rel.type === "cover_art"
  );
  const coverArtId = coverArtRelationship?.id || null;
  const imageUrl = await getCoverArtUrl(id, coverArtId);

  // Get author and artist
  const authorRel = mangaDexManga.relationships.find(rel => rel.type === "author");
  const artistRel = mangaDexManga.relationships.find(rel => rel.type === "artist");
  
  // Note: We'd need to fetch author/artist details separately, for now use placeholder
  const author = authorRel ? "Unknown Author" : "Unknown";
  const artist = artistRel ? "Unknown Artist" : "Unknown";

  // Transform tags to genres
  const genres = mangaDexManga.attributes.tags
    .filter(tag => tag.attributes.group === "genre")
    .map(tag => tag.attributes.name.en || Object.values(tag.attributes.name)[0] || "Unknown");

  // Get alt titles
  const altTitles = mangaDexManga.attributes.altTitles
    .map(alt => alt.en || alt.ja || Object.values(alt)[0])
    .filter(Boolean) as string[];

  // Transform tags
  const tags = mangaDexManga.attributes.tags.map(tag => ({
    id: tag.id,
    name: tag.attributes.name.en || Object.values(tag.attributes.name)[0] || "Unknown",
    group: tag.attributes.group,
  }));

  // Format status
  const status = mangaDexManga.attributes.status.charAt(0).toUpperCase() + 
                 mangaDexManga.attributes.status.slice(1);

  // Format updated date
  const updated = new Date(mangaDexManga.attributes.updatedAt).toLocaleDateString();

  return {
    id: mangaDexManga.id,
    imageUrl,
    name: title,
    altTitles,
    author,
    artist,
    status,
    updated,
    view: "N/A", // MangaDex doesn't provide view counts
    description,
    genres,
    tags,
    year: mangaDexManga.attributes.year,
    contentRating: mangaDexManga.attributes.contentRating,
    publicationDemographic: mangaDexManga.attributes.publicationDemographic,
    originalLanguage: mangaDexManga.attributes.originalLanguage,
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
  
  // Transform all mangas
  const mangaList = await Promise.all(
    mangaDexResponse.data.map(transformMangaDexManga)
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

