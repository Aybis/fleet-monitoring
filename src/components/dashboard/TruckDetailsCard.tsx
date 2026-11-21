import { useState } from "react";
import {
  Box,
  Truck,
  Phone,
  MessageSquare,
  ArrowRight,
  ArrowLeftRight,
  SquarePen,
  ChevronDown,
  Star,
  Check,
  Send,
  PhoneCall,
} from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { CITY_HUBS, DOCK_OPTIONS } from "@/data/initialData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ActionMenu,
  ActionMenuTrigger,
  ActionMenuPanel,
  ActionMenuOption,
  ActionMenuHeading,
} from "@/components/ui/menu";
import { cn } from "@/lib/utils";

export function TruckDetailsCard() {
  const {
    trucks,
    activeTruck,
    activeDriver,
    drivers,
    selectTruck,
    changeTruckDriver,
    updateTruckRoute,
    setActivePage,
    setDispatchModalOpen,
    sendDriverMessage,
    pushToast,
  } = useHaulTrack();

  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  // Route edit form state
  const [originCode, setOriginCode] = useState(activeTruck.route.originCode);
  const [destCode, setDestCode] = useState(activeTruck.route.destinationCode);
  const [dock, setDock] = useState(activeTruck.dock);
  const [startedAt, setStartedAt] = useState(activeTruck.startedAt);

  // Driver chat state
  const [chatText, setChatText] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ from: "ops" | "driver"; text: string; time: string }>>([
    {
      from: "driver",
      text: "Checked in at Karawang Dock #3. Rear trailer doors open and OBD-II telemetry online.",
      time: "08:50 WIB",
    },
    {
      from: "ops",
      text: "Copy Budi. Loading final floor pallets C4–C5, then ready for A5 before Tol Cipali.",
      time: "09:10 WIB",
    },
  ]);

  const openRouteEditor = () => {
    setOriginCode(activeTruck.route.originCode);
    setDestCode(activeTruck.route.destinationCode);
    setDock(activeTruck.dock);
    setStartedAt(activeTruck.startedAt);
    setRouteModalOpen(true);
  };

  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    const originHub = CITY_HUBS.find((h) => h.code === originCode) ?? CITY_HUBS[0];
    const destHub = CITY_HUBS.find((h) => h.code === destCode) ?? CITY_HUBS[1];
    updateTruckRoute(activeTruck.id, {
      originCode: originHub.code,
      originCity: originHub.city,
      destinationCode: destHub.code,
      destinationCity: destHub.city,
      dock,
      startedAt,
    });
    setRouteModalOpen(false);
  };

  const handleSendChat = (textToSend?: string) => {
    const clean = (textToSend ?? chatText).trim();
    if (!clean) return;
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    setChatHistory((prev) => [...prev, { from: "ops", text: clean, time }]);
    sendDriverMessage(activeDriver.name, clean);
    setChatText("");
  };

  const statusTone =
    activeTruck.status === "In Transit"
      ? "bg-red-500/12 text-red-700 dark:text-red-300"
      : activeTruck.status === "Loading"
      ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
      : activeTruck.status === "Ready to Dispatch"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : "bg-red-500/12 text-red-700 dark:text-red-300";

  const dotColor =
    activeTruck.status === "In Transit"
      ? "bg-red-500"
      : activeTruck.status === "Loading"
      ? "bg-sky-500"
      : activeTruck.status === "Ready to Dispatch"
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <>
      <Card className="p-4">
        {/* Card Header: Truck Selector + Live Status */}
        <div className="flex items-center justify-between gap-2">
          <ActionMenu>
            <ActionMenuTrigger asChild>
              <button
                type="button"
                className="group flex cursor-pointer items-center gap-2 rounded-lg py-0.5 pr-1 text-left transition-colors hover:bg-muted/70"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-xs">
                  <Box className="h-4 w-4" />
                </span>
                <span className="text-[14px] font-bold tracking-tight text-foreground">
                  {activeTruck.id} Details
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
              </button>
            </ActionMenuTrigger>
            <ActionMenuPanel align="start" className="w-72">
              <ActionMenuHeading>Switch Active Isuzu Vehicle</ActionMenuHeading>
              {trucks.map((t) => (
                <ActionMenuOption
                  key={t.id}
                  onSelect={() => selectTruck(t.id)}
                  className="justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Truck className="h-3.5 w-3.5 shrink-0 text-red-600" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold">
                        {t.id}{" "}
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          · {t.series}
                        </span>
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {t.model} · {t.route.originCode} → {t.route.destinationCode}
                      </p>
                    </div>
                  </div>
                  {t.id === activeTruck.id && <Check className="h-3.5 w-3.5 shrink-0 text-red-600" />}
                </ActionMenuOption>
              ))}
            </ActionMenuPanel>
          </ActionMenu>

          <button
            type="button"
            onClick={() => setDispatchModalOpen(true)}
            title="Click to update dispatch status"
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-85",
              statusTone
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
            {activeTruck.status}
          </button>
        </div>

        {/* Driver Row */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300">
              <Truck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Driver</p>
              <p className="truncate text-[14px] font-bold text-foreground">
                {activeDriver.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setCallModalOpen(true)}
              aria-label={`Call ${activeDriver.name}`}
              title={`Call ${activeDriver.name}`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChatModalOpen(true)}
              aria-label={`Message ${activeDriver.name}`}
              title={`Message ${activeDriver.name}`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Truck ID / Plate / Dock / Started */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border/70 py-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Plate No.</p>
            <div className="mt-1">
              <LicensePlateBadge
                plate={activeTruck.plate}
                plateType={activeTruck.plateType}
                expiry={activeTruck.plateExpiry}
                showExpiry
                size="xs"
              />
            </div>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Dock</p>
            <p className="mt-1 text-[12px] font-bold text-foreground">{activeTruck.dock}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Started</p>
            <p className="mt-1 text-[12px] font-bold text-foreground tabular-nums">
              {activeTruck.startedAt}
            </p>
          </div>
        </div>

        {/* Route Corridor Visual */}
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-[15px] font-extrabold leading-tight text-foreground">
              {activeTruck.route.originCode}
            </p>
            <p className="text-[11px] text-muted-foreground">{activeTruck.route.originCity}</p>
          </div>

          <div className="flex flex-1 items-center gap-1.5 px-1">
            <div className="h-px flex-1 border-t border-dashed border-slate-300 dark:border-slate-600" />
            <button
              type="button"
              onClick={() => setActivePage("map")}
              title="Open ISUZU Live Fleet GPS Map"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition-transform hover:scale-105 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <div className="h-px flex-1 border-t border-dashed border-slate-300 dark:border-slate-600" />
          </div>

          <div className="text-right">
            <p className="text-[15px] font-extrabold leading-tight text-foreground">
              {activeTruck.route.destinationCode}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {activeTruck.route.destinationCity}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDriverModalOpen(true)}
            className="h-9 rounded-xl text-[12px] font-semibold"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
            Change Driver
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openRouteEditor}
            className="h-9 rounded-xl text-[12px] font-semibold"
          >
            <SquarePen className="h-3.5 w-3.5 text-muted-foreground" />
            Edit Route
          </Button>
        </div>
      </Card>

      {/* Change Driver Dialog */}
      <Dialog open={driverModalOpen} onOpenChange={setDriverModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Driver for {activeTruck.id}</DialogTitle>
            <DialogDescription>
              Select a certified commercial driver currently on roster. Shift logs update immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {drivers.map((drv) => {
              const isCurrent = drv.id === activeDriver.id;
              return (
                <button
                  key={drv.id}
                  type="button"
                  onClick={() => {
                    if (!isCurrent) {
                      changeTruckDriver(activeTruck.id, drv.id);
                    }
                    setDriverModalOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-all",
                    isCurrent
                      ? "border-red-500 bg-red-500/[0.06]"
                      : "border-border hover:border-red-500/40 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/15 text-xs font-bold text-red-700 dark:text-red-300">
                      {drv.avatarInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{drv.name}</p>
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-500">
                          <Star className="h-3 w-3 fill-amber-400" />
                          {drv.rating.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {drv.license} · {drv.completedTrips.toLocaleString()} trips
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={drv.status === "Available" ? "express" : "secondary"}>
                      {isCurrent ? "Assigned" : drv.status}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Route Dialog */}
      <Dialog open={routeModalOpen} onOpenChange={setRouteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Route & Dock — {activeTruck.id}</DialogTitle>
            <DialogDescription>
              Update corridor origin, destination hub, loading dock, and scheduled departure.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRoute} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Origin Hub
                </label>
                <select
                  value={originCode}
                  onChange={(e) => setOriginCode(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {CITY_HUBS.map((h) => (
                    <option key={h.code} value={h.code}>
                      {h.code} — {h.city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Destination Hub
                </label>
                <select
                  value={destCode}
                  onChange={(e) => setDestCode(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {CITY_HUBS.map((h) => (
                    <option key={h.code} value={h.code}>
                      {h.code} — {h.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Loading Dock
                </label>
                <select
                  value={dock}
                  onChange={(e) => setDock(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {DOCK_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Started / Departure
                </label>
                <Input
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                  placeholder="08:34 AM"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRouteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Route Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Call Driver Dialog */}
      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
            <PhoneCall className="h-7 w-7 animate-pulse" />
          </div>
          <DialogTitle className="text-center">Calling {activeDriver.name}</DialogTitle>
          <DialogDescription className="text-center">
            Cab Radio Bridge · {activeDriver.phone}
          </DialogDescription>
          <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
            Vehicle <strong className="text-foreground">{activeTruck.id}</strong> ·{" "}
            {activeTruck.route.currentLocation}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCallModalOpen(false);
                pushToast({
                  title: "Voice call ended",
                  description: `Logged dispatch call with ${activeDriver.name}.`,
                });
              }}
            >
              End Call
            </Button>
            <Button
              onClick={() => {
                setCallModalOpen(false);
                setChatModalOpen(true);
              }}
            >
              Switch to Cab Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Driver Dialog */}
      <Dialog open={chatModalOpen} onOpenChange={setChatModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cab Dispatch Chat — {activeDriver.name}</DialogTitle>
            <DialogDescription>
              Direct telemetry link to {activeTruck.id} ({activeDriver.phone})
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 space-y-2.5 overflow-y-auto rounded-xl bg-muted/40 p-3">
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
                    "max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed",
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

          {/* Quick dispatch replies */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              "Confirm A3 strap tension",
              "Proceed to Dock #3 gate",
              "Send updated ETA",
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="mt-3 flex gap-2"
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
        </DialogContent>
      </Dialog>
    </>
  );
}
