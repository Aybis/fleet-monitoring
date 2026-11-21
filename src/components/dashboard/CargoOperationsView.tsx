import { BarChart3, Truck, ArrowRight } from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { Button } from "@/components/ui/button";
import { TruckDetailsCard } from "./TruckDetailsCard";
import { CapacityLoadCard } from "./CapacityLoadCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { TruckCargoVisualizer } from "./TruckCargoVisualizer";
import { ShipmentAssignmentPanel } from "./ShipmentAssignmentPanel";

export function CargoOperationsView() {
  const { setActivePage, setDispatchModalOpen } = useHaulTrack();

  return (
    <div className="space-y-5">
      {/* Page Title Row matching reference screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[32px]">
            Cargo Operations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track, manage and assign your shipments in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setActivePage("analytics")}
            className="h-11 rounded-2xl border-border/80 bg-card px-4 text-[13px] font-semibold shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
          >
            <BarChart3 className="h-4 w-4 text-foreground" />
            View Analytics
          </Button>
          <Button
            onClick={() => setDispatchModalOpen(true)}
            className="h-11 rounded-2xl bg-[#d91324] px-5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(217,19,36,0.30)] hover:bg-[#b50f1d]"
          >
            <Truck className="h-4 w-4" />
            Dispatch Truck
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main 2-Column Asymmetric Operations Layout */}
      <div className="grid w-full grid-cols-1 items-start gap-5 xl:grid-cols-[316px_minmax(0,1fr)] 2xl:grid-cols-[348px_minmax(0,1fr)]">
        {/* Left Operations Sidebar Stack */}
        <div className="flex flex-col gap-4">
          <TruckDetailsCard />
          <CapacityLoadCard />
          <RecentActivityCard />
        </div>

        {/* Right Hero Truck + Assignment Queue */}
        <div className="flex min-w-0 flex-col gap-5">
          <TruckCargoVisualizer />
          <ShipmentAssignmentPanel />
        </div>
      </div>
    </div>
  );
}
