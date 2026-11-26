import { useMemo, useState } from "react";
import {
  Network,
  Cloud,
  Database,
  ShieldCheck,
  Activity,
  Download,
  Layers,
  GitBranch,
  Zap,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Code2,
  ExternalLink,
  Sliders,
  BellRing,
  Clock,
  Flame,
  Warehouse,
  RefreshCw,
} from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { HorusFabricHldDiagram } from "@/components/hld/HorusFabricHldDiagram";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/TablePagination";
import { TermTooltip } from "@/components/ui/TermTooltip";
import { cn } from "@/lib/utils";

type HldTab = "architecture" | "pipeline" | "geotab-mapping" | "nfr-security";
type PayloadSampleKey = "faultData" | "statusData" | "logRecord";

interface ArchComponentSpec {
  id: string;
  layer: string;
  name: string;
  badge: string;
  protocol: string;
  techStack: string;
  geotabObjects: string;
  sla: string;
  summary: string;
  responsibilities: string[];
  resilience: string;
}

const ARCH_COMPONENTS: ArchComponentSpec[] = [
  {
    id: "isuzu-ecu",
    layer: "1. Fleet Edge & Geotab Source",
    name: "Isuzu Commercial Vehicle ECU (6HK1 / 4HK1 / 4JJ1)",
    badge: "J1939 · OBD-II",
    protocol: "SAE J1939 (250/500 kbps CAN) & ISO 15765-4 OBD-II",
    techStack: "Isuzu Engine Control Module, DPD/DPF Controller, ABS/EBS",
    geotabObjects: "Raw CAN Frames, SPN/FMI Faults, Live PID Sensors",
    sla: "10–100 ms internal CAN-Bus broadcast",
    summary:
      "Origin of all vehicle health data across Isuzu GIGA, FORWARD, ELF, TRAGA, and D-MAX units — broadcasting engine RPM, DPD soot load %, coolant temperature, fuel rail pressure, and DTC fault codes.",
    responsibilities: [
      "Emit active & pending trouble codes (e.g., P2002 / SPN 3251, P0401 / SPN 27) with freeze-frame snapshots",
      "Expose live engine PIDs (RPM, boost kPa, battery bus 24V/12V, DEF/AdBlue %) on the diagnostic port",
      "Retain active faults in ECU memory until physical service & OBD reset are performed",
    ],
    resilience:
      "Non-volatile ECU fault memory ensures codes are never lost even when vehicle ignition cycles off.",
  },
  {
    id: "geotab-go9",
    layer: "1. Fleet Edge & Geotab Source",
    name: "Geotab GO9 / GO9+ Telematics Device",
    badge: "4G LTE · GNSS",
    protocol: "OBD-II 16-pin / 9-pin Heavy Harness → TLS 1.3 Cellular",
    techStack: "Geotab GO9+ Firmware, Multi-Constellation GNSS, 3-Axis Accelerometer, IOX-CAN",
    geotabObjects: "Produces LogRecord, FaultData, StatusData, ExceptionEvent",
    sla: "Curve-based GPS logging + instant fault push (< 2s on 4G LTE)",
    summary:
      "Hardware gateway plugged into each Isuzu unit. Passively reads J1939/OBD-II signals, adds GPS coordinates & harsh-driving telemetry, and transmits encrypted packets to MyGeotab Cloud.",
    responsibilities: [
      "Decode Isuzu commercial diesel CAN frames without interfering with vehicle safety buses",
      "Detect harsh braking, rapid acceleration, and excessive idling for HO Eco-Driving scorecards",
      "Buffer 80,000+ telemetry records in onboard flash during Sumatra/Kalimantan cellular dead zones",
    ],
    resilience:
      "Store-and-forward flash memory replays all buffered GPS & FaultData chronologically upon LTE reconnect.",
  },
  {
    id: "mygeotab-cloud",
    layer: "1. Fleet Edge & Geotab Source",
    name: "MyGeotab Cloud & Data API v1",
    badge: "HTTPS JSON-RPC · Data Connector",
    protocol: "HTTPS POST /apiv1 (GetFeed Watermark) + Geotab Data Connector",
    techStack: "MyGeotab Managed Cloud (my.geotab.com), Diagnostic Catalog, Rules Engine",
    geotabObjects: "FaultData, StatusData, LogRecord, Diagnostic, Device, ExceptionEvent, Zone",
    sla: "99.95% Geotab Cloud availability · Cursor-based incremental sync",
    summary:
      "Authoritative telematics ingestion cloud from Geotab. Exposes incremental GetFeed cursors for real-time streaming into Microsoft Fabric Eventstream and scheduled reference syncs via Fabric Data Factory.",
    responsibilities: [
      "Serve incremental FaultData, StatusData, and LogRecord deltas via fromVersion cursor tokens",
      "Provide canonical Geotab Diagnostic catalog (DiagnosticId ↔ SPN/FMI/OBD Code) for Master Data seeding",
      "Authenticate HORUS / Fabric ingestion connectors securely via rotating session tokens",
    ],
    resilience:
      "Cursor-based pagination guarantees zero skipped or duplicated telematics records across worker restarts.",
  },
  {
    id: "fabric-eventstream",
    layer: "2. Microsoft Fabric (Real-Time Intelligence)",
    name: "Microsoft Fabric Eventstream (Hot Path)",
    badge: "Real-Time Stream · < 3s",
    protocol: "Geotab Poller Worker → Azure Event Hubs / Custom Endpoint → Fabric Eventstream",
    techStack: "Microsoft Fabric Real-Time Intelligence, Eventstream, Schema Registry",
    geotabObjects: "Live FaultData (DTC), LogRecord (GPS), StatusData (PIDs)",
    sla: "< 500 ms stream routing · 100,000+ events/sec burst headroom",
    summary:
      "Real-time ingestion backbone inside Microsoft Fabric. Receives high-frequency Geotab GetFeed deltas every 2.5–5 seconds and fans them out simultaneously to OneLake Bronze, Fabric Eventhouse (KQL), and the HORUS Hub App.",
    responsibilities: [
      "Split live Geotab streams into dual destinations: (1) HORUS Hub App for < 3s live UI & alerts, (2) Fabric OneLake + Eventhouse for analytics",
      "Apply lightweight stream filtering & partitioning by Geotab DeviceId to preserve per-truck ordering",
      "Absorb cellular reconnect bursts without overwhelming downstream SQL or WebSocket layers",
    ],
    resilience:
      "Managed multi-AZ streaming with built-in replay buffers and dead-letter routing for malformed payloads.",
  },
  {
    id: "fabric-ingestion",
    layer: "2. Microsoft Fabric (Data Integration)",
    name: "Microsoft Fabric Data Factory (Batch & ERP Sync)",
    badge: "Pipelines · Connectors",
    protocol: "Scheduled Copy Pipelines & Geotab Data Connector + ERP REST/SQL Connectors",
    techStack: "Microsoft Fabric Data Factory, Dataflows Gen2, Key Vault Credentials",
    geotabObjects: "Device Registry, Geotab Diagnostic Dictionary, Zone Geofences, ERP Shipments & Fuel",
    sla: "15-min incremental Device/Zone sync · Daily 02:00 WIB ERP & Cost reconciliation",
    summary:
      "Orchestrates batch ingestion of slow-changing Geotab reference tables (Device, Diagnostic, Zone) plus enterprise ERP/TMS/Fuel Card/Toll data into OneLake Bronze so HO Analytics can calculate true Cost per KM (CPK) and Margin.",
    responsibilities: [
      "Sync Geotab Device serial numbers & VINs to link with Indonesian TNKB Plat Nomor in Silver",
      "Pull Geotab Diagnostic master list daily so newly introduced Isuzu ECU codes are discovered automatically",
      "Ingest Biosolar/Dexlite fuel invoices, Tol/Ro-Ro ferry costs, and Astra Workshop PM records for HO P&L",
    ],
    resilience:
      "Automatic retry policies, incremental watermark tables, and pipeline failure alerts via Microsoft Teams/Email.",
  },
  {
    id: "fabric-onelake",
    layer: "2. Microsoft Fabric (Unified Storage)",
    name: "Microsoft Fabric OneLake — Medallion Lakehouse (Bronze / Silver / Gold)",
    badge: "Delta Parquet · Medallion",
    protocol: "Spark Notebooks + OneLake Shortcuts (Zero-Copy Mirroring)",
    techStack: "Microsoft Fabric Lakehouse, Apache Spark, Delta Lake, OneLake Shortcuts",
    geotabObjects: "Bronze (Raw Geotab JSON) → Silver (TNKB + Severity Joined) → Gold (HO KPIs)",
    sla: "Single copy of data across BI, SQL, and KQL · ACID Delta transactions",
    summary:
      "Unified data lake foundation powering all HORUS analytics. Organizes Geotab and ERP data into Bronze (immutable raw), Silver (cleansed, deduplicated, joined with HORUS Master Data Severity via OneLake Shortcut), and Gold (aggregated HO star-schema tables).",
    responsibilities: [
      "Bronze: Archive 100% raw Geotab FaultData, StatusData, and LogRecord payloads for audit & replay",
      "Silver: Normalize Geotab DiagnosticId → standard OBD-II DTC (e.g., P2002) and join live HORUS Master Data Severity rules",
      "Gold: Compute daily/monthly CPK, OTIF SLA, Empty Backhaul %, Idle Fuel Waste, and MTBF per Isuzu series",
    ],
    resilience:
      "Delta Lake time-travel enables instant rollback of bad transformations and 3-year compressed cold compliance archival.",
  },
  {
    id: "fabric-eventhouse",
    layer: "2. Microsoft Fabric (Real-Time Analytics)",
    name: "Microsoft Fabric Eventhouse (KQL Time-Series DB)",
    badge: "KQL · Time-Series",
    protocol: "Eventstream Direct Ingestion + KQL Query API",
    techStack: "Microsoft Fabric Eventhouse (Kusto / KQL Database)",
    geotabObjects: "High-frequency PID curves (RPM, Boost, Fuel Rail, DPD Soot) & GPS breadcrumbs",
    sla: "< 300 ms time-series queries across 90 days of hot telemetry",
    summary:
      "Purpose-built real-time time-series engine inside Microsoft Fabric. Serves the live OBD-II Oscilloscope chart, historical route playback, and freeze-frame diagnostic investigations via ultra-fast KQL queries.",
    responsibilities: [
      "Index millions of Geotab StatusData & LogRecord rows per day with sub-second time-window slicing",
      "Power HORUS OBD Diagnostics live oscilloscope and historical DPD soot-loading trend charts",
      "Auto-tier older telemetry chunks into OneLake Delta tables for long-term cold storage",
    ],
    resilience:
      "Hot cache + OneLake persistent backing ensures zero data loss and predictable latency under concurrent queries.",
  },
  {
    id: "fabric-warehouse",
    layer: "2. Microsoft Fabric (Data Warehouse)",
    name: "Microsoft Fabric Data Warehouse (Gold T-SQL & Direct Lake)",
    badge: "T-SQL · Star Schema",
    protocol: "TDS / T-SQL Analytics Endpoint + Direct Lake Semantic Model",
    techStack: "Microsoft Fabric Warehouse (Distributed MPP SQL), Power BI Direct Lake",
    geotabObjects: "Fact_Trips, Fact_OBD_Faults, Fact_Fuel_CPK, Dim_Vehicle_TNKB, Dim_OBD_Master_Severity",
    sla: "99.9% query availability · Sub-second aggregated HO Executive KPIs",
    summary:
      "Enterprise Data Warehouse layer queried by the HORUS Hub App to render the Head Office (HO) Analytics dashboard (Cost vs Budget, Regional Branch P&L, OBD Downtime Risk in Rp Jt, Driver Eco-Driving Leaderboard) without touching operational OLTP tables.",
    responsibilities: [
      "Serve multi-timeframe HO KPIs (7D, 30D, 90D, YTD) sliced by Indonesia Region & Isuzu Series",
      "Join Geotab OBD fault counts with HORUS Master Severity & Workshop repair cost to quantify Downtime Exposure (Rp Jt)",
      "Support optional Direct Lake Power BI reports for Board-level financial reviews alongside HORUS Web UI",
    ],
    resilience:
      "Auto-scaling Fabric Capacity (F-SKU) isolates heavy HO executive reporting from live fleet dispatch operations.",
  },
  {
    id: "severity-engine",
    layer: "3. HORUS Hub App (Core Middleware)",
    name: "HORUS Hub App — Master Code & Severity Enrichment Engine",
    badge: "Master Data Join · < 20ms",
    protocol: "Consumes Fabric Eventstream + In-Memory Redis Master Severity Cache",
    techStack: "Node.js / Go Microservice (HORUS Hub App Core), Redis Rule Cache",
    geotabObjects: "Maps Geotab DiagnosticId / SPN-FMI → HORUS Master Code + Admin Severity",
    sla: "< 20 ms enrichment per FaultData event · < 1s severity hot-reload",
    summary:
      "Core operational intelligence inside the HORUS Hub App. Every incoming Geotab fault code is scored in real time against user-configured Severity rules (Critical / Warning / Advisory) from HORUS Master Data before reaching the dashboard.",
    responsibilities: [
      "Translate Geotab DiagnosticId + FailureModeId into standardized Isuzu OBD-II codes (P2002, P0401, P0087, etc.)",
      "Attach Admin-assigned Severity (Critical / Warning / Advisory), plain-language meaning, and Drivable Policy",
      "Auto-quarantine unknown Geotab codes as Advisory and trigger a Master Data Governance review alert",
    ],
    resilience:
      "When an Admin edits a code's severity in Master Data, the Hub App hot-reloads Redis rules, re-scores active units immediately, and syncs the updated table to Fabric OneLake.",
  },
  {
    id: "hub-oltp-redis",
    layer: "3. HORUS Hub App (Operational State)",
    name: "HORUS Hub App — Operational OLTP (PostgreSQL) & Redis Live Twin",
    badge: "OLTP CRUD + Live Cache",
    protocol: "ACID SQL (Prisma/PgBouncer) + Redis RESP3 Pub/Sub + OneLake Mirroring",
    techStack: "Azure Database for PostgreSQL (PostGIS) + Azure Managed Redis Cluster",
    geotabObjects: "Master Data Catalog, Cargo Bay Loads, Driver Chat, Live Vehicle Digital Twin",
    sla: "< 5 ms OLTP writes · < 2 ms Redis live twin reads",
    summary:
      "Why the Hub App needs its own OLTP + Redis store alongside Microsoft Fabric: Fabric excels at analytics, while PostgreSQL + Redis deliver instant transactional writes (Master Data CRUD, 3×6 cargo bay assignments, driver cab chat) and millisecond live map state.",
    responsibilities: [
      "Persist Master Data (OBD codes, custom severities, hub geofences) with full who/when audit history",
      "Mirror Master Data & Shipment tables into Microsoft Fabric OneLake via Database Mirroring / CDC",
      "Maintain the real-time Digital Twin of all active trucks in Redis for instant page loads & WebSocket fan-out",
    ],
    resilience:
      "Multi-AZ synchronous PostgreSQL failover + Redis cluster replication; live state rebuilds cleanly from Eventhouse on cold start.",
  },
  {
    id: "horus-gateway",
    layer: "3. HORUS Hub App (API & BFF)",
    name: "HORUS Hub App — Unified API Gateway & WebSocket Hub (BFF)",
    badge: "REST · WSS · Fabric Proxy",
    protocol: "HTTPS REST API + WSS Real-Time Push + TDS/KQL Fabric Client",
    techStack: "NestJS / Go API Gateway, Microsoft Entra ID (OIDC JWT), RBAC Guard",
    geotabObjects: "Unifies Hub OLTP, Redis Live Twin, Fabric Warehouse & Eventhouse into clean UI DTOs",
    sla: "99.9% active-active uptime · Horizontal Kubernetes / Container App scaling",
    summary:
      "Single Backend-for-Frontend (BFF) entry point that makes the HORUS Dashboard fast and simple. Routes real-time map & OBD updates via WebSocket (Redis), transactional edits to PostgreSQL, and HO Analytics queries to Microsoft Fabric Data Warehouse.",
    responsibilities: [
      "Enforce Role-Based Access Control (HO Executive, Master Data Admin, Regional Dispatcher, Mechanic)",
      "Push live 2.5s GPS movements, OBD alerts, and instant severity updates to connected browsers via WSS",
      "Cache aggregated Fabric Data Warehouse responses (30s–5m TTL) for snappy HO Analytics filter switching",
    ],
    resilience:
      "Circuit breaker + stale-while-revalidate caching protects the dashboard even during heavy Fabric Warehouse refreshes.",
  },
  {
    id: "alert-orchestrator",
    layer: "3. HORUS Hub App (Action & Comms)",
    name: "HORUS Hub App — Alert Escalation & Cab Comms Bridge",
    badge: "WhatsApp · Workshop ERP",
    protocol: "Event-Driven Notification Workers + VoIP/WebRTC & WhatsApp Business API",
    techStack: "Notification Microservice, Webhook Dispatcher, Audit Logger",
    geotabObjects: "Consumes Enriched Critical/Warning Fault Events & Driver Dispatch Messages",
    sla: "< 5s alert delivery for Critical OBD faults",
    summary:
      "Turns Geotab fault intelligence into immediate field action — escalating Critical codes to Head Office & Astra Isuzu Service Bays while powering the in-app Driver Cab Chat and Voice Call right drawer.",
    responsibilities: [
      "Auto-open Astra Isuzu Workshop service tickets when Critical faults (e.g., P2002 DPD, P0087 Fuel Rail) persist",
      "Send WhatsApp / SMS alerts to Regional Ops and Driver Cab terminals with plain-language drivable policy",
      "Log every dispatcher-to-driver chat and voice call against the active trip & TNKB unit",
    ],
    resilience:
      "Deduplication window prevents alert storms when an intermittent CAN fault flaps repeatedly.",
  },
  {
    id: "horus-ui",
    layer: "4. HORUS Command Dashboard",
    name: "HORUS Web Command Center (Presentation Layer)",
    badge: "React 19 · Leaflet · Recharts",
    protocol: "HTTPS SPA + Persistent WebSocket + REST API",
    techStack: "React 19, TypeScript, Tailwind CSS v4, Leaflet OSM, Recharts",
    geotabObjects: "Live Indonesia Map, OBD-II Console, Master Data, HO Analytics, Cargo Ops",
    sla: "< 1.5s initial load · 60fps interactive map & oscilloscope",
    summary:
      "Unified operational & executive glass pane for PT Isuzu Astra Motor Indonesia. Combines real-time Geotab telemetry from the Hub App with strategic HO analytics served from Microsoft Fabric Data Warehouse.",
    responsibilities: [
      "Live Map & Cargo Ops: Consume Hub App WSS stream for real-time TNKB truck positions & bay loading",
      "OBD-II Console: Display live Geotab PIDs (Eventhouse KQL) & Master-Data-enriched fault cards",
      "Master Data Governance: Allow admins to add Geotab codes & set Severity with instant propagation across UI & Fabric",
    ],
    resilience:
      "Automatic WebSocket reconnect + state snapshot resync ensures dispatchers never view stale positions.",
  },
];

const GEOTAB_API_MATRIX = [
  {
    endpoint: "GetFeed (FaultData)",
    cadence: "Every 5s (Hot Stream)",
    fabricTarget: "Fabric Eventstream → Bronze + Hub Severity Engine",
    hubServing: "Redis Live Twin + PostgreSQL Alerts",
    consumer: "OBD-II Console, Live Map Alerts, Master Data Usage",
    notes: "Primary Geotab OBD-II & J1939 DTC stream (diagnostic.id, failureMode, faultState, count).",
  },
  {
    endpoint: "GetFeed (LogRecord)",
    cadence: "Every 2.5–5s (Hot Stream)",
    fabricTarget: "Fabric Eventstream → Bronze + Eventhouse (KQL)",
    hubServing: "Redis Live Twin → WebSocket Map Push",
    consumer: "Indonesia Live Map, Cargo Ops ETA, Corridor SLA",
    notes: "Live GPS lat/lng, speed km/h, and heading from Geotab GO9 GNSS.",
  },
  {
    endpoint: "GetFeed (StatusData)",
    cadence: "Every 5s (Hot Stream)",
    fabricTarget: "Fabric Eventstream → Eventhouse (KQL) + Silver",
    hubServing: "Hub BFF KQL Proxy + Redis Latest PIDs",
    consumer: "OBD Oscilloscope, PID Cards, DPD Soot Matrix",
    notes: "Engine RPM, coolant °C, DPD soot %, DEF %, battery V, fuel rail MPa, odometer.",
  },
  {
    endpoint: "Get (Diagnostic)",
    cadence: "Daily 02:00 WIB (Batch)",
    fabricTarget: "Fabric Data Factory → OneLake Silver Dim_Diagnostic",
    hubServing: "Hub Master Data Seeder (Preserves Severity)",
    consumer: "Master Data Page (OBD-II & DTC Codes Tab)",
    notes: "Auto-discovers new Geotab Diagnostic definitions while keeping HORUS Severity overrides intact.",
  },
  {
    endpoint: "Get (Device)",
    cadence: "Every 15 min (Batch)",
    fabricTarget: "Fabric Data Factory → Silver Dim_Vehicle_TNKB",
    hubServing: "PostgreSQL Vehicle Registry",
    consumer: "Isuzu Fleet, TNKB Plate Mapping, OBD Registration",
    notes: "Links Geotab GO9 DeviceId & serial number to Isuzu VIN, TNKB Plat Nomor, and series.",
  },
  {
    endpoint: "GetFeed (ExceptionEvent)",
    cadence: "Every 15s (Warm Stream)",
    fabricTarget: "Fabric Eventstream → Silver/Gold Warehouse",
    hubServing: "Hub BFF Fabric SQL Proxy",
    consumer: "HO Analytics (Driver Eco-Driving & Idle Fuel Waste)",
    notes: "Feeds harsh braking, excessive idling (> 5m), speeding, and geofence rule breaches.",
  },
  {
    endpoint: "Get (Zone) + ERP Costs",
    cadence: "Hourly / Daily (Batch)",
    fabricTarget: "Fabric Data Factory → Gold Fact_Fuel_CPK & Dim_Hub",
    hubServing: "PostGIS Hub Geofences + Fabric SQL Endpoint",
    consumer: "Live Map Geofences, HO Cost vs Budget & Branch P&L",
    notes: "Unifies MyGeotab Zones with ERP fuel, toll/ferry, and shipment revenue data for CPK & Margin.",
  },
];

const GEOTAB_DIAGNOSTIC_MAP: Record<
  string,
  { geotabDiagnosticId: string; controller: string; sourceProtocol: string }
> = {
  P2002: {
    geotabDiagnosticId: "DiagnosticDieselParticulateFilterEfficiencyId",
    controller: "ControllerEngine1Id (J1939)",
    sourceProtocol: "J1939 SPN 3251 / FMI 0",
  },
  P0401: {
    geotabDiagnosticId: "DiagnosticEgrFlowInsufficientId",
    controller: "ControllerEngine1Id (J1939)",
    sourceProtocol: "J1939 SPN 27 / FMI 18",
  },
  P0087: {
    geotabDiagnosticId: "DiagnosticFuelRailPressureTooLowId",
    controller: "ControllerEngine1Id (J1939)",
    sourceProtocol: "J1939 SPN 157 / FMI 1",
  },
  P0299: {
    geotabDiagnosticId: "DiagnosticTurbochargerUnderboostId",
    controller: "ControllerEngine1Id (J1939)",
    sourceProtocol: "J1939 SPN 102 / FMI 18",
  },
  P20EE: {
    geotabDiagnosticId: "DiagnosticScrNoxCatalystEfficiencyId",
    controller: "ControllerAftertreatment1Id",
    sourceProtocol: "J1939 SPN 4364 / FMI 18",
  },
  U0100: {
    geotabDiagnosticId: "DiagnosticLostCommunicationWithEcmId",
    controller: "ControllerJ1939BusId",
    sourceProtocol: "J1939 SPN 639 / FMI 2",
  },
  P0118: {
    geotabDiagnosticId: "DiagnosticEngineCoolantTempHighInputId",
    controller: "ControllerEngine1Id (OBD-II)",
    sourceProtocol: "J1939 SPN 110 / FMI 3",
  },
  P0562: {
    geotabDiagnosticId: "DiagnosticSystemVoltageLowId",
    controller: "ControllerVehicleBodyId",
    sourceProtocol: "J1939 SPN 168 / FMI 1",
  },
};

const PAYLOAD_SAMPLES: Record<
  PayloadSampleKey,
  { label: string; endpoint: string; geotabRaw: string; horusNormalized: string }
> = {
  faultData: {
    label: "FaultData (OBD DTC)",
    endpoint:
      'MyGeotab GetFeed("FaultData") → Fabric Eventstream → HORUS Hub App Severity Engine → Dashboard WSS',
    geotabRaw: `{
  "id": "b7A92F10E4",
  "device": { "id": "b14", "serialNumber": "G9-ISZ-88118" },
  "diagnostic": {
    "id": "DiagnosticDieselParticulateFilterEfficiencyId",
    "code": 3251,
    "source": "SourceJ1939Id"
  },
  "controller": { "id": "ControllerEngine1Id" },
  "failureMode": { "id": "FailureModeDataValidAboveNormalMostSevereId", "code": 0 },
  "faultState": "Active",
  "count": 3,
  "dateTime": "2026-11-26T04:08:12.000Z"
}`,
    horusNormalized: `{
  "eventId": "evt_98f2c1a4",
  "source": "GEOTAB_GO9 -> FABRIC_EVENTSTREAM",
  "fabricLineage": {
    "bronzeTable": "onelake.bronze_geotab_faults",
    "warehouseFact": "fabric_dw.gold.Fact_OBD_Faults"
  },
  "hubEnrichment": {
    "truckId": "ISZ-118",
    "tnkbPlate": "L 8719 UBA",
    "obdCode": "P2002",
    "j1939": "SPN 3251 · FMI 0",
    "masterSeverity": "Critical",
    "drivablePolicy": "Pull Over / Immediate Service",
    "channels": ["WSS_DASHBOARD", "HO_BANNER", "WHATSAPP_OPS"]
  }
}`,
  },
  statusData: {
    label: "StatusData (Live ECU PID)",
    endpoint:
      'MyGeotab GetFeed("StatusData") → Fabric Eventstream → Fabric Eventhouse (KQL) & Hub Redis → OBD Oscilloscope',
    geotabRaw: `{
  "id": "b9C44102A1",
  "device": { "id": "b11", "serialNumber": "G9-ISZ-88204" },
  "diagnostic": { "id": "DiagnosticEngineSpeedId" },
  "data": 1680.0,
  "dateTime": "2026-11-26T04:10:02.000Z"
}
// Paired batch PIDs: CoolantTempC=89, DpfSootPct=64, FuelRailMpa=132`,
    horusNormalized: `{
  "truckId": "ISZ-204",
  "tnkbPlate": "B 9482 KXU",
  "timestampWib": "11:10:02 WIB",
  "pids": {
    "rpm": 1680,
    "coolantTempC": 89,
    "dpfSootPct": 64,
    "fuelRailMpa": 132,
    "boostKpa": 148,
    "batteryVolts": 27.6
  },
  "storageTargets": [
    "FABRIC_EVENTHOUSE_KQL (90d Oscilloscope)",
    "HUB_REDIS_LIVE_TWIN (Instant Dashboard)"
  ]
}`,
  },
  logRecord: {
    label: "LogRecord (Live GPS)",
    endpoint:
      'MyGeotab GetFeed("LogRecord") → Fabric Eventstream → Hub Redis Live Twin & OneLake → Indonesia Leaflet Map',
    geotabRaw: `{
  "id": "bF10293847",
  "device": { "id": "b11", "serialNumber": "G9-ISZ-88204" },
  "latitude": -6.3712,
  "longitude": 107.4628,
  "speed": 74.0,
  "dateTime": "2026-11-26T04:10:05.000Z"
}`,
    horusNormalized: `{
  "truckId": "ISZ-204",
  "tnkbPlate": "B 9482 KXU",
  "gps": {
    "lat": -6.3712,
    "lng": 107.4628,
    "speedKmh": 74,
    "headingDeg": 108,
    "corridor": "Tol Cipali KM 102 · Subang, Jabar"
  },
  "geofenceMatch": "IN_CORRIDOR_JKT_SBY",
  "fabricBronzeArchived": true,
  "hubWebsocketBroadcast": true
}`,
  },
};

const RESILIENCE_MATRIX = [
  {
    scenario: "MyGeotab API Rate Limit (HTTP 429 / OverLimitException)",
    impact: "Delayed GetFeed polling cycle",
    mitigation:
      "Batch GetFeed() calls (up to 50k rows/call), enforce jittered exponential backoff, and keep separate Redis watermarks per feed type.",
    recovery: "Auto-resumes from last fromVersion cursor into Fabric Eventstream with 0 lost events.",
  },
  {
    scenario: "Cellular Dead Zone (Trans-Sumatra / Kalimantan Corridor)",
    impact: "Temporary live map signal silence",
    mitigation:
      "Geotab GO9 buffers up to 80k records in flash. Hub App marks unit as 'Signal Lag > 5m' while keeping last known coordinate.",
    recovery: "On LTE reconnect, GO9 bursts logs; Fabric Eventstream & Silver Spark deduplicate & reorder chronologically.",
  },
  {
    scenario: "Unknown / Unmapped Geotab DiagnosticId Received",
    impact: "New Isuzu ECU code lacks HORUS Master Severity",
    mitigation:
      "Hub App Severity Engine auto-classifies as default 'Advisory', saves to Master Data review queue, and logs raw Geotab DiagnosticId in OneLake Bronze.",
    recovery: "Admin sets Critical/Warning/Advisory in HORUS Master Data → hot-reloads Hub App & mirrors to Fabric Silver/Gold.",
  },
  {
    scenario: "Microsoft Fabric Warehouse High Concurrency / Refresh Spike",
    impact: "Potential slowdown on HO Executive Analytics queries",
    mitigation:
      "HORUS Hub App BFF uses Redis stale-while-revalidate caching (30s–5m) + Fabric F-SKU autoscale burst smoothing.",
    recovery: "Live Operations (Map, Cargo Bay, OBD Alerts) remain 100% unaffected because they run on Hub App OLTP + Redis.",
  },
  {
    scenario: "HORUS WebSocket Disconnect on Operator Browser",
    impact: "Live map & oscilloscope pause momentarily",
    mitigation:
      "Dashboard executes exponential WSS reconnect and pulls instant Redis state snapshot via Hub App REST GET /api/v1/fleet/live.",
    recovery: "UI resyncs live positions, KPIs, and latest Master Data severities within 2 seconds.",
  },
];

const RBAC_ROLES = [
  {
    role: "Head Office (HO) Executive",
    scope: "National (All Indonesia)",
    permissions: "Read-only Live Map, Fabric-backed HO Analytics (CPK/OTIF/MTBF), Export Executive CSV, View HLD",
    masterDataAccess: "View Only",
  },
  {
    role: "Master Data Governance Admin",
    scope: "Global Dictionary & Hubs",
    permissions: "Full CRUD on Geotab/OBD Codes, Custom Severity Assignment (syncs to Fabric OneLake), Hub Geofences",
    masterDataAccess: "Full CRUD + Publish",
  },
  {
    role: "Regional Fleet Dispatcher",
    scope: "Assigned Corridor / Branch",
    permissions: "Cargo Bay Loading, Driver Cab Chat & Voice, Route Edits, Live Map Tracking (Hub App OLTP)",
    masterDataAccess: "View Only",
  },
  {
    role: "Isuzu Workshop / Mechanic",
    scope: "Regional Service Bay",
    permissions: "OBD-II Console, Run ECU Scan, Trigger Parked DPD Regen, Log/Clear DTC Service Tickets",
    masterDataAccess: "Propose Meaning / Fix",
  },
];

export function HldArchitectureView() {
  const { obdCatalog, hubCatalog, trucks, setActivePage, pushToast } = useHaulTrack();

  const [activeTab, setActiveTab] = useState<HldTab>("architecture");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("fabric-warehouse");
  const [payloadKey, setPayloadKey] = useState<PayloadSampleKey>("faultData");
  const [apiPage, setApiPage] = useState(1);
  const [apiPageSize, setApiPageSize] = useState(5);
  const [codeSearch, setCodeSearch] = useState("");
  const [codePage, setCodePage] = useState(1);
  const [codePageSize, setCodePageSize] = useState(5);

  const selectedSpec =
    ARCH_COMPONENTS.find((c) => c.id === selectedNodeId) ?? ARCH_COMPONENTS[0];

  const severityCounts = useMemo(
    () => ({
      critical: obdCatalog.filter((c) => c.severity === "Critical").length,
      warning: obdCatalog.filter((c) => c.severity === "Warning").length,
      advisory: obdCatalog.filter((c) => c.severity === "Advisory").length,
    }),
    [obdCatalog]
  );

  const filteredCodeMappings = useMemo(() => {
    const q = codeSearch.trim().toLowerCase();
    return obdCatalog.filter((c) => {
      if (!q) return true;
      const geo = GEOTAB_DIAGNOSTIC_MAP[c.code.toUpperCase()];
      return (
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.severity.toLowerCase().includes(q) ||
        (geo?.geotabDiagnosticId.toLowerCase().includes(q) ?? false) ||
        (c.j1939Spn?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [obdCatalog, codeSearch]);

  const safeApiPage = Math.min(
    apiPage,
    Math.max(1, Math.ceil(GEOTAB_API_MATRIX.length / apiPageSize))
  );
  const paginatedApis = GEOTAB_API_MATRIX.slice(
    (safeApiPage - 1) * apiPageSize,
    safeApiPage * apiPageSize
  );

  const safeCodePage = Math.min(
    codePage,
    Math.max(1, Math.ceil(filteredCodeMappings.length / codePageSize))
  );
  const paginatedCodeMappings = filteredCodeMappings.slice(
    (safeCodePage - 1) * codePageSize,
    safeCodePage * codePageSize
  );

  const handleExportHldMarkdown = () => {
    const codeRows = obdCatalog
      .map((c) => {
        const geo = GEOTAB_DIAGNOSTIC_MAP[c.code.toUpperCase()];
        return `| ${c.code} | ${geo?.geotabDiagnosticId ?? `DiagnosticCustom_${c.code}`} | ${
          c.j1939Spn ?? "OBD-II Standard"
        } | ${c.subsystem} | **${c.severity}** | ${c.drivableStatus} |`;
      })
      .join("\n");

    const md = `# HORUS × Geotab × Microsoft Fabric — High-Level Design (HLD)
Version: 2.1 (Microsoft Fabric + HORUS Hub App Edition)
Fleet Scope: PT Isuzu Astra Motor Indonesia (${trucks.length} Active Units / 5,000+ Target Scale)

## 1. Architect POV: How Data Flows from Geotab to HORUS Dashboard
1. **Hot Real-Time Path (< 3s)**: Isuzu ECU → Geotab GO9 → MyGeotab \`GetFeed\` → **Microsoft Fabric Eventstream** → **HORUS Hub App (Master Severity Engine + Redis Live Twin + WebSocket)** → Live Indonesia Map & OBD-II Console.
2. **Microsoft Fabric Data Warehouse Path (HO Analytics)**: MyGeotab + ERP/Fuel → **Fabric Eventstream & Data Factory** → **OneLake Medallion (Bronze → Silver → Gold)** → **Fabric Eventhouse (KQL)** & **Fabric Data Warehouse (T-SQL)** → **HORUS Hub App API Proxy** → HO Executive Analytics (CPK, OTIF, MTBF, P&L).
3. **Master Data Governance Loop**: Admin edits Severity in **HORUS Master Data UI** → **HORUS Hub App PostgreSQL + Redis** (instant re-scoring of live alerts) → **OneLake Mirroring / Shortcut** → Fabric Silver & Gold tables stay 100% synchronized.

\`\`\`mermaid
flowchart LR
  ECU[Isuzu ECU\\nOBD-II / J1939] --> GO9[Geotab GO9/GO9+\\n4G LTE + GNSS]
  GO9 --> MG[MyGeotab Cloud\\nAPI v1 GetFeed]
  MG -->|Hot 3s Stream| FES[Microsoft Fabric\\nEventstream]
  MG -->|Batch Reference| FDF[Microsoft Fabric\\nData Factory]
  FES --> OL[(Fabric OneLake\\nBronze -> Silver -> Gold)]
  FDF --> OL
  OL --> FEH[(Fabric Eventhouse\\nKQL Time-Series)]
  OL --> FDW[(Fabric Data Warehouse\\nGold T-SQL)]
  FES -->|Real-Time Faults & GPS| SEV[HORUS Hub App\\nSeverity Rules Engine]
  SEV --> OLTP[(Hub App OLTP\\nPostgreSQL + Redis Twin)]
  OLTP -.->|OneLake Mirroring\\nMaster Severity Rules| OL
  FDW -->|SQL Analytics API| BFF[HORUS Hub App\\nUnified API & WSS Gateway]
  FEH -->|KQL Query API| BFF
  OLTP --> BFF
  BFF -->|REST + Real-Time WSS| UI[HORUS Dashboard\\nMap · OBD · Master Data · HO Analytics]
\`\`\`

## 2. Geotab & Microsoft Fabric Ingestion Matrix
| Geotab Feed / Entity | Cadence | Microsoft Fabric Target | HORUS Hub App Serving |
|---|---|---|---|
${GEOTAB_API_MATRIX.map((r) => `| ${r.endpoint} | ${r.cadence} | ${r.fabricTarget} | ${r.hubServing} |`).join("\n")}

## 3. Live Geotab Diagnostic → HORUS Master Severity Mapping (${obdCatalog.length} Codes)
| OBD Code | Geotab DiagnosticId | J1939 / Protocol | Subsystem | HORUS Severity | Policy |
|---|---|---|---|---|---|
${codeRows}
`;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "HORUS-Geotab-Fabric-HubApp-HLD-v2.1.md";
    link.click();
    URL.revokeObjectURL(url);

    pushToast({
      title: "HLD Specification Exported",
      description: `Downloaded HORUS-Geotab-Fabric-HubApp-HLD-v2.1.md with Mermaid blueprint & ${obdCatalog.length} code mappings.`,
      variant: "success",
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white dark:bg-white dark:text-zinc-950">
              <Network className="h-3 w-3" />
              High-Level Design (HLD)
            </span>
            <span className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300">
              Source: Geotab GO9 / MyGeotab
            </span>
            <span className="rounded-lg border border-teal-500/35 bg-teal-500/10 px-2.5 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300">
              DWH: Microsoft Fabric
            </span>
            <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              Middleware: HORUS Hub App
            </span>
          </div>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
            HORUS × Geotab × Microsoft Fabric Architecture (HLD)
          </h1>
          <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
            End-to-end solution architecture explaining how{" "}
            <TermTooltip termKey="OBD" showIcon={false}>Isuzu ECU</TermTooltip> telemetry flows from{" "}
            <strong>Geotab</strong> into <strong>Microsoft Fabric Data Warehouse</strong> &amp;{" "}
            <strong>HORUS Hub App</strong> until live GPS, OBD-II severities, and HO Analytics
            appear on the dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setActivePage("master-data")}
            className="h-11 rounded-2xl px-4 text-xs font-semibold"
          >
            <Sliders className="h-4 w-4 text-red-600" />
            Master Data Severity Rules
          </Button>
          <Button onClick={handleExportHldMarkdown} className="h-11 rounded-2xl px-5 text-xs font-semibold">
            <Download className="h-4 w-4" />
            Export HLD (.md)
          </Button>
        </div>
      </div>

      {/* Executive Architecture KPI Strip */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Card className="border-sky-500/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Telematics Source</span>
            <Cloud className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-foreground">Geotab GO9 / API v1</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Incremental <code className="font-mono text-[10.5px]">GetFeed</code> (Fault, PID, GPS)
          </p>
        </Card>

        <Card className="border-teal-500/35 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Data Warehouse &amp; Lake</span>
            <Warehouse className="h-4 w-4 text-teal-600" />
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-foreground">Microsoft Fabric</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            OneLake Medallion · Eventhouse · Warehouse
          </p>
        </Card>

        <Card className="border-red-500/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Operational Middleware</span>
            <Zap className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-foreground">HORUS Hub App</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {obdCatalog.length} Rules (
            <span className="font-bold text-red-600 dark:text-red-400">
              {severityCounts.critical} Crit
            </span>{" "}
            ·{" "}
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {severityCounts.warning} Warn
            </span>
            ) · &lt; 3s WSS
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Target Fleet Scale &amp; SLA</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-foreground tabular-nums">
            5,000+ Units · 99.9%
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {hubCatalog.length} Indonesian hubs · Multi-AZ resilient
          </p>
        </Card>
      </div>

      {/* HLD Domain Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {(
          [
            { id: "architecture", label: "1. Visual HLD Blueprint & Architect POV", icon: Layers },
            { id: "pipeline", label: "2. Geotab → Fabric → Hub Pipeline", icon: GitBranch },
            {
              id: "geotab-mapping",
              label: `3. Geotab & Fabric Mapping (${obdCatalog.length})`,
              icon: Code2,
            },
            { id: "nfr-security", label: "4. NFRs, Security & Resilience", icon: Lock },
          ] as Array<{
            id: HldTab;
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

      {/* TAB 1: FULL VISUAL HLD DIAGRAM + ARCHITECT POV + COMPONENT SPEC */}
      {activeTab === "architecture" && (
        <div className="animate-page-enter space-y-5">
          {/* Full Visual Blueprint Diagram Card */}
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  Visual High-Level Design Diagram (Geotab → Microsoft Fabric → HORUS Hub App →
                  Dashboard)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Interactive enterprise architecture diagram showing both the{" "}
                  <strong>Real-Time Hot Path</strong> and the{" "}
                  <strong>Microsoft Fabric Data Warehouse Analytical Path</strong>. Exportable as
                  high-res PNG or SVG for presentations.
                </p>
              </div>
              <Badge variant="outline">Interactive Blueprint</Badge>
            </div>

            <HorusFabricHldDiagram
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              totalMasterCodes={obdCatalog.length}
              criticalCount={severityCounts.critical}
              onExportSuccess={(fmt) =>
                pushToast({
                  title: `HLD Diagram Exported (${fmt})`,
                  description: `Downloaded HORUS-Geotab-Fabric-HubApp-HLD.${fmt.toLowerCase()}.`,
                  variant: "success",
                })
              }
            />
          </Card>

          {/* Principal Architect POV: 3-Path Explanation of How Data Reaches the Dashboard */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-t-4 border-t-red-600 p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-red-700 dark:text-red-400">
                <Flame className="h-4 w-4" />
                Path A · Real-Time Hot Path (&lt; 3 sec)
              </div>
              <h3 className="mt-1.5 text-sm font-extrabold text-foreground">
                How Live Map, Speed &amp; OBD Alerts Appear Instantly
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                <strong>Geotab GO9</strong> pushes CAN-Bus faults &amp; GPS to{" "}
                <strong>MyGeotab</strong>, polled every 2.5–5s into{" "}
                <strong>Fabric Eventstream</strong>. Eventstream forwards live events straight to{" "}
                <strong>HORUS Hub App</strong>, which joins Master Severity in{" "}
                <strong>&lt; 20ms</strong>, updates <strong>Redis Live Twin</strong>, and broadcasts
                via <strong>WebSocket</strong> to the Map &amp; OBD Console.
              </p>
            </Card>

            <Card className="border-t-4 border-t-teal-600 p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-teal-700 dark:text-teal-400">
                <Warehouse className="h-4 w-4" />
                Path B · Microsoft Fabric Data Warehouse Path
              </div>
              <h3 className="mt-1.5 text-sm font-extrabold text-foreground">
                Why Fabric Powers HO Executive Analytics &amp; Oscilloscope
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Raw Geotab streams + ERP fuel/toll data land in{" "}
                <strong>Fabric OneLake (Bronze)</strong>, get cleansed &amp; joined with TNKB +
                Master Severities in <strong>Silver</strong>, and aggregated in{" "}
                <strong>Fabric Data Warehouse (Gold T-SQL)</strong> &amp;{" "}
                <strong>Eventhouse (KQL)</strong>. The <strong>HORUS Hub App BFF</strong> queries
                Fabric to display CPK, OTIF, MTBF, and 90-day PID curves without slowing live ops.
              </p>
            </Card>

            <Card className="border-t-4 border-t-amber-500 p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-700 dark:text-amber-400">
                <RefreshCw className="h-4 w-4" />
                Path C · HORUS Hub App &amp; Master Data Loop
              </div>
              <h3 className="mt-1.5 text-sm font-extrabold text-foreground">
                Why a Dedicated Hub App Sits Between Fabric &amp; UI
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                A Data Warehouse is built for OLAP analytics, not transactional writes.{" "}
                <strong>HORUS Hub App</strong> owns low-latency CRUD (Master Data Severity edits,
                3×6 Cargo Bay loading, Driver Cab Chat) in <strong>PostgreSQL + Redis</strong>,
                hot-reloads live alert scoring in &lt; 1s, and mirrors Master Data back to{" "}
                <strong>Fabric OneLake</strong> so HO Analytics stays 100% consistent.
              </p>
            </Card>
          </div>

          {/* Inline Selected Architecture Component Inspector (No Modal) */}
          <Card className="border-l-4 border-l-red-600 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3.5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="express">{selectedSpec.layer}</Badge>
                  <Badge variant="outline">{selectedSpec.badge}</Badge>
                </div>
                <h3 className="mt-2 text-lg font-extrabold text-foreground">
                  {selectedSpec.name}
                </h3>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                  {selectedSpec.summary}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target SLA / Throughput
                </p>
                <p className="mt-0.5 font-extrabold text-foreground">{selectedSpec.sla}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-3 rounded-xl border border-border/80 bg-background/60 p-3.5 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Protocol / Interface
                  </p>
                  <p className="mt-0.5 font-semibold text-foreground">{selectedSpec.protocol}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Recommended Tech Stack
                  </p>
                  <p className="mt-0.5 font-semibold text-foreground">{selectedSpec.techStack}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Geotab / Fabric / HORUS Objects
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold text-red-700 dark:text-red-300">
                    {selectedSpec.geotabObjects}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Key Architectural Responsibilities
                </p>
                <ul className="mt-2 space-y-2 text-foreground">
                  {selectedSpec.responsibilities.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 leading-relaxed">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-amber-500/35 bg-amber-500/[0.05] p-3.5 text-xs">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Resilience &amp; Fault Handling
                </p>
                <p className="mt-2 leading-relaxed text-foreground">{selectedSpec.resilience}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: GEOTAB -> FABRIC -> HUB APP PIPELINE & PAYLOADS */}
      {activeTab === "pipeline" && (
        <div className="animate-page-enter space-y-5">
          {/* 6-Step Fault & Severity Processing Sequence */}
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  End-to-End Sequence: Geotab Fault → Microsoft Fabric → HORUS Hub App → Dashboard
                </h2>
                <p className="text-xs text-muted-foreground">
                  Step-by-step latency budget showing how a real fault code reaches both the live
                  command screen (&lt; 3s) and Microsoft Fabric Data Warehouse.
                </p>
              </div>
              <Badge variant="express">Hot Path Budget: ~1.5s – 2.8s</Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              {[
                {
                  step: "01",
                  title: "Isuzu ECU & GO9",
                  latency: "~450 ms",
                  actor: "Geotab GO9+ LTE",
                  detail:
                    "Reads J1939 SPN 3251 / FMI 0 (P2002) + GPS coords from truck CAN-Bus and transmits encrypted to MyGeotab.",
                  accent: "border-t-sky-600",
                },
                {
                  step: "02",
                  title: "MyGeotab GetFeed",
                  latency: "~500 ms",
                  actor: "Geotab Poller",
                  detail:
                    "Pulls incremental FaultData, LogRecord, and StatusData deltas using watermark fromVersion cursor.",
                  accent: "border-t-sky-500",
                },
                {
                  step: "03",
                  title: "Fabric Eventstream",
                  latency: "~200 ms",
                  actor: "Microsoft Fabric",
                  detail:
                    "Ingests raw stream, tees copy to OneLake Bronze & Eventhouse (KQL), and pushes hot event to Hub App.",
                  accent: "border-t-teal-600",
                },
                {
                  step: "04",
                  title: "Hub Severity Engine",
                  latency: "~20 ms",
                  actor: "HORUS Hub App",
                  detail:
                    "Normalizes DiagnosticId → P2002, maps DeviceId → TNKB Plate, and joins Admin Severity from Redis cache.",
                  accent: "border-t-red-600",
                },
                {
                  step: "05",
                  title: "Fabric Silver / Gold",
                  latency: "Near-RT / 5m",
                  actor: "Fabric Warehouse",
                  detail:
                    "Spark & T-SQL materialize Fact_OBD_Faults, CPK, and Downtime Risk (Rp Jt) using mirrored Master Severity.",
                  accent: "border-t-teal-700",
                },
                {
                  step: "06",
                  title: "Dashboard & Alerts",
                  latency: "~150 ms",
                  actor: "Hub WSS + UI",
                  detail:
                    "Hub App pushes live Map pin + OBD badge over WebSocket, serves HO Analytics via SQL proxy, and fires WhatsApp.",
                  accent: "border-t-emerald-600",
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border border-border border-t-4 bg-background/60 p-3.5",
                    s.accent
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-red-600 dark:text-red-400">
                        STEP {s.step}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {s.latency}
                      </span>
                    </div>
                    <h3 className="mt-2 text-xs font-extrabold text-foreground">{s.title}</h3>
                    <p className="text-[10.5px] font-semibold text-red-700 dark:text-red-300">
                      {s.actor}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      {s.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Interactive Geotab Raw JSON -> HORUS + Fabric Enriched Schema Viewer */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  Geotab Raw API Payload → Fabric &amp; HORUS Hub App Event Contract
                </h2>
                <p className="text-xs text-muted-foreground">
                  Inspect how raw MyGeotab JSON objects are enriched with Fabric lineage, Indonesian
                  TNKB identity, and HORUS Master Data severity.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.keys(PAYLOAD_SAMPLES) as PayloadSampleKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPayloadKey(key)}
                    className={cn(
                      "cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                      payloadKey === key
                        ? "border-red-600 bg-red-600 text-white shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {PAYLOAD_SAMPLES[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border/80 bg-muted/40 px-3.5 py-2 font-mono text-[11px] text-muted-foreground">
              {PAYLOAD_SAMPLES[payloadKey].endpoint}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div
                style={{ backgroundColor: "#0b1320", color: "#e0f2fe" }}
                className="overflow-hidden rounded-2xl border border-sky-500/40 shadow-sm"
              >
                <div
                  style={{ backgroundColor: "#0f223a" }}
                  className="flex items-center justify-between border-b border-sky-400/20 px-4 py-2.5 text-xs"
                >
                  <span className="font-bold text-sky-300">
                    1. Inbound MyGeotab API v1 Payload
                  </span>
                  <span className="font-mono text-[10px] text-sky-200">JSON-RPC Response</span>
                </div>
                <pre
                  style={{ backgroundColor: "#0b1320", color: "#e0f2fe" }}
                  className="max-h-[340px] overflow-auto p-4 font-mono text-[11.5px] leading-relaxed"
                >
                  {PAYLOAD_SAMPLES[payloadKey].geotabRaw}
                </pre>
              </div>

              <div
                style={{ backgroundColor: "#1a090c", color: "#ffe4e6" }}
                className="overflow-hidden rounded-2xl border border-red-500/40 shadow-sm"
              >
                <div
                  style={{ backgroundColor: "#3a0e16" }}
                  className="flex items-center justify-between border-b border-red-400/20 px-4 py-2.5 text-xs"
                >
                  <span className="font-bold text-red-200">
                    2. Enriched HORUS Hub App Event (Fabric + Master Severity)
                  </span>
                  <span className="font-mono text-[10px] text-red-200">Hub App WSS + OneLake</span>
                </div>
                <pre
                  style={{ backgroundColor: "#1a090c", color: "#ffe4e6" }}
                  className="max-h-[340px] overflow-auto p-4 font-mono text-[11.5px] leading-relaxed"
                >
                  {PAYLOAD_SAMPLES[payloadKey].horusNormalized}
                </pre>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: GEOTAB & FABRIC DATA MAPPING */}
      {activeTab === "geotab-mapping" && (
        <div className="animate-page-enter space-y-5">
          {/* Table 1: MyGeotab -> Fabric -> Hub App Integration Matrix */}
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  Geotab → Microsoft Fabric → HORUS Hub App Feed Matrix
                </h2>
                <p className="text-xs text-muted-foreground">
                  Maps every MyGeotab feed to its Microsoft Fabric landing zone (Eventstream / Data
                  Factory / Warehouse) and HORUS Hub App serving tier.
                </p>
              </div>
              <Badge variant="outline">7 Geotab &amp; ERP Feeds</Badge>
            </div>

            <div className="max-h-[340px] overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[920px] text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3">Geotab Feed / Source</th>
                    <th className="px-4 py-3">Cadence</th>
                    <th className="px-4 py-3">Microsoft Fabric Target</th>
                    <th className="px-4 py-3">HORUS Hub App Serving</th>
                    <th className="px-4 py-3">Dashboard Modules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedApis.map((api) => (
                    <tr key={api.endpoint} className="hover:bg-muted/30">
                      <td className="px-4 py-3 align-top">
                        <p className="font-mono font-extrabold text-sky-700 dark:text-sky-300">
                          {api.endpoint}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-muted-foreground">{api.notes}</p>
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-foreground whitespace-nowrap">
                        {api.cadence}
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-teal-700 dark:text-teal-300">
                        {api.fabricTarget}
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-foreground">
                        {api.hubServing}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">{api.consumer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={safeApiPage}
              pageSize={apiPageSize}
              totalItems={GEOTAB_API_MATRIX.length}
              onPageChange={setApiPage}
              onPageSizeChange={setApiPageSize}
              pageSizeOptions={[5, 10]}
            />
          </Card>

          {/* Table 2: Live Synced Geotab Diagnostic -> HORUS Master Severity Table */}
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  Live Geotab DiagnosticId → HORUS Master Severity Mapping ({obdCatalog.length}{" "}
                  Codes)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Live-synced from <strong>HORUS Master Data</strong> and mirrored to{" "}
                  <strong>Microsoft Fabric OneLake Silver</strong>. Editing any severity updates
                  both live alerts and Fabric Gold warehouse rollups.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={codeSearch}
                    onChange={(e) => {
                      setCodeSearch(e.target.value);
                      setCodePage(1);
                    }}
                    placeholder="Filter code, Geotab ID, severity..."
                    className="pl-8 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActivePage("master-data")}
                  className="h-9 rounded-xl px-3 text-xs font-semibold"
                >
                  Edit Severities
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3">HORUS Code</th>
                    <th className="px-4 py-3">Geotab DiagnosticId (Source)</th>
                    <th className="px-4 py-3">Controller / J1939</th>
                    <th className="px-4 py-3">Live HORUS Severity</th>
                    <th className="px-4 py-3">Hub App Escalation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedCodeMappings.map((c) => {
                    const geo = GEOTAB_DIAGNOSTIC_MAP[c.code.toUpperCase()];
                    const escalation =
                      c.severity === "Critical"
                        ? "Immediate HO Banner + Red Map Pin + WhatsApp/SMS Ops + Workshop Ticket"
                        : c.severity === "Warning"
                        ? "Amber Map Alert + 24h Service Queue + Regional Ops Notification"
                        : "Logged to Fabric Eventhouse + Next Scheduled PM Service Digest";

                    return (
                      <tr key={c.code} className="hover:bg-muted/30">
                        <td className="px-4 py-3 align-top">
                          <span className="inline-block rounded-lg bg-red-600 px-2.5 py-0.5 font-mono text-xs font-extrabold text-white">
                            {c.code}
                          </span>
                          <p className="mt-1 text-[11px] font-semibold text-foreground">
                            {c.subsystem}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-mono text-[11px] font-bold text-sky-700 dark:text-sky-300">
                            {geo?.geotabDiagnosticId ?? `DiagnosticCustom_${c.code}Id`}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{c.title}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-mono text-[11px] font-semibold text-foreground">
                            {geo?.controller ?? "ControllerEngine1Id (OBD-II)"}
                          </p>
                          <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                            {c.j1939Spn ?? geo?.sourceProtocol ?? "ISO 15765-4 OBD-II"}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Badge
                            variant={
                              c.severity === "Critical"
                                ? "destructive"
                                : c.severity === "Warning"
                                ? "warning"
                                : "standard"
                            }
                          >
                            {c.severity}
                          </Badge>
                          <p className="mt-1 text-[10.5px] text-muted-foreground">
                            {c.drivableStatus}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top text-[11px] leading-relaxed text-muted-foreground">
                          <span className="inline-flex items-start gap-1.5">
                            <BellRing
                              className={cn(
                                "mt-0.5 h-3.5 w-3.5 shrink-0",
                                c.severity === "Critical"
                                  ? "text-red-600"
                                  : c.severity === "Warning"
                                  ? "text-amber-500"
                                  : "text-sky-600"
                              )}
                            />
                            {escalation}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={safeCodePage}
              pageSize={codePageSize}
              totalItems={filteredCodeMappings.length}
              onPageChange={setCodePage}
              onPageSizeChange={setCodePageSize}
              pageSizeOptions={[5, 10, 20]}
            />
          </Card>
        </div>
      )}

      {/* TAB 4: NFRs, SECURITY & RESILIENCE */}
      {activeTab === "nfr-security" && (
        <div className="animate-page-enter space-y-5">
          {/* NFR Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Availability & Isolation",
                value: "99.9% SLA",
                desc: "Hub App OLTP/Redis runs isolated from Microsoft Fabric Warehouse so live map & OBD dispatch stay 100% up during heavy BI refreshes.",
                icon: ShieldCheck,
              },
              {
                title: "Throughput & Scaling",
                value: "2,000+ msg/sec",
                desc: "Fabric Eventstream + F-SKU autoscale handles 5,000+ Geotab GO9 trucks at 2.5–5s intervals with 5× reconnect-storm headroom.",
                icon: Activity,
              },
              {
                title: "OneLake Retention",
                value: "90d KQL / 3yr Delta",
                desc: "90 days sub-second hot cache in Fabric Eventhouse; 3-year compressed OneLake Delta archive for Astra Isuzu warranty & compliance.",
                icon: Database,
              },
              {
                title: "Security & Governance",
                value: "Entra ID + Purview",
                desc: "TLS 1.3, AES-256, Azure Key Vault for MyGeotab credentials, OneLake RBAC, Microsoft Purview data lineage & Master Data audit trail.",
                icon: Lock,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold">{item.title}</span>
                    <Icon className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="mt-2 text-lg font-extrabold text-foreground">{item.value}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* RBAC Governance Table */}
          <Card className="p-5">
            <h2 className="text-base font-extrabold text-foreground">
              Role-Based Access Control (Entra ID RBAC) &amp; Master Data Governance
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Unified identity across HORUS Hub App and Microsoft Fabric ensures only Master Data
              Admins publish severity overrides.
            </p>
            <div className="max-h-[300px] overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[740px] text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Data Scope</th>
                    <th className="px-4 py-3">HORUS &amp; Fabric Permissions</th>
                    <th className="px-4 py-3 text-right">Master Data Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {RBAC_ROLES.map((r) => (
                    <tr key={r.role} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-extrabold text-foreground">{r.role}</td>
                      <td className="px-4 py-3 font-semibold text-muted-foreground">{r.scope}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.permissions}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant={
                            r.masterDataAccess.includes("Full CRUD") ? "destructive" : "secondary"
                          }
                        >
                          {r.masterDataAccess}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Failure Modes & Resilience Matrix */}
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  Geotab × Fabric × Hub App Failure Modes &amp; Resilience Runbook
                </h2>
                <p className="text-xs text-muted-foreground">
                  Production safeguards preventing telemetry loss, warehouse bottlenecks, or stale
                  fleet alerts across Indonesian corridors.
                </p>
              </div>
            </div>

            <div className="max-h-[340px] overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3">Failure Scenario</th>
                    <th className="px-4 py-3">Operational Impact</th>
                    <th className="px-4 py-3">Architectural Mitigation</th>
                    <th className="px-4 py-3">Recovery Behavior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {RESILIENCE_MATRIX.map((row) => (
                    <tr key={row.scenario} className="hover:bg-muted/30">
                      <td className="px-4 py-3 align-top font-bold text-foreground">
                        {row.scenario}
                      </td>
                      <td className="px-4 py-3 align-top font-medium text-amber-700 dark:text-amber-300">
                        {row.impact}
                      </td>
                      <td className="px-4 py-3 align-top leading-relaxed text-muted-foreground">
                        {row.mitigation}
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-emerald-700 dark:text-emerald-400">
                        {row.recovery}
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
