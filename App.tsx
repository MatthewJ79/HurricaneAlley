import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomTabs, DataStatusBanner } from "./src/components/Chrome";
import { useStormFeed } from "./src/hooks/useStormFeed";
import { AdvisoryScreen } from "./src/screens/AdvisoryScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { KitScreen } from "./src/screens/KitScreen";
import { PrepareScreen } from "./src/screens/PrepareScreen";
import { StormReportScreen } from "./src/screens/StormReportScreen";
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
    navigate("storm");
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
        {screen === "storm" ? (
          <StormReportScreen
            storm={selectedStorm}
            storms={stormFeed.storms}
            onSelectStorm={selectStorm}
            onBack={() => setScreen("home")}
            onPrepare={() => navigate("prepare")}
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
  if (candidate === "track" || candidate === "data" || candidate === "alerts") {
    return "storm";
  }
  const screens: ScreenName[] = ["home", "storm", "prepare"];
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
