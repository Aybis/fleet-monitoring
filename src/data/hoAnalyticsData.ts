import type { IsuzuSeries } from "@/types/haultrack";

export type HoRegion = "ALL" | "JAWA_BALI" | "SUMATRA" | "KALIMANTAN" | "SULAWESI";
export type HoTimeframe = "7d" | "30d" | "90d" | "ytd";

export interface RegionalBranchMetric {
  id: string;
  regionKey: Exclude<HoRegion, "ALL">;
  branchName: string;
  hubCities: string;
  dealerPartner: string;
  activeUnits: number;
  monthlyTrips: number;
  tonnageMoved: number;
  utilizationPct: number;
  emptyBackhaulPct: number;
  otifPct: number;
  fuelKmPerL: number;
  cpkIdr: number; // Cost per km in IDR
  revenueMarginPct: number;
  status: "Exceeding" | "On Target" | "Attention";
}

export interface SeriesPerformanceMetric {
  series: IsuzuSeries;
  engineFamily: string;
  avgFuelKmL: number;
  cpkIdr: number;
  mtbfHours: number;
  downtimeHrs30d: number;
  avgLoadFactorPct: number;
  roiMarginPct: number;
}

export interface CostTrendPoint {
  period: string;
  fuelM: number; // IDR Millions
  maintenanceM: number;
  tollFerryM: number;
  driverOpsM: number;
  tonnage: number;
  utilization: number;
  budgetM: number;
}

export interface DelayRootCause {
  cause: string;
  sharePct: number;
  incidents: number;
  avgDelayMin: number;
  color: string;
}

export interface DriverScorecardRow {
  driverId: string;
  name: string;
  region: Exclude<HoRegion, "ALL">;
  primaryPlate: string;
  series: IsuzuSeries;
  safetyEcoScore: number;
  fuelKmL: number;
  harshEventsPer1k: number;
  idleTimePct: number;
  otifPct: number;
  kmDriven30d: number;
  tier: "Top Performer" | "On Target" | "Eco-Coaching";
}

export const REGIONAL_BRANCH_METRICS: RegionalBranchMetric[] = [
  {
    id: "br-jabar",
    regionKey: "JAWA_BALI",
    branchName: "Jawa Barat & DKI Hub",
    hubCities: "Jakarta · Karawang · Bandung",
    dealerPartner: "Astra Isuzu Sunter & Soekarno-Hatta",
    activeUnits: 2,
    monthlyTrips: 382,
    tonnageMoved: 1420,
    utilizationPct: 83,
    emptyBackhaulPct: 12.4,
    otifPct: 98.2,
    fuelKmPerL: 6.7,
    cpkIdr: 4580,
    revenueMarginPct: 24.8,
    status: "Exceeding",
  },
  {
    id: "br-jatim",
    regionKey: "JAWA_BALI",
    branchName: "Jawa Timur & Bali Hub",
    hubCities: "Surabaya · Semarang · Denpasar",
    dealerPartner: "Astra Isuzu Waru & Cokroaminoto",
    activeUnits: 2,
    monthlyTrips: 294,
    tonnageMoved: 1185,
    utilizationPct: 80,
    emptyBackhaulPct: 14.8,
    otifPct: 96.9,
    fuelKmPerL: 6.5,
    cpkIdr: 4720,
    revenueMarginPct: 22.6,
    status: "On Target",
  },
  {
    id: "br-sumatra",
    regionKey: "SUMATRA",
    branchName: "Sumatra Freight Division",
    hubCities: "Medan · Pekanbaru · Palembang",
    dealerPartner: "Astra Isuzu SM Raja Medan",
    activeUnits: 1,
    monthlyTrips: 118,
    tonnageMoved: 468,
    utilizationPct: 74,
    emptyBackhaulPct: 23.5,
    otifPct: 94.1,
    fuelKmPerL: 5.9,
    cpkIdr: 5240,
    revenueMarginPct: 17.9,
    status: "Attention",
  },
  {
    id: "br-kaltim",
    regionKey: "KALIMANTAN",
    branchName: "Kalimantan Timur & IKN Ops",
    hubCities: "Balikpapan · Samarinda",
    dealerPartner: "Astra Isuzu MT Haryono Balikpapan",
    activeUnits: 1,
    monthlyTrips: 146,
    tonnageMoved: 392,
    utilizationPct: 76,
    emptyBackhaulPct: 18.2,
    otifPct: 95.8,
    fuelKmPerL: 6.1,
    cpkIdr: 5110,
    revenueMarginPct: 21.4,
    status: "On Target",
  },
  {
    id: "br-sulsel",
    regionKey: "SULAWESI",
    branchName: "Sulawesi Selatan & Port Hub",
    hubCities: "Makassar · Parepare",
    dealerPartner: "Astra Isuzu Urip Sumoharjo",
    activeUnits: 1,
    monthlyTrips: 132,
    tonnageMoved: 615,
    utilizationPct: 81,
    emptyBackhaulPct: 15.1,
    otifPct: 97.4,
    fuelKmPerL: 6.3,
    cpkIdr: 4860,
    revenueMarginPct: 23.1,
    status: "Exceeding",
  },
];

export const SERIES_PERFORMANCE_METRICS: SeriesPerformanceMetric[] = [
  {
    series: "GIGA",
    engineFamily: "6HK1-TCS / TCN (7.8L)",
    avgFuelKmL: 4.9,
    cpkIdr: 5620,
    mtbfHours: 1420,
    downtimeHrs30d: 6.5,
    avgLoadFactorPct: 84,
    roiMarginPct: 25.4,
  },
  {
    series: "FORWARD",
    engineFamily: "4HK1-TCC (5.2L)",
    avgFuelKmL: 6.1,
    cpkIdr: 4890,
    mtbfHours: 1180,
    downtimeHrs30d: 14.2,
    avgLoadFactorPct: 78,
    roiMarginPct: 21.8,
  },
  {
    series: "ELF",
    engineFamily: "4HL1 / 4JB1 (4.8L / 2.8L)",
    avgFuelKmL: 8.4,
    cpkIdr: 3940,
    mtbfHours: 1560,
    downtimeHrs30d: 4.8,
    avgLoadFactorPct: 81,
    roiMarginPct: 24.2,
  },
  {
    series: "TRAGA",
    engineFamily: "4JA1-L (2.5L Direct)",
    avgFuelKmL: 10.6,
    cpkIdr: 3180,
    mtbfHours: 1310,
    downtimeHrs30d: 8.0,
    avgLoadFactorPct: 75,
    roiMarginPct: 19.6,
  },
  {
    series: "D-MAX",
    engineFamily: "RZ4E-TC (1.9L Ddi)",
    avgFuelKmL: 12.1,
    cpkIdr: 2940,
    mtbfHours: 1090,
    downtimeHrs30d: 9.5,
    avgLoadFactorPct: 68,
    roiMarginPct: 18.4,
  },
];

export const COST_TREND_SERIES: Record<HoTimeframe, CostTrendPoint[]> = {
  "7d": [
    { period: "Mon", fuelM: 42.4, maintenanceM: 8.2, tollFerryM: 14.5, driverOpsM: 16.0, tonnage: 54.2, utilization: 78, budgetM: 85 },
    { period: "Tue", fuelM: 46.1, maintenanceM: 9.4, tollFerryM: 16.2, driverOpsM: 16.4, tonnage: 61.8, utilization: 84, budgetM: 88 },
    { period: "Wed", fuelM: 44.0, maintenanceM: 12.8, tollFerryM: 15.1, driverOpsM: 16.1, tonnage: 58.4, utilization: 81, budgetM: 88 },
    { period: "Thu", fuelM: 49.6, maintenanceM: 7.9, tollFerryM: 17.8, driverOpsM: 17.2, tonnage: 67.5, utilization: 88, budgetM: 94 },
    { period: "Fri", fuelM: 52.8, maintenanceM: 10.5, tollFerryM: 19.4, driverOpsM: 17.6, tonnage: 72.1, utilization: 91, budgetM: 98 },
    { period: "Sat", fuelM: 36.2, maintenanceM: 6.4, tollFerryM: 12.6, driverOpsM: 14.0, tonnage: 48.6, utilization: 72, budgetM: 74 },
    { period: "Sun", fuelM: 28.9, maintenanceM: 5.1, tollFerryM: 10.2, driverOpsM: 12.5, tonnage: 39.4, utilization: 65, budgetM: 62 },
  ],
  "30d": [
    { period: "Wk 1", fuelM: 284, maintenanceM: 58, tollFerryM: 96, driverOpsM: 104, tonnage: 372, utilization: 77, budgetM: 560 },
    { period: "Wk 2", fuelM: 302, maintenanceM: 64, tollFerryM: 104, driverOpsM: 108, tonnage: 408, utilization: 82, budgetM: 585 },
    { period: "Wk 3", fuelM: 296, maintenanceM: 72, tollFerryM: 98, driverOpsM: 106, tonnage: 394, utilization: 80, budgetM: 585 },
    { period: "Wk 4", fuelM: 318, maintenanceM: 54, tollFerryM: 112, driverOpsM: 112, tonnage: 442, utilization: 86, budgetM: 610 },
  ],
  "90d": [
    { period: "Sep", fuelM: 1160, maintenanceM: 245, tollFerryM: 392, driverOpsM: 418, tonnage: 1510, utilization: 78, budgetM: 2280 },
    { period: "Oct", fuelM: 1235, maintenanceM: 228, tollFerryM: 418, driverOpsM: 432, tonnage: 1642, utilization: 82, budgetM: 2350 },
    { period: "Nov", fuelM: 1200, maintenanceM: 248, tollFerryM: 410, driverOpsM: 430, tonnage: 1616, utilization: 81, budgetM: 2340 },
  ],
  ytd: [
    { period: "Q1", fuelM: 3320, maintenanceM: 740, tollFerryM: 1120, driverOpsM: 1210, tonnage: 4380, utilization: 76, budgetM: 6550 },
    { period: "Q2", fuelM: 3540, maintenanceM: 690, tollFerryM: 1190, driverOpsM: 1245, tonnage: 4690, utilization: 80, budgetM: 6820 },
    { period: "Q3", fuelM: 3680, maintenanceM: 715, tollFerryM: 1240, driverOpsM: 1280, tonnage: 4920, utilization: 83, budgetM: 7050 },
    { period: "Q4*", fuelM: 2435, maintenanceM: 476, tollFerryM: 828, driverOpsM: 862, tonnage: 3258, utilization: 82, budgetM: 4690 },
  ],
};

export const DELAY_ROOT_CAUSES: DelayRootCause[] = [
  { cause: "Toll / Pantura Traffic Congestion", sharePct: 41, incidents: 19, avgDelayMin: 48, color: "#d91324" },
  { cause: "Port / Ro-Ro Ferry Queue (Merak–Gilimanuk)", sharePct: 26, incidents: 12, avgDelayMin: 64, color: "#0284c7" },
  { cause: "Unscheduled OBD / DPD Service Stop", sharePct: 19, incidents: 9, avgDelayMin: 52, color: "#f59e0b" },
  { cause: "Warehouse Dock Loading Turnaround", sharePct: 14, incidents: 6, avgDelayMin: 31, color: "#7c3aed" },
];

export const DRIVER_SCORECARDS: DriverScorecardRow[] = [
  {
    driverId: "drv-budi",
    name: "Budi Santoso",
    region: "JAWA_BALI",
    primaryPlate: "B 9482 KXU",
    series: "GIGA",
    safetyEcoScore: 94,
    fuelKmL: 5.2,
    harshEventsPer1k: 1.4,
    idleTimePct: 11.2,
    otifPct: 98.5,
    kmDriven30d: 8420,
    tier: "Top Performer",
  },
  {
    driverId: "drv-daeng",
    name: "Andi Mappanyukki",
    region: "SULAWESI",
    primaryPlate: "DD 8615 KRA",
    series: "GIGA",
    safetyEcoScore: 95,
    fuelKmL: 5.3,
    harshEventsPer1k: 1.1,
    idleTimePct: 9.8,
    otifPct: 98.9,
    kmDriven30d: 6910,
    tier: "Top Performer",
  },
  {
    driverId: "drv-arif",
    name: "Arif Rahman",
    region: "JAWA_BALI",
    primaryPlate: "D 8204 VFA",
    series: "ELF",
    safetyEcoScore: 91,
    fuelKmL: 8.8,
    harshEventsPer1k: 1.9,
    idleTimePct: 13.5,
    otifPct: 97.6,
    kmDriven30d: 5840,
    tier: "Top Performer",
  },
  {
    driverId: "drv-hendra",
    name: "Hendra Wijaya",
    region: "JAWA_BALI",
    primaryPlate: "L 8719 UBA",
    series: "FORWARD",
    safetyEcoScore: 84,
    fuelKmL: 6.0,
    harshEventsPer1k: 3.1,
    idleTimePct: 22.4,
    otifPct: 96.4,
    kmDriven30d: 6150,
    tier: "On Target",
  },
  {
    driverId: "drv-made",
    name: "I Made Surya",
    region: "JAWA_BALI",
    primaryPlate: "DK 8722 QBA",
    series: "ELF",
    safetyEcoScore: 88,
    fuelKmL: 8.5,
    harshEventsPer1k: 2.2,
    idleTimePct: 14.8,
    otifPct: 97.2,
    kmDriven30d: 5210,
    tier: "On Target",
  },
  {
    driverId: "drv-wahyu",
    name: "Wahyu Hidayat",
    region: "KALIMANTAN",
    primaryPlate: "KT 8501 YLA",
    series: "D-MAX",
    safetyEcoScore: 86,
    fuelKmL: 11.8,
    harshEventsPer1k: 2.8,
    idleTimePct: 16.9,
    otifPct: 95.8,
    kmDriven30d: 4680,
    tier: "On Target",
  },
  {
    driverId: "drv-rizky",
    name: "Rizky Pratama",
    region: "SUMATRA",
    primaryPlate: "BK 8905 ECA",
    series: "TRAGA",
    safetyEcoScore: 76,
    fuelKmL: 9.4,
    harshEventsPer1k: 4.9,
    idleTimePct: 25.8,
    otifPct: 93.4,
    kmDriven30d: 7120,
    tier: "Eco-Coaching",
  },
];

export const IDLE_FUEL_BY_REGION = [
  { region: "Jawa Barat", movingFuelL: 4820, idleFuelL: 640 },
  { region: "Jawa Timur", movingFuelL: 4150, idleFuelL: 790 },
  { region: "Sumatra", movingFuelL: 2480, idleFuelL: 680 },
  { region: "Kaltim", movingFuelL: 1920, idleFuelL: 340 },
  { region: "Sulsel", movingFuelL: 2210, idleFuelL: 260 },
];
