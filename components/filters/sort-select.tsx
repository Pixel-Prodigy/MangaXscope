"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryStates, parseAsString } from "nuqs";

export function SortSelect() {
  const [sort, setSort] = useQueryStates(
    {
      type: parseAsString.withDefault("latest"),
    },
    {
      shallow: false,
    }
  );

  return (
    <Select
      value={sort.type}
      onValueChange={(value) => setSort({ type: value })}
    >
      <SelectTrigger className="w-full flex-1 min-w-0">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="latest">Latest</SelectItem>
        <SelectItem value="popular">Popular</SelectItem>
      </SelectContent>
    </Select>
  );
}
