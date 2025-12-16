import Image from "next/image";

export function MainLogo() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="relative h-10 w-5 overflow-hidden rounded-full ">
        <Image
          src="/hat.png"
          alt="Manga Xscope Logo"
          fill
          className="object-contain"
        />
      </div>
      <span className="text-lg font-bold sm:text-xl">Manga Xscope</span>
    </div>
  );
}
