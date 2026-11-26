import { useMemo, useState } from "react";
import { ArrowUpRight, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SankeyCostInputs {
  fuelM: number;
  tollFerryM: number;
  driverOpsM: number;
  maintenanceM: number;
  avgMarginPct: number;
  idleWasteShare: number; // e.g., 0.168
  emptyBackhaulShare: number; // e.g., 0.15
  unplannedObdExposureM: number;
  timeframeLabel: string;
  regionLabel: string;
  onDrillDown?: (target: "obd" | "regional" | "drivers") => void;
}

interface SankeyNode {
  id: string;
  col: 0 | 1 | 2 | 3;
  label: string;
  sublabel: string;
  value: number;
  color: string;
  textColor?: string;
  leakage?: boolean;
  profit?: boolean;
  drillTarget?: "obd" | "regional" | "drivers";
  actionTip: string;
}

interface SankeyLink {
  id: string;
  source: string;
  target: string;
  value: number;
  color: string;
  leakage?: boolean;
  actionTip: string;
}

export function FleetCostSankey({
  fuelM,
  tollFerryM,
  driverOpsM,
  maintenanceM,
  avgMarginPct,
  idleWasteShare,
  emptyBackhaulShare,
  unplannedObdExposureM,
  timeframeLabel,
  regionLabel,
  onDrillDown,
}: SankeyCostInputs) {
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const model = useMemo(() => {
    const totalCost = Math.max(1, fuelM + tollFerryM + driverOpsM + maintenanceM);
    const marginRatio = Math.min(0.42, Math.max(0.12, avgMarginPct / 100));
    const grossRevenue = Number((totalCost / (1 - marginRatio)).toFixed(1));
    const netProfit = Number((grossRevenue - totalCost).toFixed(1));

    const idleFuelWaste = Number((fuelM * idleWasteShare).toFixed(1));
    const productiveFuel = Number(Math.max(0.5, fuelM - idleFuelWaste).toFixed(1));

    const opsAndTol = tollFerryM + driverOpsM;
    const emptyBackhaulDrag = Number((opsAndTol * emptyBackhaulShare).toFixed(1));
    const loadedCorridorOps = Number(Math.max(0.5, opsAndTol - emptyBackhaulDrag).toFixed(1));

    const unplannedObd = Number(
      Math.min(maintenanceM * 0.72, Math.max(maintenanceM * 0.22, unplannedObdExposureM * 0.45)).toFixed(1)
    );
    const preventivePm = Number(Math.max(0.5, maintenanceM - unplannedObd).toFixed(1));

    const totalLeakage = Number((idleFuelWaste + emptyBackhaulDrag + unplannedObd).toFixed(1));
    const leakagePctOfRev = Number(((totalLeakage / grossRevenue) * 100).toFixed(1));
    const netMarginPct = Number(((netProfit / grossRevenue) * 100).toFixed(1));

    const nodes: SankeyNode[] = [
      // Col 0: Revenue Source
      {
        id: "revenue",
        col: 0,
        label: "Gross Freight Revenue",
        sublabel: `${timeframeLabel} · ${regionLabel}`,
        value: grossRevenue,
        color: "#09090b",
        actionTip: "Total realized commercial logistics billing across active Isuzu corridors.",
      },
      // Col 1: Operating Cost vs Net Margin
      {
        id: "opex",
        col: 1,
        label: "Direct Operating Cost",
        sublabel: `${(100 - netMarginPct).toFixed(1)}% of revenue`,
        value: Number(totalCost.toFixed(1)),
        color: "#27272a",
        actionTip: "Combined fuel, toll/ferry, driver ops, and OBD maintenance spend.",
      },
      {
        id: "profit",
        col: 1,
        label: "Net Profit (EBITDA)",
        sublabel: `${netMarginPct}% net margin`,
        value: netProfit,
        color: "#10b981",
        profit: true,
        actionTip: "Retained operating margin before corporate overhead — target ≥ 24%.",
      },
      // Col 2: Cost Buckets
      {
        id: "fuel",
        col: 2,
        label: "Fuel (Solar / Dex)",
        sublabel: `${Math.round((fuelM / totalCost) * 100)}% of OpEx`,
        value: Number(fuelM.toFixed(1)),
        color: "#18181b",
        actionTip: "Largest cost driver; monitor idle burn % and green-band RPM via Geotab.",
      },
      {
        id: "tol",
        col: 2,
        label: "Tol & Ro-Ro Ferry",
        sublabel: `${Math.round((tollFerryM / totalCost) * 100)}% of OpEx`,
        value: Number(tollFerryM.toFixed(1)),
        color: "#0284c7",
        actionTip: "Trans-Jawa / Trans-Sumatra toll fees and Merak-Bakauheni / Ketapang ferry crossings.",
      },
      {
        id: "driver",
        col: 2,
        label: "Driver Ops & Uang Jalan",
        sublabel: `${Math.round((driverOpsM / totalCost) * 100)}% of OpEx`,
        value: Number(driverOpsM.toFixed(1)),
        color: "#52525b",
        actionTip: "Driver wages, trip allowances, and overtime across regional branches.",
      },
      {
        id: "maint",
        col: 2,
        label: "OBD Maint & Parts",
        sublabel: `${Math.round((maintenanceM / totalCost) * 100)}% of OpEx`,
        value: Number(maintenanceM.toFixed(1)),
        color: "#d97706",
        actionTip: "Scheduled Isuzu PM service plus unplanned DPD/injector/turbo repairs.",
      },
      // Col 3: Productive vs Controllable Leakage + Retained Profit
      {
        id: "prod_fuel",
        col: 3,
        label: "Productive Moving Fuel",
        sublabel: "Value-generating km",
        value: productiveFuel,
        color: "#3f3f46",
        actionTip: "Fuel burned while actively moving revenue payload along corridors.",
      },
      {
        id: "idle_waste",
        col: 3,
        label: "Idle Fuel Waste",
        sublabel: "Controllable Leakage",
        value: idleFuelWaste,
        color: "#f59e0b",
        leakage: true,
        drillTarget: "drivers",
        actionTip: "Cut excessive idling by 35% via Driver Eco-Coaching to save ~Rp 41 Jt/bln.",
      },
      {
        id: "loaded_ops",
        col: 3,
        label: "Loaded Corridor & Ops",
        sublabel: "Billable dispatch",
        value: loadedCorridorOps,
        color: "#64748b",
        actionTip: "Tol, ferry, and driver cost on revenue-loaded outbound & return trips.",
      },
      {
        id: "backhaul_leak",
        col: 3,
        label: "Empty Backhaul Drag",
        sublabel: "Controllable Leakage",
        value: emptyBackhaulDrag,
        color: "#ea580c",
        leakage: true,
        drillTarget: "regional",
        actionTip: "Consolidate return FMCG/industrial backhaul loads on Sumatra & Java hubs.",
      },
      {
        id: "pm_service",
        col: 3,
        label: "Preventive PM Service",
        sublabel: "Planned uptime spend",
        value: preventivePm,
        color: "#0d9488",
        actionTip: "Scheduled 10k km Isuzu Astra preventive maintenance protecting MTBF.",
      },
      {
        id: "obd_unplanned",
        col: 3,
        label: "Unplanned OBD / DPD",
        sublabel: "Critical Leakage",
        value: unplannedObd,
        color: "#dc2626",
        leakage: true,
        drillTarget: "obd",
        actionTip: "Trigger parked DPD regen & early SCV/filter checks from Geotab alerts to avoid breakdowns.",
      },
      {
        id: "retained_margin",
        col: 3,
        label: "Retained Net Margin",
        sublabel: "Bottom-line profit",
        value: netProfit,
        color: "#10b981",
        profit: true,
        actionTip: "Recovering 40% of controllable leakage lifts Net Margin by +3–4 percentage points.",
      },
    ];

    const links: SankeyLink[] = [
      {
        id: "rev-opex",
        source: "revenue",
        target: "opex",
        value: Number(totalCost.toFixed(1)),
        color: "#52525b",
        actionTip: `Rp ${totalCost.toFixed(1)} Jt (${(100 - netMarginPct).toFixed(1)}%) goes into direct fleet operations.`,
      },
      {
        id: "rev-profit",
        source: "revenue",
        target: "profit",
        value: netProfit,
        color: "#10b981",
        actionTip: `Rp ${netProfit.toFixed(1)} Jt (${netMarginPct}%) retained as Net Operating EBITDA.`,
      },
      {
        id: "opex-fuel",
        source: "opex",
        target: "fuel",
        value: Number(fuelM.toFixed(1)),
        color: "#27272a",
        actionTip: `Fuel accounts for Rp ${fuelM.toFixed(1)} Jt — #1 cost lever for management.`,
      },
      {
        id: "opex-tol",
        source: "opex",
        target: "tol",
        value: Number(tollFerryM.toFixed(1)),
        color: "#0284c7",
        actionTip: `Tol & Ro-Ro crossings total Rp ${tollFerryM.toFixed(1)} Jt across active corridors.`,
      },
      {
        id: "opex-driver",
        source: "opex",
        target: "driver",
        value: Number(driverOpsM.toFixed(1)),
        color: "#71717a",
        actionTip: `Driver operations & trip allowances total Rp ${driverOpsM.toFixed(1)} Jt.`,
      },
      {
        id: "opex-maint",
        source: "opex",
        target: "maint",
        value: Number(maintenanceM.toFixed(1)),
        color: "#d97706",
        actionTip: `Maintenance & parts total Rp ${maintenanceM.toFixed(1)} Jt (PM + reactive OBD).`,
      },
      {
        id: "fuel-prod",
        source: "fuel",
        target: "prod_fuel",
        value: productiveFuel,
        color: "#52525b",
        actionTip: `Rp ${productiveFuel.toFixed(1)} Jt productive fuel burned while moving cargo.`,
      },
      {
        id: "fuel-idle",
        source: "fuel",
        target: "idle_waste",
        value: idleFuelWaste,
        color: "#f59e0b",
        leakage: true,
        actionTip: `LEAKAGE: Rp ${idleFuelWaste.toFixed(1)} Jt burned while engine idling. Click to open Driver Eco-Driving.`,
      },
      {
        id: "tol-loaded",
        source: "tol",
        target: "loaded_ops",
        value: Number((tollFerryM * (1 - emptyBackhaulShare)).toFixed(1)),
        color: "#0284c7",
        actionTip: `Loaded corridor tolls & crossings.`,
      },
      {
        id: "tol-empty",
        source: "tol",
        target: "backhaul_leak",
        value: Number((tollFerryM * emptyBackhaulShare).toFixed(1)),
        color: "#ea580c",
        leakage: true,
        actionTip: `LEAKAGE: Empty return toll & ferry fees due to ${(emptyBackhaulShare * 100).toFixed(1)}% empty backhaul.`,
      },
      {
        id: "driver-loaded",
        source: "driver",
        target: "loaded_ops",
        value: Number((driverOpsM * (1 - emptyBackhaulShare)).toFixed(1)),
        color: "#71717a",
        actionTip: `Productive loaded driver dispatch hours.`,
      },
      {
        id: "driver-empty",
        source: "driver",
        target: "backhaul_leak",
        value: Number((driverOpsM * emptyBackhaulShare).toFixed(1)),
        color: "#ea580c",
        leakage: true,
        actionTip: `LEAKAGE: Driver hours spent hauling empty trailers on return corridors.`,
      },
      {
        id: "maint-pm",
        source: "maint",
        target: "pm_service",
        value: preventivePm,
        color: "#0d9488",
        actionTip: `Rp ${preventivePm.toFixed(1)} Jt planned Isuzu preventive maintenance.`,
      },
      {
        id: "maint-unplanned",
        source: "maint",
        target: "obd_unplanned",
        value: unplannedObd,
        color: "#dc2626",
        leakage: true,
        actionTip: `CRITICAL LEAKAGE: Rp ${unplannedObd.toFixed(1)} Jt reactive OBD / DPD breakdown cost. Click to inspect OBD Reliability.`,
      },
      {
        id: "profit-retained",
        source: "profit",
        target: "retained_margin",
        value: netProfit,
        color: "#10b981",
        actionTip: `Rp ${netProfit.toFixed(1)} Jt (${netMarginPct}%) net operating profit delivered to Head Office.`,
      },
    ];

    // Layout geometry inside SVG 1180 x 430
    const colX = [28, 330, 635, 945];
    const nodeW = 16;
    const topY = 46;
    const usableH = 352;

    const nodesByCol: Record<number, SankeyNode[]> = { 0: [], 1: [], 2: [], 3: [] };
    nodes.forEach((n) => nodesByCol[n.col].push(n));

    const positioned: Record<
      string,
      SankeyNode & { x: number; y: number; h: number; outOffset: number; inOffset: number }
    > = {};

    // Place each column cleanly with proportional height & generous gap so labels never collide
    ([0, 1, 2, 3] as const).forEach((col) => {
      const colNodes = nodesByCol[col];
      const gap = col === 3 ? 14 : col === 2 ? 18 : 22;
      const totalGap = gap * Math.max(0, colNodes.length - 1);
      const colTotalVal = colNodes.reduce((s, n) => s + n.value, 0);
      const minNodeH = col === 3 ? 28 : 34;
      const rawHeights = colNodes.map((n) =>
        Math.max(minNodeH, (n.value / Math.max(1, colTotalVal)) * (usableH - totalGap))
      );
      const sumRaw = rawHeights.reduce((s, h) => s + h, 0);
      const scale = sumRaw > usableH - totalGap ? (usableH - totalGap) / sumRaw : 1;
      const finalHeights = rawHeights.map((h) => h * scale);
      const actualBlockH = finalHeights.reduce((s, h) => s + h, 0) + totalGap;
      let cursorY = topY + (usableH - actualBlockH) / 2;

      colNodes.forEach((n, idx) => {
        const h = finalHeights[idx];
        positioned[n.id] = {
          ...n,
          x: colX[col],
          y: cursorY,
          h,
          outOffset: 0,
          inOffset: 0,
        };
        cursorY += h + gap;
      });
    });

    // Compute smooth Bézier ribbon paths
    const renderedLinks = links.map((lnk) => {
      const src = positioned[lnk.source];
      const tgt = positioned[lnk.target];
      const srcTotalOut = links
        .filter((l) => l.source === lnk.source)
        .reduce((s, l) => s + l.value, 0);
      const tgtTotalIn = links
        .filter((l) => l.target === lnk.target)
        .reduce((s, l) => s + l.value, 0);

      const hSrc = (lnk.value / Math.max(0.01, srcTotalOut)) * src.h;
      const hTgt = (lnk.value / Math.max(0.01, tgtTotalIn)) * tgt.h;

      const y0Top = src.y + src.outOffset;
      const y0Bot = y0Top + hSrc;
      const y1Top = tgt.y + tgt.inOffset;
      const y1Bot = y1Top + hTgt;

      src.outOffset += hSrc;
      tgt.inOffset += hTgt;

      const x0 = src.x + nodeW;
      const x1 = tgt.x;
      const midX = (x0 + x1) / 2;

      const d = [
        `M ${x0} ${y0Top}`,
        `C ${midX} ${y0Top}, ${midX} ${y1Top}, ${x1} ${y1Top}`,
        `L ${x1} ${y1Bot}`,
        `C ${midX} ${y1Bot}, ${midX} ${y0Bot}, ${x0} ${y0Bot}`,
        "Z",
      ].join(" ");

      return { ...lnk, d, srcLabel: src.label, tgtLabel: tgt.label };
    });

    return {
      grossRevenue,
      totalCost: Number(totalCost.toFixed(1)),
      netProfit,
      netMarginPct,
      totalLeakage,
      leakagePctOfRev,
      idleFuelWaste,
      emptyBackhaulDrag,
      unplannedObd,
      positioned: Object.values(positioned),
      renderedLinks,
    };
  }, [
    fuelM,
    tollFerryM,
    driverOpsM,
    maintenanceM,
    avgMarginPct,
    idleWasteShare,
    emptyBackhaulShare,
    unplannedObdExposureM,
    timeframeLabel,
    regionLabel,
  ]);

  const activeLink = model.renderedLinks.find((l) => l.id === hoveredLinkId) ?? null;
  const activeNode = model.positioned.find((n) => n.id === hoveredNodeId) ?? null;

  return (
    <div className="space-y-4">
      {/* Executive P&L & Leakage Callout Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Gross Freight Revenue
          </p>
          <p className="mt-1 text-xl font-extrabold text-foreground tabular-nums">
            Rp {model.grossRevenue} Jt
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {timeframeLabel} · {regionLabel}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Direct Operating Cost
          </p>
          <p className="mt-1 text-xl font-extrabold text-foreground tabular-nums">
            Rp {model.totalCost} Jt
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingDown className="h-3 w-3" /> {(100 - model.netMarginPct).toFixed(1)}% OpEx ratio
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/[0.05] p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Net Operating Profit
          </p>
          <p className="mt-1 text-xl font-extrabold text-emerald-700 tabular-nums dark:text-emerald-300">
            Rp {model.netProfit} Jt
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" /> {model.netMarginPct}% EBITDA Margin
          </p>
        </div>

        <div className="rounded-xl border border-red-500/35 bg-red-500/[0.05] p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
            Controllable Cost Leakage
          </p>
          <p className="mt-1 text-xl font-extrabold text-red-700 tabular-nums dark:text-red-300">
            Rp {model.totalLeakage} Jt
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            {model.leakagePctOfRev}% of revenue recoverable
          </p>
        </div>
      </div>

      {/* Interactive SVG Cost Flow Sankey Canvas */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-3">
        <div className="min-w-[960px]">
          <svg
            viewBox="0 0 1180 432"
            className="block h-auto w-full select-none"
            role="img"
            aria-label="HORUS Fleet Revenue to Operating Cost and Cost Leakage Sankey Diagram"
          >
            {/* Stage Column Headers */}
            {[
              { x: 28, title: "1. GROSS REVENUE", sub: "100% Freight Billing" },
              { x: 330, title: "2. P&L SPLIT", sub: "OpEx vs Net Margin" },
              { x: 635, title: "3. COST BUCKETS", sub: "Where Money Goes" },
              { x: 945, title: "4. PRODUCTIVE VS LEAKAGE", sub: "Click Leakage to Drill Down" },
            ].map((hdr) => (
              <g key={hdr.title}>
                <text
                  x={hdr.x}
                  y={18}
                  fill="currentColor"
                  className="fill-foreground"
                  fontSize="10.5"
                  fontWeight="900"
                  letterSpacing="0.8"
                  fontFamily="Plus Jakarta Sans, Inter, sans-serif"
                >
                  {hdr.title}
                </text>
                <text
                  x={hdr.x}
                  y={32}
                  fill="currentColor"
                  className="fill-muted-foreground"
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="Plus Jakarta Sans, Inter, sans-serif"
                >
                  {hdr.sub}
                </text>
              </g>
            ))}

            {/* Sankey Ribbons */}
            <g>
              {model.renderedLinks.map((lnk) => {
                const isDirectlyHovered = hoveredLinkId === lnk.id;
                const isNodeRelated =
                  hoveredNodeId !== null &&
                  (lnk.source === hoveredNodeId || lnk.target === hoveredNodeId);
                const anyHover = hoveredLinkId !== null || hoveredNodeId !== null;
                const opacity = anyHover
                  ? isDirectlyHovered || isNodeRelated
                    ? 0.62
                    : 0.1
                  : lnk.leakage
                  ? 0.42
                  : 0.28;

                return (
                  <path
                    key={lnk.id}
                    d={lnk.d}
                    fill={lnk.color}
                    fillOpacity={opacity}
                    className="cursor-pointer transition-opacity duration-200"
                    onMouseEnter={() => setHoveredLinkId(lnk.id)}
                    onMouseLeave={() => setHoveredLinkId(null)}
                    onClick={() => {
                      const tgtNode = model.positioned.find((n) => n.id === lnk.target);
                      if (tgtNode?.drillTarget && onDrillDown) {
                        onDrillDown(tgtNode.drillTarget);
                      }
                    }}
                  />
                );
              })}
            </g>

            {/* Sankey Nodes + Crisp Labels */}
            <g>
              {model.positioned.map((node) => {
                const isHighlighted =
                  hoveredNodeId === node.id ||
                  (activeLink && (activeLink.source === node.id || activeLink.target === node.id));
                const labelX = node.x + 24;
                const midY = node.y + node.h / 2;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => {
                      if (node.drillTarget && onDrillDown) {
                        onDrillDown(node.drillTarget);
                      }
                    }}
                  >
                    <rect
                      x={node.x}
                      y={node.y}
                      width={16}
                      height={node.h}
                      rx={5}
                      fill={node.color}
                      stroke={isHighlighted ? "#09090b" : "transparent"}
                      strokeWidth={isHighlighted ? 2 : 0}
                    />

                    {/* Node Label */}
                    <text
                      x={labelX}
                      y={midY - 3}
                      className={cn(
                        node.leakage
                          ? "fill-red-700 dark:fill-red-400"
                          : node.profit
                          ? "fill-emerald-700 dark:fill-emerald-400"
                          : "fill-foreground"
                      )}
                      fontSize="11.5"
                      fontWeight="800"
                      fontFamily="Plus Jakarta Sans, Inter, sans-serif"
                    >
                      {node.label}
                    </text>
                    <text
                      x={labelX}
                      y={midY + 12}
                      className="fill-muted-foreground"
                      fontSize="10.5"
                      fontWeight="700"
                      fontFamily="ui-monospace, monospace"
                    >
                      Rp {node.value.toFixed(1)} Jt
                      {node.leakage ? " ↗" : ""}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Interactive Hover / Management Action Insight Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/35 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
          {activeLink ? (
            <p className="truncate text-foreground">
              <strong className="font-extrabold">
                {activeLink.srcLabel} → {activeLink.tgtLabel} (Rp {activeLink.value.toFixed(1)} Jt):
              </strong>{" "}
              <span className="text-muted-foreground">{activeLink.actionTip}</span>
            </p>
          ) : activeNode ? (
            <p className="truncate text-foreground">
              <strong className="font-extrabold">
                {activeNode.label} (Rp {activeNode.value.toFixed(1)} Jt):
              </strong>{" "}
              <span className="text-muted-foreground">{activeNode.actionTip}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Hover any cost ribbon to inspect Rupiah share, or click{" "}
              <strong className="text-foreground">Idle Fuel Waste</strong>,{" "}
              <strong className="text-foreground">Empty Backhaul Drag</strong>, or{" "}
              <strong className="text-red-600 dark:text-red-400">Unplanned OBD / DPD</strong> to
              drill into recovery actions.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onDrillDown && (
            <>
              <button
                type="button"
                onClick={() => onDrillDown("drivers")}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
              >
                Idle Waste Rp {model.idleFuelWaste} Jt
                <ArrowUpRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDrillDown("obd")}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-500/20 dark:text-red-300"
              >
                OBD Risk Rp {model.unplannedObd} Jt
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
