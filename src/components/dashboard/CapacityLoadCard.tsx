import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getTruckLoadKg, getTruckLoadPct, useHaulTrack } from "@/context/HaulTrackContext";
import { Card } from "@/components/ui/card";
import { cn, formatTons, formatWeight } from "@/lib/utils";

export function CapacityLoadCard() {
  const { activeTruck, settings } = useHaulTrack();
  const [expanded, setExpanded] = useState(false);

  const loadKg = getTruckLoadKg(activeTruck);
  const pct = getTruckLoadPct(activeTruck);
  const remainingKg = Math.max(0, activeTruck.maxCapacityKg - loadKg);
  const occupiedCount = activeTruck.slots.filter((s) => s.cargo).length;

  // Compute tier weights (A = top, B = middle, C = bottom floor)
  const tierWeight = (row: "A" | "B" | "C") =>
    activeTruck.slots
      .filter((s) => s.row === row && s.cargo)
      .reduce((acc, s) => acc + (s.cargo?.weightKg ?? 0), 0);

  const rowA = tierWeight("A");
  const rowB = tierWeight("B");
  const rowC = tierWeight("C");

  // SVG Ring Geometry
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(100, Math.max(0, pct));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  const ringColor =
    pct >= 95
      ? "stroke-orange-600"
      : pct >= settings.overloadWarningPct
      ? "stroke-amber-500"
      : "stroke-[#d91324] dark:stroke-red-500";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold tracking-tight text-foreground">
          Capacity &amp; Load
        </h3>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {occupiedCount}/18 bays
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Main Donut + Tonnage Readout matching reference screenshot */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex w-full cursor-pointer items-center gap-4 text-left focus:outline-none"
      >
        <div className="relative flex h-[96px] w-[96px] shrink-0 items-center justify-center">
          <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              strokeWidth="8.5"
              className="stroke-slate-100 dark:stroke-slate-800"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              strokeWidth="8.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn("transition-all duration-500 ease-out", ringColor)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[20px] font-extrabold leading-none tracking-tight text-foreground tabular-nums">
              {pct}%
            </span>
            <span className="mt-1 text-[11px] font-medium text-muted-foreground">Weight</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Current load</p>
            <p className="mt-0.5 text-[17px] font-extrabold leading-tight text-foreground tabular-nums">
              {formatTons(loadKg, settings.weightUnit)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Max capacity</p>
            <p className="mt-0.5 text-[15px] font-bold leading-tight text-foreground tabular-nums">
              {formatTons(activeTruck.maxCapacityKg, settings.weightUnit)}
            </p>
          </div>
        </div>
      </button>

      {/* Expandable Center-of-Gravity / Tier Weight Breakdown */}
      {expanded && (
        <div className="mt-3.5 space-y-2 border-t border-border/70 pt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">Tier Balance Breakdown</span>
            <span className="text-muted-foreground tabular-nums">
              {formatWeight(remainingKg, settings.weightUnit)} free
            </span>
          </div>
          {[
            { label: "Top Tier (A1–A6)", kg: rowA, ideal: "Light" },
            { label: "Mid Tier (B1–B6)", kg: rowB, ideal: "Medium" },
            { label: "Floor Tier (C1–C6)", kg: rowC, ideal: "Heavy" },
          ].map((tier) => {
            const share = loadKg > 0 ? Math.round((tier.kg / loadKg) * 100) : 0;
            return (
              <div key={tier.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{tier.label}</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatWeight(tier.kg, settings.weightUnit)} ({share}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-300"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
