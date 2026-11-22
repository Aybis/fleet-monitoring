import { cn } from "@/lib/utils";

export function HorusEyeLogo({
  className,
  variant = "badge",
}: {
  className?: string;
  variant?: "badge" | "mark";
}) {
  const eyeSvg = (
    <svg
      viewBox="0 0 64 44"
      className={cn(variant === "badge" ? "h-7 w-10" : "h-7 w-10", className)}
      fill="none"
      aria-label="HORUS Eye Logo"
    >
      {/* Sleek Horus Falcon Brow Arc */}
      <path
        d="M8 15C16.5 6.5 26 4 36 5.5C44.5 6.8 51.5 11.2 57 17"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeOpacity="0.88"
      />

      {/* Main Stylized All-Seeing Eye Contour */}
      <path
        d="M7 22C13.5 13.5 22.8 10 32 10C41.2 10 50.5 13.5 57 22C50.5 30.5 41.2 34 32 34C22.8 34 13.5 30.5 7 22Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />

      {/* Horus Winged Telemetry Tail Extension (Right) */}
      <path
        d="M55.5 22H61.5"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Iconic Eye-of-Horus Under-Spiral Accent */}
      <path
        d="M32 34V39.5M38.5 33.2C41 37 44.5 39.2 48.5 38.5C50.6 38.1 51.8 36.7 51.4 35.1"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.92"
      />

      {/* Precision GPS Radar Iris Ring */}
      <circle
        cx="32"
        cy="22"
        r="7.8"
        stroke="currentColor"
        strokeWidth="2.4"
        fill="currentColor"
        fillOpacity="0.18"
      />

      {/* Inner Pupil Core */}
      <circle cx="32" cy="22" r="3.4" fill="currentColor" />

      {/* Glint / Satellite Highlight */}
      <circle cx="34.4" cy="19.6" r="1.35" fill="#ffffff" fillOpacity="0.92" />
    </svg>
  );

  if (variant === "mark") {
    return eyeSvg;
  }

  return (
    <div
      className={cn(
        "flex h-11 w-[74px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e60012] via-[#d91324] to-[#9f0b18] text-white shadow-[0_6px_20px_rgba(230,0,18,0.48)] ring-1 ring-white/15",
        className
      )}
    >
      {eyeSvg}
    </div>
  );
}
