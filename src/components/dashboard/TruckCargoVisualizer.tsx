import { useState } from "react";
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  Snowflake,
  ArrowRightLeft,
  Trash2,
  Package,
  MapPin,
  Clock,
  User,
  Cpu,
  ArrowUpRight,
} from "lucide-react";
import { getVehicleObdHealth, useHaulTrack } from "@/context/HaulTrackContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CargoSlot, SlotCondition } from "@/types/haultrack";
import { cn, formatCompactWeight, formatWeight } from "@/lib/utils";

export function TruckCargoVisualizer() {
  const {
    activeTruck,
    selectedSlotId,
    setSelectedSlotId,
    highlightedSlotId,
    settings,
    assignShipmentToSlot,
    unloadSlot,
    moveSlotCargo,
    updateSlotCondition,
    setActivePage,
    obdCatalog,
    lookupDtc,
  } = useHaulTrack();

  const [inspectSlotId, setInspectSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string>("");

  const inspectedSlot: CargoSlot | undefined = inspectSlotId
    ? activeTruck.slots.find((s) => s.id === inspectSlotId)
    : undefined;

  const emptySlots = activeTruck.slots.filter((s) => !s.cargo);
  const verifiedCount = activeTruck.slots.filter(
    (s) => s.cargo?.condition === "verified"
  ).length;
  const tempCount = activeTruck.slots.filter(
    (s) => s.cargo?.condition === "temperature"
  ).length;
  const inspectCount = activeTruck.slots.filter(
    (s) => s.cargo?.condition === "inspection"
  ).length;

  const obdHealth = getVehicleObdHealth(activeTruck, obdCatalog);
  const leadCode = activeTruck.obd.activeCodes[0]?.code;
  const leadCodeInfo = leadCode ? lookupDtc(leadCode) : null;

  const handleSlotClick = (slot: CargoSlot) => {
    if (slot.cargo) {
      setInspectSlotId(slot.id);
      setMoveTargetId(emptySlots[0]?.id ?? "");
    } else {
      setSelectedSlotId(slot.id);
    }
  };

  const handleDropOnSlot = (e: React.DragEvent, targetSlotId: string) => {
    e.preventDefault();
    setDragOverSlotId(null);
    const draggedShipmentId = e.dataTransfer.getData("application/x-haultrack-shipment");
    if (draggedShipmentId) {
      assignShipmentToSlot(draggedShipmentId, targetSlotId);
      return;
    }
    const draggedFromSlot = e.dataTransfer.getData("application/x-haultrack-slot");
    if (draggedFromSlot && draggedFromSlot !== targetSlotId) {
      moveSlotCargo(draggedFromSlot, targetSlotId);
    }
  };

  return (
    <>
      <div className="relative flex flex-col">
        {/* Top Isuzu Model + Live OBD-II & GPS Quick Strip */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-[#d91324] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              ISUZU {activeTruck.series}
            </span>
            <span className="text-xs font-bold text-foreground">{activeTruck.model}</span>
            <LicensePlateBadge
              plate={activeTruck.plate}
              plateType={activeTruck.plateType}
              expiry={activeTruck.plateExpiry}
              size="xs"
            />
            <span className="hidden text-xs text-muted-foreground md:inline">
              · {activeTruck.engine}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePage("map")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-xs transition-colors hover:border-red-500/50 hover:text-red-700 dark:hover:text-red-300"
            >
              <MapPin className="h-3 w-3 text-red-600" />
              <span className="max-w-[190px] truncate">{activeTruck.route.currentLocation}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePage("obd")}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all hover:opacity-90",
                obdHealth === "Critical"
                  ? "border-red-500/50 bg-red-600 text-white"
                  : obdHealth === "Warning"
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300"
                  : "border-border bg-card text-foreground"
              )}
            >
              <Cpu className="h-3 w-3" />
              {leadCodeInfo
                ? `OBD-II ${leadCodeInfo.code}: ${leadCodeInfo.subsystem}`
                : "OBD-II: 0 Faults"}
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Truck Hero Stage with Pixel-Aligned Interactive 3x6 Cargo Grid */}
        <div className="relative w-full overflow-x-auto pb-1">
          <div className="relative w-full min-w-[640px] select-none">
            <div
              style={{ aspectRatio: activeTruck.imageAspect }}
              className="relative w-full"
            >
              {/* Studio Cutout Isuzu Vehicle */}
              <img
                src={activeTruck.imageSrc}
                alt={`${activeTruck.model} side profile`}
                draggable={false}
                className="pointer-events-none h-full w-full object-contain drop-shadow-[0_14px_24px_rgba(15,23,42,0.12)] dark:brightness-95"
              />

              {/* Interactive Cargo Bay Grid aligned precisely inside trailer box frame */}
              {activeTruck.supportsCargoGrid && activeTruck.cargoGridBounds && (
                <div
                  style={{
                    left: activeTruck.cargoGridBounds.left,
                    top: activeTruck.cargoGridBounds.top,
                    width: activeTruck.cargoGridBounds.width,
                    height: activeTruck.cargoGridBounds.height,
                  }}
                  className="absolute grid grid-cols-6 grid-rows-3 gap-[4px] rounded-[4px] bg-[#edf2f7]/95 p-[5px] shadow-inner dark:bg-[#0f1a20]/95 sm:gap-[5px] sm:p-[6px]"
                >
                  {activeTruck.slots.map((slot) => {
                    const isSelected = !slot.cargo && selectedSlotId === slot.id;
                    const isFlashed = highlightedSlotId === slot.id;
                    const isDragOver = dragOverSlotId === slot.id;

                    if (!slot.cargo) {
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSlotClick(slot)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverSlotId(slot.id);
                          }}
                          onDragLeave={() => setDragOverSlotId(null)}
                          onDrop={(e) => handleDropOnSlot(e, slot.id)}
                          title={`Select empty slot ${slot.id} for assignment`}
                          className={cn(
                            "group relative flex cursor-pointer flex-col items-start justify-between rounded-[8px] border bg-white/90 p-1.5 text-left transition-all dark:bg-slate-900/80 sm:p-2",
                            isSelected
                              ? "border-2 border-red-500 bg-red-50/95 shadow-[0_0_0_3px_rgba(217,19,36,0.18)] dark:bg-red-950/60"
                              : "border-slate-200/90 hover:border-red-400/70 hover:bg-red-50/40 dark:border-slate-700/80 dark:hover:border-red-500/60",
                            isDragOver &&
                              "scale-[1.03] border-2 border-dashed border-red-500 bg-red-500/15",
                            isFlashed && "ring-2 ring-red-500 animate-pulse"
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span
                              className={cn(
                                "text-[10px] font-bold leading-none sm:text-[11px] 2xl:text-[13px]",
                                isSelected
                                  ? "text-red-700 dark:text-red-300"
                                  : "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              {slot.id}
                            </span>
                            {isSelected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500 2xl:h-2 2xl:w-2" />
                            )}
                          </div>

                          <div className="flex w-full flex-1 items-center justify-center">
                            <Plus
                              className={cn(
                                "h-3.5 w-3.5 transition-transform group-hover:scale-125 sm:h-4 sm:w-4 2xl:h-5 2xl:w-5",
                                isSelected
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-slate-400 group-hover:text-red-600"
                              )}
                            />
                          </div>
                        </button>
                      );
                    }

                    const cond = slot.cargo.condition;
                    const borderStyle =
                      cond === "inspection"
                        ? "border-amber-400/90 bg-gradient-to-br from-white to-amber-50/70 dark:from-slate-900 dark:to-amber-950/30"
                        : cond === "temperature"
                        ? "border-sky-400/85 bg-gradient-to-br from-white to-sky-50/75 dark:from-slate-900 dark:to-sky-950/35"
                        : "border-red-400/85 bg-gradient-to-br from-white to-red-50/65 dark:from-slate-900 dark:to-red-950/35";

                    const dotStyle =
                      cond === "inspection"
                        ? "bg-amber-500 ring-2 ring-amber-500/30"
                        : cond === "temperature"
                        ? "bg-sky-500"
                        : "bg-red-600";

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-haultrack-slot", slot.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverSlotId(slot.id);
                        }}
                        onDragLeave={() => setDragOverSlotId(null)}
                        onDrop={(e) => handleDropOnSlot(e, slot.id)}
                        onClick={() => handleSlotClick(slot)}
                        title={`${slot.id}: ${slot.cargo.shipmentCode} · ${slot.cargo.title} (${formatWeight(
                          slot.cargo.weightKg,
                          settings.weightUnit
                        )}) — Click to inspect or drag to move`}
                        className={cn(
                          "group relative flex cursor-pointer flex-col justify-between rounded-[8px] border-[1.5px] p-1.5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-2",
                          borderStyle,
                          isDragOver && "scale-[1.03] ring-2 ring-red-500",
                          isFlashed && "scale-[1.04] ring-2 ring-red-500 shadow-lg"
                        )}
                      >
                        <div className="flex w-full items-center justify-between gap-1">
                          <span className="text-[10px] font-extrabold leading-none text-slate-800 dark:text-slate-100 sm:text-[11px] 2xl:text-[13px]">
                            {slot.id}
                          </span>
                          <span
                            className={cn("h-1.5 w-1.5 shrink-0 rounded-full 2xl:h-2 2xl:w-2", dotStyle)}
                          />
                        </div>

                        <div className="mt-auto space-y-0.5">
                          <p className="text-[9.5px] font-semibold leading-tight text-slate-600 tabular-nums dark:text-slate-300 sm:text-[11px] 2xl:text-[13px]">
                            {formatCompactWeight(slot.cargo.weightKg, settings.weightUnit)}
                          </p>
                          <p className="truncate text-[9px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-[10.5px] 2xl:text-[12.5px]">
                            {slot.cargo.shipmentCode}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Open-Bed Utility Slots Tray for Isuzu D-MAX Crew Cab */}
        {!activeTruck.supportsCargoGrid && (
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
            {activeTruck.slots.slice(12, 18).map((slot) => {
              const isSelected = !slot.cargo && selectedSlotId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleSlotClick(slot)}
                  className={cn(
                    "flex cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition-all",
                    slot.cargo
                      ? "border-red-400/80 bg-card hover:shadow-md"
                      : isSelected
                      ? "border-2 border-red-600 bg-red-50/70 dark:bg-red-950/30"
                      : "border-dashed border-border bg-card/60 hover:border-red-400"
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Bed {slot.id}</span>
                    {slot.cargo ? (
                      <span className="h-2 w-2 rounded-full bg-red-600" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  {slot.cargo ? (
                    <div className="mt-2">
                      <p className="text-xs font-extrabold">{slot.cargo.shipmentCode}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{slot.cargo.title}</p>
                      <p className="mt-1 text-[11px] font-semibold tabular-nums">
                        {formatWeight(slot.cargo.weightKg, settings.weightUnit)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-muted-foreground">Open bed zone</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Subtle Interactive Legend Strip under Truck */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              Verified ({verifiedCount})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Cold-Chain ({tempCount})
            </span>
            {inspectCount > 0 && (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Check Required ({inspectCount})
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border border-slate-400 bg-white dark:bg-slate-800" />
              Open Bays ({emptySlots.length})
            </span>
          </div>
          <span className="hidden text-[11px] text-muted-foreground/80 sm:inline">
            Click any bay to inspect · Drag cargo to rebalance
          </span>
        </div>
      </div>

      {/* Occupied Slot Inspector Dialog */}
      <Dialog open={Boolean(inspectedSlot)} onOpenChange={(open) => !open && setInspectSlotId(null)}>
        <DialogContent>
          {inspectedSlot?.cargo && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-sm font-extrabold text-white">
                    {inspectedSlot.id}
                  </span>
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {inspectedSlot.cargo.shipmentCode}
                      <Badge
                        variant={
                          inspectedSlot.cargo.priority === "Express"
                            ? "express"
                            : inspectedSlot.cargo.priority === "Same-day"
                            ? "sameday"
                            : "standard"
                        }
                      >
                        {inspectedSlot.cargo.priority}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription>{inspectedSlot.cargo.title}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-border bg-muted/35 p-3.5 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Customer</p>
                    <p className="font-semibold text-foreground">{inspectedSlot.cargo.customer}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Load &amp; Volume</p>
                    <p className="font-semibold text-foreground tabular-nums">
                      {formatWeight(inspectedSlot.cargo.weightKg, settings.weightUnit)} ·{" "}
                      {inspectedSlot.cargo.quantity} {inspectedSlot.cargo.cargoType.toLowerCase()}s
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Corridor &amp; Method</p>
                    <p className="font-semibold text-foreground">
                      {inspectedSlot.cargo.originCode} → {inspectedSlot.cargo.destinationCode} ·{" "}
                      {inspectedSlot.cargo.method}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Loaded At</p>
                    <p className="font-semibold text-foreground tabular-nums">
                      {inspectedSlot.cargo.loadedAt}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border/70 bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Handling Note: </strong>
                {inspectedSlot.cargo.notes}
              </div>

              {/* Condition Switcher */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Bay Verification Status
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "verified", label: "Verified", icon: CheckCircle2 },
                      { id: "temperature", label: "Cold-Chain", icon: Snowflake },
                      { id: "inspection", label: "Check Strap", icon: AlertTriangle },
                    ] as Array<{
                      id: SlotCondition;
                      label: string;
                      icon: React.ComponentType<{ className?: string }>;
                    }>
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = inspectedSlot.cargo?.condition === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSlotCondition(inspectedSlot.id, opt.id)}
                        className={cn(
                          "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all",
                          active
                            ? "border-red-500 bg-red-500/12 text-red-700 dark:text-red-300"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Relocate to Another Empty Slot */}
              {emptySlots.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <select
                    value={moveTargetId}
                    onChange={(e) => setMoveTargetId(e.target.value)}
                    className="h-9 flex-1 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground"
                  >
                    {emptySlots.map((es) => (
                      <option key={es.id} value={es.id}>
                        Move cargo to empty slot {es.id}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (moveTargetId) {
                        moveSlotCargo(inspectedSlot.id, moveTargetId);
                        setInspectSlotId(null);
                      }
                    }}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Relocate
                  </Button>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    unloadSlot(inspectedSlot.id);
                    setInspectSlotId(null);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Unload to Dock Queue
                </Button>
                <Button type="button" size="sm" onClick={() => setInspectSlotId(null)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
