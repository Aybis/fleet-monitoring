import { useRef, useState } from "react";
import { Download, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HldDiagramProps {
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  totalMasterCodes: number;
  criticalCount: number;
  onExportSuccess?: (format: "SVG" | "PNG") => void;
}

export function HorusFabricHldDiagram({
  selectedNodeId,
  onSelectNode,
  totalMasterCodes,
  criticalCount,
  onExportSuccess,
}: HldDiagramProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const isSel = (id: string) => selectedNodeId === id;

  const boxProps = (
    id: string,
    baseFill: string,
    baseStroke: string
  ): {
    fill: string;
    stroke: string;
    strokeWidth: number;
    filter?: string;
  } =>
    isSel(id)
      ? {
          fill: "#ffffff",
          stroke: "#d91324",
          strokeWidth: 3,
          filter: "url(#selShadow)",
        }
      : {
          fill: baseFill,
          stroke: baseStroke,
          strokeWidth: 1.5,
          filter: "url(#cardShadow)",
        };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "HORUS-Geotab-Fabric-HubApp-HLD.svg";
    a.click();
    URL.revokeObjectURL(url);
    onExportSuccess?.("SVG");
  };

  const handleDownloadPng = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new window.Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = 1480 * scale;
      canvas.height = 770 * scale;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, 1480, 770);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "HORUS-Geotab-Fabric-HubApp-HLD.png";
        a.click();
        onExportSuccess?.("PNG");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="space-y-3">
      {/* Diagram Controls + Flow Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/35 px-3.5 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full bg-[#d91324]" />
            Hot Real-Time Path (&lt; 3s: GPS, Faults, PIDs)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full bg-[#0d9488]" />
            Microsoft Fabric Warehouse Path (Medallion &amp; HO BI)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-[#d97706]" />
            Master Data Severity Governance Loop
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))}
              aria-label="Zoom out diagram"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-foreground tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
              aria-label="Zoom in diagram"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              aria-label="Reset diagram zoom"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadSvg}
            className="h-8 rounded-lg px-2.5 text-[11px] font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            SVG
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPng}
            className="h-8 rounded-lg px-2.5 text-[11px] font-semibold"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Download PNG
          </Button>
        </div>
      </div>

      {/* Interactive Blueprint Canvas */}
      <div className="overflow-auto rounded-2xl border border-border bg-[#f8fafc] shadow-inner dark:bg-[#0c1419]">
        <div
          style={{
            width: `${Math.round(zoom * 100)}%`,
            minWidth: "1020px",
          }}
          className="transition-[width] duration-200"
        >
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1480 770"
            className="block h-auto w-full select-none"
            role="img"
            aria-label="HORUS High-Level Design Architecture: Geotab to Microsoft Fabric Data Warehouse to HORUS Hub App to Dashboard"
          >
            <defs>
              {/* Architectural Dot Grid */}
              <pattern id="hldGrid" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.1" fill="#cbd5e1" opacity="0.65" />
              </pattern>

              {/* Soft Card Shadows */}
              <filter id="cardShadow" x="-8%" y="-8%" width="116%" height="120%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.08" />
              </filter>
              <filter id="selShadow" x="-10%" y="-10%" width="120%" height="124%">
                <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#d91324" floodOpacity="0.25" />
              </filter>

              {/* Arrow Markers */}
              <marker id="arrowRed" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="#d91324" />
              </marker>
              <marker id="arrowTeal" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="#0d9488" />
              </marker>
              <marker id="arrowAmber" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="#d97706" />
              </marker>
              <marker id="arrowSky" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="#0284c7" />
              </marker>

              {/* Zone Gradients */}
              <linearGradient id="fabricZoneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0fdfa" />
                <stop offset="100%" stopColor="#ecfeff" />
              </linearGradient>
              <linearGradient id="hubZoneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff5f5" />
                <stop offset="100%" stopColor="#fef2f2" />
              </linearGradient>
              <linearGradient id="geotabZoneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0f9ff" />
                <stop offset="100%" stopColor="#f8fafc" />
              </linearGradient>
              <linearGradient id="dashZoneBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e080b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Canvas Backdrop */}
            <rect x="0" y="0" width="1480" height="770" fill="#f8fafc" />
            <rect x="0" y="0" width="1480" height="770" fill="url(#hldGrid)" />

            {/* Top Blueprint Title Ribbon */}
            <rect x="24" y="18" width="1432" height="46" rx="12" fill="#0f172a" />
            <rect x="36" y="29" width="88" height="24" rx="6" fill="#d91324" />
            <text x="80" y="45" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif" letterSpacing="1.4">
              HORUS HLD
            </text>
            <text x="138" y="45" fill="#f8fafc" fontSize="14" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
              End-to-End Telematics Architecture: Geotab → Microsoft Fabric Data Warehouse → HORUS Hub App → Command Dashboard
            </text>
            <text x="1440" y="45" textAnchor="end" fill="#94a3b8" fontSize="11" fontWeight="700" fontFamily="ui-monospace, monospace">
              PT ISUZU ASTRA · v2.1 FABRIC EDITION
            </text>

            {/* ========================================================================= */}
            {/* ZONE 1: EDGE FLEET & GEOTAB SOURCE (x: 24..310)                           */}
            {/* ========================================================================= */}
            <rect x="24" y="80" width="288" height="666" rx="18" fill="url(#geotabZoneBg)" stroke="#7dd3fc" strokeWidth="1.5" />
            <rect x="38" y="94" width="260" height="28" rx="8" fill="#0369a1" />
            <text x="168" y="112" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif" letterSpacing="0.8">
              1. FLEET EDGE &amp; GEOTAB SOURCE
            </text>

            {/* Node: Isuzu ECU */}
            <g className="cursor-pointer" onClick={() => onSelectNode("isuzu-ecu")}>
              <rect x="44" y="142" width="248" height="106" rx="14" {...boxProps("isuzu-ecu", "#ffffff", "#cbd5e1")} />
              <rect x="56" y="154" width="86" height="18" rx="5" fill="#fee2e2" />
              <text x="99" y="166" textAnchor="middle" fill="#b91c1c" fontSize="9.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                ISUZU FLEET ECU
              </text>
              <text x="56" y="191" fill="#0f172a" fontSize="13.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Isuzu Commercial Vehicles
              </text>
              <text x="56" y="209" fill="#475569" fontSize="10.5" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                GIGA · FORWARD · ELF · TRAGA · D-MAX
              </text>
              <text x="56" y="229" fill="#64748b" fontSize="10" fontFamily="ui-monospace, monospace">
                OBD-II / J1939 CAN (SPN·FMI · PIDs)
              </text>
            </g>

            {/* Arrow: ECU -> GO9 */}
            <line x1="168" y1="248" x2="168" y2="294" stroke="#0284c7" strokeWidth="2.2" markerEnd="url(#arrowSky)" />
            <rect x="114" y="259" width="108" height="19" rx="6" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1" />
            <text x="168" y="272" textAnchor="middle" fill="#0369a1" fontSize="9.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
              CAN-Bus / Harness
            </text>

            {/* Node: Geotab GO9 */}
            <g className="cursor-pointer" onClick={() => onSelectNode("geotab-go9")}>
              <rect x="44" y="302" width="248" height="114" rx="14" {...boxProps("geotab-go9", "#ffffff", "#38bdf8")} />
              <rect x="56" y="314" width="104" height="18" rx="5" fill="#e0f2fe" />
              <text x="108" y="326" textAnchor="middle" fill="#0369a1" fontSize="9.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                GEOTAB HARDWARE
              </text>
              <text x="56" y="351" fill="#0f172a" fontSize="13.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Geotab GO9 / GO9+
              </text>
              <text x="56" y="370" fill="#475569" fontSize="10.5" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                GNSS GPS · 4G LTE · 3-Axis Accel
              </text>
              <text x="56" y="390" fill="#64748b" fontSize="10" fontFamily="ui-monospace, monospace">
                80k Flash Buffer (Dead-Zone Safe)
              </text>
              <text x="56" y="405" fill="#0284c7" fontSize="9.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                TLS 1.3 Cellular Telemetry Stream
              </text>
            </g>

            {/* Arrow: GO9 -> MyGeotab */}
            <line x1="168" y1="416" x2="168" y2="462" stroke="#0284c7" strokeWidth="2.2" markerEnd="url(#arrowSky)" />
            <rect x="118" y="427" width="100" height="19" rx="6" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1" />
            <text x="168" y="440" textAnchor="middle" fill="#0369a1" fontSize="9.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
              4G LTE Encrypted
            </text>

            {/* Node: MyGeotab Cloud */}
            <g className="cursor-pointer" onClick={() => onSelectNode("mygeotab-cloud")}>
              <rect x="44" y="470" width="248" height="156" rx="14" {...boxProps("mygeotab-cloud", "#ffffff", "#0284c7")} />
              <rect x="56" y="482" width="112" height="18" rx="5" fill="#0284c7" />
              <text x="112" y="494" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                MYGEOTAB CLOUD
              </text>
              <text x="56" y="519" fill="#0f172a" fontSize="13.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                MyGeotab API v1 &amp; Feeds
              </text>
              <text x="56" y="538" fill="#475569" fontSize="10.5" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Data Connector · GetFeed Cursors
              </text>
              {/* Mini feed pills */}
              <rect x="56" y="550" width="106" height="22" rx="6" fill="#fef2f2" stroke="#fca5a5" />
              <text x="109" y="564" textAnchor="middle" fill="#b91c1c" fontSize="9.5" fontWeight="800" fontFamily="ui-monospace, monospace">
                FaultData (DTC)
              </text>
              <rect x="168" y="550" width="112" height="22" rx="6" fill="#f0f9ff" stroke="#7dd3fc" />
              <text x="224" y="564" textAnchor="middle" fill="#0369a1" fontSize="9.5" fontWeight="800" fontFamily="ui-monospace, monospace">
                LogRecord (GPS)
              </text>
              <rect x="56" y="578" width="106" height="22" rx="6" fill="#f0fdfa" stroke="#5eead4" />
              <text x="109" y="592" textAnchor="middle" fill="#0f766e" fontSize="9.5" fontWeight="800" fontFamily="ui-monospace, monospace">
                StatusData (PID)
              </text>
              <rect x="168" y="578" width="112" height="22" rx="6" fill="#fffbeb" stroke="#fcd34d" />
              <text x="224" y="592" textAnchor="middle" fill="#b45309" fontSize="9.5" fontWeight="800" fontFamily="ui-monospace, monospace">
                Diagnostic Ref
              </text>
              <text x="56" y="616" fill="#64748b" fontSize="9.5" fontFamily="ui-monospace, monospace">
                + Device · ExceptionEvent · Zone
              </text>
            </g>

            {/* Enterprise ERP / WMS Mini Box at bottom of Zone 1 */}
            <g className="cursor-pointer" onClick={() => onSelectNode("fabric-ingestion")}>
              <rect x="44" y="646" width="248" height="82" rx="14" fill="#ffffff" stroke="#94a3b8" strokeDasharray="5 3" strokeWidth="1.4" filter="url(#cardShadow)" />
              <text x="56" y="668" fill="#475569" fontSize="9.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                SUPPORTING ENTERPRISE SOURCES
              </text>
              <text x="56" y="688" fill="#0f172a" fontSize="12.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                ERP · TMS · Fuel Card · Tol
              </text>
              <text x="56" y="707" fill="#64748b" fontSize="10" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Orders · Solar/Dex Fuel · Tol · Workshop PM
              </text>
            </g>

            {/* ========================================================================= */}
            {/* ZONE 2: MICROSOFT FABRIC DATA PLATFORM & WAREHOUSE (x: 356..804)          */}
            {/* ========================================================================= */}
            <rect x="356" y="80" width="448" height="666" rx="18" fill="url(#fabricZoneBg)" stroke="#2dd4bf" strokeWidth="1.8" />
            <rect x="370" y="94" width="420" height="28" rx="8" fill="#0f766e" />
            <text x="580" y="112" textAnchor="middle" fill="#ffffff" fontSize="10.2" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif" letterSpacing="0.6">
              2. MICROSOFT FABRIC — REAL-TIME &amp; DATA WAREHOUSE
            </text>

            {/* Ingestion Sub-Row inside Fabric */}
            {/* Node: Fabric Eventstream (Hot Path) */}
            <g className="cursor-pointer" onClick={() => onSelectNode("fabric-eventstream")}>
              <rect x="374" y="142" width="200" height="114" rx="14" {...boxProps("fabric-eventstream", "#ffffff", "#f87171")} />
              <rect x="386" y="154" width="112" height="18" rx="5" fill="#fee2e2" />
              <text x="442" y="166" textAnchor="middle" fill="#b91c1c" fontSize="9" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                HOT STREAMING PATH
              </text>
              <text x="386" y="191" fill="#0f172a" fontSize="13" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Fabric Eventstream
              </text>
              <text x="386" y="209" fill="#475569" fontSize="10" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Geotab Poller → Event Hub
              </text>
              <text x="386" y="227" fill="#64748b" fontSize="9.5" fontFamily="ui-monospace, monospace">
                2.5s–5s GetFeed Delta
              </text>
              <text x="386" y="243" fill="#b91c1c" fontSize="9.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Routes to Eventhouse + Hub App
              </text>
            </g>

            {/* Node: Fabric Data Factory (Batch Path) */}
            <g className="cursor-pointer" onClick={() => onSelectNode("fabric-ingestion")}>
              <rect x="588" y="142" width="198" height="114" rx="14" {...boxProps("fabric-ingestion", "#ffffff", "#14b8a6")} />
              <rect x="600" y="154" width="110" height="18" rx="5" fill="#ccfbf1" />
              <text x="655" y="166" textAnchor="middle" fill="#0f766e" fontSize="9" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                BATCH / REFERENCE
              </text>
              <text x="600" y="191" fill="#0f172a" fontSize="13" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Fabric Data Factory
              </text>
              <text x="600" y="209" fill="#475569" fontSize="10" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Pipelines &amp; Geotab Connector
              </text>
              <text x="600" y="227" fill="#64748b" fontSize="9.5" fontFamily="ui-monospace, monospace">
                Device · Diagnostic · ERP
              </text>
              <text x="600" y="243" fill="#0f766e" fontSize="9.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Scheduled 15m / Daily Sync
              </text>
            </g>

            {/* OneLake Medallion Container */}
            <g className="cursor-pointer" onClick={() => onSelectNode("fabric-onelake")}>
              <rect x="374" y="286" width="412" height="196" rx="16" {...boxProps("fabric-onelake", "#ffffff", "#0d9488")} />
              <rect x="388" y="298" width="174" height="20" rx="6" fill="#0f766e" />
              <text x="475" y="311" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                MICROSOFT FABRIC ONELAKE
              </text>
              <text x="572" y="312" fill="#0f766e" fontSize="10" fontWeight="700" fontFamily="ui-monospace, monospace">
                Unified Delta Parquet · Medallion
              </text>

              {/* Bronze */}
              <rect x="388" y="330" width="118" height="136" rx="12" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1.4" />
              <text x="447" y="350" textAnchor="middle" fill="#b45309" fontSize="10.5" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                BRONZE (Raw)
              </text>
              <text x="398" y="370" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• Raw Geotab JSON</text>
              <text x="398" y="388" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• FaultData Log</text>
              <text x="398" y="406" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• GPS Breadcrumbs</text>
              <text x="398" y="424" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• ERP / Fuel Raw</text>
              <text x="398" y="450" fill="#92400e" fontSize="9" fontWeight="700" fontFamily="ui-monospace, monospace">Immutable Archive</text>

              {/* Arrow Bronze -> Silver */}
              <line x1="506" y1="398" x2="526" y2="398" stroke="#0d9488" strokeWidth="2" markerEnd="url(#arrowTeal)" />

              {/* Silver */}
              <rect x="530" y="330" width="122" height="136" rx="12" fill="#f8fafc" stroke="#64748b" strokeWidth="1.4" />
              <text x="591" y="350" textAnchor="middle" fill="#334155" fontSize="10.5" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                SILVER (Cleansed)
              </text>
              <text x="540" y="370" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• Dedup &amp; Spark</text>
              <text x="540" y="388" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• VIN ↔ TNKB Map</text>
              <text x="540" y="406" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• DiagId → OBD</text>
              <text x="540" y="424" fill="#b91c1c" fontSize="9.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• Join Severity!</text>
              <text x="540" y="450" fill="#475569" fontSize="9" fontWeight="700" fontFamily="ui-monospace, monospace">OneLake Shortcut</text>

              {/* Arrow Silver -> Gold */}
              <line x1="652" y1="398" x2="672" y2="398" stroke="#0d9488" strokeWidth="2" markerEnd="url(#arrowTeal)" />

              {/* Gold */}
              <rect x="676" y="330" width="96" height="136" rx="12" fill="#fefce8" stroke="#eab308" strokeWidth="1.6" />
              <text x="724" y="350" textAnchor="middle" fill="#a16207" fontSize="10.5" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                GOLD (BI)
              </text>
              <text x="684" y="370" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• CPK / km</text>
              <text x="684" y="388" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• OTIF SLA</text>
              <text x="684" y="406" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• MTBF Risk</text>
              <text x="684" y="424" fill="#475569" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• Eco Score</text>
              <text x="684" y="450" fill="#854d0e" fontSize="9" fontWeight="700" fontFamily="ui-monospace, monospace">Star Schema</text>
            </g>

            {/* Serving Sub-Row inside Fabric */}
            {/* Node: Fabric Eventhouse (KQL Real-Time) */}
            <g className="cursor-pointer" onClick={() => onSelectNode("fabric-eventhouse")}>
              <rect x="374" y="514" width="198" height="114" rx="14" {...boxProps("fabric-eventhouse", "#ffffff", "#0d9488")} />
              <rect x="386" y="526" width="118" height="18" rx="5" fill="#ccfbf1" />
              <text x="445" y="538" textAnchor="middle" fill="#0f766e" fontSize="9" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                REAL-TIME KQL STORE
              </text>
              <text x="386" y="563" fill="#0f172a" fontSize="13" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Fabric Eventhouse
              </text>
              <text x="386" y="581" fill="#475569" fontSize="10" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Time-Series KQL Database
              </text>
              <text x="386" y="599" fill="#64748b" fontSize="9.5" fontFamily="ui-monospace, monospace">
                PID Oscilloscope · 90d Hot
              </text>
              <text x="386" y="615" fill="#0f766e" fontSize="9.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Sub-second Route &amp; DTC Replay
              </text>
            </g>

            {/* Node: Fabric Data Warehouse (T-SQL) */}
            <g className="cursor-pointer" onClick={() => onSelectNode("fabric-warehouse")}>
              <rect x="588" y="514" width="198" height="114" rx="14" {...boxProps("fabric-warehouse", "#ffffff", "#0f766e")} />
              <rect x="600" y="526" width="128" height="18" rx="5" fill="#0f766e" />
              <text x="664" y="538" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                FABRIC DATA WAREHOUSE
              </text>
              <text x="600" y="563" fill="#0f172a" fontSize="13" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Fabric Warehouse
              </text>
              <text x="600" y="581" fill="#475569" fontSize="10" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                T-SQL Endpoint · Direct Lake
              </text>
              <text x="600" y="599" fill="#64748b" fontSize="9.5" fontFamily="ui-monospace, monospace">
                Fact_Trips · Fact_OBD · CPK
              </text>
              <text x="600" y="615" fill="#0f766e" fontSize="9.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Powers HO Executive Analytics
              </text>
            </g>

            {/* Governance Strip at bottom of Fabric */}
            <rect x="374" y="646" width="412" height="82" rx="14" fill="#0f172a" />
            <text x="392" y="670" fill="#5eead4" fontSize="10" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif" letterSpacing="0.8">
              FABRIC GOVERNANCE &amp; SECURITY LAYER
            </text>
            <text x="392" y="692" fill="#f8fafc" fontSize="11.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
              Microsoft Purview Lineage · Entra ID RBAC · OneLake Mirroring
            </text>
            <text x="392" y="712" fill="#94a3b8" fontSize="10" fontFamily="ui-monospace, monospace">
              Zero-Copy Shortcuts from HORUS Hub App Master Data → Silver/Gold
            </text>

            {/* Internal Fabric Arrows */}
            <line x1="474" y1="256" x2="474" y2="282" stroke="#0d9488" strokeWidth="2" markerEnd="url(#arrowTeal)" />
            <line x1="687" y1="256" x2="687" y2="282" stroke="#0d9488" strokeWidth="2" markerEnd="url(#arrowTeal)" />
            <line x1="474" y1="482" x2="474" y2="510" stroke="#0d9488" strokeWidth="2" markerEnd="url(#arrowTeal)" />
            <line x1="687" y1="482" x2="687" y2="510" stroke="#0d9488" strokeWidth="2" markerEnd="url(#arrowTeal)" />

            {/* ========================================================================= */}
            {/* ZONE 3: HORUS HUB APP — OPERATIONAL CORE & BFF (x: 848..1160)             */}
            {/* ========================================================================= */}
            <rect x="848" y="80" width="312" height="666" rx="18" fill="url(#hubZoneBg)" stroke="#fca5a5" strokeWidth="1.8" />
            <rect x="862" y="94" width="284" height="28" rx="8" fill="#d91324" />
            <text x="1004" y="112" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif" letterSpacing="0.8">
              3. HORUS HUB APP (CORE MIDDLEWARE)
            </text>

            {/* Node: Severity & Live Rules Engine */}
            <g className="cursor-pointer" onClick={() => onSelectNode("severity-engine")}>
              <rect x="868" y="142" width="272" height="122" rx="14" {...boxProps("severity-engine", "#ffffff", "#d91324")} />
              <rect x="880" y="154" width="144" height="18" rx="5" fill="#d91324" />
              <text x="952" y="166" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                REAL-TIME RULES ENGINE
              </text>
              <text x="880" y="191" fill="#0f172a" fontSize="13.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Master Severity Enrichment
              </text>
              <text x="880" y="210" fill="#475569" fontSize="10.5" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Joins Geotab FaultData ↔ Master Data
              </text>
              <text x="880" y="229" fill="#b91c1c" fontSize="10" fontWeight="800" fontFamily="ui-monospace, monospace">
                {totalMasterCodes} Governed Codes ({criticalCount} Critical)
              </text>
              <text x="880" y="248" fill="#64748b" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                &lt; 20ms Score · Instant Hot-Reload on Edit
              </text>
            </g>

            {/* Node: Hub App OLTP + Redis Live Twin */}
            <g className="cursor-pointer" onClick={() => onSelectNode("hub-oltp-redis")}>
              <rect x="868" y="286" width="272" height="134" rx="14" {...boxProps("hub-oltp-redis", "#ffffff", "#f59e0b")} />
              <rect x="880" y="298" width="150" height="18" rx="5" fill="#fef3c7" />
              <text x="955" y="310" textAnchor="middle" fill="#b45309" fontSize="9" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                OPERATIONAL OLTP + CACHE
              </text>
              <text x="880" y="335" fill="#0f172a" fontSize="13.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                PostgreSQL + Redis Twin
              </text>
              <text x="880" y="354" fill="#475569" fontSize="10.5" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Master Data CRUD · Cargo Bays · Chat
              </text>
              <text x="880" y="373" fill="#64748b" fontSize="9.5" fontFamily="ui-monospace, monospace">
                Live Vehicle Twin · PostGIS Hubs
              </text>
              <text x="880" y="393" fill="#b45309" fontSize="9.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Mirrors Master Severity → Fabric OneLake
              </text>
              <text x="880" y="408" fill="#64748b" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Pub/Sub Fan-out for WebSocket Pods
              </text>
            </g>

            {/* Node: HORUS Hub API Gateway & WebSocket BFF */}
            <g className="cursor-pointer" onClick={() => onSelectNode("horus-gateway")}>
              <rect x="868" y="442" width="272" height="136" rx="14" {...boxProps("horus-gateway", "#ffffff", "#0f172a")} />
              <rect x="880" y="454" width="136" height="18" rx="5" fill="#e2e8f0" />
              <text x="948" y="466" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                HUB APP API &amp; WSS BFF
              </text>
              <text x="880" y="491" fill="#0f172a" fontSize="13.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Unified API &amp; WebSocket
              </text>
              <text x="880" y="510" fill="#475569" fontSize="10.5" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                REST CRUD · WSS Push · Fabric SQL Proxy
              </text>
              <text x="880" y="529" fill="#64748b" fontSize="9.5" fontFamily="ui-monospace, monospace">
                JWT OIDC · RBAC · Rate Limiting
              </text>
              <text x="880" y="549" fill="#0f766e" fontSize="9.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Queries Fabric Warehouse for HO KPIs
              </text>
              <text x="880" y="564" fill="#d91324" fontSize="9.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Streams Live GPS/OBD from Redis WSS
              </text>
            </g>

            {/* Node: Alert & Escalation Service */}
            <g className="cursor-pointer" onClick={() => onSelectNode("alert-orchestrator")}>
              <rect x="868" y="600" width="272" height="128" rx="14" {...boxProps("alert-orchestrator", "#ffffff", "#fca5a5")} />
              <rect x="880" y="612" width="136" height="18" rx="5" fill="#fee2e2" />
              <text x="948" y="624" textAnchor="middle" fill="#b91c1c" fontSize="9" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                ESCALATION &amp; COMMS
              </text>
              <text x="880" y="649" fill="#0f172a" fontSize="13" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Alert &amp; Dispatch Bridge
              </text>
              <text x="880" y="668" fill="#475569" fontSize="10" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Critical DTC → WhatsApp / SMS / Email
              </text>
              <text x="880" y="686" fill="#64748b" fontSize="9.5" fontFamily="ui-monospace, monospace">
                Auto-Ticket to Astra Isuzu Workshop
              </text>
              <text x="880" y="704" fill="#b91c1c" fontSize="9.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                Driver Cab Chat &amp; Voice VoIP Bridge
              </text>
            </g>

            {/* Internal Hub App vertical connections */}
            <line x1="1004" y1="264" x2="1004" y2="282" stroke="#d91324" strokeWidth="2" markerEnd="url(#arrowRed)" />
            <line x1="1004" y1="420" x2="1004" y2="438" stroke="#d91324" strokeWidth="2" markerEnd="url(#arrowRed)" />
            <line x1="1004" y1="578" x2="1004" y2="596" stroke="#d91324" strokeWidth="2" markerEnd="url(#arrowRed)" />

            {/* ========================================================================= */}
            {/* ZONE 4: HORUS COMMAND DASHBOARD & USERS (x: 1204..1456)                   */}
            {/* ========================================================================= */}
            <rect x="1204" y="80" width="252" height="666" rx="18" fill="url(#dashZoneBg)" stroke="#334155" strokeWidth="1.5" />
            <rect x="1218" y="94" width="224" height="28" rx="8" fill="#d91324" />
            <text x="1330" y="112" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif" letterSpacing="0.8">
              4. HORUS DASHBOARD UI
            </text>

            {/* Node: HORUS Web Dashboard */}
            <g className="cursor-pointer" onClick={() => onSelectNode("horus-ui")}>
              <rect
                x="1220"
                y="142"
                width="220"
                height="436"
                rx="14"
                fill={isSel("horus-ui") ? "#2d0b10" : "#180a0d"}
                stroke={isSel("horus-ui") ? "#ef4444" : "#7f1d1d"}
                strokeWidth={isSel("horus-ui") ? 3 : 1.6}
              />
              <text x="1234" y="166" fill="#fda4af" fontSize="10" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif" letterSpacing="0.8">
                REACT 19 COMMAND CENTER
              </text>
              <text x="1234" y="188" fill="#ffffff" fontSize="15" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                HORUS Web App
              </text>

              {/* Feature Module Cards inside HORUS UI */}
              {[
                { y: 204, title: "Live Indonesia Map", desc: "Leaflet OSM · TNKB · Alerts", tag: "WSS", tagColor: "#d91324" },
                { y: 264, title: "OBD-II & DPD Console", desc: "Live PIDs · Freeze Frame", tag: "KQL+WSS", tagColor: "#d91324" },
                { y: 324, title: "Master Data Rules", desc: "Geotab Code & Severity", tag: "CRUD", tagColor: "#d97706" },
                { y: 384, title: "HO Analytics", desc: "CPK · OTIF · MTBF · P&L", tag: "FABRIC", tagColor: "#0d9488" },
                { y: 444, title: "Cargo Ops & Queue", desc: "3×6 Bay Grid · Dispatch", tag: "OLTP", tagColor: "#0284c7" },
                { y: 504, title: "Driver Comms Bar", desc: "Cab Chat · Voice · Specs", tag: "WSS", tagColor: "#64748b" },
              ].map((m) => (
                <g key={m.title}>
                  <rect x="1232" y={m.y} width="196" height="50" rx="10" fill="#261015" stroke="#4c1d24" strokeWidth="1" />
                  <text x="1242" y={m.y + 20} fill="#ffffff" fontSize="10.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                    {m.title}
                  </text>
                  <text x="1242" y={m.y + 37} fill="#cbd5e1" fontSize="9.5" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
                    {m.desc}
                  </text>
                  <rect x="1370" y={m.y + 10} width="50" height="16" rx="4" fill={m.tagColor} />
                  <text x="1395" y={m.y + 21} textAnchor="middle" fill="#ffffff" fontSize="7.8" fontWeight="800" fontFamily="ui-monospace, monospace">
                    {m.tag}
                  </text>
                </g>
              ))}
            </g>

            {/* Stakeholders Box at bottom of Zone 4 */}
            <rect x="1220" y="600" width="220" height="128" rx="14" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
            <text x="1234" y="624" fill="#94a3b8" fontSize="9.5" fontWeight="800" fontFamily="Plus Jakarta Sans, Inter, sans-serif" letterSpacing="0.8">
              CONSUMERS &amp; CHANNELS
            </text>
            <text x="1234" y="646" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• Head Office (HO) Leadership</text>
            <text x="1234" y="666" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• Regional Fleet Dispatchers</text>
            <text x="1234" y="686" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• Astra Isuzu Workshop Bays</text>
            <text x="1234" y="706" fill="#fda4af" fontSize="10.5" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter, sans-serif">• Driver Cab WhatsApp / Radio</text>

            {/* ========================================================================= */}
            {/* CROSS-ZONE DATA FLOW CONNECTORS (THE STORY OF HOW DATA REACHES UI)        */}
            {/* ========================================================================= */}

            {/* 1. MyGeotab -> Fabric Eventstream (HOT REAL-TIME PATH) */}
            <path
              d="M 292 520 L 326 520 L 326 198 L 370 198"
              fill="none"
              stroke="#d91324"
              strokeWidth="2.6"
              markerEnd="url(#arrowRed)"
            />

            {/* 2. MyGeotab Reference & ERP -> Fabric Data Factory (BATCH / WAREHOUSE PATH) */}
            <path
              d="M 292 586 L 341 586 M 292 687 L 341 687 L 341 271 L 687 271 L 687 260"
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.2"
              markerEnd="url(#arrowTeal)"
            />
            <rect x="303" y="330" width="52" height="20" rx="6" fill="#d91324" />
            <text x="329" y="343" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
              HOT 3s
            </text>

            {/* 3. Fabric Eventstream -> Hub App Severity Engine (HOT PATH CONTINUATION) */}
            <path
              d="M 574 176 L 580 176 L 580 130 L 826 130 L 826 198 L 864 198"
              fill="none"
              stroke="#d91324"
              strokeWidth="2.6"
              markerEnd="url(#arrowRed)"
            />
            <rect x="794" y="150" width="64" height="20" rx="6" fill="#d91324" />
            <text x="826" y="163" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
              STREAM
            </text>

            {/* 4. Fabric Warehouse (Gold T-SQL) & Eventhouse (KQL) -> Hub App API Gateway */}
            <path
              d="M 786 566 L 826 566 L 826 510 L 864 510"
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.6"
              markerEnd="url(#arrowTeal)"
            />
            <rect x="790" y="526" width="72" height="20" rx="6" fill="#0f766e" />
            <text x="826" y="539" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
              SQL / KQL
            </text>

            {/* 5. MASTER DATA GOVERNANCE LOOP (Hub OLTP -> Fabric OneLake Silver) */}
            <path
              d="M 868 378 L 790 378"
              fill="none"
              stroke="#d97706"
              strokeWidth="2.4"
              strokeDasharray="6 4"
              markerEnd="url(#arrowAmber)"
            />
            <rect x="789" y="352" width="74" height="20" rx="6" fill="#fffbeb" stroke="#f59e0b" />
            <text x="826" y="365" textAnchor="middle" fill="#b45309" fontSize="8.5" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
              SEVERITY SYNC
            </text>

            {/* 6. Hub App API & WSS -> HORUS Dashboard (Hot WSS + Analytical REST) */}
            <path
              d="M 1140 486 L 1180 486 L 1180 258 L 1216 258"
              fill="none"
              stroke="#d91324"
              strokeWidth="2.6"
              markerEnd="url(#arrowRed)"
            />
            <path
              d="M 1140 518 L 1188 518 L 1188 408 L 1216 408"
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.6"
              markerEnd="url(#arrowTeal)"
            />
            <rect x="1152" y="454" width="60" height="20" rx="6" fill="#0f172a" />
            <text x="1182" y="467" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
              WSS / API
            </text>

            {/* 7. Master Data UI -> Hub App OLTP (Write-back Severity CRUD) */}
            <path
              d="M 1220 349 L 1144 349"
              fill="none"
              stroke="#d97706"
              strokeWidth="2.4"
              strokeDasharray="6 4"
              markerEnd="url(#arrowAmber)"
            />
            <rect x="1150" y="324" width="64" height="20" rx="6" fill="#fffbeb" stroke="#f59e0b" />
            <text x="1182" y="337" textAnchor="middle" fill="#b45309" fontSize="8.5" fontWeight="900" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
              SAVE RULE
            </text>

            {/* 8. Alert & Dispatch Bridge -> Stakeholders */}
            <path
              d="M 1140 664 L 1216 664"
              fill="none"
              stroke="#d91324"
              strokeWidth="2.2"
              strokeDasharray="5 3"
              markerEnd="url(#arrowRed)"
            />
          </svg>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tip: Click any component box inside the blueprint above (e.g.,{" "}
        <button
          type="button"
          onClick={() => onSelectNode("fabric-warehouse")}
          className={cn(
            "cursor-pointer font-bold text-teal-700 hover:underline dark:text-teal-400"
          )}
        >
          Fabric Warehouse
        </button>
        ,{" "}
        <button
          type="button"
          onClick={() => onSelectNode("fabric-onelake")}
          className="cursor-pointer font-bold text-teal-700 hover:underline dark:text-teal-400"
        >
          OneLake Medallion
        </button>
        , or{" "}
        <button
          type="button"
          onClick={() => onSelectNode("horus-gateway")}
          className="cursor-pointer font-bold text-red-600 hover:underline dark:text-red-400"
        >
          HORUS Hub App
        </button>
        ) to inspect its exact role, protocol, and data flow below.
      </p>
    </div>
  );
}
