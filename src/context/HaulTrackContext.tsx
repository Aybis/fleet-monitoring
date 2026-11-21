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
import { getDtcInfo } from "@/data/obdDatabase";
import { formatCurrentTime } from "@/lib/utils";
import type {
  ActivityItem,
  AppSettings,
  CargoSlot,
  CargoSlotItem,
  Driver,
  NavPage,
  NotificationItem,
  QueuedShipment,
  RouteInfo,
  SlotCondition,
  TelemetrySample,
  ToastItem,
  Truck,
  TruckStatus,
} from "@/types/haultrack";

const STORAGE_KEY = "isuzu_indonesia_leaflet_v5";

interface PersistedState {
  trucks: Truck[];
  drivers: Driver[];
  queuedShipments: QueuedShipment[];
  activities: ActivityItem[];
  notifications: NotificationItem[];
  settings: AppSettings;
  activeTruckId: string;
  selectedSlotId: string;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (
        parsed &&
        Array.isArray(parsed.trucks) &&
        parsed.trucks.length > 0 &&
        parsed.trucks[0].obd?.deviceId &&
        parsed.trucks[0].plateExpiry &&
        parsed.trucks[0].plateType
      ) {
        return parsed;
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
  };
}

export function getTruckLoadKg(truck: Truck): number {
  return truck.slots.reduce((sum, s) => sum + (s.cargo ? s.cargo.weightKg : 0), 0);
}

export function getTruckLoadPct(truck: Truck): number {
  if (truck.maxCapacityKg <= 0) return 0;
  return Math.round((getTruckLoadKg(truck) / truck.maxCapacityKg) * 100);
}

export function getVehicleObdHealth(truck: Truck): "Healthy" | "Warning" | "Critical" {
  if (truck.obd.activeCodes.length === 0) return "Healthy";
  const hasCritical = truck.obd.activeCodes.some(
    (c) => getDtcInfo(c.code).severity === "Critical"
  );
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

export function HaulTrackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadInitialState);
  const [activePage, setActivePage] = useState<NavPage>("dashboard");
  const [highlightedSlotId, setHighlightedSlotId] = useState<string | null>(null);
  const [liveTrackingOpen, setLiveTrackingOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
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
      }));
      pushToast({
        title: `Service ticket logged for ${code}`,
        description: `Maintenance bay notified for ${truckId}.`,
        variant: "default",
      });
    },
    [pushToast]
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

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      trucks: INITIAL_TRUCKS,
      drivers: INITIAL_DRIVERS,
      queuedShipments: INITIAL_QUEUED_SHIPMENTS,
      activities: INITIAL_ACTIVITIES,
      notifications: INITIAL_NOTIFICATIONS,
      settings: INITIAL_SETTINGS,
      activeTruckId: "ISZ-204",
      selectedSlotId: "A5",
    });
    pushToast({
      title: "ISUZU FleetConnect reset",
      description: "All 5 Isuzu vehicles, cargo bays, GPS pins, and OBD-II codes restored.",
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
