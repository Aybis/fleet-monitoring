import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CITY_HUBS } from "@/data/initialData";
import {
  INDONESIA_MAX_BOUNDS,
  UNIT_ROUTE_PATHS,
  interpolateUnitRoute,
} from "@/data/indonesiaMap";
import { getVehicleObdHealth } from "@/context/HaulTrackContext";
import type { ObdDtcDefinition, Truck } from "@/types/haultrack";

export type MapCameraCommand =
  | { id: number; type: "indonesia" }
  | { id: number; type: "java" }
  | { id: number; type: "sumatra" }
  | { id: number; type: "kalimantan" }
  | { id: number; type: "sulawesi" }
  | { id: number; type: "focus"; lat: number; lng: number; zoom?: number }
  | { id: number; type: "zoomIn" }
  | { id: number; type: "zoomOut" };

export type TileStyle = "osm" | "satellite" | "topo";

const TILE_URLS: Record<TileStyle, { url: string; attribution: string; maxZoom: number }> = {
  osm: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; World Imagery",
    maxZoom: 18,
  },
  topo: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; World Street Map",
    maxZoom: 18,
  },
};

function createTruckMarkerIcon(
  truck: Truck,
  isSelected: boolean,
  showObdBadges: boolean,
  obdCatalog: ObdDtcDefinition[]
): L.DivIcon {
  const obdHealth = getVehicleObdHealth(truck, obdCatalog);
  const hasAlert = showObdBadges && obdHealth !== "Healthy";
  const plateClass = truck.plateType === "commercial" ? "plate-yellow" : "plate-white";

  const obdBadgeHtml = hasAlert
    ? `<span class="isuzu-marker-obd-dot ${obdHealth === "Critical" ? "crit" : "warn"}" title="${truck.obd.activeCodes.length} OBD DTC">!</span>`
    : "";

  const html = `
    <div class="isuzu-marker-shell">
      <div class="isuzu-marker-card ${isSelected ? "is-selected" : ""}">
        ${obdBadgeHtml}
        <div class="isuzu-marker-top">
          <img src="${truck.imageSrc}" alt="${truck.model}" class="isuzu-marker-img" />
          <span class="isuzu-marker-speed">${truck.route.speedMph} km/h</span>
        </div>
        <div class="isuzu-tnkb-plate ${plateClass}">
          <span>${truck.plate}</span>
          <span class="isuzu-tnkb-exp">${truck.plateExpiry}</span>
        </div>
      </div>
      <div class="isuzu-marker-pointer"></div>
    </div>
  `;

  return L.divIcon({
    className: "isuzu-vehicle-divicon",
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function IndonesiaLeafletMap({
  trucks,
  activeTruck,
  obdCatalog,
  showRoutes,
  showObdBadges,
  showGeofences,
  tileStyle,
  cameraCommand,
  onSelectTruck,
}: {
  trucks: Truck[];
  activeTruck: Truck;
  obdCatalog: ObdDtcDefinition[];
  showRoutes: boolean;
  showObdBadges: boolean;
  showGeofences: boolean;
  tileStyle: TileStyle;
  cameraCommand: MapCameraCommand | null;
  onSelectTruck: (truckId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const corridorsLayerRef = useRef<L.LayerGroup | null>(null);
  const geofencesLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelectTruck);
  onSelectRef.current = onSelectTruck;

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-2.4, 114.8],
      zoom: 5,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: INDONESIA_MAX_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: true,
    });

    const corridorsGroup = L.layerGroup().addTo(map);
    const geofencesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    corridorsLayerRef.current = corridorsGroup;
    geofencesLayerRef.current = geofencesGroup;
    markersLayerRef.current = markersGroup;

    // Ensure crisp sizing on initial paint and smooth sidebar expand/collapse or window resize
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 150);
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      corridorsLayerRef.current = null;
      geofencesLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Switch Leaflet Tile Layer (Voyager / OSM / Dark)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const spec = TILE_URLS[tileStyle];
    const layer = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      maxZoom: spec.maxZoom,
    }).addTo(map);
    layer.bringToBack();
    tileLayerRef.current = layer;
  }, [tileStyle]);

  // Render All Units' Multi-Stop Route Paths + Highlight Active Unit (From -> To 1 -> To 2 -> To 3)
  useEffect(() => {
    const group = corridorsLayerRef.current;
    if (!group) return;
    group.clearLayers();
    if (!showRoutes) return;

    // 1. Draw every visible unit's multi-stop route path subtly so all destinations are visible
    for (const truck of trucks) {
      if (truck.id === activeTruck.id) continue;
      const unitStops = UNIT_ROUTE_PATHS[truck.id];
      if (!unitStops || unitStops.length < 2) continue;

      const chainLabel = unitStops.map((s) => s.code).join(" → ");
      L.polyline(
        unitStops.map((s) => [s.lat, s.lng] as [number, number]),
        {
          color: "#52525b",
          weight: 2.2,
          opacity: 0.42,
          dashArray: "5 6",
        }
      )
        .bindTooltip(`${truck.id} (${truck.plate}): ${chainLabel}`, { sticky: true })
        .addTo(group);

      // Subtle endpoint dots for non-active units
      unitStops.forEach((s, idx) => {
        L.circleMarker([s.lat, s.lng], {
          radius: idx === 0 || idx === unitStops.length - 1 ? 3.5 : 2.5,
          color: "#ffffff",
          weight: 1,
          fillColor: "#52525b",
          fillOpacity: 0.75,
        })
          .bindTooltip(`${truck.id} · ${idx === 0 ? "From" : idx === unitStops.length - 1 ? "Final" : `Stop ${idx}`}: ${s.city}`, {
            direction: "top",
          })
          .addTo(group);
      });
    }

    // 2. Draw Active Selected Unit's Full Multi-Stop Route (Completed solid + Remaining dashed + Numbered Stop Pins)
    const activeRoute = interpolateUnitRoute(activeTruck.id, activeTruck.route.progressPercent);

    if (activeRoute.completedPath.length >= 2) {
      L.polyline(activeRoute.completedPath, {
        color: "#09090b",
        weight: 4.5,
        opacity: 0.92,
      })
        .bindTooltip(`${activeTruck.id} Completed Route (${Math.round(activeTruck.route.progressPercent)}%)`, {
          sticky: true,
        })
        .addTo(group);
    }

    if (activeRoute.remainingPath.length >= 2) {
      L.polyline(activeRoute.remainingPath, {
        color: "#2563eb",
        weight: 3.5,
        opacity: 0.88,
        dashArray: "8 6",
      })
        .bindTooltip(`${activeTruck.id} Remaining Route: ${activeRoute.stops.map((s) => s.code).join(" → ")}`, {
          sticky: true,
        })
        .addTo(group);
    }

    // Numbered Stop Markers (FROM -> 1 -> 2 -> 3 -> END)
    activeRoute.stops.forEach((stop, idx) => {
      const isOrigin = idx === 0;
      const isFinal = idx === activeRoute.stops.length - 1;
      const badgeLabel = isOrigin ? "FROM" : isFinal ? "END" : `TO ${idx}`;
      const statusColor =
        stop.status === "completed"
          ? "#10b981"
          : stop.status === "next"
          ? "#09090b"
          : "#2563eb";

      const stopIcon = L.divIcon({
        className: "horus-stop-divicon",
        html: `
          <div style="transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
            <span style="background:${statusColor};color:#ffffff;font-family:Plus Jakarta Sans,Inter,sans-serif;font-size:9px;font-weight:900;padding:2px 6px;border-radius:999px;border:1.5px solid #ffffff;box-shadow:0 3px 8px rgba(0,0,0,0.28);white-space:nowrap;letter-spacing:0.04em;">
              ${badgeLabel} · ${stop.code}
            </span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      L.marker([stop.lat, stop.lng], {
        icon: stopIcon,
        zIndexOffset: 500,
      })
        .bindTooltip(
          `<strong>${badgeLabel}: ${stop.city}</strong><br/>${stop.hubLabel}<br/>ETA: ${stop.eta} (${
            stop.status === "completed" ? "Passed" : stop.status === "next" ? "Next Stop" : "Upcoming"
          })`,
          { direction: "top", offset: [0, -10] }
        )
        .addTo(group);
    });
  }, [showRoutes, trucks, activeTruck]);

  // Render Indonesian Hub Geofences
  useEffect(() => {
    const group = geofencesLayerRef.current;
    if (!group) return;
    group.clearLayers();
    if (!showGeofences) return;

    for (const hub of CITY_HUBS) {
      L.circle([hub.lat, hub.lng], {
        radius: 28000,
        color: "#0284c7",
        weight: 1.2,
        dashArray: "4 4",
        fillColor: "#0284c7",
        fillOpacity: 0.08,
      }).addTo(group);

      L.circleMarker([hub.lat, hub.lng], {
        radius: 4.5,
        color: "#ffffff",
        weight: 1.5,
        fillColor: "#0284c7",
        fillOpacity: 1,
      })
        .bindTooltip(`Isuzu Hub · ${hub.city} (${hub.code})`, {
          direction: "top",
          offset: [0, -6],
        })
        .addTo(group);
    }
  }, [showGeofences]);

  // Render Custom Vehicle + Indonesian License Plate Markers
  useEffect(() => {
    const group = markersLayerRef.current;
    if (!group) return;
    group.clearLayers();

    for (const truck of trucks) {
      const isSelected = truck.id === activeTruck.id;
      const obdHealth = getVehicleObdHealth(truck, obdCatalog);

      const marker = L.marker([truck.gps.lat, truck.gps.lng], {
        icon: createTruckMarkerIcon(truck, isSelected, showObdBadges, obdCatalog),
        zIndexOffset: isSelected ? 1000 : 100,
      });

      marker.on("click", () => {
        onSelectRef.current(truck.id);
      });

      marker.bindPopup(
        `
        <div style="min-width:210px;font-family:Plus Jakarta Sans,Inter,sans-serif;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <span style="background:#d91324;color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:5px;">ISUZU ${truck.series}</span>
            <span style="font-family:monospace;font-size:11px;font-weight:900;background:${
              truck.plateType === "commercial" ? "#facc15" : "#fff"
            };color:#09090b;border:1.5px solid #0f172a;padding:1px 6px;border-radius:4px;">${
              truck.plate
            }</span>
          </div>
          <div style="font-weight:800;font-size:13px;color:#0f172a;">${truck.model}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${truck.route.currentLocation}</div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:11px;display:flex;justify-content:space-between;">
            <span><strong>OBD:</strong> ${truck.obd.deviceId}</span>
            <span style="font-weight:700;color:${
              obdHealth === "Critical"
                ? "#dc2626"
                : obdHealth === "Warning"
                ? "#d97706"
                : "#16a34a"
            };">${obdHealth} (${truck.obd.activeCodes.length} DTC)</span>
          </div>
          <div style="margin-top:4px;font-size:11px;color:#334155;">
            Speed: <strong>${truck.route.speedMph} km/h</strong> · Fuel: <strong>${truck.fuelPercent}%</strong>
          </div>
        </div>
        `,
        { offset: [0, -56] }
      );

      marker.addTo(group);
    }
  }, [trucks, activeTruck.id, showObdBadges, obdCatalog]);

  // Execute Smooth Regional Camera Commands
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraCommand) return;

    if (cameraCommand.type === "indonesia") {
      map.flyTo([-2.4, 114.8], 5, { duration: 0.75 });
    } else if (cameraCommand.type === "java") {
      map.flyTo([-7.2, 110.8], 7, { duration: 0.75 });
    } else if (cameraCommand.type === "sumatra") {
      map.flyTo([0.4, 101.6], 6, { duration: 0.75 });
    } else if (cameraCommand.type === "kalimantan") {
      map.flyTo([-1.0, 116.4], 7, { duration: 0.75 });
    } else if (cameraCommand.type === "sulawesi") {
      map.flyTo([-4.2, 119.6], 7, { duration: 0.75 });
    } else if (cameraCommand.type === "focus") {
      map.flyTo([cameraCommand.lat, cameraCommand.lng], cameraCommand.zoom ?? 9, {
        duration: 0.75,
      });
    } else if (cameraCommand.type === "zoomIn") {
      map.zoomIn();
    } else if (cameraCommand.type === "zoomOut") {
      map.zoomOut();
    }
  }, [cameraCommand]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[520px] w-full"
      aria-label="ISUZU Indonesia Interactive Leaflet Map"
    />
  );
}
