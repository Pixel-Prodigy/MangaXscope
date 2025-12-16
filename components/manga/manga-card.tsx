"use client";

import { memo, useMemo, useCallback, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import type { MangaListItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  formatStatus,
  getStatusColor,
  getMangaUrl,
  getMangaImageUrl,
  formatChapter,
  getImageLoadingStrategy,
  PLACEHOLDER_IMAGE,
} from "@/lib/manga-utils";

export interface MangaCardProps {
  /** Manga data to display */
  manga: MangaListItem;
  /** Optional index for list rendering optimization */
  index?: number;
  /** Optional custom className for the card container */
  className?: string;
  /** Optional callback when card is clicked */
  onCardClick?: (mangaId: string) => void;
}

/**
 * MangaCard - A reusable, optimized card component for displaying manga items
 *
 * Features:
 * - Memoized for performance optimization
 * - Fully accessible with ARIA labels
 * - Image error handling with fallback
 * - Responsive design
 * - Smooth animations and hover effects
 * - SEO-friendly with proper semantic HTML
 *
 * @example
 * ```tsx
 * <MangaCard manga={mangaData} index={0} />
 * ```
 */
const MangaCardComponent = function MangaCard({
  manga,
  index,
  className,
  onCardClick,
}: MangaCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Memoize computed values
  const statusLabel = useMemo(() => formatStatus(manga.status), [manga.status]);
  const statusColor = useMemo(
    () => getStatusColor(manga.status),
    [manga.status]
  );
  const imageUrl = useMemo(
    () =>
      imageError ? PLACEHOLDER_IMAGE : getMangaImageUrl(manga.image, true),
    [manga.image, imageError]
  );
  const mangaUrl = useMemo(() => getMangaUrl(manga.id), [manga.id]);
  const loadingStrategy = useMemo(
    () => getImageLoadingStrategy(index),
    [index]
  );

  // Event handlers
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleCardClick = useCallback(() => {
    onCardClick?.(manga.id);
  }, [manga.id, onCardClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick]
  );

  return (
    <article
      className={cn("h-full", className)}
      itemScope
      itemType="https://schema.org/Book"
    >
      <Link
        href={mangaUrl}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        aria-label={`View ${manga.title} manga details`}
        aria-describedby={`manga-${manga.id}-description`}
        itemProp="url"
      >
        <div className="group relative h-full overflow-hidden rounded-xl bg-card shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10 focus-within:ring-2 focus-within:ring-primary">
          {/* Image Container */}
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-muted via-muted/50 to-muted">
            <img
              src={imageUrl}
              alt={`${manga.title} cover image`}
              className={cn(
                "h-full w-full object-cover transition-all duration-700 group-hover:scale-110",
                !imageLoaded && "opacity-0",
                imageLoaded && "opacity-100"
              )}
              loading={loadingStrategy}
              decoding="async"
              width={300}
              height={400}
              onError={handleImageError}
              onLoad={handleImageLoad}
              itemProp="image"
            />

            {/* Loading placeholder */}
            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-muted" />
            )}

            {/* Gradient Overlay on Hover */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden="true"
            />

            {/* Status Badge */}
            <div className="absolute top-2 right-2 z-10" aria-hidden="true">
              <Badge
                className={cn(
                  "border-0 text-[10px] font-semibold text-white backdrop-blur-md shadow-lg sm:text-xs",
                  statusColor
                )}
                aria-label={`Status: ${statusLabel}`}
              >
                {statusLabel}
              </Badge>
            </div>

            {/* Hover Overlay Info */}
            <div
              className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-black/95 via-black/85 to-transparent p-3 transition-transform duration-300 group-hover:translate-y-0"
              aria-hidden="true"
            >
              <h3 className="line-clamp-2 text-sm font-bold text-white drop-shadow-lg sm:text-base">
                {manga.title}
              </h3>
              {manga.lastChapter && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-white/90">
                  <BookOpen
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>Chapter {manga.lastChapter}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="relative bg-card p-3 sm:p-4">
            <h3
              className="line-clamp-2 text-xs font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-sm"
              itemProp="name"
            >
              {manga.title}
            </h3>
            <div
              id={`manga-${manga.id}-description`}
              className="sr-only"
              itemProp="description"
            >
              {manga.description || `Manga titled ${manga.title}`}
            </div>
            {manga.lastChapter && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
                <BookOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span
                  className="truncate"
                  aria-label={`Last chapter: ${manga.lastChapter}`}
                >
                  {formatChapter(manga.lastChapter)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
};

export const MangaCard = memo(MangaCardComponent);
MangaCard.displayName = "MangaCard";
