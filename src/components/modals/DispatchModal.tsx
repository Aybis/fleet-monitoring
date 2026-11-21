import { useState } from "react";
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { getTruckLoadKg, getTruckLoadPct, useHaulTrack } from "@/context/HaulTrackContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TruckStatus } from "@/types/haultrack";
import { cn, formatTons, formatWeight } from "@/lib/utils";

export function DispatchModal() {
  const {
    dispatchModalOpen,
    setDispatchModalOpen,
    activeTruck,
    activeDriver,
    settings,
    dispatchTruck,
    flashSlot,
    setActivePage,
  } = useHaulTrack();

  const [targetStatus, setTargetStatus] = useState<TruckStatus>("In Transit");

  const loadKg = getTruckLoadKg(activeTruck);
  const pct = getTruckLoadPct(activeTruck);
  const occupiedSlots = activeTruck.slots.filter((s) => s.cargo);
  const flaggedSlots = occupiedSlots.filter((s) => s.cargo?.condition === "inspection");

  // Front (cols 1-2), Mid (cols 3-4), Rear (cols 5-6) axle load balance
  const zoneKg = (cols: number[]) =>
    activeTruck.slots
      .filter((s) => cols.includes(s.col) && s.cargo)
      .reduce((acc, s) => acc + (s.cargo?.weightKg ?? 0), 0);

  const frontKg = zoneKg([1, 2]);
  const midKg = zoneKg([3, 4]);
  const rearKg = zoneKg([5, 6]);

  const handleConfirm = () => {
    dispatchTruck(activeTruck.id, targetStatus);
    setDispatchModalOpen(false);
  };

  return (
    <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white">
              <Truck className="h-4 w-4" />
            </span>
            Dispatch Control — {activeTruck.id}
          </DialogTitle>
          <DialogDescription>
            Verify cargo manifest, axle weight distribution, and pre-departure clearance before
            releasing {activeTruck.id}.
          </DialogDescription>
        </DialogHeader>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-border bg-muted/35 p-3">
            <p className="text-[11px] text-muted-foreground">Total Payload</p>
            <p className="mt-0.5 text-sm font-extrabold text-foreground tabular-nums">
              {formatTons(loadKg, settings.weightUnit)}
            </p>
            <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
              {pct}% of max
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/35 p-3">
            <p className="text-[11px] text-muted-foreground">Loaded Bays</p>
            <p className="mt-0.5 text-sm font-extrabold text-foreground tabular-nums">
              {occupiedSlots.length} / 18
            </p>
            <p className="text-[11px] text-muted-foreground">{activeTruck.dock}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/35 p-3">
            <p className="text-[11px] text-muted-foreground">Corridor</p>
            <p className="mt-0.5 text-sm font-extrabold text-foreground">
              {activeTruck.route.originCode} → {activeTruck.route.destinationCode}
            </p>
            <p className="text-[11px] text-muted-foreground">ETA {activeTruck.route.eta}</p>
          </div>
        </div>

        {/* Axle Weight Distribution Check */}
        <div className="mt-3 rounded-xl border border-border p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Scale className="h-3.5 w-3.5 text-red-600" />
              Axle Load Distribution
            </span>
            <Badge variant={pct <= 90 ? "express" : "warning"}>
              {pct <= 90 ? "DOT Balanced" : "Near Max"}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { label: "Front (Cols 1–2)", kg: frontKg },
              { label: "Center (Cols 3–4)", kg: midKg },
              { label: "Rear (Cols 5–6)", kg: rearKg },
            ].map((z) => {
              const share = loadKg > 0 ? Math.round((z.kg / loadKg) * 100) : 0;
              return (
                <div key={z.label} className="rounded-lg bg-muted/50 p-2">
                  <p className="text-[10px] text-muted-foreground">{z.label}</p>
                  <p className="mt-0.5 font-bold text-foreground tabular-nums">
                    {formatWeight(z.kg, settings.weightUnit)}
                  </p>
                  <p className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                    {share}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pre-Departure Checklist */}
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-red-600" />
              Driver Assigned: {activeDriver.name} ({activeDriver.license})
            </span>
            <span className="text-[11px] font-semibold text-red-600">Cleared</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
            <span className="flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 text-red-600" />
              Route Manifest: {activeTruck.route.originCity} → {activeTruck.route.destinationCity} (
              {activeTruck.route.distanceMiles} mi)
            </span>
            <span className="text-[11px] font-semibold text-red-600">Verified</span>
          </div>

          {flaggedSlots.length > 0 ? (
            <div className="flex items-center justify-between rounded-xl border border-amber-400/50 bg-amber-500/8 px-3 py-2">
              <span className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                {flaggedSlots.length} slot ({flaggedSlots.map((s) => s.id).join(", ")}) flagged for
                strap check
              </span>
              <button
                type="button"
                onClick={() => {
                  setDispatchModalOpen(false);
                  setActivePage("dashboard");
                  flashSlot(flaggedSlots[0].id);
                }}
                className="cursor-pointer text-[11px] font-bold text-amber-700 underline dark:text-amber-300"
              >
                Inspect
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
              <span className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-red-600" />
                All {occupiedSlots.length} occupied bays passed seal &amp; strap verification
              </span>
              <span className="text-[11px] font-semibold text-red-600">100%</span>
            </div>
          )}
        </div>

        {/* Status Mode Selector */}
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Set Vehicle Status</p>
          <div className="grid grid-cols-3 gap-2">
            {(["In Transit", "Ready to Dispatch", "Loading"] as TruckStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTargetStatus(st)}
                className={cn(
                  "cursor-pointer rounded-xl border px-2 py-2 text-xs font-semibold transition-all",
                  targetStatus === st
                    ? "border-red-600 bg-red-600/12 text-red-700 dark:text-red-300"
                    : "border-border hover:bg-muted"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDispatchModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm &amp; Dispatch {activeTruck.id}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
