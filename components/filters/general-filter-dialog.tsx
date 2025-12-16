"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { CategorySelect } from "./category-select";
import { ChapterFilter } from "./chapter-filter";
import { StatusFilter } from "./status-filter";

export function GeneralFilterDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative flex-1 min-w-0">
          <Filter className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">General Filter</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] sm:max-h-[90vh] max-w-2xl w-[95vw] sm:w-full flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b shrink-0">
          <DialogTitle className="text-xl sm:text-2xl">
            General Filter
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Filter by category, chapter range, and status
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
          <Card className="border-2 shadow-sm active:shadow-md sm:hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-sm sm:text-base font-semibold">
                Category
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <CategorySelect />
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm active:shadow-md sm:hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-sm sm:text-base font-semibold">
                Chapter Range
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <ChapterFilter />
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm active:shadow-md sm:hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-sm sm:text-base font-semibold">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <StatusFilter />
            </CardContent>
          </Card>
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
