import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const INSTALLATION_ID_KEY = "hurricane-alley.installation-id.v1";

export function configureForegroundNotifications() {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function listenForNotificationNavigation(onOpenMyArea: () => void) {
  if (Platform.OS === "web") return () => undefined;
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === "my-area") onOpenMyArea();
    },
  );
  return () => subscription.remove();
}

export async function getInstallationId() {
  const existing = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const created = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, created);
  return created;
}

export async function getExpoDevicePushToken() {
  if (Platform.OS === "web") {
    throw new Error("Push notifications are currently available in the iOS and Android apps.");
  }
  if (!Device.isDevice) {
    throw new Error("Push notifications require a physical device.");
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("official-alerts", {
      name: "Official weather alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF4F58",
      sound: "default",
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Notification permission was not granted.");
  }

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    throw new Error("An EAS project ID is required before push registration can be completed.");
  }
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

