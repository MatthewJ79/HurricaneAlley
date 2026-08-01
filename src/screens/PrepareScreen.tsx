import { useWindowDimensions, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Chrome";
import { PrepareNavigation, PrepareProgress } from "../features/prepare/PrepareNavigation";
import { PrepareSectionContent } from "../features/prepare/PrepareSectionContent";
import { styles } from "../features/prepare/styles";
import { usePreparePlan } from "../features/prepare/usePreparePlan";

export function PrepareScreen({ onBack }: { onBack: () => void }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const contentWidth = desktop ? Math.min(width * 0.8, 1200) : width - 40;
  const workspaceWidth = desktop ? contentWidth - 230 : contentWidth;
  const state = usePreparePlan();
  const sectionCompleted = state.sectionItemIds.filter((id) => state.plan.completed.includes(id)).length;

  return (
    <Screen stickyHeader>
      <ScreenHeader title="Prepare" subtitle="Your household hurricane readiness plan" onBack={onBack}
        compact={desktop} contentWidth={desktop ? contentWidth : undefined} />
      <View style={[styles.content, { width: contentWidth }]}>
        <PrepareProgress percent={state.percent} completed={state.completedCount} total={state.allItemIds.length}
          sectionCompleted={sectionCompleted} sectionTotal={state.sectionItemIds.length} desktop={desktop} />
        <View style={[styles.workspace, desktop && styles.workspaceDesktop]}>
          <PrepareNavigation section={state.section} plan={state.plan} desktop={desktop} onChange={state.chooseSection} />
          <PrepareSectionContent section={state.section} plan={state.plan} activeGroups={state.activeGroups}
            sectionItemIds={state.sectionItemIds} groupWidth={desktop ? (workspaceWidth - 10) / 2 : workspaceWidth}
            desktop={desktop} newItem={state.newItem} saveMessage={state.saveMessage}
            onMarkComplete={state.markSectionComplete} onToggle={state.toggleItem} onRemove={state.removeCustomItem}
            onNewItem={state.setNewItem} onAddItem={state.addCustomItem} onFieldChange={state.updateField}
            onSaveMessage={state.setSaveMessage} />
        </View>
      </View>
    </Screen>
  );
}
