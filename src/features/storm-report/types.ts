import type { LiveStorm } from "../../types";

export type ReportView = "Summary" | "Models" | "Alerts";
export type ModelView = "All tracks" | "Agreement" | "Individual";
export type GuidancePoint =
  NonNullable<LiveStorm["modelGuidance"]>["aids"][number]["points"][number];

export const reportViews: Array<{
  id: ReportView;
  icon: "pulse-outline" | "analytics-outline" | "warning-outline";
  label: string;
}> = [
  { id: "Summary", icon: "pulse-outline", label: "Summary" },
  { id: "Models", icon: "analytics-outline", label: "Models" },
  { id: "Alerts", icon: "warning-outline", label: "Alerts" },
];
