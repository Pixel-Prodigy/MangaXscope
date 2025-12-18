/**
 * Webcomic Sync Library
 * 
 * Handles upserting webcomics from Consumet providers into the database.
 * Reuses transformer logic from the consumet provider.
 */

import { prisma } from "@/lib/db";
import type { 
  ContentType as ContentTypeEnum,
  Status, 
  ContentRating,
  TagGroup,
  SyncStatus,
} from "@prisma/client";
import type { MangaListItem, ConsumetProviderName } from "@/types";
import { delay, batchArray } from "@/lib/db/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface WebcomicUpsertData {
  id: string;
  source: "CONSUMET";
  provider: ConsumetProviderName;
  providerSeriesId: string;
  contentType: ContentTypeEnum;
  title: string;
  altTitles: string[];
  description: string | null;
  status: Status;
  year: number | null;
  contentRating: ContentRating;
  originalLanguage: string;
  lastChapter: string | null;
  totalChapters: number | null;
  coverImage: string | null;
  rating: number | null;
  tagIds: string[];
}

export interface WebcomicSyncProgress {
  status: SyncStatus;
  totalIndexed: number;
  currentProvider: string;
  currentQuery: string;
  lastError?: string;
}

export interface TagUpsertData {
  id: string;
  name: string;
  group: TagGroup;
}

// =============================================================================
// MAPPING FUNCTIONS
// =============================================================================

/**
 * Map normalized status to Prisma Status enum.
 */
function mapStatus(status: string): Status {
  const statusMap: Record<string, Status> = {
    ongoing: "ONGOING",
    completed: "COMPLETED",
    hiatus: "HIATUS",
    cancelled: "CANCELLED",
    unknown: "UNKNOWN",
  };
  return statusMap[status.toLowerCase()] ?? "UNKNOWN";
}

/**
 * Map normalized content rating to Prisma ContentRating enum.
 */
function mapContentRating(rating: string): ContentRating {
  const ratingMap: Record<string, ContentRating> = {
    safe: "SAFE",
    suggestive: "SUGGESTIVE",
    erotica: "EROTICA",
    pornographic: "PORNOGRAPHIC",
  };
  return ratingMap[rating.toLowerCase()] ?? "SAFE";
}

/**
 * Map normalized content type to Prisma ContentType enum.
 */
function mapContentType(type: string): ContentTypeEnum {
  const typeMap: Record<string, ContentTypeEnum> = {
    manga: "MANGA",
    manhwa: "MANHWA",
    manhua: "MANHUA",
    webtoon: "WEBTOON",
  };
  return typeMap[type.toLowerCase()] ?? "MANHWA";
}

/**
 * Map tag group string to Prisma TagGroup enum.
 */
function mapTagGroup(group: string): TagGroup {
  const groupMap: Record<string, TagGroup> = {
    genre: "GENRE",
    theme: "THEME",
    format: "FORMAT",
    content: "CONTENT",
  };
  return groupMap[group.toLowerCase()] ?? "GENRE";
}

/**
 * Generate a unique ID for Consumet content.
 * Format: consumet-{provider}-{providerSeriesId}
 */
function generateConsumetId(provider: string, providerSeriesId: string): string {
  // URL encode the providerSeriesId to handle special characters
  const encodedId = encodeURIComponent(providerSeriesId).replace(/%/g, "_");
  return `consumet-${provider}-${encodedId}`;
}

// =============================================================================
// TRANSFORMER FUNCTIONS
// =============================================================================

/**
 * Transform MangaListItem from Consumet to database format.
 */
export function transformToWebcomicData(
  item: MangaListItem,
  provider: ConsumetProviderName
): { webcomicData: WebcomicUpsertData; tags: TagUpsertData[] } {
  const providerSeriesId = item.id;
  
  // Extract and transform tags
  const tags: TagUpsertData[] = (item.genres || []).map((genre) => ({
    id: genre.id,
    name: genre.name,
    group: mapTagGroup(genre.group),
  }));

  const webcomicData: WebcomicUpsertData = {
    id: generateConsumetId(provider, providerSeriesId),
    source: "CONSUMET",
    provider,
    providerSeriesId,
    contentType: mapContentType(item.contentType),
    title: item.title,
    altTitles: item.altTitles || [],
    description: item.description || null,
    status: mapStatus(item.status),
    year: item.year,
    contentRating: mapContentRating(item.contentRating),
    originalLanguage: item.language,
    lastChapter: item.lastChapter,
    totalChapters: item.totalChapters,
    coverImage: item.image || null,
    rating: null, // Consumet doesn't provide ratings in list items
    tagIds: tags.map((t) => t.id),
  };

  return { webcomicData, tags };
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Upsert a batch of webcomics into the database.
 * Returns the number of successfully upserted items.
 */
export async function upsertWebcomicBatch(
  items: MangaListItem[],
  provider: ConsumetProviderName
): Promise<number> {
  if (items.length === 0) return 0;

  const allTags = new Map<string, TagUpsertData>();
  const webcomicDataList: WebcomicUpsertData[] = [];

  // Transform all items and collect unique tags
  for (const item of items) {
    const { webcomicData, tags } = transformToWebcomicData(item, provider);
    webcomicDataList.push(webcomicData);
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

  // Upsert webcomics in smaller batches to avoid transaction timeout
  const webcomicBatches = batchArray(webcomicDataList, 50);
  let totalUpserted = 0;

  for (const batch of webcomicBatches) {
    try {
      await prisma.$transaction(async (tx) => {
        for (const webcomicData of batch) {
          const { tagIds, ...data } = webcomicData;

          // Upsert the webcomic
          await tx.manga.upsert({
            where: { id: webcomicData.id },
            create: {
              ...data,
              sourceUpdatedAt: new Date(),
            },
            update: {
              ...data,
              sourceUpdatedAt: new Date(),
            },
          });

          // Delete existing tag relations and recreate
          await tx.mangaTag.deleteMany({
            where: { mangaId: webcomicData.id },
          });

          if (tagIds.length > 0) {
            await tx.mangaTag.createMany({
              data: tagIds.map((tagId) => ({
                mangaId: webcomicData.id,
                tagId,
              })),
              skipDuplicates: true,
            });
          }
        }
      });
      totalUpserted += batch.length;
    } catch (error) {
      console.error(`[WebcomicSync] Batch upsert failed:`, error);
      // Continue with next batch
    }
  }

  return totalUpserted;
}

// =============================================================================
// SYNC METADATA MANAGEMENT
// =============================================================================

/**
 * Gets or creates the webcomic sync metadata singleton.
 */
export async function getWebcomicSyncMetadata() {
  return prisma.webcomicSyncMetadata.upsert({
    where: { id: "webcomic-singleton" },
    create: { id: "webcomic-singleton", updatedAt: new Date() },
    update: {},
  });
}

/**
 * Updates webcomic sync metadata.
 */
export async function updateWebcomicSyncMetadata(
  data: Partial<{
    lastFullSync: Date;
    lastProvider: string;
    lastQuery: string;
    totalIndexed: number;
    syncStatus: SyncStatus;
    lastError: string | null;
  }>
) {
  return prisma.webcomicSyncMetadata.update({
    where: { id: "webcomic-singleton" },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Gets the current webcomic sync status.
 */
export async function getWebcomicSyncStatus(): Promise<WebcomicSyncProgress & {
  lastFullSync: Date | null;
  totalInDatabase: number;
}> {
  const metadata = await getWebcomicSyncMetadata();
  
  // Count Consumet entries in the database
  const totalInDatabase = await prisma.manga.count({
    where: { source: "CONSUMET" },
  });

  return {
    status: metadata.syncStatus,
    totalIndexed: metadata.totalIndexed,
    currentProvider: metadata.lastProvider || "",
    currentQuery: metadata.lastQuery || "",
    lastError: metadata.lastError ?? undefined,
    lastFullSync: metadata.lastFullSync,
    totalInDatabase,
  };
}

/**
 * Mark sync as started.
 */
export async function startWebcomicSync() {
  return updateWebcomicSyncMetadata({
    syncStatus: "SYNCING",
    lastError: null,
  });
}

/**
 * Mark sync as completed.
 */
export async function completeWebcomicSync(totalIndexed: number) {
  return updateWebcomicSyncMetadata({
    syncStatus: "IDLE",
    lastFullSync: new Date(),
    totalIndexed,
  });
}

/**
 * Mark sync as failed.
 */
export async function failWebcomicSync(error: string) {
  return updateWebcomicSyncMetadata({
    syncStatus: "ERROR",
    lastError: error,
  });
}

/**
 * Update resume point during sync.
 */
export async function updateSyncResumePoint(
  provider: string,
  query: string,
  totalIndexed: number
) {
  return updateWebcomicSyncMetadata({
    lastProvider: provider,
    lastQuery: query,
    totalIndexed,
  });
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { delay, batchArray };

