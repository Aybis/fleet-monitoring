import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
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
  ShieldAlert,
  Siren,
  Volume2,
  VolumeX,
  Zap,
  Radio,
  ArrowDownRight,
} from "lucide-react";
import { getVehicleObdHealth, useHaulTrack } from "@/context/HaulTrackContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import { TermTooltip } from "@/components/ui/TermTooltip";
import { TablePagination } from "@/components/ui/TablePagination";
import type { TechnicalTermKey } from "@/data/glossary";
import { cn } from "@/lib/utils";

export function ObdDiagnosticsView() {
  const {
    trucks,
    drivers,
    activeTruck,
    selectTruck,
    scanVehicleObd,
    clearVehicleDtc,
    acknowledgeDtc,
    runDpfRegen,
    setActivePage,
    settings,
    telemetryHistory,
    lastHeartbeat,
    obdCatalog,
    lookupDtc,
    emergencyAlerts,
    setActiveIncidentId,
    alertSoundEnabled,
    setAlertSoundEnabled,
    triggerDummyFailure,
  } = useHaulTrack();

  const liveSeries = telemetryHistory[activeTruck.id] ?? [];
  const ecuDetailRef = useRef<HTMLDivElement | null>(null);

  const [fleetSearch, setFleetSearch] = useState("");
  const [fleetHealthFilter, setFleetHealthFilter] = useState<
    "ALL" | "URGENT" | "WARNING" | "HEALTHY"
  >("ALL");
  const [fleetPage, setFleetPage] = useState(1);
  const [fleetPageSize, setFleetPageSize] = useState(5);
  const [simTargetTruck, setSimTargetTruck] = useState<string>("");

  const [decoderScope, setDecoderScope] = useState<"unit" | "all">("unit");
  const [dtcSearch, setDtcSearch] = useState("");
  const [subsystemFilter, setSubsystemFilter] = useState("All");
  const [decoderPage, setDecoderPage] = useState(1);
  const [decoderPageSize, setDecoderPageSize] = useState(5);
  const [isScanning, setIsScanning] = useState(false);

  const obdHealth = getVehicleObdHealth(activeTruck, obdCatalog);
  const totalActiveDtcs = trucks.reduce((s, t) => s + t.obd.activeCodes.length, 0);
  const criticalCount = trucks.reduce(
    (s, t) =>
      s + t.obd.activeCodes.filter((c) => lookupDtc(c.code).severity === "Critical").length,
    0
  );
  const warningCount = trucks.reduce(
    (s, t) =>
      s + t.obd.activeCodes.filter((c) => lookupDtc(c.code).severity === "Warning").length,
    0
  );
  const advisoryCount = totalActiveDtcs - criticalCount - warningCount;

  const openEmergencies = useMemo(
    () => emergencyAlerts.filter((a) => a.status !== "Resolved"),
    [emergencyAlerts]
  );
  const unackedEmergencies = useMemo(
    () => emergencyAlerts.filter((a) => a.status === "Active"),
    [emergencyAlerts]
  );
  const activeAccident = useMemo(
    () => openEmergencies.find((a) => a.type === "accident") ?? null,
    [openEmergencies]
  );

  const healthyUnits = trucks.filter(
    (t) =>
      getVehicleObdHealth(t, obdCatalog) === "Healthy" &&
      !openEmergencies.some((a) => a.truckId === t.id)
  ).length;
  const fleetHealthPct = Math.round((healthyUnits / Math.max(1, trucks.length)) * 100);
  const avgDpfSoot = Math.round(
    trucks.reduce((s, t) => s + t.obd.dpfSootPct, 0) / Math.max(1, trucks.length)
  );

  const fleetMatrixRows = useMemo(() => {
    const q = fleetSearch.trim().toLowerCase();
    return trucks
      .map((truck) => {
        const driver = drivers.find((d) => d.id === truck.driverId) ?? drivers[0];
        const health = getVehicleObdHealth(truck, obdCatalog);
        const unitAlert = openEmergencies.find((a) => a.truckId === truck.id) ?? null;
        const isUrgent = Boolean(unitAlert) || health === "Critical";
        const rank = unitAlert?.type === "accident" ? 0 : isUrgent ? 1 : health === "Warning" ? 2 : 3;
        return { truck, driver, health, unitAlert, isUrgent, rank };
      })
      .filter(({ truck, driver, health, isUrgent }) => {
        if (fleetHealthFilter === "URGENT" && !isUrgent) return false;
        if (fleetHealthFilter === "WARNING" && (isUrgent || health !== "Warning")) return false;
        if (fleetHealthFilter === "HEALTHY" && (isUrgent || health !== "Healthy")) return false;
        if (!q) return true;
        return (
          truck.id.toLowerCase().includes(q) ||
          truck.plate.toLowerCase().includes(q) ||
          truck.model.toLowerCase().includes(q) ||
          driver.name.toLowerCase().includes(q) ||
          truck.obd.activeCodes.some((c) => c.code.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.rank - b.rank);
  }, [trucks, drivers, obdCatalog, openEmergencies, fleetSearch, fleetHealthFilter]);

  const safeFleetPage = Math.min(
    fleetPage,
    Math.max(1, Math.ceil(fleetMatrixRows.length / fleetPageSize))
  );
  const paginatedFleetRows = fleetMatrixRows.slice(
    (safeFleetPage - 1) * fleetPageSize,
    safeFleetPage * fleetPageSize
  );

  const handleInspectUnit = (truckId: string) => {
    selectTruck(truckId);
    ecuDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleScan = () => {
    setIsScanning(true);
    window.setTimeout(() => {
      scanVehicleObd(activeTruck.id);
      setIsScanning(false);
    }, 550);
  };

  const filteredLookupCodes = useMemo(() => {
    const q = dtcSearch.trim().toLowerCase();
    const sourceList =
      decoderScope === "unit"
        ? activeTruck.obd.activeCodes.map((ac) => lookupDtc(ac.code))
        : obdCatalog;
    return sourceList.filter((item) => {
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
  }, [decoderScope, activeTruck.obd.activeCodes, lookupDtc, dtcSearch, subsystemFilter, obdCatalog]);

  const decoderTotalPages = Math.max(1, Math.ceil(filteredLookupCodes.length / decoderPageSize));
  const safeDecoderPage = Math.min(decoderPage, decoderTotalPages);
  const paginatedLookupCodes = useMemo(
    () =>
      filteredLookupCodes.slice(
        (safeDecoderPage - 1) * decoderPageSize,
        safeDecoderPage * decoderPageSize
      ),
    [filteredLookupCodes, safeDecoderPage, decoderPageSize]
  );

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white dark:bg-white dark:text-zinc-950">
              <Radio className="h-3 w-3 text-emerald-400 dark:text-emerald-600" />
              OBD Command Dashboard
            </span>
            <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              Geotab GO9 · Failure &amp; Impact Detection Armed
            </span>
          </div>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
            HORUS <TermTooltip termKey="OBD">OBD-II &amp; Failure Detection</TermTooltip> Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fleet-wide overview of all Geotab GO9 units, urgent failure &amp; accident alerts, live{" "}
            <TermTooltip termKey="PID" showIcon={false}>ECU sensor PIDs</TermTooltip>, and{" "}
            <TermTooltip termKey="DPD" showIcon={false}>DPD regeneration</TermTooltip>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setActivePage("master-data")}
            className="h-11 rounded-2xl px-4 text-xs font-semibold"
          >
            <Database className="h-4 w-4 text-blue-600" />
            Severity Rules
          </Button>
          <Button
            variant="outline"
            onClick={() => setActivePage("map")}
            className="h-11 rounded-2xl px-4 text-xs font-semibold"
          >
            <MapPin className="h-4 w-4 text-blue-600" />
            Live Map
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

      {/* 5 Fleet-Wide OBD Command Overview KPI Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Geotab GO9 Units</span>
            <Cpu className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums">
            {trucks.length}/{trucks.length}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            100% CAN-Bus online · {lastHeartbeat}
          </p>
        </Card>

        <Card
          className={cn(
            "p-4 transition-all",
            unackedEmergencies.length > 0
              ? "border-red-600 bg-red-600/[0.08] ring-2 ring-red-500/30"
              : openEmergencies.length > 0
              ? "border-amber-500/60 bg-amber-500/[0.05]"
              : ""
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Urgent / Emergency Alerts</span>
            <Siren
              className={cn(
                "h-4 w-4",
                unackedEmergencies.length > 0 ? "animate-pulse text-red-600" : "text-amber-500"
              )}
            />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-red-600 tabular-nums dark:text-red-400">
            {openEmergencies.length}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
            {unackedEmergencies.length > 0
              ? `${unackedEmergencies.length} unacknowledged — action needed`
              : "All open incidents supervised"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Fleet Active DTCs</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums">{totalActiveDtcs}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            <span className="font-bold text-red-600 dark:text-red-400">{criticalCount} Crit</span> ·{" "}
            <span className="font-bold text-amber-600 dark:text-amber-400">{warningCount} Warn</span>{" "}
            · <span className="font-bold text-sky-600 dark:text-sky-400">{advisoryCount} Adv</span>
          </p>
        </Card>

        <Card
          className={cn(
            "p-4 transition-all",
            activeAccident
              ? "border-red-600 bg-red-600 text-white shadow-md"
              : "border-emerald-500/35"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between text-xs",
              activeAccident ? "text-red-100" : "text-muted-foreground"
            )}
          >
            <span>Accident / G-Force Guard</span>
            <ShieldAlert className={cn("h-4 w-4", activeAccident ? "text-white" : "text-emerald-600")} />
          </div>
          <p className="mt-1.5 text-lg font-black uppercase tracking-tight">
            {activeAccident ? `IMPACT ${activeAccident.gForce ?? 3.4}G!` : "ARMED · 0 CRASH"}
          </p>
          <p
            className={cn(
              "mt-0.5 truncate text-[11px] font-medium",
              activeAccident ? "text-red-100" : "text-muted-foreground"
            )}
          >
            {activeAccident
              ? `${activeAccident.plate} · ${activeAccident.driverName}`
              : "GO9 3-Axis Accel > 2.5G"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Fleet ECU Readiness</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums">{fleetHealthPct}%</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {healthyUnits}/{trucks.length} fault-free · Avg DPD {avgDpfSoot}%
          </p>
        </Card>
      </div>

      {/* Dummy Failure & Accident Trigger Simulator Bar (Neutral Slate Frame so Alerts Pop!) */}
      <Card className="border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white dark:bg-white dark:text-zinc-950">
                <Zap className="h-3 w-3 text-amber-400 dark:text-amber-600" />
                Dummy Failure Simulator
              </span>
              <span className="text-xs font-extrabold text-foreground">
                Test Live Accident Detection &amp; Urgent OBD Alert Escalation
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Click any dummy scenario below to trigger a real-time Geotab GO9 emergency alert
              across HORUS (global siren banner, ECU fault injection, and incident response drawer).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={simTargetTruck}
                onChange={(e) => setSimTargetTruck(e.target.value)}
                aria-label="Select target unit for dummy failure simulation"
                className="h-9 cursor-pointer appearance-none rounded-xl border border-input bg-background pl-3 pr-7 text-xs font-semibold leading-none text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <option value="">Target: Auto Unit</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} · {t.plate} ({t.series})
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                ▾
              </span>
            </div>

            <Button
              size="sm"
              onClick={() => triggerDummyFailure("accident", simTargetTruck || undefined)}
              className="h-9 rounded-xl bg-red-600 px-3.5 text-xs font-extrabold text-white hover:bg-red-700"
            >
              <Siren className="h-3.5 w-3.5" />
              Simulate Accident (3.4G)
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerDummyFailure("urgent_dtc", simTargetTruck || undefined)}
              className="h-9 rounded-xl border-amber-500/70 bg-amber-500/10 px-3 text-xs font-bold text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
            >
              <Flame className="h-3.5 w-3.5" />
              Urgent Engine Failure
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerDummyFailure("can_loss", simTargetTruck || undefined)}
              className="h-9 rounded-xl px-3 text-xs font-bold"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              CAN-Bus Loss (U0100)
            </Button>

            <button
              type="button"
              onClick={() => setAlertSoundEnabled(!alertSoundEnabled)}
              title={alertSoundEnabled ? "Alert chime enabled" : "Alert chime muted"}
              className={cn(
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border transition-colors",
                alertSoundEnabled
                  ? "border-zinc-900/30 bg-zinc-900 text-white dark:border-white/30 dark:bg-white dark:text-zinc-950"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {alertSoundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Fleet-Wide Live OBD Matrix + Active Failure & Emergency Alert Feed */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* Left: All-Fleet Live OBD Command Table */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                All-Fleet OBD-II Health &amp; Failure Detection Matrix ({trucks.length} Units)
              </h2>
              <p className="text-xs text-muted-foreground">
                Unified real-time view of every Isuzu unit — sorted by highest urgency (Accidents &amp;
                Critical DTCs pinned on top).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-52">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={fleetSearch}
                  onChange={(e) => {
                    setFleetSearch(e.target.value);
                    setFleetPage(1);
                  }}
                  placeholder="Filter plate, unit, DTC..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                {(
                  [
                    ["ALL", "All"],
                    ["URGENT", "Urgent"],
                    ["WARNING", "Warning"],
                    ["HEALTHY", "Healthy"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFleetHealthFilter(key);
                      setFleetPage(1);
                    }}
                    className={cn(
                      "cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors",
                      fleetHealthFilter === key
                        ? key === "URGENT"
                          ? "border-red-600 bg-red-600 text-white"
                          : key === "WARNING"
                          ? "border-amber-500 bg-amber-500 text-slate-950"
                          : "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3.5 max-h-[370px] overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[660px] text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="px-3.5 py-2.5">Unit &amp; TNKB Plate</th>
                  <th className="px-3.5 py-2.5">Detection Status</th>
                  <th className="px-3.5 py-2.5">Active DTCs</th>
                  <th className="px-3.5 py-2.5">Live Vitals</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedFleetRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No Isuzu units match this health filter.
                    </td>
                  </tr>
                ) : (
                  paginatedFleetRows.map(({ truck, driver, health, unitAlert }) => {
                    const isAccidentRow = unitAlert?.type === "accident";
                    const isSelected = truck.id === activeTruck.id;
                    return (
                      <tr
                        key={truck.id}
                        className={cn(
                          "transition-colors hover:bg-muted/35",
                          isAccidentRow && "bg-red-600/[0.08]",
                          isSelected && !isAccidentRow && "bg-red-500/[0.03]"
                        )}
                      >
                        <td className="px-3.5 py-2.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={truck.imageSrc}
                              alt={truck.model}
                              className="h-8 w-14 shrink-0 object-contain"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-extrabold text-foreground">{truck.id}</span>
                                <LicensePlateBadge
                                  plate={truck.plate}
                                  plateType={truck.plateType}
                                  size="xs"
                                />
                              </div>
                              <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                                {driver.name} · {truck.route.speedMph} km/h
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 align-middle">
                          {isAccidentRow ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10.5px] font-black text-white shadow-xs">
                              <Siren className="h-3 w-3 animate-pulse" />
                              ACCIDENT {unitAlert.gForce}G
                            </span>
                          ) : unitAlert ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-600/15 px-2.5 py-1 text-[10.5px] font-extrabold text-red-700 dark:text-red-300">
                              <ShieldAlert className="h-3 w-3" />
                              URGENT ({unitAlert.status})
                            </span>
                          ) : health === "Critical" ? (
                            <Badge variant="destructive">Critical ECU</Badge>
                          ) : health === "Warning" ? (
                            <Badge variant="warning">Warning 24h</Badge>
                          ) : (
                            <Badge variant="secondary">Healthy</Badge>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 align-middle">
                          {truck.obd.activeCodes.length === 0 ? (
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              0 Faults
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {truck.obd.activeCodes.map((c) => {
                                const sev = lookupDtc(c.code).severity;
                                return (
                                  <Badge
                                    key={c.code}
                                    variant={
                                      sev === "Critical"
                                        ? "destructive"
                                        : sev === "Warning"
                                        ? "warning"
                                        : "standard"
                                    }
                                    className="font-mono text-[10.5px]"
                                  >
                                    {c.code}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 align-middle font-mono text-[11px] tabular-nums">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-muted-foreground">
                            <span
                              className={cn(
                                truck.obd.dpfSootPct >= 75 &&
                                  "font-bold text-red-600 dark:text-red-400"
                              )}
                            >
                              DPD {truck.obd.dpfSootPct}%
                            </span>
                            <span
                              className={cn(
                                truck.obd.coolantTempC >= 98 &&
                                  "font-bold text-red-600 dark:text-red-400"
                              )}
                            >
                              {truck.obd.coolantTempC}°C
                            </span>
                            <span>{truck.obd.fuelRailMpa} MPa</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 align-middle text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {unitAlert && (
                              <Button
                                size="sm"
                                onClick={() => setActiveIncidentId(unitAlert.id)}
                                className="h-7 rounded-lg bg-red-600 px-2.5 text-[11px] font-bold text-white hover:bg-red-700"
                              >
                                Respond
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInspectUnit(truck.id)}
                              className="h-7 rounded-lg px-2.5 text-[11px]"
                            >
                              ECU
                              <ArrowDownRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={safeFleetPage}
            pageSize={fleetPageSize}
            totalItems={fleetMatrixRows.length}
            onPageChange={setFleetPage}
            onPageSizeChange={setFleetPageSize}
            pageSizeOptions={[5, 10]}
          />
        </Card>

        {/* Right: Active Failure & Emergency Alert Feed (Scrollable) */}
        <Card className="flex flex-col p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-foreground">
                Urgent Failure &amp; Incident Feed
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Click any alert to open the Response Drawer
              </p>
            </div>
            <Badge variant={openEmergencies.length > 0 ? "destructive" : "secondary"}>
              {openEmergencies.length} Open
            </Badge>
          </div>

          <div className="mt-3 max-h-[415px] flex-1 space-y-2.5 overflow-y-auto pr-1">
            {emergencyAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
                <ShieldCheck className="h-7 w-7 text-emerald-600" />
                <p className="mt-2 text-xs font-bold text-foreground">No Urgent Incidents</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Use the simulator bar above to test accident or critical engine alerts.
                </p>
              </div>
            ) : (
              emergencyAlerts.map((alert) => {
                const isResolved = alert.status === "Resolved";
                const isActive = alert.status === "Active";
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => setActiveIncidentId(alert.id)}
                    className={cn(
                      "w-full cursor-pointer rounded-2xl border p-3 text-left transition-all hover:shadow-sm",
                      isResolved
                        ? "border-border/70 bg-muted/25 opacity-65"
                        : isActive
                        ? "border-red-600 bg-red-600/[0.08]"
                        : "border-amber-500/45 bg-amber-500/[0.05]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {alert.type === "accident" ? (
                          <Siren className="h-3.5 w-3.5 text-red-600" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        <span className="font-mono text-[11px] font-extrabold text-foreground">
                          {alert.truckId} · {alert.plate}
                        </span>
                      </div>
                      <Badge
                        variant={
                          isResolved
                            ? "secondary"
                            : isActive
                            ? "destructive"
                            : "warning"
                        }
                      >
                        {alert.status}
                      </Badge>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-snug text-foreground">
                      {alert.title}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-muted-foreground">
                      <span className="truncate">{alert.location}</span>
                      <span className="shrink-0 font-mono">{alert.triggeredAt}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Vehicle Selector Strip across all Registered Isuzu OBD Models with Vehicle Photo & Plate Number */}
      <div ref={ecuDetailRef} className="pt-1">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground">
            Deep ECU &amp; Live Sensor Inspector (Selected Unit: {activeTruck.id} ·{" "}
            {activeTruck.plate})
          </h2>
          <span className="text-xs text-muted-foreground">
            Select any vehicle card to inspect its live PIDs &amp; oscilloscope
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {trucks.map((truck) => {
            const isSelected = truck.id === activeTruck.id;
            const health = getVehicleObdHealth(truck, obdCatalog);
            const hasUnitAccident = openEmergencies.some(
              (a) => a.truckId === truck.id && a.type === "accident"
            );
            return (
              <button
                key={truck.id}
                type="button"
                onClick={() => selectTruck(truck.id)}
                className={cn(
                  "flex cursor-pointer flex-col justify-between rounded-2xl border bg-card p-3.5 text-left transition-all hover:shadow-md",
                  isSelected
                    ? "border-zinc-950 ring-2 ring-zinc-950/20 shadow-md dark:border-white dark:ring-white/25"
                    : hasUnitAccident
                    ? "border-red-500/70 bg-red-600/[0.04]"
                    : "border-border/80 hover:border-zinc-400"
                )}
              >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-foreground">{truck.id}</span>
                    {isSelected && (
                      <span className="rounded-md bg-zinc-950 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white dark:bg-white dark:text-zinc-950">
                        Selected
                      </span>
                    )}
                  </div>
                  {hasUnitAccident ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[9.5px] font-black text-white">
                      <Siren className="h-2.5 w-2.5 animate-pulse" />
                      ACCIDENT
                    </span>
                  ) : (
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
                  )}
                </div>

                {/* Vehicle Thumbnail Picture */}
                <div className="mt-2 flex h-16 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-zinc-50 to-zinc-100/80 p-1.5 dark:from-zinc-900/70 dark:to-zinc-950/60">
                  <img
                    src={truck.imageSrc}
                    alt={truck.model}
                    className="max-h-full w-auto object-contain drop-shadow-sm"
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-1.5">
                  <p className="text-xs font-bold text-foreground">
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
        {/* Live Real-Time OBD-II Oscilloscope Chart */}
        <div className="mt-5 rounded-2xl border border-border/75 bg-background/50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  {settings.liveTelemetryUpdates && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex h-2 w-2 rounded-full",
                      settings.liveTelemetryUpdates ? "bg-red-600" : "bg-slate-400"
                    )}
                  />
                </span>
                <h3 className="text-xs font-extrabold text-foreground">
                  Real-Time CAN / OBD-II Live Sensor Stream ({activeTruck.plate})
                </h3>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Live rolling telemetry every 2.5s — Engine RPM (left axis) vs Turbo Boost kPa &amp;
                Fuel Rail MPa (right axis)
              </p>
            </div>
            <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-[10.5px] font-semibold text-muted-foreground tabular-nums">
              Last ECU Frame: {lastHeartbeat}
            </span>
          </div>

          <div className="h-[195px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={liveSeries} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis
                  yAxisId="rpm"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10 }}
                  stroke="#94a3b8"
                />
                <YAxis
                  yAxisId="pressure"
                  orientation="right"
                  domain={[0, 180]}
                  tick={{ fontSize: 10 }}
                  stroke="#94a3b8"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--foreground)",
                    fontSize: "11px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line
                  yAxisId="rpm"
                  type="monotone"
                  dataKey="rpm"
                  name="Engine RPM"
                  stroke="#d91324"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="pressure"
                  type="monotone"
                  dataKey="boostKpa"
                  name="Turbo Boost (kPa)"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="pressure"
                  type="monotone"
                  dataKey="fuelRailMpa"
                  name="Fuel Rail (MPa)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
              const info = lookupDtc(activeDtc.code);
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

      {/* Unit-Synced OBD-II / J1939 Error Code Decoder (with Optional Full Reference Toggle) */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground">
                {decoderScope === "unit"
                  ? `OBD-II / J1939 Code Decoder — ${activeTruck.id} (${activeTruck.plate})`
                  : "All Master OBD-II / J1939 Error Code Dictionary"}
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {decoderScope === "unit"
                ? `Showing active trouble codes detected on ${activeTruck.model} (${activeTruck.plate}) with technical meaning & repair steps.`
                : "Searching the full HORUS Master Data dictionary across all Geotab & Isuzu diesel trouble codes."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Toggle: Selected Unit vs All Master Codes */}
            <div className="inline-flex items-center rounded-xl border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setDecoderScope("unit");
                  setSubsystemFilter("All");
                  setDecoderPage(1);
                }}
                className={cn(
                  "cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all",
                  decoderScope === "unit"
                    ? "bg-zinc-950 text-white shadow-xs dark:bg-white dark:text-zinc-950"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeTruck.id} Only ({activeTruck.obd.activeCodes.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setDecoderScope("all");
                  setDecoderPage(1);
                }}
                className={cn(
                  "cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all",
                  decoderScope === "all"
                    ? "bg-zinc-950 text-white shadow-xs dark:bg-white dark:text-zinc-950"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Master ({obdCatalog.length})
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={dtcSearch}
                onChange={(e) => {
                  setDtcSearch(e.target.value);
                  setDecoderPage(1);
                }}
                placeholder="Search code (P2002, EGR)..."
                className="pl-8 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActivePage("master-data")}
              className="h-9 rounded-xl px-3 text-xs font-semibold"
            >
              <Database className="h-3.5 w-3.5 text-foreground" />
              Manage Codes &amp; Severity
            </Button>
          </div>
        </div>

        {/* Subsystem Filter Pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {subsystems.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => {
                setSubsystemFilter(sub);
                setDecoderPage(1);
              }}
              className={cn(
                "cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                subsystemFilter === sub
                  ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="mt-4 max-h-[380px] overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[740px] text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="px-4 py-2.5">Code / J1939</th>
                <th className="px-4 py-2.5">Subsystem</th>
                <th className="px-4 py-2.5">Fault Meaning</th>
                <th className="px-4 py-2.5">Recommended Fix</th>
                <th className="px-4 py-2.5 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedLookupCodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <ShieldCheck className="h-6 w-6 text-emerald-600" />
                      <p className="text-xs font-bold text-foreground">
                        {decoderScope === "unit"
                          ? `0 Active Trouble Codes on ${activeTruck.id} (${activeTruck.plate})`
                          : "No trouble codes match your filter"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {decoderScope === "unit"
                          ? 'Switch to "All Master" above if you want to look up the full Geotab / Isuzu code reference.'
                          : "Try clearing the search query or subsystem filter."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLookupCodes.map((c) => (
                  <tr key={c.code} className="hover:bg-muted/30">
                    <td className="px-4 py-3 align-top">
                      <span className="inline-block rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-xs font-extrabold text-white dark:bg-zinc-200 dark:text-zinc-950">
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
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={safeDecoderPage}
          pageSize={decoderPageSize}
          totalItems={filteredLookupCodes.length}
          onPageChange={setDecoderPage}
          onPageSizeChange={setDecoderPageSize}
          pageSizeOptions={[5, 10]}
        />
      </Card>
    </div>
  );
}
