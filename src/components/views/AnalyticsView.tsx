import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Scale,
  Fuel,
  Cpu,
  ShieldAlert,
  Download,
  Building2,
  MapPin,
  Users,
  Wallet,
  Wrench,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Award,
} from "lucide-react";
import {
  getTruckLoadKg,
  getVehicleObdHealth,
  useHaulTrack,
} from "@/context/HaulTrackContext";
import { getDtcInfo } from "@/data/obdDatabase";
import {
  COST_TREND_SERIES,
  DELAY_ROOT_CAUSES,
  DRIVER_SCORECARDS,
  IDLE_FUEL_BY_REGION,
  REGIONAL_BRANCH_METRICS,
  SERIES_PERFORMANCE_METRICS,
  type HoRegion,
  type HoTimeframe,
} from "@/data/hoAnalyticsData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LicensePlateBadge } from "@/components/ui/LicensePlateBadge";
import { TermTooltip } from "@/components/ui/TermTooltip";
import type { IsuzuSeries } from "@/types/haultrack";
import { cn, formatTons } from "@/lib/utils";

type HoTab = "overview" | "obd" | "regional" | "drivers";

const SERIES_OPTIONS: Array<"ALL" | IsuzuSeries> = [
  "ALL",
  "GIGA",
  "FORWARD",
  "ELF",
  "TRAGA",
  "D-MAX",
];

const REGION_LABELS: Record<HoRegion, string> = {
  ALL: "All Indonesia",
  JAWA_BALI: "Jawa & Bali",
  SUMATRA: "Sumatra",
  KALIMANTAN: "Kalimantan",
  SULAWESI: "Sulawesi",
};

function getTruckRegion(truckId: string): Exclude<HoRegion, "ALL"> {
  if (truckId === "ISZ-412") return "SUMATRA";
  if (truckId === "ISZ-501") return "KALIMANTAN";
  if (truckId === "ISZ-615") return "SULAWESI";
  return "JAWA_BALI";
}

function formatIdr(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

export function AnalyticsView() {
  const {
    trucks,
    settings,
    selectTruck,
    setActivePage,
    pushToast,
    liveTickCount,
    lastHeartbeat,
  } = useHaulTrack();

  const [tab, setTab] = useState<HoTab>("overview");
  const [timeframe, setTimeframe] = useState<HoTimeframe>("30d");
  const [region, setRegion] = useState<HoRegion>("ALL");
  const [seriesFilter, setSeriesFilter] = useState<"ALL" | IsuzuSeries>("ALL");

  // Filter live trucks by HO Region & Series
  const filteredTrucks = useMemo(
    () =>
      trucks.filter((t) => {
        if (region !== "ALL" && getTruckRegion(t.id) !== region) return false;
        if (seriesFilter !== "ALL" && t.series !== seriesFilter) return false;
        return true;
      }),
    [trucks, region, seriesFilter]
  );

  // Filter regional branches
  const filteredBranches = useMemo(
    () =>
      region === "ALL"
        ? REGIONAL_BRANCH_METRICS
        : REGIONAL_BRANCH_METRICS.filter((b) => b.regionKey === region),
    [region]
  );

  // Filter series performance
  const filteredSeriesMetrics = useMemo(
    () =>
      seriesFilter === "ALL"
        ? SERIES_PERFORMANCE_METRICS
        : SERIES_PERFORMANCE_METRICS.filter((s) => s.series === seriesFilter),
    [seriesFilter]
  );

  // Filter driver scorecards
  const filteredDrivers = useMemo(
    () =>
      DRIVER_SCORECARDS.filter((d) => {
        if (region !== "ALL" && d.region !== region) return false;
        if (seriesFilter !== "ALL" && d.series !== seriesFilter) return false;
        return true;
      }),
    [region, seriesFilter]
  );

  // Scale cost trend slightly by regional/series share so charts react authentically to HO filters
  const scaleFactor = useMemo(() => {
    const regShare =
      region === "ALL"
        ? 1
        : region === "JAWA_BALI"
        ? 0.58
        : region === "SUMATRA"
        ? 0.16
        : region === "KALIMANTAN"
        ? 0.13
        : 0.13;
    const serShare = seriesFilter === "ALL" ? 1 : 0.34;
    return regShare * serShare;
  }, [region, seriesFilter]);

  const costTrendData = useMemo(
    () =>
      COST_TREND_SERIES[timeframe].map((pt) => ({
        ...pt,
        fuelM: Number((pt.fuelM * scaleFactor).toFixed(1)),
        maintenanceM: Number((pt.maintenanceM * scaleFactor).toFixed(1)),
        tollFerryM: Number((pt.tollFerryM * scaleFactor).toFixed(1)),
        driverOpsM: Number((pt.driverOpsM * scaleFactor).toFixed(1)),
        budgetM: Number((pt.budgetM * scaleFactor).toFixed(1)),
        tonnage: Number((pt.tonnage * scaleFactor).toFixed(1)),
      })),
    [timeframe, scaleFactor]
  );

  // Live HO North-Star KPI calculations
  const hoKpis = useMemo(() => {
    const totalUnits = Math.max(1, filteredTrucks.length);
    const criticalUnits = filteredTrucks.filter(
      (t) => getVehicleObdHealth(t) === "Critical"
    ).length;
    const warningUnits = filteredTrucks.filter(
      (t) => getVehicleObdHealth(t) === "Warning"
    ).length;
    const activeDtcCount = filteredTrucks.reduce(
      (sum, t) => sum + t.obd.activeCodes.length,
      0
    );

    const availabilityPct = Number(
      Math.max(72, ((totalUnits - criticalUnits * 0.35) / totalUnits) * 100).toFixed(1)
    );

    const avgCpk = Math.round(
      filteredBranches.reduce((s, b) => s + b.cpkIdr, 0) / Math.max(1, filteredBranches.length)
    );
    const avgOtif = Number(
      (
        filteredBranches.reduce((s, b) => s + b.otifPct, 0) /
        Math.max(1, filteredBranches.length)
      ).toFixed(1)
    );
    const avgBackhaul = Number(
      (
        filteredBranches.reduce((s, b) => s + b.emptyBackhaulPct, 0) /
        Math.max(1, filteredBranches.length)
      ).toFixed(1)
    );
    const avgFuelKmL = Number(
      (
        filteredSeriesMetrics.reduce((s, m) => s + m.avgFuelKmL, 0) /
        Math.max(1, filteredSeriesMetrics.length)
      ).toFixed(1)
    );

    const livePayloadKg = filteredTrucks.reduce((s, t) => s + getTruckLoadKg(t), 0);
    const liveCapKg = filteredTrucks.reduce((s, t) => s + t.maxCapacityKg, 0);
    const liveLoadPct = liveCapKg > 0 ? Math.round((livePayloadKg / liveCapKg) * 100) : 0;

    const totalCostM = costTrendData.reduce(
      (s, pt) => s + pt.fuelM + pt.maintenanceM + pt.tollFerryM + pt.driverOpsM,
      0
    );

    const preventableExposureM = Number((criticalUnits * 18.5 + warningUnits * 6.2).toFixed(1));

    const movingUnits = filteredTrucks.filter((t) => t.status === "In Transit");
    const liveAvgSpeed =
      movingUnits.length > 0
        ? Math.round(
            movingUnits.reduce((sum, t) => sum + t.route.speedMph, 0) / movingUnits.length
          )
        : 0;
    const liveBurnRateLhr = Number(
      filteredTrucks
        .reduce(
          (sum, t) => sum + (t.status === "In Transit" ? (t.obd.rpm / 1000) * 6.4 : 2.1),
          0
        )
        .toFixed(1)
    );

    return {
      availabilityPct,
      avgCpk,
      avgOtif,
      avgBackhaul,
      avgFuelKmL,
      livePayloadKg,
      liveLoadPct,
      activeDtcCount,
      criticalUnits,
      warningUnits,
      totalCostM: Number(totalCostM.toFixed(1)),
      preventableExposureM,
      liveAvgSpeed,
      liveBurnRateLhr,
    };
  }, [filteredTrucks, filteredBranches, filteredSeriesMetrics, costTrendData]);

  // Live OBD-II subsystem breakdown combining real active fleet DTCs + 30d HO telemetry
  const obdSubsystemData = useMemo(() => {
    const base: Record<string, { subsystem: string; activeNow: number; last30d: number }> = {
      "Exhaust & DPF": { subsystem: "Exhaust / DPD", activeNow: 0, last30d: 14 },
      "Fuel System": { subsystem: "Common-Rail Fuel", activeNow: 0, last30d: 8 },
      "Turbo & Air": { subsystem: "Turbo / VGT", activeNow: 0, last30d: 7 },
      "SCR / AdBlue": { subsystem: "SCR / AdBlue", activeNow: 0, last30d: 6 },
      Cooling: { subsystem: "Cooling / ECT", activeNow: 0, last30d: 5 },
      "CAN Network": { subsystem: "J1939 CAN Bus", activeNow: 0, last30d: 4 },
      Electrical: { subsystem: "24V / 12V Bus", activeNow: 0, last30d: 6 },
    };

    for (const t of filteredTrucks) {
      for (const dtc of t.obd.activeCodes) {
        const info = getDtcInfo(dtc.code);
        if (base[info.subsystem]) {
          base[info.subsystem].activeNow += 1;
        }
      }
    }

    return Object.values(base).sort((a, b) => b.last30d - a.last30d);
  }, [filteredTrucks]);

  // Export HO Executive CSV Brief
  const exportHoBrief = () => {
    const headers = [
      "Branch",
      "HubCities",
      "ActiveUnits",
      "MonthlyTrips",
      "Tonnage",
      "UtilizationPct",
      "EmptyBackhaulPct",
      "OTIFPct",
      "FuelKmPerL",
      "CostPerKmIDR",
      "MarginPct",
      "Status",
    ];
    const rows = filteredBranches.map((b) => [
      `"${b.branchName}"`,
      `"${b.hubCities}"`,
      b.activeUnits,
      b.monthlyTrips,
      b.tonnageMoved,
      `${b.utilizationPct}%`,
      `${b.emptyBackhaulPct}%`,
      `${b.otifPct}%`,
      b.fuelKmPerL,
      b.cpkIdr,
      `${b.revenueMarginPct}%`,
      b.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `isuzu-ho-executive-analytics-${timeframe}-${region.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    pushToast({
      title: "HO Executive Brief exported",
      description: `Downloaded ${filteredBranches.length} regional branch scorecards (${timeframe.toUpperCase()}).`,
      variant: "success",
    });
  };

  return (
    <div className="space-y-5">
      {/* HO Command Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#d91324] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              <Building2 className="h-3 w-3" />
              Head Office (HO) View
            </span>
            <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              PT Isuzu Astra Motor Indonesia · National Command
            </span>
          </div>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
            Executive Fleet &amp; Telematics Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Board-level visibility into Cost per KM (CPK), Fleet Uptime, Backhaul Efficiency,
            OBD-II Predictive Risk, Regional Branches, and Driver Eco-Driving.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {(
              [
                ["7d", "7D"],
                ["30d", "30D"],
                ["90d", "90D"],
                ["ytd", "YTD"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTimeframe(key)}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  timeframe === key
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Button onClick={exportHoBrief} className="h-10 rounded-xl px-4 text-xs font-semibold">
            <Download className="h-3.5 w-3.5" />
            Export HO Brief CSV
          </Button>
        </div>
      </div>

      {/* Global HO Filter Bar (Region + Isuzu Series) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/90 p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Region:
          </span>
          {(Object.keys(REGION_LABELS) as HoRegion[]).map((reg) => (
            <button
              key={reg}
              type="button"
              onClick={() => setRegion(reg)}
              className={cn(
                "cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all",
                region === reg
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {REGION_LABELS[reg]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Series:
          </span>
          {SERIES_OPTIONS.map((ser) => (
            <button
              key={ser}
              type="button"
              onClick={() => setSeriesFilter(ser)}
              className={cn(
                "cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all",
                seriesFilter === ser
                  ? "border-red-600 bg-red-600/12 text-red-700 dark:text-red-300"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {ser === "ALL" ? "All Series" : ser}
            </button>
          ))}
        </div>
      </div>

      {/* Live Real-Time Telematics Heartbeat Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/[0.06] via-card to-card px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 font-extrabold text-red-700 dark:text-red-300">
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
            {settings.liveTelemetryUpdates
              ? "REAL-TIME CAN-BUS & GPS STREAM"
              : "TELEMETRY STREAM PAUSED"}
          </span>
          <span className="text-muted-foreground tabular-nums">
            Avg Moving Speed:{" "}
            <strong className="text-foreground">{hoKpis.liveAvgSpeed} km/h</strong>
          </span>
          <span className="text-muted-foreground tabular-nums">
            Live Fleet Fuel Burn:{" "}
            <strong className="text-foreground">{hoKpis.liveBurnRateLhr} L/hr</strong>
          </span>
        </div>
        <span className="font-mono text-[11px] font-semibold text-muted-foreground tabular-nums">
          Packet #{liveTickCount} · Synced {lastHeartbeat}
        </span>
      </div>

      {/* 6 Head Office North-Star KPI Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Fleet Availability</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">{hoKpis.availabilityPct}%</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Target ≥ 95.0% · {filteredTrucks.length} registered units
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <TermTooltip termKey="CPK">Cost per KM (CPK)</TermTooltip>
            <Wallet className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">
            {formatIdr(hoKpis.avgCpk)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingDown className="h-3 w-3" /> -3.4% vs prior period
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <TermTooltip termKey="OTIF">National OTIF SLA</TermTooltip>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">{hoKpis.avgOtif}%</p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" /> +1.2% on-time delivery
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <TermTooltip termKey="BACKHAUL">Empty Backhaul Ratio</TermTooltip>
            <Scale className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">{hoKpis.avgBackhaul}%</p>
          <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
            Live payload: {formatTons(hoKpis.livePayloadKg, settings.weightUnit)} ({hoKpis.liveLoadPct}%)
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Diesel Fuel Economy</span>
            <Fuel className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">{hoKpis.avgFuelKmL} km/L</p>
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
            <TermTooltip termKey="IDLE_TIME" showIcon={false}>
              16.8% idle fuel burn
            </TermTooltip>{" "}
            detected
          </p>
        </Card>

        <Card
          className={cn(
            "p-4",
            hoKpis.criticalUnits > 0 && "border-amber-500/60 bg-amber-500/[0.04]"
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <TermTooltip termKey="DTC">OBD Downtime Risk</TermTooltip>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">
            Rp {hoKpis.preventableExposureM} Jt
          </p>
          <p className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
            {hoKpis.activeDtcCount} live DTCs ({hoKpis.criticalUnits} critical)
          </p>
        </Card>
      </div>

      {/* HO Analytical Domain Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {(
          [
            { id: "overview", label: "Cost, Margin & Throughput", icon: Wallet },
            { id: "obd", label: "OBD-II Reliability & Maintenance", icon: Cpu },
            { id: "regional", label: "Regional Branches & SLA", icon: MapPin },
            { id: "drivers", label: "Driver Safety & Eco-Driving", icon: Users },
          ] as Array<{ id: HoTab; label: string; icon: React.ComponentType<{ className?: string }> }>
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                active
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: COST, MARGIN & THROUGHPUT */}
      {tab === "overview" && (
        <div className="animate-page-enter space-y-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* Operating Cost Breakdown vs Budget */}
            <Card className="p-5 xl:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">
                    Operating Cost Breakdown vs Budget (Rp Juta)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Fuel (Solar/Dex), OBD Maintenance, Tol &amp; Ro-Ro Ferry, Driver Ops vs HO
                    Budget — Total{" "}
                    <strong className="text-foreground">Rp {hoKpis.totalCostM} Jt</strong>
                  </p>
                </div>
                <Badge variant="express">Within Budget (-2.1%)</Badge>
              </div>
              <div className="h-[290px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={costTrendData}
                    margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        color: "var(--foreground)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="fuelM" name="Fuel (Rp Jt)" stackId="cost" fill="#d91324" />
                    <Bar dataKey="tollFerryM" name="Tol & Ro-Ro" stackId="cost" fill="#0284c7" />
                    <Bar dataKey="driverOpsM" name="Driver Ops" stackId="cost" fill="#64748b" />
                    <Bar
                      dataKey="maintenanceM"
                      name="Maintenance"
                      stackId="cost"
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="budgetM"
                      name="HO Budget Cap"
                      stroke="#0f172a"
                      strokeWidth={2.2}
                      strokeDasharray="5 4"
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* HO Executive Exception & Action Feed */}
            <Card className="flex flex-col justify-between p-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-foreground">
                    HO Priority Action Items
                  </h3>
                  <Badge variant="warning">3 Decisions</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  High-impact cost, maintenance, and SLA actions flagged from live OBD &amp; GPS
                </p>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-red-500/35 bg-red-500/[0.05] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-red-700 dark:text-red-300">
                        Prevent Rp 18.5 Jt DPD Failure
                      </span>
                      <span className="font-mono text-[10px] font-bold">L 8719 UBA</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      ISZ-118 Forward soot load reached 86% (`P2002`). Trigger parked DPD regen in
                      Surabaya before Semarang dispatch.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        selectTruck("ISZ-118");
                        setActivePage("obd");
                      }}
                      className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-red-600 hover:underline dark:text-red-400"
                    >
                      Open ISZ-118 OBD Console <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                        Sumatra Empty Backhaul Spike (23.5%)
                      </span>
                      <span className="font-mono text-[10px] font-bold">MDN → PLB</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Return trips running 8.5% emptier than national benchmark. Consolidate return
                      FMCG loads from Palembang hub.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTab("regional")}
                      className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline dark:text-amber-300"
                    >
                      Inspect Regional Branches <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/35 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-foreground">
                        Kaltim Common-Rail Fuel Drop (`P0087`)
                      </span>
                      <span className="font-mono text-[10px] font-bold">KT 8501 YLA</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      D-MAX 4×4 rail pressure dipped to 68 MPa on Balikpapan–Samarinda corridor.
                      Dispatch filter/SCV check.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        selectTruck("ISZ-501");
                        setActivePage("map");
                      }}
                      className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-red-600 hover:underline dark:text-red-400"
                    >
                      Locate on Indonesia Map <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Bottom Row: Tonnage vs Utilization + ROI by Isuzu Vehicle Series */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-sm font-extrabold text-foreground">
                Freight Tonnage vs Load Utilization (%)
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Volume shipped (tons) overlaid against average trailer bay utilization
              </p>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={costTrendData}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="hoTonGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d91324" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#d91324" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[50, 100]}
                      tick={{ fontSize: 12 }}
                      stroke="#94a3b8"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="tonnage"
                      name="Tonnage (t)"
                      stroke="#d91324"
                      strokeWidth={2.5}
                      fill="url(#hoTonGrad)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="utilization"
                      name="Load Factor (%)"
                      stroke="#0284c7"
                      strokeWidth={2.4}
                      dot={{ r: 3.5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-extrabold text-foreground">
                Unit Economics by Isuzu Vehicle Series
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Compare fuel efficiency, Cost/km (CPK), load factor &amp; operating ROI across
                engine families
              </p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-3.5 py-2.5">Isuzu Series</th>
                      <th className="px-3.5 py-2.5">Fuel</th>
                      <th className="px-3.5 py-2.5">CPK (Rp/km)</th>
                      <th className="px-3.5 py-2.5">Load %</th>
                      <th className="px-3.5 py-2.5 text-right">Net Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSeriesMetrics.map((s) => (
                      <tr key={s.series} className="hover:bg-muted/30">
                        <td className="px-3.5 py-2.5">
                          <p className="font-extrabold text-foreground">Isuzu {s.series}</p>
                          <p className="text-[10px] text-muted-foreground">{s.engineFamily}</p>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold tabular-nums">
                          {s.avgFuelKmL} km/L
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold tabular-nums">
                          {formatIdr(s.cpkIdr)}
                        </td>
                        <td className="px-3.5 py-2.5 tabular-nums">{s.avgLoadFactorPct}%</td>
                        <td className="px-3.5 py-2.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {s.roiMarginPct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: OBD-II RELIABILITY & PREDICTIVE MAINTENANCE */}
      {tab === "obd" && (
        <div className="animate-page-enter space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* OBD Subsystem Fault Frequency */}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">
                    OBD-II Fault Frequency by Engine Subsystem
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    30-day national trouble code counts vs live active faults right now
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActivePage("obd")}>
                  Open OBD Console
                </Button>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={obdSubsystemData}
                    layout="vertical"
                    margin={{ top: 5, right: 16, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="subsystem"
                      width={118}
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="last30d" name="30-Day DTC Count" fill="#64748b" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="activeNow" name="Active Right Now" fill="#d91324" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* MTBF & Downtime by Isuzu Engine Family */}
            <Card className="p-5">
              <h3 className="text-sm font-extrabold text-foreground">
                Engine Reliability:{" "}
                <TermTooltip termKey="MTBF">MTBF (Hours)</TermTooltip> &amp; 30-Day Downtime
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Mean Time Between Failures across Isuzu diesel platforms (higher MTBF = stronger
                uptime)
              </p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={filteredSeriesMetrics}
                    margin={{ top: 8, right: 12, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="series" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar
                      yAxisId="left"
                      dataKey="mtbfHours"
                      name="MTBF (Hours)"
                      fill="#d91324"
                      radius={[8, 8, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="downtimeHrs30d"
                      name="Downtime (Hrs/30d)"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Live Vehicle Predictive Maintenance & OBD Matrix */}
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Live Isuzu Fleet Predictive Maintenance &amp; DPD Matrix
                </h3>
                <p className="text-xs text-muted-foreground">
                  Real-time ECU health, DPD soot load, battery bus, and next preventive service
                  interval across registered vehicles
                </p>
              </div>
              <Badge variant="outline">Synced with OBD-II Telematics</Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">
                      <TermTooltip termKey="TNKB">Vehicle &amp; Plat Nomor</TermTooltip>
                    </th>
                    <th className="px-4 py-3">Engine &amp; Odometer</th>
                    <th className="px-4 py-3">
                      <TermTooltip termKey="DPD">DPD Soot</TermTooltip>
                    </th>
                    <th className="px-4 py-3">Battery / Temp</th>
                    <th className="px-4 py-3">
                      <TermTooltip termKey="DTC">Active DTCs</TermTooltip>
                    </th>
                    <th className="px-4 py-3">
                      <TermTooltip termKey="PM_SERVICE">Next PM Service</TermTooltip>
                    </th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTrucks.map((t) => {
                    const health = getVehicleObdHealth(t);
                    const nextPmKm = Math.ceil((t.odometerKm + 1) / 10000) * 10000;
                    const kmLeft = nextPmKm - t.odometerKm;
                    return (
                      <tr key={t.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={t.imageSrc}
                              alt={t.model}
                              className="h-8 w-14 shrink-0 object-contain"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-foreground">{t.id}</span>
                                <LicensePlateBadge
                                  plate={t.plate}
                                  plateType={t.plateType}
                                  size="xs"
                                />
                              </div>
                              <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                                {t.model}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <p className="font-semibold text-foreground">{t.engine}</p>
                          <p className="text-[10.5px] text-muted-foreground">
                            {t.odometerKm.toLocaleString()} km · {t.obd.deviceId}
                          </p>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <div className="w-24">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span
                                className={
                                  t.obd.dpfSootPct >= 75
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-foreground"
                                }
                              >
                                {t.obd.dpfSootPct}%
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  t.obd.dpfSootPct >= 75
                                    ? "bg-red-600"
                                    : t.obd.dpfSootPct >= 45
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                )}
                                style={{ width: `${t.obd.dpfSootPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <p className="font-semibold">{t.obd.batteryVolts}V</p>
                          <p className="text-[10.5px] text-muted-foreground">
                            Coolant {t.obd.coolantTempC}°C
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {t.obd.activeCodes.length === 0 ? (
                            <Badge variant="secondary">0 Faults</Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {t.obd.activeCodes.map((c) => (
                                <Badge
                                  key={c.code}
                                  variant={health === "Critical" ? "destructive" : "warning"}
                                  className="font-mono"
                                >
                                  {c.code}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <p className="font-semibold text-foreground">
                            In {kmLeft.toLocaleString()} km
                          </p>
                          <p className="text-[10.5px] text-muted-foreground">
                            PM {(nextPmKm / 1000).toFixed(0)}k km
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              selectTruck(t.id);
                              setActivePage("obd");
                            }}
                            className="h-7 rounded-lg px-2.5 text-[11px]"
                          >
                            <Wrench className="h-3 w-3" />
                            Inspect ECU
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: REGIONAL BRANCHES & CORRIDOR SLA */}
      {tab === "regional" && (
        <div className="animate-page-enter space-y-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* Regional Branch CPK & Utilization Comparison */}
            <Card className="p-5 xl:col-span-2">
              <h3 className="text-sm font-extrabold text-foreground">
                Regional Branch Benchmark: Utilization % vs Empty Backhaul %
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Compare loaded bay efficiency against empty return trips across Astra Isuzu
                regional hubs
              </p>
              <div className="h-[270px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredBranches}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="branchName" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar
                      dataKey="utilizationPct"
                      name="Loaded Utilization (%)"
                      fill="#d91324"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="emptyBackhaulPct"
                      name="Empty Backhaul (%)"
                      fill="#f59e0b"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* SLA Delay Root Causes Donut */}
            <Card className="flex flex-col justify-between p-5">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  SLA Delay Root-Cause Analysis
                </h3>
                <p className="text-xs text-muted-foreground">
                  Primary drivers of late arrivals across Indonesia corridors (46 incidents)
                </p>
              </div>
              <div className="h-[190px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DELAY_ROOT_CAUSES}
                      dataKey="sharePct"
                      nameKey="cause"
                      innerRadius={50}
                      outerRadius={76}
                      paddingAngle={3}
                    >
                      {DELAY_ROOT_CAUSES.map((item) => (
                        <Cell key={item.cause} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2 text-xs">
                {DELAY_ROOT_CAUSES.map((item) => (
                  <div key={item.cause} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.cause}</span>
                    </span>
                    <span className="shrink-0 font-bold text-foreground tabular-nums">
                      {item.sharePct}% ({item.avgDelayMin}m)
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Regional Branch P&L & Operations Scorecard Table */}
          <Card className="p-5">
            <h3 className="text-sm font-extrabold text-foreground">
              National Regional Branch Scorecard (HO Governance)
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Full operational &amp; cost-efficiency ranking across all regional Isuzu branches
            </p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Branch &amp; Dealer Hub</th>
                    <th className="px-4 py-3">Trips / Tons</th>
                    <th className="px-4 py-3">Load / Backhaul</th>
                    <th className="px-4 py-3">OTIF SLA</th>
                    <th className="px-4 py-3">Fuel Avg</th>
                    <th className="px-4 py-3">CPK (Rp/km)</th>
                    <th className="px-4 py-3">Margin</th>
                    <th className="px-4 py-3 text-right">HO Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBranches.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-foreground">{b.branchName}</p>
                        <p className="text-[10.5px] text-muted-foreground">
                          {b.hubCities} · {b.dealerPartner}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <p className="font-bold">{b.monthlyTrips} trips</p>
                        <p className="text-[10.5px] text-muted-foreground">
                          {b.tonnageMoved.toLocaleString()} tons
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <p className="font-bold">{b.utilizationPct}% load</p>
                        <p className="text-[10.5px] text-amber-600 dark:text-amber-400">
                          {b.emptyBackhaulPct}% empty
                        </p>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {b.otifPct}%
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{b.fuelKmPerL} km/L</td>
                      <td className="px-4 py-3 font-bold tabular-nums">{formatIdr(b.cpkIdr)}</td>
                      <td className="px-4 py-3 font-extrabold tabular-nums">
                        {b.revenueMarginPct}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant={
                            b.status === "Exceeding"
                              ? "express"
                              : b.status === "On Target"
                              ? "standard"
                              : "warning"
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: DRIVER SAFETY & ECO-DRIVING SCORECARD */}
      {tab === "drivers" && (
        <div className="animate-page-enter space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Moving Fuel vs Idle Fuel Burn Chart */}
            <Card className="p-5 lg:col-span-2">
              <h3 className="text-sm font-extrabold text-foreground">
                OBD-II Fuel Telemetry: Moving Burn vs Engine Idling Waste (Liters / 30d)
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Reducing excessive idling by 35% saves an estimated{" "}
                <strong className="text-foreground">Rp 41.2 Juta / month</strong> in Biosolar /
                Dexlite spend
              </p>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={IDLE_FUEL_BY_REGION}
                    margin={{ top: 8, right: 12, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="region" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar
                      dataKey="movingFuelL"
                      name="Productive Moving Fuel (L)"
                      stackId="fuel"
                      fill="#0284c7"
                    />
                    <Bar
                      dataKey="idleFuelL"
                      name="Excessive Idle Waste (L)"
                      stackId="fuel"
                      fill="#d91324"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Eco-Driving Program Summary */}
            <Card className="flex flex-col justify-between p-5">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-red-600" />
                  <h3 className="text-sm font-extrabold text-foreground">
                    Isuzu Eco-Drive Program KPI
                  </h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  OBD-II telematics scoring based on RPM green-band adherence, harsh braking, and
                  engine idling
                </p>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-border bg-muted/35 p-3">
                    <p className="text-[11px] text-muted-foreground">National Avg Safety/Eco</p>
                    <p className="mt-0.5 text-2xl font-extrabold text-foreground tabular-nums">
                      87.7 <span className="text-xs font-semibold text-muted-foreground">/ 100</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/35 p-3">
                    <p className="text-[11px] text-muted-foreground">Top Eco-Driver This Month</p>
                    <p className="mt-0.5 text-sm font-extrabold text-foreground">
                      Andi Mappanyukki (95/100)
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      DD 8615 KRA · 9.8% idle · 5.3 km/L on GIGA 340
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      1 Driver Flagged for Eco-Coaching
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Rizky Pratama (BK 8905 ECA) recorded 25.8% idle time &amp; 4.9 harsh events/1k
                      km.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Driver Telematics Leaderboard Table */}
          <Card className="p-5">
            <h3 className="text-sm font-extrabold text-foreground">
              Driver Safety, Fuel Economy &amp; Telematics Leaderboard
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              OBD-verified performance across {filteredDrivers.length} active Isuzu drivers (30-day
              window)
            </p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Driver &amp; Unit</th>
                    <th className="px-4 py-3">Eco-Safety Score</th>
                    <th className="px-4 py-3">Fuel Economy</th>
                    <th className="px-4 py-3">
                      <TermTooltip termKey="IDLE_TIME">Idle Time %</TermTooltip>
                    </th>
                    <th className="px-4 py-3">Harsh / 1k km</th>
                    <th className="px-4 py-3">
                      <TermTooltip termKey="OTIF">OTIF %</TermTooltip>
                    </th>
                    <th className="px-4 py-3">Distance (30d)</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDrivers.map((d) => (
                    <tr key={d.driverId} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-foreground">{d.name}</p>
                        <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                          Isuzu {d.series} · {d.primaryPlate}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-foreground">{d.safetyEcoScore}</span>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                d.safetyEcoScore >= 90
                                  ? "bg-emerald-500"
                                  : d.safetyEcoScore >= 82
                                  ? "bg-sky-500"
                                  : "bg-amber-500"
                              )}
                              style={{ width: `${d.safetyEcoScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums">{d.fuelKmL} km/L</td>
                      <td
                        className={cn(
                          "px-4 py-3 font-semibold tabular-nums",
                          d.idleTimePct > 20 ? "text-red-600 dark:text-red-400" : "text-foreground"
                        )}
                      >
                        {d.idleTimePct}%
                      </td>
                      <td className="px-4 py-3 tabular-nums">{d.harshEventsPer1k}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {d.otifPct}%
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {d.kmDriven30d.toLocaleString()} km
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant={
                            d.tier === "Top Performer"
                              ? "express"
                              : d.tier === "On Target"
                              ? "standard"
                              : "warning"
                          }
                        >
                          {d.tier}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
