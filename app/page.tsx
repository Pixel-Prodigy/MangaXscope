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
import { WebcomicsFilterDialog } from "@/components/filters/webcomics-filter-dialog";
import { SectionSelector } from "@/components/filters/section-selector";
import { getMangaList, getWebcomicsList, searchManga, searchWebcomics } from "@/lib/api/manga";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ContentSection, WebcomicType, MangaListResponse } from "@/types";

const LIMIT = 20;
const PREFETCH_RANGE = 3;
const PREFETCH_STALE_TIME = 5 * 60 * 1000;

export default function Home() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useQueryStates(
    {
      q: parseAsString,
      section: parseAsString.withDefault("manga"),
      webcomicType: parseAsString,
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

  const currentSection = (searchParams.section || "manga") as ContentSection;
  const currentWebcomicType = searchParams.webcomicType as WebcomicType | null;
  const isSearch = !!searchParams.q;
  const prevFiltersRef = useRef<string>("");

  // Reset page to 1 only when filters change (not when page itself changes)
  useEffect(() => {
    const currentFilters = JSON.stringify({
      section: searchParams.section,
      webcomicType: searchParams.webcomicType,
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
    searchParams.section,
    searchParams.webcomicType,
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

  // Fetch function based on section
  const fetchData = useCallback(
    async (page: number): Promise<MangaListResponse> => {
      const offset = (page - 1) * LIMIT;
      const status = searchParams.status?.length ? searchParams.status : undefined;

      // WEBCOMICS SECTION
      if (currentSection === "webcomics") {
        if (isSearch && searchParams.q) {
          return searchWebcomics(searchParams.q, {
            limit: LIMIT,
            offset,
            webcomicType: currentWebcomicType || undefined,
            status, // Pass status filter to search
          });
        }

        return getWebcomicsList({
          limit: LIMIT,
          offset,
          webcomicType: currentWebcomicType || undefined,
          status,
          order:
            searchParams.type === "popular"
              ? { followedCount: "desc" }
              : { updatedAt: "desc" },
        });
      }

      // MANGA SECTION
      if (isSearch && searchParams.q) {
        return searchManga({
          query: searchParams.q,
          section: "manga",
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

      return getMangaList({
        section: "manga",
        limit: LIMIT,
        offset,
        order,
        includedTags: includedTags.length > 0 ? includedTags : undefined,
        excludedTags: excludedTags.length > 0 ? excludedTags : undefined,
        originalLanguage: ["ja"], // Manga section = Japanese only
        minChapters: searchParams.minChapters || undefined,
        maxChapters: searchParams.maxChapters || undefined,
        status,
      });
    },
    [
      currentSection,
      currentWebcomicType,
      isSearch,
      searchParams.q,
      searchParams.type,
      searchParams.include,
      searchParams.exclude,
      searchParams.minChapters,
      searchParams.maxChapters,
      searchParams.status,
    ]
  );

  const queryKey = useMemo(
    () => [
      "content",
      currentSection,
      currentWebcomicType,
      isSearch ? "search" : "browse",
      searchParams.q,
      searchParams.type,
      searchParams.include,
      searchParams.exclude,
      searchParams.minChapters,
      searchParams.maxChapters,
      searchParams.status,
      searchParams.page,
    ],
    [
      currentSection,
      currentWebcomicType,
      isSearch,
      searchParams.q,
      searchParams.type,
      searchParams.include,
      searchParams.exclude,
      searchParams.minChapters,
      searchParams.maxChapters,
      searchParams.status,
      searchParams.page,
    ]
  );

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchData(searchParams.page),
    enabled: !isSearch || !!searchParams.q,
    staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh
    gcTime: 30 * 60 * 1000,    // 30 minutes - keep in cache
    refetchOnWindowFocus: false,
    // Show stale data instantly while fetching new data in background
    placeholderData: (previousData) => previousData,
  });

  const metadata = data?.metaData;

  const buildQueryKeyForPage = useCallback(
    (page: number) => [
      "content",
      currentSection,
      currentWebcomicType,
      isSearch ? "search" : "browse",
      searchParams.q,
      searchParams.type,
      searchParams.include,
      searchParams.exclude,
      searchParams.minChapters,
      searchParams.maxChapters,
      searchParams.status,
      page,
    ],
    [
      currentSection,
      currentWebcomicType,
      isSearch,
      searchParams.q,
      searchParams.type,
      searchParams.include,
      searchParams.exclude,
      searchParams.minChapters,
      searchParams.maxChapters,
      searchParams.status,
    ]
  );

  // Optimized prefetch handler with priority-based prefetching
  const handlePrefetchPage = useCallback(
    (page: number) => {
      if (!metadata || page < 1 || page > metadata.totalPages) return;

      const pageQueryKey = buildQueryKeyForPage(page);
      const existingData = queryClient.getQueryData(pageQueryKey);

      if (existingData) return;

      queryClient.prefetchQuery({
        queryKey: pageQueryKey,
        queryFn: () => fetchData(page),
        staleTime: PREFETCH_STALE_TIME,
        gcTime: 10 * 60 * 1000,
      });
    },
    [metadata, buildQueryKeyForPage, queryClient, fetchData]
  );

  // Smart prefetch: prioritize adjacent pages, then expand
  useEffect(() => {
    if (!metadata || isLoading) return;

    const currentPage = searchParams.page;
    const totalPages = metadata.totalPages;
    const prefetchQueue: Array<{ page: number; priority: "high" | "low" }> = [];

    if (currentPage + 1 <= totalPages) {
      prefetchQueue.push({ page: currentPage + 1, priority: "high" });
    }
    if (currentPage - 1 >= 1) {
      prefetchQueue.push({ page: currentPage - 1, priority: "high" });
    }

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

    const highPriority = prefetchQueue.filter((p) => p.priority === "high");
    const lowPriority = prefetchQueue.filter((p) => p.priority === "low");

    highPriority.forEach(({ page }) => {
      handlePrefetchPage(page);
    });

    if (lowPriority.length > 0) {
      const timeoutId = setTimeout(() => {
        lowPriority.forEach(({ page }) => {
          handlePrefetchPage(page);
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

          for (let i = 1; i <= 2; i++) {
            const nextPage = currentPage + i;
            if (nextPage <= totalPages) {
              handlePrefetchPage(nextPage);
            }
          }
        }
      },
      { rootMargin: "300px", threshold: 0.1 }
    );

    observer.observe(paginationRef.current);
    return () => observer.disconnect();
  }, [metadata, searchParams.page, handlePrefetchPage]);

  // Scroll to top when page changes
  useEffect(() => {
    const hasPageChanged = searchParams.page !== 1;

    if (hasPageChanged) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [searchParams.page]);

  // Section title
  const sectionTitle = currentSection === "webcomics" 
    ? currentWebcomicType 
      ? `${currentWebcomicType.charAt(0).toUpperCase() + currentWebcomicType.slice(1)}` 
      : "Webcomics"
    : "Manga";

  return (
    <>
      <Navbar />
      <div className="container mx-auto min-h-screen px-4 py-6 sm:px-6 sm:py-8">
        {/* Section Selector */}
        <div className="mb-6">
          <SectionSelector />
        </div>

        {/* Search and Filters */}
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1 min-w-0">
            <SearchBar />
          </div>
          <div className="flex gap-2 sm:gap-3 min-w-0">
            <SortSelect />
            {/* Section-specific filters */}
            {currentSection === "manga" ? (
              <>
                <GeneralFilterDialog />
                <GenreFilterDialog />
              </>
            ) : (
              <WebcomicsFilterDialog />
            )}
          </div>
        </div>

        {/* Results Header */}
        {!isLoading && data?.metaData && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {isSearch ? `Search Results` : sectionTitle}
            </h2>
            <span className="text-sm text-muted-foreground">
              {data.metaData.total.toLocaleString()} titles
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive mb-6">
            <p className="font-semibold mb-1.5">Error loading content</p>
            <p className="text-sm text-destructive/80">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        )}

        {/* Only show loading on initial load, not background refetches */}
        <MangaGrid mangas={data?.mangaList || []} isLoading={isLoading && !data} />

        {!isLoading && data?.metaData && (
          <div
            ref={paginationRef}
            className="mt-8 sm:mt-10 flex items-center justify-center gap-2 sm:gap-4"
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
                  handlePrefetchPage(searchParams.page - 1);
                }
              }}
              disabled={
                searchParams.page === 1 || data.metaData.totalPages <= 1
              }
              className="gap-1 sm:gap-2 min-w-[80px] sm:min-w-[120px] min-h-[44px] text-xs sm:text-sm rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-border/60 bg-card px-4 sm:px-6 py-2.5 shadow-sm">
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
                  handlePrefetchPage(searchParams.page + 1);
                }
              }}
              disabled={
                searchParams.page >= data.metaData.totalPages ||
                data.metaData.totalPages <= 1
              }
              className="gap-1 sm:gap-2 min-w-[80px] sm:min-w-[120px] min-h-[44px] text-xs sm:text-sm rounded-xl"
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

