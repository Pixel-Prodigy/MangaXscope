import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if the user is on an Android device
 */
export function isAndroid(): boolean {
  if (typeof window === "undefined") return false
  return /Android/i.test(navigator.userAgent)
}
