import { PackageCheck, RotateCcw, CheckCircle2, Truck, Route, UserCheck, Cpu } from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { Card } from "@/components/ui/card";
import type { ActivityItem } from "@/types/haultrack";
import { cn } from "@/lib/utils";

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  const Icon =
    type === "assign"
      ? PackageCheck
      : type === "unload"
      ? RotateCcw
      : type === "dispatch"
      ? Truck
      : type === "route"
      ? Route
      : type === "driver"
      ? UserCheck
      : type === "obd"
      ? Cpu
      : CheckCircle2;

  return (
    <span
      className={cn(
        "relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
        type === "obd"
          ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300"
          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
      )}
    >
      <Icon className="h-3 w-3" />
    </span>
  );
}

export function RecentActivityCard() {
  const { activities, activeTruck, flashSlot, setActivePage } = useHaulTrack();

  const truckActivities = activities.filter((a) => a.truckId === activeTruck.id);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-bold tracking-tight text-foreground">
            Recent Activity
          </h3>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground tabular-nums">
            {truckActivities.length}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
          </span>
          Live
        </span>
      </div>

      {/* Directly Scrollable Live Activity Feed (no modal) */}
      <div className="relative mt-3.5 max-h-[260px] space-y-2.5 overflow-y-auto pr-1">
        {truckActivities.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No recent events recorded for {activeTruck.id}.
          </p>
        ) : (
          <div className="relative space-y-2.5">
            {truckActivities.length > 1 && (
              <div className="pointer-events-none absolute bottom-3 left-[13.5px] top-3 w-px bg-red-500/20" />
            )}

            {truckActivities.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  if (act.type === "obd") {
                    setActivePage("obd");
                  } else if (act.slotId) {
                    flashSlot(act.slotId);
                  }
                }}
                className={cn(
                  "group flex w-full items-start gap-2.5 rounded-xl p-1 text-left transition-colors",
                  act.type === "obd" || act.slotId
                    ? "cursor-pointer hover:bg-muted/60"
                    : "cursor-default"
                )}
              >
                <ActivityIcon type={act.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                    {act.time}
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold leading-snug text-foreground group-hover:text-red-700 dark:group-hover:text-red-400">
                    {act.message}
                  </p>
                  {act.detail && (
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {act.detail}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
