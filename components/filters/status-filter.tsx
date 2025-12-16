"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useQueryStates, parseAsArrayOf, parseAsString } from "nuqs";
import { cn } from "@/lib/utils";

type StatusFilter = {
  id: string;
  name: string;
  mode: "include" | "exclude" | null;
};

const statuses = [
  { id: "completed", name: "Completed" },
  { id: "ongoing", name: "Ongoing" },
];

export function StatusFilter() {
  const [statusParams, setStatusParams] = useQueryStates(
    {
      status: parseAsArrayOf(parseAsString).withDefault([]),
    },
    {
      shallow: false,
    }
  );

  const initializeFilters = () => {
    const filters = new Map<string, StatusFilter>();
    statuses.forEach((status) => {
      const isIncluded = statusParams.status.includes(status.id);
      filters.set(status.id, {
        id: status.id,
        name: status.name,
        mode: isIncluded ? "include" : null,
      });
    });
    return filters;
  };

  const [localFilters, setLocalFilters] = useState<Map<string, StatusFilter>>(
    initializeFilters()
  );

  useEffect(() => {
    setLocalFilters(initializeFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusParams.status]);

  const toggleStatus = (statusId: string, statusName: string) => {
    const current = localFilters.get(statusId);
    let newMode: "include" | "exclude" | null;

    if (!current || current.mode === null) {
      newMode = "include";
    } else {
      newMode = null;
    }

    const updated = new Map(localFilters);
    updated.set(statusId, {
      id: statusId,
      name: statusName,
      mode: newMode,
    });
    setLocalFilters(updated);

    const included: string[] = [];

    updated.forEach((filter) => {
      if (filter.mode === "include") {
        included.push(filter.id);
      }
    });

    setStatusParams({
      status: included.length > 0 ? included : null,
    });
  };

  const activeCount = Array.from(localFilters.values()).filter(
    (f) => f.mode !== null
  ).length;

  return (
    <div className="space-y-3">
      <div className="text-xs sm:text-sm text-muted-foreground">
        Tap to toggle status filter
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-2">
        {statuses.map((status) => {
          const filter = localFilters.get(status.id);
          const mode = filter?.mode || null;

          return (
            <Badge
              key={status.id}
              variant={mode === null ? "outline" : "secondary"}
              className={cn(
                "cursor-pointer transition-all active:scale-95 sm:hover:scale-105",
                "text-sm sm:text-sm px-4 sm:px-3 py-2.5 sm:py-1.5",
                "min-h-[40px] sm:min-h-0 touch-manipulation",
                mode === "include" && "bg-primary text-primary-foreground"
              )}
              onClick={() => toggleStatus(status.id, status.name)}
            >
              {mode === "include" && (
                <Check className="mr-1.5 sm:mr-1 h-3.5 w-3.5 sm:h-3 sm:w-3" />
              )}
              {status.name}
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
            setStatusParams({
              status: null,
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

