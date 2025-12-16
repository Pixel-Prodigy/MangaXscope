"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { X, Check, Loader2, Search } from "lucide-react";
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

type TriggerFilter = {
  id: string;
  name: string;
  mode: "include" | "exclude" | null;
};

interface TriggerFilterContentProps {
  enabled?: boolean;
}

export function TriggerFilterContent({ enabled = true }: TriggerFilterContentProps) {
  const [includeGenres, setIncludeGenres] = useQueryStates(
    {
      include: parseAsArrayOf(parseAsString).withDefault([]),
      exclude: parseAsArrayOf(parseAsString).withDefault([]),
    },
    {
      shallow: false,
    }
  );

  const [searchQuery, setSearchQuery] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch available tags from MangaDex via Next.js API route
  const { data: tagsData, isLoading: isLoadingTags } =
    useQuery<MangaDexTagsResponse>({
      queryKey: ["mangadex-tags"],
      queryFn: async () => {
        const response = await fetch("/api/manga/tag", {
          cache: "force-cache",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch tags");
        }
        return response.json();
      },
      enabled: enabled,
    });

  // Filter to only genre and theme tags
  const availableTags =
    tagsData?.data.filter(
      (tag) =>
        tag.attributes.group === "genre" || tag.attributes.group === "theme"
    ) || [];

  // Group tags by first letter and filter by search query
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

    // Sort tags within each group
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

  // Get all available letters
  const availableLetters = useMemo(() => {
    const letters = Object.keys(groupedTags).sort();
    return letters;
  }, [groupedTags]);

  // Scroll to a specific letter section
  const scrollToLetter = (letter: string) => {
    const element = sectionRefs.current[letter];
    if (element && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;
        const targetScrollTop =
          scrollTop + elementRect.top - containerRect.top - 20;

        scrollContainer.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });
      }
    }
  };

  // Initialize local filters from URL params
  const initializeFilters = () => {
    const filters = new Map<string, TriggerFilter>();
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
    return filters;
  };

  const [localFilters, setLocalFilters] = useState<Map<string, TriggerFilter>>(
    new Map()
  );

  // Update local filters when tags data changes
  useEffect(() => {
    if (availableTags.length > 0) {
      setLocalFilters(initializeFilters());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    availableTags.length,
    includeGenres.include,
    includeGenres.exclude,
  ]);

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

    // Apply immediately
    const include: string[] = [];
    const exclude: string[] = [];

    updated.forEach((filter) => {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Click once to include, twice to exclude, three times to remove
        </p>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs h-7"
          >
            Clear All ({activeCount})
          </Button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search triggers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      <div className="relative min-h-[400px]">
        {/* Main Content Area */}
        <ScrollArea ref={scrollAreaRef} className="pr-12 max-h-[400px]">
          {isLoadingTags ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : availableLetters.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <p className="font-medium">No triggers found</p>
                <p className="text-xs mt-1">Try adjusting your search</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {availableLetters.map((letter) => {
                const tags = groupedTags[letter];
                return (
                  <div
                    key={letter}
                    ref={(el) => {
                      sectionRefs.current[letter] = el;
                    }}
                    className="space-y-4"
                  >
                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 pt-1 -mt-1">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                        <h3 className="text-xl font-bold text-primary px-3 py-1 rounded-lg bg-primary/10">
                          {letter}
                        </h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
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
                              "cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 px-3 py-1.5 text-sm font-medium shadow-sm",
                              mode === "include" &&
                                "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
                              mode === "exclude" &&
                                "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
                              mode === null &&
                                "hover:bg-secondary/80 hover:shadow-md"
                            )}
                            onClick={() => toggleGenre(tag.id, tagName)}
                          >
                            {mode === "include" && (
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {mode === "exclude" && (
                              <X className="mr-1.5 h-3.5 w-3.5" />
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

        {/* Floating Alphabetical Navigation */}
        {!isLoadingTags && availableLetters.length > 0 && (
          <div className="absolute right-0 top-0 bottom-0 flex flex-col items-center gap-1.5 py-2">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Jump
            </div>
            <div className="flex flex-col gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 border shadow-lg">
              {availableLetters.map((letter) => (
                <button
                  key={letter}
                  className="h-7 w-7 p-0 text-xs font-bold rounded-md transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-125 active:scale-100 hover:shadow-md flex items-center justify-center"
                  onClick={() => scrollToLetter(letter)}
                  title={`Jump to ${letter}`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

