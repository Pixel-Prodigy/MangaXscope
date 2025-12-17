"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Chapter {
  id: string;
  chapter: string | null;
  volume: string | null;
  title: string | null;
  language: string;
  pages: number;
  publishedAt: string;
  externalUrl: string | null;
}

interface ChapterListResponse {
  chapters: Chapter[];
  total: number;
  totalExternal: number;
}

interface ChapterListProps {
  mangaId: string;
  className?: string;
}

async function fetchChapters(mangaId: string): Promise<ChapterListResponse> {
  // MangaDex API max limit is 100, so we need to paginate for more chapters
  const allChapters: Chapter[] = [];
  let offset = 0;
  const limit = 100;
  let total = 0;
  let totalExternalChapters = 0;

  // Fetch first batch
  const firstResponse = await fetch(`/api/reader/${mangaId}/chapters?limit=${limit}&offset=0`);
  if (!firstResponse.ok) {
    throw new Error("Failed to fetch chapters");
  }
  const firstData = await firstResponse.json();
  allChapters.push(...firstData.chapters);
  total = firstData.total;
  totalExternalChapters += firstData.totalExternal || 0;

  // Fetch remaining batches if needed (up to 500 total chapters)
  const maxChapters = 500;
  while (allChapters.length < total && allChapters.length < maxChapters) {
    offset += limit;
    const response = await fetch(`/api/reader/${mangaId}/chapters?limit=${limit}&offset=${offset}`);
    if (!response.ok) break;
    const data = await response.json();
    if (data.chapters.length === 0) break;
    allChapters.push(...data.chapters);
    totalExternalChapters += data.totalExternal || 0;
  }

  return {
    chapters: allChapters,
    total: allChapters.length, // Return actual readable count
    totalExternal: totalExternalChapters,
  };
}

export function ChapterList({ mangaId, className }: ChapterListProps) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["chapters", mangaId],
    queryFn: () => fetchChapters(mangaId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className={`rounded-2xl border-border/60 shadow-sm ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <BookOpen className="h-5 w-5" />
            Chapters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={`rounded-2xl border-border/60 shadow-sm ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <BookOpen className="h-5 w-5" />
            Chapters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-3">
              Could not load chapters
            </p>
            <a
              href={`https://mangadex.org/title/${mangaId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View on MangaDex
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.chapters.length === 0) {
    const hasExternalChapters = data.totalExternal > 0;
    
    return (
      <Card className={`rounded-2xl border-border/60 shadow-sm ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <BookOpen className="h-5 w-5" />
            Chapters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-3">
              {hasExternalChapters 
                ? `${data.totalExternal} chapter${data.totalExternal === 1 ? '' : 's'} available on external sites only (official publishers)`
                : "No chapters available in English"}
            </p>
            <a
              href={`https://mangadex.org/title/${mangaId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {hasExternalChapters 
                  ? "Read on MangaDex" 
                  : "Check MangaDex for other languages"}
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show first 10 chapters by default, all when expanded
  const displayedChapters = expanded 
    ? data.chapters 
    : data.chapters.slice(0, 10);

  // Get first chapter for "Start Reading" button
  const firstChapter = data.chapters[0];
  const hasExternalChapters = data.totalExternal > 0;

  return (
    <Card className={`rounded-2xl border-border/60 shadow-sm ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <BookOpen className="h-5 w-5" />
              Chapters
              <span className="text-sm font-normal text-muted-foreground">
                ({data.total})
              </span>
            </CardTitle>
            {hasExternalChapters && (
              <p className="text-xs text-muted-foreground mt-1">
                +{data.totalExternal} on external sites • {" "}
                <a
                  href={`https://mangadex.org/title/${mangaId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  View on MangaDex
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            )}
          </div>
          {firstChapter && (
            <Link href={`/read/${mangaId}/${firstChapter.id}`}>
              <Button size="sm" className="gap-2 rounded-xl">
                Start Reading
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={expanded ? "h-[400px]" : ""}>
          <div className="space-y-1">
            {displayedChapters.map((chapter, index) => (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <Link href={`/read/${mangaId}/${chapter.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {chapter.chapter 
                          ? `Chapter ${chapter.chapter}` 
                          : chapter.title || "Oneshot"}
                        {chapter.title && chapter.chapter && (
                          <span className="text-muted-foreground font-normal">
                            {" "}- {chapter.title}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {chapter.pages} pages • {formatDistanceToNow(new Date(chapter.publishedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        {data.chapters.length > 10 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 gap-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show All {data.chapters.length} Chapters
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

