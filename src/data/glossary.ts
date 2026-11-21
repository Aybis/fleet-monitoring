export interface TechnicalTermDef {
  term: string;
  fullName: string;
  category: "Finance" | "Logistics" | "OBD-II / Engine" | "Telematics" | "Compliance";
  explanation: string;
}

export const TECHNICAL_GLOSSARY = {
  CPK: {
    term: "CPK",
    fullName: "Cost per Kilometer (Rp/km)",
    category: "Finance",
    explanation:
      "Average total operating cost for every kilometer driven—combining diesel fuel, tolls/ferry, maintenance, and driver ops. Lower CPK means higher fleet profitability.",
  },
  OTIF: {
    term: "OTIF SLA",
    fullName: "On-Time In-Full Service Level Agreement",
    category: "Logistics",
    explanation:
      "Percentage of shipments delivered both on schedule and with 100% complete cargo quantities according to customer contract targets.",
  },
  BACKHAUL: {
    term: "Empty Backhaul",
    fullName: "Empty Return Trip Ratio",
    category: "Logistics",
    explanation:
      "Share of total distance a truck drives empty on its return journey. Consolidating return freight directly cuts wasted fuel and boosts profit margin.",
  },
  OBD: {
    term: "OBD-II / J1939",
    fullName: "On-Board Diagnostics & Heavy-Duty CAN Standard",
    category: "OBD-II / Engine",
    explanation:
      "Standard vehicle diagnostic interface (OBD-II + SAE J1939 for commercial diesels) that streams live engine sensor data and fault codes from the truck's computer.",
  },
  ECU: {
    term: "ECU",
    fullName: "Engine Control Unit",
    category: "OBD-II / Engine",
    explanation:
      "The truck's main onboard computer that regulates fuel injection, turbo boost, emissions, and records diagnostic trouble codes when sensors drift out of spec.",
  },
  DTC: {
    term: "DTC",
    fullName: "Diagnostic Trouble Code",
    category: "OBD-II / Engine",
    explanation:
      "Standardized 5-character fault code (such as P2002 or P0401) logged by the ECU whenever an engine, exhaust, or electrical component detects an issue.",
  },
  PID: {
    term: "ECU PIDs",
    fullName: "OBD-II Parameter IDs (Live Sensors)",
    category: "OBD-II / Engine",
    explanation:
      "Real-time numerical measurements read continuously from engine sensors—including RPM, coolant temperature, oil pressure, boost, and fuel rail pressure.",
  },
  SPN_FMI: {
    term: "SPN / FMI",
    fullName: "Suspect Parameter Number & Failure Mode Identifier",
    category: "OBD-II / Engine",
    explanation:
      "Heavy-truck SAE J1939 diagnostic pair: SPN identifies the exact component or sensor, while FMI describes how it failed (e.g., pressure too low, open circuit).",
  },
  DPD: {
    term: "DPD / DPF",
    fullName: "Diesel Particulate Diffuser / Filter",
    category: "OBD-II / Engine",
    explanation:
      "Isuzu exhaust soot trap that captures fine diesel particulates. Above ~75% soot load, a stationary 'Parked DPD Regen' safely burns off soot to avoid power loss.",
  },
  DEF: {
    term: "DEF / AdBlue",
    fullName: "Diesel Exhaust Fluid (32.5% Urea Solution)",
    category: "OBD-II / Engine",
    explanation:
      "Non-toxic urea fluid injected into the SCR exhaust catalyst to convert harmful nitrogen oxide (NOx) emissions into harmless nitrogen and water vapor.",
  },
  FUEL_RAIL: {
    term: "Fuel Rail (MPa)",
    fullName: "Common-Rail High-Pressure Diesel Manifold",
    category: "OBD-II / Engine",
    explanation:
      "Pressurized diesel manifold feeding electronic injectors (measured in Megapascals). Dropping below target under load indicates a clogged fuel filter or pump issue.",
  },
  TURBO_BOOST: {
    term: "Turbo Boost (kPa)",
    fullName: "Intake Manifold Boost Pressure",
    category: "OBD-II / Engine",
    explanation:
      "Air pressure forced into engine cylinders by the Variable Geometry Turbocharger (VGT), measured in kilopascals. Low boost reduces hill-climbing torque.",
  },
  MTBF: {
    term: "MTBF",
    fullName: "Mean Time Between Failures",
    category: "OBD-II / Engine",
    explanation:
      "Average operating hours a truck series runs between unplanned mechanical or electrical failures. Higher MTBF means stronger fleet reliability.",
  },
  PM_SERVICE: {
    term: "PM Service",
    fullName: "Preventive Maintenance Interval",
    category: "OBD-II / Engine",
    explanation:
      "Scheduled factory inspection and oil/filter service (every 10,000 km) designed to prevent expensive unplanned roadside breakdowns.",
  },
  IDLE_TIME: {
    term: "Idle Time %",
    fullName: "Stationary Engine-On Percentage",
    category: "Telematics",
    explanation:
      "Percentage of total engine running time spent parked with zero road speed. High idling wastes Biosolar/Dexlite diesel and clogs the DPD soot filter faster.",
  },
  GEOFENCE: {
    term: "Geofence",
    fullName: "Virtual GPS Hub Perimeter",
    category: "Telematics",
    explanation:
      "Circular virtual GPS boundary drawn around an Isuzu depot, port, or dealer hub that automatically logs truck arrival and departure timestamps.",
  },
  TNKB: {
    term: "TNKB",
    fullName: "Tanda Nomor Kendaraan Bermotor (Indonesian Plate)",
    category: "Compliance",
    explanation:
      "Official Indonesian Polri license plate pattern: Regional Code + 4 Digits + Series Letters + Month·Year expiry. Yellow = commercial freight; White = corporate fleet.",
  },
  BOL: {
    term: "BOL",
    fullName: "Bill of Lading (Cargo Manifest)",
    category: "Logistics",
    explanation:
      "Official freight transport document itemizing every loaded cargo slot, weight, customer, origin, and destination for legal dispatch clearance.",
  },
  FREEZE_FRAME: {
    term: "Freeze-Frame",
    fullName: "ECU Fault Snapshot Telemetry",
    category: "OBD-II / Engine",
    explanation:
      "Exact engine conditions (RPM, vehicle speed, and coolant temperature) captured by the computer at the exact millisecond a trouble code triggered.",
  },
} as const satisfies Record<string, TechnicalTermDef>;

export type TechnicalTermKey = keyof typeof TECHNICAL_GLOSSARY;
