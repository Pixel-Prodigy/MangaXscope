"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { generateAniyomiIntent, isAndroid } from "@/lib/utils";

interface OpenInAniyomiButtonProps {
  /**
   * The MangaDex manga ID
   */
  mangaId: string;
  
  /**
   * Optional className for styling
   */
  className?: string;
  
  /**
   * Optional variant for the button
   * @default "outline"
   */
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  
  /**
   * Optional size for the button
   * @default "lg"
   */
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  
  /**
   * Whether to show helper text below the button
   * @default true
   */
  showHelperText?: boolean;
}

/**
 * A button component that opens a MangaDex manga in AniYomi/Tachiyomi on Android devices.
 * 
 * This component:
 * - Only renders on Android devices
 * - Uses Android intent URLs to attempt opening the app
 * - Falls back to MangaDex website if app isn't installed
 * - Requires user interaction (button click) to work
 * 
 * @example
 * ```tsx
 * <OpenInAniyomiButton mangaId="abc123-def456" />
 * ```
 * 
 * @remarks
 * **Platform Limitations:**
 * - Websites cannot force-open Android apps without user interaction
 * - Intent URLs only work when triggered by user gestures (clicks)
 * 
 * **Browser Behavior:**
 * - Chrome: Fully supports intent URLs, will open app or fallback URL
 * - Firefox: May not support intent URLs properly; may just open fallback URL
 * - PWAs: Behavior depends on host browser (Chrome-based PWAs work best)
 * 
 * **App Compatibility:**
 * - Primary target: AniYomi (package: xyz.jmir.tachiyomi.mi)
 * - Also works with: Tachiyomi forks that register for MangaDex HTTPS URLs
 * - Requires: MangaDex extension installed in the app
 */
export function OpenInAniyomiButton({
  mangaId,
  className,
  variant = "outline",
  size = "lg",
  showHelperText = true,
}: OpenInAniyomiButtonProps) {
  // Initialize state directly to avoid setState in effect
  const [isAndroidDevice] = useState(() => {
    if (typeof window !== "undefined") {
      return isAndroid();
    }
    return false;
  });

  const handleClick = () => {
    if (!mangaId) {
      console.warn("OpenInAniyomiButton: mangaId is required");
      return;
    }

    try {
      const intentUrl = generateAniyomiIntent(mangaId);
      // Use window.location.href to trigger the intent
      // This requires user interaction (button click) to work
      window.location.href = intentUrl;
    } catch (error) {
      console.error("OpenInAniyomiButton: Failed to generate intent URL", error);
      // Fallback to direct MangaDex URL
      window.open(`https://mangadex.org/title/${mangaId}`, "_blank");
    }
  };

  // Only render on Android devices
  if (!isAndroidDevice) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        title="Open in AniYomi (requires AniYomi + MangaDex extension installed)"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Open in AniYomi
      </Button>
      {showHelperText && (
        <p className="text-xs text-muted-foreground">
          Requires AniYomi + MangaDex extension installed
        </p>
      )}
    </div>
  );
}

