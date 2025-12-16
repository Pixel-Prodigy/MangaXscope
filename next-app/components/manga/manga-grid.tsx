"use client";

import { MangaCard } from "./manga-card";
import type { MangaListItem } from "@/lib/api/types";
import { Skeleton } from "@/components/ui/skeleton";

interface MangaGridProps {
  mangas: MangaListItem[];
  isLoading?: boolean;
}

export function MangaGrid({ mangas, isLoading }: MangaGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <MangaSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (mangas.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-6 sm:min-h-[400px] sm:p-12">
        <div className="text-center">
          <p className="text-lg font-semibold text-muted-foreground sm:text-xl">
            No mangas found
          </p>
          <p className="mt-2 text-sm text-muted-foreground/80">
            Try adjusting your filters or search query
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {mangas.map((manga, index) => (
        <MangaCard key={manga.id} manga={manga} index={index} />
      ))}
    </div>
  );
}

function MangaSkeleton() {
  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-br from-muted via-muted/50 to-muted">
        <Skeleton className="h-full w-full rounded-xl" />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-transparent via-white/5 to-transparent" />
      </div>
      <div className="space-y-2 px-1">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}
