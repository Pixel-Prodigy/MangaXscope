"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryStates, parseAsString } from "nuqs";
import { BookOpen } from "lucide-react";

export function ChapterFilter() {
  const [chapterFilter, setChapterFilter] = useQueryStates(
    {
      minChapters: parseAsString,
      maxChapters: parseAsString,
    },
    {
      shallow: false,
    }
  );

  // Use URL params directly as the source of truth to avoid sync issues
  const localMin = chapterFilter.minChapters || "";
  const localMax = chapterFilter.maxChapters || "";

  const handleMinChange = (value: string) => {
    if (value === "") {
      setChapterFilter({ minChapters: null });
    } else {
      const num = parseFloat(value);
      if (!isNaN(num) && num >= 0) {
        setChapterFilter({ minChapters: value });
      }
    }
  };

  const handleMaxChange = (value: string) => {
    if (value === "") {
      setChapterFilter({ maxChapters: null });
    } else {
      const num = parseFloat(value);
      if (!isNaN(num) && num >= 0) {
        setChapterFilter({ maxChapters: value });
      }
    }
  };

  const clearFilters = () => {
    setChapterFilter({ minChapters: null, maxChapters: null });
  };

  const hasActiveFilter = !!(chapterFilter.minChapters || chapterFilter.maxChapters);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground" />
        <Label className="text-sm sm:text-sm font-medium">Chapter Count</Label>
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs sm:text-xs text-muted-foreground active:text-foreground sm:hover:text-foreground underline touch-manipulation min-h-[32px] sm:min-h-0 px-2"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="min-chapters" className="text-xs sm:text-xs text-muted-foreground">
            Min Chapters
          </Label>
          <Input
            id="min-chapters"
            type="number"
            placeholder="0"
            min="0"
            step="0.1"
            value={localMin}
            onChange={(e) => handleMinChange(e.target.value)}
            className="h-10 sm:h-9 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max-chapters" className="text-xs sm:text-xs text-muted-foreground">
            Max Chapters
          </Label>
          <Input
            id="max-chapters"
            type="number"
            placeholder="∞"
            min="0"
            step="0.1"
            value={localMax}
            onChange={(e) => handleMaxChange(e.target.value)}
            className="h-10 sm:h-9 text-base sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
}

