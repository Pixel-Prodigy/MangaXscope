/**
 * Source abstraction layer.
 * 
 * @deprecated This module is deprecated in favor of /lib/providers.
 * Use the provider abstraction for new code.
 * 
 * This file is kept for backward compatibility with existing code
 * during the migration period.
 */

export * from "./types";
export * from "./mangadex";

// Re-export providers for gradual migration
export { mangadexProvider } from "@/lib/providers/mangadex";
export { consumetProvider } from "@/lib/providers/consumet";
