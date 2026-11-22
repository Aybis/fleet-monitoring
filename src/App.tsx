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
import { SettingsView } from "@/components/views/SettingsView";
import { DispatchModal } from "@/components/modals/DispatchModal";
import { LiveTrackingModal } from "@/components/modals/LiveTrackingModal";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { TooltipProvider } from "@/components/ui/TermTooltip";

function HaulTrackShell() {
  const { activePage, toasts, dismissToast } = useHaulTrack();

  return (
    <div className="haultrack-canvas min-h-dvh w-full text-foreground lg:h-dvh lg:overflow-hidden">
      <div className="flex min-h-dvh w-full gap-5 px-3 py-3 pb-24 sm:px-5 sm:py-4 lg:h-dvh lg:overflow-hidden lg:pb-4">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TopHeader />
          <main className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">
            <div key={activePage} className="animate-page-enter min-h-full pb-2">
              {activePage === "dashboard" && <CargoOperationsView />}
              {activePage === "map" && <LiveMapView />}
              {activePage === "obd" && <ObdDiagnosticsView />}
              {activePage === "shipments" && <ShipmentsView />}
              {activePage === "fleet" && <FleetView />}
              {activePage === "analytics" && <AnalyticsView />}
              {activePage === "reports" && <ReportsView />}
              {activePage === "settings" && <SettingsView />}
            </div>
          </main>
        </div>
      </div>

      <DispatchModal />
      <LiveTrackingModal />
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
