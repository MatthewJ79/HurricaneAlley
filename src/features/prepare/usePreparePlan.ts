import { useEffect, useMemo, useState } from "react";
import { allBuiltInItems, type PrepareSectionId } from "../../data/preparedness";
import { groupsForSection, loadPlan, sectionFromLocation, STORAGE_KEY, type PrepareFields } from "./plan";

export function usePreparePlan() {
  const [section, setSection] = useState<PrepareSectionId>(sectionFromLocation);
  const [plan, setPlan] = useState(loadPlan);
  const [newItem, setNewItem] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }, [plan]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => setSection(sectionFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const allItemIds = useMemo(() => [
    ...allBuiltInItems.map((item) => item.id), ...plan.customItems.map((item) => item.id),
  ], [plan.customItems]);
  const activeGroups = groupsForSection(section);
  const sectionItemIds = section === "personal"
    ? plan.customItems.map((item) => item.id)
    : activeGroups.flatMap((group) => group.items.map((item) => item.id));
  const completedCount = allItemIds.filter((id) => plan.completed.includes(id)).length;
  const percent = allItemIds.length ? Math.round((completedCount / allItemIds.length) * 100) : 0;

  const chooseSection = (next: PrepareSectionId) => {
    setSection(next); setSaveMessage("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", "prepare"); url.searchParams.set("prepareSection", next);
      window.history.pushState({ screen: "prepare", prepareSection: next }, "", url);
    }
  };
  const toggleItem = (id: string) => setPlan((current) => ({
    ...current,
    completed: current.completed.includes(id)
      ? current.completed.filter((candidate) => candidate !== id)
      : [...current.completed, id],
  }));
  const markSectionComplete = () => setPlan((current) => ({
    ...current, completed: Array.from(new Set([...current.completed, ...sectionItemIds])),
  }));
  const addCustomItem = () => {
    const label = newItem.trim(); if (!label) return;
    setPlan((current) => ({ ...current, customItems: [...current.customItems, { id: `custom-${Date.now()}`, label }] }));
    setNewItem("");
  };
  const removeCustomItem = (id: string) => setPlan((current) => ({
    ...current,
    customItems: current.customItems.filter((item) => item.id !== id),
    completed: current.completed.filter((candidate) => candidate !== id),
  }));
  const updateField = (field: keyof PrepareFields, value: string) => {
    setPlan((current) => ({ ...current, fields: { ...current.fields, [field]: value } }));
    setSaveMessage("");
  };
  return { section, plan, newItem, saveMessage, allItemIds, activeGroups, sectionItemIds,
    completedCount, percent, chooseSection, toggleItem, markSectionComplete, addCustomItem,
    removeCustomItem, updateField, setNewItem, setSaveMessage };
}
