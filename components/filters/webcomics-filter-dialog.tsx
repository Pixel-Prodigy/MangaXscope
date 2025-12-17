"use client";

import { useState, useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, Check } from "lucide-react";
import { useQueryStates, parseAsArrayOf, parseAsString } from "nuqs";
import { cn } from "@/lib/utils";

const WEBCOMIC_STATUSES = [
  { id: "completed", name: "Completed" },
  { id: "ongoing", name: "Ongoing" },
] as const;

/**
 * Filter dialog for the Webcomics section.
 * Only includes status filter since genre tags from MangaDex don't apply to Consumet providers.
 */
export function WebcomicsFilterDialog() {
  const [open, setOpen] = useState(false);
  
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

  const activeFilterCount = useMemo(() => {
    return selectedStatuses.length;
  }, [selectedStatuses]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative flex-1 min-w-0 min-h-[44px] sm:min-h-[48px] rounded-xl">
          <Filter className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" />
          <span className="truncate text-sm sm:text-base">Filters</span>
          {activeFilterCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-1.5 sm:ml-2 bg-primary text-primary-foreground px-2 py-0.5 text-xs font-semibold shrink-0"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] sm:max-h-[90vh] max-w-md w-[95vw] sm:w-full flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b shrink-0">
          <DialogTitle className="text-xl sm:text-2xl">
            Webcomics Filters
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Filter webcomics by publication status
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
          <Card className="border-2 shadow-sm active:shadow-md sm:hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center justify-between">
                <span>Publication Status</span>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xs sm:text-sm text-muted-foreground mb-3">
                Tap to toggle status filter
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-2">
                {WEBCOMIC_STATUSES.map((status) => {
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
                    >
                      {isSelected && (
                        <Check className="mr-1.5 sm:mr-1 h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      )}
                      {status.name}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Info card about limited filters */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Note</p>
            <p>
              Genre filters are not available for webcomics as they use different data providers. 
              Use the search bar to find specific titles.
            </p>
          </div>
        </div>

        <div className="border-t px-4 sm:px-6 py-3 sm:py-4 bg-muted/30 shrink-0">
          <div className="flex justify-end">
            <Button
              onClick={() => setOpen(false)}
              size="lg"
              className="min-w-[120px] sm:min-w-[100px] h-11 sm:h-10 text-base sm:text-sm w-full sm:w-auto"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

