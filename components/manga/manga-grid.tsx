"use client";

import { memo } from "react";
import Image from "next/image";
import { MangaCard } from "./manga-card";
import type { MangaListItem } from "@/lib/api/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface MangaGridProps {
  /** Array of manga items to display */
  mangas: MangaListItem[];
  /** Whether the grid is in a loading state */
  isLoading?: boolean;
  /** Optional custom className for the grid container */
  className?: string;
  /** Number of skeleton items to show when loading (default: 18) */
  skeletonCount?: number;
  /** Optional callback when a card is clicked */
  onCardClick?: (mangaId: string) => void;
  /** Custom empty state message */
  emptyMessage?: {
    title?: string;
    description?: string;
  };
}

const DEFAULT_EMPTY_MESSAGE = {
  title: "No mangas found",
  description: "Try adjusting your filters or search query",
} as const;

const MangaSkeletonComponent = function MangaSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading manga card">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-muted via-muted/50 to-muted">
        <Skeleton className="h-full w-full rounded-2xl" />
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-transparent via-white/5 to-transparent"
          aria-hidden="true"
        />
      </div>
      <div className="space-y-2 px-1">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-3 w-2/3 rounded-md" />
      </div>
    </div>
  );
};

const MangaSkeleton = memo(MangaSkeletonComponent);
MangaSkeleton.displayName = "MangaSkeleton";

const EmptyStateComponent = function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-6 sm:min-h-[400px] sm:p-12"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <p className="text-lg font-semibold text-muted-foreground sm:text-xl">
          {title}
        </p>
        <p className="mt-2 text-sm text-muted-foreground/80">{description}</p>
      </div>
    </div>
  );
};

const EmptyState = memo(EmptyStateComponent);
EmptyState.displayName = "EmptyState";

const MangaGridComponent = function MangaGrid({
  mangas,
  isLoading = false,
  className,
  onCardClick,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  skeletonCount = 18,
}: MangaGridProps) {
  if (isLoading) {
    // Show skeleton grid for faster perceived performance
    return (
      <section
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
          className
        )}
        role="status"
        aria-label="Loading mangas"
        aria-live="polite"
      >
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <MangaSkeleton key={index} />
        ))}
      </section>
    );
  }

  if (mangas.length === 0) {
    return (
      <EmptyState
        title={emptyMessage.title ?? DEFAULT_EMPTY_MESSAGE.title}
        description={
          emptyMessage.description ?? DEFAULT_EMPTY_MESSAGE.description
        }
      />
    );
  }

  return (
    <section
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
        className
      )}
      aria-label="Manga collection"
      itemScope
      itemType="https://schema.org/ItemList"
    >
      {mangas.map((manga, index) => (
        <MangaCard
          key={manga.id}
          manga={manga}
          index={index}
          onCardClick={onCardClick}
        />
      ))}
    </section>
  );
};

export const MangaGrid = memo(MangaGridComponent);
MangaGrid.displayName = "MangaGrid";
