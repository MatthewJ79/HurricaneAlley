import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomTabs, DataStatusBanner } from "./src/components/Chrome";
import { useStormFeed } from "./src/hooks/useStormFeed";
import { HomeScreen } from "./src/screens/HomeScreen";
import { MyAreaScreen } from "./src/screens/MyAreaScreen";
import { PrepareScreen } from "./src/screens/PrepareScreen";
import { StormReportScreen } from "./src/screens/StormReportScreen";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import type { LiveStorm, ScreenName } from "./src/types";
import {
  configureForegroundNotifications,
  listenForNotificationNavigation,
} from "./src/utils/pushNotifications";

function HurricaneAlleyApp() {
  const { theme } = useTheme();
  const stormFeed = useStormFeed();
  const [screen, setScreen] = useState<ScreenName>(initialScreen);
  const [selectedStormId, setSelectedStormId] = useState<string | null>(
    initialStormId,
  );
  const selectedStorm =
    stormFeed.storms.find((storm) => storm.id === selectedStormId) ??
    stormFeed.storms[0] ??
    null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      setScreen(screenFromLocation());
      setSelectedStormId(stormIdFromLocation());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    configureForegroundNotifications();
    return listenForNotificationNavigation(() => navigate("my-area"));
  }, []);

  const navigate = (next: ScreenName, stormId?: string | null) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", next);
      url.searchParams.delete("reportView");
      url.searchParams.delete("modelView");
      url.searchParams.delete("aid");
      url.searchParams.delete("prepareSection");
      if (next === "storm" && stormId) {
        url.searchParams.set("storm", stormId);
      } else if (next !== "storm") {
        url.searchParams.delete("storm");
      }
      window.history.pushState({ screen: next }, "", url);
    }
    setScreen(next);
  };

  const openStorm = (storm: LiveStorm) => {
    setSelectedStormId(storm.id);
    navigate("storm", storm.id);
  };

  const selectStorm = (stormId: string) => {
    setSelectedStormId(stormId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", "storm");
      url.searchParams.set("storm", stormId);
      window.history.replaceState({ screen: "storm" }, "", url);
    }
  };

  return (
    <View style={[styles.app, { backgroundColor: theme.background }]}>
      <DataStatusBanner feed={stormFeed} />
      <View style={styles.content}>
        {screen === "home" ? (
          <HomeScreen
            navigate={navigate}
            feed={stormFeed}
            openStorm={openStorm}
          />
        ) : null}
        {screen === "storm" ? (
          <StormReportScreen
            storm={selectedStorm}
            storms={stormFeed.storms}
            onSelectStorm={selectStorm}
            onBack={() => navigate("home")}
            onPrepare={() => navigate("prepare")}
          />
        ) : null}
        {screen === "my-area" ? <MyAreaScreen /> : null}
        {screen === "prepare" ? (
          <PrepareScreen onBack={() => navigate("home")} />
        ) : null}
      </View>
      <BottomTabs screen={screen} navigate={navigate} />
    </View>
  );
}

function screenFromLocation(): ScreenName {
  if (typeof window === "undefined") return "home";
  const candidate = new URLSearchParams(window.location.search).get("screen");
  if (candidate === "track" || candidate === "data" || candidate === "alerts") {
    return "storm";
  }
  if (candidate === "kit" || candidate === "advisory") return "prepare";
  const screens: ScreenName[] = ["home", "my-area", "storm", "prepare"];
  return screens.includes(candidate as ScreenName)
    ? (candidate as ScreenName)
    : "home";
}

function stormIdFromLocation() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("storm");
}

function initialScreen() {
  return screenFromLocation();
}

function initialStormId() {
  return stormIdFromLocation();
}

export default function App() {
  return (
    <ThemeProvider>
      <HurricaneAlleyApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, width: "100%", overflow: "hidden" },
  content: { flex: 1, width: "100%" },
});
