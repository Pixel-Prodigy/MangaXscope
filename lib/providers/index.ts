/**
 * Provider Factory and Router.
 * 
 * ARCHITECTURE:
 * 
 * 1. MANGA SECTION (MangaDex ONLY)
 *    - Japanese manga content
 *    - Uses MangaDex API directly
 *    - Language filter: originalLanguage=ja
 * 
 * 2. WEBCOMICS SECTION (Consumet with Multi-Provider Fallback)
 *    - Manhwa (Korean)
 *    - Manhua (Chinese)
 *    - Webtoons
 *    - Uses priority-based provider fallback for MAXIMUM coverage
 * 
 * RULES:
 * - Provider selection happens at the API route level
 * - All external API calls are server-side only
 * - Responses are normalized to shared types before returning to client
 * - For webcomics: providers are tried sequentially, not in parallel
 */

import type {
  MangaProvider,
  DataSource,
  ContentType,
  ContentSection,
  OriginalLanguage,
  SearchParams,
  MangaListResponse,
  MangaDetails,
  ChapterListResponse,
  ChapterPagesResponse,
  WebcomicType,
  ConsumetProviderName,
} from "@/types";

import { mangadexProvider } from "./mangadex";
import { consumetProvider, searchWithFallback } from "./consumet";

// =============================================================================
// PROVIDER REGISTRY
// =============================================================================

/**
 * Registry of all available providers.
 */
const providers: Record<DataSource, MangaProvider> = {
  mangadex: mangadexProvider,
  consumet: consumetProvider,
};

/**
 * Get a provider by name.
 */
export function getProvider(source: DataSource): MangaProvider {
  const provider = providers[source];
  if (!provider) {
    throw new Error(`Unknown provider: ${source}`);
  }
  return provider;
}

// =============================================================================
// SECTION-BASED ROUTING
// =============================================================================

/**
 * Get provider for a content section.
 * 
 * @param section - "manga" or "webcomics"
 * @returns The appropriate provider
 */
export function getProviderForSection(section: ContentSection): MangaProvider {
  switch (section) {
    case "manga":
      return mangadexProvider;
    case "webcomics":
      return consumetProvider;
    default:
      return mangadexProvider;
  }
}

/**
 * Get the data source for a content section.
 */
export function getSourceForSection(section: ContentSection): DataSource {
  return section === "manga" ? "mangadex" : "consumet";
}

// =============================================================================
// CONTENT TYPE ROUTING
// =============================================================================

/**
 * Content type to provider mapping.
 */
const CONTENT_TYPE_PROVIDERS: Record<ContentType, DataSource> = {
  manga: "mangadex",
  manhwa: "consumet",
  manhua: "consumet",
  webtoon: "consumet",
};

/**
 * Language to provider mapping.
 */
const LANGUAGE_PROVIDERS: Record<OriginalLanguage, DataSource> = {
  ja: "mangadex",
  ko: "consumet",
  zh: "consumet",
  en: "mangadex",
};

/**
 * Determine which provider to use based on content type.
 */
export function getProviderForContentType(contentType: ContentType): MangaProvider {
  const source = CONTENT_TYPE_PROVIDERS[contentType];
  return getProvider(source);
}

/**
 * Determine which provider to use based on language.
 */
export function getProviderForLanguage(language: OriginalLanguage): MangaProvider {
  const source = LANGUAGE_PROVIDERS[language];
  return getProvider(source);
}

/**
 * Determine provider source based on content type.
 */
export function getSourceForContentType(contentType: ContentType): DataSource {
  return CONTENT_TYPE_PROVIDERS[contentType];
}

/**
 * Determine provider source based on language.
 */
export function getSourceForLanguage(language: OriginalLanguage): DataSource {
  return LANGUAGE_PROVIDERS[language];
}

// =============================================================================
// UNIFIED SEARCH FUNCTIONS
// =============================================================================

/**
 * Search for content based on section.
 * 
 * @param section - "manga" or "webcomics"
 * @param params - Search parameters
 * @returns Normalized search results
 * 
 * @example
 * // Search manga section
 * const results = await searchBySection("manga", { query: "naruto" });
 * 
 * // Search webcomics section
 * const results = await searchBySection("webcomics", { query: "solo leveling", webcomicType: "manhwa" });
 */
export async function searchBySection(
  section: ContentSection,
  params: SearchParams
): Promise<MangaListResponse> {
  if (section === "manga") {
    return mangadexProvider.search(params);
  }
  
  // For webcomics, use multi-provider fallback
  return searchWithFallback(params);
}

/**
 * Search for manga using the appropriate provider based on content type.
 * 
 * @deprecated Use searchBySection instead for explicit section routing
 */
export async function searchManga(params: SearchParams): Promise<MangaListResponse> {
  // Determine section from params
  const contentType = Array.isArray(params.type) ? params.type[0] : params.type;
  const section = params.section;
  const language = params.language?.[0];

  // Explicit section takes priority
  if (section) {
    return searchBySection(section, params);
  }

  // Route based on content type
  if (contentType && contentType !== "manga") {
    return searchWithFallback({
      ...params,
      webcomicType: contentType as WebcomicType,
    });
  }

  // Route based on language
  if (language === "ko" || language === "zh") {
    return searchWithFallback(params);
  }

  // Default to MangaDex for Japanese manga
  return mangadexProvider.search(params);
}

/**
 * Get manga details from the appropriate provider.
 */
export async function getMangaDetails(
  id: string,
  source: DataSource,
  provider?: ConsumetProviderName
): Promise<MangaDetails> {
  if (source === "consumet") {
    // Use the multi-provider getDetails from consumet
    return consumetProvider.getDetails(id, provider);
  }
  
  return mangadexProvider.getDetails(id);
}

/**
 * Get chapter list from the appropriate provider.
 */
export async function getChapterList(
  mangaId: string,
  source: DataSource,
  options?: { 
    limit?: number; 
    offset?: number; 
    language?: string;
    provider?: ConsumetProviderName;
  }
): Promise<ChapterListResponse> {
  const provider = getProvider(source);
  return provider.getChapters(mangaId, options);
}

/**
 * Get chapter pages from the appropriate provider.
 */
export async function getChapterPages(
  mangaId: string,
  chapterId: string,
  source: DataSource,
  provider?: ConsumetProviderName
): Promise<ChapterPagesResponse> {
  const mangaProvider = getProvider(source);
  return mangaProvider.getChapterPages(mangaId, chapterId);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a content type should use MangaDex.
 */
export function isMangaDexContentType(contentType: ContentType): boolean {
  return contentType === "manga";
}

/**
 * Check if a language should use MangaDex.
 */
export function isMangaDexLanguage(language: OriginalLanguage): boolean {
  return language === "ja" || language === "en";
}

/**
 * Check if a content type should use Consumet.
 */
export function isConsumetContentType(contentType: ContentType): boolean {
  return contentType === "manhwa" || contentType === "manhua" || contentType === "webtoon";
}

/**
 * Check if a language should use Consumet.
 */
export function isConsumetLanguage(language: OriginalLanguage): boolean {
  return language === "ko" || language === "zh";
}

/**
 * Check if content type is a webcomic type.
 */
export function isWebcomicType(contentType: ContentType): contentType is WebcomicType {
  return contentType === "manhwa" || contentType === "manhua" || contentType === "webtoon";
}

/**
 * Get section from content type.
 */
export function getSectionFromContentType(contentType: ContentType): ContentSection {
  return contentType === "manga" ? "manga" : "webcomics";
}

/**
 * Parse source from composite ID.
 * Format: "source:provider:id" or "source:id" or just "id"
 */
export function parseCompositeId(
  compositeId: string
): { source: DataSource; id: string; provider?: ConsumetProviderName } {
  const parts = compositeId.split(":");
  
  if (parts.length >= 3) {
    const [source, provider, ...idParts] = parts;
    if ((source === "mangadex" || source === "consumet")) {
      return { 
        source, 
        id: idParts.join(":"),
        provider: provider as ConsumetProviderName,
      };
    }
  }
  
  if (parts.length === 2) {
    const [source, ...idParts] = parts;
    if (source === "mangadex" || source === "consumet") {
      return { source, id: idParts.join(":") };
    }
  }
  
  // UUID format indicates MangaDex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(compositeId)) {
    return { source: "mangadex", id: compositeId };
  }
  
  // Non-UUID IDs are likely from Consumet
  return { source: "consumet", id: compositeId };
}

/**
 * Create a composite ID from source, provider, and ID.
 */
export function createCompositeId(
  source: DataSource, 
  id: string,
  provider?: ConsumetProviderName
): string {
  if (provider) {
    return `${source}:${provider}:${id}`;
  }
  return `${source}:${id}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { mangadexProvider } from "./mangadex";
export { 
  consumetProvider, 
  createConsumetProvider, 
  CONSUMET_PROVIDERS,
  searchWithFallback,
  aggregateFromAllProviders,
  getProvidersForType,
} from "./consumet";

export type { MangaProvider };
