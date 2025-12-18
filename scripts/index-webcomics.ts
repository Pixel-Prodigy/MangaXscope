#!/usr/bin/env tsx
/**
 * Webcomic Indexer Script
 * 
 * Crawls Consumet providers and indexes webcomics into the database.
 * 
 * Usage:
 *   pnpm tsx scripts/index-webcomics.ts              # Full index with resume
 *   pnpm tsx scripts/index-webcomics.ts --full       # Full re-index (ignore resume point)
 *   pnpm tsx scripts/index-webcomics.ts --provider mangakakalot  # Single provider
 *   pnpm tsx scripts/index-webcomics.ts --query a    # Start from specific query
 * 
 * The script uses alphabet queries (a-z, 0-9) with deep pagination to
 * crawl as much of each provider's catalog as possible.
 */

import type { MangaListItem, ConsumetProviderName, SearchParams } from "@/types";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSUMET_API = process.env.CONSUMET_API_URL || "https://api.consumet.org";
const REQUEST_TIMEOUT = 15000;  // 15 seconds
const RATE_LIMIT_MS = 500;      // 500ms between requests to avoid rate limiting
const MAX_PAGES_PER_QUERY = 30; // Max pages per query
const CONCURRENT_PAGES = 5;     // Fetch 5 pages at once

// All providers to index
const ALL_PROVIDERS: ConsumetProviderName[] = [
  "mangakakalot",
  "mangapark",
  "asurascans",
  "reaperscans",
  "flamescans",
];

// Alphabet queries for comprehensive crawling
const ALPHABET_QUERIES = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
];

// =============================================================================
// IMPORTS (DYNAMIC TO HANDLE PRISMA)
// =============================================================================

async function loadDependencies() {
  // Import after dotenv is loaded
  const { prisma } = await import("@/lib/db");
  const { 
    upsertWebcomicBatch,
    getWebcomicSyncMetadata,
    startWebcomicSync,
    completeWebcomicSync,
    failWebcomicSync,
    updateSyncResumePoint,
  } = await import("@/lib/sync/webcomic-sync");
  
  return {
    prisma,
    upsertWebcomicBatch,
    getWebcomicSyncMetadata,
    startWebcomicSync,
    completeWebcomicSync,
    failWebcomicSync,
    updateSyncResumePoint,
  };
}

// =============================================================================
// CONSUMET API TYPES
// =============================================================================

interface ConsumetMangaResult {
  id: string;
  title: string;
  altTitles?: string[];
  image?: string;
  description?: string;
  status?: string;
  genres?: string[];
  releaseDate?: string;
  rating?: number;
}

interface ConsumetSearchResponse {
  currentPage: number;
  hasNextPage: boolean;
  results: ConsumetMangaResult[];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MangaXScope-Indexer/1.0",
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// TRANSFORMER FUNCTIONS
// =============================================================================

type ContentType = "manga" | "manhwa" | "manhua" | "webtoon";
type OriginalLanguage = "ja" | "ko" | "zh" | "en";
type PublicationStatus = "ongoing" | "completed" | "hiatus" | "cancelled" | "unknown";
type ContentRating = "safe" | "suggestive" | "erotica" | "pornographic";

function mapStatus(status: string | undefined): PublicationStatus {
  if (!status) return "unknown";
  const normalized = status.toLowerCase();
  if (normalized.includes("ongoing") || normalized.includes("publishing")) return "ongoing";
  if (normalized.includes("completed") || normalized.includes("finished")) return "completed";
  if (normalized.includes("hiatus")) return "hiatus";
  if (normalized.includes("cancelled") || normalized.includes("canceled")) return "cancelled";
  return "unknown";
}

function inferContentType(genres: string[] = [], title: string = ""): ContentType {
  const genresLower = genres.map((g) => g.toLowerCase());
  const titleLower = title.toLowerCase();

  if (genresLower.some((g) => 
    g.includes("manhua") || g.includes("chinese") || g.includes("cultivation") || 
    g.includes("wuxia") || g.includes("xianxia") || g.includes("martial arts")
  ) || titleLower.includes("manhua")) {
    return "manhua";
  }

  if (genresLower.some((g) => 
    g.includes("webtoon") || g.includes("web comic") || g.includes("full color")
  ) || titleLower.includes("webtoon")) {
    return "webtoon";
  }

  if (genresLower.some((g) => g.includes("manhwa") || g.includes("korean")) ||
    titleLower.includes("manhwa")) {
    return "manhwa";
  }

  return "manhwa"; // Default for webcomics
}

function inferLanguage(contentType: ContentType): OriginalLanguage {
  switch (contentType) {
    case "manhua": return "zh";
    case "manhwa":
    case "webtoon": return "ko";
    default: return "ko";
  }
}

function inferContentRating(genres: string[] = []): ContentRating {
  const genresLower = genres.map((g) => g.toLowerCase());
  if (genresLower.some((g) => g.includes("hentai") || g.includes("pornographic"))) return "pornographic";
  if (genresLower.some((g) => g.includes("erotica") || g.includes("smut"))) return "erotica";
  if (genresLower.some((g) => g.includes("ecchi") || g.includes("mature") || g.includes("adult"))) return "suggestive";
  return "safe";
}

function inferTagGroup(genre: string): "genre" | "theme" | "format" | "content" {
  const genreLower = genre.toLowerCase();
  if (["webtoon", "full color", "long strip", "4-koma"].some((f) => genreLower.includes(f))) return "format";
  if (["mature", "adult", "gore", "violence", "sexual"].some((c) => genreLower.includes(c))) return "content";
  if (["isekai", "reincarnation", "time travel", "video game", "virtual reality", "school", "martial arts", "cultivation"].some((t) => genreLower.includes(t))) return "theme";
  return "genre";
}

function parseYear(releaseDate: string | number | undefined | null): number | null {
  if (releaseDate === undefined || releaseDate === null) return null;
  if (typeof releaseDate === "number") {
    return releaseDate >= 1900 && releaseDate <= 2100 ? releaseDate : null;
  }
  const yearMatch = String(releaseDate).match(/\d{4}/);
  return yearMatch ? parseInt(yearMatch[0], 10) : null;
}

function transformMangaResult(
  manga: ConsumetMangaResult,
  provider: ConsumetProviderName
): MangaListItem {
  const genres = manga.genres || [];
  const contentType = inferContentType(genres, manga.title);
  const language = inferLanguage(contentType);

  return {
    id: manga.id,
    source: "consumet",
    provider,
    title: manga.title,
    altTitles: manga.altTitles || [],
    description: manga.description || "",
    image: manga.image || "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover",
    status: mapStatus(manga.status),
    contentType,
    language,
    contentRating: inferContentRating(genres),
    genres: genres.map((genre) => ({
      id: `consumet-genre-${genre.toLowerCase().replace(/\s+/g, "-")}`,
      name: genre,
      group: inferTagGroup(genre),
    })),
    year: parseYear(manga.releaseDate),
    totalChapters: null,
    lastChapter: null,
    updatedAt: new Date().toISOString(),
  };
}

// =============================================================================
// FETCHING FUNCTIONS
// =============================================================================

async function fetchPage(
  provider: ConsumetProviderName,
  query: string,
  page: number
): Promise<MangaListItem[]> {
  const url = `${CONSUMET_API}/manga/${provider}/${encodeURIComponent(query)}?page=${page}`;
  
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];

    const text = await response.text();
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      return [];
    }

    const data: ConsumetSearchResponse = JSON.parse(text);
    if (!data.results) return [];

    return data.results.map((m) => transformMangaResult(m, provider));
  } catch {
    return [];
  }
}

async function fetchPageBatch(
  provider: ConsumetProviderName,
  query: string,
  startPage: number,
  batchSize: number
): Promise<{ results: MangaListItem[]; hasMore: boolean }> {
  const pagePromises = Array.from({ length: batchSize }, (_, i) =>
    fetchPage(provider, query, startPage + i)
  );

  const batchResults = await Promise.allSettled(pagePromises);
  const results: MangaListItem[] = [];
  let hasMore = false;

  for (const result of batchResults) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      results.push(...result.value);
      hasMore = true;
    }
  }

  return { results, hasMore };
}

async function fetchAllPagesForQuery(
  provider: ConsumetProviderName,
  query: string
): Promise<MangaListItem[]> {
  const allResults: MangaListItem[] = [];
  let currentPage = 1;

  while (currentPage <= MAX_PAGES_PER_QUERY) {
    const { results, hasMore } = await fetchPageBatch(
      provider,
      query,
      currentPage,
      CONCURRENT_PAGES
    );

    allResults.push(...results);

    if (!hasMore) {
      break;
    }

    currentPage += CONCURRENT_PAGES;
    await delay(RATE_LIMIT_MS);
  }

  return allResults;
}

// =============================================================================
// DEDUPLICATION
// =============================================================================

function deduplicateResults(results: MangaListItem[]): MangaListItem[] {
  const seen = new Map<string, MangaListItem>();
  
  for (const manga of results) {
    const key = `${manga.provider || "unknown"}:${manga.id}`;
    if (!seen.has(key)) {
      seen.set(key, manga);
    }
  }
  
  return Array.from(seen.values());
}

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

interface CliArgs {
  provider?: ConsumetProviderName;
  query?: string;
  full: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { full: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--full") {
      result.full = true;
    } else if (arg === "--provider" && args[i + 1]) {
      result.provider = args[++i] as ConsumetProviderName;
    } else if (arg === "--query" && args[i + 1]) {
      result.query = args[++i];
    }
  }

  return result;
}

// =============================================================================
// MAIN INDEXER
// =============================================================================

async function indexProvider(
  provider: ConsumetProviderName,
  queries: string[],
  deps: Awaited<ReturnType<typeof loadDependencies>>
): Promise<number> {
  console.log(`\n📦 Indexing provider: ${provider}`);
  console.log(`   Queries to process: ${queries.length}`);

  let totalIndexed = 0;
  const startTime = Date.now();

  for (const query of queries) {
    console.log(`   🔍 Query: "${query}"`);
    
    try {
      // Fetch all pages for this query
      const results = await fetchAllPagesForQuery(provider, query);
      
      if (results.length === 0) {
        console.log(`      No results`);
        continue;
      }

      // Deduplicate
      const uniqueResults = deduplicateResults(results);
      console.log(`      Found ${uniqueResults.length} unique items`);

      // Upsert to database
      const upserted = await deps.upsertWebcomicBatch(uniqueResults, provider);
      totalIndexed += upserted;
      console.log(`      ✅ Upserted ${upserted} items (total: ${totalIndexed})`);

      // Update resume point
      await deps.updateSyncResumePoint(provider, query, totalIndexed);

    } catch (error) {
      console.error(`      ❌ Error:`, error);
    }

    // Rate limit between queries
    await delay(RATE_LIMIT_MS);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ⏱️  Provider ${provider} completed in ${elapsed}s`);
  console.log(`   📊 Total indexed from ${provider}: ${totalIndexed}`);

  return totalIndexed;
}

async function main() {
  console.log("🚀 Webcomic Indexer Starting...\n");

  // Parse CLI arguments
  const args = parseArgs();
  console.log("Configuration:");
  console.log(`   Full re-index: ${args.full}`);
  console.log(`   Provider: ${args.provider || "all"}`);
  console.log(`   Start query: ${args.query || "a"}`);

  // Load dependencies
  const deps = await loadDependencies();

  // Get current sync status
  const metadata = await deps.getWebcomicSyncMetadata();
  
  // Determine resume point
  let startProvider: ConsumetProviderName | null = null;
  let startQuery: string | null = null;

  if (!args.full && !args.provider && !args.query) {
    // Resume from last position if not doing full re-index
    if (metadata.lastProvider && metadata.lastQuery) {
      startProvider = metadata.lastProvider as ConsumetProviderName;
      startQuery = metadata.lastQuery;
      console.log(`\n📍 Resuming from: ${startProvider} / "${startQuery}"`);
    }
  }

  // Mark sync as started
  await deps.startWebcomicSync();

  try {
    let totalIndexed = 0;
    
    // Determine which providers to process
    const providers = args.provider 
      ? [args.provider] 
      : ALL_PROVIDERS;

    // Determine starting point
    const shouldSkipToResume = !args.full && startProvider !== null;
    let foundResumePoint = !shouldSkipToResume;

    for (const provider of providers) {
      // Skip providers until we reach resume point
      if (!foundResumePoint) {
        if (provider !== startProvider) {
          console.log(`⏭️  Skipping provider: ${provider}`);
          continue;
        }
        foundResumePoint = true;
      }

      // Determine which queries to run
      let queries = ALPHABET_QUERIES;
      
      if (args.query) {
        // Start from specified query
        const queryIndex = ALPHABET_QUERIES.indexOf(args.query);
        if (queryIndex >= 0) {
          queries = ALPHABET_QUERIES.slice(queryIndex);
        }
      } else if (provider === startProvider && startQuery) {
        // Resume from last query for this provider
        const queryIndex = ALPHABET_QUERIES.indexOf(startQuery);
        if (queryIndex >= 0) {
          queries = ALPHABET_QUERIES.slice(queryIndex + 1); // Start from NEXT query
        }
      }

      // Index this provider
      const count = await indexProvider(provider, queries, deps);
      totalIndexed += count;

      // Reset query filtering for subsequent providers
      startQuery = null;
    }

    // Mark sync as completed
    await deps.completeWebcomicSync(totalIndexed);
    
    // Get final stats
    const finalStatus = await deps.prisma.manga.count({
      where: { source: "CONSUMET" },
    });

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Indexing Complete!");
    console.log(`   Total indexed this run: ${totalIndexed}`);
    console.log(`   Total webcomics in DB: ${finalStatus}`);
    console.log("=".repeat(60));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Indexing failed:", errorMessage);
    await deps.failWebcomicSync(errorMessage);
    process.exit(1);
  }

  process.exit(0);
}

// Run the indexer
main();

