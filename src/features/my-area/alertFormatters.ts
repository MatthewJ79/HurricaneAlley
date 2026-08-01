import type { OfficialAlert } from "../../types";

export function compareAlerts(left: OfficialAlert, right: OfficialAlert) {
  const rank: Record<string, number> = {
    Extreme: 0,
    Severe: 1,
    Moderate: 2,
    Minor: 3,
    Unknown: 4,
  };
  return (rank[left.severity] ?? 5) - (rank[right.severity] ?? 5);
}

export function formatAlertDate(value: string | null) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

