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

function HaulTrackShell() {
  const { activePage, toasts, dismissToast } = useHaulTrack();

  return (
    <div className="haultrack-canvas min-h-screen w-full text-foreground">
      <div className="flex min-h-screen w-full gap-5 px-3 py-3 pb-24 sm:px-5 sm:py-4 lg:pb-5">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader />
          <main className="flex-1">
            <div key={activePage} className="animate-page-enter h-full">
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
    <HaulTrackProvider>
      <HaulTrackShell />
    </HaulTrackProvider>
  );
}
