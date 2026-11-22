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
} from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { CITY_HUBS, DOCK_OPTIONS } from "@/data/initialData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import {
  DriverCommsDrawer,
  type CommsDrawerTab,
} from "@/components/panels/DriverCommsDrawer";
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
  } = useHaulTrack();

  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);

  // Slide-over Right Bar state for Chat, Voice Call, and Driver/Vehicle Details
  const [commsOpen, setCommsOpen] = useState(false);
  const [commsTab, setCommsTab] = useState<CommsDrawerTab>("chat");

  // Route edit form state
  const [originCode, setOriginCode] = useState(activeTruck.route.originCode);
  const [destCode, setDestCode] = useState(activeTruck.route.destinationCode);
  const [dock, setDock] = useState(activeTruck.dock);
  const [startedAt, setStartedAt] = useState(activeTruck.startedAt);

  const openCommsDrawer = (tab: CommsDrawerTab) => {
    setCommsTab(tab);
    setCommsOpen(true);
  };

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
                  <div className="flex min-w-0 items-center gap-2">
                    <Truck className="h-3.5 w-3.5 shrink-0 text-red-600" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold">
                        {t.id}{" "}
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          · {t.series}
                        </span>
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {t.plate} · {t.route.originCode} → {t.route.destinationCode}
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
            title="Click to confirm dispatch status"
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-85",
              statusTone
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
            {activeTruck.status}
          </button>
        </div>

        {/* Driver Row — Clicking opens Right Bar with Driver & Vehicle Details; Phone/Chat open Call/Chat in Right Bar */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => openCommsDrawer("details")}
            title="View driver & vehicle details in right panel"
            className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl p-1 -ml-1 text-left transition-colors hover:bg-muted/60"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300">
              <Truck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Driver · View Details</p>
              <p className="truncate text-[14px] font-bold text-foreground group-hover:text-red-600 dark:group-hover:text-red-400">
                {activeDriver.name}
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => openCommsDrawer("call")}
              aria-label={`Call ${activeDriver.name}`}
              title={`Open Voice Call bar with ${activeDriver.name}`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => openCommsDrawer("chat")}
              aria-label={`Message ${activeDriver.name}`}
              title={`Open Cab Chat bar with ${activeDriver.name}`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Plate No. / Dock / Started */}
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
              title="Open HORUS Live Fleet GPS Map"
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

      {/* Right Slide-Over Bar for Cab Chat, Voice Call & Driver/Vehicle Details */}
      <DriverCommsDrawer
        open={commsOpen}
        initialTab={commsTab}
        onClose={() => setCommsOpen(false)}
      />

      {/* Change Driver Confirmation Modal */}
      <Dialog open={driverModalOpen} onOpenChange={setDriverModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Driver Reassignment — {activeTruck.id}</DialogTitle>
            <DialogDescription>
              Select a certified commercial driver to reassign onto {activeTruck.plate}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
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
                  <Badge variant={drv.status === "Available" ? "express" : "secondary"}>
                    {isCurrent ? "Assigned" : drv.status}
                  </Badge>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Route Confirmation Modal */}
      <Dialog open={routeModalOpen} onOpenChange={setRouteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Route &amp; Dock Update — {activeTruck.id}</DialogTitle>
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
                  placeholder="08:34 WIB"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRouteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Confirm Route Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
