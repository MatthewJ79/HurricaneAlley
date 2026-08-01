import { Platform } from "react-native";
import type { AlertPreferences, PushRegistration, SavedPlace } from "../types";
import { API_BASE_URL } from "./storms";

export type PushSubscriptionStatus = {
  id: string;
  placeId: string;
  deliveryEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastCheckAt: string | null;
  lastDeliveryAt: string | null;
  lastError: string | null;
  pendingCount: number;
};

export async function registerPushSubscription({
  installationId,
  pushToken,
  place,
  preferences,
  registration,
}: {
  installationId: string;
  pushToken: string;
  place: SavedPlace;
  preferences: AlertPreferences;
  registration?: PushRegistration;
}) {
  const response = await fetch(`${API_BASE_URL}/v1/push/subscriptions`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      installationId,
      pushToken,
      platform: Platform.OS,
      place: {
        id: place.id,
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
      },
      preferences: {
        minimumSeverity: preferences.minimumSeverity,
        includeUpdates: preferences.includeUpdates,
      },
      subscriptionId: registration?.subscriptionId,
      managementSecret: registration?.managementSecret,
    }),
  });
  if (!response.ok) {
    throw new Error(`Push registration failed with status ${response.status}`);
  }
  return (await response.json()) as {
    subscription: PushSubscriptionStatus;
    managementSecret: string | null;
  };
}

export async function removePushSubscription(registration: PushRegistration) {
  const response = await fetch(
    `${API_BASE_URL}/v1/push/subscriptions/${encodeURIComponent(registration.subscriptionId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${registration.managementSecret}` },
    },
  );
  if (!response.ok) {
    throw new Error(`Push removal failed with status ${response.status}`);
  }
}

export async function getPushSubscriptionStatus(
  registration: PushRegistration,
) {
  const response = await fetch(
    `${API_BASE_URL}/v1/push/subscriptions/${encodeURIComponent(registration.subscriptionId)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${registration.managementSecret}`,
      },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Push status check failed with status ${response.status}`);
  }
  return (await response.json()) as { subscription: PushSubscriptionStatus };
}
