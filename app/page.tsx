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
const PREFETCH_RANGE = 5;
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
      page: parseAsInteger.withDefault(1),
    },
    {
      shallow: false,
    }
  );

  const isSearch = !!searchParams.q;

  useEffect(() => {
    if (searchParams.page !== 1) {
      setSearchParams({ page: 1 });
    }
  }, [
    searchParams.type,
    searchParams.includeCategories,
    searchParams.excludeCategories,
    searchParams.include,
    searchParams.exclude,
    searchParams.q,
    searchParams.minChapters,
    searchParams.maxChapters,
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

      return getMangaList({
        limit: LIMIT,
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
      searchParams.include,
      searchParams.exclude,
      searchParams.minChapters,
      searchParams.maxChapters,
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
      searchParams.page,
    ]
  );

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchMangaData(searchParams.page),
    enabled: !isSearch || !!searchParams.q,
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

  const handlePrefetchPage = useCallback(
    (page: number) => {
      if (!metadata || page < 1 || page > metadata.totalPages) return;

      const pageQueryKey = buildQueryKeyForPage(page);
      if (!queryClient.getQueryData(pageQueryKey)) {
        queryClient.prefetchQuery({
          queryKey: pageQueryKey,
          queryFn: () => fetchMangaData(page),
          staleTime: PREFETCH_STALE_TIME,
        });
      }
    },
    [metadata, buildQueryKeyForPage, queryClient, fetchMangaData]
  );

  useEffect(() => {
    if (!metadata || isLoading) return;

    const currentPage = searchParams.page;
    const totalPages = metadata.totalPages;
    const pagesToPrefetch: number[] = [];

    for (let i = 1; i <= PREFETCH_RANGE; i++) {
      const nextPage = currentPage + i;
      const prevPage = currentPage - i;
      if (nextPage <= totalPages) pagesToPrefetch.push(nextPage);
      if (prevPage >= 1) pagesToPrefetch.push(prevPage);
    }

    pagesToPrefetch.forEach((page) => {
      const pageQueryKey = buildQueryKeyForPage(page);
      if (!queryClient.getQueryData(pageQueryKey)) {
        queryClient.prefetchQuery({
          queryKey: pageQueryKey,
          queryFn: () => fetchMangaData(page),
          staleTime: PREFETCH_STALE_TIME,
        });
      }
    });
  }, [
    metadata,
    isLoading,
    searchParams.page,
    buildQueryKeyForPage,
    queryClient,
    fetchMangaData,
  ]);

  const paginationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!metadata || !paginationRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const currentPage = searchParams.page;
          const totalPages = metadata.totalPages;
          for (let i = 1; i <= 3; i++) {
            const nextPage = currentPage + i;
            if (nextPage <= totalPages) {
              handlePrefetchPage(nextPage);
            }
          }
        }
      },
      { rootMargin: "200px", threshold: 0.1 }
    );

    observer.observe(paginationRef.current);
    return () => observer.disconnect();
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

        {!isLoading && data?.metaData && (
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
              disabled={
                searchParams.page === 1 || data.metaData.totalPages <= 1
              }
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
                  page: Math.min(
                    data.metaData.totalPages || 1,
                    searchParams.page + 1
                  ),
                })
              }
              onMouseEnter={() => handlePrefetchPage(searchParams.page + 1)}
              disabled={
                searchParams.page >= data.metaData.totalPages ||
                data.metaData.totalPages <= 1
              }
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
