import {
  communicationGroups, documentGroups, evacuationGroups, suppliesGroups,
  type PrepareSectionId,
} from "../../data/preparedness";

export type CustomItem = { id: string; label: string };
export type PrepareFields = {
  destinationPrimary: string;
  destinationBackup: string;
  departureTrigger: string;
  contactName: string;
  contactPhone: string;
  meetingPoint: string;
  documentLocation: string;
  insuranceContact: string;
};
export type StoredPreparePlan = { completed: string[]; customItems: CustomItem[]; fields: PrepareFields };

export const STORAGE_KEY = "hurricane-alley-prepare-v1";
export const defaultFields: PrepareFields = {
  destinationPrimary: "", destinationBackup: "", departureTrigger: "",
  contactName: "", contactPhone: "", meetingPoint: "",
  documentLocation: "", insuranceContact: "",
};

export function groupsForSection(section: PrepareSectionId) {
  if (section === "supplies") return suppliesGroups;
  if (section === "evacuation") return evacuationGroups;
  if (section === "communication") return communicationGroups;
  if (section === "documents") return documentGroups;
  return [];
}

export function sectionFromLocation(): PrepareSectionId {
  if (typeof window === "undefined") return "supplies";
  const requested = new URLSearchParams(window.location.search).get("prepareSection");
  if (["supplies", "evacuation", "communication", "documents", "personal"].includes(requested ?? "")) {
    return requested as PrepareSectionId;
  }
  return "supplies";
}

export function loadPlan(): StoredPreparePlan {
  const empty = { completed: [], customItems: [], fields: defaultFields };
  if (typeof window === "undefined") return empty;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return empty;
    const parsed = JSON.parse(stored) as Partial<StoredPreparePlan>;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
      fields: { ...defaultFields, ...(parsed.fields ?? {}) },
    };
  } catch {
    return empty;
  }
}
