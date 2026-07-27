import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomTabs, DataStatusBanner } from "./src/components/Chrome";
import { useStormFeed } from "./src/hooks/useStormFeed";
import { AdvisoryScreen } from "./src/screens/AdvisoryScreen";
import { AlertsScreen } from "./src/screens/AlertsScreen";
import { DataScreen } from "./src/screens/DataScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { KitScreen } from "./src/screens/KitScreen";
import { PrepareScreen } from "./src/screens/PrepareScreen";
import { TrackScreen } from "./src/screens/TrackScreen";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import type { LiveStorm, ScreenName } from "./src/types";

function HurricaneAlleyApp() {
  const { theme } = useTheme();
  const stormFeed = useStormFeed();
  const [screen, setScreen] = useState<ScreenName>(initialScreen);
  const [previousScreen, setPreviousScreen] = useState<ScreenName>("home");
  const [selectedStormId, setSelectedStormId] = useState<string | null>(
    initialStormId,
  );
  const selectedStorm =
    stormFeed.storms.find((storm) => storm.id === selectedStormId) ??
    stormFeed.storms[0] ??
    null;
  const navigate = (next: ScreenName) => {
    setPreviousScreen(screen);
    setScreen(next);
  };
  const back = () => setScreen(previousScreen === "advisory" || previousScreen === "kit" ? "home" : previousScreen);
  const openStorm = (storm: LiveStorm) => {
    setSelectedStormId(storm.id);
    navigate("track");
  };
  const selectStorm = (stormId: string) => setSelectedStormId(stormId);
  const detailScreen = screen === "advisory" || screen === "kit";

  return (
    <View style={[styles.app, { backgroundColor: theme.background }]}>
      {!detailScreen ? <DataStatusBanner feed={stormFeed} /> : null}
      <View style={styles.content}>
        {screen === "home" ? (
          <HomeScreen
            navigate={navigate}
            feed={stormFeed}
            openStorm={openStorm}
          />
        ) : null}
        {screen === "track" ? (
          <TrackScreen
            storm={selectedStorm}
            storms={stormFeed.storms}
            onSelectStorm={selectStorm}
          />
        ) : null}
        {screen === "data" ? (
          <DataScreen
            storm={selectedStorm}
            storms={stormFeed.storms}
            onSelectStorm={selectStorm}
          />
        ) : null}
        {screen === "alerts" ? (
          <AlertsScreen
            navigate={navigate}
            storm={selectedStorm}
            storms={stormFeed.storms}
            onSelectStorm={selectStorm}
          />
        ) : null}
        {screen === "prepare" ? <PrepareScreen navigate={navigate} /> : null}
        {screen === "advisory" ? <AdvisoryScreen onBack={back} /> : null}
        {screen === "kit" ? <KitScreen onBack={back} /> : null}
      </View>
      {!detailScreen ? <BottomTabs screen={screen} navigate={navigate} /> : null}
    </View>
  );
}

function initialScreen(): ScreenName {
  if (typeof window === "undefined") return "home";
  const candidate = new URLSearchParams(window.location.search).get("screen");
  const screens: ScreenName[] = [
    "home",
    "track",
    "data",
    "alerts",
    "prepare",
  ];
  return screens.includes(candidate as ScreenName)
    ? (candidate as ScreenName)
    : "home";
}

function initialStormId() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("storm");
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
