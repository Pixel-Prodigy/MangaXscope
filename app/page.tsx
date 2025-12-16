"use client";

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
} from "nuqs";
import { MangaGrid } from "@/components/manga/manga-grid";
import { SearchBar } from "@/components/filters/search-bar";
import { SortSelect } from "@/components/filters/sort-select";
import { GenreFilterDialog } from "@/components/filters/genre-filter-dialog";
import { GeneralFilterDialog } from "@/components/filters/general-filter-dialog";
import { getMangaList, searchManga } from "@/lib/api/manga";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { ChevronLeft, ChevronRight } from "lucide-react";

const LIMIT = 20;
const PREFETCH_RANGE = 3;
const PREFETCH_STALE_TIME = 5 * 60 * 1000;
const CATEGORY_MAP: Record<string, string> = {
  manga: "ja",
  manhua: "zh",
  manhwa: "ko",
};

export default function Home() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useQueryStates(
    {
      q: parseAsString,
      type: parseAsString.withDefault("latest"),
      includeCategories: parseAsArrayOf(parseAsString),
      excludeCategories: parseAsArrayOf(parseAsString),
      include: parseAsArrayOf(parseAsString),
      exclude: parseAsArrayOf(parseAsString),
      minChapters: parseAsString,
      maxChapters: parseAsString,
      status: parseAsArrayOf(parseAsString),
      page: parseAsInteger.withDefault(1),
    },
    {
      shallow: false,
    }
  );

  const isSearch = !!searchParams.q;
  const prevFiltersRef = useRef<string>("");

  // Reset page to 1 only when filters change (not when page itself changes)
  useEffect(() => {
    const currentFilters = JSON.stringify({
      type: searchParams.type,
      includeCategories: searchParams.includeCategories,
      excludeCategories: searchParams.excludeCategories,
      include: searchParams.include,
      exclude: searchParams.exclude,
      q: searchParams.q,
      minChapters: searchParams.minChapters,
      maxChapters: searchParams.maxChapters,
      status: searchParams.status,
    });

    if (prevFiltersRef.current && prevFiltersRef.current !== currentFilters) {
      if (searchParams.page !== 1) {
        setSearchParams({ page: 1 });
      }
    }

    prevFiltersRef.current = currentFilters;
  }, [
    searchParams.type,
    searchParams.includeCategories,
    searchParams.excludeCategories,
    searchParams.include,
    searchParams.exclude,
    searchParams.q,
    searchParams.minChapters,
    searchParams.maxChapters,
    searchParams.status,
    searchParams.page,
    setSearchParams,
  ]);

  const getOriginalLanguage = useCallback(() => {
    const includedCategories = searchParams.includeCategories || [];
    const excludedCategories = searchParams.excludeCategories || [];

    if (includedCategories.length > 0) {
      return includedCategories
        .map((cat) => CATEGORY_MAP[cat])
        .filter((lang): lang is string => !!lang);
    }

    if (excludedCategories.length > 0) {
      const allCategories = Object.keys(CATEGORY_MAP);
      const allowedCategories = allCategories.filter(
        (cat) => !excludedCategories.includes(cat)
      );
      return allowedCategories
        .map((cat) => CATEGORY_MAP[cat])
        .filter((lang): lang is string => !!lang);
    }

    return undefined;
  }, [searchParams.includeCategories, searchParams.excludeCategories]);

  const fetchMangaData = useCallback(
    async (page: number) => {
      const offset = (page - 1) * LIMIT;

      if (isSearch) {
        return searchManga({
          query: searchParams.q!,
          limit: LIMIT,
          offset,
        });
      }

      const order: Record<string, string> =
        searchParams.type === "popular"
          ? { followedCount: "desc" }
          : { updatedAt: "desc" };

      const includedTags = searchParams.include || [];
      const excludedTags = searchParams.exclude || [];
      const originalLanguage = getOriginalLanguage();
      const status = searchParams.status || [];

      return getMangaList({
        limit: LIMIT,
        offset,
        order,
        includedTags: includedTags.length > 0 ? includedTags : undefined,
        excludedTags: excludedTags.length > 0 ? excludedTags : undefined,
        originalLanguage,
        minChapters: searchParams.minChapters || undefined,
        maxChapters: searchParams.maxChapters || undefined,
        status: status.length > 0 ? status : undefined,
      });
    },
    [
      isSearch,
      searchParams.q,
      searchParams.type,
      searchParams.include,
      searchParams.exclude,
      searchParams.minChapters,
      searchParams.maxChapters,
      searchParams.status,
      getOriginalLanguage,
    ]
  );

  const queryKey = useMemo(
    () =>
      isSearch
        ? ["search", searchParams.q, searchParams.page]
        : [
            "mangaList",
            searchParams.type,
            searchParams.includeCategories,
            searchParams.excludeCategories,
            searchParams.include,
            searchParams.exclude,
            searchParams.minChapters,
            searchParams.maxChapters,
            searchParams.status,
            searchParams.page,
          ],
    [
      isSearch,
      searchParams.q,
      searchParams.type,
      searchParams.includeCategories,
      searchParams.excludeCategories,
      searchParams.include,
      searchParams.exclude,
      searchParams.minChapters,
      searchParams.maxChapters,
      searchParams.status,
      searchParams.page,
    ]
  );

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchMangaData(searchParams.page),
    enabled: !isSearch || !!searchParams.q,
    staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus for better performance
  });

  const metadata = data?.metaData;

  const buildQueryKeyForPage = useCallback(
    (page: number) => {
      if (isSearch) {
        return ["search", searchParams.q, page];
      }
      return [
        "mangaList",
        searchParams.type,
        searchParams.includeCategories,
        searchParams.excludeCategories,
        searchParams.include,
        searchParams.exclude,
        searchParams.minChapters,
        searchParams.maxChapters,
        searchParams.status,
        page,
      ];
    },
    [
      isSearch,
      searchParams.q,
      searchParams.type,
      searchParams.includeCategories,
      searchParams.excludeCategories,
      searchParams.include,
      searchParams.exclude,
      searchParams.minChapters,
      searchParams.maxChapters,
      searchParams.status,
    ]
  );

  // Optimized prefetch handler with priority-based prefetching
  const handlePrefetchPage = useCallback(
    (page: number, priority: "high" | "low" = "low") => {
      if (!metadata || page < 1 || page > metadata.totalPages) return;

      const pageQueryKey = buildQueryKeyForPage(page);
      const existingData = queryClient.getQueryData(pageQueryKey);

      // Skip if already cached and fresh
      if (existingData) return;

      // High priority: immediate prefetch (for adjacent pages)
      // Low priority: background prefetch (for further pages)
      queryClient.prefetchQuery({
        queryKey: pageQueryKey,
        queryFn: () => fetchMangaData(page),
        staleTime: PREFETCH_STALE_TIME,
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      });
    },
    [metadata, buildQueryKeyForPage, queryClient, fetchMangaData]
  );

  // Smart prefetch: prioritize adjacent pages, then expand
  useEffect(() => {
    if (!metadata || isLoading) return;

    const currentPage = searchParams.page;
    const totalPages = metadata.totalPages;
    const prefetchQueue: Array<{ page: number; priority: "high" | "low" }> = [];

    // High priority: immediate next/prev pages
    if (currentPage + 1 <= totalPages) {
      prefetchQueue.push({ page: currentPage + 1, priority: "high" });
    }
    if (currentPage - 1 >= 1) {
      prefetchQueue.push({ page: currentPage - 1, priority: "high" });
    }

    // Low priority: pages within range
    for (let i = 2; i <= PREFETCH_RANGE; i++) {
      const nextPage = currentPage + i;
      const prevPage = currentPage - i;
      if (nextPage <= totalPages) {
        prefetchQueue.push({ page: nextPage, priority: "low" });
      }
      if (prevPage >= 1) {
        prefetchQueue.push({ page: prevPage, priority: "low" });
      }
    }

    // Execute high priority first, then low priority
    const highPriority = prefetchQueue.filter((p) => p.priority === "high");
    const lowPriority = prefetchQueue.filter((p) => p.priority === "low");

    // Immediate prefetch for high priority
    highPriority.forEach(({ page }) => {
      handlePrefetchPage(page, "high");
    });

    // Deferred prefetch for low priority (non-blocking)
    if (lowPriority.length > 0) {
      const timeoutId = setTimeout(() => {
        lowPriority.forEach(({ page }) => {
          handlePrefetchPage(page, "low");
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [metadata, isLoading, searchParams.page, handlePrefetchPage]);

  const paginationRef = useRef<HTMLDivElement>(null);

  // Intersection observer for viewport-based prefetching
  useEffect(() => {
    if (!metadata || !paginationRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const currentPage = searchParams.page;
          const totalPages = metadata.totalPages;

          // Prefetch next 2 pages when pagination is visible
          for (let i = 1; i <= 2; i++) {
            const nextPage = currentPage + i;
            if (nextPage <= totalPages) {
              handlePrefetchPage(nextPage, "high");
            }
          }
        }
      },
      { rootMargin: "300px", threshold: 0.1 }
    );

    observer.observe(paginationRef.current);
    return () => observer.disconnect();
  }, [metadata, searchParams.page, handlePrefetchPage]);

  // Scroll to top when page changes (only for pagination, not initial load)
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [searchParams.page]);

  return (
    <>
      <Navbar />
      <div className="container mx-auto min-h-screen px-4 py-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1 min-w-0">
            <SearchBar />
          </div>
          <div className="flex gap-2   min-w-0">
            <SortSelect />
            <GeneralFilterDialog />
            <GenreFilterDialog />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center text-destructive">
            <p className="font-medium">Error loading mangas</p>
            <p className="text-sm">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        )}

        <MangaGrid mangas={data?.mangaList || []} isLoading={isLoading} />

        {!isLoading && data?.metaData && (
          <div
            ref={paginationRef}
            className="mt-8 flex items-center justify-center gap-2 sm:gap-4"
          >
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                const prevPage = Math.max(1, searchParams.page - 1);
                setSearchParams({ page: prevPage });
              }}
              onMouseEnter={() => {
                if (searchParams.page > 1) {
                  handlePrefetchPage(searchParams.page - 1, "high");
                }
              }}
              disabled={
                searchParams.page === 1 || data.metaData.totalPages <= 1
              }
              className="gap-1 sm:gap-2 min-w-[80px] sm:min-w-[120px] text-xs sm:text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <div className="flex items-center gap-1 sm:gap-2 rounded-lg border bg-card px-3 sm:px-6 py-2">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground hidden sm:inline">
                Page
              </span>
              <span className="text-base sm:text-lg font-bold text-foreground">
                {searchParams.page}
              </span>
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                / {data.metaData.totalPages || 1}
              </span>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                const nextPage = Math.min(
                  data.metaData.totalPages || 1,
                  searchParams.page + 1
                );
                setSearchParams({ page: nextPage });
              }}
              onMouseEnter={() => {
                if (searchParams.page < (data.metaData?.totalPages || 1)) {
                  handlePrefetchPage(searchParams.page + 1, "high");
                }
              }}
              disabled={
                searchParams.page >= data.metaData.totalPages ||
                data.metaData.totalPages <= 1
              }
              className="gap-1 sm:gap-2 min-w-[80px] sm:min-w-[120px] text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
