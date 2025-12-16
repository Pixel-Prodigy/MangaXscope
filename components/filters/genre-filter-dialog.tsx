"use client";

import { useState, useRef, useMemo, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Filter, X, Check, Loader2, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: tagsData, isLoading: isLoadingTags } =
    useQuery<MangaDexTagsResponse>({
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
      enabled: open,
    });

  const availableTags = useMemo(
    () =>
      tagsData?.data.filter(
        (tag) =>
          tag.attributes.group === "genre" || tag.attributes.group === "theme"
      ) || [],
    [tagsData?.data]
  );

  const groupedTags = useMemo(() => {
    const filtered = availableTags.filter((tag) => {
      const tagName =
        tag.attributes.name.en ||
        Object.values(tag.attributes.name)[0] ||
        "Unknown";
      return tagName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const grouped: Record<string, typeof availableTags> = {};
    filtered.forEach((tag) => {
      const tagName =
        tag.attributes.name.en ||
        Object.values(tag.attributes.name)[0] ||
        "Unknown";
      const firstLetter = tagName.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : "#";

      if (!grouped[letter]) {
        grouped[letter] = [];
      }
      grouped[letter].push(tag);
    });

    Object.keys(grouped).forEach((letter) => {
      grouped[letter].sort((a, b) => {
        const nameA =
          a.attributes.name.en || Object.values(a.attributes.name)[0] || "";
        const nameB =
          b.attributes.name.en || Object.values(b.attributes.name)[0] || "";
        return nameA.localeCompare(nameB);
      });
    });

    return grouped;
  }, [availableTags, searchQuery]);

  const availableLetters = useMemo(() => {
    const letters = Object.keys(groupedTags).sort();
    return letters;
  }, [groupedTags]);

  const initializeFilters = useMemo(() => {
    const filters = new Map<string, GenreFilter>();
    if (availableTags.length > 0) {
      availableTags.forEach((tag) => {
        const isIncluded = includeGenres.include.includes(tag.id);
        const isExcluded = includeGenres.exclude.includes(tag.id);
        const tagName =
          tag.attributes.name.en ||
          Object.values(tag.attributes.name)[0] ||
          "Unknown";
        filters.set(tag.id, {
          id: tag.id,
          name: tagName,
          mode: isIncluded ? "include" : isExcluded ? "exclude" : null,
        });
      });
    }
    return filters;
  }, [availableTags, includeGenres.include, includeGenres.exclude]);

  const [localFilters, setLocalFilters] = useState<Map<string, GenreFilter>>(
    () => initializeFilters
  );

  // Reset filters when dialog opens and tags are available
  // Using useEffect to sync external state (URL params) to local state when dialog opens
  // This is a valid pattern for syncing external state to local state for controlled inputs
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (open && availableTags.length > 0) {
      setLocalFilters(new Map(initializeFilters));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, availableTags.length]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery("");
    }
  };

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

  const activeCount = Array.from(localFilters.values()).filter(
    (f) => f.mode !== null
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
      <DialogContent className="max-h-[85vh] max-w-4xl flex flex-col">
        <DialogHeader>
          <DialogTitle>Filter by Genres</DialogTitle>
          <DialogDescription>
            Click once to include, twice to exclude, three times to remove
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          <ScrollArea ref={scrollAreaRef} className="flex-1 max-h-[50vh] pr-4">
            {isLoadingTags ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableLetters.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No genres found matching your search
              </div>
            ) : (
              <div className="space-y-6">
                {availableLetters.map((letter) => {
                  const tags = groupedTags[letter];
                  return (
                    <div key={letter} className="space-y-3">
                      <div className="sticky top-0 z-10 bg-background pb-2">
                        <h3 className="text-lg font-semibold text-primary border-b pb-1">
                          {letter}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const filter = localFilters.get(tag.id);
                          const mode = filter?.mode || null;
                          const tagName =
                            tag.attributes.name.en ||
                            Object.values(tag.attributes.name)[0] ||
                            "Unknown";

                          return (
                            <Badge
                              key={tag.id}
                              variant={
                                mode === "exclude" ? "destructive" : "secondary"
                              }
                              className={cn(
                                "cursor-pointer transition-all hover:scale-105",
                                mode === "include" &&
                                  "bg-primary text-primary-foreground",
                                mode === "exclude" &&
                                  "bg-destructive text-destructive-foreground"
                              )}
                              onClick={() => toggleGenre(tag.id, tagName)}
                            >
                              {mode === "include" && (
                                <Check className="mr-1 h-3 w-3" />
                              )}
                              {mode === "exclude" && (
                                <X className="mr-1 h-3 w-3" />
                              )}
                              {tagName}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

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
