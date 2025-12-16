"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { MainLogo } from "./ui/main-logo";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4">
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
          <MainLogo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
