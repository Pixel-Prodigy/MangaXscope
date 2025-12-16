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

export function GeneralFilterDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          General Filter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-2xl">General Filter</DialogTitle>
          <DialogDescription>
            Filter by category and chapter range
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Category</CardTitle>
            </CardHeader>
            <CardContent>
              <CategorySelect />
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Chapter Range</CardTitle>
            </CardHeader>
            <CardContent>
              <ChapterFilter />
            </CardContent>
          </Card>
        </div>

        <div className="border-t px-6 py-4 bg-muted/30 shrink-0">
          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)} size="lg" className="min-w-[100px]">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

