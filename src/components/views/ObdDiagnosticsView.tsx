import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Flame,
  Gauge,
  BatteryCharging,
  Thermometer,
  Droplets,
  Wind,
  Search,
  RefreshCw,
  Wrench,
  Trash2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { getVehicleObdHealth, useHaulTrack } from "@/context/HaulTrackContext";
import { getDtcInfo, OBD_CODE_LIST } from "@/data/obdDatabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import { TermTooltip } from "@/components/ui/TermTooltip";
import type { TechnicalTermKey } from "@/data/glossary";
import { cn } from "@/lib/utils";

export function ObdDiagnosticsView() {
  const {
    trucks,
    activeTruck,
    selectTruck,
    scanVehicleObd,
    clearVehicleDtc,
    acknowledgeDtc,
    runDpfRegen,
    setActivePage,
  } = useHaulTrack();

  const [dtcSearch, setDtcSearch] = useState("");
  const [subsystemFilter, setSubsystemFilter] = useState("All");
  const [isScanning, setIsScanning] = useState(false);

  const obdHealth = getVehicleObdHealth(activeTruck);
  const totalActiveDtcs = trucks.reduce((s, t) => s + t.obd.activeCodes.length, 0);
  const criticalCount = trucks.reduce(
    (s, t) =>
      s + t.obd.activeCodes.filter((c) => getDtcInfo(c.code).severity === "Critical").length,
    0
  );

  const handleScan = () => {
    setIsScanning(true);
    window.setTimeout(() => {
      scanVehicleObd(activeTruck.id);
      setIsScanning(false);
    }, 550);
  };

  const filteredLookupCodes = useMemo(() => {
    const q = dtcSearch.trim().toLowerCase();
    return OBD_CODE_LIST.filter((item) => {
      if (subsystemFilter !== "All" && item.subsystem !== subsystemFilter) return false;
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q) ||
        item.subsystem.toLowerCase().includes(q) ||
        (item.j1939Spn?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [dtcSearch, subsystemFilter]);

  const subsystems = [
    "All",
    "Exhaust & DPF",
    "Fuel System",
    "Turbo & Air",
    "SCR / AdBlue",
    "CAN Network",
    "Cooling",
    "Electrical",
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
            ISUZU <TermTooltip termKey="OBD">OBD-II &amp; J1939</TermTooltip> Diagnostics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live <TermTooltip termKey="PID" showIcon={false}>ECU sensor PIDs</TermTooltip>, active
            diesel <TermTooltip termKey="DTC" showIcon={false}>trouble code</TermTooltip> meanings,{" "}
            <TermTooltip termKey="FREEZE_FRAME" showIcon={false}>freeze-frame</TermTooltip>{" "}
            snapshots, and remote{" "}
            <TermTooltip termKey="DPD" showIcon={false}>DPD regeneration</TermTooltip>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setActivePage("map")}
            className="h-11 rounded-2xl px-4 text-xs font-semibold"
          >
            <MapPin className="h-4 w-4 text-red-600" />
            View on Live Map
          </Button>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            className="h-11 rounded-2xl px-5 text-xs font-semibold"
          >
            <RefreshCw className={cn("h-4 w-4", isScanning && "animate-spin")} />
            {isScanning ? `Scanning ${activeTruck.id} ECU...` : `Run Full ECU Scan (${activeTruck.id})`}
          </Button>
        </div>
      </div>

      {/* Vehicle Selector Strip across all Registered Isuzu OBD Models with Vehicle Photo & Plate Number */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {trucks.map((truck) => {
          const isSelected = truck.id === activeTruck.id;
          const health = getVehicleObdHealth(truck);
          return (
            <button
              key={truck.id}
              type="button"
              onClick={() => selectTruck(truck.id)}
              className={cn(
                "flex cursor-pointer flex-col justify-between rounded-2xl border bg-card p-3.5 text-left transition-all hover:shadow-md",
                isSelected
                  ? "border-red-600 ring-2 ring-red-600/20"
                  : "border-border/80 hover:border-red-400/50"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-extrabold text-foreground">{truck.id}</span>
                  <Badge
                    variant={
                      health === "Critical"
                        ? "destructive"
                        : health === "Warning"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {truck.obd.activeCodes.length === 0
                      ? "0 DTC"
                      : `${truck.obd.activeCodes.length} DTC`}
                  </Badge>
                </div>

                {/* Vehicle Thumbnail Picture */}
                <div className="mt-2 flex h-16 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-slate-50 to-slate-100/80 p-1.5 dark:from-slate-900/70 dark:to-slate-950/60">
                  <img
                    src={truck.imageSrc}
                    alt={truck.model}
                    className="max-h-full w-auto object-contain drop-shadow-sm"
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-1.5">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400">
                    Isuzu {truck.series}
                  </p>
                  <LicensePlateBadge
                    plate={truck.plate}
                    plateType={truck.plateType}
                    expiry={truck.plateExpiry}
                    size="xs"
                  />
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{truck.engine}</p>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground tabular-nums">
                <span>DPF {truck.obd.dpfSootPct}%</span>
                <span>{truck.obd.batteryVolts}V</span>
                <span>{truck.obd.coolantTempC}°C</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Vehicle ECU Banner + Vehicle Image + Plate + Live Sensor PIDs */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Large Clear Vehicle Visual Preview */}
            <div className="flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/75 bg-gradient-to-b from-slate-50 to-slate-100/80 p-2 dark:from-slate-900/80 dark:to-slate-950/60">
              <img
                src={activeTruck.imageSrc}
                alt={activeTruck.model}
                className="max-h-full w-auto object-contain drop-shadow-md"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-xs">
                  <Cpu className="h-4 w-4" />
                </span>
                <h2 className="text-base font-extrabold text-foreground">
                  {activeTruck.id} — {activeTruck.model}
                </h2>
                <LicensePlateBadge
                  plate={activeTruck.plate}
                  plateType={activeTruck.plateType}
                  expiry={activeTruck.plateExpiry}
                  showExpiry
                  size="md"
                />
                <Badge
                  variant={
                    obdHealth === "Critical"
                      ? "destructive"
                      : obdHealth === "Warning"
                      ? "warning"
                      : "secondary"
                  }
                >
                  ECU {obdHealth}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                Class: <strong className="text-foreground">{activeTruck.vehicleClass}</strong> ·
                Engine: {activeTruck.engine} · VIN: {activeTruck.vin}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                OBD ID: <strong className="font-mono text-foreground">{activeTruck.obd.deviceId}</strong> ·{" "}
                {activeTruck.obd.dealerRegion} · Protocol: {activeTruck.obd.protocol} · Odometer:{" "}
                {activeTruck.odometerKm.toLocaleString()} km
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTruck.obd.dpfSootPct >= 50 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => runDpfRegen(activeTruck.id)}
                className="border-amber-500/60 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
              >
                <Flame className="h-3.5 w-3.5" />
                Run Parked DPD Regen
              </Button>
            )}
            <span className="rounded-xl bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground tabular-nums">
              Fleet Total: {totalActiveDtcs} DTCs ({criticalCount} Critical)
            </span>
          </div>
        </div>

        {/* Live OBD-II PID Sensor Telemetry Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {(
            [
              {
                label: "Engine RPM",
                value: activeTruck.obd.rpm.toLocaleString(),
                unit: "rpm",
                icon: Gauge,
                warn: activeTruck.obd.rpm > 2400,
                termKey: "PID",
              },
              {
                label: "Coolant Temp",
                value: `${activeTruck.obd.coolantTempC}°C`,
                unit: "Spec 80–95°C",
                icon: Thermometer,
                warn: activeTruck.obd.coolantTempC >= 94,
              },
              {
                label: "Oil Pressure",
                value: `${activeTruck.obd.oilPressureKpa}`,
                unit: "kPa",
                icon: Droplets,
                warn: activeTruck.obd.oilPressureKpa < 220,
              },
              {
                label: "Turbo Boost",
                value: `${activeTruck.obd.boostKpa}`,
                unit: "kPa",
                icon: Wind,
                warn: false,
                termKey: "TURBO_BOOST",
              },
              {
                label: "Battery Bus",
                value: `${activeTruck.obd.batteryVolts}V`,
                unit: activeTruck.obd.batteryVolts > 18 ? "24V Dual" : "12V Bus",
                icon: BatteryCharging,
                warn:
                  (activeTruck.obd.batteryVolts > 18 && activeTruck.obd.batteryVolts < 24) ||
                  activeTruck.obd.batteryVolts < 12.2,
              },
              {
                label: "DPD Soot Load",
                value: `${activeTruck.obd.dpfSootPct}%`,
                unit: activeTruck.obd.dpfSootPct >= 75 ? "Regen Needed" : "Normal",
                icon: Flame,
                warn: activeTruck.obd.dpfSootPct >= 75,
                termKey: "DPD",
              },
              {
                label: "DEF / AdBlue",
                value: `${activeTruck.obd.defLevelPct}%`,
                unit: "32.5% Urea",
                icon: Droplets,
                warn: activeTruck.obd.defLevelPct < 20,
                termKey: "DEF",
              },
              {
                label: "Fuel Rail",
                value: `${activeTruck.obd.fuelRailMpa}`,
                unit: "MPa",
                icon: Activity,
                warn: activeTruck.obd.fuelRailMpa < 80 && activeTruck.route.speedMph > 30,
                termKey: "FUEL_RAIL",
              },
            ] as Array<{
              label: string;
              value: string;
              unit: string;
              icon: React.ComponentType<{ className?: string }>;
              warn: boolean;
              termKey?: TechnicalTermKey;
            }>
          ).map((pid) => {
            const Icon = pid.icon;
            return (
              <div
                key={pid.label}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  pid.warn
                    ? "border-amber-500/60 bg-amber-500/8"
                    : "border-border/75 bg-background/60"
                )}
              >
                <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                  {pid.termKey ? (
                    <TermTooltip termKey={pid.termKey} showIcon={false} className="truncate">
                      {pid.label}
                    </TermTooltip>
                  ) : (
                    <span className="truncate">{pid.label}</span>
                  )}
                  <Icon
                    className={cn("h-3.5 w-3.5 shrink-0", pid.warn ? "text-amber-500" : "text-red-600")}
                  />
                </div>
                <p className="mt-1.5 text-lg font-extrabold leading-none text-foreground tabular-nums">
                  {pid.value}
                </p>
                <p
                  className={cn(
                    "mt-1 truncate text-[10px]",
                    pid.warn ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                  )}
                >
                  {pid.unit}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Active Trouble Codes (DTCs) with Full Meanings & Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-foreground">
            Active Fault Codes on {activeTruck.id} ({activeTruck.obd.activeCodes.length})
          </h3>
        </div>

        {activeTruck.obd.activeCodes.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-sm font-extrabold text-foreground">
              All Systems Healthy — 0 Active OBD-II Faults
            </h4>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              {activeTruck.model} ({activeTruck.engine}) passed continuous J1939 &amp; OBD-II
              readiness checks with no stored DTC error codes.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {activeTruck.obd.activeCodes.map((activeDtc) => {
              const info = getDtcInfo(activeDtc.code);
              const isCritical = info.severity === "Critical";

              return (
                <Card
                  key={activeDtc.code}
                  className={cn(
                    "p-5 border-l-4",
                    isCritical
                      ? "border-l-red-600"
                      : info.severity === "Warning"
                      ? "border-l-amber-500"
                      : "border-l-sky-500"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-red-600 px-2.5 py-0.5 font-mono text-sm font-extrabold text-white">
                          {info.code}
                        </span>
                        {info.j1939Spn && (
                          <TermTooltip termKey="SPN_FMI" showIcon={false}>
                            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                              {info.j1939Spn}
                            </span>
                          </TermTooltip>
                        )}
                        <Badge
                          variant={
                            isCritical
                              ? "destructive"
                              : info.severity === "Warning"
                              ? "warning"
                              : "standard"
                          }
                        >
                          {info.severity}
                        </Badge>
                        <Badge variant="outline">{info.subsystem}</Badge>
                      </div>
                      <h4 className="mt-2 text-sm font-extrabold text-foreground">
                        {info.title}
                      </h4>
                    </div>

                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-bold",
                        info.drivableStatus.includes("Pull Over")
                          ? "bg-red-500/15 text-red-700 dark:text-red-300"
                          : info.drivableStatus.includes("24h")
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                      )}
                    >
                      {info.drivableStatus}
                    </span>
                  </div>

                  {/* Plain-English Code Meaning */}
                  <div className="mt-3 rounded-xl bg-muted/45 p-3 text-xs leading-relaxed text-foreground">
                    <span className="font-bold text-red-700 dark:text-red-400">
                      Error Code Meaning:{" "}
                    </span>
                    {info.meaning}
                  </div>

                  {/* Freeze Frame Snapshot */}
                  <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-border/70 p-2.5 text-center text-[11px] tabular-nums">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Detected</p>
                      <p className="font-bold">{activeDtc.detectedAt}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Freeze RPM</p>
                      <p className="font-bold">{activeDtc.freezeRpm.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Speed / Temp</p>
                      <p className="font-bold">
                        {activeDtc.freezeSpeedMph} km/h · {activeDtc.freezeTempC}°C
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Occurrences</p>
                      <p className="font-bold">{activeDtc.occurrences}×</p>
                    </div>
                  </div>

                  {/* Probable Causes & Recommended Mechanic Fix */}
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <p className="font-bold text-foreground">Probable Causes</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                        {info.probableCauses.map((cause, idx) => (
                          <li key={idx}>{cause}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                      <p className="flex items-center gap-1.5 font-bold text-foreground">
                        <Wrench className="h-3.5 w-3.5 text-red-600" />
                        Recommended Isuzu Fix
                      </p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">
                        {info.recommendedAction}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
                    {info.code === "P2002" && (
                      <Button
                        size="sm"
                        onClick={() => runDpfRegen(activeTruck.id)}
                        className="bg-amber-600 text-white hover:bg-amber-700"
                      >
                        <Flame className="h-3.5 w-3.5" />
                        Run Parked DPD Regen
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={activeDtc.acknowledged}
                      onClick={() => acknowledgeDtc(activeTruck.id, info.code)}
                    >
                      {activeDtc.acknowledged ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Service Logged
                        </>
                      ) : (
                        <>
                          <Wrench className="h-3.5 w-3.5" />
                          Log Service Ticket
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => clearVehicleDtc(activeTruck.id, info.code)}
                      className="text-red-600 hover:bg-red-600 hover:text-white dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear DTC
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Searchable Isuzu OBD-II Error Code Meaning Reference Library */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-foreground">
              ISUZU OBD-II / J1939 Error Code Decoder
            </h3>
            <p className="text-xs text-muted-foreground">
              Search any Isuzu commercial diesel trouble code (e.g. P2002, P0401, P0087, DPF, EGR,
              turbo) to read its exact technical meaning &amp; repair steps.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={dtcSearch}
              onChange={(e) => setDtcSearch(e.target.value)}
              placeholder="Search code (P2002, EGR, fuel)..."
              className="pl-8 text-xs"
            />
          </div>
        </div>

        {/* Subsystem Filter Pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {subsystems.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSubsystemFilter(sub)}
              className={cn(
                "cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                subsystemFilter === sub
                  ? "border-red-600 bg-red-600/12 text-red-700 dark:text-red-300"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Code / J1939</th>
                <th className="px-4 py-2.5">Subsystem</th>
                <th className="px-4 py-2.5">Fault Meaning</th>
                <th className="px-4 py-2.5">Recommended Fix</th>
                <th className="px-4 py-2.5 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLookupCodes.map((c) => (
                <tr key={c.code} className="hover:bg-muted/30">
                  <td className="px-4 py-3 align-top">
                    <span className="inline-block rounded-md bg-red-600/12 px-2 py-0.5 font-mono text-xs font-extrabold text-red-700 dark:text-red-300">
                      {c.code}
                    </span>
                    {c.j1939Spn && (
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {c.j1939Spn}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top font-semibold text-foreground whitespace-nowrap">
                    {c.subsystem}
                  </td>
                  <td className="px-4 py-3 align-top max-w-md">
                    <p className="font-bold text-foreground">{c.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {c.meaning}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                    {c.recommendedAction}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Badge
                      variant={
                        c.severity === "Critical"
                          ? "destructive"
                          : c.severity === "Warning"
                          ? "warning"
                          : "standard"
                      }
                    >
                      {c.severity}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
