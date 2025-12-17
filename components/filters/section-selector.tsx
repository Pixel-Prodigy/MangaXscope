"use client";

import { useQueryStates, parseAsString, parseAsArrayOf } from "nuqs";
import { cn } from "@/lib/utils";
import type { ContentSection, WebcomicType } from "@/types";

const SECTIONS = [
  { id: "manga", label: "Manga", description: "Japanese comics" },
  { id: "webcomics", label: "Webcomics", description: "Manhwa, Manhua, Webtoons" },
] as const;

const WEBCOMIC_TYPES = [
  { id: "manhwa", label: "Manhwa", description: "Korean" },
  { id: "manhua", label: "Manhua", description: "Chinese" },
  { id: "webtoon", label: "Webtoon", description: "All formats" },
] as const;

interface SectionSelectorProps {
  className?: string;
}

/**
 * Section Selector Component
 * 
 * Provides clear UI separation between:
 * - Manga Section (MangaDex)
 * - Webcomics Section (Consumet multi-provider)
 * 
 * When Webcomics is selected, shows additional type filter (Manhwa/Manhua/Webtoon)
 */
export function SectionSelector({ className }: SectionSelectorProps) {
  const [params, setParams] = useQueryStates(
    {
      section: parseAsString.withDefault("manga"),
      webcomicType: parseAsString,
      // Genre filters (MangaDex-specific)
      include: parseAsArrayOf(parseAsString),
      exclude: parseAsArrayOf(parseAsString),
      // Chapter filters
      minChapters: parseAsString,
      maxChapters: parseAsString,
    },
    { shallow: false }
  );

  const currentSection = params.section as ContentSection;
  const currentWebcomicType = params.webcomicType as WebcomicType | null;

  const handleSectionChange = (section: ContentSection) => {
    if (section === "manga") {
      // Switching to manga - clear webcomic-specific filters
      setParams({ 
        section, 
        webcomicType: null,
      });
    } else {
      // Switching to webcomics - clear manga-specific filters (genres)
      setParams({ 
        section,
        include: null,
        exclude: null,
        minChapters: null,
        maxChapters: null,
      });
    }
  };

  const handleWebcomicTypeChange = (type: WebcomicType | null) => {
    setParams({ webcomicType: type });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Section Tabs */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionChange(section.id as ContentSection)}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 px-4 rounded-lg transition-all",
              "text-sm font-medium",
              currentSection === section.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <span>{section.label}</span>
            <span className="text-[10px] font-normal opacity-70">
              {section.description}
            </span>
          </button>
        ))}
      </div>

      {/* Webcomic Type Filter (only visible when webcomics section is selected) */}
      {currentSection === "webcomics" && (
        <div className="flex flex-wrap gap-2">
          {/* All option */}
          <button
            onClick={() => handleWebcomicTypeChange(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              "border",
              !currentWebcomicType
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>

          {WEBCOMIC_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleWebcomicTypeChange(type.id as WebcomicType)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                "border",
                currentWebcomicType === type.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{type.label}</span>
              <span className="ml-1 text-[10px] opacity-70">({type.description})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact Section Toggle
 * For use in filter dialogs or smaller spaces
 */
export function SectionToggle({ className }: { className?: string }) {
  const [params, setParams] = useQueryStates(
    {
      section: parseAsString.withDefault("manga"),
    },
    { shallow: false }
  );

  const currentSection = params.section as ContentSection;

  return (
    <div className={cn("inline-flex gap-1 p-1 bg-muted rounded-lg", className)}>
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          onClick={() => setParams({ section: section.id })}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            currentSection === section.id
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}

