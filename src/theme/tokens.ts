import type { ThemeMode } from "../types";

const shared = {
  cyan: "#00C9C8",
  cyanBright: "#00E2E7",
  red: "#E5252A",
  redBright: "#FF4F58",
  amber: "#E17800",
  warning: "#FFB11B",
  white: "#FFFFFF",
  black: "#050708",
  radiusSm: 10,
  radiusMd: 15,
  radiusLg: 24,
  space: { xs: 4, sm: 8, md: 12, lg: 20, xl: 28 },
} as const;

export const themes = {
  dark: {
    ...shared,
    background: "#050708",
    surface: "#12161B",
    surfaceRaised: "#191E24",
    surfaceMuted: "#222932",
    text: "#F6F8FA",
    textMuted: "#98A4B6",
    textFaint: "#667286",
    border: "#303A46",
    nav: "#101419",
    emergency: "#FF5058",
    emergencyText: "#FFFFFF",
    demo: "#F7A500",
    mapCard: "#070D12",
    mapStat: "#101418",
  },
  light: {
    ...shared,
    background: "#F3F6FA",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    surfaceMuted: "#E9EEF3",
    text: "#111B2F",
    textMuted: "#64748B",
    textFaint: "#8290A7",
    border: "#D6DEE8",
    nav: "#FFFFFF",
    emergency: "#E5252A",
    emergencyText: "#FFFFFF",
    demo: "#DF7900",
    mapCard: "#06131C",
    mapStat: "#FFFDA8",
  },
} as const;

export type Theme = (typeof themes)[ThemeMode];
