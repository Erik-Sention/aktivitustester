import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "â€”";
  return new Date(dateStr).toLocaleDateString("no-NO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fullName(
  first: string | null,
  last: string | null
): string {
  return [first, last].filter(Boolean).join(" ") || "Unknown";
}

export function testTypeLabel(type: string): string {
  switch (type.toUpperCase()) {
    case "VO2MAX":
      return "VO₂ max";
    case "LACTATE_THRESHOLD":
      return "Tröskeltest";
    case "OTHER":
      return "Övrigt";
    default:
      return type;
  }
}
