import { Eye } from "lucide-react";

export function MainLogo() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Eye className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
      <span className="text-lg font-bold sm:text-xl">Manga Xscope</span>
    </div>
  );
}
