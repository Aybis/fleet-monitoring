// Real geographic coordinate projection for the Indonesian Archipelago
// Longitude: 94.2° E (Sabang) to 141.6° E (Merauke)
// Latitude:   6.6° N (Aceh)   to -11.4° S (Rote/Timor)
// SVG Viewport: 1200 x 520

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 520;

const MIN_LNG = 94.2;
const MAX_LNG = 141.8;
const MAX_LAT = 6.6;
const MIN_LAT = -11.6;

export function projectIndonesia(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * MAP_WIDTH;
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * MAP_HEIGHT;
  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
  };
}

function polyToPath(coords: Array<[number, number]>): string {
  return (
    coords
      .map(([lat, lng], idx) => {
        const { x, y } = projectIndonesia(lat, lng);
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ") + " Z"
  );
}

// Accurate simplified geographic polygons (lat, lng) for Indonesia's major islands
export const INDONESIA_ISLANDS: Array<{ id: string; name: string; labelLat: number; labelLng: number; d: string }> = [
  {
    id: "sumatra",
    name: "SUMATRA",
    labelLat: 0.2,
    labelLng: 101.2,
    d: polyToPath([
      [5.55, 95.32],
      [5.25, 97.45],
      [3.85, 98.75],
      [2.6, 100.1],
      [1.7, 101.55],
      [0.85, 103.1],
      [-0.85, 103.9],
      [-1.7, 104.5],
      [-2.5, 105.75],
      [-4.1, 105.9],
      [-5.85, 105.75],
      [-5.9, 104.65],
      [-4.2, 102.5],
      [-2.6, 101.1],
      [-1.0, 100.25],
      [0.6, 99.0],
      [2.1, 97.8],
      [3.7, 96.3],
      [5.2, 95.25],
    ]),
  },
  {
    id: "bangka",
    name: "",
    labelLat: -2.2,
    labelLng: 106.1,
    d: polyToPath([
      [-1.55, 105.7],
      [-1.85, 106.25],
      [-2.85, 106.65],
      [-2.95, 106.05],
      [-2.2, 105.55],
    ]),
  },
  {
    id: "java",
    name: "JAWA",
    labelLat: -7.25,
    labelLng: 109.7,
    d: polyToPath([
      [-5.95, 105.85],
      [-6.05, 106.85],
      [-6.25, 108.35],
      [-6.85, 109.6],
      [-6.55, 110.85],
      [-6.75, 111.6],
      [-7.15, 112.75],
      [-7.75, 113.85],
      [-7.85, 114.42],
      [-8.72, 114.35],
      [-8.45, 113.35],
      [-8.3, 111.7],
      [-8.1, 110.2],
      [-7.75, 108.6],
      [-7.45, 106.95],
      [-6.85, 105.55],
    ]),
  },
  {
    id: "madura",
    name: "",
    labelLat: -7.0,
    labelLng: 113.3,
    d: polyToPath([
      [-6.9, 112.75],
      [-6.88, 113.95],
      [-7.15, 113.9],
      [-7.2, 112.75],
    ]),
  },
  {
    id: "bali",
    name: "BALI",
    labelLat: -8.35,
    labelLng: 115.15,
    d: polyToPath([
      [-8.12, 114.45],
      [-8.08, 115.35],
      [-8.45, 115.7],
      [-8.82, 115.18],
      [-8.45, 114.6],
    ]),
  },
  {
    id: "lombok",
    name: "",
    labelLat: -8.65,
    labelLng: 116.3,
    d: polyToPath([
      [-8.25, 116.05],
      [-8.3, 116.65],
      [-8.9, 116.55],
      [-8.85, 116.0],
    ]),
  },
  {
    id: "sumbawa",
    name: "",
    labelLat: -8.65,
    labelLng: 117.9,
    d: polyToPath([
      [-8.45, 116.8],
      [-8.2, 118.0],
      [-8.4, 119.15],
      [-8.95, 118.95],
      [-9.0, 117.25],
    ]),
  },
  {
    id: "flores",
    name: "",
    labelLat: -8.6,
    labelLng: 121.3,
    d: polyToPath([
      [-8.5, 119.85],
      [-8.25, 122.95],
      [-8.75, 122.85],
      [-8.85, 120.1],
    ]),
  },
  {
    id: "sumba",
    name: "",
    labelLat: -9.7,
    labelLng: 119.9,
    d: polyToPath([
      [-9.35, 119.05],
      [-9.55, 120.75],
      [-10.2, 120.4],
      [-9.75, 118.95],
    ]),
  },
  {
    id: "timor",
    name: "",
    labelLat: -9.5,
    labelLng: 124.5,
    d: polyToPath([
      [-10.35, 123.45],
      [-9.1, 124.9],
      [-8.4, 127.2],
      [-8.95, 127.1],
      [-9.75, 125.1],
      [-10.35, 123.75],
    ]),
  },
  {
    id: "kalimantan",
    name: "KALIMANTAN",
    labelLat: 0.3,
    labelLng: 114.2,
    d: polyToPath([
      [1.8, 109.1],
      [1.4, 110.4],
      [2.5, 111.8],
      [4.2, 114.2],
      [5.9, 116.2],
      [6.4, 117.6],
      [4.4, 118.6],
      [2.6, 117.9],
      [1.1, 118.95],
      [-0.5, 117.55],
      [-1.7, 116.5],
      [-3.7, 116.2],
      [-4.1, 114.7],
      [-3.35, 113.4],
      [-3.4, 111.75],
      [-2.95, 110.2],
      [-1.2, 109.35],
      [0.3, 108.95],
    ]),
  },
  {
    id: "sulawesi",
    name: "SULAWESI",
    labelLat: -1.8,
    labelLng: 120.6,
    d: polyToPath([
      [1.55, 125.15],
      [0.5, 124.2],
      [0.45, 122.0],
      [1.15, 120.75],
      [0.05, 119.85],
      [-0.95, 119.8],
      [-1.3, 121.05],
      [-0.65, 122.95],
      [-1.15, 123.25],
      [-2.15, 121.55],
      [-3.5, 122.5],
      [-4.55, 122.75],
      [-4.85, 121.95],
      [-3.4, 121.05],
      [-2.7, 120.4],
      [-4.4, 120.35],
      [-5.6, 120.1],
      [-5.55, 119.35],
      [-3.6, 119.45],
      [-3.2, 118.8],
      [-1.6, 119.2],
      [0.8, 120.2],
      [1.2, 122.4],
      [1.6, 124.85],
    ]),
  },
  {
    id: "halmahera",
    name: "",
    labelLat: 0.7,
    labelLng: 128.0,
    d: polyToPath([
      [2.1, 127.9],
      [1.1, 128.6],
      [0.6, 128.1],
      [0.3, 128.8],
      [-0.7, 128.3],
      [-0.2, 127.6],
      [0.9, 127.5],
    ]),
  },
  {
    id: "seram",
    name: "MALUKU",
    labelLat: -3.1,
    labelLng: 129.3,
    d: polyToPath([
      [-2.85, 127.95],
      [-2.95, 130.65],
      [-3.55, 130.7],
      [-3.35, 128.1],
    ]),
  },
  {
    id: "papua",
    name: "PAPUA",
    labelLat: -4.2,
    labelLng: 137.8,
    d: polyToPath([
      [-0.85, 131.05],
      [-0.45, 132.9],
      [-1.5, 134.15],
      [-2.6, 134.55],
      [-2.05, 136.45],
      [-1.8, 138.8],
      [-2.55, 141.0],
      [-9.05, 141.0],
      [-8.35, 139.0],
      [-7.8, 137.85],
      [-5.3, 137.45],
      [-4.2, 134.85],
      [-3.3, 133.1],
      [-2.4, 132.1],
      [-1.7, 131.1],
    ]),
  },
];

// Key Freight Corridors (Toll Roads & Ro-Ro Sea Freight Lanes)
export const INDONESIA_CORRIDORS: Array<{
  id: string;
  label: string;
  type: "toll" | "sea";
  points: Array<[number, number]>;
}> = [
  {
    id: "trans-java",
    label: "Tol Trans-Jawa",
    type: "toll",
    points: [
      [-6.02, 106.0],
      [-6.2088, 106.8456],
      [-6.55, 107.6],
      [-6.73, 108.55],
      [-6.9667, 110.4167],
      [-7.2575, 112.7521],
      [-7.85, 114.25],
    ],
  },
  {
    id: "jkt-bdg",
    label: "Tol Cipularang",
    type: "toll",
    points: [
      [-6.2088, 106.8456],
      [-6.52, 107.32],
      [-6.9175, 107.6191],
    ],
  },
  {
    id: "trans-sumatra",
    label: "Tol Trans-Sumatra",
    type: "toll",
    points: [
      [3.5952, 98.6722],
      [1.95, 100.2],
      [0.5071, 101.4478],
      [-1.6101, 103.6131],
      [-2.9761, 104.7754],
      [-5.4292, 105.261],
      [-6.02, 106.0],
    ],
  },
  {
    id: "kalimantan-east",
    label: "Tol Balikpapan–Samarinda",
    type: "toll",
    points: [
      [-1.2379, 116.8529],
      [-0.5022, 117.1536],
    ],
  },
  {
    id: "sulawesi-south",
    label: "Trans-Sulawesi",
    type: "toll",
    points: [
      [-5.1477, 119.4327],
      [-4.0167, 119.6236],
      [-2.95, 120.15],
    ],
  },
  {
    id: "sea-sby-bpn",
    label: "Ro-Ro SBY–BPN",
    type: "sea",
    points: [
      [-7.2575, 112.7521],
      [-4.2, 115.1],
      [-1.2379, 116.8529],
    ],
  },
  {
    id: "sea-sby-mks",
    label: "Ro-Ro SBY–MKS",
    type: "sea",
    points: [
      [-7.2575, 112.7521],
      [-6.3, 116.4],
      [-5.1477, 119.4327],
    ],
  },
  {
    id: "sby-bali",
    label: "SBY–DPS Ferry",
    type: "sea",
    points: [
      [-7.2575, 112.7521],
      [-8.16, 114.43],
      [-8.6705, 115.2126],
    ],
  },
];

export function pointsToSvgPath(points: Array<[number, number]>): string {
  return points
    .map(([lat, lng], idx) => {
      const { x, y } = projectIndonesia(lat, lng);
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

// Strict Indonesia Geographic Bounds (Sabang -> Merauke, Miangas -> Rote)
export const INDONESIA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-11.5, 94.6],
  [6.4, 141.4],
];

export interface UnitRouteStop {
  code: string;
  city: string;
  hubLabel: string;
  lat: number;
  lng: number;
  eta: string;
}

// Multi-Stop Indonesian Route Paths (From -> To 1 -> To 2 -> To 3 -> Final) per Registered Unit
export const UNIT_ROUTE_PATHS: Record<string, UnitRouteStop[]> = {
  "ISZ-204": [
    { code: "JKT", city: "Jakarta", hubLabel: "Karawang / Cikampek Hub", lat: -6.2088, lng: 106.8456, eta: "06:30 WIB" },
    { code: "CBN", city: "Cirebon", hubLabel: "Tol Cipali · Cirebon Drop", lat: -6.732, lng: 108.5523, eta: "10:15 WIB" },
    { code: "SMG", city: "Semarang", hubLabel: "Semarang Kaliwungu Hub", lat: -6.9667, lng: 110.4167, eta: "14:20 WIB" },
    { code: "SBY", city: "Surabaya", hubLabel: "Tanjung Perak Terminal", lat: -7.2575, lng: 112.7521, eta: "18:45 WIB" },
  ],
  "ISZ-118": [
    { code: "SBY", city: "Surabaya", hubLabel: "Tanjung Perak Dock #1", lat: -7.2575, lng: 112.7521, eta: "08:00 WIB" },
    { code: "TBN", city: "Tuban", hubLabel: "Pantura Tuban Checkpoint", lat: -6.8976, lng: 112.0649, eta: "10:30 WIB" },
    { code: "SMG", city: "Semarang", hubLabel: "Semarang Logistics Park", lat: -6.9667, lng: 110.4167, eta: "13:45 WIB" },
    { code: "TGL", city: "Tegal", hubLabel: "Tegal Cold-Chain Drop", lat: -6.8694, lng: 109.1402, eta: "16:10 WIB" },
    { code: "JKT", city: "Jakarta", hubLabel: "Tanjung Priok Hub", lat: -6.2088, lng: 106.8456, eta: "20:00 WIB" },
  ],
  "ISZ-309": [
    { code: "JKT", city: "Jakarta", hubLabel: "Cikarang Consolidation", lat: -6.2088, lng: 106.8456, eta: "06:40 WIB" },
    { code: "KRW", city: "Karawang", hubLabel: "KIIC Industrial Drop #1", lat: -6.3227, lng: 107.3376, eta: "08:05 WIB" },
    { code: "PWK", city: "Purwakarta", hubLabel: "Tol Cipularang KM 88", lat: -6.5569, lng: 107.4433, eta: "09:15 WIB" },
    { code: "BDG", city: "Bandung", hubLabel: "Gedebage Freight Hub", lat: -6.9175, lng: 107.6191, eta: "11:00 WIB" },
  ],
  "ISZ-412": [
    { code: "MDN", city: "Medan", hubLabel: "Belawan Sumatra Hub", lat: 3.5952, lng: 98.6722, eta: "05:30 WIB" },
    { code: "RPR", city: "Rantau Prapat", hubLabel: "Labuhanbatu Drop #1", lat: 2.1, lng: 99.83, eta: "10:40 WIB" },
    { code: "PKU", city: "Pekanbaru", hubLabel: "Riau Distribution Hub", lat: 0.5071, lng: 101.4478, eta: "15:20 WIB" },
    { code: "JMB", city: "Jambi", hubLabel: "Jambi Transit Depot", lat: -1.6101, lng: 103.6131, eta: "20:10 WIB" },
    { code: "PLB", city: "Palembang", hubLabel: "Boom Baru Terminal", lat: -2.9761, lng: 104.7754, eta: "01:30 WIB" },
  ],
  "ISZ-501": [
    { code: "BPN", city: "Balikpapan", hubLabel: "Kariangau Port Hub", lat: -1.2379, lng: 116.8529, eta: "07:00 WITA" },
    { code: "IKN", city: "Sepaku / IKN", hubLabel: "IKN Nusantara Supply Drop", lat: -0.973, lng: 116.709, eta: "09:10 WITA" },
    { code: "TGR", city: "Tenggarong", hubLabel: "Kutai Kartanegara Drop", lat: -0.4402, lng: 116.9896, eta: "11:30 WITA" },
    { code: "SMD", city: "Samarinda", hubLabel: "Palaran Freight Hub", lat: -0.5022, lng: 117.1536, eta: "13:00 WITA" },
  ],
  "ISZ-615": [
    { code: "MKS", city: "Makassar", hubLabel: "Soekarno-Hatta Port Hub", lat: -5.1477, lng: 119.4327, eta: "06:15 WITA" },
    { code: "MRS", city: "Maros", hubLabel: "Maros Industrial Drop #1", lat: -4.996, lng: 119.572, eta: "07:30 WITA" },
    { code: "BRU", city: "Barru", hubLabel: "Barru Coastal Checkpoint", lat: -4.407, lng: 119.622, eta: "09:45 WITA" },
    { code: "PRE", city: "Parepare", hubLabel: "Parepare Logistics Hub", lat: -4.0167, lng: 119.6236, eta: "11:20 WITA" },
    { code: "PLP", city: "Palopo", hubLabel: "Palopo North Sulsel Drop", lat: -2.9925, lng: 120.1969, eta: "15:10 WITA" },
  ],
  "ISZ-722": [
    { code: "SBY", city: "Surabaya", hubLabel: "Rungkut Industrial Hub", lat: -7.2575, lng: 112.7521, eta: "06:00 WIB" },
    { code: "PBL", city: "Probolinggo", hubLabel: "Tol Paspro Drop #1", lat: -7.7543, lng: 113.2159, eta: "08:30 WIB" },
    { code: "BWI", city: "Banyuwangi", hubLabel: "Ketapang Ro-Ro Ferry", lat: -8.1445, lng: 114.3974, eta: "12:15 WIB" },
    { code: "GLM", city: "Gilimanuk", hubLabel: "Bali West Gate Check", lat: -8.1636, lng: 114.439, eta: "14:00 WITA" },
    { code: "DPS", city: "Denpasar", hubLabel: "Benoa Distribution Hub", lat: -8.6705, lng: 115.2126, eta: "17:15 WITA" },
  ],
};

export interface InterpolatedRouteState {
  lat: number;
  lng: number;
  headingDeg: number;
  completedPath: Array<[number, number]>;
  remainingPath: Array<[number, number]>;
  stops: Array<UnitRouteStop & { status: "completed" | "next" | "upcoming"; stopIndex: number }>;
  currentLegLabel: string;
}

export function interpolateUnitRoute(
  truckId: string,
  progressPercent: number
): InterpolatedRouteState {
  const stops = UNIT_ROUTE_PATHS[truckId] ?? UNIT_ROUTE_PATHS["ISZ-204"];
  const clamped = Math.max(0, Math.min(100, progressPercent)) / 100;

  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const dLat = stops[i + 1].lat - stops[i].lat;
    const dLng = stops[i + 1].lng - stops[i].lng;
    const len = Math.hypot(dLat, dLng);
    segLengths.push(len);
    totalLen += len;
  }

  const targetDist = clamped * totalLen;
  let acc = 0;
  let segIdx = 0;
  let segT = 0;

  for (let i = 0; i < segLengths.length; i++) {
    if (acc + segLengths[i] >= targetDist || i === segLengths.length - 1) {
      segIdx = i;
      segT = segLengths[i] > 0 ? Math.min(1, Math.max(0, (targetDist - acc) / segLengths[i])) : 0;
      break;
    }
    acc += segLengths[i];
  }

  const a = stops[segIdx];
  const b = stops[segIdx + 1] ?? a;
  const lat = Number((a.lat + (b.lat - a.lat) * segT).toFixed(4));
  const lng = Number((a.lng + (b.lng - a.lng) * segT).toFixed(4));

  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  const headingDeg = Math.round(((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360);

  const completedPath: Array<[number, number]> = [
    ...stops.slice(0, segIdx + 1).map((s): [number, number] => [s.lat, s.lng]),
    [lat, lng],
  ];
  const remainingPath: Array<[number, number]> = [
    [lat, lng],
    ...stops.slice(segIdx + 1).map((s): [number, number] => [s.lat, s.lng]),
  ];

  const stopsWithStatus = stops.map((s, idx) => ({
    ...s,
    stopIndex: idx,
    status: (idx <= segIdx ? "completed" : idx === segIdx + 1 ? "next" : "upcoming") as
      | "completed"
      | "next"
      | "upcoming",
  }));

  return {
    lat,
    lng,
    headingDeg,
    completedPath,
    remainingPath,
    stops: stopsWithStatus,
    currentLegLabel: `${a.city} → ${b.city}`,
  };
}
