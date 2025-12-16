"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates, parseAsString, parseAsInteger, parseAsArrayOf } from "nuqs";
import { MangaGrid } from "@/components/manga/manga-grid";
import { SearchBar } from "@/components/filters/search-bar";
import { SortSelect } from "@/components/filters/sort-select";
import { GenreFilterDialog } from "@/components/filters/genre-filter-dialog";
import { getMangaList, searchManga } from "@/lib/api/manga";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  const [searchParams, setSearchParams] = useQueryStates(
    {
      q: parseAsString,
      type: parseAsString.withDefault("latest"),
      include: parseAsArrayOf(parseAsString),
      exclude: parseAsArrayOf(parseAsString),
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
  }, [searchParams.type, searchParams.include, searchParams.exclude, searchParams.q]);

  // Determine if we're searching or browsing
  const isSearch = !!searchParams.q;

  const { data, isLoading, error } = useQuery({
    queryKey: isSearch
      ? ["search", searchParams.q, searchParams.page]
      : [
          "mangaList",
          searchParams.type,
          searchParams.include,
          searchParams.exclude,
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

      return getMangaList({
        limit,
        offset,
        order,
        includedTags: includedTags.length > 0 ? includedTags : undefined,
        excludedTags: excludedTags.length > 0 ? excludedTags : undefined,
      });
    },
    enabled: !isSearch || !!searchParams.q,
  });

  const metadata = data?.metaData;

  return (
    <>
      <Navbar />
      <div className="container mx-auto min-h-screen px-4 py-6">
        {!isLoading && (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchBar />
            </div>
            <div className="flex gap-2">
              <SortSelect />
              <GenreFilterDialog />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center text-destructive">
            <p className="font-medium">Error loading mangas</p>
            <p className="text-sm">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        )}

        <MangaGrid mangas={data?.mangaList || []} isLoading={isLoading} />

        {!isLoading && data && data.metaData.totalPages > 1 && (
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                setSearchParams({ page: Math.max(1, searchParams.page - 1) })
              }
              disabled={searchParams.page === 1}
              className="gap-2"
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
                of {data.metaData.totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                setSearchParams({
                  page: Math.min(data.metaData.totalPages, searchParams.page + 1),
                })
              }
              disabled={searchParams.page >= data.metaData.totalPages}
              className="gap-2"
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
