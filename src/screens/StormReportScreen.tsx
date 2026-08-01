import { useEffect, useMemo, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import { StormSelector } from "../components/StormSelector";
import { AlertsPanel } from "../features/storm-report/AlertsPanel";
import { initialReportView } from "../features/storm-report/formatters";
import { ModelsPanel } from "../features/storm-report/ModelsPanel";
import { ReportMap, ReportNavigation } from "../features/storm-report/ReportNavigation";
import { styles } from "../features/storm-report/styles";
import { StormSummary, DesktopInformationRail } from "../features/storm-report/StormInformation";
import { SummaryPanel } from "../features/storm-report/SummaryPanel";
import type { ModelView, ReportView } from "../features/storm-report/types";
import { useTheme } from "../theme/ThemeProvider";
import type { LiveStorm } from "../types";
import { mappableGuidance } from "../utils/modelGuidance";

export function StormReportScreen({ storm, storms, onSelectStorm, onBack, onPrepare }: {
  storm: LiveStorm | null;
  storms: LiveStorm[];
  onSelectStorm: (stormId: string) => void;
  onBack: () => void;
  onPrepare: () => void;
}) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const desktop = width >= 900;
  const contentWidth = desktop ? Math.min(width * 0.8, 1200) : width - 40;
  const mapHeight = desktop ? Math.max(430, Math.min(520, height - 245)) : 420;
  const [view, setView] = useState<ReportView>(initialReportView);
  const [modelView, setModelView] = useState<ModelView>("All tracks");
  const [selectedAid, setSelectedAid] = useState<string | null>(null);
  const models = useMemo(() => (storm ? mappableGuidance(storm) : []), [storm]);

  useEffect(() => {
    if (!models.some((model) => model.aid === selectedAid)) {
      setSelectedAid(models.find((model) => model.aid === "AVNI")?.aid ?? models[0]?.aid ?? null);
    }
  }, [models, selectedAid]);

  if (!storm) {
    return (
      <Screen stickyHeader>
        <ScreenHeader title="Storm Report" subtitle="No active tropical cyclone" onBack={onBack} contentWidth={desktop ? contentWidth : undefined} />
        <View style={[styles.empty, { width: contentWidth, backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No current active storms</Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>Return to Home. A full report will become available when the NHC publishes an active cyclone.</Text>
        </View>
      </Screen>
    );
  }

  const visibleAids = modelView === "Individual" && selectedAid ? [selectedAid] : undefined;
  const workspaceWidth = contentWidth - 450;
  const cardWidth = desktop ? (workspaceWidth - 7) / 2 : contentWidth;
  const selectAid = (aid: string) => { setSelectedAid(aid); setModelView("Individual"); };
  const panels = (
    <>
      {view === "Models" ? <ModelsPanel storm={storm} models={models} modelView={modelView}
        selectedAid={selectedAid} guidanceWidth={cardWidth} compact={desktop}
        onSetModelView={setModelView} onSelectAid={selectAid} /> : null}
      {view === "Alerts" ? <AlertsPanel storm={storm} productWidth={cardWidth} onPrepare={onPrepare} /> : null}
      {view === "Summary" && !desktop ? <SummaryPanel storm={storm} /> : null}
    </>
  );

  return (
    <Screen stickyHeader>
      <ScreenHeader title={`${storm.classification} ${storm.name}`}
        subtitle={`${storm.basin} · Complete official storm report`} onBack={onBack}
        compact={desktop} contentWidth={desktop ? contentWidth : undefined}
        rightContent={desktop ? <StormSelector compact storms={storms} selectedStormId={storm.id} onSelect={onSelectStorm} /> : undefined} />
      <View style={[styles.report, { width: contentWidth }]}>
        {desktop ? (
          <View style={styles.desktopDashboard}>
            <ReportNavigation view={view} vertical onChange={setView} />
            <View style={styles.desktopWorkspace}>
              {view !== "Alerts" ? <ReportMap storm={storm} view={view} height={mapHeight} visibleAids={visibleAids} /> : null}
              {panels}
            </View>
            <DesktopInformationRail storm={storm} />
          </View>
        ) : (
          <>
            <StormSelector storms={storms} selectedStormId={storm.id} onSelect={onSelectStorm} />
            <StormSummary storm={storm} compact />
            <ReportNavigation view={view} onChange={setView} />
            {view !== "Alerts" ? <ReportMap storm={storm} view={view} height={mapHeight} visibleAids={visibleAids} /> : null}
            {panels}
          </>
        )}
      </View>
    </Screen>
  );
}
