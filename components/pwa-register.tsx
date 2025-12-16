"use client";

import { useEffect } from "react";

/**
 * PWA Register Component
 * Handles service worker registration for Progressive Web App functionality
 */
export function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      // Register service worker if available
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          // Silently fail if service worker doesn't exist
          // This is expected if sw.js is not yet implemented
          console.debug("Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}

