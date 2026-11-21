import { useMemo, useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Truck,
  Package,
  User,
  Cpu,
  CheckCheck,
  Radio,
  RotateCcw,
  Settings,
  X,
} from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { OBD_CODE_LIST } from "@/data/obdDatabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ActionMenu,
  ActionMenuTrigger,
  ActionMenuPanel,
  ActionMenuOption,
  ActionMenuHeading,
  ActionMenuDivider,
} from "@/components/ui/menu";
import { Badge } from "@/components/ui/badge";
import { cn, formatWeight } from "@/lib/utils";

export function TopHeader() {
  const {
    trucks,
    drivers,
    queuedShipments,
    notifications,
    settings,
    updateSettings,
    setActivePage,
    selectTruck,
    flashSlot,
    markNotificationRead,
    markAllNotificationsRead,
    resetDemoData,
  } = useHaulTrack();

  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const matchedTrucks = trucks.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.plate.toLowerCase().includes(q) ||
        t.obd.deviceId.toLowerCase().includes(q) ||
        t.series.toLowerCase().includes(q) ||
        t.model.toLowerCase().includes(q) ||
        t.engine.toLowerCase().includes(q) ||
        t.route.originCity.toLowerCase().includes(q) ||
        t.route.destinationCity.toLowerCase().includes(q)
    );

    const matchedObd = OBD_CODE_LIST.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.subsystem.toLowerCase().includes(q)
    );

    const matchedLoadedSlots: Array<{
      truckId: string;
      slotId: string;
      code: string;
      title: string;
      weightKg: number;
    }> = [];
    for (const t of trucks) {
      for (const s of t.slots) {
        if (
          s.cargo &&
          (s.cargo.shipmentCode.toLowerCase().includes(q) ||
            s.cargo.title.toLowerCase().includes(q) ||
            s.cargo.customer.toLowerCase().includes(q) ||
            s.id.toLowerCase() === q)
        ) {
          matchedLoadedSlots.push({
            truckId: t.id,
            slotId: s.id,
            code: s.cargo.shipmentCode,
            title: s.cargo.title,
            weightKg: s.cargo.weightKg,
          });
        }
      }
    }

    const matchedQueued = queuedShipments.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q) ||
        s.priority.toLowerCase().includes(q)
    );

    const matchedDrivers = drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.license.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q)
    );

    return {
      trucks: matchedTrucks.slice(0, 4),
      obd: matchedObd.slice(0, 3),
      loaded: matchedLoadedSlots.slice(0, 3),
      queued: matchedQueued.slice(0, 3),
      drivers: matchedDrivers.slice(0, 3),
      total:
        matchedTrucks.length +
        matchedObd.length +
        matchedLoadedSlots.length +
        matchedQueued.length +
        matchedDrivers.length,
    };
  }, [query, trucks, queuedShipments, drivers]);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 pb-5 pt-1">
      {/* Authentic ISUZU FleetConnect Brand Lockup */}
      <button
        type="button"
        onClick={() => setActivePage("dashboard")}
        className="flex cursor-pointer items-center gap-2.5 text-left transition-opacity hover:opacity-85"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[22px] font-black leading-none tracking-[0.09em] text-[#e60012] dark:text-[#ff3b4e]">
              ISUZU
            </span>
            <span className="rounded-md bg-red-600/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-red-700 dark:text-red-300">
              FleetConnect
            </span>
          </div>
          <span className="mt-1 text-[11px] font-medium text-muted-foreground">
            Commercial Cargo · Live GPS · OBD-II Telematics
          </span>
        </div>
      </button>

      {/* Global Search Bar */}
      <div ref={searchBoxRef} className="relative order-3 w-full sm:order-2 sm:max-w-[560px] sm:flex-1">
        <div
          className={cn(
            "flex h-11 items-center gap-2.5 rounded-full border bg-card/90 px-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-all",
            searchFocused
              ? "border-red-500/60 ring-2 ring-red-500/15"
              : "border-border/80 hover:border-border"
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plat nomor (B 9482 KXU), OBD ID, Isuzu trucks, or DTC..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {searchFocused && searchResults && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[420px] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-2xl">
            {searchResults.total === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No Isuzu vehicles, OBD codes, shipments, or drivers matching &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {searchResults.trucks.length > 0 && (
                  <div>
                    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Isuzu Fleet Vehicles
                    </p>
                    {searchResults.trucks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          selectTruck(t.id);
                          setActivePage("dashboard");
                          setSearchFocused(false);
                          setQuery("");
                        }}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="flex items-center gap-2 font-semibold">
                          <Truck className="h-4 w-4 text-red-600" />
                          {t.id}
                          <span className="font-normal text-muted-foreground">
                            · {t.model} ({t.route.originCode} → {t.route.destinationCode})
                          </span>
                        </span>
                        <Badge variant="default">{t.status}</Badge>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.obd.length > 0 && (
                  <div>
                    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      OBD-II / J1939 Trouble Codes
                    </p>
                    {searchResults.obd.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setActivePage("obd");
                          setSearchFocused(false);
                          setQuery("");
                        }}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Cpu className="h-4 w-4 shrink-0 text-amber-500" />
                          <div className="min-w-0">
                            <p className="font-mono font-bold text-red-600 dark:text-red-400">
                              {c.code}{" "}
                              <span className="font-sans font-semibold text-foreground">
                                — {c.title}
                              </span>
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{c.meaning}</p>
                          </div>
                        </div>
                        <Badge variant={c.severity === "Critical" ? "destructive" : "warning"}>
                          {c.severity}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.loaded.length > 0 && (
                  <div>
                    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Loaded Cargo Slots
                    </p>
                    {searchResults.loaded.map((item) => (
                      <button
                        key={`${item.truckId}-${item.slotId}`}
                        type="button"
                        onClick={() => {
                          selectTruck(item.truckId);
                          setActivePage("dashboard");
                          flashSlot(item.slotId);
                          setSearchFocused(false);
                          setQuery("");
                        }}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-red-600" />
                          <div>
                            <p className="font-semibold leading-tight">
                              {item.code}{" "}
                              <span className="font-normal text-muted-foreground">
                                ({item.truckId} · Slot {item.slotId})
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">{item.title}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground tabular-nums">
                          {formatWeight(item.weightKg, settings.weightUnit)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.queued.length > 0 && (
                  <div>
                    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pending Queue
                    </p>
                    {searchResults.queued.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setActivePage("shipments");
                          setSearchFocused(false);
                          setQuery("");
                        }}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-sky-600" />
                          <div>
                            <p className="font-semibold leading-tight">{s.id}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.customer} · {s.originCode} → {s.destinationCode}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            s.priority === "Express"
                              ? "express"
                              : s.priority === "Same-day"
                              ? "sameday"
                              : "standard"
                          }
                        >
                          {s.priority}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.drivers.length > 0 && (
                  <div>
                    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Drivers
                    </p>
                    {searchResults.drivers.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          const assignedTruck = trucks.find((t) => t.driverId === d.id);
                          if (assignedTruck) {
                            selectTruck(assignedTruck.id);
                            setActivePage("dashboard");
                          } else {
                            setActivePage("fleet");
                          }
                          setSearchFocused(false);
                          setQuery("");
                        }}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {d.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{d.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Utility Controls */}
      <div className="order-2 flex items-center gap-2.5 sm:order-3">
        {/* Notifications Bell Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:bg-muted"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h4 className="text-sm font-bold">ISUZU Fleet &amp; OBD Alerts</h4>
                <p className="text-[11px] text-muted-foreground">
                  {unreadCount} unread telemetry &amp; dispatch notices
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[320px] divide-y divide-border overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    markNotificationRead(n.id);
                    if (n.truckId) selectTruck(n.truckId);
                    if (n.openObd) {
                      setActivePage("obd");
                    } else if (n.truckId) {
                      setActivePage("dashboard");
                      if (n.slotId) flashSlot(n.slotId);
                    }
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    !n.read && "bg-red-500/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.severity === "warning"
                        ? "bg-amber-500"
                        : n.severity === "success"
                        ? "bg-red-600"
                        : "bg-sky-500",
                      n.read && "opacity-35"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {n.time}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {n.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={() => updateSettings({ darkMode: !settings.darkMode })}
          aria-label="Toggle color theme"
          title={settings.darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:bg-muted"
        >
          {settings.darkMode ? (
            <Sun className="h-[18px] w-[18px] text-amber-400" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </button>

        {/* Account Avatar Dropdown */}
        <ActionMenu>
          <ActionMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex cursor-pointer items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-muted/80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c8102e] text-sm font-bold text-white shadow-sm">
                A
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </ActionMenuTrigger>
          <ActionMenuPanel className="w-64">
            <div className="px-2.5 py-2">
              <p className="text-sm font-bold text-foreground">Alex Morgan</p>
              <p className="text-xs text-muted-foreground">Isuzu Commercial Fleet Lead</p>
              <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                {settings.depotName}
              </p>
            </div>
            <ActionMenuDivider />
            <ActionMenuHeading>Telematics Shortcuts</ActionMenuHeading>
            <ActionMenuOption onSelect={() => setActivePage("map")}>
              <Radio className="h-4 w-4 text-red-600" />
              Live Fleet GPS Map
            </ActionMenuOption>
            <ActionMenuOption onSelect={() => setActivePage("obd")}>
              <Cpu className="h-4 w-4 text-amber-500" />
              OBD-II Diagnostics Console
            </ActionMenuOption>
            <ActionMenuOption onSelect={() => setActivePage("settings")}>
              <Settings className="h-4 w-4 text-muted-foreground" />
              Depot &amp; Unit Settings
            </ActionMenuOption>
            <ActionMenuDivider />
            <ActionMenuOption onSelect={resetDemoData} className="text-amber-600 dark:text-amber-400">
              <RotateCcw className="h-4 w-4" />
              Reset Demo Data
            </ActionMenuOption>
          </ActionMenuPanel>
        </ActionMenu>
      </div>
    </header>
  );
}
