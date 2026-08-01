import { useEffect, useState } from "react";
import {
  getPushSubscriptionStatus,
  registerPushSubscription,
  removePushSubscription,
} from "../api/pushSubscriptions";
import type { AlertPreferences, SavedPlace } from "../types";
import {
  getExpoDevicePushToken,
  getInstallationId,
} from "../utils/pushNotifications";

export type PushRegistrationState =
  | "idle"
  | "registering"
  | "registered"
  | "delivery-paused"
  | "removing"
  | "error";

export function usePushRegistration(
  place: SavedPlace | null,
  updatePlace: (id: string, updates: Partial<SavedPlace>) => void,
) {
  const [status, setStatus] = useState<PushRegistrationState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setStatus(
      place?.pushRegistration
        ? place.pushRegistration.deliveryEnabled
          ? "registered"
          : "delivery-paused"
        : "idle",
    );
    if (!place?.pushRegistration) return;
    let mounted = true;
    void getPushSubscriptionStatus(place.pushRegistration)
      .then((result) => {
        if (!mounted) return;
        if (!result) {
          updatePlace(place.id, {
            alertPreferences: {
              ...(place.alertPreferences ?? {
                minimumSeverity: "Severe",
                includeUpdates: true,
                pushEnabledWhenAvailable: false,
              }),
              pushEnabledWhenAvailable: false,
            },
            pushRegistration: undefined,
          });
          setStatus("idle");
          setError("The server no longer had this subscription, so it was removed from this device.");
          return;
        }
        const deliveryEnabled = result.subscription.deliveryEnabled;
        updatePlace(place.id, {
          pushRegistration: {
            ...place.pushRegistration!,
            deliveryEnabled,
          },
        });
        setStatus(deliveryEnabled ? "registered" : "delivery-paused");
        setError(result.subscription.lastError);
      })
      .catch((caught) => {
        if (!mounted) return;
        setStatus("error");
        setError(
          caught instanceof Error
            ? caught.message
            : "Push status could not be checked",
        );
      });
    return () => {
      mounted = false;
    };
  }, [place?.id, place?.pushRegistration?.subscriptionId]);

  const enable = async (preferences: AlertPreferences) => {
    if (!place) return false;
    setStatus("registering");
    setError(null);
    try {
      const [installationId, pushToken] = await Promise.all([
        getInstallationId(),
        getExpoDevicePushToken(),
      ]);
      const result = await registerPushSubscription({
        installationId,
        pushToken,
        place,
        preferences,
        registration: place.pushRegistration,
      });
      const managementSecret =
        result.managementSecret ?? place.pushRegistration?.managementSecret;
      if (!managementSecret) throw new Error("Push registration credentials were not returned.");
      updatePlace(place.id, {
        alertPreferences: { ...preferences, pushEnabledWhenAvailable: true },
        pushRegistration: {
          subscriptionId: result.subscription.id,
          managementSecret,
          deliveryEnabled: result.subscription.deliveryEnabled,
          registeredAt: new Date().toISOString(),
        },
      });
      setStatus(result.subscription.deliveryEnabled ? "registered" : "delivery-paused");
      return true;
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Push registration failed");
      return false;
    }
  };

  const disable = async (preferences: AlertPreferences) => {
    if (!place) return false;
    if (!place.pushRegistration) {
      updatePlace(place.id, {
        alertPreferences: { ...preferences, pushEnabledWhenAvailable: false },
      });
      setStatus("idle");
      return true;
    }
    setStatus("removing");
    setError(null);
    try {
      await removePushSubscription(place.pushRegistration);
      updatePlace(place.id, {
        alertPreferences: { ...preferences, pushEnabledWhenAvailable: false },
        pushRegistration: undefined,
      });
      setStatus("idle");
      return true;
    } catch (caught) {
      setStatus("error");
      setError(
        `${caught instanceof Error ? caught.message : "Push removal failed"}. Notifications remain enabled until removal is confirmed.`,
      );
      return false;
    }
  };

  const updatePreferences = async (preferences: AlertPreferences) => {
    if (!place) return false;
    if (!place.pushRegistration || !preferences.pushEnabledWhenAvailable) {
      updatePlace(place.id, { alertPreferences: preferences });
      return true;
    }
    return enable(preferences);
  };

  return { status, error, enable, disable, updatePreferences };
}
