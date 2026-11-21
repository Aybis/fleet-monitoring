import type { ObdDtcDefinition } from "@/types/haultrack";

export const ISUZU_OBD_CODES: Record<string, ObdDtcDefinition> = {
  P2002: {
    code: "P2002",
    j1939Spn: "SPN 3251 · FMI 0",
    title: "Diesel Particulate Diffuser (DPD / DPF) Efficiency Below Threshold",
    subsystem: "Exhaust & DPF",
    severity: "Critical",
    meaning:
      "Exhaust differential pressure across the Isuzu DPD filter exceeds soot-loading threshold, restricting exhaust flow and reducing engine power.",
    probableCauses: [
      "Extended urban stop-and-go driving prevented automatic DPD burn-off",
      "Exhaust differential pressure sensor hose clogged or cracked",
      "5th fuel injector / exhaust dosing nozzle carbon fouled",
    ],
    recommendedAction:
      "Trigger a stationary Parked DPD Manual Regeneration immediately (takes ~20 min) or inspect differential pressure sensor lines.",
    drivableStatus: "Service Within 24h",
  },
  P0401: {
    code: "P0401",
    j1939Spn: "SPN 27 · FMI 18",
    title: "Exhaust Gas Recirculation (EGR) Flow Insufficient Detected",
    subsystem: "Exhaust & DPF",
    severity: "Warning",
    meaning:
      "Measured mass air flow change during commanded EGR opening is lower than expected for Isuzu 4HK1 / 6HK1 diesel calibration.",
    probableCauses: [
      "Soot / carbon deposits restricting the EGR valve seat or cooler core",
      "DC stepper EGR actuator sluggish or sticking partially closed",
      "MAF (Mass Air Flow) sensor drift or intake boost leak",
    ],
    recommendedAction:
      "Schedule EGR cooler & intake throttle cleaning at depot maintenance bay; verify EGR valve position feedback via OBD-II live graph.",
    drivableStatus: "Safe to Complete Route",
  },
  P0087: {
    code: "P0087",
    j1939Spn: "SPN 157 · FMI 18",
    title: "Common-Rail Fuel System Pressure Too Low",
    subsystem: "Fuel System",
    severity: "Critical",
    meaning:
      "High-pressure common-rail fuel pressure dropped significantly below ECM target demand under acceleration or highway load.",
    probableCauses: [
      "Primary chassis fuel filter or water separator clogged with wax/debris",
      "Suction Control Valve (SCV) on HP3/HP4 supply pump worn or sticking",
      "Air ingress in low-pressure lift line or leaking injector return seal",
    ],
    recommendedAction:
      "Replace primary & secondary fuel filters first, bleed water separator, and inspect SCV duty cycle & rail pressure relief valve.",
    drivableStatus: "Pull Over / Immediate Service",
  },
  P0299: {
    code: "P0299",
    j1939Spn: "SPN 102 · FMI 18",
    title: "Variable Geometry Turbocharger (VGT) Underboost Condition",
    subsystem: "Turbo & Air",
    severity: "Warning",
    meaning:
      "Intake manifold boost pressure is at least 25 kPa below target pressure for more than 5 seconds under load.",
    probableCauses: [
      "Split intercooler silicone coupler or loose charge-air clamp",
      "VGT nozzle vanes carbon-bound causing slow actuator travel",
      "Boost pressure (MAP) sensor clogged with oil mist",
    ],
    recommendedAction:
      "Pressure-test charge-air cooler hoses and command VGT vane sweep test through Isuzu IDSS / OBD diagnostic port.",
    drivableStatus: "Safe to Complete Route",
  },
  P20EE: {
    code: "P20EE",
    j1939Spn: "SPN 4364 · FMI 18",
    title: "SCR NOx Catalyst Efficiency Below Threshold (AdBlue / DEF)",
    subsystem: "SCR / AdBlue",
    severity: "Advisory",
    meaning:
      "Downstream NOx sensor detects higher-than-permitted nitrogen oxide emissions exiting the Selective Catalytic Reduction unit.",
    probableCauses: [
      "Degraded or diluted DEF / AdBlue urea fluid (< 32.5% concentration)",
      "Urea crystallization around the SCR dosing injector tip",
      "Downstream NOx sensor aging or calibration offset",
    ],
    recommendedAction:
      "Test DEF fluid quality with refractometer, clean SCR injector nozzle, and reset NOx adaptation values.",
    drivableStatus: "Safe to Complete Route",
  },
  U0100: {
    code: "U0100",
    j1939Spn: "SPN 639 · FMI 9",
    title: "Lost Communication With ECM / PCM (J1939 CAN Bus)",
    subsystem: "CAN Network",
    severity: "Warning",
    meaning:
      "Telematics gateway or instrument cluster temporarily lost CAN-High / CAN-Low heartbeat frames from the Engine Control Module.",
    probableCauses: [
      "Corrosion or loose pin at cab-to-chassis bulkhead harness connector",
      "120-ohm CAN bus terminating resistor out of specification",
      "Transient voltage dip during cold-crank starter engagement",
    ],
    recommendedAction:
      "Inspect 24V chassis CAN harness pins and measure 60 ohms across OBD pins 6 & 14 with ignition OFF.",
    drivableStatus: "Service Within 24h",
  },
  P0118: {
    code: "P0118",
    j1939Spn: "SPN 110 · FMI 3",
    title: "Engine Coolant Temperature (ECT) Sensor Circuit High Input",
    subsystem: "Cooling",
    severity: "Warning",
    meaning:
      "ECM receives voltage above 4.85V from the coolant temperature thermistor, indicating an open circuit or unplugged sensor.",
    probableCauses: [
      "Open signal wire or corroded 2-pin plug at thermostat housing",
      "Faulty negative-temperature-coefficient (NTC) coolant sensor",
      "Damaged ground return on sensor reference bus",
    ],
    recommendedAction:
      "Check coolant sensor connector lock tab and verify resistance (~2.5 kΩ at 20°C, ~0.3 kΩ at 80°C).",
    drivableStatus: "Service Within 24h",
  },
  P0562: {
    code: "P0562",
    j1939Spn: "SPN 168 · FMI 18",
    title: "Charging System Voltage Low (Alternator / Dual-Battery Bus)",
    subsystem: "Electrical",
    severity: "Advisory",
    meaning:
      "Measured ECM bus voltage fell below 23.2V (24V heavy system) or 11.8V (12V light system) while engine is running.",
    probableCauses: [
      "Slipping alternator drive belt or worn tensioner pulley",
      "Imbalanced pair of 12V series batteries in 24V truck battery box",
      "Alternator voltage regulator brushes nearing end of life",
    ],
    recommendedAction:
      "Load-test batteries individually, inspect chassis ground strap, and verify alternator output (27.4–28.2V on 24V trucks).",
    drivableStatus: "Safe to Complete Route",
  },
};

export const OBD_CODE_LIST: ObdDtcDefinition[] = Object.values(ISUZU_OBD_CODES);

export function getDtcInfo(code: string): ObdDtcDefinition {
  return (
    ISUZU_OBD_CODES[code.toUpperCase()] ?? {
      code: code.toUpperCase(),
      title: "Manufacturer-Specific Diagnostic Trouble Code",
      subsystem: "CAN Network",
      severity: "Advisory",
      meaning: "Unlisted OBD-II / J1939 fault frame reported by vehicle ECU.",
      probableCauses: ["Sensor circuit drift or intermittent harness fault"],
      recommendedAction: "Connect Isuzu IDSS diagnostic tool for freeze-frame inspection.",
      drivableStatus: "Service Within 24h",
    }
  );
}
