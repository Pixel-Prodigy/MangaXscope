"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Filter, X, Check, Loader2 } from "lucide-react";
import { useQueryStates, parseAsArrayOf, parseAsString } from "nuqs";
import { cn } from "@/lib/utils";

interface MangaDexTag {
  id: string;
  type: string;
  attributes: {
    name: {
      en: string;
      [key: string]: string | undefined;
    };
    group: "genre" | "theme" | "format" | "content";
  };
}

interface MangaDexTagsResponse {
  result: string;
  data: MangaDexTag[];
}

type GenreFilter = {
  id: string;
  name: string;
  mode: "include" | "exclude" | null;
};

export function GenreFilterDialog() {
  const [includeGenres, setIncludeGenres] = useQueryStates(
    {
      include: parseAsArrayOf(parseAsString).withDefault([]),
      exclude: parseAsArrayOf(parseAsString).withDefault([]),
    },
    {
      shallow: false,
    }
  );

  const [open, setOpen] = useState(false);

  // Fetch available tags from MangaDex
  const { data: tagsData, isLoading: isLoadingTags } = useQuery<MangaDexTagsResponse>({
    queryKey: ["mangadex-tags"],
    queryFn: async () => {
      const response = await fetch("https://api.mangadex.org/manga/tag", {
        cache: "force-cache",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }
      return response.json();
    },
    enabled: open, // Only fetch when dialog is open
  });

  // Filter to only genre and theme tags
  const availableTags = tagsData?.data.filter(
    (tag) => tag.attributes.group === "genre" || tag.attributes.group === "theme"
  ) || [];

  // Initialize local filters from URL params
  const initializeFilters = () => {
    const filters = new Map<string, GenreFilter>();
    availableTags.forEach((tag) => {
      const isIncluded = includeGenres.include.includes(tag.id);
      const isExcluded = includeGenres.exclude.includes(tag.id);
      const tagName = tag.attributes.name.en || Object.values(tag.attributes.name)[0] || "Unknown";
      filters.set(tag.id, {
        id: tag.id,
        name: tagName,
        mode: isIncluded ? "include" : isExcluded ? "exclude" : null,
      });
    });
    return filters;
  };

  const [localFilters, setLocalFilters] = useState<Map<string, GenreFilter>>(
    new Map()
  );

  // Update local filters when dialog opens or tags data changes
  useEffect(() => {
    if (open && availableTags.length > 0) {
      setLocalFilters(initializeFilters());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, availableTags.length, includeGenres.include, includeGenres.exclude]);

  const toggleGenre = (tagId: string, tagName: string) => {
    const current = localFilters.get(tagId);
    let newMode: "include" | "exclude" | null;

    if (!current || current.mode === null) {
      newMode = "include";
    } else if (current.mode === "include") {
      newMode = "exclude";
    } else {
      newMode = null;
    }

    const updated = new Map(localFilters);
    updated.set(tagId, {
      id: tagId,
      name: tagName,
      mode: newMode,
    });
    setLocalFilters(updated);
  };

  const applyFilters = () => {
    const include: string[] = [];
    const exclude: string[] = [];

    localFilters.forEach((filter) => {
      if (filter.mode === "include") {
        include.push(filter.id);
      } else if (filter.mode === "exclude") {
        exclude.push(filter.id);
      }
    });

    setIncludeGenres({
      include: include.length > 0 ? include : null,
      exclude: exclude.length > 0 ? exclude : null,
    });
    setOpen(false);
  };

  const clearFilters = () => {
    const cleared = new Map(localFilters);
    cleared.forEach((filter) => {
      cleared.set(filter.id, { ...filter, mode: null });
    });
    setLocalFilters(cleared);
    setIncludeGenres({ include: null, exclude: null });
  };

  const activeCount =
    Array.from(localFilters.values()).filter((f) => f.mode !== null).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          Genres
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Filter by Genres</DialogTitle>
          <DialogDescription>
            Click once to include, twice to exclude, three times to remove
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] pr-4">
          {isLoadingTags ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const filter = localFilters.get(tag.id);
                const mode = filter?.mode || null;
                const tagName = tag.attributes.name.en || Object.values(tag.attributes.name)[0] || "Unknown";

                return (
                  <Badge
                    key={tag.id}
                    variant={mode === "exclude" ? "destructive" : "secondary"}
                    className={cn(
                      "cursor-pointer transition-all hover:scale-105",
                      mode === "include" && "bg-primary text-primary-foreground",
                      mode === "exclude" && "bg-destructive text-destructive-foreground"
                    )}
                    onClick={() => toggleGenre(tag.id, tagName)}
                  >
                    {mode === "include" && <Check className="mr-1 h-3 w-3" />}
                    {mode === "exclude" && <X className="mr-1 h-3 w-3" />}
                    {tagName}
                  </Badge>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="flex justify-between">
          <Button variant="outline" onClick={clearFilters}>
            Clear All
          </Button>
          <Button onClick={applyFilters}>Apply Filters</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

