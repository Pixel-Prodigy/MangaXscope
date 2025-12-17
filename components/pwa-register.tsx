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
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);

          // Check for updates periodically
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New version available - can optionally prompt user
                  console.log("[PWA] New version available");
                }
              });
            }
          });

          // Check for updates every 60 minutes
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          // Silently fail if service worker doesn't exist
          console.debug("[PWA] Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}

