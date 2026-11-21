import { useState } from "react";
import { FileText, Download, Printer, Eye, CheckCircle2, Truck } from "lucide-react";
import { getTruckLoadKg, getTruckLoadPct, useHaulTrack } from "@/context/HaulTrackContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TermTooltip } from "@/components/ui/TermTooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Truck as TruckType } from "@/types/haultrack";
import { formatTons, formatWeight } from "@/lib/utils";

export function ReportsView() {
  const { trucks, drivers, settings, pushToast } = useHaulTrack();
  const [previewTruck, setPreviewTruck] = useState<TruckType | null>(null);

  const exportManifestCsv = (truck: TruckType) => {
    const drv = drivers.find((d) => d.id === truck.driverId);
    const headers = [
      "TruckID",
      "Driver",
      "Route",
      "Slot",
      "ShipmentCode",
      "Title",
      "Customer",
      "CargoType",
      "Quantity",
      "WeightKg",
      "Priority",
      "Condition",
      "LoadedAt",
    ];
    const rows = truck.slots
      .filter((s) => s.cargo)
      .map((s) => [
        truck.id,
        drv?.name ?? "",
        `${truck.route.originCode}->${truck.route.destinationCode}`,
        s.id,
        s.cargo!.shipmentCode,
        `"${s.cargo!.title}"`,
        `"${s.cargo!.customer}"`,
        s.cargo!.cargoType,
        s.cargo!.quantity,
        s.cargo!.weightKg,
        s.cargo!.priority,
        s.cargo!.condition,
        s.cargo!.loadedAt,
      ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${truck.id}-cargo-manifest.csv`;
    link.click();
    URL.revokeObjectURL(url);

    pushToast({
      title: `Downloaded ${truck.id} manifest`,
      description: `Exported ${rows.length} loaded cargo bay records to CSV.`,
      variant: "success",
    });
  };

  const exportFleetSummaryCsv = () => {
    const headers = ["TruckID", "Model", "Status", "Driver", "Route", "LoadedKg", "MaxCapacityKg", "UtilizationPct", "OccupiedBays"];
    const rows = trucks.map((t) => {
      const drv = drivers.find((d) => d.id === t.driverId);
      return [
        t.id,
        `"${t.model}"`,
        t.status,
        drv?.name ?? "",
        `${t.route.originCode}->${t.route.destinationCode}`,
        getTruckLoadKg(t),
        t.maxCapacityKg,
        `${getTruckLoadPct(t)}%`,
        t.slots.filter((s) => s.cargo).length,
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "isuzu-fleet-summary.csv";
    link.click();
    URL.revokeObjectURL(url);

    pushToast({
      title: "ISUZU Fleet summary exported",
      description: "Saved isuzu-fleet-summary.csv with live utilization data.",
      variant: "success",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
            Manifests &amp; Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate live <TermTooltip termKey="BOL">Bills of Lading (BOL)</TermTooltip>, bay-level
            cargo manifests, and fleet compliance summaries.
          </p>
        </div>
        <Button onClick={exportFleetSummaryCsv} className="h-11 rounded-2xl px-5">
          <Download className="h-4 w-4" />
          Export Fleet Summary CSV
        </Button>
      </div>

      {/* Live Vehicle Manifest Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {trucks.map((truck) => {
          const drv = drivers.find((d) => d.id === truck.driverId) ?? drivers[0];
          const loadKg = getTruckLoadKg(truck);
          const pct = getTruckLoadPct(truck);
          const filled = truck.slots.filter((s) => s.cargo);

          return (
            <Card key={truck.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/12 text-red-700 dark:text-red-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">
                      {truck.id} — Cargo Manifest &amp; BOL
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {truck.route.originCity} → {truck.route.destinationCity} · Driver: {drv.name}
                    </p>
                  </div>
                </div>
                <Badge variant="express">{filled.length} lots</Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground">Gross Cargo</p>
                  <p className="mt-0.5 font-bold tabular-nums">
                    {formatTons(loadKg, settings.weightUnit)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Load Factor</p>
                  <p className="mt-0.5 font-bold text-red-600 dark:text-red-400 tabular-nums">
                    {pct}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Dock / Gate</p>
                  <p className="mt-0.5 font-bold">{truck.dock}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreviewTruck(truck)}>
                  <Eye className="h-3.5 w-3.5" />
                  Preview Manifest
                </Button>
                <Button size="sm" onClick={() => exportManifestCsv(truck)}>
                  <Download className="h-3.5 w-3.5" />
                  Download CSV
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Manifest Preview Dialog */}
      <Dialog
        open={Boolean(previewTruck)}
        onOpenChange={(open) => !open && setPreviewTruck(null)}
      >
        <DialogContent className="max-w-2xl">
          {previewTruck && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-red-600" />
                  Official Bay Manifest — {previewTruck.id}
                </DialogTitle>
                <DialogDescription>
                  {settings.depotName} · Corridor {previewTruck.route.originCity} →{" "}
                  {previewTruck.route.destinationCity} · {previewTruck.dock}
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[340px] overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-border bg-muted text-[11px] font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Bay</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Description / Account</th>
                      <th className="px-3 py-2">Weight</th>
                      <th className="px-3 py-2">Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewTruck.slots
                      .filter((s) => s.cargo)
                      .map((s) => (
                        <tr key={s.id}>
                          <td className="px-3 py-2 font-extrabold">{s.id}</td>
                          <td className="px-3 py-2 font-bold tabular-nums">
                            {s.cargo!.shipmentCode}
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-semibold">{s.cargo!.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {s.cargo!.customer}
                            </p>
                          </td>
                          <td className="px-3 py-2 font-semibold tabular-nums">
                            {formatWeight(s.cargo!.weightKg, settings.weightUnit)}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium capitalize text-red-600 dark:text-red-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {s.cargo!.condition}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.print();
                  }}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
                <Button onClick={() => exportManifestCsv(previewTruck)}>
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
