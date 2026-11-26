import { useState } from "react";
import {
  LayoutGrid,
  MapPin,
  Cpu,
  BarChart3,
  Database,
  Settings,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { HorusEyeLogo } from "@/components/ui/HorusEyeLogo";
import type { NavPage } from "@/types/haultrack";
import { cn } from "@/lib/utils";

interface NavItemDef {
  id: NavPage;
  matches: NavPage[];
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: Array<{
  title: string;
  shortTitle: string;
  items: NavItemDef[];
}> = [
  {
    title: "Fleet Ops",
    shortTitle: "OPS",
    items: [
      {
        id: "dashboard",
        matches: ["dashboard", "shipments"],
        label: "Operations",
        subtitle: "Cargo bays & shipments",
        icon: LayoutGrid,
      },
      {
        id: "map",
        matches: ["map"],
        label: "Live Map",
        subtitle: "Indonesia GPS & plates",
        icon: MapPin,
      },
      {
        id: "obd",
        matches: ["obd", "fleet"],
        label: "OBD & Fleet",
        subtitle: "Alerts, ECU & vehicles",
        icon: Cpu,
      },
    ],
  },
  {
    title: "Governance",
    shortTitle: "HQ",
    items: [
      {
        id: "analytics",
        matches: ["analytics", "reports"],
        label: "Analytics",
        subtitle: "HO KPIs & reports",
        icon: BarChart3,
      },
      {
        id: "master-data",
        matches: ["master-data"],
        label: "Master Data",
        subtitle: "Codes, severity & hubs",
        icon: Database,
      },
      {
        id: "settings",
        matches: ["settings", "hld"],
        label: "System",
        subtitle: "Settings & Geotab HLD",
        icon: Settings,
      },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function Sidebar() {
  const { activePage, setActivePage, queuedShipments, trucks, emergencyAlerts } = useHaulTrack();
  const [expanded, setExpanded] = useState(false);

  const inTransitCount = trucks.filter((t) => t.status === "In Transit").length;
  const totalObdCodes = trucks.reduce((sum, t) => sum + t.obd.activeCodes.length, 0);
  const activeEmergencies = emergencyAlerts.filter((a) => a.status === "Active").length;

  return (
    <>
      {/* Desktop Floating HORUS Pure Black & White Command Sidebar (Compact 6-Hub Menu) */}
      <aside
        aria-label="Primary navigation"
        className={cn(
          "hidden h-full shrink-0 flex-col justify-between overflow-hidden rounded-[26px] bg-gradient-to-b from-[#111113] via-[#0c0c0e] to-[#080809] py-4 text-white shadow-[0_14px_38px_rgba(0,0,0,0.36)] ring-1 ring-white/8 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
          expanded ? "w-[228px]" : "w-[106px]"
        )}
      >
        {/* Top HORUS Brand Emblem + Expand/Collapse Control */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "mb-4 flex items-center px-2.5",
              expanded ? "justify-between" : "flex-col gap-2"
            )}
          >
            <button
              type="button"
              onClick={() => setActivePage("dashboard")}
              title="HORUS — All-Seeing Fleet Oversight"
              className="group flex cursor-pointer items-center gap-2.5 rounded-xl transition-transform duration-200 hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <div className="flex flex-col items-center">
                <HorusEyeLogo
                  className={cn(
                    "transition-all duration-300",
                    expanded ? "h-10 w-12 rounded-xl" : "h-11 w-[74px]"
                  )}
                />
                {!expanded && (
                  <span className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                    HORUS
                  </span>
                )}
              </div>
              {expanded && (
                <div className="overflow-hidden text-left">
                  <p className="truncate text-[14px] font-black tracking-[0.18em] text-white">
                    HORUS
                  </p>
                  <p className="truncate text-[9.5px] font-medium text-zinc-400">
                    Fleet Oversight
                  </p>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse sidebar" : "Expand sidebar menu"}
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar menu"}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/12 bg-white/5 text-zinc-300 transition-all duration-200 hover:border-white/30 hover:bg-white/12 hover:text-white"
            >
              {expanded ? (
                <PanelLeftClose className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Compact 6-Hub Navigation List */}
          <nav className="sidebar-scroll flex-1 space-y-4 overflow-y-auto px-2 py-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 pt-0.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-zinc-500",
                    !expanded && "justify-center px-0"
                  )}
                >
                  <span>{expanded ? group.title : group.shortTitle}</span>
                  {expanded && <span className="h-px flex-1 bg-white/10" />}
                </div>

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.matches.includes(activePage);
                  const badgeCount =
                    item.id === "dashboard"
                      ? queuedShipments.length
                      : item.id === "obd"
                      ? activeEmergencies > 0
                        ? activeEmergencies
                        : totalObdCodes
                      : 0;
                  const isUrgentObd = item.id === "obd" && activeEmergencies > 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePage(item.id)}
                      title={`${item.label} — ${item.subtitle}`}
                      className={cn(
                        "group relative flex w-full cursor-pointer items-center rounded-2xl transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                        expanded
                          ? "justify-between gap-2.5 px-3 py-2.5 text-left"
                          : "flex-col justify-center gap-1 py-2.5 text-center",
                        isActive
                          ? "bg-white text-zinc-950 shadow-[0_6px_18px_rgba(255,255,255,0.14)]"
                          : "text-zinc-400 hover:bg-white/8 hover:text-white"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center",
                          expanded ? "min-w-0 gap-2.5" : "relative justify-center"
                        )}
                      >
                        <div className="relative flex shrink-0 items-center justify-center">
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110",
                              isActive ? "text-zinc-950" : "text-zinc-300 group-hover:text-white"
                            )}
                          />
                          {!expanded && badgeCount > 0 && (!isActive || isUrgentObd) && (
                            <span
                              className={cn(
                                "absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-extrabold shadow-sm",
                                isUrgentObd
                                  ? "animate-pulse bg-red-600 text-white ring-2 ring-white"
                                  : item.id === "obd"
                                  ? "bg-amber-400 text-zinc-950"
                                  : "bg-zinc-200 text-zinc-950"
                              )}
                            >
                              {isUrgentObd ? "!" : badgeCount}
                            </span>
                          )}
                        </div>

                        {expanded && (
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold leading-tight">
                              {item.label}
                            </p>
                            <p
                              className={cn(
                                "truncate text-[10px] leading-tight",
                                isActive ? "text-zinc-600" : "text-zinc-500"
                              )}
                            >
                              {item.subtitle}
                            </p>
                          </div>
                        )}
                      </div>

                      {!expanded && (
                        <span className="text-[10px] font-semibold leading-none tracking-tight">
                          {item.label}
                        </span>
                      )}

                      {expanded && badgeCount > 0 && (
                        <span
                          className={cn(
                            "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold tabular-nums",
                            isUrgentObd
                              ? "animate-pulse bg-red-600 text-white"
                              : isActive
                              ? "bg-zinc-950 text-white"
                              : item.id === "obd"
                              ? "bg-amber-400 text-zinc-950"
                              : "bg-zinc-800 text-zinc-100"
                          )}
                        >
                          {isUrgentObd ? `${activeEmergencies}!` : badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Live GPS Status Card (Monochrome Frame + Emerald Live Indicator) */}
        <button
          type="button"
          onClick={() => setActivePage("map")}
          className={cn(
            "group mx-2 mt-2 cursor-pointer overflow-hidden rounded-2xl border border-white/12 bg-zinc-900/90 p-2.5 text-left transition-all duration-200 hover:border-white/25 hover:bg-zinc-800/90"
          )}
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-bold leading-tight text-white">
                {expanded ? "Live GPS Feed" : "Live"}
              </span>
            </div>
            {expanded && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-zinc-200 tabular-nums">
                {inTransitCount}/{trucks.length}
              </span>
            )}
          </div>
          {!expanded && (
            <p className="mt-0.5 text-[10.5px] font-medium leading-tight text-zinc-300">
              GPS Map
            </p>
          )}
          <p className="mt-1 text-[9.5px] text-zinc-400">
            {inTransitCount} Isuzu units moving
          </p>

          <svg viewBox="0 0 80 22" className="mt-1.5 h-5 w-full overflow-visible" fill="none">
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M2 18 C12 17, 18 12, 26 13 C34 14, 40 8, 48 10 C56 11, 64 4, 78 2 L78 22 L2 22 Z"
              fill="url(#sparkFill)"
            />
            <path
              d="M2 18 C12 17, 18 12, 26 13 C34 14, 40 8, 48 10 C56 11, 64 4, 78 2"
              stroke="#34d399"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle
              cx="78"
              cy="2"
              r="2.4"
              fill="#6ee7b7"
              className="transition-transform duration-200 group-hover:scale-125"
            />
          </svg>
        </button>
      </aside>

      {/* Mobile / Tablet Bottom Navigation (Pure Black & White) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-2 bottom-2 z-40 flex items-center justify-around overflow-x-auto rounded-2xl bg-zinc-950/95 px-1.5 py-2 text-white shadow-2xl backdrop-blur-md lg:hidden"
      >
        {ALL_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.matches.includes(activePage);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-all duration-200",
                isActive ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
