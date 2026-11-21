import { RotateCcw, Building2, Scale, Bell, Moon } from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const { settings, updateSettings, resetDemoData, pushToast } = useHaulTrack();

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
          Operations Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure depot defaults, weight display units, overload alerts, and bay loading behavior.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

      {/* Depot & Units */}
      <Card className="space-y-5 p-5">
        <div className="flex items-center gap-2.5 border-b border-border/70 pb-3">
          <Building2 className="h-4 w-4 text-red-600" />
          <h2 className="text-sm font-bold text-foreground">Depot &amp; Measurement</h2>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Active Dispatch Terminal Name
          </label>
          <Input
            value={settings.depotName}
            onChange={(e) => updateSettings({ depotName: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Weight Display Unit</p>
            <p className="text-xs text-muted-foreground">
              Instantly converts all truck gauges, cargo slots, and manifest weights.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
            {(
              [
                ["metric", "Metric (kg / tons)"],
                ["imperial", "Imperial (lbs)"],
              ] as const
            ).map(([unit, label]) => (
              <button
                key={unit}
                type="button"
                onClick={() => {
                  updateSettings({ weightUnit: unit });
                  pushToast({
                    title: `Units switched to ${unit === "metric" ? "Metric" : "Imperial"}`,
                    description: "All cargo bay weights updated live.",
                    variant: "success",
                  });
                }}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  settings.weightUnit === unit
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Bay Safety & Workflow */}
      <Card className="space-y-5 p-5">
        <div className="flex items-center gap-2.5 border-b border-border/70 pb-3">
          <Scale className="h-4 w-4 text-red-600" />
          <h2 className="text-sm font-bold text-foreground">Loading &amp; Safety Thresholds</h2>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Capacity Warning Threshold
              </p>
              <p className="text-xs text-muted-foreground">
                Turns the Capacity &amp; Load gauge amber when truck payload exceeds this percentage.
              </p>
            </div>
            <span className="rounded-lg bg-red-500/12 px-2.5 py-1 text-xs font-extrabold text-red-700 tabular-nums dark:text-red-300">
              {settings.overloadWarningPct}%
            </span>
          </div>
          <input
            type="range"
            min={60}
            max={95}
            step={5}
            value={settings.overloadWarningPct}
            onChange={(e) => updateSettings({ overloadWarningPct: Number(e.target.value) })}
            className="h-2 w-full cursor-pointer accent-red-600"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Auto-Advance Target Slot</p>
            <p className="text-xs text-muted-foreground">
              Automatically select the next available empty bay after assigning a shipment.
            </p>
          </div>
          <Switch
            checked={settings.autoAdvanceSlot}
            onCheckedChange={(checked) => updateSettings({ autoAdvanceSlot: checked })}
          />
        </div>
      </Card>

      {/* Appearance & Alerts */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2.5 border-b border-border/70 pb-3">
          <Bell className="h-4 w-4 text-red-600" />
          <h2 className="text-sm font-bold text-foreground">Appearance &amp; Telemetry</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Dark Mode Theme</p>
              <p className="text-xs text-muted-foreground">
                Low-glare night shift dashboard styling for dispatch centers.
              </p>
            </div>
          </div>
          <Switch
            checked={settings.darkMode}
            onCheckedChange={(checked) => updateSettings({ darkMode: checked })}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Dispatch Clearance Alerts</p>
            <p className="text-xs text-muted-foreground">
              Show real-time alerts when drivers check in or fragile cargo requires inspection.
            </p>
          </div>
          <Switch
            checked={settings.dispatchAlerts}
            onCheckedChange={(checked) => updateSettings({ dispatchAlerts: checked })}
          />
        </div>
      </Card>

      {/* Reset Demo */}
      <Card className="flex flex-wrap items-center justify-between gap-4 border-amber-400/40 p-5">
        <div>
          <p className="text-sm font-bold text-foreground">Reset Simulation Data</p>
          <p className="text-xs text-muted-foreground">
            Restore ISZ-204 (Isuzu GIGA) to its initial 48% load (6.5 tons) and reset all vehicles,
            GPS pins, and OBD-II codes.
          </p>
        </div>
        <Button variant="outline" onClick={resetDemoData}>
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </Card>
      </div>
    </div>
  );
}
