"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryStates, parseAsString, parseAsInteger, parseAsArrayOf } from "nuqs";
import { MangaGrid } from "@/components/manga/manga-grid";
import { SearchBar } from "@/components/filters/search-bar";
import { SortSelect } from "@/components/filters/sort-select";
import { GenreFilterDialog } from "@/components/filters/genre-filter-dialog";
import { GeneralFilterDialog } from "@/components/filters/general-filter-dialog";
import { getMangaList, searchManga } from "@/lib/api/manga";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
      page: parseAsInteger.withDefault(1),
    },
    {
      shallow: false,
    }
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    if (searchParams.page !== 1) {
      setSearchParams({ page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.type, searchParams.includeCategories, searchParams.excludeCategories, searchParams.include, searchParams.exclude, searchParams.q, searchParams.minChapters, searchParams.maxChapters]);

  // Determine if we're searching or browsing
  const isSearch = !!searchParams.q;

  const { data, isLoading, error } = useQuery({
    queryKey: isSearch
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
          searchParams.page,
        ],
    queryFn: async () => {
      const limit = 20;
      const offset = (searchParams.page - 1) * limit;

      if (isSearch) {
        return searchManga({
          query: searchParams.q!,
          limit,
          offset,
        });
      }

      // Build order based on type
      const order: Record<string, string> = {};
      if (searchParams.type === "popular") {
        order.followedCount = "desc";
      } else {
        order.updatedAt = "desc";
      }

      // Build tag filters
      const includedTags = searchParams.include || [];
      const excludedTags = searchParams.exclude || [];

      // Map categories to originalLanguage
      const categoryMap: Record<string, string> = {
        manga: "ja",
        manhua: "zh",
        manhwa: "ko",
      };

      let originalLanguage: string[] | undefined;
      const includedCategories = searchParams.includeCategories || [];
      const excludedCategories = searchParams.excludeCategories || [];

      // Handle category filtering
      if (includedCategories.length > 0) {
        // If we have included categories, use only those
        originalLanguage = includedCategories
          .map((cat) => categoryMap[cat])
          .filter((lang): lang is string => !!lang);
      } else if (excludedCategories.length > 0) {
        // If we have excluded categories but no included ones,
        // include all categories except the excluded ones
        const allCategories = Object.keys(categoryMap);
        const allowedCategories = allCategories.filter(
          (cat) => !excludedCategories.includes(cat)
        );
        originalLanguage = allowedCategories
          .map((cat) => categoryMap[cat])
          .filter((lang): lang is string => !!lang);
      }
      // If neither included nor excluded, originalLanguage remains undefined (show all)

      return getMangaList({
        limit,
        offset,
        order,
        includedTags: includedTags.length > 0 ? includedTags : undefined,
        excludedTags: excludedTags.length > 0 ? excludedTags : undefined,
        originalLanguage,
        minChapters: searchParams.minChapters || undefined,
        maxChapters: searchParams.maxChapters || undefined,
      });
    },
    enabled: !isSearch || !!searchParams.q,
  });

  const metadata = data?.metaData;

  // Helper function to build query key (memoized)
  const buildQueryKey = useCallback(
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
    ]
  );

  // Helper function to build query function (memoized)
  const buildQueryFn = useCallback(
    (page: number) => async () => {
      const limit = 20;
      const offset = (page - 1) * limit;

      if (isSearch) {
        return searchManga({
          query: searchParams.q!,
          limit,
          offset,
        });
      }

      // Build order based on type
      const order: Record<string, string> = {};
      if (searchParams.type === "popular") {
        order.followedCount = "desc";
      } else {
        order.updatedAt = "desc";
      }

      // Build tag filters
      const includedTags = searchParams.include || [];
      const excludedTags = searchParams.exclude || [];

      // Map categories to originalLanguage
      const categoryMap: Record<string, string> = {
        manga: "ja",
        manhua: "zh",
        manhwa: "ko",
      };

      let originalLanguage: string[] | undefined;
      const includedCategories = searchParams.includeCategories || [];
      const excludedCategories = searchParams.excludeCategories || [];

      // Handle category filtering
      if (includedCategories.length > 0) {
        originalLanguage = includedCategories
          .map((cat) => categoryMap[cat])
          .filter((lang): lang is string => !!lang);
      } else if (excludedCategories.length > 0) {
        const allCategories = Object.keys(categoryMap);
        const allowedCategories = allCategories.filter(
          (cat) => !excludedCategories.includes(cat)
        );
        originalLanguage = allowedCategories
          .map((cat) => categoryMap[cat])
          .filter((lang): lang is string => !!lang);
      }

      return getMangaList({
        limit,
        offset,
        order,
        includedTags: includedTags.length > 0 ? includedTags : undefined,
        excludedTags: excludedTags.length > 0 ? excludedTags : undefined,
        originalLanguage,
        minChapters: searchParams.minChapters || undefined,
        maxChapters: searchParams.maxChapters || undefined,
      });
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
    ]
  );

  // Smart prefetching: Aggressively prefetch pages for instant navigation
  useEffect(() => {
    if (!metadata || isLoading) return;

    const currentPage = searchParams.page;
    const totalPages = metadata.totalPages;
    const PREFETCH_RANGE = 5; // Prefetch 5 pages ahead and behind

    // Prefetch pages in a smart range around current page
    const pagesToPrefetch: number[] = [];

    // Prefetch pages ahead (up to PREFETCH_RANGE pages)
    for (let i = 1; i <= PREFETCH_RANGE; i++) {
      const nextPage = currentPage + i;
      if (nextPage <= totalPages) {
        pagesToPrefetch.push(nextPage);
      }
    }

    // Prefetch pages behind (up to PREFETCH_RANGE pages)
    for (let i = 1; i <= PREFETCH_RANGE; i++) {
      const prevPage = currentPage - i;
      if (prevPage >= 1) {
        pagesToPrefetch.push(prevPage);
      }
    }

    // Prefetch all pages in parallel
    pagesToPrefetch.forEach((page) => {
      // Check if already cached to avoid unnecessary requests
      const queryKey = buildQueryKey(page);
      const cachedData = queryClient.getQueryData(queryKey);
      
      if (!cachedData) {
        queryClient.prefetchQuery({
          queryKey,
          queryFn: buildQueryFn(page),
          staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        });
      }
    });
  }, [
    metadata,
    isLoading,
    searchParams.page,
    buildQueryKey,
    buildQueryFn,
    queryClient,
  ]);

  // Prefetch on hover for pagination buttons (memoized)
  const handlePrefetchPage = useCallback(
    (page: number) => {
      if (!metadata) return;
      const totalPages = metadata.totalPages;
      if (page < 1 || page > totalPages) return;

      const queryKey = buildQueryKey(page);
      const cachedData = queryClient.getQueryData(queryKey);

      if (!cachedData) {
        queryClient.prefetchQuery({
          queryKey,
          queryFn: buildQueryFn(page),
          staleTime: 5 * 60 * 1000,
        });
      }
    },
    [metadata, buildQueryKey, buildQueryFn, queryClient]
  );

  // Intersection Observer for prefetching when pagination becomes visible
  const paginationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!metadata || !paginationRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // When pagination is visible, prefetch next 3 pages aggressively
            const currentPage = searchParams.page;
            const totalPages = metadata.totalPages;

            for (let i = 1; i <= 3; i++) {
              const nextPage = currentPage + i;
              if (nextPage <= totalPages) {
                handlePrefetchPage(nextPage);
              }
            }
          }
        });
      },
      {
        rootMargin: "200px", // Start prefetching 200px before pagination is visible
        threshold: 0.1,
      }
    );

    observer.observe(paginationRef.current);

    return () => {
      observer.disconnect();
    };
  }, [metadata, searchParams.page, handlePrefetchPage]);

  return (
    <>
      <Navbar />
      <div className="container mx-auto min-h-screen px-4 py-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchBar />
          </div>
          <div className="flex gap-2">
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

        {/* Pagination Controls */}
        {!isLoading && data && data.metaData && (
          <div
            ref={paginationRef}
            className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                setSearchParams({ page: Math.max(1, searchParams.page - 1) })
              }
              onMouseEnter={() => handlePrefetchPage(searchParams.page - 1)}
              disabled={searchParams.page === 1 || data.metaData.totalPages <= 1}
              className="gap-2 min-w-[120px]"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-6 py-2">
              <span className="text-sm font-medium text-muted-foreground">
                Page
              </span>
              <span className="text-lg font-bold text-foreground">
                {searchParams.page}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                of {data.metaData.totalPages || 1}
              </span>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                setSearchParams({
                  page: Math.min(data.metaData.totalPages || 1, searchParams.page + 1),
                })
              }
              onMouseEnter={() => handlePrefetchPage(searchParams.page + 1)}
              disabled={searchParams.page >= (data.metaData.totalPages || 1) || data.metaData.totalPages <= 1}
              className="gap-2 min-w-[120px]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
