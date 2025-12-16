"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useQueryStates, parseAsArrayOf, parseAsString } from "nuqs";
import { cn } from "@/lib/utils";

type CategoryFilter = {
  id: string;
  name: string;
  mode: "include" | "exclude" | null;
};

const categories = [
  { id: "manga", name: "Manga" },
  { id: "manhua", name: "Manhua" },
  { id: "manhwa", name: "Manhwa" },
];

export function CategorySelect() {
  const [includeCategories, setIncludeCategories] = useQueryStates(
    {
      includeCategories: parseAsArrayOf(parseAsString).withDefault([]),
      excludeCategories: parseAsArrayOf(parseAsString).withDefault([]),
    },
    {
      shallow: false,
    }
  );

  const initializeFilters = () => {
    const filters = new Map<string, CategoryFilter>();
    categories.forEach((category) => {
      const isIncluded = includeCategories.includeCategories.includes(category.id);
      const isExcluded = includeCategories.excludeCategories.includes(category.id);
      filters.set(category.id, {
        id: category.id,
        name: category.name,
        mode: isIncluded ? "include" : isExcluded ? "exclude" : null,
      });
    });
    return filters;
  };

  const [localFilters, setLocalFilters] = useState<Map<string, CategoryFilter>>(
    initializeFilters()
  );

  useEffect(() => {
    setLocalFilters(initializeFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeCategories.includeCategories, includeCategories.excludeCategories]);

  const toggleCategory = (categoryId: string, categoryName: string) => {
    const current = localFilters.get(categoryId);
    let newMode: "include" | "exclude" | null;

    if (!current || current.mode === null) {
      newMode = "include";
    } else if (current.mode === "include") {
      newMode = "exclude";
    } else {
      newMode = null;
    }

    const updated = new Map(localFilters);
    updated.set(categoryId, {
      id: categoryId,
      name: categoryName,
      mode: newMode,
    });
    setLocalFilters(updated);

    const include: string[] = [];
    const exclude: string[] = [];

    updated.forEach((filter) => {
      if (filter.mode === "include") {
        include.push(filter.id);
      } else if (filter.mode === "exclude") {
        exclude.push(filter.id);
      }
    });

    setIncludeCategories({
      includeCategories: include.length > 0 ? include : null,
      excludeCategories: exclude.length > 0 ? exclude : null,
    });
  };

  const activeCount = Array.from(localFilters.values()).filter(
    (f) => f.mode !== null
  ).length;

  return (
    <div className="space-y-3">
      <div className="text-xs sm:text-sm text-muted-foreground">
        Tap once to include, twice to exclude, three times to remove
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-2">
        {categories.map((category) => {
          const filter = localFilters.get(category.id);
          const mode = filter?.mode || null;

          return (
            <Badge
              key={category.id}
              variant={mode === "exclude" ? "outline" : "secondary"}
              className={cn(
                "cursor-pointer transition-all active:scale-95 sm:hover:scale-105",
                "text-sm sm:text-sm px-4 sm:px-3 py-2.5 sm:py-1.5",
                "min-h-[40px] sm:min-h-0 touch-manipulation",
                mode === "include" && "bg-primary text-primary-foreground",
                mode === "exclude" && "border-destructive bg-destructive/10 text-destructive"
              )}
              onClick={() => toggleCategory(category.id, category.name)}
            >
              {mode === "include" && <Check className="mr-1.5 sm:mr-1 h-3.5 w-3.5 sm:h-3 sm:w-3" />}
              {mode === "exclude" && <X className="mr-1.5 sm:mr-1 h-3.5 w-3.5 sm:h-3 sm:w-3" />}
              {category.name}
            </Badge>
          );
        })}
      </div>
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const cleared = new Map(localFilters);
            cleared.forEach((filter) => {
              cleared.set(filter.id, { ...filter, mode: null });
            });
            setLocalFilters(cleared);
            setIncludeCategories({
              includeCategories: null,
              excludeCategories: null,
            });
          }}
          className="h-9 sm:h-8 text-xs sm:text-xs w-full sm:w-auto touch-manipulation"
        >
          Clear All
        </Button>
      )}
    </div>
  );
}
