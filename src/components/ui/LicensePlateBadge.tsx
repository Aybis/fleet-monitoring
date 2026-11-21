import { cn } from "@/lib/utils";

export function LicensePlateBadge({
  plate,
  plateType = "commercial",
  expiry,
  size = "sm",
  showExpiry = false,
  className,
}: {
  plate: string;
  plateType?: "commercial" | "corporate";
  expiry?: string;
  size?: "xs" | "sm" | "md";
  showExpiry?: boolean;
  className?: string;
}) {
  const isYellow = plateType === "commercial";

  return (
    <span
      title={`TNKB Indonesia (${isYellow ? "Plat Kuning · Angkutan Barang" : "Plat Putih · Operasional"}): ${plate}${expiry ? ` · Exp ${expiry}` : ""}`}
      className={cn(
        "inline-flex flex-col items-center justify-center rounded-[5px] border-[1.5px] font-mono font-black uppercase tracking-[0.06em] shadow-[0_1px_3px_rgba(15,23,42,0.14)] select-none",
        isYellow
          ? "border-slate-900 bg-[#facc15] text-slate-950"
          : "border-slate-900 bg-white text-slate-950 dark:border-slate-200",
        size === "xs" && "px-1.5 py-[2px] text-[9.5px] leading-tight",
        size === "sm" && "px-2 py-[3px] text-[11px] leading-tight",
        size === "md" && "px-2.5 py-1 text-[12px] leading-tight",
        className
      )}
    >
      <span className="tabular-nums whitespace-nowrap">{plate}</span>
      {showExpiry && expiry && (
        <span className="mt-[1px] text-[7.5px] font-bold tracking-[0.14em] opacity-80 tabular-nums">
          {expiry}
        </span>
      )}
    </span>
  );
}
