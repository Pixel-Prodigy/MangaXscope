"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useQueryStates, parseAsArrayOf, parseAsString } from "nuqs";
import { cn } from "@/lib/utils";

const STATUSES = [
  { id: "ongoing", name: "Ongoing", description: "Currently publishing" },
  { id: "completed", name: "Completed", description: "Finished" },
  { id: "hiatus", name: "Hiatus", description: "On break" },
] as const;

export function StatusFilter() {
  const [statusParams, setStatusParams] = useQueryStates(
    {
      status: parseAsArrayOf(parseAsString).withDefault([]),
    },
    { shallow: false }
  );

  const selectedStatuses = statusParams.status;

  const toggleStatus = (statusId: string) => {
    const isSelected = selectedStatuses.includes(statusId);
    const newStatuses = isSelected
      ? selectedStatuses.filter((s) => s !== statusId)
      : [...selectedStatuses, statusId];
    
    setStatusParams({
      status: newStatuses.length > 0 ? newStatuses : null,
    });
  };

  const clearFilters = () => {
    setStatusParams({ status: null });
  };

  const activeCount = selectedStatuses.length;

  return (
    <div className="space-y-3">
      <div className="text-xs sm:text-sm text-muted-foreground">
        Tap to toggle status filter
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-2">
        {STATUSES.map((status) => {
          const isSelected = selectedStatuses.includes(status.id);

          return (
            <Badge
              key={status.id}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all active:scale-95 sm:hover:scale-105",
                "text-sm sm:text-sm px-4 sm:px-3 py-2.5 sm:py-1.5",
                "min-h-[40px] sm:min-h-0 touch-manipulation",
                isSelected && "bg-primary text-primary-foreground"
              )}
              onClick={() => toggleStatus(status.id)}
              title={status.description}
            >
              {isSelected && (
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
          onClick={clearFilters}
          className="h-9 sm:h-8 text-xs sm:text-xs w-full sm:w-auto touch-manipulation"
        >
          Clear All
        </Button>
      )}
    </div>
  );
}

