import { prisma } from "@/lib/db";
import type {
  MangaDexMangaForSync,
  MangaUpsertData,
  TagUpsertData,
  SyncProgress,
} from "@/lib/db/types";
import {
  mapStatus,
  mapContentRating,
  mapDemographic,
  mapTagGroup,
  getPreferredText,
  extractAltTitles,
  estimateTotalChapters,
  findRelationship,
  delay,
  batchArray,
} from "@/lib/db/utils";

const MANGADEX_API = "https://api.mangadex.org";
const BATCH_SIZE = 100;
const RATE_LIMIT_MS = 200; // 5 requests per second
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Fetches a batch of manga from MangaDex API
 */
async function fetchMangaDexBatch(
  offset: number,
  limit: number = BATCH_SIZE,
  updatedSince?: Date
): Promise<{ data: MangaDexMangaForSync[]; total: number }> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    "includes[]": "cover_art",
    "order[updatedAt]": "desc",
  });

  // Add content ratings to get all types
  ["safe", "suggestive", "erotica", "pornographic"].forEach((rating) => {
    params.append("contentRating[]", rating);
  });

  if (updatedSince) {
    params.set("updatedAtSince", updatedSince.toISOString().split(".")[0]);
  }

  let lastError: Error | null = null;

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    try {
      const response = await fetch(`${MANGADEX_API}/manga?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MangaHook/1.0",
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait longer
          console.warn(`Rate limited, waiting ${RETRY_DELAY_MS * 2}ms...`);
          await delay(RETRY_DELAY_MS * 2);
          continue;
        }
        throw new Error(`MangaDex API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        data: data.data as MangaDexMangaForSync[],
        total: data.total as number,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Fetch attempt ${retry + 1} failed:`, lastError.message);
      if (retry < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (retry + 1));
      }
    }
  }

  throw lastError || new Error("Failed to fetch manga batch");
}

/**
 * Transforms MangaDex manga data to database format
 */
function transformMangaData(manga: MangaDexMangaForSync): {
  mangaData: MangaUpsertData;
  tags: TagUpsertData[];
} {
  const attrs = manga.attributes;
  
  const tags: TagUpsertData[] = attrs.tags.map((tag) => ({
    id: tag.id,
    name: getPreferredText(tag.attributes.name, "Unknown"),
    group: mapTagGroup(tag.attributes.group),
  }));

  const mangaData: MangaUpsertData = {
    id: manga.id,
    title: getPreferredText(attrs.title, "Untitled"),
    altTitles: extractAltTitles(attrs.altTitles),
    description: getPreferredText(attrs.description) || null,
    status: mapStatus(attrs.status),
    year: attrs.year,
    contentRating: mapContentRating(attrs.contentRating),
    publicationDemographic: mapDemographic(attrs.publicationDemographic),
    originalLanguage: attrs.originalLanguage,
    lastChapter: attrs.lastChapter,
    lastVolume: attrs.lastVolume,
    totalChapters: estimateTotalChapters(attrs.lastChapter),
    coverArtId: findRelationship(manga.relationships, "cover_art"),
    followedCount: 0, // Would need statistics API
    sourceUpdatedAt: new Date(attrs.updatedAt),
    tagIds: attrs.tags.map((t) => t.id),
  };

  return { mangaData, tags };
}

/**
 * Upserts a batch of manga and their tags into the database
 */
async function upsertMangaBatch(mangaList: MangaDexMangaForSync[]): Promise<number> {
  if (mangaList.length === 0) return 0;

  const allTags = new Map<string, TagUpsertData>();
  const mangaDataList: MangaUpsertData[] = [];

  // Transform all manga and collect unique tags
  for (const manga of mangaList) {
    const { mangaData, tags } = transformMangaData(manga);
    mangaDataList.push(mangaData);
    tags.forEach((tag) => allTags.set(tag.id, tag));
  }

  // Upsert all unique tags first
  const tagsArray = Array.from(allTags.values());
  if (tagsArray.length > 0) {
    await prisma.$transaction(
      tagsArray.map((tag) =>
        prisma.tag.upsert({
          where: { id: tag.id },
          create: tag,
          update: { name: tag.name, group: tag.group },
        })
      )
    );
  }

  // Upsert manga in smaller batches to avoid transaction timeout
  const mangaBatches = batchArray(mangaDataList, 50);
  
  for (const batch of mangaBatches) {
    await prisma.$transaction(async (tx) => {
      for (const mangaData of batch) {
        const { tagIds, ...data } = mangaData;

        // Upsert the manga
        await tx.manga.upsert({
          where: { id: mangaData.id },
          create: data,
          update: data,
        });

        // Delete existing tag relations and recreate
        await tx.mangaTag.deleteMany({
          where: { mangaId: mangaData.id },
        });

        if (tagIds.length > 0) {
          await tx.mangaTag.createMany({
            data: tagIds.map((tagId) => ({
              mangaId: mangaData.id,
              tagId,
            })),
            skipDuplicates: true,
          });
        }
      }
    });
  }

  return mangaDataList.length;
}

/**
 * Gets or creates the sync metadata singleton
 */
async function getSyncMetadata() {
  return prisma.syncMetadata.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

/**
 * Updates sync metadata
 */
async function updateSyncMetadata(
  data: Partial<{
    lastFullSync: Date;
    lastIncrementalSync: Date;
    totalMangaCount: number;
    syncStatus: "IDLE" | "SYNCING" | "ERROR";
    lastError: string | null;
  }>
) {
  return prisma.syncMetadata.update({
    where: { id: "singleton" },
    data,
  });
}

/**
 * Performs a full sync from MangaDex
 * This should be run once initially and then periodically if needed
 */
export async function fullSync(
  onProgress?: (progress: SyncProgress) => void
): Promise<{ success: boolean; totalProcessed: number; error?: string }> {
  console.log("Starting full sync from MangaDex...");

  await updateSyncMetadata({
    syncStatus: "SYNCING",
    lastError: null,
  });

  let offset = 0;
  let totalProcessed = 0;
  let totalToProcess = 0;

  try {
    // Get initial total count
    const initialBatch = await fetchMangaDexBatch(0, 1);
    totalToProcess = initialBatch.total;
    console.log(`Total manga to sync: ${totalToProcess}`);

    while (offset < totalToProcess) {
      const { data } = await fetchMangaDexBatch(offset, BATCH_SIZE);
      
      if (data.length === 0) break;

      const processed = await upsertMangaBatch(data);
      totalProcessed += processed;
      offset += BATCH_SIZE;

      const progress: SyncProgress = {
        status: "SYNCING",
        totalProcessed,
        totalToProcess,
        currentOffset: offset,
      };

      console.log(
        `Progress: ${totalProcessed}/${totalToProcess} (${((totalProcessed / totalToProcess) * 100).toFixed(1)}%)`
      );

      onProgress?.(progress);

      // Rate limit
      await delay(RATE_LIMIT_MS);
    }

    // Update metadata on success
    const count = await prisma.manga.count();
    await updateSyncMetadata({
      syncStatus: "IDLE",
      lastFullSync: new Date(),
      totalMangaCount: count,
    });

    console.log(`Full sync completed. Total manga in database: ${count}`);

    return { success: true, totalProcessed };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Full sync failed:", errorMessage);

    await updateSyncMetadata({
      syncStatus: "ERROR",
      lastError: errorMessage,
    });

    return { success: false, totalProcessed, error: errorMessage };
  }
}

/**
 * Performs an incremental sync to get recently updated manga
 * Should be run periodically (e.g., every 6 hours via cron)
 */
export async function incrementalSync(
  onProgress?: (progress: SyncProgress) => void
): Promise<{ success: boolean; totalProcessed: number; error?: string }> {
  console.log("Starting incremental sync from MangaDex...");

  const metadata = await getSyncMetadata();
  
  // Default to 24 hours ago if no previous sync
  const lastSync = metadata.lastIncrementalSync || 
    metadata.lastFullSync || 
    new Date(Date.now() - 24 * 60 * 60 * 1000);

  console.log(`Fetching manga updated since: ${lastSync.toISOString()}`);

  await updateSyncMetadata({
    syncStatus: "SYNCING",
    lastError: null,
  });

  let offset = 0;
  let totalProcessed = 0;
  const maxOffset = 10000; // Safety limit

  try {
    while (offset < maxOffset) {
      const { data } = await fetchMangaDexBatch(offset, BATCH_SIZE, lastSync);
      
      if (data.length === 0) break;

      const processed = await upsertMangaBatch(data);
      totalProcessed += processed;
      offset += BATCH_SIZE;

      const progress: SyncProgress = {
        status: "SYNCING",
        totalProcessed,
        totalToProcess: -1, // Unknown for incremental
        currentOffset: offset,
      };

      console.log(`Incremental sync progress: ${totalProcessed} manga processed`);

      onProgress?.(progress);

      // If we got less than a full batch, we're done
      if (data.length < BATCH_SIZE) break;

      // Rate limit
      await delay(RATE_LIMIT_MS);
    }

    // Update metadata on success
    const count = await prisma.manga.count();
    await updateSyncMetadata({
      syncStatus: "IDLE",
      lastIncrementalSync: new Date(),
      totalMangaCount: count,
    });

    console.log(`Incremental sync completed. Updated ${totalProcessed} manga.`);

    return { success: true, totalProcessed };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Incremental sync failed:", errorMessage);

    await updateSyncMetadata({
      syncStatus: "ERROR",
      lastError: errorMessage,
    });

    return { success: false, totalProcessed, error: errorMessage };
  }
}

/**
 * Gets the current sync status
 */
export async function getSyncStatus(): Promise<SyncProgress & { 
  lastFullSync: Date | null;
  lastIncrementalSync: Date | null;
  totalMangaCount: number;
}> {
  const metadata = await getSyncMetadata();
  const mangaCount = await prisma.manga.count();

  return {
    status: metadata.syncStatus,
    totalProcessed: mangaCount,
    totalToProcess: metadata.totalMangaCount,
    currentOffset: 0,
    lastError: metadata.lastError ?? undefined,
    lastFullSync: metadata.lastFullSync,
    lastIncrementalSync: metadata.lastIncrementalSync,
    totalMangaCount: mangaCount,
  };
}


