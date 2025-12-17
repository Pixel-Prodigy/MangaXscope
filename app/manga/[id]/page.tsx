"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { getManga } from "@/lib/api/manga";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  User,
  Calendar,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { OpenInAniyomiButton } from "@/components/manga/open-in-aniyomi-button";
import { ChapterList } from "@/components/manga/chapter-list";

const PLACEHOLDER_IMAGE =
  "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover";

export default function MangaDetailPage() {
  const params = useParams();
  const mangaId = params.id as string;

  const {
    data: manga,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["manga", mangaId],
    queryFn: () => getManga(mangaId),
    enabled: !!mangaId,
  });

  // Reset scroll position when navigating to this page
  useEffect(() => {
    // Reset scroll immediately
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Use requestAnimationFrame to ensure DOM is ready and prevent any scroll jumps
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });

      // Double-check after a short delay to catch any late scroll events
      const timeoutId = setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [mangaId]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen w-full items-center justify-center bg-background/80 backdrop-blur-xl">
          <img src="/loading.gif" alt="Loading" className="w-56" />
        </div>
      </>
    );
  }

  if (error || !manga) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto min-h-screen px-4 py-8">
          <div className="rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
            <p className="mb-2 text-lg font-semibold text-destructive">
              Error loading manga
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Manga not found"}
            </p>
            <Link href="/">
              <Button variant="outline">Go Back Home</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const imageUrl = manga.imageUrl || PLACEHOLDER_IMAGE;

  return (
    <>
      <Navbar />
      <div className="container mx-auto min-h-screen px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6 min-h-[44px] px-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-8 grid gap-6 sm:gap-8 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]"
        >
          <div className="relative aspect-3/4 w-full max-w-[320px] mx-auto md:mx-0 overflow-hidden rounded-2xl border-2 border-border/60 shadow-xl">
            <img
              src={imageUrl}
              alt={manga.name}
              className="h-full w-full object-cover"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
              }}
            />
          </div>

          <div className="space-y-5 sm:space-y-6">
            <div>
              <h1 className="mb-2.5 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl leading-tight">
                {manga.name}
              </h1>
              {manga.altTitles && manga.altTitles.length > 0 && (
                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                  {manga.altTitles.slice(0, 2).join(" • ")}
                </p>
              )}
              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                {manga.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
                {manga.tags
                  .filter((tag) => tag.group === "theme")
                  .slice(0, 3)
                  .map((tag) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.name}
                    </Badge>
                  ))}
              </div>
            </div>

            <Separator className="my-5 sm:my-6" />

            <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Author:</span>
                <span className="font-medium truncate">
                  {manga.author || "Unknown"}
                </span>
              </div>
              {manga.artist && manga.artist !== manga.author && (
                <div className="flex items-center gap-2.5 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">
                    Artist:
                  </span>
                  <span className="font-medium truncate">{manga.artist}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Status:</span>
                <span className="font-medium truncate">{manga.status}</span>
              </div>
              {manga.year && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">Year:</span>
                  <span className="font-medium">{manga.year}</span>
                </div>
              )}
              {manga.publicationDemographic && (
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-muted-foreground shrink-0">
                    Demographic:
                  </span>
                  <span className="font-medium capitalize truncate">
                    {manga.publicationDemographic}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm">
                <span className="text-muted-foreground shrink-0">
                  Content Rating:
                </span>
                <Badge
                  variant={
                    manga.contentRating === "safe" ? "secondary" : "destructive"
                  }
                  className="shrink-0"
                >
                  {manga.contentRating}
                </Badge>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Updated:</span>
                <span className="font-medium truncate">{manga.updated}</span>
              </div>
            </div>

            <Separator className="my-5 sm:my-6" />

            {manga.description && (
              <div>
                <h2 className="mb-3 text-lg font-semibold sm:text-xl">
                  Description
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed">
                  {manga.description}
                </p>
              </div>
            )}

            <OpenInAniyomiButton
              mangaId={manga.id}
              className="w-full sm:w-auto min-h-[44px] shadow-md hover:shadow-lg transition-all rounded-xl"
            />
          </div>
        </motion.div>

        {/* Chapter List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-8"
        >
          <ChapterList mangaId={manga.id} />
        </motion.div>

        {manga.tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="mt-6"
          >
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <BookOpen className="h-5 w-5" />
                  Tags & Genres
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  {manga.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={tag.group === "genre" ? "default" : "outline"}
                      className="px-2.5 py-1"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </>
  );
}
