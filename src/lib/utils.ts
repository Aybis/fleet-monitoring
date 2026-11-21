import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WeightUnit } from "@/types/haultrack";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTons(kg: number, unit: WeightUnit = "metric"): string {
  if (unit === "imperial") {
    const lbs = Math.round(kg * 2.20462);
    return `${lbs.toLocaleString()} lbs`;
  }
  const tons = kg / 1000;
  return `${Number.isInteger(tons) ? tons.toFixed(1) : tons.toFixed(1)} tons`;
}

export function formatWeight(kg: number, unit: WeightUnit = "metric"): string {
  if (unit === "imperial") {
    const lbs = Math.round(kg * 2.20462);
    return `${lbs.toLocaleString()} lb`;
  }
  return `${kg.toLocaleString()} kg`;
}

export function formatCompactWeight(kg: number, unit: WeightUnit = "metric"): string {
  if (unit === "imperial") {
    const lbs = Math.round(kg * 2.20462);
    return `${lbs.toLocaleString()}lb`;
  }
  return `${kg.toLocaleString()}kg`;
}

export function formatCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
