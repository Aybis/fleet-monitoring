export type NavPage =
  | "dashboard"
  | "map"
  | "obd"
  | "shipments"
  | "fleet"
  | "analytics"
  | "reports"
  | "master-data"
  | "hld"
  | "settings";

export interface HubMasterItem {
  code: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  docks: number;
  status: "Active" | "Maintenance";
}

export type PriorityLevel = "Standard" | "Express" | "Same-day";

export type CargoType = "Pallet" | "Box" | "Crate";

export type HandlingMethod = "Pickup" | "Dock Transfer" | "Express Hub";

export type TruckStatus = "In Transit" | "Loading" | "Ready to Dispatch" | "Maintenance";

export type SlotCondition = "verified" | "inspection" | "temperature";

export type WeightUnit = "metric" | "imperial";

export type IsuzuSeries = "GIGA" | "FORWARD" | "ELF" | "TRAGA" | "D-MAX";

export type ObdSeverity = "Critical" | "Warning" | "Advisory";

export interface ObdDtcDefinition {
  code: string;
  j1939Spn?: string;
  title: string;
  subsystem: "Exhaust & DPF" | "Fuel System" | "Turbo & Air" | "Cooling" | "CAN Network" | "Electrical" | "SCR / AdBlue";
  severity: ObdSeverity;
  meaning: string;
  probableCauses: string[];
  recommendedAction: string;
  drivableStatus: "Safe to Complete Route" | "Service Within 24h" | "Pull Over / Immediate Service";
}

export interface ActiveDtc {
  code: string;
  detectedAt: string;
  freezeRpm: number;
  freezeSpeedMph: number;
  freezeTempC: number;
  occurrences: number;
  acknowledged: boolean;
}

export interface ObdTelemetry {
  deviceId: string; // e.g., ISZ-OBD-88204
  registeredToIsuzu: boolean;
  dealerRegion: string;
  protocol: string;
  lastScan: string;
  rpm: number;
  coolantTempC: number;
  oilPressureKpa: number;
  boostKpa: number;
  batteryVolts: number;
  dpfSootPct: number;
  defLevelPct: number;
  fuelRailMpa: number;
  engineLoadPct: number;
  activeCodes: ActiveDtc[];
}

export interface GpsPosition {
  lat: number;
  lng: number;
  mapX: number; // 0..1000 SVG viewport X
  mapY: number; // 0..580 SVG viewport Y
  headingDeg: number;
  lastPing: string;
  ignitionOn: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  license: string;
  rating: number;
  completedTrips: number;
  status: "On Duty" | "Available" | "Off Shift";
  shiftStart: string;
  avatarInitials: string;
}

export interface CargoSlotItem {
  shipmentCode: string;
  title: string;
  customer: string;
  weightKg: number;
  cargoType: CargoType;
  quantity: number;
  priority: PriorityLevel;
  method: HandlingMethod;
  originCode: string;
  destinationCode: string;
  condition: SlotCondition;
  notes: string;
  loadedAt: string;
}

export interface CargoSlot {
  id: string;
  row: "A" | "B" | "C";
  col: 1 | 2 | 3 | 4 | 5 | 6;
  cargo: CargoSlotItem | null;
}

export interface QueuedShipment {
  id: string;
  title: string;
  customer: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  cargoType: CargoType;
  quantity: number;
  weightKg: number;
  method: HandlingMethod;
  priority: PriorityLevel;
  condition: SlotCondition;
  notes: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  time: string;
  message: string;
  detail?: string;
  type: "assign" | "unload" | "checkin" | "dispatch" | "route" | "driver" | "obd";
  truckId: string;
  slotId?: string;
}

export interface RouteInfo {
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  distanceMiles: number;
  progressPercent: number;
  eta: string;
  currentLocation: string;
  speedMph: number;
}

export interface Truck {
  id: string;
  series: IsuzuSeries;
  vehicleClass: string;
  model: string;
  engine: string;
  vin: string;
  odometerKm: number;
  imageSrc: string;
  imageAspect: string;
  supportsCargoGrid: boolean;
  cargoGridBounds?: {
    left: string;
    top: string;
    width: string;
    height: string;
  };
  plate: string;
  plateType: "commercial" | "corporate"; // commercial = Plat Kuning (Angkutan Umum), corporate = Plat Putih (Perpol 7/2021)
  plateExpiry: string; // e.g., "08·29"
  status: TruckStatus;
  driverId: string;
  dock: string;
  startedAt: string;
  maxCapacityKg: number;
  fuelPercent: number;
  tempCelsius: number;
  route: RouteInfo;
  gps: GpsPosition;
  obd: ObdTelemetry;
  slots: CargoSlot[];
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  severity: "info" | "warning" | "success";
  read: boolean;
  truckId?: string;
  slotId?: string;
  openObd?: boolean;
}

export interface AppSettings {
  depotName: string;
  weightUnit: WeightUnit;
  autoAdvanceSlot: boolean;
  overloadWarningPct: number;
  liveTelemetryUpdates: boolean;
  dispatchAlerts: boolean;
  darkMode: boolean;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "warning" | "destructive";
  undoAction?: () => void;
}

export interface TelemetrySample {
  time: string;
  rpm: number;
  speedKmh: number;
  boostKpa: number;
  fuelRailMpa: number;
  coolantTempC: number;
}
