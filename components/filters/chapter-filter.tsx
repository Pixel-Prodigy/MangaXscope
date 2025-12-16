"use client";

import { useState, useEffect } from "react";
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

  const [localMin, setLocalMin] = useState(chapterFilter.minChapters || "");
  const [localMax, setLocalMax] = useState(chapterFilter.maxChapters || "");

  useEffect(() => {
    setLocalMin(chapterFilter.minChapters || "");
    setLocalMax(chapterFilter.maxChapters || "");
  }, [chapterFilter.minChapters, chapterFilter.maxChapters]);

  const handleMinChange = (value: string) => {
    setLocalMin(value);
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
    setLocalMax(value);
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
    setLocalMin("");
    setLocalMax("");
    setChapterFilter({ minChapters: null, maxChapters: null });
  };

  const hasActiveFilter = !!(chapterFilter.minChapters || chapterFilter.maxChapters);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Chapter Count</Label>
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="min-chapters" className="text-xs text-muted-foreground">
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
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max-chapters" className="text-xs text-muted-foreground">
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
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}

