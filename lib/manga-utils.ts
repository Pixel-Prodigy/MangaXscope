import type { MangaListItem } from "@/lib/api/types";

/**
 * Status color mapping for manga status badges
 */
export const STATUS_COLORS = {
  ongoing: "bg-green-500/90",
  completed: "bg-blue-500/90",
  hiatus: "bg-yellow-500/90",
  cancelled: "bg-red-500/90",
} as const;

/**
 * Default placeholder image URL
 */
export const PLACEHOLDER_IMAGE =
  "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover";

/**
 * Formats manga status to display label
 * @param status - The manga status string
 * @returns Formatted status label with first letter capitalized
 */
export function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Gets the appropriate status badge color class based on manga status
 * @param status - The manga status string
 * @returns Tailwind CSS class for the status badge color
 */
export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase() as keyof typeof STATUS_COLORS;
  return STATUS_COLORS[statusLower] ?? "bg-primary/90";
}

/**
 * Generates the URL path for a manga detail page
 * @param mangaId - The manga ID
 * @returns The URL path for the manga detail page
 */
export function getMangaUrl(mangaId: string): string {
  return `/manga/${mangaId}`;
}

/**
 * Gets the image URL for a manga, with fallback to placeholder
 * @param imageUrl - The manga image URL (may be undefined)
 * @param usePlaceholder - Whether to use placeholder if image is missing
 * @returns The image URL to use
 */
export function getMangaImageUrl(
  imageUrl: string | undefined | null,
  usePlaceholder = true
): string {
  if (imageUrl) return imageUrl;
  return usePlaceholder ? PLACEHOLDER_IMAGE : "";
}

/**
 * Formats chapter number for display
 * @param chapter - The chapter number or string
 * @returns Formatted chapter string
 */
export function formatChapter(chapter: string | null | undefined): string {
  if (!chapter) return "";
  return `Ch. ${chapter}`;
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Validates if a manga object has required fields
 * @param manga - The manga object to validate
 * @returns True if manga is valid, false otherwise
 */
export function isValidManga(manga: unknown): manga is MangaListItem {
  if (!manga || typeof manga !== "object") return false;
  const m = manga as Partial<MangaListItem>;
  return (
    typeof m.id === "string" &&
    m.id.length > 0 &&
    typeof m.title === "string" &&
    m.title.length > 0
  );
}

/**
 * Gets the appropriate loading strategy for images based on position
 * @param index - The index of the item in the list
 * @param threshold - Number of items to load eagerly (default: 6)
 * @returns "eager" for above-the-fold items, "lazy" for others
 */
export function getImageLoadingStrategy(
  index: number | undefined,
  threshold = 6
): "eager" | "lazy" {
  if (index === undefined) return "lazy";
  return index < threshold ? "eager" : "lazy";
}
