import { Radio, Gauge, Fuel, Thermometer, Navigation, Clock } from "lucide-react";
import { getTruckLoadKg, useHaulTrack } from "@/context/HaulTrackContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatTons } from "@/lib/utils";

export function LiveTrackingModal() {
  const {
    liveTrackingOpen,
    setLiveTrackingOpen,
    trucks,
    activeTruck,
    drivers,
    selectTruck,
    setActivePage,
    settings,
  } = useHaulTrack();

  const driver = drivers.find((d) => d.id === activeTruck.driverId) ?? drivers[0];
  const loadKg = getTruckLoadKg(activeTruck);

  const checkpoints = [
    {
      label: `${activeTruck.route.originCity} Origin Terminal`,
      time: activeTruck.startedAt,
      done: true,
    },
    {
      label: "Weigh Station & Toll Gate Clearance",
      time: "+32 min",
      done: activeTruck.route.progressPercent >= 30,
    },
    {
      label: activeTruck.route.currentLocation,
      time: "Live GPS",
      done: activeTruck.route.progressPercent >= 50,
      current: true,
    },
    {
      label: `${activeTruck.route.destinationCity} Receiving Hub`,
      time: `ETA ${activeTruck.route.eta}`,
      done: activeTruck.route.progressPercent >= 100,
    },
  ];

  return (
    <Dialog open={liveTrackingOpen} onOpenChange={setLiveTrackingOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white">
              <Radio className="h-4 w-4" />
            </span>
            Live Fleet Telemetry &amp; Corridor Tracking
          </DialogTitle>
          <DialogDescription>
            Real-time GPS position, highway speed, cold-chain sensors, and ETA across active
            corridors.
          </DialogDescription>
        </DialogHeader>

        {/* Truck Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {trucks.map((t) => {
            const selected = t.id === activeTruck.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTruck(t.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                  selected
                    ? "border-red-600 bg-red-600 text-white shadow-sm"
                    : "border-border bg-muted/40 text-foreground hover:bg-muted"
                )}
              >
                <span>{t.id}</span>
                <span className={cn("text-[11px]", selected ? "text-red-100" : "text-muted-foreground")}>
                  {t.route.originCode}→{t.route.destinationCode}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stylized Live Corridor Map Visualization */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-red-500/25 bg-gradient-to-br from-[#1c080b] via-[#260b10] to-[#14171d] p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
                </span>
                <span className="text-sm font-bold">
                  {activeTruck.id} · {activeTruck.model}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-red-200/80">
                Driver: {driver.name} · {activeTruck.route.currentLocation}
              </p>
            </div>
            <Badge className="bg-red-500/20 text-red-200 border border-red-400/30">
              {activeTruck.status}
            </Badge>
          </div>

          {/* Animated SVG Route Progress Path */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>
                {activeTruck.route.originCode}{" "}
                <span className="font-normal text-red-200/70">
                  ({activeTruck.route.originCity})
                </span>
              </span>
              <span className="text-red-300 tabular-nums">
                {activeTruck.route.progressPercent}% of {activeTruck.route.distanceMiles} mi
              </span>
              <span>
                {activeTruck.route.destinationCode}{" "}
                <span className="font-normal text-red-200/70">
                  ({activeTruck.route.destinationCity})
                </span>
              </span>
            </div>

            <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500"
                style={{ width: `${Math.max(4, activeTruck.route.progressPercent)}%` }}
              />
            </div>

            {/* Live Sensor Grid */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-xl bg-white/8 p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-red-200/75">
                  <Gauge className="h-3 w-3" /> Speed
                </p>
                <p className="mt-1 text-base font-extrabold tabular-nums">
                  {activeTruck.route.speedMph} mph
                </p>
              </div>
              <div className="rounded-xl bg-white/8 p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-red-200/75">
                  <Clock className="h-3 w-3" /> Est. Arrival
                </p>
                <p className="mt-1 text-base font-extrabold tabular-nums">
                  {activeTruck.route.eta}
                </p>
              </div>
              <div className="rounded-xl bg-white/8 p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-red-200/75">
                  <Thermometer className="h-3 w-3" /> Bay Temp
                </p>
                <p className="mt-1 text-base font-extrabold tabular-nums">
                  {activeTruck.tempCelsius.toFixed(1)}°C
                </p>
              </div>
              <div className="rounded-xl bg-white/8 p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-red-200/75">
                  <Fuel className="h-3 w-3" /> Fuel Level
                </p>
                <p className="mt-1 text-base font-extrabold tabular-nums">
                  {activeTruck.fuelPercent}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Route Checkpoints */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {checkpoints.map((cp, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-between rounded-xl border p-3 text-xs",
                cp.current
                  ? "border-red-500/60 bg-red-500/[0.06]"
                  : "border-border bg-muted/25"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    cp.current
                      ? "bg-red-500 ring-4 ring-red-500/20"
                      : cp.done
                      ? "bg-red-600"
                      : "bg-slate-300 dark:bg-slate-600"
                  )}
                />
                <span className="truncate font-semibold text-foreground">{cp.label}</span>
              </div>
              <span className="ml-2 shrink-0 text-[11px] font-medium text-muted-foreground tabular-nums">
                {cp.time}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Active payload: <strong className="text-foreground">{formatTons(loadKg, settings.weightUnit)}</strong>{" "}
            across {activeTruck.slots.filter((s) => s.cargo).length} loaded slots
          </p>
          <Button
            size="sm"
            onClick={() => {
              setLiveTrackingOpen(false);
              setActivePage("dashboard");
            }}
          >
            <Navigation className="h-3.5 w-3.5" />
            Manage Cargo Bay
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
