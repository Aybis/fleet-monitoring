import { useMemo, useState } from "react";
import {
  Truck,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  Box,
  Plus,
  ChevronDown,
  Check,
  Sparkles,
} from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  ActionMenu,
  ActionMenuTrigger,
  ActionMenuPanel,
  ActionMenuOption,
  ActionMenuHeading,
} from "@/components/ui/menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QueuedShipment } from "@/types/haultrack";
import { cn, formatWeight } from "@/lib/utils";

type SortKey = "default" | "weight-asc" | "weight-desc" | "priority" | "id";

const PRIORITY_RANK = { "Same-day": 0, Express: 1, Standard: 2 } as const;

export function ShipmentAssignmentPanel() {
  const {
    activeTruck,
    queuedShipments,
    selectedSlotId,
    setSelectedSlotId,
    assignShipmentToSlot,
    settings,
    setActivePage,
  } = useHaulTrack();

  const [searchId, setSearchId] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(5);
  const [previewShipment, setPreviewShipment] = useState<QueuedShipment | null>(null);

  const emptySlots = useMemo(
    () => activeTruck.slots.filter((s) => !s.cargo),
    [activeTruck.slots]
  );

  const effectiveSlotId =
    emptySlots.find((s) => s.id === selectedSlotId)?.id ?? emptySlots[0]?.id ?? null;

  const filteredShipments = useMemo(() => {
    const q = searchId.trim().toLowerCase();
    const list = queuedShipments.filter((s) => {
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.priority.toLowerCase().includes(q) ||
        `${s.originCode} ${s.destinationCode}`.toLowerCase().includes(q)
      );
    });

    const sorted = [...list];
    if (sortBy === "weight-asc") sorted.sort((a, b) => a.weightKg - b.weightKg);
    if (sortBy === "weight-desc") sorted.sort((a, b) => b.weightKg - a.weightKg);
    if (sortBy === "priority")
      sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    if (sortBy === "id") sorted.sort((a, b) => a.id.localeCompare(b.id));
    return sorted;
  }, [queuedShipments, searchId, sortBy]);

  const sortLabels: Record<SortKey, string> = {
    default: "Sort by",
    priority: "Priority",
    "weight-asc": "Lightest",
    "weight-desc": "Heaviest",
    id: "Shipment ID",
  };

  const priorityBadgeVariant = (priority: QueuedShipment["priority"]) =>
    priority === "Express" ? "express" : priority === "Same-day" ? "sameday" : "standard";

  const unitWord = (type: QueuedShipment["cargoType"], qty: number) => {
    const base = type === "Box" ? "box" : type === "Crate" ? "crate" : "pallet";
    if (qty === 1) return `1 ${base}`;
    return base === "box" ? `${qty} boxes` : `${qty} ${base}s`;
  };

  return (
    <>
      <Card className="p-4 sm:p-5">
        {/* Top Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Dynamic Target Slot Selector */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/12 text-red-600 dark:text-red-400">
              <Truck className="h-4 w-4" />
            </span>

            {effectiveSlotId ? (
              <ActionMenu>
                <ActionMenuTrigger asChild>
                  <button
                    type="button"
                    className="group flex cursor-pointer items-center gap-1.5 rounded-lg py-0.5 text-left text-[15px] font-bold tracking-tight text-foreground transition-colors hover:text-red-700 dark:hover:text-red-400"
                  >
                    <span>
                      Assign shipment to{" "}
                      <span className="rounded-md bg-red-500/12 px-1.5 py-0.5 text-red-700 dark:text-red-300">
                        {effectiveSlotId}
                      </span>{" "}
                      slot
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </ActionMenuTrigger>
                <ActionMenuPanel align="start">
                  <ActionMenuHeading>Choose Target Empty Slot</ActionMenuHeading>
                  {emptySlots.map((slot) => (
                    <ActionMenuOption
                      key={slot.id}
                      onSelect={() => setSelectedSlotId(slot.id)}
                      className="justify-between"
                    >
                      <span className="font-semibold">
                        Slot {slot.id}{" "}
                        <span className="font-normal text-muted-foreground">
                          (Row {slot.row})
                        </span>
                      </span>
                      {slot.id === effectiveSlotId && (
                        <Check className="h-3.5 w-3.5 text-red-600" />
                      )}
                    </ActionMenuOption>
                  ))}
                </ActionMenuPanel>
              </ActionMenu>
            ) : (
              <span className="text-[15px] font-bold text-amber-600 dark:text-amber-400">
                All 18 bays filled on {activeTruck.id}
              </span>
            )}
          </div>

          {/* Search / Sort / View Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex h-9 w-full items-center sm:w-[215px]">
              <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Search for shipment ID"
                className="h-full w-full rounded-xl border border-border bg-background pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-red-500/60 focus:outline-none focus:ring-2 focus:ring-red-500/15"
              />
            </div>

            {/* Sort Dropdown */}
            <ActionMenu>
              <ActionMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl px-3 text-xs">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  {sortLabels[sortBy]}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </ActionMenuTrigger>
              <ActionMenuPanel>
                <ActionMenuHeading>Sort Queue</ActionMenuHeading>
                {(
                  [
                    ["default", "Default Order"],
                    ["priority", "Priority (Urgent First)"],
                    ["weight-asc", "Weight: Lightest First"],
                    ["weight-desc", "Weight: Heaviest First"],
                    ["id", "Shipment ID (A–Z)"],
                  ] as Array<[SortKey, string]>
                ).map(([key, label]) => (
                  <ActionMenuOption
                    key={key}
                    onSelect={() => setSortBy(key)}
                    className="justify-between"
                  >
                    <span>{label}</span>
                    {sortBy === key && <Check className="h-3.5 w-3.5 text-red-600" />}
                  </ActionMenuOption>
                ))}
              </ActionMenuPanel>
            </ActionMenu>

            {/* Grid / List View Switcher */}
            <ActionMenu>
              <ActionMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl px-3 text-xs">
                  {viewMode === "grid" ? (
                    <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <List className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {viewMode === "grid" ? "Grid" : "List"}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </ActionMenuTrigger>
              <ActionMenuPanel>
                <ActionMenuOption
                  onSelect={() => setViewMode("grid")}
                  className="justify-between"
                >
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="h-3.5 w-3.5" /> Grid Cards
                  </span>
                  {viewMode === "grid" && <Check className="h-3.5 w-3.5 text-red-600" />}
                </ActionMenuOption>
                <ActionMenuOption
                  onSelect={() => setViewMode("list")}
                  className="justify-between"
                >
                  <span className="flex items-center gap-2">
                    <List className="h-3.5 w-3.5" /> Compact List
                  </span>
                  {viewMode === "list" && <Check className="h-3.5 w-3.5 text-red-600" />}
                </ActionMenuOption>
              </ActionMenuPanel>
            </ActionMenu>
          </div>
        </div>

        {/* Shipment Cards / List */}
        {filteredShipments.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-10 text-center">
            <Sparkles className="h-7 w-7 text-red-500" />
            <p className="mt-2 text-sm font-bold text-foreground">
              {queuedShipments.length === 0
                ? "All queued shipments assigned!"
                : "No shipments match your filter"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {queuedShipments.length === 0
                ? "Create a new shipment on the Shipments tab or dispatch the truck."
                : "Try clearing your shipment ID search."}
            </p>
            {queuedShipments.length === 0 && (
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setActivePage("shipments")}
              >
                Create New Shipment
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {filteredShipments.map((shipment) => (
              <div
                key={shipment.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-haultrack-shipment", shipment.id);
                }}
                className="group flex flex-col justify-between rounded-2xl border border-border/85 bg-background/60 p-4 transition-all hover:border-red-500/45 hover:bg-card hover:shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:bg-card/70"
              >
                {/* Card Top: ID + Priority Pill */}
                <button
                  type="button"
                  onClick={() => setPreviewShipment(shipment)}
                  className="w-full cursor-pointer text-left focus:outline-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-red-500/12 group-hover:text-red-700 dark:group-hover:text-red-300">
                        <Box className="h-4 w-4" />
                      </span>
                      <span className="text-[14px] font-extrabold tracking-tight text-foreground tabular-nums">
                        {shipment.id}
                      </span>
                    </div>
                    <Badge variant={priorityBadgeVariant(shipment.priority)}>
                      {shipment.priority}
                    </Badge>
                  </div>

                  {/* 3-Column Meaningful Metadata */}
                  <div className="mt-3.5 grid grid-cols-3 gap-x-2 gap-y-3 text-left">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Route</p>
                      <p className="mt-0.5 text-[12px] font-bold text-foreground">
                        {shipment.originCode} → {shipment.destinationCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Type</p>
                      <p className="mt-0.5 text-[12px] font-bold text-foreground">
                        {shipment.cargoType}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Quantity</p>
                      <p className="mt-0.5 text-[12px] font-bold text-foreground tabular-nums">
                        {unitWord(shipment.cargoType, shipment.quantity)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Total weight</p>
                      <p className="mt-0.5 text-[12px] font-bold text-foreground tabular-nums">
                        {formatWeight(shipment.weightKg, settings.weightUnit)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] text-muted-foreground">Method</p>
                      <p className="mt-0.5 truncate text-[12px] font-bold text-foreground">
                        {shipment.method}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Assign Action Button */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!effectiveSlotId}
                  onClick={() => assignShipmentToSlot(shipment.id, effectiveSlotId ?? undefined)}
                  className="mt-4 h-9 w-full rounded-xl border-border/90 bg-card text-[12px] font-semibold text-foreground hover:border-red-500 hover:bg-red-600 hover:text-white dark:hover:bg-red-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Assign to truck
                </Button>
              </div>
            ))}
          </div>
        ) : (
          /* Scrollable & Paginated List View */
          <>
            <div className="mt-4 max-h-[340px] overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="px-3.5 py-2.5">Shipment</th>
                    <th className="px-3.5 py-2.5">Customer</th>
                    <th className="px-3.5 py-2.5">Route</th>
                    <th className="px-3.5 py-2.5">Cargo</th>
                    <th className="px-3.5 py-2.5">Weight</th>
                    <th className="px-3.5 py-2.5">Priority</th>
                    <th className="px-3.5 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredShipments
                    .slice((listPage - 1) * listPageSize, listPage * listPageSize)
                    .map((s) => (
                      <tr key={s.id} className="transition-colors hover:bg-muted/35">
                        <td className="px-3.5 py-2.5 font-bold text-foreground tabular-nums">
                          <button
                            type="button"
                            onClick={() => setPreviewShipment(s)}
                            className="cursor-pointer hover:text-red-600 hover:underline"
                          >
                            {s.id}
                          </button>
                        </td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">{s.customer}</td>
                        <td className="px-3.5 py-2.5 font-semibold">
                          {s.originCode} → {s.destinationCode}
                        </td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">
                          {unitWord(s.cargoType, s.quantity)}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold tabular-nums">
                          {formatWeight(s.weightKg, settings.weightUnit)}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Badge variant={priorityBadgeVariant(s.priority)}>{s.priority}</Badge>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!effectiveSlotId}
                            onClick={() => assignShipmentToSlot(s.id, effectiveSlotId ?? undefined)}
                            className="h-7 rounded-lg px-2.5 text-[11px] hover:border-red-500 hover:bg-red-600 hover:text-white"
                          >
                            + Assign {effectiveSlotId ?? ""}
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={listPage}
              pageSize={listPageSize}
              totalItems={filteredShipments.length}
              onPageChange={setListPage}
              onPageSizeChange={setListPageSize}
              pageSizeOptions={[5, 10]}
            />
          </>
        )}
      </Card>

      {/* Shipment Details Preview Dialog */}
      <Dialog
        open={Boolean(previewShipment)}
        onOpenChange={(open) => !open && setPreviewShipment(null)}
      >
        <DialogContent>
          {previewShipment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {previewShipment.id}
                  <Badge variant={priorityBadgeVariant(previewShipment.priority)}>
                    {previewShipment.priority}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {previewShipment.title} · {previewShipment.customer}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/35 p-3.5 text-xs">
                <div>
                  <p className="text-[11px] text-muted-foreground">Route</p>
                  <p className="mt-0.5 font-bold">
                    {previewShipment.originCity} ({previewShipment.originCode}) →{" "}
                    {previewShipment.destinationCity} ({previewShipment.destinationCode})
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Payload Weight</p>
                  <p className="mt-0.5 font-bold tabular-nums">
                    {formatWeight(previewShipment.weightKg, settings.weightUnit)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Units &amp; Packaging</p>
                  <p className="mt-0.5 font-bold">
                    {unitWord(previewShipment.cargoType, previewShipment.quantity)} (
                    {previewShipment.cargoType})
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Handling Method</p>
                  <p className="mt-0.5 font-bold">{previewShipment.method}</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Dock Instructions: </strong>
                {previewShipment.notes}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewShipment(null)}>
                  Close
                </Button>
                <Button
                  disabled={!effectiveSlotId}
                  onClick={() => {
                    if (effectiveSlotId) {
                      assignShipmentToSlot(previewShipment.id, effectiveSlotId);
                      setPreviewShipment(null);
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Assign to Slot {effectiveSlotId ?? "Full"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
