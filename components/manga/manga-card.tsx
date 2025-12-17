"use client";

import { memo, useMemo, useCallback, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
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
import { getManga } from "@/lib/api/manga";

export interface MangaCardProps {
  manga: MangaListItem;
  index?: number;
  className?: string;
  onCardClick?: (mangaId: string) => void;
}

const MangaCardComponent = function MangaCard({
  manga,
  index,
  className,
  onCardClick,
}: MangaCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const queryClient = useQueryClient();
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPrefetchedRef = useRef(false);

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

  const handleImageError = useCallback(() => setImageError(true), []);
  const handleImageLoad = useCallback(() => setImageLoaded(true), []);
  const handleCardClick = useCallback(
    () => onCardClick?.(manga.id),
    [manga.id, onCardClick]
  );
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick]
  );

  // Prefetch manga details on hover (with debounce)
  const handleMouseEnter = useCallback(() => {
    if (hasPrefetchedRef.current) return;
    
    // Debounce prefetch to avoid unnecessary requests on quick hovers
    prefetchTimeoutRef.current = setTimeout(() => {
      hasPrefetchedRef.current = true;
      queryClient.prefetchQuery({
        queryKey: ["manga", manga.id],
        queryFn: () => getManga(manga.id),
        staleTime: 10 * 60 * 1000, // 10 minutes
      });
    }, 150); // 150ms debounce
  }, [manga.id, queryClient]);

  const handleMouseLeave = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  }, []);

  return (
    <article
      className={cn("h-full", className)}
      itemScope
      itemType="https://schema.org/Book"
    >
      <Link
        href={mangaUrl}
        prefetch={true}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl active:scale-[0.98] transition-transform"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        aria-label={`View ${manga.title} manga details`}
        aria-describedby={`manga-${manga.id}-description`}
        itemProp="url"
      >
        <div className="group relative h-full overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-2">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-2xl bg-gradient-to-br from-muted via-muted/50 to-muted">
            <Image
              src={imageUrl}
              alt={`${manga.title} cover image`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 15vw"
              className={cn(
                "object-cover transition-all duration-700 group-hover:scale-110",
                !imageLoaded && "opacity-0",
                imageLoaded && "opacity-100"
              )}
              loading={loadingStrategy}
              onError={handleImageError}
              onLoadingComplete={handleImageLoad}
              itemProp="image"
              unoptimized
            />

            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-muted" />
            )}

            <div
              className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-t-xl"
              aria-hidden="true"
            />

            <div className="absolute top-2.5 right-2.5 z-10" aria-hidden="true">
              <Badge
                className={cn(
                  "border-0 text-[10px] font-semibold text-white backdrop-blur-md shadow-lg px-2 py-0.5 sm:text-xs sm:px-2.5",
                  statusColor
                )}
                aria-label={`Status: ${statusLabel}`}
              >
                {statusLabel}
              </Badge>
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 sm:p-4 transition-transform duration-300 group-hover:translate-y-0"
              aria-hidden="true"
            >
              {manga.description ? (
                <p className="line-clamp-4 text-xs leading-relaxed text-white/95 drop-shadow-lg sm:text-sm sm:leading-relaxed">
                  {manga.description}
                </p>
              ) : (
                <p className="text-xs text-white/80 italic sm:text-sm">
                  No description available
                </p>
              )}
            </div>
          </div>

          <div className="relative bg-card p-3.5 sm:p-4 rounded-b-2xl">
            <h3
              className="line-clamp-2 text-xs font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-sm mb-1.5"
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
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
              <BookOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate" aria-label="Chapters">
                {manga.totalChapters !== null &&
                manga.totalChapters !== undefined
                  ? `${manga.totalChapters} ${
                      manga.totalChapters === 1 ? "chapter" : "chapters"
                    }`
                  : manga.lastChapter
                    ? formatChapter(manga.lastChapter)
                    : "-"}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};

export const MangaCard = memo(MangaCardComponent);
MangaCard.displayName = "MangaCard";
