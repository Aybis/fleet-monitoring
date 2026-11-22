import { useMemo, useState } from "react";
import {
  Package,
  Plus,
  Search,
  Truck,
  Trash2,
  ArrowUpRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useHaulTrack } from "@/context/HaulTrackContext";
import { CITY_HUBS } from "@/data/initialData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CargoType, HandlingMethod, PriorityLevel } from "@/types/haultrack";
import { cn, formatTons, formatWeight } from "@/lib/utils";

export function ShipmentsView() {
  const {
    trucks,
    activeTruck,
    queuedShipments,
    settings,
    assignShipmentToSlot,
    createShipment,
    deleteQueuedShipment,
    selectTruck,
    flashSlot,
    setActivePage,
  } = useHaulTrack();

  const [tab, setTab] = useState<"all" | "queued" | "loaded">("all");
  const [priorityFilter, setPriorityFilter] = useState<"All" | PriorityLevel>("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create shipment form state
  const [title, setTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [originCode, setOriginCode] = useState("JKT");
  const [destCode, setDestCode] = useState("SBY");
  const [cargoType, setCargoType] = useState<CargoType>("Pallet");
  const [quantity, setQuantity] = useState("8");
  const [weightKg, setWeightKg] = useState("650");
  const [priority, setPriority] = useState<PriorityLevel>("Express");
  const [method, setMethod] = useState<HandlingMethod>("Pickup");
  const [notes, setNotes] = useState("");

  const allRows = useMemo(() => {
    const loaded = trucks.flatMap((t) =>
      t.slots
        .filter((s) => s.cargo)
        .map((s) => ({
          id: s.cargo!.shipmentCode,
          title: s.cargo!.title,
          customer: s.cargo!.customer,
          route: `${s.cargo!.originCode} → ${s.cargo!.destinationCode}`,
          cargoType: s.cargo!.cargoType,
          quantity: s.cargo!.quantity,
          weightKg: s.cargo!.weightKg,
          priority: s.cargo!.priority,
          method: s.cargo!.method,
          state: "Loaded" as const,
          truckId: t.id,
          slotId: s.id,
          time: s.cargo!.loadedAt,
        }))
    );

    const queued = queuedShipments.map((q) => ({
      id: q.id,
      title: q.title,
      customer: q.customer,
      route: `${q.originCode} → ${q.destinationCode}`,
      cargoType: q.cargoType,
      quantity: q.quantity,
      weightKg: q.weightKg,
      priority: q.priority,
      method: q.method,
      state: "Queued" as const,
      truckId: undefined,
      slotId: undefined,
      time: q.createdAt,
    }));

    return [...queued, ...loaded];
  }, [trucks, queuedShipments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((row) => {
      if (tab === "queued" && row.state !== "Queued") return false;
      if (tab === "loaded" && row.state !== "Loaded") return false;
      if (priorityFilter !== "All" && row.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q) ||
        row.customer.toLowerCase().includes(q) ||
        row.route.toLowerCase().includes(q) ||
        (row.truckId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [allRows, tab, priorityFilter, search]);

  const totalQueuedKg = queuedShipments.reduce((sum, s) => sum + s.weightKg, 0);
  const totalLoadedCount = allRows.filter((r) => r.state === "Loaded").length;
  const totalLoadedKg = allRows
    .filter((r) => r.state === "Loaded")
    .reduce((sum, r) => sum + r.weightKg, 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const formatCargoUnit = (type: CargoType, qty: number) => {
    if (type === "Box") return qty === 1 ? "1 box" : `${qty} boxes`;
    if (type === "Crate") return qty === 1 ? "1 crate" : `${qty} crates`;
    return qty === 1 ? "1 pallet" : `${qty} pallets`;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const oHub = CITY_HUBS.find((h) => h.code === originCode) ?? CITY_HUBS[0];
    const dHub = CITY_HUBS.find((h) => h.code === destCode) ?? CITY_HUBS[1];
    createShipment({
      title: title.trim() || "Commercial Freight Lot",
      customer: customer.trim() || "Northeast Logistics Client",
      originCode: oHub.code,
      originCity: oHub.city,
      destinationCode: dHub.code,
      destinationCity: dHub.city,
      cargoType,
      quantity: Math.max(1, Number(quantity) || 1),
      weightKg: Math.max(50, Math.min(3500, Number(weightKg) || 500)),
      method,
      priority,
      condition: priority === "Same-day" ? "temperature" : "verified",
      notes: notes.trim() || "Registered via Shipments Console. Ready for bay loading.",
    });
    setTitle("");
    setCustomer("");
    setNotes("");
    setCreateOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
            Shipments Registry
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create dock orders, inspect loaded freight, and dispatch pending cargo onto active trucks.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="h-11 rounded-2xl px-5">
          <Plus className="h-4 w-4" />
          New Shipment
        </Button>
      </div>

      {/* Live Summary KPIs */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Pending Dock Queue</p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tabular-nums">{queuedShipments.length}</span>
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums">
              {formatTons(totalQueuedKg, settings.weightUnit)} staged
            </span>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Loaded Across Fleet</p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tabular-nums">{totalLoadedCount}</span>
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
              {formatTons(totalLoadedKg, settings.weightUnit)} active
            </span>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Active Target Truck</p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tabular-nums">{activeTruck.id}</span>
            <span className="text-xs font-semibold text-muted-foreground">
              {activeTruck.slots.filter((s) => !s.cargo).length} open bays
            </span>
          </div>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-muted p-1">
            {(
              [
                ["all", `All (${allRows.length})`],
                ["queued", `Queued (${queuedShipments.length})`],
                ["loaded", `Loaded (${totalLoadedCount})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setPage(1);
                }}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  tab === key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter ID, customer, route..."
                className="pl-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-1">
              {(["All", "Same-day", "Express", "Standard"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPriorityFilter(p);
                    setPage(1);
                  }}
                  className={cn(
                    "cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    priorityFilter === p
                      ? "border-red-600 bg-red-600/12 text-red-700 dark:text-red-300"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 max-h-[460px] overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3">Shipment</th>
                <th className="px-4 py-3">Customer &amp; Contents</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Payload</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.map((row) => (
                <tr key={`${row.state}-${row.id}-${row.slotId ?? ""}`} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-extrabold text-foreground tabular-nums">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-red-600" />
                      {row.id}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{row.title}</p>
                    <p className="text-[11px] text-muted-foreground">{row.customer}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">{row.route}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <p className="font-bold text-foreground">
                      {formatWeight(row.weightKg, settings.weightUnit)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatCargoUnit(row.cargoType, row.quantity)} · {row.method}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        row.priority === "Express"
                          ? "express"
                          : row.priority === "Same-day"
                          ? "sameday"
                          : "standard"
                      }
                    >
                      {row.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {row.state === "Loaded" ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {row.truckId} · {row.slotId}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5" />
                        Dock Queue
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.state === "Queued" ? (
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => assignShipmentToSlot(row.id)}
                          className="h-7 rounded-lg px-2.5 text-[11px] hover:border-red-500 hover:bg-red-600 hover:text-white"
                        >
                          <Truck className="h-3 w-3" />
                          Load on {activeTruck.id}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(row.id)}
                          aria-label={`Remove ${row.id}`}
                          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (row.truckId) selectTruck(row.truckId);
                          setActivePage("dashboard");
                          if (row.slotId) flashSlot(row.slotId);
                        }}
                        className="h-7 rounded-lg px-2.5 text-[11px] text-red-700 dark:text-red-400"
                      >
                        Inspect Bay
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20]}
        />
      </Card>

      {/* Confirm Delete Shipment Modal (Confirmation Action) */}
      <Dialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Queued Shipment?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{confirmDeleteId}</strong> from the dock staging
              queue? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteId) deleteQueuedShipment(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Shipment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Dock Shipment</DialogTitle>
            <DialogDescription>
              Creates a live freight order in the staging queue ready to assign onto any truck bay.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Cargo Description
                </label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Surgical Robotics Kits"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Customer / Account
                </label>
                <Input
                  required
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="e.g. Atlantic BioMed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Origin
                </label>
                <select
                  value={originCode}
                  onChange={(e) => setOriginCode(e.target.value)}
                  className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {CITY_HUBS.map((h) => (
                    <option key={h.code} value={h.code}>
                      {h.code} — {h.city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Destination
                </label>
                <select
                  value={destCode}
                  onChange={(e) => setDestCode(e.target.value)}
                  className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {CITY_HUBS.map((h) => (
                    <option key={h.code} value={h.code}>
                      {h.code} — {h.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Type
                </label>
                <select
                  value={cargoType}
                  onChange={(e) => setCargoType(e.target.value as CargoType)}
                  className="h-9 w-full rounded-xl border border-input bg-background px-2.5 text-sm"
                >
                  <option value="Pallet">Pallet</option>
                  <option value="Box">Box</option>
                  <option value="Crate">Crate</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Quantity
                </label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Weight (kg)
                </label>
                <Input
                  type="number"
                  min={50}
                  max={3500}
                  step={50}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Service Tier
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                  <option value="Same-day">Same-day</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Handling Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HandlingMethod)}
                  className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="Pickup">Pickup</option>
                  <option value="Dock Transfer">Dock Transfer</option>
                  <option value="Express Hub">Express Hub</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Handling Instructions
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional bay placement or temperature notes..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add to Staging Queue</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
