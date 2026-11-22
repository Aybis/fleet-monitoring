import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  MessageSquare,
  Send,
  Star,
  ShieldCheck,
  Mail,
  Phone,
  Clock,
  Truck,
  Gauge,
  Fuel,
  Thermometer,
  Cpu,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  User,
} from "lucide-react";
import {
  getTruckLoadKg,
  getTruckLoadPct,
  getVehicleObdHealth,
  useHaulTrack,
} from "@/context/HaulTrackContext";
import { getDtcInfo } from "@/data/obdDatabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import { cn, formatTons } from "@/lib/utils";

export type CommsDrawerTab = "chat" | "call" | "details";

export function DriverCommsDrawer({
  open,
  initialTab,
  onClose,
}: {
  open: boolean;
  initialTab: CommsDrawerTab;
  onClose: () => void;
}) {
  const {
    activeTruck,
    activeDriver,
    settings,
    sendDriverMessage,
    setActivePage,
    pushToast,
  } = useHaulTrack();

  const [tab, setTab] = useState<CommsDrawerTab>(initialTab);
  const [chatText, setChatText] = useState("");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);
  const [callActive, setCallActive] = useState(false);

  const [chatHistory, setChatHistory] = useState<
    Array<{ from: "ops" | "driver"; text: string; time: string }>
  >([
    {
      from: "driver",
      text: "Checked in at Karawang Dock #3. Rear trailer doors open and OBD-II telemetry online.",
      time: "08:50 WIB",
    },
    {
      from: "ops",
      text: "Copy. Loading final floor pallets C4–C5, then ready for A5 before Tol Cipali.",
      time: "09:10 WIB",
    },
  ]);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      if (initialTab === "call") {
        setCallActive(true);
        setCallSeconds(0);
      }
    } else {
      setCallActive(false);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || !callActive) return;
    const id = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [open, callActive]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const loadKg = getTruckLoadKg(activeTruck);
  const loadPct = getTruckLoadPct(activeTruck);
  const obdHealth = getVehicleObdHealth(activeTruck);

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSendChat = (textToSend?: string) => {
    const clean = (textToSend ?? chatText).trim();
    if (!clean) return;
    const time = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setChatHistory((prev) => [...prev, { from: "ops", text: clean, time: `${time} WIB` }]);
    sendDriverMessage(activeDriver.name, clean);
    setChatText("");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex h-dvh w-screen justify-end overflow-hidden">
      {/* Subtle Backdrop */}
      <div
        onClick={onClose}
        className="animate-overlay-fade fixed inset-0 bg-slate-950/35 backdrop-blur-[1.5px]"
      />

      {/* Right Slide-Over Dispatch & Comms Bar — exact 100dvh viewport height */}
      <aside
        aria-label="Driver Communications & Vehicle Details Panel"
        className="animate-drawer-in relative z-10 flex h-dvh max-h-dvh w-full max-w-[440px] flex-col overflow-hidden border-l border-border bg-card text-card-foreground shadow-2xl"
      >
        {/* Top Bar Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600/15 text-xs font-extrabold text-red-700 dark:text-red-300">
              {activeDriver.avatarInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-extrabold text-foreground">
                  {activeDriver.name}
                </h2>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-500">
                  <Star className="h-3 w-3 fill-amber-400" />
                  {activeDriver.rating.toFixed(2)}
                </span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {activeTruck.id} · {activeTruck.model}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close right panel"
            className="cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Compact Persistent Driver + Vehicle Context Ribbon */}
        <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/35 px-5 py-2.5 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={activeTruck.imageSrc}
              alt={activeTruck.model}
              className="h-8 w-14 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <LicensePlateBadge
                  plate={activeTruck.plate}
                  plateType={activeTruck.plateType}
                  size="xs"
                />
                <span className="text-[11px] font-bold text-foreground tabular-nums">
                  {activeTruck.route.speedMph} km/h
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                {activeTruck.route.originCode} → {activeTruck.route.destinationCode} ·{" "}
                {activeTruck.obd.deviceId}
              </p>
            </div>
          </div>
          <Badge
            variant={
              obdHealth === "Critical"
                ? "destructive"
                : obdHealth === "Warning"
                ? "warning"
                : "secondary"
            }
          >
            {activeTruck.obd.activeCodes.length === 0
              ? "OBD OK"
              : `${activeTruck.obd.activeCodes.length} DTC`}
          </Badge>
        </div>

        {/* 3-Tab Mode Switcher: Cab Chat | Voice Call | Driver & Vehicle */}
        <div className="grid grid-cols-3 gap-1 border-b border-border bg-background/60 p-2">
          {(
            [
              { id: "chat", label: "Cab Chat", icon: MessageSquare },
              { id: "call", label: "Voice Call", icon: PhoneCall },
              { id: "details", label: "Driver & Unit", icon: Truck },
            ] as Array<{
              id: CommsDrawerTab;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
            }>
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  if (t.id === "call" && !callActive) {
                    setCallActive(true);
                    setCallSeconds(0);
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all",
                  active
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* SCROLLABLE BODY AREA (fits remaining exact screen height) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* TAB 1: CAB CHAT — Pinned header/composer + scrollable middle messages */}
          {tab === "chat" && (
            <div className="flex min-h-0 flex-1 flex-col p-4">
              {/* Mini Driver + Vehicle Info Pill */}
              <div className="shrink-0 rounded-xl border border-border/75 bg-muted/30 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    Cab Link · {activeDriver.phone}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {activeTruck.route.currentLocation}
                </p>
              </div>

              {/* Independently Scrollable Messages Feed */}
              <div className="my-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border/60 bg-muted/25 p-3.5">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col",
                      msg.from === "ops" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs",
                        msg.from === "ops"
                          ? "bg-red-600 text-white"
                          : "border border-border bg-card text-foreground"
                      )}
                    >
                      {msg.text}
                    </div>
                    <span className="mt-1 text-[10px] text-muted-foreground">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Pinned Bottom Quick Presets + Message Input */}
              <div className="shrink-0 space-y-2.5">
                <div>
                  <p className="mb-1.5 text-[10.5px] font-semibold text-muted-foreground">
                    Quick Dispatch Presets
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Confirm A3 strap tension",
                      "Proceed to Dock #3 gate",
                      "Send updated ETA",
                      "Schedule DPD regen at rest area",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSendChat(preset)}
                        className="cursor-pointer rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-red-500/50 hover:bg-red-500/10"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  className="flex gap-2 border-t border-border pt-3"
                >
                  <Input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder={`Message ${activeDriver.name}...`}
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: VOICE CALL (Scrollable if short viewport) */}
          {tab === "call" && (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="rounded-2xl border border-red-500/25 bg-gradient-to-b from-[#1e080b] to-[#110406] p-6 text-center text-white shadow-lg">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600/25 text-red-300 ring-4 ring-red-500/20">
                  <PhoneCall className={cn("h-7 w-7", callActive && "animate-pulse")} />
                </div>
                <p className="mt-3 text-base font-extrabold">{activeDriver.name}</p>
                <p className="text-xs text-red-200/80">{activeDriver.phone}</p>
                <p className="mt-2 font-mono text-lg font-black tracking-widest text-red-400 tabular-nums">
                  {callActive ? formatTimer(callSeconds) : "Standby"}
                </p>
                <p className="mt-1 text-[11px] text-red-200/70">
                  {callActive
                    ? `HORUS Cab Radio Bridge · ${activeTruck.plate}`
                    : "Ready to dial driver cab terminal"}
                </p>

                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    className={cn(
                      "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition-colors",
                      muted
                        ? "border-amber-400 bg-amber-500/20 text-amber-300"
                        : "border-white/15 bg-white/10 text-white hover:bg-white/20"
                    )}
                    title={muted ? "Unmute mic" : "Mute mic"}
                  >
                    {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>

                  {callActive ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCallActive(false);
                        pushToast({
                          title: "Voice call ended",
                          description: `Logged ${formatTimer(callSeconds)} call with ${activeDriver.name}.`,
                        });
                      }}
                      className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-red-700"
                      title="End call"
                    >
                      <PhoneOff className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCallSeconds(0);
                        setCallActive(true);
                      }}
                      className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-emerald-700"
                      title="Start call"
                    >
                      <PhoneCall className="h-5 w-5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSpeaker((s) => !s)}
                    className={cn(
                      "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition-colors",
                      speaker
                        ? "border-white/30 bg-white/18 text-white"
                        : "border-white/10 bg-white/5 text-white/55 hover:bg-white/15"
                    )}
                    title="Toggle speaker"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Live Vehicle Context During Call */}
              <div className="space-y-2.5 rounded-2xl border border-border bg-muted/30 p-4 text-xs">
                <p className="font-bold text-foreground">Live Telemetry During Call</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-card p-2.5 border border-border/70">
                    <p className="text-[10px] text-muted-foreground">Current Speed</p>
                    <p className="font-extrabold tabular-nums">
                      {activeTruck.route.speedMph} km/h
                    </p>
                  </div>
                  <div className="rounded-xl bg-card p-2.5 border border-border/70">
                    <p className="text-[10px] text-muted-foreground">Engine RPM</p>
                    <p className="font-extrabold tabular-nums">
                      {activeTruck.obd.rpm.toLocaleString()} rpm
                    </p>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600" />
                  {activeTruck.route.currentLocation}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setTab("chat")}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Switch to Cab Chat
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: FULL DRIVER & VEHICLE DETAILS (Scrollable inside exact screen height) */}
          {tab === "details" && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {/* Driver Details Section */}
              <div className="rounded-2xl border border-border bg-muted/25 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    <User className="h-3.5 w-3.5 text-red-600" />
                    Driver Profile
                  </span>
                  <Badge variant="express">{activeDriver.status}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
                    {activeDriver.avatarInitials}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-foreground">{activeDriver.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeDriver.completedTrips.toLocaleString()} completed trips ·{" "}
                      {activeDriver.rating.toFixed(2)} ★
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 space-y-2 border-t border-border/70 pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" /> License
                    </span>
                    <span className="font-bold text-foreground">{activeDriver.license}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> Mobile
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {activeDriver.phone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </span>
                    <span className="font-medium text-foreground">{activeDriver.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Shift Started
                    </span>
                    <span className="font-semibold text-foreground">{activeDriver.shiftStart}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Details Section */}
              <div className="rounded-2xl border border-border bg-muted/25 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    <Truck className="h-3.5 w-3.5 text-red-600" />
                    Vehicle Specification
                  </span>
                  <LicensePlateBadge
                    plate={activeTruck.plate}
                    plateType={activeTruck.plateType}
                    expiry={activeTruck.plateExpiry}
                    showExpiry
                    size="xs"
                  />
                </div>

                <div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-border/70 bg-card p-2">
                  <img
                    src={activeTruck.imageSrc}
                    alt={activeTruck.model}
                    className="max-h-full w-auto object-contain drop-shadow-sm"
                  />
                </div>

                <div className="mt-3">
                  <p className="text-sm font-extrabold text-foreground">
                    {activeTruck.id} — {activeTruck.model}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeTruck.vehicleClass} · {activeTruck.engine}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-border/70 bg-card p-2.5">
                    <p className="text-[10px] text-muted-foreground">VIN</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] font-bold">
                      {activeTruck.vin}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-2.5">
                    <p className="text-[10px] text-muted-foreground">Odometer</p>
                    <p className="mt-0.5 font-bold tabular-nums">
                      {activeTruck.odometerKm.toLocaleString()} km
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-2.5">
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Gauge className="h-3 w-3 text-red-600" /> Payload
                    </p>
                    <p className="mt-0.5 font-bold tabular-nums">
                      {formatTons(loadKg, settings.weightUnit)} ({loadPct}%)
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-2.5">
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Fuel className="h-3 w-3 text-red-600" /> Fuel / Coolant
                    </p>
                    <p className="mt-0.5 font-bold tabular-nums">
                      {activeTruck.fuelPercent}% · {activeTruck.obd.coolantTempC}°C
                    </p>
                  </div>
                </div>

                {/* OBD Status */}
                <div className="mt-3 rounded-xl border border-border/75 bg-card p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">
                      {obdHealth === "Healthy" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      OBD-II: {activeTruck.obd.deviceId}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      <Thermometer className="mr-0.5 inline h-3 w-3" />
                      Bay {activeTruck.tempCelsius.toFixed(1)}°C
                    </span>
                  </div>
                  {activeTruck.obd.activeCodes.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {activeTruck.obd.activeCodes.map((c) => (
                        <p key={c.code} className="text-[11px] text-muted-foreground">
                          <strong className="font-mono text-red-600">{c.code}</strong>:{" "}
                          {getDtcInfo(c.code).title}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      All ECU systems nominal · 0 active fault codes.
                    </p>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      setActivePage("obd");
                    }}
                  >
                    <Cpu className="h-3.5 w-3.5 text-red-600" />
                    OBD Console
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onClose();
                      setActivePage("map");
                    }}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Track on Map
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
