import type {
  Status,
  ContentRating,
  Demographic,
  TagGroup,
} from "@prisma/client";

/**
 * Maps MangaDex status string to Prisma Status enum
 */
export function mapStatus(status: string): Status {
  const statusMap: Record<string, Status> = {
    ongoing: "ONGOING",
    completed: "COMPLETED",
    hiatus: "HIATUS",
    cancelled: "CANCELLED",
  };
  return statusMap[status.toLowerCase()] ?? "UNKNOWN";
}

/**
 * Maps MangaDex content rating to Prisma ContentRating enum
 */
export function mapContentRating(rating: string): ContentRating {
  const ratingMap: Record<string, ContentRating> = {
    safe: "SAFE",
    suggestive: "SUGGESTIVE",
    erotica: "EROTICA",
    pornographic: "PORNOGRAPHIC",
  };
  return ratingMap[rating.toLowerCase()] ?? "SAFE";
}

/**
 * Maps MangaDex demographic to Prisma Demographic enum
 */
export function mapDemographic(demographic: string | null): Demographic | null {
  if (!demographic) return null;

  const demoMap: Record<string, Demographic> = {
    shounen: "SHOUNEN",
    shoujo: "SHOUJO",
    seinen: "SEINEN",
    josei: "JOSEI",
  };
  return demoMap[demographic.toLowerCase()] ?? null;
}

/**
 * Maps MangaDex tag group to Prisma TagGroup enum
 */
export function mapTagGroup(group: string): TagGroup {
  const groupMap: Record<string, TagGroup> = {
    genre: "GENRE",
    theme: "THEME",
    format: "FORMAT",
    content: "CONTENT",
  };
  return groupMap[group.toLowerCase()] ?? "THEME";
}

/**
 * Gets preferred text from a multilingual object (en > ja > first available)
 */
export function getPreferredText(
  obj: Record<string, string | undefined>,
  fallback = ""
): string {
  return obj.en || obj.ja || Object.values(obj).find(Boolean) || fallback;
}

/**
 * Extracts all alt titles from MangaDex format
 */
export function extractAltTitles(
  altTitles: Array<Record<string, string>>
): string[] {
  return altTitles
    .flatMap((alt) => Object.values(alt))
    .filter((title): title is string => !!title);
}

/**
 * Estimates total chapters from lastChapter if available
 */
export function estimateTotalChapters(lastChapter: string | null): number | null {
  if (!lastChapter) return null;

  const parsed = parseFloat(lastChapter);
  if (!isNaN(parsed) && parsed > 0 && Number.isInteger(parsed)) {
    return Math.floor(parsed);
  }
  return null;
}

/**
 * Finds a relationship by type from MangaDex relationships array
 */
export function findRelationship(
  relationships: Array<{ id: string; type: string }>,
  type: string
): string | null {
  const rel = relationships.find((r) => r.type === type);
  return rel?.id ?? null;
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch array into chunks
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}


