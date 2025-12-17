"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  ExternalLink,
  Loader2,
  ImageOff,
  X,
} from "lucide-react";

interface ChapterMetadata {
  chapter: string | null;
  volume: string | null;
  title: string | null;
  translatedLanguage: string;
  pages: number;
}

interface ChapterImages {
  baseUrl: string;
  hash: string;
  images: string[];
  dataSaverImages: string[];
  chapterId: string;
  mangaId: string;
  metadata: ChapterMetadata;
}

interface Chapter {
  id: string;
  chapter: string | null;
  volume: string | null;
  title: string | null;
  language: string;
  pages: number;
}

interface ChapterListResponse {
  chapters: Chapter[];
  total: number;
}

async function fetchChapterImages(
  mangaId: string,
  chapterId: string,
  dataSaver: boolean
): Promise<ChapterImages> {
  const response = await fetch(
    `/api/reader/${mangaId}/${chapterId}?dataSaver=${dataSaver}`
  );
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to fetch chapter images");
  }
  return response.json();
}

async function fetchChapterList(mangaId: string): Promise<ChapterListResponse> {
  const response = await fetch(`/api/reader/${mangaId}/chapters?limit=500`);
  if (!response.ok) {
    throw new Error("Failed to fetch chapter list");
  }
  return response.json();
}

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const mangaId = params.mangaId as string;
  const chapterId = params.chapterId as string;

  const [dataSaver, setDataSaver] = useState(true); // Default to data saver for mobile
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch chapter images
  const {
    data: chapterData,
    isLoading: isLoadingImages,
    error: imagesError,
  } = useQuery({
    queryKey: ["chapter-images", mangaId, chapterId, dataSaver],
    queryFn: () => fetchChapterImages(mangaId, chapterId, dataSaver),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch chapter list for navigation
  const { data: chapterList } = useQuery({
    queryKey: ["chapter-list", mangaId],
    queryFn: () => fetchChapterList(mangaId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Find current chapter index and neighbors
  const currentChapterIndex = chapterList?.chapters.findIndex(
    (ch) => ch.id === chapterId
  );
  const prevChapter =
    currentChapterIndex !== undefined && currentChapterIndex > 0
      ? chapterList?.chapters[currentChapterIndex - 1]
      : null;
  const nextChapter =
    currentChapterIndex !== undefined &&
    chapterList &&
    currentChapterIndex < chapterList.chapters.length - 1
      ? chapterList.chapters[currentChapterIndex + 1]
      : null;
  const currentChapter =
    currentChapterIndex !== undefined
      ? chapterList?.chapters[currentChapterIndex]
      : null;

  // Auto-hide controls after delay
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettings) {
        setShowControls(false);
      }
    }, 3000);
  }, [showSettings]);

  // Handle tap/click to toggle controls
  const handleTap = useCallback(() => {
    if (showControls) {
      setShowControls(false);
      setShowSettings(false);
    } else {
      resetControlsTimeout();
    }
  }, [showControls, resetControlsTimeout]);

  // Handle scroll to reset controls timeout
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      resetControlsTimeout();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [resetControlsTimeout]);

  // Initial controls timeout - set up auto-hide on mount
  useEffect(() => {
    // Set initial timeout without calling setShowControls (already true)
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettings) {
        setShowControls(false);
      }
    }, 3000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevChapter) {
        router.push(`/read/${mangaId}/${prevChapter.id}`);
      } else if (e.key === "ArrowRight" && nextChapter) {
        router.push(`/read/${mangaId}/${nextChapter.id}`);
      } else if (e.key === "Escape") {
        router.push(`/manga/${mangaId}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, mangaId, prevChapter, nextChapter]);

  if (isLoadingImages) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/70 text-sm">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (imagesError || !chapterData) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <ImageOff className="h-12 w-12 text-white/50" />
          <p className="text-white text-lg font-medium">
            Failed to load chapter
          </p>
          <p className="text-white/70 text-sm max-w-md">
            {imagesError instanceof Error
              ? imagesError.message
              : "This chapter may not be available"}
          </p>
          <div className="flex gap-3 mt-4">
            <Link href={`/manga/${mangaId}`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Manga
              </Button>
            </Link>
            <a
              href={`https://mangadex.org/chapter/${chapterId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Read on MangaDex
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Top Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent pb-8 pt-safe"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <Link href={`/manga/${mangaId}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>

              <div className="flex-1 text-center px-4">
                <p className="text-white font-medium truncate">
                  {chapterData?.metadata?.chapter
                    ? `Chapter ${chapterData.metadata.chapter}`
                    : currentChapter?.chapter
                    ? `Chapter ${currentChapter.chapter}`
                    : "Chapter"}
                  {(chapterData?.metadata?.title || currentChapter?.title) && (
                    <span className="text-white/70 font-normal">
                      {" · "}
                      {chapterData?.metadata?.title || currentChapter?.title}
                    </span>
                  )}
                </p>
                {(chapterData?.metadata?.volume || currentChapter?.volume) && (
                  <p className="text-white/60 text-xs">
                    Volume{" "}
                    {chapterData?.metadata?.volume || currentChapter?.volume}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(!showSettings);
                }}
              >
                {showSettings ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4 overflow-hidden"
                >
                  <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                    <label className="flex items-center justify-between text-white">
                      <span className="text-sm">Data Saver Mode</span>
                      <input
                        type="checkbox"
                        checked={dataSaver}
                        onChange={(e) => setDataSaver(e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                    <p className="text-white/60 text-xs mt-1">
                      Lower quality images for faster loading
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Container - Vertical Scroll */}
      <div
        ref={scrollContainerRef}
        className="min-h-screen overflow-y-auto"
        onClick={handleTap}
      >
        {/* Chapter Header */}
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-b from-zinc-900 to-black">
          <div className="text-center max-w-2xl">
            {chapterData.metadata?.volume && (
              <p className="text-white/50 text-sm mb-1">
                Volume {chapterData.metadata.volume}
              </p>
            )}
            <h1 className="text-white text-2xl sm:text-3xl font-bold mb-2">
              {chapterData.metadata?.chapter
                ? `Chapter ${chapterData.metadata.chapter}`
                : "Chapter"}
            </h1>
            {chapterData.metadata?.title && (
              <p className="text-white/70 text-lg sm:text-xl">
                {chapterData.metadata.title}
              </p>
            )}
            <p className="text-white/40 text-sm mt-4">
              {chapterData.images.length} pages
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {chapterData.images.map((imageUrl, index) => (
            <ReaderImage
              key={`${chapterId}-${index}`}
              src={imageUrl}
              alt={`Page ${index + 1}`}
              index={index}
              total={chapterData.images.length}
            />
          ))}
        </div>

        {/* End of Chapter Navigation */}
        <div className="flex flex-col items-center gap-4 py-12 px-4 bg-zinc-900">
          <p className="text-white/70 text-sm">
            End of{" "}
            {chapterData.metadata?.chapter
              ? `Chapter ${chapterData.metadata.chapter}`
              : "Chapter"}
          </p>
          <div className="flex gap-3">
            {prevChapter && (
              <Link href={`/read/${mangaId}/${prevChapter.id}`}>
                <Button variant="outline" className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Ch. {prevChapter.chapter || "Prev"}
                  </span>
                  <span className="sm:hidden">Prev</span>
                </Button>
              </Link>
            )}
            {nextChapter && (
              <Link href={`/read/${mangaId}/${nextChapter.id}`}>
                <Button className="gap-2">
                  <span className="hidden sm:inline">
                    Ch. {nextChapter.chapter || "Next"}
                  </span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
          {!nextChapter && (
            <p className="text-white/50 text-xs">
              You&apos;ve reached the latest chapter!
            </p>
          )}
          <Link href={`/manga/${mangaId}`}>
            <Button variant="ghost" className="text-white/60 hover:text-white">
              Back to Manga Details
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-safe"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 gap-2 min-w-[80px] sm:min-w-[100px]"
                disabled={!prevChapter}
                onClick={() =>
                  prevChapter &&
                  router.push(`/read/${mangaId}/${prevChapter.id}`)
                }
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev</span>
              </Button>

              <div className="text-white/70 text-xs sm:text-sm text-center">
                <span className="font-medium text-white">
                  Ch. {chapterData.metadata?.chapter || "?"}
                </span>
                <span className="mx-1">·</span>
                <span>{chapterData.images.length} pages</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 gap-2 min-w-[80px] sm:min-w-[100px]"
                disabled={!nextChapter}
                onClick={() =>
                  nextChapter &&
                  router.push(`/read/${mangaId}/${nextChapter.id}`)
                }
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Separate component for lazy loading images
function ReaderImage({
  src,
  alt,
  index,
  total,
}: {
  src: string;
  alt: string;
  index: number;
  total: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <div className="relative w-full max-w-4xl">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
            <span className="text-white/50 text-xs">
              {index + 1} / {total}
            </span>
          </div>
        </div>
      )}
      {error ? (
        <div className="flex items-center justify-center bg-zinc-900 min-h-[300px] text-white/50">
          <div className="flex flex-col items-center gap-2">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">Failed to load page {index + 1}</span>
          </div>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`w-full h-auto transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading={index < 3 ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
