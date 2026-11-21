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
