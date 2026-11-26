import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Database,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  ShieldAlert,
  AlertTriangle,
  Info,
  Cpu,
  MapPin,
  Truck,
  CheckCircle2,
  Network,
} from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { SERIES_PERFORMANCE_METRICS } from "@/data/hoAnalyticsData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/TablePagination";
import { TermTooltip } from "@/components/ui/TermTooltip";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  HubMasterItem,
  ObdDtcDefinition,
  ObdSeverity,
} from "@/types/haultrack";
import { cn } from "@/lib/utils";

type MasterTab = "obd-codes" | "hubs" | "fleet-standards";

const SUBSYSTEM_OPTIONS: Array<ObdDtcDefinition["subsystem"]> = [
  "Exhaust & DPF",
  "Fuel System",
  "Turbo & Air",
  "SCR / AdBlue",
  "Cooling",
  "CAN Network",
  "Electrical",
];

const DRIVABILITY_OPTIONS: Array<ObdDtcDefinition["drivableStatus"]> = [
  "Pull Over / Immediate Service",
  "Service Within 24h",
  "Safe to Complete Route",
];

const SEVERITY_OPTIONS: ObdSeverity[] = ["Critical", "Warning", "Advisory"];

const TNKB_REGION_STANDARDS = [
  { prefix: "B", region: "DKI Jakarta, Bekasi, Tangerang, Depok", sample: "B 9482 KXU", plateType: "commercial" as const },
  { prefix: "D", region: "Bandung, Cimahi & Bandung Barat", sample: "D 8204 VFA", plateType: "commercial" as const },
  { prefix: "L", region: "Surabaya (Jawa Timur Hub)", sample: "L 8719 UBA", plateType: "commercial" as const },
  { prefix: "BK", region: "Medan & Sumatra Utara Timur", sample: "BK 8905 ECA", plateType: "corporate" as const },
  { prefix: "KT", region: "Balikpapan, Samarinda & IKN (Kaltim)", sample: "KT 8501 YLA", plateType: "corporate" as const },
  { prefix: "DD", region: "Makassar & Sulawesi Selatan", sample: "DD 8615 KRA", plateType: "commercial" as const },
  { prefix: "DK", region: "Denpasar & Seluruh Provinsi Bali", sample: "DK 8722 QBA", plateType: "commercial" as const },
];

export function MasterDataView() {
  const {
    obdCatalog,
    hubCatalog,
    trucks,
    addObdCode,
    updateObdCode,
    deleteObdCode,
    addHubCode,
    deleteHubCode,
    setActivePage,
  } = useHaulTrack();

  const [activeTab, setActiveTab] = useState<MasterTab>("obd-codes");

  // OBD Master Table state
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | ObdSeverity>("ALL");
  const [subsystemFilter, setSubsystemFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Hubs Master Table state
  const [hubSearch, setHubSearch] = useState("");
  const [hubPage, setHubPage] = useState(1);
  const [hubPageSize, setHubPageSize] = useState(10);

  // Right Drawer for Add / Edit OBD Code
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formSpn, setFormSpn] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formSubsystem, setFormSubsystem] =
    useState<ObdDtcDefinition["subsystem"]>("Exhaust & DPF");
  const [formSeverity, setFormSeverity] = useState<ObdSeverity>("Warning");
  const [formDrivable, setFormDrivable] =
    useState<ObdDtcDefinition["drivableStatus"]>("Service Within 24h");
  const [formMeaning, setFormMeaning] = useState("");
  const [formCauses, setFormCauses] = useState("");
  const [formAction, setFormAction] = useState("");

  // Right Drawer for Add Hub
  const [hubDrawerOpen, setHubDrawerOpen] = useState(false);
  const [hubCode, setHubCode] = useState("");
  const [hubCity, setHubCity] = useState("");
  const [hubRegion, setHubRegion] = useState("");
  const [hubLat, setHubLat] = useState("-6.2088");
  const [hubLng, setHubLng] = useState("106.8456");
  const [hubDocks, setHubDocks] = useState("4");

  // Confirmation Modals (strictly for delete confirmation)
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);
  const [confirmDeleteHub, setConfirmDeleteHub] = useState<string | null>(null);

  // Count how many live fleet units currently have each DTC code active
  const activeUsageByCode = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of trucks) {
      for (const c of t.obd.activeCodes) {
        const key = c.code.toUpperCase();
        if (!map[key]) map[key] = [];
        map[key].push(t.plate);
      }
    }
    return map;
  }, [trucks]);

  // Severity KPI counts
  const counts = useMemo(
    () => ({
      total: obdCatalog.length,
      critical: obdCatalog.filter((c) => c.severity === "Critical").length,
      warning: obdCatalog.filter((c) => c.severity === "Warning").length,
      advisory: obdCatalog.filter((c) => c.severity === "Advisory").length,
    }),
    [obdCatalog]
  );

  // Filtered & paginated OBD master records
  const filteredCodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return obdCatalog.filter((item) => {
      if (severityFilter !== "ALL" && item.severity !== severityFilter) return false;
      if (subsystemFilter !== "ALL" && item.subsystem !== subsystemFilter) return false;
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q) ||
        item.subsystem.toLowerCase().includes(q) ||
        (item.j1939Spn?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [obdCatalog, search, severityFilter, subsystemFilter]);

  const totalCodePages = Math.max(1, Math.ceil(filteredCodes.length / pageSize));
  const safeCodePage = Math.min(page, totalCodePages);
  const paginatedCodes = useMemo(
    () =>
      filteredCodes.slice((safeCodePage - 1) * pageSize, safeCodePage * pageSize),
    [filteredCodes, safeCodePage, pageSize]
  );

  // Filtered & paginated Hubs
  const filteredHubs = useMemo(() => {
    const q = hubSearch.trim().toLowerCase();
    return hubCatalog.filter(
      (h) =>
        !q ||
        h.code.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.region.toLowerCase().includes(q)
    );
  }, [hubCatalog, hubSearch]);

  const totalHubPages = Math.max(1, Math.ceil(filteredHubs.length / hubPageSize));
  const safeHubPage = Math.min(hubPage, totalHubPages);
  const paginatedHubs = useMemo(
    () =>
      filteredHubs.slice((safeHubPage - 1) * hubPageSize, safeHubPage * hubPageSize),
    [filteredHubs, safeHubPage, hubPageSize]
  );

  const openAddCodeDrawer = () => {
    setEditingCode(null);
    setFormCode("");
    setFormSpn("");
    setFormTitle("");
    setFormSubsystem("Exhaust & DPF");
    setFormSeverity("Warning");
    setFormDrivable("Service Within 24h");
    setFormMeaning("");
    setFormCauses("");
    setFormAction("");
    setCodeDrawerOpen(true);
  };

  const openEditCodeDrawer = (item: ObdDtcDefinition) => {
    setEditingCode(item.code);
    setFormCode(item.code);
    setFormSpn(item.j1939Spn ?? "");
    setFormTitle(item.title);
    setFormSubsystem(item.subsystem);
    setFormSeverity(item.severity);
    setFormDrivable(item.drivableStatus);
    setFormMeaning(item.meaning);
    setFormCauses(item.probableCauses.join("\n"));
    setFormAction(item.recommendedAction);
    setCodeDrawerOpen(true);
  };

  const handleSaveObdCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCauses = formCauses
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const payload: ObdDtcDefinition = {
      code: formCode.trim().toUpperCase(),
      j1939Spn: formSpn.trim() || undefined,
      title: formTitle.trim() || "Custom Isuzu Diagnostic Fault",
      subsystem: formSubsystem,
      severity: formSeverity,
      drivableStatus: formDrivable,
      meaning: formMeaning.trim() || "Custom fault code definition configured in Master Data.",
      probableCauses:
        cleanCauses.length > 0 ? cleanCauses : ["Inspect wiring harness and sensor calibration"],
      recommendedAction:
        formAction.trim() || "Run Isuzu IDSS diagnostic check at nearest service bay.",
    };

    if (editingCode) {
      updateObdCode(editingCode, payload);
      setCodeDrawerOpen(false);
    } else {
      const ok = addObdCode(payload);
      if (ok) {
        setPage(1);
        setCodeDrawerOpen(false);
      }
    }
  };

  const handleSaveHub = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: HubMasterItem = {
      code: hubCode.trim().toUpperCase(),
      city: hubCity.trim(),
      region: hubRegion.trim() || "Indonesia",
      lat: Number(hubLat) || -6.2,
      lng: Number(hubLng) || 106.8,
      docks: Math.max(1, Number(hubDocks) || 2),
      status: "Active",
    };
    const ok = addHubCode(payload);
    if (ok) {
      setHubCode("");
      setHubCity("");
      setHubRegion("");
      setHubDrawerOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white dark:bg-white dark:text-zinc-950">
              <Database className="h-3 w-3" />
              Master Data Governance
            </span>
            <span className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300">
              Source: Geotab GO9 / MyGeotab API
            </span>
            <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              Live-Synced with OBD-II, Live Map &amp; HO Analytics
            </span>
          </div>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
            HORUS Master Data
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure Geotab-sourced{" "}
            <TermTooltip termKey="DTC" showIcon={false}>OBD-II / J1939 fault codes</TermTooltip>,
            assign custom severity levels per code, and manage Indonesian depot hubs &amp;{" "}
            <TermTooltip termKey="TNKB" showIcon={false}>TNKB plate</TermTooltip> standards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setActivePage("hld")}
            className="h-11 rounded-2xl px-4 text-xs font-semibold"
          >
            <Network className="h-4 w-4 text-red-600" />
            View Geotab HLD
          </Button>
          {activeTab === "obd-codes" && (
            <Button onClick={openAddCodeDrawer} className="h-11 rounded-2xl px-5">
              <Plus className="h-4 w-4" />
              Add OBD Code
            </Button>
          )}
          {activeTab === "hubs" && (
            <Button onClick={() => setHubDrawerOpen(true)} className="h-11 rounded-2xl px-5">
              <Plus className="h-4 w-4" />
              Add Hub Code
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total OBD-II Codes</span>
            <Cpu className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums">{counts.total}</p>
          <p className="text-[11px] text-muted-foreground">
            Active dictionary across {trucks.length} Isuzu units
          </p>
        </Card>
        <Card className="border-red-500/35 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Critical Severity</span>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-red-600 tabular-nums dark:text-red-400">
            {counts.critical}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Triggers immediate HO &amp; map alert escalation
          </p>
        </Card>
        <Card className="border-amber-500/35 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Warning Severity</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-amber-600 tabular-nums dark:text-amber-400">
            {counts.warning}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Flags maintenance check within 24 hours
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Advisory Severity</span>
            <Info className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-sky-600 tabular-nums dark:text-sky-400">
            {counts.advisory}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Monitored for next scheduled PM service
          </p>
        </Card>
      </div>

      {/* Master Data Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {(
          [
            {
              id: "obd-codes",
              label: `OBD-II & DTC Codes (${obdCatalog.length})`,
              icon: Cpu,
            },
            {
              id: "hubs",
              label: `Hub & Depot Codes (${hubCatalog.length})`,
              icon: MapPin,
            },
            {
              id: "fleet-standards",
              label: "Vehicle Series & TNKB Plates",
              icon: Truck,
            },
          ] as Array<{
            id: MasterTab;
            label: string;
            icon: React.ComponentType<{ className?: string }>;
          }>
        ).map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                active
                  ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OBD-II / J1939 CODE & SEVERITY MASTER TABLE */}
      {activeTab === "obd-codes" && (
        <Card className="animate-page-enter p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search DTC code (P2002), SPN, title..."
                  className="pl-8 text-xs"
                />
              </div>

              <div className="relative">
                <select
                  value={subsystemFilter}
                  onChange={(e) => {
                    setSubsystemFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 cursor-pointer appearance-none rounded-xl border border-input bg-background pl-3 pr-8 text-xs font-semibold leading-none text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"
                >
                  <option value="ALL">All Subsystems</option>
                  {SUBSYSTEM_OPTIONS.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  ▾
                </span>
              </div>
            </div>

            {/* Severity Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(["ALL", "Critical", "Warning", "Advisory"] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => {
                    setSeverityFilter(sev);
                    setPage(1);
                  }}
                  className={cn(
                    "cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors",
                    severityFilter === sev
                      ? sev === "Critical"
                        ? "border-red-600 bg-red-600 text-white"
                        : sev === "Warning"
                        ? "border-amber-500 bg-amber-500 text-slate-950"
                        : sev === "Advisory"
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sev === "ALL" ? "All Severities" : sev}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-2.5 text-[11px] text-muted-foreground">
            Tip: Click any severity pill directly in the table below to update a code&apos;s live
            severity across OBD-II Diagnostics, Live Map alerts, and HO Analytics.
          </p>

          {/* Scrollable Sticky-Header Master Table */}
          <div className="mt-3 max-h-[450px] overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3">
                    <TermTooltip termKey="DTC">Code</TermTooltip> /{" "}
                    <TermTooltip termKey="SPN_FMI" showIcon={false}>
                      J1939
                    </TermTooltip>
                  </th>
                  <th className="px-4 py-3">Fault Title &amp; Subsystem</th>
                  <th className="px-4 py-3">Meaning &amp; Policy</th>
                  <th className="px-4 py-3">Severity Level (Quick Set)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedCodes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No OBD-II master codes match your filter.
                    </td>
                  </tr>
                ) : (
                  paginatedCodes.map((item) => {
                    const livePlates = activeUsageByCode[item.code.toUpperCase()] ?? [];
                    return (
                      <tr key={item.code} className="hover:bg-muted/25">
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <span className="inline-block rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white shadow-xs dark:bg-slate-700">
                            {item.code}
                          </span>
                          {item.j1939Spn && (
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                              {item.j1939Spn}
                            </p>
                          )}
                          {livePlates.length > 0 && (
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              Active: {livePlates.join(", ")}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top max-w-[240px]">
                          <p className="font-bold text-foreground">{item.title}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <Badge variant="outline">{item.subsystem}</Badge>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top max-w-[320px]">
                          <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {item.meaning}
                          </p>
                          <p className="mt-1 text-[10.5px] font-semibold text-foreground">
                            Policy:{" "}
                            <span className="font-medium text-muted-foreground">
                              {item.drivableStatus}
                            </span>
                          </p>
                        </td>

                        {/* One-Click Inline Severity Selector */}
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/45 p-1">
                            {SEVERITY_OPTIONS.map((sev) => {
                              const active = item.severity === sev;
                              return (
                                <button
                                  key={sev}
                                  type="button"
                                  onClick={() => {
                                    if (!active) {
                                      updateObdCode(item.code, {
                                        severity: sev,
                                        drivableStatus:
                                          sev === "Critical"
                                            ? "Pull Over / Immediate Service"
                                            : sev === "Warning"
                                            ? "Service Within 24h"
                                            : "Safe to Complete Route",
                                      });
                                    }
                                  }}
                                  className={cn(
                                    "cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                                    active
                                      ? sev === "Critical"
                                        ? "bg-red-600 text-white shadow-xs"
                                        : sev === "Warning"
                                        ? "bg-amber-500 text-slate-950 shadow-xs"
                                        : "bg-sky-600 text-white shadow-xs"
                                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                                  )}
                                >
                                  {sev}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditCodeDrawer(item)}
                              className="h-7 rounded-lg px-2.5 text-[11px]"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCode(item.code)}
                              aria-label={`Delete ${item.code}`}
                              className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
            page={safeCodePage}
            pageSize={pageSize}
            totalItems={filteredCodes.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 10, 20]}
          />
        </Card>
      )}

      {/* TAB 2: HUB & DEPOT CODES */}
      {activeTab === "hubs" && (
        <Card className="animate-page-enter p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Indonesian Regional Hub &amp; Geofence Codes
              </h3>
              <p className="text-xs text-muted-foreground">
                Master directory of 3-letter corridor hubs, coordinates, and dock capacities
              </p>
            </div>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={hubSearch}
                onChange={(e) => {
                  setHubSearch(e.target.value);
                  setHubPage(1);
                }}
                placeholder="Filter hub code, city, province..."
                className="pl-8 text-xs"
              />
            </div>
          </div>

          <div className="mt-4 max-h-[430px] overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3">Hub Code</th>
                  <th className="px-4 py-3">City &amp; Region</th>
                  <th className="px-4 py-3">GPS Coordinates</th>
                  <th className="px-4 py-3">Loading Docks</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedHubs.map((h) => (
                  <tr key={h.code} className="hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-white dark:bg-slate-100 dark:text-slate-900">
                        {h.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground">{h.city}</p>
                      <p className="text-[11px] text-muted-foreground">{h.region}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {Math.abs(h.lat).toFixed(4)}° {h.lat < 0 ? "S" : "N"},{" "}
                      {Math.abs(h.lng).toFixed(4)}° E
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums">{h.docks} docks</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteHub(h.code)}
                        aria-label={`Delete hub ${h.code}`}
                        className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={safeHubPage}
            pageSize={hubPageSize}
            totalItems={filteredHubs.length}
            onPageChange={setHubPage}
            onPageSizeChange={setHubPageSize}
            pageSizeOptions={[5, 10, 20]}
          />
        </Card>
      )}

      {/* TAB 3: VEHICLE SERIES & INDONESIAN TNKB PLATE STANDARDS */}
      {activeTab === "fleet-standards" && (
        <div className="animate-page-enter grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="text-sm font-extrabold text-foreground">
              Isuzu Commercial Series Master Spec
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Engine family benchmarks, MTBF reliability &amp; Cost per KM standards
            </p>
            <div className="max-h-[380px] overflow-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3.5 py-2.5">Series</th>
                    <th className="px-3.5 py-2.5">Engine</th>
                    <th className="px-3.5 py-2.5">Target km/L</th>
                    <th className="px-3.5 py-2.5 text-right">MTBF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {SERIES_PERFORMANCE_METRICS.map((s) => (
                    <tr key={s.series} className="hover:bg-muted/25">
                      <td className="px-3.5 py-3 font-extrabold text-red-700 dark:text-red-400">
                        ISUZU {s.series}
                      </td>
                      <td className="px-3.5 py-3 text-muted-foreground">{s.engineFamily}</td>
                      <td className="px-3.5 py-3 font-bold tabular-nums">{s.avgFuelKmL} km/L</td>
                      <td className="px-3.5 py-3 text-right font-bold tabular-nums">
                        {s.mtbfHours} hrs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-extrabold text-foreground">
              Indonesian <TermTooltip termKey="TNKB">TNKB</TermTooltip> Regional Plate Registry
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Polri regional prefix codes — Yellow (Commercial Freight) vs White (Operational Fleet)
            </p>
            <div className="max-h-[380px] overflow-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3.5 py-2.5">Prefix</th>
                    <th className="px-3.5 py-2.5">Registration Area</th>
                    <th className="px-3.5 py-2.5 text-right">Sample Plate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {TNKB_REGION_STANDARDS.map((r) => (
                    <tr key={r.prefix} className="hover:bg-muted/25">
                      <td className="px-3.5 py-2.5 font-mono font-black text-foreground">
                        {r.prefix}
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{r.region}</td>
                      <td className="px-3.5 py-2.5 text-right">
                        <LicensePlateBadge
                          plate={r.sample}
                          plateType={r.plateType}
                          size="xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* RIGHT SLIDE-OVER DRAWER: ADD / EDIT OBD-II MASTER CODE */}
      {codeDrawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex h-dvh w-screen justify-end overflow-hidden">
            <div
              onClick={() => setCodeDrawerOpen(false)}
              className="animate-overlay-fade fixed inset-0 bg-slate-950/35 backdrop-blur-[1.5px]"
            />
            <aside className="animate-drawer-in relative z-10 flex h-dvh max-h-dvh w-full max-w-[480px] flex-col overflow-hidden border-l border-border bg-card text-card-foreground shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-base font-extrabold text-foreground">
                    {editingCode ? `Edit OBD Code — ${editingCode}` : "Add New Master OBD Code"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Configure fault meaning, subsystem, severity level, and repair action.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCodeDrawerOpen(false)}
                  aria-label="Close drawer"
                  className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveObdCode} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        OBD-II / DTC Code *
                      </label>
                      <Input
                        required
                        disabled={Boolean(editingCode)}
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                        placeholder="e.g. P0380"
                        className="font-mono font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        SAE J1939 SPN / FMI
                      </label>
                      <Input
                        value={formSpn}
                        onChange={(e) => setFormSpn(e.target.value)}
                        placeholder="e.g. SPN 676 · FMI 5"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Visual 3-Way Severity Selector */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Alert Severity Level *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {SEVERITY_OPTIONS.map((sev) => {
                        const active = formSeverity === sev;
                        return (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => {
                              setFormSeverity(sev);
                              setFormDrivable(
                                sev === "Critical"
                                  ? "Pull Over / Immediate Service"
                                  : sev === "Warning"
                                  ? "Service Within 24h"
                                  : "Safe to Complete Route"
                              );
                            }}
                            className={cn(
                              "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-extrabold transition-all",
                              active
                                ? sev === "Critical"
                                  ? "border-red-600 bg-red-600 text-white shadow-sm"
                                  : sev === "Warning"
                                  ? "border-amber-500 bg-amber-500 text-slate-950 shadow-sm"
                                  : "border-sky-600 bg-sky-600 text-white shadow-sm"
                                : "border-border bg-background text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {sev === "Critical" ? (
                              <ShieldAlert className="h-4 w-4" />
                            ) : sev === "Warning" ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Info className="h-4 w-4" />
                            )}
                            {sev}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        Engine Subsystem
                      </label>
                      <select
                        value={formSubsystem}
                        onChange={(e) =>
                          setFormSubsystem(e.target.value as ObdDtcDefinition["subsystem"])
                        }
                        className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground"
                      >
                        {SUBSYSTEM_OPTIONS.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        Drivability Policy
                      </label>
                      <select
                        value={formDrivable}
                        onChange={(e) =>
                          setFormDrivable(e.target.value as ObdDtcDefinition["drivableStatus"])
                        }
                        className="h-9 w-full rounded-xl border border-input bg-background px-2.5 text-xs font-semibold text-foreground"
                      >
                        {DRIVABILITY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Fault Title *
                    </label>
                    <Input
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Glow Plug / Intake Heater Circuit A Malfunction"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Plain-Language Error Meaning *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formMeaning}
                      onChange={(e) => setFormMeaning(e.target.value)}
                      placeholder="Explain clearly what this code means for fleet operators and drivers..."
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Probable Root Causes (one per line)
                    </label>
                    <textarea
                      rows={3}
                      value={formCauses}
                      onChange={(e) => setFormCauses(e.target.value)}
                      placeholder={"Faulty glow plug relay or blown fuse\nCorroded heater bus bar terminal"}
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Recommended Isuzu Mechanic Action *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={formAction}
                      onChange={(e) => setFormAction(e.target.value)}
                      placeholder="e.g. Test glow plug resistance (< 1.5 Ω) and inspect 24V preheat relay."
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-5 py-3.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCodeDrawerOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCode ? `Save ${editingCode}` : "Create Master Code"}
                  </Button>
                </div>
              </form>
            </aside>
          </div>,
          document.body
        )}

      {/* RIGHT SLIDE-OVER DRAWER: ADD HUB CODE */}
      {hubDrawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex h-dvh w-screen justify-end overflow-hidden">
            <div
              onClick={() => setHubDrawerOpen(false)}
              className="animate-overlay-fade fixed inset-0 bg-slate-950/35 backdrop-blur-[1.5px]"
            />
            <aside className="animate-drawer-in relative z-10 flex h-dvh max-h-dvh w-full max-w-[420px] flex-col overflow-hidden border-l border-border bg-card text-card-foreground shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-base font-extrabold text-foreground">Add Indonesian Hub</h2>
                  <p className="text-xs text-muted-foreground">
                    Register a new regional depot code for routes and geofences.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHubDrawerOpen(false)}
                  aria-label="Close drawer"
                  className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSaveHub} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        3-Letter Code *
                      </label>
                      <Input
                        required
                        maxLength={4}
                        value={hubCode}
                        onChange={(e) => setHubCode(e.target.value.toUpperCase())}
                        placeholder="e.g. YOG"
                        className="font-mono font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        Loading Docks
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={hubDocks}
                        onChange={(e) => setHubDocks(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      City Name *
                    </label>
                    <Input
                      required
                      value={hubCity}
                      onChange={(e) => setHubCity(e.target.value)}
                      placeholder="e.g. Yogyakarta"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Province / Region *
                    </label>
                    <Input
                      required
                      value={hubRegion}
                      onChange={(e) => setHubRegion(e.target.value)}
                      placeholder="e.g. DI Yogyakarta"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        Latitude
                      </label>
                      <Input value={hubLat} onChange={(e) => setHubLat(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                        Longitude
                      </label>
                      <Input value={hubLng} onChange={(e) => setHubLng(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3.5">
                  <Button type="button" variant="outline" onClick={() => setHubDrawerOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Register Hub Code</Button>
                </div>
              </form>
            </aside>
          </div>,
          document.body
        )}

      {/* Confirmation Modal — Delete Master OBD Code */}
      <Dialog
        open={Boolean(confirmDeleteCode)}
        onOpenChange={(open) => !open && setConfirmDeleteCode(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete OBD Code {confirmDeleteCode}?</DialogTitle>
            <DialogDescription>
              Removing <strong className="font-mono text-foreground">{confirmDeleteCode}</strong>{" "}
              deletes its custom severity and repair guidance from the Master Data dictionary.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteCode(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteCode) deleteObdCode(confirmDeleteCode);
                setConfirmDeleteCode(null);
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal — Delete Hub Code */}
      <Dialog
        open={Boolean(confirmDeleteHub)}
        onOpenChange={(open) => !open && setConfirmDeleteHub(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Hub {confirmDeleteHub}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete hub{" "}
              <strong className="font-mono text-foreground">{confirmDeleteHub}</strong> from Master
              Data?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteHub(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteHub) deleteHubCode(confirmDeleteHub);
                setConfirmDeleteHub(null);
              }}
            >
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
