"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryStates, parseAsString } from "nuqs";

const DEBOUNCE_DELAY = 500; // milliseconds

export function SearchBar() {
  const [search, setSearch] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
    },
    {
      shallow: false,
    }
  );

  const [localValue, setLocalValue] = useState(search.q || "");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value with URL param when it changes externally
  useEffect(() => {
    setLocalValue(search.q || "");
  }, [search.q]);

  // Debounced search update
  const debouncedSetSearch = useCallback(
    (value: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Show debouncing indicator if there's a value
      if (value.trim()) {
        setIsDebouncing(true);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        setIsDebouncing(false);
        setSearch({ q: value.trim() || null, page: 1 }); // Reset to page 1 on new search
      }, DEBOUNCE_DELAY);
    },
    [setSearch]
  );

  const handleSearch = (value: string) => {
    setLocalValue(value);
    debouncedSetSearch(value);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const clearSearch = () => {
    setLocalValue("");
    setIsDebouncing(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearch({ q: null, page: 1 });
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
      <Input
        type="text"
        placeholder="Search for manga..."
        value={localValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full pl-10 pr-10 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {isDebouncing && localValue && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {localValue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
            onClick={clearSearch}
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

