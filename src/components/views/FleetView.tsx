import {
  Fuel,
  Thermometer,
  ArrowRight,
  MapPin,
  Package,
  Star,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Gauge,
} from "lucide-react";
import {
  getTruckLoadKg,
  getTruckLoadPct,
  getVehicleObdHealth,
  useHaulTrack,
} from "@/context/HaulTrackContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import { cn, formatTons } from "@/lib/utils";

export function FleetView() {
  const {
    trucks,
    activeTruck,
    drivers,
    settings,
    selectTruck,
    setActivePage,
    obdCatalog,
  } = useHaulTrack();

  const fleetCapacityKg = trucks.reduce((s, t) => s + t.maxCapacityKg, 0);
  const fleetLoadedKg = trucks.reduce((s, t) => s + getTruckLoadKg(t), 0);
  const avgUtil = Math.round((fleetLoadedKg / fleetCapacityKg) * 100);
  const totalObdCodes = trucks.reduce((s, t) => s + t.obd.activeCodes.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
            HORUS — ISUZU Commercial Fleet
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-class Isuzu fleet lineup — GIGA Heavy, Forward Medium, ELF Light, TRAGA City Box
            &amp; D-MAX 4×4 Support.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setActivePage("obd")}
            className="h-11 rounded-2xl px-4"
          >
            <Cpu className="h-4 w-4 text-red-600" />
            OBD-II Console ({totalObdCodes} DTC)
          </Button>
          <Button onClick={() => setActivePage("map")} className="h-11 rounded-2xl px-5">
            <MapPin className="h-4 w-4" />
            Live Fleet GPS Map
          </Button>
        </div>
      </div>

      {/* Fleet Summary Strip */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Active Isuzu Units</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{trucks.length}</p>
          <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
            5 Isuzu series · {trucks.filter((t) => t.status === "In Transit").length} moving now
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Fleet Payload</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {formatTons(fleetLoadedKg, settings.weightUnit)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            of {formatTons(fleetCapacityKg, settings.weightUnit)} combined max
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Fleet Utilization</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{avgUtil}%</p>
          <p className="text-[11px] text-muted-foreground">Live across GIGA, FTR, ELF, TRAGA &amp; D-MAX</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">OBD-II ECU Alerts</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{totalObdCodes}</p>
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
            {trucks.filter((t) => t.obd.activeCodes.length === 0).length} of {trucks.length} units
            fault-free
          </p>
        </Card>
      </div>

      {/* Isuzu Vehicle Cards Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {trucks.map((truck) => {
          const drv = drivers.find((d) => d.id === truck.driverId) ?? drivers[0];
          const loadKg = getTruckLoadKg(truck);
          const pct = getTruckLoadPct(truck);
          const occupied = truck.slots.filter((s) => s.cargo).length;
          const isSelected = truck.id === activeTruck.id;
          const obdHealth = getVehicleObdHealth(truck, obdCatalog);

          return (
            <Card
              key={truck.id}
              className={cn(
                "flex flex-col justify-between p-5 transition-all hover:shadow-md",
                isSelected && "ring-2 ring-red-500/60"
              )}
            >
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#d91324] px-2 py-0.5 text-[10px] font-black tracking-wider text-white">
                        ISUZU {truck.series}
                      </span>
                      <h3 className="text-base font-extrabold text-foreground">{truck.id}</h3>
                      <LicensePlateBadge
                        plate={truck.plate}
                        plateType={truck.plateType}
                        expiry={truck.plateExpiry}
                        size="xs"
                      />
                      {isSelected && <Badge variant="express">Active</Badge>}
                    </div>
                    <p className="mt-1 text-xs font-bold text-foreground">{truck.model}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {truck.engine} · {truck.odometerKm.toLocaleString()} km
                    </p>
                  </div>
                  <Badge
                    variant={
                      truck.status === "In Transit"
                        ? "express"
                        : truck.status === "Loading"
                        ? "standard"
                        : "warning"
                    }
                  >
                    {truck.status}
                  </Badge>
                </div>

                {/* Real Studio Side Profile Image */}
                <div className="mt-3 flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-slate-50 to-slate-100/70 p-3 dark:from-slate-900/70 dark:to-slate-950/60">
                  <img
                    src={truck.imageSrc}
                    alt={truck.model}
                    className="max-h-full w-auto object-contain drop-shadow-md"
                  />
                </div>

                {/* Driver + Route + OBD Bar */}
                <div className="mt-3.5 grid grid-cols-2 gap-2.5 rounded-xl bg-muted/40 p-3 text-xs">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">Driver</p>
                    <p className="mt-0.5 flex items-center gap-1.5 font-bold text-foreground">
                      {drv.name}
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-500">
                        <Star className="h-3 w-3 fill-amber-400" />
                        {drv.rating.toFixed(1)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">Corridor &amp; Class</p>
                    <p className="mt-0.5 font-bold text-foreground">
                      {truck.route.originCode} → {truck.route.destinationCode} · {truck.dock}
                    </p>
                  </div>
                </div>

                {/* Load Utilization Progress */}
                <div className="mt-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatTons(loadKg, settings.weightUnit)} /{" "}
                      {formatTons(truck.maxCapacityKg, settings.weightUnit)}
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">
                      {pct}% ({occupied} loaded)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct >= 85 ? "bg-amber-500" : "bg-red-600"
                      )}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Telemetry & OBD Footer */}
              <div className="mt-4 space-y-3 border-t border-border/70 pt-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Fuel className="h-3.5 w-3.5 text-red-600" /> {truck.fuelPercent}%
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5 text-red-600" /> {truck.route.speedMph} km/h
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Thermometer className="h-3.5 w-3.5 text-sky-600" /> {truck.obd.coolantTempC}°C
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      selectTruck(truck.id);
                      setActivePage("obd");
                    }}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-opacity hover:opacity-85",
                      obdHealth === "Critical"
                        ? "bg-red-600 text-white"
                        : obdHealth === "Warning"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    {obdHealth === "Healthy" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {truck.obd.activeCodes.length === 0
                      ? "OBD OK"
                      : `${truck.obd.activeCodes.length} OBD DTC`}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      selectTruck(truck.id);
                      setActivePage("map");
                    }}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Map
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      selectTruck(truck.id);
                      setActivePage("obd");
                    }}
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    OBD
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      selectTruck(truck.id);
                      setActivePage("dashboard");
                    }}
                  >
                    <Package className="h-3.5 w-3.5" />
                    Bay
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
