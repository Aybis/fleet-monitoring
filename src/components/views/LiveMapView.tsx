import { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Activity,
  Gauge,
  Fuel,
  Thermometer,
  Package,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  RefreshCw,
  Compass,
  ShieldCheck,
  Cpu,
  Crosshair,
  Layers,
} from "lucide-react";
import {
  getTruckLoadKg,
  getTruckLoadPct,
  getVehicleObdHealth,
  useHaulTrack,
} from "@/context/HaulTrackContext";
import { getDtcInfo } from "@/data/obdDatabase";
import {
  IndonesiaLeafletMap,
  type MapCameraCommand,
  type TileStyle,
} from "@/components/map/IndonesiaLeafletMap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import { cn, formatTons } from "@/lib/utils";

export function LiveMapView() {
  const {
    trucks,
    activeTruck,
    drivers,
    settings,
    selectTruck,
    setActivePage,
    simulateGpsTick,
    scanVehicleObd,
  } = useHaulTrack();

  const [focusPreset, setFocusPreset] = useState<
    "indonesia" | "java" | "sumatra" | "kalimantan" | "sulawesi"
  >("indonesia");
  const [cameraCommand, setCameraCommand] = useState<MapCameraCommand | null>(null);
  const [tileStyle, setTileStyle] = useState<TileStyle>("osm");
  const [showRoutes, setShowRoutes] = useState(true);
  const [showObdBadges, setShowObdBadges] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [autoStream, setAutoStream] = useState(true);
  const [seriesFilter, setSeriesFilter] = useState<string>("ALL");
  const [obdFilter, setObdFilter] = useState<"ALL" | "ALERTS" | "HEALTHY">("ALL");

  useEffect(() => {
    if (!autoStream) return;
    const id = window.setInterval(() => {
      simulateGpsTick();
    }, 5000);
    return () => window.clearInterval(id);
  }, [autoStream, simulateGpsTick]);

  const visibleTrucks = trucks.filter((t) => {
    if (seriesFilter !== "ALL" && t.series !== seriesFilter) return false;
    const health = getVehicleObdHealth(t);
    if (obdFilter === "ALERTS" && health === "Healthy") return false;
    if (obdFilter === "HEALTHY" && health !== "Healthy") return false;
    return true;
  });

  const selectedDriver =
    drivers.find((d) => d.id === activeTruck.driverId) ?? drivers[0];
  const selectedObdHealth = getVehicleObdHealth(activeTruck);
  const selectedLoadKg = getTruckLoadKg(activeTruck);
  const selectedLoadPct = getTruckLoadPct(activeTruck);

  const inTransitCount = trucks.filter((t) => t.status === "In Transit").length;
  const registeredObdCount = trucks.filter((t) => t.obd.registeredToIsuzu).length;
  const obdAlertVehicles = trucks.filter((t) => t.obd.activeCodes.length > 0).length;

  const formatCoord = (lat: number, lng: number) =>
    `${Math.abs(lat).toFixed(4)}° ${lat < 0 ? "S" : "N"}, ${Math.abs(lng).toFixed(4)}° E`;

  const triggerPreset = (
    preset: "indonesia" | "java" | "sumatra" | "kalimantan" | "sulawesi"
  ) => {
    setFocusPreset(preset);
    setCameraCommand({ id: Date.now(), type: preset });
  };

  const handleSelectAndFocus = (truckId: string, fly = false) => {
    selectTruck(truckId);
    if (fly) {
      const target = trucks.find((t) => t.id === truckId);
      if (target) {
        setCameraCommand({
          id: Date.now(),
          type: "focus",
          lat: target.gps.lat,
          lng: target.gps.lng,
          zoom: 9,
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
              ISUZU Indonesia Live OBD Map
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-600/10 px-3 py-1 text-[11px] font-extrabold text-red-700 dark:text-red-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              {registeredObdCount}/{trucks.length} Registered Isuzu OBD-II Online
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Interactive Leaflet GPS map tracking all Indonesian-plated Isuzu commercial units with
            live OBD-II telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoStream((v) => !v)}
            className="h-10 rounded-xl px-3.5 text-xs font-semibold"
          >
            {autoStream ? (
              <>
                <Pause className="h-3.5 w-3.5 text-red-600" />
                Live GPS: Streaming
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-muted-foreground" />
                Live GPS: Paused
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={simulateGpsTick}
            className="h-10 rounded-xl px-3.5 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Ping All OBD
          </Button>
          <Button
            size="sm"
            onClick={() => setActivePage("obd")}
            className="h-10 rounded-xl px-4 text-xs font-semibold"
          >
            <Activity className="h-4 w-4" />
            OBD-II Console ({obdAlertVehicles} alerts)
          </Button>
        </div>
      </div>

      {/* Series + OBD Registration Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "GIGA", "FORWARD", "ELF", "TRAGA", "D-MAX"].map((series) => (
            <button
              key={series}
              type="button"
              onClick={() => setSeriesFilter(series)}
              className={cn(
                "cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                seriesFilter === series
                  ? "border-red-600 bg-red-600 text-white shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-red-500/40 hover:text-foreground"
              )}
            >
              {series === "ALL" ? `All Isuzu (${trucks.length})` : `Isuzu ${series}`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              ["ALL", `All OBD (${trucks.length})`],
              ["ALERTS", `OBD Alerts (${obdAlertVehicles})`],
              ["HEALTHY", `OBD Healthy (${trucks.length - obdAlertVehicles})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setObdFilter(key)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold transition-colors",
                obdFilter === key
                  ? key === "ALERTS"
                    ? "border-amber-500 bg-amber-500 text-slate-950"
                    : "border-red-600 bg-red-600/12 text-red-700 dark:text-red-300"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
          <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-red-500/12 px-3 py-1 text-[11px] font-semibold text-red-700 dark:text-red-300">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            {inTransitCount} Moving
          </span>
        </div>
      </div>

      {/* Main Split Leaflet Indonesia Map + Independently Scrollable Right Bar */}
      <div className="grid grid-cols-1 gap-5 xl:h-[calc(100vh-228px)] xl:min-h-[580px] xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Interactive Real Leaflet Map Card — 100% height edge-to-edge, zero blank white space */}
        <Card className="relative flex h-[540px] flex-col overflow-hidden border-border/80 p-0 xl:h-full">
          {/* Top-Left Layer & Regional FlyTo Controls (above Leaflet z-index) */}
          <div className="absolute left-3.5 top-3.5 z-[400] flex flex-wrap items-center gap-1.5">
            {[
              { label: "Corridors", active: showRoutes, toggle: () => setShowRoutes((v) => !v) },
              {
                label: "OBD Alerts",
                active: showObdBadges,
                toggle: () => setShowObdBadges((v) => !v),
              },
              {
                label: "Geofences",
                active: showGeofences,
                toggle: () => setShowGeofences((v) => !v),
              },
            ].map((layer) => (
              <button
                key={layer.label}
                type="button"
                onClick={layer.toggle}
                className={cn(
                  "cursor-pointer rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold shadow-md backdrop-blur-md transition-all",
                  layer.active
                    ? "border-red-500/80 bg-red-600 text-white"
                    : "border-border/80 bg-card/95 text-foreground hover:bg-muted"
                )}
              >
                {layer.label}
              </button>
            ))}

            <span className="mx-0.5 hidden h-4 w-px bg-slate-400/50 sm:inline-block" />

            {(
              [
                ["indonesia", "Indonesia"],
                ["java", "Jawa & Bali"],
                ["sumatra", "Sumatra"],
                ["kalimantan", "Kalimantan"],
                ["sulawesi", "Sulawesi"],
              ] as const
            ).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => triggerPreset(preset)}
                className={cn(
                  "cursor-pointer rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold shadow-md backdrop-blur-md transition-all",
                  focusPreset === preset
                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "border-border/80 bg-card/95 text-foreground hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right Map Zoom, Center-on-Truck & Tile Style Controls */}
          <div className="absolute right-3.5 top-3.5 z-[400] flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setCameraCommand({ id: Date.now(), type: "zoomIn" })}
              aria-label="Zoom in"
              title="Zoom in"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-border bg-card/95 text-foreground shadow-md hover:bg-muted"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCameraCommand({ id: Date.now(), type: "zoomOut" })}
              aria-label="Zoom out"
              title="Zoom out"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-border bg-card/95 text-foreground shadow-md hover:bg-muted"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setCameraCommand({
                  id: Date.now(),
                  type: "focus",
                  lat: activeTruck.gps.lat,
                  lng: activeTruck.gps.lng,
                  zoom: 10,
                })
              }
              aria-label="Center on active vehicle"
              title={`Center on ${activeTruck.plate}`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-red-500/60 bg-red-600 text-white shadow-md hover:bg-red-700"
            >
              <Crosshair className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => triggerPreset("indonesia")}
              aria-label="Reset Indonesia view"
              title="Reset Indonesia view"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-border bg-card/95 text-foreground shadow-md hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setTileStyle((curr) =>
                  curr === "osm" ? "topo" : curr === "topo" ? "satellite" : "osm"
                )
              }
              aria-label="Switch map tile style"
              title={`Map layer: ${tileStyle === "osm" ? "OpenStreetMap" : tileStyle === "topo" ? "Esri Street" : "Satellite"} (click to switch)`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-border bg-card/95 text-foreground shadow-md hover:bg-muted"
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Bottom-Left TNKB Plate Legend */}
          <div className="pointer-events-none absolute bottom-3 left-3.5 z-[400] flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-card/95 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-md backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-5 rounded-[3px] border border-slate-900 bg-[#facc15]" />
              Plat Kuning (Angkutan Barang)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-5 rounded-[3px] border border-slate-900 bg-white" />
              Plat Putih (Operasional)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              OBD Alert
            </span>
          </div>

          {/* Real Interactive Leaflet Map */}
          <div className="h-full w-full flex-1">
            <IndonesiaLeafletMap
              trucks={visibleTrucks}
              activeTruck={activeTruck}
              showRoutes={showRoutes}
              showObdBadges={showObdBadges}
              showGeofences={showGeofences}
              tileStyle={tileStyle}
              cameraCommand={cameraCommand}
              onSelectTruck={(id) => handleSelectAndFocus(id, false)}
            />
          </div>
        </Card>

        {/* Right Selected Vehicle Telemetry & Registered OBD-II List (Smoothly Scrollable) */}
        <div className="flex flex-col gap-4 xl:h-full xl:overflow-y-auto xl:pr-1.5">
          <Card className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white">
                    ISUZU {activeTruck.series}
                  </span>
                  <span className="text-sm font-extrabold text-foreground">{activeTruck.id}</span>
                  <LicensePlateBadge
                    plate={activeTruck.plate}
                    plateType={activeTruck.plateType}
                    expiry={activeTruck.plateExpiry}
                    showExpiry
                    size="xs"
                  />
                </div>
                <p className="mt-1 text-xs font-semibold text-foreground">{activeTruck.model}</p>
                <p className="text-[11px] text-muted-foreground">{activeTruck.engine}</p>
              </div>
              <Badge
                variant={
                  activeTruck.status === "In Transit"
                    ? "express"
                    : activeTruck.status === "Loading"
                    ? "standard"
                    : "warning"
                }
              >
                {activeTruck.status}
              </Badge>
            </div>

            {/* Isuzu OBD-II Registration Verification Strip */}
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-[11px]">
              <span className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-300">
                <Cpu className="h-3.5 w-3.5 shrink-0" />
                OBD ID: <span className="font-mono">{activeTruck.obd.deviceId}</span>
              </span>
              <span className="truncate text-[10px] font-semibold text-muted-foreground">
                Registered Isuzu
              </span>
            </div>

            {/* Studio Vehicle Photo Preview */}
            <div className="mt-3 flex h-28 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-slate-50 to-slate-100/70 p-2 dark:from-slate-900/80 dark:to-slate-950/60">
              <img
                src={activeTruck.imageSrc}
                alt={activeTruck.model}
                className="max-h-full w-auto object-contain drop-shadow-md"
              />
            </div>

            {/* Live GPS Coordinates & Heading */}
            <div className="mt-3 rounded-xl bg-muted/45 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600" />
                  <span className="truncate">{activeTruck.route.currentLocation}</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCameraCommand({
                      id: Date.now(),
                      type: "focus",
                      lat: activeTruck.gps.lat,
                      lng: activeTruck.gps.lng,
                      zoom: 11,
                    })
                  }
                  className="shrink-0 cursor-pointer text-[10px] font-bold text-red-600 hover:underline dark:text-red-400"
                >
                  Zoom Here
                </button>
              </div>
              <div className="mt-1.5 text-[10.5px] text-muted-foreground">
                Dealer: {activeTruck.obd.dealerRegion}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground tabular-nums">
                <span>GPS: {formatCoord(activeTruck.gps.lat, activeTruck.gps.lng)}</span>
                <span className="inline-flex items-center gap-1">
                  <Compass className="h-3 w-3" /> {activeTruck.gps.headingDeg}° · Ping{" "}
                  {activeTruck.gps.lastPing}
                </span>
              </div>
            </div>

            {/* Sensor Mini-Grid */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border/70 p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Gauge className="h-3 w-3 text-red-600" /> Speed / RPM
                </p>
                <p className="mt-0.5 font-extrabold tabular-nums">
                  {activeTruck.route.speedMph} km/h · {activeTruck.obd.rpm.toLocaleString()} rpm
                </p>
              </div>
              <div className="rounded-xl border border-border/70 p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Fuel className="h-3 w-3 text-red-600" /> Fuel / DEF
                </p>
                <p className="mt-0.5 font-extrabold tabular-nums">
                  {activeTruck.fuelPercent}% · DEF {activeTruck.obd.defLevelPct}%
                </p>
              </div>
              <div className="rounded-xl border border-border/70 p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Thermometer className="h-3 w-3 text-sky-600" /> Coolant / Bay
                </p>
                <p className="mt-0.5 font-extrabold tabular-nums">
                  {activeTruck.obd.coolantTempC}°C / {activeTruck.tempCelsius.toFixed(1)}°C
                </p>
              </div>
              <div className="rounded-xl border border-border/70 p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Package className="h-3 w-3 text-red-600" /> Load / Driver
                </p>
                <p className="mt-0.5 truncate font-extrabold tabular-nums">
                  {formatTons(selectedLoadKg, settings.weightUnit)} ({selectedLoadPct}%)
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{selectedDriver.name}</p>
              </div>
            </div>

            {/* Inline OBD-II Code Summary Box */}
            <div
              className={cn(
                "mt-3 rounded-xl border p-3 text-xs",
                selectedObdHealth === "Critical"
                  ? "border-orange-500/50 bg-orange-500/8"
                  : selectedObdHealth === "Warning"
                  ? "border-amber-500/50 bg-amber-500/8"
                  : "border-border bg-muted/35"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  {selectedObdHealth === "Healthy" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  OBD-II ECU: {selectedObdHealth}
                </span>
                <button
                  type="button"
                  onClick={() => scanVehicleObd(activeTruck.id)}
                  className="cursor-pointer text-[11px] font-bold text-red-600 hover:underline dark:text-red-400"
                >
                  Re-Scan
                </button>
              </div>

              {activeTruck.obd.activeCodes.length === 0 ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  0 active DTCs · DPF Soot {activeTruck.obd.dpfSootPct}% ·{" "}
                  {activeTruck.obd.batteryVolts}V
                </p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {activeTruck.obd.activeCodes.map((dtc) => {
                    const info = getDtcInfo(dtc.code);
                    return (
                      <div
                        key={dtc.code}
                        className="rounded-lg border border-border/70 bg-card/90 px-2.5 py-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-extrabold text-red-600 dark:text-red-400">
                            {dtc.code}
                          </span>
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            {info.severity}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium leading-snug text-foreground">
                          {info.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActivePage("obd")}
                className="h-9 rounded-xl text-xs font-semibold"
              >
                <Activity className="h-3.5 w-3.5 text-red-600" />
                OBD Details
              </Button>
              <Button
                size="sm"
                onClick={() => setActivePage("dashboard")}
                className="h-9 rounded-xl text-xs font-semibold"
              >
                <Navigation className="h-3.5 w-3.5" />
                Cargo Bay
              </Button>
            </div>
          </Card>

          {/* All Registered Isuzu OBD Vehicles List */}
          <Card className="p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">
                Registered Isuzu OBD Units ({visibleTrucks.length})
              </p>
              <span className="text-[10px] font-semibold text-muted-foreground">
                Click to fly &amp; inspect
              </span>
            </div>
            <div className="space-y-1.5">
              {visibleTrucks.map((t) => {
                const selected = t.id === activeTruck.id;
                const obd = getVehicleObdHealth(t);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectAndFocus(t.id, true)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-all",
                      selected
                        ? "border-red-600 bg-red-500/[0.06]"
                        : "border-border/70 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <img
                        src={t.imageSrc}
                        alt={t.model}
                        className="h-8 w-14 shrink-0 object-contain"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-foreground">{t.series}</span>
                          <LicensePlateBadge
                            plate={t.plate}
                            plateType={t.plateType}
                            size="xs"
                          />
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {t.route.originCode} → {t.route.destinationCode} · {t.route.speedMph} km/h
                          · {t.obd.deviceId}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {t.obd.activeCodes.length > 0 ? (
                        <Badge variant={obd === "Critical" ? "destructive" : "warning"}>
                          {t.obd.activeCodes.length} DTC
                        </Badge>
                      ) : (
                        <Badge variant="secondary">OK</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
