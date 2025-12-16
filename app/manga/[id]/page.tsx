"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { getManga } from "@/lib/api/manga";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  User,
  Calendar,
  ArrowLeft,
  Play,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { isAndroid } from "@/lib/utils";

export default function MangaDetailPage() {
  const params = useParams();
  const mangaId = params.id as string;
  const [isAndroidDevice, setIsAndroidDevice] = React.useState(false);

  const {
    data: manga,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["manga", mangaId],
    queryFn: () => getManga(mangaId),
    enabled: !!mangaId,
  });

  React.useEffect(() => {
    setIsAndroidDevice(isAndroid());
  }, []);

  const handleOpenInAniyomi = () => {
    if (manga?.id) {
      window.open(`https://mangadex.org/title/${manga.id}`, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-background/80 backdrop-blur-xl">
        <img src="/loading.gif" alt="Loading" className="w-56" />
      </div>
    );
  }

  if (error || !manga) {
    return (
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
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto min-h-screen px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 grid gap-6 md:grid-cols-[300px_1fr]"
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border-2 shadow-lg">
            {/* Use regular img tag for MangaDex images to avoid Next.js optimization issues */}
            <img
              src={
                manga.imageUrl ||
                "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover"
              }
              alt={manga.name}
              className="h-full w-full object-cover"
              loading="eager"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  "https://placeholder.pics/svg/300x400/CCCCCC/FFFFFF/No%20Cover";
              }}
            />
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">
                {manga.name}
              </h1>
              {manga.altTitles && manga.altTitles.length > 0 && (
                <p className="mb-3 text-sm text-muted-foreground">
                  {manga.altTitles.slice(0, 2).join(" • ")}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
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

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Author:</span>
                <span className="font-medium">{manga.author || "Unknown"}</span>
              </div>
              {manga.artist && manga.artist !== manga.author && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Artist:</span>
                  <span className="font-medium">{manga.artist}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium">{manga.status}</span>
              </div>
              {manga.year && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Year:</span>
                  <span className="font-medium">{manga.year}</span>
                </div>
              )}
              {manga.publicationDemographic && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Demographic:</span>
                  <span className="font-medium capitalize">
                    {manga.publicationDemographic}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Content Rating:</span>
                <Badge
                  variant={
                    manga.contentRating === "safe" ? "secondary" : "destructive"
                  }
                >
                  {manga.contentRating}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span className="font-medium">{manga.updated}</span>
              </div>
            </div>

            <Separator />

            {manga.description && (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Description</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {manga.description}
                </p>
              </div>
            )}

            {manga.lastChapter && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  className="w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  disabled
                >
                  <Play className="mr-2 h-4 w-4" />
                  Read Manga
                </Button>
                <p className="text-xs text-muted-foreground self-center sm:self-end">
                  Chapter support coming soon
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
                onClick={handleOpenInAniyomi}
                title="Requires Aniyomi + MangaDex extension installed"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Read this
              </Button>
              <p className="text-xs text-muted-foreground">
                {isAndroidDevice
                  ? "Requires Aniyomi + MangaDex extension installed"
                  : "Opens MangaDex website (Aniyomi app required on Android)"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tags Section */}
        {manga.tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Tags & Genres
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {manga.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={tag.group === "genre" ? "default" : "outline"}
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
