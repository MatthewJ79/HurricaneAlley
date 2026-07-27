import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import type { ThemeMode } from "../types";
import { themes, type Theme } from "./tokens";

type ThemeContextValue = {
  mode: ThemeMode;
  theme: Theme;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemMode = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(
    systemMode === "light" ? "light" : "dark",
  );
  const value = useMemo(
    () => ({
      mode,
      theme: themes[mode],
      toggleMode: () => setMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
