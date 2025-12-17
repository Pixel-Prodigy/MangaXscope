"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryStates, parseAsString } from "nuqs";
import type { ContentSection } from "@/types";

const DEBOUNCE_DELAY = 500;

export function SearchBar() {
  const [params, setParams] = useQueryStates(
    { 
      q: parseAsString.withDefault(""),
      section: parseAsString.withDefault("manga"),
    },
    { shallow: false }
  );

  const currentSection = (params.section || "manga") as ContentSection;

  const [localValue, setLocalValue] = useState(() => params.q || "");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalUpdateRef = useRef(false);

  // Dynamic placeholder based on section
  const placeholder = useMemo(() => {
    return currentSection === "webcomics" 
      ? "Search manhwa, manhua, webtoons..."
      : "Search manga...";
  }, [currentSection]);

  // Sync from URL to local state when URL changes externally
  useEffect(() => {
    if (!isInternalUpdateRef.current) {
      setLocalValue(params.q || "");
    }
    isInternalUpdateRef.current = false;
  }, [params.q]);

  const debouncedSetSearch = useCallback(
    (value: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (value.trim()) {
        setIsDebouncing(true);
      }

      debounceTimerRef.current = setTimeout(() => {
        setIsDebouncing(false);
        isInternalUpdateRef.current = true;
        setParams({ q: value.trim() || null });
      }, DEBOUNCE_DELAY);
    },
    [setParams]
  );

  const handleSearch = (value: string) => {
    setLocalValue(value);
    debouncedSetSearch(value);
  };

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
    isInternalUpdateRef.current = true;
    setParams({ q: null });
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors sm:left-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full pl-10 pr-12 sm:pl-11 sm:pr-14 h-11 sm:h-12 text-base rounded-xl border-border/60 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 sm:right-2">
        {isDebouncing && localValue && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {localValue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20 transition-colors"
            onClick={clearSearch}
            type="button"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
