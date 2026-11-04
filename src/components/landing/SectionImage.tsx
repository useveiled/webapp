import Image from "next/image";
import { cn } from "@/lib/utils";

/* Full-bleed photographic backdrop for a section. Rendered only when the
   image exists. The overlay keeps text contrast and fades the image into
   the page ink at the edges so sections never show a hard seam. */
export function SectionImage({
  src,
  className,
  fade = "both",
  opacity = 0.55,
  position = "center",
  priority = false,
}: {
  src: string | null;
  className?: string;
  fade?: "both" | "bottom" | "top";
  opacity?: number;
  position?: string;
  priority?: boolean;
}) {
  if (!src) return null;
  const mask =
    fade === "bottom"
      ? "linear-gradient(to bottom, black 55%, transparent 100%)"
      : fade === "top"
        ? "linear-gradient(to top, black 55%, transparent 100%)"
        : "linear-gradient(to bottom, transparent 0%, black 22%, black 72%, transparent 100%)";
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <Image
        src={src}
        alt=""
        fill
        quality={90}
        priority={priority}
        sizes="100vw"
        className="object-cover"
        style={{ opacity, objectPosition: position }}
      />
      {/* Ink wash for contrast: heavier on the left where copy sits */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,11,0.72)_0%,rgba(5,7,11,0.25)_60%,rgba(5,7,11,0.45)_100%)]" />
    </div>
  );
}
