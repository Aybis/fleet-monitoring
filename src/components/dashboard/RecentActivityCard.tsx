import { useState } from "react";
import { PackageCheck, RotateCcw, CheckCircle2, Truck, Route, UserCheck, Cpu } from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [logOpen, setLogOpen] = useState(false);

  const truckActivities = activities.filter((a) => a.truckId === activeTruck.id);
  const visible = truckActivities.slice(0, 3);

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold tracking-tight text-foreground">
            Recent Activity
          </h3>
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-red-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-500/20 dark:text-red-300"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            Live
          </button>
        </div>

        <div className="relative mt-3.5 space-y-3">
          {/* Vertical timeline connector */}
          {visible.length > 1 && (
            <div className="pointer-events-none absolute bottom-3 left-[9.5px] top-3 w-px bg-red-500/20" />
          )}

          {visible.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => {
                if (act.type === "obd") {
                  setActivePage("obd");
                } else if (act.slotId) {
                  flashSlot(act.slotId);
                } else {
                  setLogOpen(true);
                }
              }}
              className={cn(
                "group flex w-full cursor-pointer items-start gap-2.5 rounded-xl p-1 text-left transition-colors hover:bg-muted/60"
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

        {truckActivities.length > 3 && (
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="mt-2.5 w-full cursor-pointer rounded-lg py-1 text-center text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-400"
          >
            View all {truckActivities.length} events
          </button>
        )}
      </Card>

      {/* Full Live Operations Feed Modal */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Live Operations Log — {activeTruck.id}</DialogTitle>
            <DialogDescription>
              Real-time chronological audit trail for cargo loading, route edits, and dispatch events.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
            {truckActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => {
                  if (act.slotId) {
                    flashSlot(act.slotId);
                    setLogOpen(false);
                  }
                }}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3",
                  act.slotId && "cursor-pointer hover:border-red-500/40"
                )}
              >
                <ActivityIcon type={act.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">{act.message}</p>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {act.time}
                    </span>
                  </div>
                  {act.detail && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{act.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
