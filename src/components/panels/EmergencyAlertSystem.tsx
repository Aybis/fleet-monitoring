import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Siren,
  AlertTriangle,
  MapPin,
  PhoneCall,
  X,
  CheckCircle2,
  ShieldAlert,
  Wrench,
  Volume2,
  VolumeX,
  Gauge,
  Thermometer,
  Activity,
  Cpu,
  Clock,
  CheckSquare,
  Square,
  Truck,
} from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatElapsed(epochMs: number, nowMs: number): string {
  const sec = Math.max(0, Math.floor((nowMs - epochMs) / 1000));
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function GlobalEmergencyBanner() {
  const {
    emergencyAlerts,
    setActiveIncidentId,
    acknowledgeEmergencyAlert,
    selectTruck,
    setActivePage,
    alertSoundEnabled,
    setAlertSoundEnabled,
  } = useHaulTrack();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const activeAlerts = emergencyAlerts.filter((a) => a.status === "Active");

  useEffect(() => {
    if (activeAlerts.length === 0) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeAlerts.length]);

  if (activeAlerts.length === 0) return null;

  const lead = activeAlerts[0];
  const isAccident = lead.type === "accident";

  return (
    <div
      role="alert"
      className={cn(
        "mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-white shadow-lg transition-all",
        isAccident
          ? "border-red-400/70 bg-gradient-to-r from-[#8f0915] via-[#d91324] to-[#8f0915]"
          : "border-amber-400/70 bg-gradient-to-r from-[#7c1d12] via-[#c2211b] to-[#7c1d12]"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-xl bg-white/30" />
          <Siren className="relative h-5 w-5 text-white" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-700">
              {isAccident ? "ACCIDENT / IMPACT ALERT" : "URGENT FAILURE ALERT"}
            </span>
            {lead.isDummySimulation && (
              <span className="rounded-md bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Dummy Trigger
              </span>
            )}
            <span className="font-mono text-xs font-extrabold text-white">
              {lead.truckId} · {lead.plate}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-black/25 px-2 py-0.5 font-mono text-[10.5px] font-bold tabular-nums text-red-100">
              <Clock className="h-3 w-3" />
              SLA {formatElapsed(lead.triggeredEpochMs, nowMs)}
            </span>
            {activeAlerts.length > 1 && (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
                +{activeAlerts.length - 1} more urgent
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs font-semibold text-red-50">
            {lead.title} — {lead.location} · Driver: {lead.driverName}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAlertSoundEnabled(!alertSoundEnabled)}
          title={alertSoundEnabled ? "Mute alert sound" : "Unmute alert sound"}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/20"
        >
          {alertSoundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            selectTruck(lead.truckId);
            setActivePage("map");
          }}
          className="h-8 rounded-xl border-white/30 bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20 hover:text-white"
        >
          <MapPin className="h-3.5 w-3.5" />
          Locate
        </Button>

        <Button
          size="sm"
          onClick={() => setActiveIncidentId(lead.id)}
          className="h-8 rounded-xl bg-white px-3.5 text-xs font-extrabold text-red-700 hover:bg-red-50"
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Inspect &amp; Respond
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => acknowledgeEmergencyAlert(lead.id)}
          className="h-8 rounded-xl border-white/30 bg-black/20 px-3 text-xs font-bold text-white hover:bg-black/35 hover:text-white"
        >
          Acknowledge
        </Button>
      </div>
    </div>
  );
}

export function IncidentResponseDrawer() {
  const {
    emergencyAlerts,
    activeIncidentId,
    setActiveIncidentId,
    trucks,
    lookupDtc,
    acknowledgeEmergencyAlert,
    dispatchEmergencyResponse,
    toggleIncidentChecklistItem,
    resolveEmergencyAlert,
    selectTruck,
    setActivePage,
    pushToast,
  } = useHaulTrack();

  const [confirmResolveOpen, setConfirmResolveOpen] = useState(false);

  const incident = emergencyAlerts.find((a) => a.id === activeIncidentId) ?? null;
  const truck = incident ? trucks.find((t) => t.id === incident.truckId) : undefined;
  const dtcInfo = incident?.dtcCode ? lookupDtc(incident.dtcCode) : null;

  useEffect(() => {
    if (!incident) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmResolveOpen) setActiveIncidentId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [incident, confirmResolveOpen, setActiveIncidentId]);

  if (!incident) return null;

  const doneCount = incident.responseChecklist.filter((c) => c.done).length;
  const checklistPct = Math.round((doneCount / Math.max(1, incident.responseChecklist.length)) * 100);
  const isAccident = incident.type === "accident";

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-50 flex h-dvh w-screen justify-end overflow-hidden">
          <div
            onClick={() => setActiveIncidentId(null)}
            className="animate-overlay-fade fixed inset-0 bg-slate-950/45 backdrop-blur-[1.5px]"
          />

          <aside
            aria-label="HORUS Emergency Incident Response Panel"
            className="animate-drawer-in relative z-10 flex h-dvh max-h-dvh w-full max-w-[490px] flex-col overflow-hidden border-l border-border bg-card text-card-foreground shadow-2xl"
          >
            {/* Top Emergency Banner Header */}
            <div
              className={cn(
                "shrink-0 border-b px-5 py-4 text-white",
                isAccident
                  ? "border-red-400/30 bg-gradient-to-r from-[#7f0813] to-[#c91122]"
                  : "border-amber-400/30 bg-gradient-to-r from-[#450a0a] to-[#991b1b]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-700">
                      <Siren className="h-3 w-3" />
                      {incident.severity}
                    </span>
                    <span className="rounded-md bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase text-red-100">
                      Status: {incident.status}
                    </span>
                    {incident.isDummySimulation && (
                      <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                        Dummy Demo
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-sm font-extrabold leading-snug">{incident.title}</h2>
                  <p className="mt-1 text-[11px] text-red-100/90">
                    Triggered at {incident.triggeredAt} · Source: Geotab GO9 / HORUS Hub App
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveIncidentId(null)}
                  aria-label="Close incident drawer"
                  className="cursor-pointer rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Incident Body */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-xs">
              {/* Vehicle & Driver Card */}
              <div className="rounded-2xl border border-border bg-muted/30 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {truck && (
                      <img
                        src={truck.imageSrc}
                        alt={truck.model}
                        className="h-12 w-20 shrink-0 object-contain"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold text-foreground">{incident.truckId}</span>
                        <LicensePlateBadge
                          plate={incident.plate}
                          plateType={truck?.plateType ?? "commercial"}
                          size="xs"
                        />
                      </div>
                      <p className="mt-0.5 truncate font-semibold text-foreground">
                        {incident.model}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        Driver: <strong className="text-foreground">{incident.driverName}</strong> ·{" "}
                        {incident.driverPhone}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-[11px]">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600" />
                    <span className="truncate">{incident.location}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                    {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      pushToast({
                        title: `Dialing ${incident.driverName}`,
                        description: `Connecting HORUS Priority Cab Voice Bridge (${incident.driverPhone})...`,
                        variant: "warning",
                      })
                    }
                    className="h-8 text-[11px]"
                  >
                    <PhoneCall className="h-3.5 w-3.5 text-red-600" />
                    Call Driver Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      selectTruck(incident.truckId);
                      setActiveIncidentId(null);
                      setActivePage("map");
                    }}
                    className="h-8 text-[11px]"
                  >
                    <MapPin className="h-3.5 w-3.5 text-red-600" />
                    Zoom Live Map
                  </Button>
                </div>
              </div>

              {/* Failure Detection Summary */}
              <div className="rounded-2xl border border-red-500/35 bg-red-500/[0.05] p-3.5">
                <p className="flex items-center gap-1.5 font-extrabold text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Geotab GO9 Failure Detection Analysis
                </p>
                <p className="mt-1.5 leading-relaxed text-foreground">{incident.summary}</p>
              </div>

              {/* Telemetry Snapshot Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {incident.gForce !== undefined ? (
                  <div className="rounded-xl border border-red-500/45 bg-red-500/10 p-2.5">
                    <p className="flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-300">
                      <Activity className="h-3 w-3" /> Impact Force
                    </p>
                    <p className="mt-1 text-base font-black text-red-700 tabular-nums dark:text-red-300">
                      {incident.gForce.toFixed(1)}G
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-background p-2.5">
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Cpu className="h-3 w-3 text-red-600" /> Lead DTC
                    </p>
                    <p className="mt-1 font-mono text-base font-black text-red-600 dark:text-red-400">
                      {incident.dtcCode ?? "OBD"}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-background p-2.5">
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Gauge className="h-3 w-3 text-red-600" /> Speed Drop
                  </p>
                  <p className="mt-1 text-sm font-extrabold tabular-nums">
                    {incident.speedBeforeKmh ?? truck?.route.speedMph ?? 0} →{" "}
                    {incident.speedAfterKmh ?? 0} km/h
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-2.5">
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Thermometer className="h-3 w-3 text-amber-500" /> Coolant
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-base font-extrabold tabular-nums",
                      (incident.coolantTempC ?? 0) >= 100 && "text-red-600 dark:text-red-400"
                    )}
                  >
                    {incident.coolantTempC ?? truck?.obd.coolantTempC ?? 86}°C
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-2.5">
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Truck className="h-3 w-3 text-sky-600" /> Fuel Rail
                  </p>
                  <p className="mt-1 text-base font-extrabold tabular-nums">
                    {incident.fuelRailMpa ?? truck?.obd.fuelRailMpa ?? 0} MPa
                  </p>
                </div>
              </div>

              {/* Master Data Code Meaning Box */}
              {dtcInfo && (
                <div className="rounded-2xl border border-border bg-background/70 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-red-600 px-2 py-0.5 font-mono text-[11px] font-extrabold text-white">
                        {dtcInfo.code}
                      </span>
                      <span className="font-bold text-foreground">{dtcInfo.title}</span>
                    </div>
                    <Badge
                      variant={
                        dtcInfo.severity === "Critical"
                          ? "destructive"
                          : dtcInfo.severity === "Warning"
                          ? "warning"
                          : "standard"
                      }
                    >
                      {dtcInfo.severity}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Recommended Fix: </strong>
                    {dtcInfo.recommendedAction}
                  </p>
                </div>
              )}

              {/* Emergency Response SOP Checklist */}
              <div className="rounded-2xl border border-border bg-muted/25 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-foreground">Emergency Response SOP Checklist</p>
                  <span className="font-mono text-[11px] font-bold text-red-600 dark:text-red-400">
                    {doneCount}/{incident.responseChecklist.length} ({checklistPct}%)
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-red-600 transition-all"
                    style={{ width: `${checklistPct}%` }}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {incident.responseChecklist.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleIncidentChecklistItem(incident.id, item.id)}
                      className={cn(
                        "flex w-full cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
                        item.done
                          ? "border-emerald-500/35 bg-emerald-500/8 text-muted-foreground line-through"
                          : "border-border bg-card text-foreground hover:border-red-500/40"
                      )}
                    >
                      {item.done ? (
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-[11.5px] leading-snug">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pinned Bottom Action Footer */}
            <div className="shrink-0 space-y-2 border-t border-border bg-card px-5 py-3.5">
              <div className="grid grid-cols-2 gap-2">
                {incident.status === "Active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acknowledgeEmergencyAlert(incident.id)}
                    className="h-9 text-xs font-bold"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                    Acknowledge Alert
                  </Button>
                )}
                {incident.status !== "Dispatched" && incident.status !== "Resolved" && (
                  <Button
                    size="sm"
                    onClick={() => dispatchEmergencyResponse(incident.id)}
                    className={cn(
                      "h-9 text-xs font-bold",
                      incident.status !== "Active" && "col-span-2"
                    )}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Dispatch Towing / Mobile Service
                  </Button>
                )}
                {incident.status === "Dispatched" && (
                  <Button
                    size="sm"
                    onClick={() => setConfirmResolveOpen(true)}
                    className="col-span-2 h-9 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Incident Resolved
                  </Button>
                )}
              </div>

              {incident.status !== "Resolved" && incident.status !== "Dispatched" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmResolveOpen(true)}
                  className="h-8 w-full text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Close &amp; Mark Incident Resolved
                </Button>
              )}
            </div>
          </aside>
        </div>,
        document.body
      )}

      {/* Confirmation Modal Strictly for Resolving Emergency Incident */}
      <Dialog open={confirmResolveOpen} onOpenChange={setConfirmResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Incident Resolution</DialogTitle>
            <DialogDescription>
              Are you sure driver safety is confirmed and{" "}
              <strong>
                {incident.truckId} ({incident.plate})
              </strong>{" "}
              incident &ldquo;{incident.title}&rdquo; is fully resolved? This will close the urgent
              alert banner and archive the case.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmResolveOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                setConfirmResolveOpen(false);
                resolveEmergencyAlert(incident.id);
              }}
            >
              Confirm Resolve Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
