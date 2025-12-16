"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import type { MangaListItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface MangaCardProps {
  manga: MangaListItem;
  index?: number;
}

export function MangaCard({ manga }: MangaCardProps) {
  // Format status
  const statusLabel =
    manga.status.charAt(0).toUpperCase() + manga.status.slice(1);

  // Determine status color
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "ongoing") return "bg-green-500/90";
    if (statusLower === "completed") return "bg-blue-500/90";
    if (statusLower === "hiatus") return "bg-yellow-500/90";
    if (statusLower === "cancelled") return "bg-red-500/90";
    return "bg-primary/90";
  };

  return (
    <Link href={`/manga/${manga.id}`} className="block h-full">
      <div className="group relative h-full overflow-hidden rounded-xl bg-card shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10">
        {/* Image Container */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-muted via-muted/50 to-muted">
          <img
            src={
              manga.image ||
              "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover"
            }
            alt={manga.title}
            className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src =
                "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover";
            }}
          />

          {/* Gradient Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Status Badge */}
          <div className="absolute top-2 right-2 z-10">
            <Badge
              className={cn(
                "border-0 text-[10px] font-semibold text-white backdrop-blur-md shadow-lg sm:text-xs",
                getStatusColor(manga.status)
              )}
            >
              {statusLabel}
            </Badge>
          </div>

          {/* Hover Overlay Info */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-black/95 via-black/85 to-transparent p-3 transition-transform duration-300 group-hover:translate-y-0">
            <h3 className="line-clamp-2 text-sm font-bold text-white drop-shadow-lg sm:text-base">
              {manga.title}
            </h3>
            {manga.lastChapter && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-white/90">
                <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Chapter {manga.lastChapter}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Content */}
        <div className="relative bg-card p-3 sm:p-4">
          <h3 className="line-clamp-2 text-xs font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-sm">
            {manga.title}
          </h3>
          {manga.lastChapter && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
              <BookOpen className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">Ch. {manga.lastChapter}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
