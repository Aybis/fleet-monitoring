import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  INITIAL_ACTIVITIES,
  INITIAL_DRIVERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_QUEUED_SHIPMENTS,
  INITIAL_SETTINGS,
  INITIAL_TRUCKS,
} from "@/data/initialData";
import { projectIndonesia } from "@/data/indonesiaMap";
import { getDtcInfo, OBD_CODE_LIST } from "@/data/obdDatabase";
import { formatCurrentTime } from "@/lib/utils";
import type {
  ActivityItem,
  AppSettings,
  CargoSlot,
  CargoSlotItem,
  Driver,
  EmergencyAlert,
  EmergencyAlertType,
  HubMasterItem,
  NavPage,
  NotificationItem,
  ObdDtcDefinition,
  QueuedShipment,
  RouteInfo,
  SlotCondition,
  TelemetrySample,
  ToastItem,
  Truck,
  TruckStatus,
} from "@/types/haultrack";

const STORAGE_KEY = "isuzu_indonesia_leaflet_v5";

const INITIAL_HUBS: HubMasterItem[] = [
  { code: "JKT", city: "Jakarta", region: "DKI Jakarta & Karawang", lat: -6.2088, lng: 106.8456, docks: 6, status: "Active" },
  { code: "BDG", city: "Bandung", region: "Jawa Barat", lat: -6.9175, lng: 107.6191, docks: 4, status: "Active" },
  { code: "SMG", city: "Semarang", region: "Jawa Tengah", lat: -6.9667, lng: 110.4167, docks: 4, status: "Active" },
  { code: "SBY", city: "Surabaya", region: "Jawa Timur", lat: -7.2575, lng: 112.7521, docks: 6, status: "Active" },
  { code: "DPS", city: "Denpasar", region: "Bali", lat: -8.6705, lng: 115.2126, docks: 3, status: "Active" },
  { code: "MDN", city: "Medan", region: "Sumatra Utara", lat: 3.5952, lng: 98.6722, docks: 4, status: "Active" },
  { code: "PKU", city: "Pekanbaru", region: "Riau", lat: 0.5071, lng: 101.4478, docks: 3, status: "Active" },
  { code: "PLB", city: "Palembang", region: "Sumatra Selatan", lat: -2.9761, lng: 104.7754, docks: 4, status: "Active" },
  { code: "BPN", city: "Balikpapan", region: "Kalimantan Timur", lat: -1.2379, lng: 116.8529, docks: 4, status: "Active" },
  { code: "SMD", city: "Samarinda", region: "Kalimantan Timur", lat: -0.5022, lng: 117.1536, docks: 3, status: "Active" },
  { code: "MKS", city: "Makassar", region: "Sulawesi Selatan", lat: -5.1477, lng: 119.4327, docks: 5, status: "Active" },
  { code: "DJJ", city: "Jayapura", region: "Papua", lat: -2.5916, lng: 140.669, docks: 2, status: "Active" },
];

const INITIAL_EMERGENCY_ALERTS: EmergencyAlert[] = [
  {
    id: "emg-init-p2002",
    type: "urgent_dtc",
    severity: "CRITICAL",
    truckId: "ISZ-118",
    plate: "L 8719 UBA",
    model: "Isuzu FORWARD FTR 260",
    driverName: "Hendra Wijaya",
    driverPhone: "+62 812-3401-8719",
    location: "Surabaya Tanjung Perak Hub · Dock #1",
    lat: -7.2041,
    lng: 112.7351,
    title: "CRITICAL DPD BLOCKAGE — P2002 Soot Load 86% (Urgent Regen)",
    summary:
      "Geotab GO9 detected J1939 SPN 3251 / FMI 0 (P2002). Exhaust backpressure exceeding threshold; parked DPD regeneration required before highway dispatch.",
    dtcCode: "P2002",
    coolantTempC: 83,
    fuelRailMpa: 112,
    triggeredAt: "08:52 WIB",
    triggeredEpochMs: Date.now() - 1000 * 60 * 42,
    status: "Acknowledged",
    isDummySimulation: false,
    responseChecklist: [
      { id: "c1", label: "Verify unit parked safely at Tanjung Perak bay", done: true },
      { id: "c2", label: "Notify Astra Isuzu Surabaya workshop supervisor", done: true },
      { id: "c3", label: "Execute parked DPD regeneration cycle", done: false },
      { id: "c4", label: "Re-scan ECU and confirm soot load < 20%", done: false },
    ],
  },
  {
    id: "emg-init-p0087",
    type: "urgent_dtc",
    severity: "CRITICAL",
    truckId: "ISZ-501",
    plate: "KT 8501 YLA",
    model: "Isuzu D-MAX Rodeo 4×4",
    driverName: "Fajar Nugroho",
    driverPhone: "+62 815-4902-8501",
    location: "Tol Balikpapan–Samarinda KM 38, Kaltim",
    lat: -0.9612,
    lng: 116.9532,
    title: "URGENT FUEL RAIL DROP — P0087 Low Common-Rail Pressure (68 MPa)",
    summary:
      "Geotab GO9 reported common-rail pressure below target under load on 4JJ1-TCX. High risk of engine stall or limp-mode on Kaltim corridor.",
    dtcCode: "P0087",
    coolantTempC: 91,
    fuelRailMpa: 68,
    triggeredAt: "09:18 WIB",
    triggeredEpochMs: Date.now() - 1000 * 60 * 18,
    status: "Dispatched",
    isDummySimulation: false,
    responseChecklist: [
      { id: "c1", label: "Contact driver Fajar Nugroho via cab radio", done: true },
      { id: "c2", label: "Instruct driver to reduce load & pull over at Rest Area KM 42", done: true },
      { id: "c3", label: "Dispatch Astra Isuzu Balikpapan Mobile Service (SCV + Fuel Filter)", done: true },
      { id: "c4", label: "Confirm fuel rail recovers > 110 MPa before resuming", done: false },
    ],
  },
];

interface PersistedState {
  trucks: Truck[];
  drivers: Driver[];
  queuedShipments: QueuedShipment[];
  activities: ActivityItem[];
  notifications: NotificationItem[];
  settings: AppSettings;
  activeTruckId: string;
  selectedSlotId: string;
  obdCatalog: ObdDtcDefinition[];
  hubCatalog: HubMasterItem[];
  emergencyAlerts: EmergencyAlert[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (
        parsed &&
        Array.isArray(parsed.trucks) &&
        parsed.trucks.length > 0 &&
        parsed.trucks[0].obd?.deviceId &&
        parsed.trucks[0].plateExpiry &&
        parsed.trucks[0].plateType
      ) {
        return {
          trucks: parsed.trucks,
          drivers: parsed.drivers ?? INITIAL_DRIVERS,
          queuedShipments: parsed.queuedShipments ?? INITIAL_QUEUED_SHIPMENTS,
          activities: parsed.activities ?? INITIAL_ACTIVITIES,
          notifications: parsed.notifications ?? INITIAL_NOTIFICATIONS,
          settings: parsed.settings ?? INITIAL_SETTINGS,
          activeTruckId: parsed.activeTruckId ?? "ISZ-204",
          selectedSlotId: parsed.selectedSlotId ?? "A5",
          obdCatalog:
            Array.isArray(parsed.obdCatalog) && parsed.obdCatalog.length > 0
              ? parsed.obdCatalog
              : OBD_CODE_LIST,
          hubCatalog:
            Array.isArray(parsed.hubCatalog) && parsed.hubCatalog.length > 0
              ? parsed.hubCatalog
              : INITIAL_HUBS,
          emergencyAlerts: Array.isArray(parsed.emergencyAlerts)
            ? parsed.emergencyAlerts
            : INITIAL_EMERGENCY_ALERTS,
        };
      }
    }
  } catch {
    // Fallback to defaults
  }
  return {
    trucks: INITIAL_TRUCKS,
    drivers: INITIAL_DRIVERS,
    queuedShipments: INITIAL_QUEUED_SHIPMENTS,
    activities: INITIAL_ACTIVITIES,
    notifications: INITIAL_NOTIFICATIONS,
    settings: INITIAL_SETTINGS,
    activeTruckId: "ISZ-204",
    selectedSlotId: "A5",
    obdCatalog: OBD_CODE_LIST,
    hubCatalog: INITIAL_HUBS,
    emergencyAlerts: INITIAL_EMERGENCY_ALERTS,
  };
}

export function getTruckLoadKg(truck: Truck): number {
  return truck.slots.reduce((sum, s) => sum + (s.cargo ? s.cargo.weightKg : 0), 0);
}

export function getTruckLoadPct(truck: Truck): number {
  if (truck.maxCapacityKg <= 0) return 0;
  return Math.round((getTruckLoadKg(truck) / truck.maxCapacityKg) * 100);
}

export function getVehicleObdHealth(
  truck: Truck,
  catalog?: ObdDtcDefinition[]
): "Healthy" | "Warning" | "Critical" {
  if (truck.obd.activeCodes.length === 0) return "Healthy";
  const resolveSeverity = (code: string) => {
    const found = catalog?.find((c) => c.code.toUpperCase() === code.toUpperCase());
    return found ? found.severity : getDtcInfo(code).severity;
  };
  const hasCritical = truck.obd.activeCodes.some((c) => resolveSeverity(c.code) === "Critical");
  return hasCritical ? "Critical" : "Warning";
}

interface HaulTrackContextValue {
  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
  trucks: Truck[];
  activeTruck: Truck;
  activeDriver: Driver;
  drivers: Driver[];
  queuedShipments: QueuedShipment[];
  activities: ActivityItem[];
  notifications: NotificationItem[];
  settings: AppSettings;
  selectedSlotId: string;
  setSelectedSlotId: (slotId: string) => void;
  highlightedSlotId: string | null;
  flashSlot: (slotId: string) => void;
  liveTrackingOpen: boolean;
  setLiveTrackingOpen: (open: boolean) => void;
  dispatchModalOpen: boolean;
  setDispatchModalOpen: (open: boolean) => void;
  selectTruck: (truckId: string) => void;
  assignShipmentToSlot: (shipmentId: string, slotId?: string) => boolean;
  unloadSlot: (slotId: string, truckId?: string) => void;
  moveSlotCargo: (fromSlotId: string, toSlotId: string) => boolean;
  updateSlotCondition: (slotId: string, condition: SlotCondition) => void;
  changeTruckDriver: (truckId: string, driverId: string) => void;
  updateTruckRoute: (
    truckId: string,
    updates: Partial<RouteInfo> & { dock?: string; startedAt?: string }
  ) => void;
  dispatchTruck: (truckId: string, nextStatus?: TruckStatus) => void;
  createShipment: (shipment: Omit<QueuedShipment, "id" | "createdAt">) => QueuedShipment;
  deleteQueuedShipment: (shipmentId: string) => void;
  scanVehicleObd: (truckId: string) => void;
  clearVehicleDtc: (truckId: string, code: string) => void;
  acknowledgeDtc: (truckId: string, code: string) => void;
  runDpfRegen: (truckId: string) => void;
  simulateGpsTick: () => void;
  liveTickCount: number;
  lastHeartbeat: string;
  telemetryHistory: Record<string, TelemetrySample[]>;
  obdCatalog: ObdDtcDefinition[];
  hubCatalog: HubMasterItem[];
  lookupDtc: (code: string) => ObdDtcDefinition;
  addObdCode: (def: ObdDtcDefinition) => boolean;
  updateObdCode: (code: string, patch: Partial<ObdDtcDefinition>) => void;
  deleteObdCode: (code: string) => void;
  addHubCode: (hub: HubMasterItem) => boolean;
  deleteHubCode: (code: string) => void;
  emergencyAlerts: EmergencyAlert[];
  activeIncidentId: string | null;
  setActiveIncidentId: (id: string | null) => void;
  alertSoundEnabled: boolean;
  setAlertSoundEnabled: (enabled: boolean) => void;
  triggerDummyFailure: (type: EmergencyAlertType, targetTruckId?: string) => EmergencyAlert;
  acknowledgeEmergencyAlert: (id: string) => void;
  dispatchEmergencyResponse: (id: string) => void;
  toggleIncidentChecklistItem: (alertId: string, itemId: string) => void;
  resolveEmergencyAlert: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetDemoData: () => void;
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
  sendDriverMessage: (driverName: string, message: string) => void;
}

const HaulTrackContext = createContext<HaulTrackContextValue | null>(null);

function formatLiveClock(): string {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function seedTelemetryHistory(trucks: Truck[]): Record<string, TelemetrySample[]> {
  const now = Date.now();
  const map: Record<string, TelemetrySample[]> = {};
  for (const t of trucks) {
    const samples: TelemetrySample[] = [];
    for (let i = 11; i >= 0; i--) {
      const ts = new Date(now - i * 2500).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const wave = Math.sin(i * 0.7);
      const isMoving = t.status === "In Transit";
      samples.push({
        time: ts,
        rpm: Math.round(t.obd.rpm + wave * (isMoving ? 55 : 14)),
        speedKmh: isMoving ? Math.max(38, Math.round(t.route.speedMph + wave * 3)) : 0,
        boostKpa: Math.max(12, Math.round(t.obd.boostKpa + wave * (isMoving ? 8 : 2))),
        fuelRailMpa: Math.max(36, Math.round(t.obd.fuelRailMpa + wave * (isMoving ? 5 : 2))),
        coolantTempC: t.obd.coolantTempC,
      });
    }
    map[t.id] = samples;
  }
  return map;
}

function playUrgentAlertChime(isAccident: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = isAccident ? [880, 660, 880, 660] : [784, 988, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isAccident ? "sawtooth" : "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.16 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.16);
      osc.stop(ctx.currentTime + i * 0.16 + 0.15);
    });
  } catch {
    // Ignore autoplay restrictions
  }
}

export function HaulTrackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadInitialState);
  const [activePage, setActivePage] = useState<NavPage>("dashboard");
  const [highlightedSlotId, setHighlightedSlotId] = useState<string | null>(null);
  const [liveTrackingOpen, setLiveTrackingOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [liveTickCount, setLiveTickCount] = useState(1);
  const [lastHeartbeat, setLastHeartbeat] = useState<string>(() => formatLiveClock());
  const [telemetryHistory, setTelemetryHistory] = useState<Record<string, TelemetrySample[]>>(() =>
    seedTelemetryHistory(state.trucks)
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota issues
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [state.settings.darkMode]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4800);
    },
    [dismissToast]
  );

  const flashSlot = useCallback((slotId: string) => {
    setHighlightedSlotId(slotId);
    window.setTimeout(() => {
      setHighlightedSlotId((curr) => (curr === slotId ? null : curr));
    }, 1800);
  }, []);

  const activeTruck = useMemo(
    () => state.trucks.find((t) => t.id === state.activeTruckId) ?? state.trucks[0],
    [state.trucks, state.activeTruckId]
  );

  const activeDriver = useMemo(
    () => state.drivers.find((d) => d.id === activeTruck.driverId) ?? state.drivers[0],
    [state.drivers, activeTruck.driverId]
  );

  const setSelectedSlotId = useCallback((slotId: string) => {
    setState((prev) => ({ ...prev, selectedSlotId: slotId }));
  }, []);

  const selectTruck = useCallback((truckId: string) => {
    setState((prev) => {
      const target = prev.trucks.find((t) => t.id === truckId);
      if (!target) return prev;
      const firstEmpty = target.slots.find((s) => !s.cargo)?.id ?? "A1";
      return {
        ...prev,
        activeTruckId: truckId,
        selectedSlotId: firstEmpty,
      };
    });
  }, []);

  const findNextEmptySlot = (slots: CargoSlot[], afterId: string): string => {
    const idx = slots.findIndex((s) => s.id === afterId);
    for (let i = idx + 1; i < slots.length; i++) {
      if (!slots[i].cargo) return slots[i].id;
    }
    for (let i = 0; i < idx; i++) {
      if (!slots[i].cargo) return slots[i].id;
    }
    return afterId;
  };

  const assignShipmentToSlot = useCallback(
    (shipmentId: string, explicitSlotId?: string): boolean => {
      const shipment = state.queuedShipments.find((s) => s.id === shipmentId);
      if (!shipment) return false;

      const truck = activeTruck;
      const targetSlotId =
        explicitSlotId ??
        (truck.slots.find((s) => s.id === state.selectedSlotId && !s.cargo)?.id ??
          truck.slots.find((s) => !s.cargo)?.id);

      if (!targetSlotId) {
        pushToast({
          title: `No empty slots on ${truck.id}`,
          description: "Unload a slot or switch to another Isuzu vehicle.",
          variant: "warning",
        });
        return false;
      }

      const targetSlot = truck.slots.find((s) => s.id === targetSlotId);
      if (!targetSlot || targetSlot.cargo) {
        pushToast({
          title: `Slot ${targetSlotId} is already occupied`,
          description: "Select an empty slot with '+' first.",
          variant: "warning",
        });
        return false;
      }

      const currentLoad = getTruckLoadKg(truck);
      if (currentLoad + shipment.weightKg > truck.maxCapacityKg) {
        pushToast({
          title: "Capacity limit exceeded",
          description: `Adding ${shipment.weightKg.toLocaleString()} kg exceeds ${truck.model}'s ${(
            truck.maxCapacityKg / 1000
          ).toFixed(1)} ton max payload.`,
          variant: "destructive",
        });
        return false;
      }

      const nowTime = formatCurrentTime();
      const newCargo: CargoSlotItem = {
        shipmentCode: shipment.id,
        title: shipment.title,
        customer: shipment.customer,
        weightKg: shipment.weightKg,
        cargoType: shipment.cargoType,
        quantity: shipment.quantity,
        priority: shipment.priority,
        method: shipment.method,
        originCode: shipment.originCode,
        destinationCode: shipment.destinationCode,
        condition: shipment.condition,
        notes: shipment.notes,
        loadedAt: nowTime,
      };

      const prevTruckId = truck.id;
      setState((prev) => {
        const updatedTrucks = prev.trucks.map((t) => {
          if (t.id !== prevTruckId) return t;
          const updatedSlots = t.slots.map((s) =>
            s.id === targetSlotId ? { ...s, cargo: newCargo } : s
          );
          return { ...t, slots: updatedSlots };
        });

        const updatedTruck = updatedTrucks.find((t) => t.id === prevTruckId)!;
        const nextSlot = prev.settings.autoAdvanceSlot
          ? findNextEmptySlot(updatedTruck.slots, targetSlotId)
          : targetSlotId;

        const unitLabel =
          shipment.cargoType === "Box"
            ? "boxes"
            : shipment.cargoType === "Crate"
            ? "crates"
            : "pallets";

        const newAct: ActivityItem = {
          id: `act-${Date.now()}`,
          time: nowTime,
          message: `Shipment ${shipment.id} assigned`,
          detail: `${shipment.quantity} ${unitLabel}, ${shipment.weightKg.toLocaleString()} kg to ${targetSlotId}`,
          type: "assign",
          truckId: prevTruckId,
          slotId: targetSlotId,
        };

        return {
          ...prev,
          trucks: updatedTrucks,
          queuedShipments: prev.queuedShipments.filter((s) => s.id !== shipment.id),
          activities: [newAct, ...prev.activities],
          selectedSlotId: nextSlot,
        };
      });

      flashSlot(targetSlotId);

      const newPct = Math.round(((currentLoad + shipment.weightKg) / truck.maxCapacityKg) * 100);
      pushToast({
        title: `Assigned ${shipment.id} to ${targetSlotId}`,
        description: `${truck.id} load is now ${((currentLoad + shipment.weightKg) / 1000).toFixed(
          1
        )} tons (${newPct}%).`,
        variant: newPct >= state.settings.overloadWarningPct ? "warning" : "success",
        undoAction: () => {
          setState((prev) => {
            const revertedTrucks = prev.trucks.map((t) => {
              if (t.id !== prevTruckId) return t;
              return {
                ...t,
                slots: t.slots.map((s) => (s.id === targetSlotId ? { ...s, cargo: null } : s)),
              };
            });
            return {
              ...prev,
              trucks: revertedTrucks,
              queuedShipments: [shipment, ...prev.queuedShipments],
              selectedSlotId: targetSlotId,
              activities: [
                {
                  id: `act-undo-${Date.now()}`,
                  time: formatCurrentTime(),
                  message: `Reverted ${shipment.id} from ${targetSlotId}`,
                  detail: `Returned ${shipment.weightKg.toLocaleString()} kg to dock queue`,
                  type: "unload",
                  truckId: prevTruckId,
                  slotId: targetSlotId,
                },
                ...prev.activities,
              ],
            };
          });
        },
      });

      return true;
    },
    [state.queuedShipments, state.selectedSlotId, state.settings, activeTruck, flashSlot, pushToast]
  );

  const unloadSlot = useCallback(
    (slotId: string, truckId?: string) => {
      const targetTruckId = truckId ?? activeTruck.id;
      const truck = state.trucks.find((t) => t.id === targetTruckId);
      if (!truck) return;
      const slot = truck.slots.find((s) => s.id === slotId);
      if (!slot?.cargo) return;

      const cargo = slot.cargo;
      const returnedShipment: QueuedShipment = {
        id: cargo.shipmentCode,
        title: cargo.title,
        customer: cargo.customer,
        originCode: cargo.originCode,
        originCity: truck.route.originCity,
        destinationCode: cargo.destinationCode,
        destinationCity: truck.route.destinationCity,
        cargoType: cargo.cargoType,
        quantity: cargo.quantity,
        weightKg: cargo.weightKg,
        method: cargo.method,
        priority: cargo.priority,
        condition: cargo.condition,
        notes: cargo.notes,
        createdAt: formatCurrentTime(),
      };

      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) =>
          t.id === targetTruckId
            ? {
                ...t,
                slots: t.slots.map((s) => (s.id === slotId ? { ...s, cargo: null } : s)),
              }
            : t
        ),
        queuedShipments: [returnedShipment, ...prev.queuedShipments],
        selectedSlotId: slotId,
        activities: [
          {
            id: `act-unload-${Date.now()}`,
            time: formatCurrentTime(),
            message: `Unloaded ${cargo.shipmentCode} from ${slotId}`,
            detail: `${cargo.weightKg.toLocaleString()} kg returned to staging queue`,
            type: "unload",
            truckId: targetTruckId,
            slotId,
          },
          ...prev.activities,
        ],
      }));

      pushToast({
        title: `Unloaded ${cargo.shipmentCode} from ${slotId}`,
        description: "Shipment returned to the pending assignment queue.",
        variant: "default",
      });
    },
    [activeTruck.id, state.trucks, pushToast]
  );

  const moveSlotCargo = useCallback(
    (fromSlotId: string, toSlotId: string): boolean => {
      if (fromSlotId === toSlotId) return false;
      const fromSlot = activeTruck.slots.find((s) => s.id === fromSlotId);
      const toSlot = activeTruck.slots.find((s) => s.id === toSlotId);
      if (!fromSlot?.cargo || !toSlot) return false;

      const movingCargo = fromSlot.cargo;
      const swapCargo = toSlot.cargo;

      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) => {
          if (t.id !== activeTruck.id) return t;
          return {
            ...t,
            slots: t.slots.map((s) => {
              if (s.id === fromSlotId) return { ...s, cargo: swapCargo };
              if (s.id === toSlotId) return { ...s, cargo: movingCargo };
              return s;
            }),
          };
        }),
        activities: [
          {
            id: `act-move-${Date.now()}`,
            time: formatCurrentTime(),
            message: swapCargo
              ? `Swapped ${fromSlotId} ↔ ${toSlotId}`
              : `Moved ${movingCargo.shipmentCode} to ${toSlotId}`,
            detail: swapCargo
              ? `${movingCargo.shipmentCode} and ${swapCargo.shipmentCode} rebalanced`
              : `Relocated from ${fromSlotId} (${movingCargo.weightKg.toLocaleString()} kg)`,
            type: "assign",
            truckId: activeTruck.id,
            slotId: toSlotId,
          },
          ...prev.activities,
        ],
      }));

      flashSlot(toSlotId);
      pushToast({
        title: swapCargo
          ? `Swapped ${fromSlotId} & ${toSlotId}`
          : `Relocated ${movingCargo.shipmentCode}`,
        description: swapCargo
          ? "Cargo positions updated on trailer bay."
          : `Moved from ${fromSlotId} → ${toSlotId}.`,
        variant: "success",
      });
      return true;
    },
    [activeTruck, flashSlot, pushToast]
  );

  const updateSlotCondition = useCallback(
    (slotId: string, condition: SlotCondition) => {
      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) =>
          t.id === activeTruck.id
            ? {
                ...t,
                slots: t.slots.map((s) =>
                  s.id === slotId && s.cargo ? { ...s, cargo: { ...s.cargo, condition } } : s
                ),
              }
            : t
        ),
      }));
      pushToast({
        title: `Slot ${slotId} status updated`,
        description:
          condition === "verified"
            ? "Marked as verified & strapped."
            : condition === "temperature"
            ? "Marked as temperature-controlled."
            : "Flagged for pre-departure inspection.",
        variant: "success",
      });
    },
    [activeTruck.id, pushToast]
  );

  const changeTruckDriver = useCallback(
    (truckId: string, driverId: string) => {
      const nextDriver = state.drivers.find((d) => d.id === driverId);
      if (!nextDriver) return;
      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) => (t.id === truckId ? { ...t, driverId } : t)),
        drivers: prev.drivers.map((d) =>
          d.id === driverId ? { ...d, status: "On Duty" } : d
        ),
        activities: [
          {
            id: `act-drv-${Date.now()}`,
            time: formatCurrentTime(),
            message: `Driver changed to ${nextDriver.name}`,
            detail: `Assigned to ${truckId} · ${nextDriver.license}`,
            type: "driver",
            truckId,
          },
          ...prev.activities,
        ],
      }));
      pushToast({
        title: `Driver updated for ${truckId}`,
        description: `${nextDriver.name} is now assigned to this Isuzu vehicle.`,
        variant: "success",
      });
    },
    [state.drivers, pushToast]
  );

  const updateTruckRoute = useCallback(
    (
      truckId: string,
      updates: Partial<RouteInfo> & { dock?: string; startedAt?: string }
    ) => {
      setState((prev) => {
        const target = prev.trucks.find((t) => t.id === truckId);
        if (!target) return prev;
        const nextOrigin = updates.originCode ?? target.route.originCode;
        const nextDest = updates.destinationCode ?? target.route.destinationCode;
        return {
          ...prev,
          trucks: prev.trucks.map((t) =>
            t.id === truckId
              ? {
                  ...t,
                  dock: updates.dock ?? t.dock,
                  startedAt: updates.startedAt ?? t.startedAt,
                  route: {
                    ...t.route,
                    ...updates,
                  },
                }
              : t
          ),
          activities: [
            {
              id: `act-route-${Date.now()}`,
              time: formatCurrentTime(),
              message: `Route updated (${nextOrigin} → ${nextDest})`,
              detail: `${updates.dock ?? target.dock} · Departure ${updates.startedAt ?? target.startedAt}`,
              type: "route",
              truckId,
            },
            ...prev.activities,
          ],
        };
      });
      pushToast({
        title: `Route saved for ${truckId}`,
        description: "Dispatch schedule and corridor telemetry updated.",
        variant: "success",
      });
    },
    [pushToast]
  );

  const dispatchTruck = useCallback(
    (truckId: string, nextStatus: TruckStatus = "In Transit") => {
      const truck = state.trucks.find((t) => t.id === truckId);
      if (!truck) return;
      const loadKg = getTruckLoadKg(truck);
      const count = truck.slots.filter((s) => s.cargo).length;

      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) =>
          t.id === truckId
            ? {
                ...t,
                status: nextStatus,
                route: {
                  ...t.route,
                  progressPercent:
                    nextStatus === "In Transit"
                      ? Math.max(t.route.progressPercent, 12)
                      : t.route.progressPercent,
                  speedMph: nextStatus === "In Transit" ? 56 : 0,
                },
              }
            : t
        ),
        activities: [
          {
            id: `act-disp-${Date.now()}`,
            time: formatCurrentTime(),
            message: `${truckId} dispatched (${nextStatus})`,
            detail: `${count} cargo slots · ${(loadKg / 1000).toFixed(1)} tons on ${truck.route.originCode} → ${truck.route.destinationCode}`,
            type: "dispatch",
            truckId,
          },
          ...prev.activities,
        ],
        notifications: [
          {
            id: `not-${Date.now()}`,
            title: `${truckId} (${truck.series}) dispatched`,
            description: `${count} active slots (${(loadKg / 1000).toFixed(1)} tons) cleared from ${truck.dock}.`,
            time: "Just now",
            severity: "success",
            read: false,
            truckId,
          },
          ...prev.notifications,
        ],
      }));

      pushToast({
        title: `${truckId} cleared for dispatch`,
        description: `Status set to ${nextStatus} with ${count} verified cargo bays.`,
        variant: "success",
      });
    },
    [state.trucks, pushToast]
  );

  const createShipment = useCallback(
    (shipment: Omit<QueuedShipment, "id" | "createdAt">): QueuedShipment => {
      const numericId = 9850 + Math.floor(Math.random() * 140);
      const created: QueuedShipment = {
        ...shipment,
        id: `SHP-${numericId}`,
        createdAt: formatCurrentTime(),
      };
      setState((prev) => ({
        ...prev,
        queuedShipments: [created, ...prev.queuedShipments],
        activities: [
          {
            id: `act-new-${Date.now()}`,
            time: formatCurrentTime(),
            message: `New shipment ${created.id} registered`,
            detail: `${created.quantity} ${created.cargoType.toLowerCase()}s, ${created.weightKg.toLocaleString()} kg (${created.originCode} → ${created.destinationCode})`,
            type: "checkin",
            truckId: prev.activeTruckId,
          },
          ...prev.activities,
        ],
      }));
      pushToast({
        title: `Created ${created.id}`,
        description: `Added to pending dock queue (${created.weightKg.toLocaleString()} kg).`,
        variant: "success",
      });
      return created;
    },
    [pushToast]
  );

  const deleteQueuedShipment = useCallback(
    (shipmentId: string) => {
      setState((prev) => ({
        ...prev,
        queuedShipments: prev.queuedShipments.filter((s) => s.id !== shipmentId),
      }));
      pushToast({
        title: `Removed ${shipmentId}`,
        description: "Shipment cancelled from staging queue.",
        variant: "default",
      });
    },
    [pushToast]
  );

  // --- OBD-II / J1939 Diagnostic Actions ---
  const scanVehicleObd = useCallback(
    (truckId: string) => {
      const now = formatCurrentTime();
      const target = state.trucks.find((t) => t.id === truckId);
      if (!target) return;

      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) => {
          if (t.id !== truckId) return t;
          const jitterRpm = t.route.speedMph > 0 ? Math.max(1200, t.obd.rpm + (Math.round(Math.random() * 90) - 45)) : 710;
          return {
            ...t,
            obd: {
              ...t.obd,
              lastScan: now,
              rpm: jitterRpm,
            },
            gps: {
              ...t.gps,
              lastPing: "Just now",
            },
          };
        }),
        activities: [
          {
            id: `act-scan-${Date.now()}`,
            time: now,
            message: `OBD-II ECU scan completed on ${truckId}`,
            detail: `${target.obd.activeCodes.length} active DTC(s) · ${target.obd.protocol}`,
            type: "obd",
            truckId,
          },
          ...prev.activities,
        ],
      }));

      pushToast({
        title: `ECU Scan Complete — ${truckId}`,
        description:
          target.obd.activeCodes.length === 0
            ? `${target.model} ECU reports 0 active fault codes.`
            : `${target.obd.activeCodes.length} active DTC code(s) read via ${target.obd.protocol}.`,
        variant: target.obd.activeCodes.length > 0 ? "warning" : "success",
      });
    },
    [state.trucks, pushToast]
  );

  const clearVehicleDtc = useCallback(
    (truckId: string, code: string) => {
      const now = formatCurrentTime();
      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) =>
          t.id === truckId
            ? {
                ...t,
                obd: {
                  ...t.obd,
                  lastScan: now,
                  activeCodes: t.obd.activeCodes.filter((c) => c.code !== code),
                },
              }
            : t
        ),
        activities: [
          {
            id: `act-clr-${Date.now()}`,
            time: now,
            message: `Cleared OBD DTC ${code} on ${truckId}`,
            detail: `MIL lamp reset via Isuzu OBD-II remote command`,
            type: "obd",
            truckId,
          },
          ...prev.activities,
        ],
      }));
      pushToast({
        title: `Cleared ${code} on ${truckId}`,
        description: "ECM trouble code memory cleared and MIL status updated.",
        variant: "success",
      });
    },
    [pushToast]
  );

  const acknowledgeDtc = useCallback(
    (truckId: string, code: string) => {
      const now = formatCurrentTime();
      const targetTruck = state.trucks.find((t) => t.id === truckId);
      const woId = `WO-${String(Date.now()).slice(-4)}`;
      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) =>
          t.id === truckId
            ? {
                ...t,
                obd: {
                  ...t.obd,
                  activeCodes: t.obd.activeCodes.map((c) =>
                    c.code === code ? { ...c, acknowledged: true } : c
                  ),
                },
              }
            : t
        ),
        emergencyAlerts: prev.emergencyAlerts.map((a) =>
          a.truckId === truckId && a.dtcCode === code && a.status === "Active"
            ? { ...a, status: "Acknowledged" }
            : a
        ),
        activities: [
          {
            id: `act-wo-${Date.now()}`,
            time: now,
            message: `Workshop ticket ${woId} logged for ${code}`,
            detail: `${truckId}${targetTruck ? ` (${targetTruck.plate})` : ""} · Maintenance bay notified`,
            type: "obd" as const,
            truckId,
          },
          ...prev.activities,
        ].slice(0, 30),
        notifications: [
          {
            id: `not-wo-${Date.now()}`,
            title: `Workshop Ticket ${woId} · ${code}`,
            description: `Maintenance bay notified for ${truckId}${targetTruck ? ` (${targetTruck.plate})` : ""}.`,
            time: "Just now",
            severity: "info" as const,
            read: false,
            truckId,
            openObd: true,
          },
          ...prev.notifications,
        ].slice(0, 20),
      }));
      pushToast({
        title: `Service ticket ${woId} logged for ${code}`,
        description: `Workshop bay notified for ${truckId} & logged to Recent Activity.`,
        variant: "success",
      });
    },
    [state.trucks, pushToast]
  );

  const runDpfRegen = useCallback(
    (truckId: string) => {
      const now = formatCurrentTime();
      setState((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) =>
          t.id === truckId
            ? {
                ...t,
                obd: {
                  ...t.obd,
                  lastScan: now,
                  dpfSootPct: 12,
                  activeCodes: t.obd.activeCodes.filter((c) => c.code !== "P2002"),
                },
              }
            : t
        ),
        activities: [
          {
            id: `act-dpf-${Date.now()}`,
            time: now,
            message: `DPD Regeneration completed on ${truckId}`,
            detail: "Soot load burned down to 12% · DTC P2002 cleared",
            type: "obd",
            truckId,
          },
          ...prev.activities,
        ],
      }));
      pushToast({
        title: `Isuzu DPD Regen Complete (${truckId})`,
        description: "DPF soot load reduced to 12% and P2002 fault cleared.",
        variant: "success",
      });
    },
    [pushToast]
  );

  const simulateGpsTick = useCallback(() => {
    const clockStr = formatLiveClock();
    setLastHeartbeat(clockStr);
    setLiveTickCount((c) => c + 1);

    setState((prev) => {
      const nextTrucks = prev.trucks.map((t) => {
        const isMoving = t.status === "In Transit";
        const speedDelta = isMoving ? Math.round(Math.random() * 6) - 3 : 0;
        const nextSpeed = isMoving
          ? Math.max(46, Math.min(92, t.route.speedMph + speedDelta))
          : 0;

        // Smooth realistic OBD-II sensor PID fluctuations
        const rpmJitter = isMoving
          ? Math.round((Math.random() - 0.5) * 110 + speedDelta * 18)
          : Math.round((Math.random() - 0.5) * 28);
        const nextRpm = isMoving
          ? Math.max(1250, Math.min(2480, t.obd.rpm + rpmJitter))
          : Math.max(680, Math.min(760, t.obd.rpm + rpmJitter));

        const boostJitter = isMoving
          ? Math.round((Math.random() - 0.5) * 14 + speedDelta * 2)
          : Math.round((Math.random() - 0.5) * 3);
        const nextBoost = isMoving
          ? Math.max(68, Math.min(168, t.obd.boostKpa + boostJitter))
          : Math.max(14, Math.min(26, t.obd.boostKpa + boostJitter));

        const railJitter = isMoving
          ? Math.round((Math.random() - 0.5) * 8)
          : Math.round((Math.random() - 0.5) * 3);
        const nextRail = isMoving
          ? Math.max(62, Math.min(164, t.obd.fuelRailMpa + railJitter))
          : Math.max(42, Math.min(60, t.obd.fuelRailMpa + railJitter));

        const oilJitter = Math.round((Math.random() - 0.5) * 12);
        const nextOil = isMoving
          ? Math.max(330, Math.min(460, t.obd.oilPressureKpa + oilJitter))
          : Math.max(260, Math.min(320, t.obd.oilPressureKpa + oilJitter));

        const is24v = t.obd.batteryVolts > 18;
        const voltDelta = (Math.random() - 0.5) * 0.2;
        const nextVolts = Number(
          Math.max(
            is24v ? 22.8 : 13.6,
            Math.min(is24v ? 28.3 : 14.3, t.obd.batteryVolts + voltDelta)
          ).toFixed(1)
        );

        const tempJitter = Math.random() > 0.72 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const nextCoolant = Math.max(76, Math.min(97, t.obd.coolantTempC + tempJitter));
        const nextBayTemp = Number(
          Math.max(2.0, Math.min(21.0, t.tempCelsius + (Math.random() - 0.5) * 0.2)).toFixed(1)
        );
        const nextLoadPct = isMoving
          ? Math.max(42, Math.min(88, t.obd.engineLoadPct + Math.round((Math.random() - 0.5) * 6)))
          : Math.max(16, Math.min(28, t.obd.engineLoadPct + Math.round((Math.random() - 0.5) * 3)));

        if (!isMoving) {
          return {
            ...t,
            tempCelsius: nextBayTemp,
            gps: {
              ...t.gps,
              lastPing: "Just now",
            },
            obd: {
              ...t.obd,
              lastScan: clockStr,
              rpm: nextRpm,
              boostKpa: nextBoost,
              fuelRailMpa: nextRail,
              oilPressureKpa: nextOil,
              batteryVolts: nextVolts,
              coolantTempC: nextCoolant,
              engineLoadPct: nextLoadPct,
            },
          };
        }

        // Smooth realistic GPS movement along heading inside Indonesia corridor
        const rad = ((t.gps.headingDeg - 90) * Math.PI) / 180;
        const dLat = -Math.sin(rad) * 0.012;
        const dLng = Math.cos(rad) * 0.016;
        const nextLat = Number(Math.max(-9.0, Math.min(4.8, t.gps.lat + dLat)).toFixed(4));
        const nextLng = Number(Math.max(96.0, Math.min(140.0, t.gps.lng + dLng)).toFixed(4));
        const proj = projectIndonesia(nextLat, nextLng);

        return {
          ...t,
          odometerKm: t.odometerKm + (Math.random() > 0.65 ? 1 : 0),
          tempCelsius: nextBayTemp,
          route: {
            ...t.route,
            progressPercent: t.route.progressPercent >= 98 ? 15 : t.route.progressPercent + (Math.random() > 0.78 ? 1 : 0),
            speedMph: nextSpeed,
          },
          gps: {
            ...t.gps,
            lat: nextLat,
            lng: nextLng,
            mapX: proj.x,
            mapY: proj.y,
            lastPing: "Just now",
          },
          obd: {
            ...t.obd,
            lastScan: clockStr,
            rpm: nextRpm,
            boostKpa: nextBoost,
            fuelRailMpa: nextRail,
            oilPressureKpa: nextOil,
            batteryVolts: nextVolts,
            coolantTempC: nextCoolant,
            engineLoadPct: nextLoadPct,
          },
        };
      });

      // Push rolling sample into live telemetry history
      setTelemetryHistory((histPrev) => {
        const updated: Record<string, TelemetrySample[]> = { ...histPrev };
        for (const nt of nextTrucks) {
          const prevSeries = updated[nt.id] ?? [];
          updated[nt.id] = [
            ...prevSeries.slice(-17),
            {
              time: clockStr,
              rpm: nt.obd.rpm,
              speedKmh: nt.route.speedMph,
              boostKpa: nt.obd.boostKpa,
              fuelRailMpa: nt.obd.fuelRailMpa,
              coolantTempC: nt.obd.coolantTempC,
            },
          ];
        }
        return updated;
      });

      return {
        ...prev,
        trucks: nextTrucks,
      };
    });
  }, []);

  // Global Real-Time Telemetry Stream Loop (every 2.5s when Live Telemetry is enabled)
  useEffect(() => {
    if (!state.settings.liveTelemetryUpdates) return;
    const timer = window.setInterval(() => {
      simulateGpsTick();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [state.settings.liveTelemetryUpdates, simulateGpsTick]);

  // Periodic live telemetry checkpoint log in Recent Activity (every ~22s)
  useEffect(() => {
    if (!state.settings.liveTelemetryUpdates) return;
    const logTimer = window.setInterval(() => {
      setState((prev) => {
        const active = prev.trucks.find((t) => t.id === prev.activeTruckId) ?? prev.trucks[0];
        const nowStr = formatCurrentTime();
        const event: ActivityItem = {
          id: `act-live-${Date.now()}`,
          time: nowStr,
          message: `OBD-II & GPS heartbeat · ${active.plate}`,
          detail: `${active.route.speedMph} km/h · ${active.obd.rpm.toLocaleString()} rpm · Bay ${active.tempCelsius.toFixed(1)}°C`,
          type: "obd",
          truckId: active.id,
        };
        return {
          ...prev,
          activities: [event, ...prev.activities].slice(0, 28),
        };
      });
    }, 22000);
    return () => window.clearInterval(logTimer);
  }, [state.settings.liveTelemetryUpdates]);

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  const lookupDtc = useCallback(
    (code: string): ObdDtcDefinition => {
      const upper = code.trim().toUpperCase();
      return (
        state.obdCatalog.find((c) => c.code.toUpperCase() === upper) ?? getDtcInfo(upper)
      );
    },
    [state.obdCatalog]
  );

  const addObdCode = useCallback(
    (def: ObdDtcDefinition): boolean => {
      const cleanCode = def.code.trim().toUpperCase();
      if (!cleanCode) return false;
      if (state.obdCatalog.some((c) => c.code.toUpperCase() === cleanCode)) {
        pushToast({
          title: `Code ${cleanCode} already exists`,
          description: "Edit the existing master record or use a unique DTC code.",
          variant: "warning",
        });
        return false;
      }
      const normalized: ObdDtcDefinition = { ...def, code: cleanCode };
      setState((prev) => ({
        ...prev,
        obdCatalog: [normalized, ...prev.obdCatalog],
      }));
      pushToast({
        title: `Added Master Code ${cleanCode}`,
        description: `Severity set to ${normalized.severity} (${normalized.subsystem}).`,
        variant: "success",
      });
      return true;
    },
    [state.obdCatalog, pushToast]
  );

  const updateObdCode = useCallback(
    (code: string, patch: Partial<ObdDtcDefinition>) => {
      const targetUpper = code.toUpperCase();
      setState((prev) => ({
        ...prev,
        obdCatalog: prev.obdCatalog.map((c) =>
          c.code.toUpperCase() === targetUpper ? { ...c, ...patch, code: c.code } : c
        ),
      }));
      pushToast({
        title: `Updated ${targetUpper}`,
        description: patch.severity
          ? `Severity changed to ${patch.severity} across all fleet views.`
          : "Master OBD-II code definition saved.",
        variant: "success",
      });
    },
    [pushToast]
  );

  const deleteObdCode = useCallback(
    (code: string) => {
      const targetUpper = code.toUpperCase();
      setState((prev) => ({
        ...prev,
        obdCatalog: prev.obdCatalog.filter((c) => c.code.toUpperCase() !== targetUpper),
      }));
      pushToast({
        title: `Deleted code ${targetUpper}`,
        description: "Removed from Master OBD-II dictionary.",
        variant: "default",
      });
    },
    [pushToast]
  );

  const addHubCode = useCallback(
    (hub: HubMasterItem): boolean => {
      const cleanCode = hub.code.trim().toUpperCase();
      if (!cleanCode) return false;
      if (state.hubCatalog.some((h) => h.code.toUpperCase() === cleanCode)) {
        pushToast({
          title: `Hub code ${cleanCode} already exists`,
          description: "Use a unique 3-letter Indonesian hub code.",
          variant: "warning",
        });
        return false;
      }
      setState((prev) => ({
        ...prev,
        hubCatalog: [{ ...hub, code: cleanCode }, ...prev.hubCatalog],
      }));
      pushToast({
        title: `Registered Hub ${cleanCode} (${hub.city})`,
        description: `${hub.region} · ${hub.docks} docks configured.`,
        variant: "success",
      });
      return true;
    },
    [state.hubCatalog, pushToast]
  );

  const deleteHubCode = useCallback(
    (code: string) => {
      setState((prev) => ({
        ...prev,
        hubCatalog: prev.hubCatalog.filter((h) => h.code !== code),
      }));
      pushToast({
        title: `Removed hub ${code}`,
        description: "Hub master record deleted.",
        variant: "default",
      });
    },
    [pushToast]
  );

  const triggerDummyFailure = useCallback(
    (type: EmergencyAlertType, targetTruckId?: string): EmergencyAlert => {
      const defaultId =
        type === "accident" ? "ISZ-204" : type === "urgent_dtc" ? "ISZ-309" : "ISZ-615";
      const truck =
        state.trucks.find((t) => t.id === (targetTruckId || defaultId)) ?? state.trucks[0];
      const driver =
        state.drivers.find((d) => d.id === truck.driverId) ?? state.drivers[0];
      const nowStr = formatCurrentTime();
      const id = `emg-${type}-${Date.now()}`;

      let alert: EmergencyAlert;
      if (type === "accident") {
        const prevSpeed = Math.max(58, truck.route.speedMph);
        alert = {
          id,
          type: "accident",
          severity: "EMERGENCY",
          truckId: truck.id,
          plate: truck.plate,
          model: truck.model,
          driverName: driver.name,
          driverPhone: driver.phone,
          location: truck.route.currentLocation,
          lat: truck.gps.lat,
          lng: truck.gps.lng,
          title: `ACCIDENT DETECTED — 3.4G Impact on ${truck.plate} (Geotab GO9)`,
          summary: `Geotab GO9 3-axis accelerometer detected sudden 3.4G frontal deceleration (${prevSpeed} → 0 km/h in 1.1s) with abrupt CAN shock trigger. Immediate driver safety check & emergency dispatch required.`,
          dtcCode: "U0100",
          gForce: 3.4,
          speedBeforeKmh: prevSpeed,
          speedAfterKmh: 0,
          coolantTempC: truck.obd.coolantTempC,
          fuelRailMpa: 0,
          triggeredAt: nowStr,
          triggeredEpochMs: Date.now(),
          status: "Active",
          isDummySimulation: true,
          responseChecklist: [
            { id: "s1", label: `Call driver ${driver.name} (${driver.phone}) immediately`, done: false },
            { id: "s2", label: "Verify injuries & contact Jasa Marga / Emergency 112 if needed", done: false },
            { id: "s3", label: "Dispatch Astra Isuzu Towing & Regional Fleet Patrol", done: false },
            { id: "s4", label: "Secure cargo manifest & log Geotab crash telemetry for insurance", done: false },
          ],
        };
      } else if (type === "urgent_dtc") {
        alert = {
          id,
          type: "urgent_dtc",
          severity: "CRITICAL",
          truckId: truck.id,
          plate: truck.plate,
          model: truck.model,
          driverName: driver.name,
          driverPhone: driver.phone,
          location: truck.route.currentLocation,
          lat: truck.gps.lat,
          lng: truck.gps.lng,
          title: `URGENT ENGINE FAILURE — P0087 & Overheat 114°C on ${truck.plate}`,
          summary: `Geotab GO9 FaultData reported critical Fuel Rail Pressure collapse (58 MPa) paired with Coolant Overheat (114°C · P0118). High risk of engine seizure — driver must pull over immediately.`,
          dtcCode: "P0087",
          speedBeforeKmh: truck.route.speedMph,
          speedAfterKmh: Math.min(25, truck.route.speedMph),
          coolantTempC: 114,
          fuelRailMpa: 58,
          triggeredAt: nowStr,
          triggeredEpochMs: Date.now(),
          status: "Active",
          isDummySimulation: true,
          responseChecklist: [
            { id: "s1", label: `Instruct ${driver.name} to pull over & shut down engine immediately`, done: false },
            { id: "s2", label: "Confirm hazard triangles placed on shoulder", done: false },
            { id: "s3", label: "Dispatch Astra Isuzu Mobile Workshop (Coolant + SCV Kit)", done: false },
            { id: "s4", label: "Arrange relief Isuzu truck for urgent cargo transfer", done: false },
          ],
        };
      } else {
        alert = {
          id,
          type: "can_loss",
          severity: "CRITICAL",
          truckId: truck.id,
          plate: truck.plate,
          model: truck.model,
          driverName: driver.name,
          driverPhone: driver.phone,
          location: truck.route.currentLocation,
          lat: truck.gps.lat,
          lng: truck.gps.lng,
          title: `URGENT CAN-BUS LOSS — U0100 ECM Disconnect / Tamper on ${truck.plate}`,
          summary: `Geotab GO9 lost SAE J1939 CAN-Bus heartbeat with Isuzu ECM (U0100 · SPN 639 / FMI 2). Possible harness failure, battery bus drop, or unauthorized OBD unplug event.`,
          dtcCode: "U0100",
          coolantTempC: truck.obd.coolantTempC,
          fuelRailMpa: truck.obd.fuelRailMpa,
          triggeredAt: nowStr,
          triggeredEpochMs: Date.now(),
          status: "Active",
          isDummySimulation: true,
          responseChecklist: [
            { id: "s1", label: `Verify live location & contact ${driver.name}`, done: false },
            { id: "s2", label: "Inspect Geotab GO9 9-pin/OBD harness seating & 24V fuse", done: false },
            { id: "s3", label: "Run remote Geotab Device Ping & ECU re-sync", done: false },
            { id: "s4", label: "Log security/tamper check if device was unplugged", done: false },
          ],
        };
      }

      if (alertSoundEnabled) {
        playUrgentAlertChime(type === "accident");
      }

      setState((prev) => ({
        ...prev,
        activeTruckId: truck.id,
        trucks: prev.trucks.map((t) => {
          if (t.id !== truck.id) return t;
          const existingCodes = t.obd.activeCodes;
          const nextCodes = [...existingCodes];
          const injectCode = (code: string, freezeTemp: number) => {
            if (!nextCodes.some((c) => c.code === code)) {
              nextCodes.unshift({
                code,
                detectedAt: nowStr,
                freezeRpm: type === "accident" ? 0 : Math.max(1850, t.obd.rpm),
                freezeSpeedMph: type === "accident" ? 0 : t.route.speedMph,
                freezeTempC: freezeTemp,
                occurrences: 1,
                acknowledged: false,
              });
            }
          };

          if (type === "accident") {
            injectCode("U0100", t.obd.coolantTempC);
            return {
              ...t,
              status: "Maintenance",
              route: { ...t.route, speedMph: 0 },
              obd: {
                ...t.obd,
                rpm: 0,
                fuelRailMpa: 0,
                lastScan: nowStr,
                activeCodes: nextCodes,
              },
            };
          }
          if (type === "urgent_dtc") {
            injectCode("P0087", 114);
            injectCode("P0118", 114);
            return {
              ...t,
              status: "Maintenance",
              route: { ...t.route, speedMph: Math.min(20, t.route.speedMph) },
              obd: {
                ...t.obd,
                coolantTempC: 114,
                fuelRailMpa: 58,
                lastScan: nowStr,
                activeCodes: nextCodes,
              },
            };
          }
          injectCode("U0100", t.obd.coolantTempC);
          return {
            ...t,
            obd: {
              ...t.obd,
              lastScan: nowStr,
              activeCodes: nextCodes,
            },
          };
        }),
        emergencyAlerts: [alert, ...prev.emergencyAlerts].slice(0, 20),
        notifications: [
          {
            id: `not-emg-${Date.now()}`,
            title: alert.title,
            description: `${alert.location} · Driver: ${alert.driverName}`,
            time: "Just now",
            severity: "warning" as const,
            read: false,
            truckId: truck.id,
            openObd: true,
          },
          ...prev.notifications,
        ].slice(0, 20),
        activities: [
          {
            id: `act-emg-${Date.now()}`,
            time: nowStr,
            message: alert.title,
            detail: alert.location,
            type: "obd" as const,
            truckId: truck.id,
          },
          ...prev.activities,
        ].slice(0, 30),
      }));

      pushToast({
        title: type === "accident" ? "EMERGENCY: Accident Detected (Dummy)" : "URGENT OBD Failure Triggered",
        description: `${truck.id} (${truck.plate}) at ${truck.route.currentLocation}`,
        variant: "destructive",
      });

      return alert;
    },
    [state.trucks, state.drivers, alertSoundEnabled, pushToast]
  );

  const acknowledgeEmergencyAlert = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        emergencyAlerts: prev.emergencyAlerts.map((a) =>
          a.id === id && a.status === "Active" ? { ...a, status: "Acknowledged" } : a
        ),
      }));
      pushToast({
        title: "Emergency Alert Acknowledged",
        description: "Incident moved to active operator supervision.",
        variant: "warning",
      });
    },
    [pushToast]
  );

  const dispatchEmergencyResponse = useCallback(
    (id: string) => {
      const found = state.emergencyAlerts.find((a) => a.id === id);
      setState((prev) => ({
        ...prev,
        emergencyAlerts: prev.emergencyAlerts.map((a) =>
          a.id === id
            ? {
                ...a,
                status: "Dispatched",
                responseChecklist: a.responseChecklist.map((c, idx) =>
                  idx <= 2 ? { ...c, done: true } : c
                ),
              }
            : a
        ),
        activities: found
          ? [
              {
                id: `act-disp-emg-${Date.now()}`,
                time: formatCurrentTime(),
                message: `Emergency unit dispatched to ${found.plate}`,
                detail: `${found.location} · Astra Isuzu Mobile Siaga`,
                type: "obd",
                truckId: found.truckId,
              },
              ...prev.activities,
            ]
          : prev.activities,
      }));
      pushToast({
        title: "Emergency Response Dispatched",
        description: found
          ? `Astra Isuzu Mobile Service & Towing routed to ${found.plate} (${found.location}).`
          : "Emergency response unit dispatched.",
        variant: "success",
      });
    },
    [state.emergencyAlerts, pushToast]
  );

  const toggleIncidentChecklistItem = useCallback((alertId: string, itemId: string) => {
    setState((prev) => ({
      ...prev,
      emergencyAlerts: prev.emergencyAlerts.map((a) =>
        a.id === alertId
          ? {
              ...a,
              responseChecklist: a.responseChecklist.map((c) =>
                c.id === itemId ? { ...c, done: !c.done } : c
              ),
            }
          : a
      ),
    }));
  }, []);

  const resolveEmergencyAlert = useCallback(
    (id: string) => {
      const found = state.emergencyAlerts.find((a) => a.id === id);
      setState((prev) => ({
        ...prev,
        emergencyAlerts: prev.emergencyAlerts.map((a) =>
          a.id === id
            ? {
                ...a,
                status: "Resolved",
                responseChecklist: a.responseChecklist.map((c) => ({ ...c, done: true })),
              }
            : a
        ),
      }));
      if (activeIncidentId === id) {
        setActiveIncidentId(null);
      }
      pushToast({
        title: "Incident Marked Resolved",
        description: found
          ? `${found.plate} emergency closed & archived to HORUS audit log.`
          : "Emergency alert resolved.",
        variant: "success",
      });
    },
    [state.emergencyAlerts, activeIncidentId, pushToast]
  );

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveIncidentId(null);
    setState({
      trucks: INITIAL_TRUCKS,
      drivers: INITIAL_DRIVERS,
      queuedShipments: INITIAL_QUEUED_SHIPMENTS,
      activities: INITIAL_ACTIVITIES,
      notifications: INITIAL_NOTIFICATIONS,
      settings: INITIAL_SETTINGS,
      activeTruckId: "ISZ-204",
      selectedSlotId: "A5",
      obdCatalog: OBD_CODE_LIST,
      hubCatalog: INITIAL_HUBS,
      emergencyAlerts: INITIAL_EMERGENCY_ALERTS,
    });
    pushToast({
      title: "HORUS Fleet Intelligence reset",
      description: "All 7 Isuzu vehicles, master codes, GPS pins, and OBD-II statuses restored.",
      variant: "success",
    });
  }, [pushToast]);

  const sendDriverMessage = useCallback(
    (driverName: string, message: string) => {
      setState((prev) => ({
        ...prev,
        activities: [
          {
            id: `act-msg-${Date.now()}`,
            time: formatCurrentTime(),
            message: `Message sent to ${driverName}`,
            detail: `"${message}"`,
            type: "driver",
            truckId: prev.activeTruckId,
          },
          ...prev.activities,
        ],
      }));
      pushToast({
        title: `Sent to ${driverName}`,
        description: "Isuzu cab telematics terminal acknowledged delivery.",
        variant: "success",
      });
    },
    [pushToast]
  );

  const value: HaulTrackContextValue = {
    activePage,
    setActivePage,
    trucks: state.trucks,
    activeTruck,
    activeDriver,
    drivers: state.drivers,
    queuedShipments: state.queuedShipments,
    activities: state.activities,
    notifications: state.notifications,
    settings: state.settings,
    selectedSlotId: state.selectedSlotId,
    setSelectedSlotId,
    highlightedSlotId,
    flashSlot,
    liveTrackingOpen,
    setLiveTrackingOpen,
    dispatchModalOpen,
    setDispatchModalOpen,
    selectTruck,
    assignShipmentToSlot,
    unloadSlot,
    moveSlotCargo,
    updateSlotCondition,
    changeTruckDriver,
    updateTruckRoute,
    dispatchTruck,
    createShipment,
    deleteQueuedShipment,
    scanVehicleObd,
    clearVehicleDtc,
    acknowledgeDtc,
    runDpfRegen,
    simulateGpsTick,
    liveTickCount,
    lastHeartbeat,
    telemetryHistory,
    obdCatalog: state.obdCatalog,
    hubCatalog: state.hubCatalog,
    lookupDtc,
    addObdCode,
    updateObdCode,
    deleteObdCode,
    addHubCode,
    deleteHubCode,
    emergencyAlerts: state.emergencyAlerts,
    activeIncidentId,
    setActiveIncidentId,
    alertSoundEnabled,
    setAlertSoundEnabled,
    triggerDummyFailure,
    acknowledgeEmergencyAlert,
    dispatchEmergencyResponse,
    toggleIncidentChecklistItem,
    resolveEmergencyAlert,
    markNotificationRead,
    markAllNotificationsRead,
    updateSettings,
    resetDemoData,
    toasts,
    pushToast,
    dismissToast,
    sendDriverMessage,
  };

  return <HaulTrackContext.Provider value={value}>{children}</HaulTrackContext.Provider>;
}

export function useHaulTrack() {
  const ctx = useContext(HaulTrackContext);
  if (!ctx) throw new Error("useHaulTrack must be used inside HaulTrackProvider");
  return ctx;
}
