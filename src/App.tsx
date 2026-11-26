import {
  LayoutGrid,
  Package,
  Cpu,
  Truck,
  BarChart3,
  FileText,
  Settings,
  Network,
} from "lucide-react";
import { HaulTrackProvider, useHaulTrack } from "@/context/HaulTrackContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { CargoOperationsView } from "@/components/dashboard/CargoOperationsView";
import { LiveMapView } from "@/components/views/LiveMapView";
import { ObdDiagnosticsView } from "@/components/views/ObdDiagnosticsView";
import { ShipmentsView } from "@/components/views/ShipmentsView";
import { FleetView } from "@/components/views/FleetView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { ReportsView } from "@/components/views/ReportsView";
import { MasterDataView } from "@/components/views/MasterDataView";
import { HldArchitectureView } from "@/components/views/HldArchitectureView";
import { SettingsView } from "@/components/views/SettingsView";
import { DispatchModal } from "@/components/modals/DispatchModal";
import { LiveTrackingModal } from "@/components/modals/LiveTrackingModal";
import {
  GlobalEmergencyBanner,
  IncidentResponseDrawer,
} from "@/components/panels/EmergencyAlertSystem";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { TooltipProvider } from "@/components/ui/TermTooltip";
import type { NavPage } from "@/types/haultrack";
import { cn } from "@/lib/utils";

function HubSubNav() {
  const { activePage, setActivePage, queuedShipments, trucks, emergencyAlerts } = useHaulTrack();
  const openEmergencies = emergencyAlerts.filter((a) => a.status !== "Resolved").length;

  let tabs: Array<{
    id: NavPage;
    label: string;
    badge?: string | number;
    urgent?: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }> | null = null;

  if (activePage === "dashboard" || activePage === "shipments") {
    tabs = [
      { id: "dashboard", label: "Cargo Bay Operations", icon: LayoutGrid },
      {
        id: "shipments",
        label: "Shipments Queue",
        badge: queuedShipments.length,
        icon: Package,
      },
    ];
  } else if (activePage === "obd" || activePage === "fleet") {
    tabs = [
      {
        id: "obd",
        label: "OBD-II & Failure Alerts",
        badge: openEmergencies > 0 ? `${openEmergencies} Open` : undefined,
        urgent: openEmergencies > 0,
        icon: Cpu,
      },
      {
        id: "fleet",
        label: "Isuzu Fleet Lineup",
        badge: trucks.length,
        icon: Truck,
      },
    ];
  } else if (activePage === "analytics" || activePage === "reports") {
    tabs = [
      { id: "analytics", label: "HO Executive Analytics", icon: BarChart3 },
      { id: "reports", label: "Reports & CSV Exports", icon: FileText },
    ];
  } else if (activePage === "settings" || activePage === "hld") {
    tabs = [
      { id: "settings", label: "Depot & Preferences", icon: Settings },
      { id: "hld", label: "System HLD (Geotab × Fabric)", icon: Network },
    ];
  }

  if (!tabs) return null;

  return (
    <div className="mb-3.5 inline-flex flex-wrap items-center gap-1 rounded-2xl border border-border/80 bg-card/90 p-1 shadow-xs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activePage === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActivePage(tab.id)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all",
              active
                ? "bg-zinc-950 text-white shadow-xs dark:bg-white dark:text-zinc-950"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums",
                  tab.urgent
                    ? "bg-red-600 text-white"
                    : active
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function HaulTrackShell() {
  const { activePage, toasts, dismissToast } = useHaulTrack();

  return (
    <div className="haultrack-canvas min-h-dvh w-full text-foreground lg:h-dvh lg:overflow-hidden">
      <div className="flex min-h-dvh w-full gap-5 px-3 py-3 pb-24 sm:px-5 sm:py-4 lg:h-dvh lg:overflow-hidden lg:pb-4">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TopHeader />
          <GlobalEmergencyBanner />
          <main className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">
            <HubSubNav />
            <div key={activePage} className="animate-page-enter min-h-full pb-2">
              {activePage === "dashboard" && <CargoOperationsView />}
              {activePage === "map" && <LiveMapView />}
              {activePage === "obd" && <ObdDiagnosticsView />}
              {activePage === "shipments" && <ShipmentsView />}
              {activePage === "fleet" && <FleetView />}
              {activePage === "analytics" && <AnalyticsView />}
              {activePage === "reports" && <ReportsView />}
              {activePage === "master-data" && <MasterDataView />}
              {activePage === "hld" && <HldArchitectureView />}
              {activePage === "settings" && <SettingsView />}
            </div>
          </main>
        </div>
      </div>

      <DispatchModal />
      <LiveTrackingModal />
      <IncidentResponseDrawer />
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={120}>
      <HaulTrackProvider>
        <HaulTrackShell />
      </HaulTrackProvider>
    </TooltipProvider>
  );
}
