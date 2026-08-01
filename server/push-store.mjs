import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseAlertPoint } from "./nws-alerts.mjs";

const CACHE_DIRECTORY = path.resolve("server", ".cache");
const SUBSCRIPTIONS_FILE = path.join(CACHE_DIRECTORY, "push-subscriptions.json");
const SEVERITIES = new Set(["Extreme", "Severe", "Moderate", "Any"]);

function secretHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validSecret(candidate, expectedHash) {
  if (typeof candidate !== "string" || !candidate) return false;
  const actual = Buffer.from(secretHash(candidate), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function requiredText(value, label, maxLength = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new TypeError(`${label} is invalid`);
  }
  return value.trim();
}

export function normalizePushSubscription(input) {
  const pushToken = requiredText(input?.pushToken, "Push token", 300);
  if (!/^(?:ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(pushToken)) {
    throw new TypeError("Push token is not an Expo push token");
  }
  const platform = requiredText(input?.platform, "Platform", 20);
  if (!new Set(["ios", "android"]).has(platform)) {
    throw new TypeError("Platform must be ios or android");
  }
  const point = parseAlertPoint(input?.place?.latitude, input?.place?.longitude);
  const minimumSeverity = input?.preferences?.minimumSeverity ?? "Severe";
  if (!SEVERITIES.has(minimumSeverity)) {
    throw new TypeError("Minimum severity is invalid");
  }

  return {
    installationId: requiredText(input?.installationId, "Installation ID", 120),
    pushToken,
    platform,
    place: {
      id: requiredText(input?.place?.id, "Place ID", 160),
      name: requiredText(input?.place?.name, "Place name", 120),
      ...point,
    },
    preferences: {
      minimumSeverity,
      includeUpdates: input?.preferences?.includeUpdates !== false,
    },
  };
}

export async function readPushSubscriptions() {
  try {
    const value = JSON.parse(await readFile(SUBSCRIPTIONS_FILE, "utf8"));
    return Array.isArray(value)
      ? value.map((subscription) => ({
          ...subscription,
          lastSnapshot: subscription.lastSnapshot ?? null,
          pendingEvents: subscription.pendingEvents ?? [],
          lastCheckAt: subscription.lastCheckAt ?? null,
          lastDeliveryAt: subscription.lastDeliveryAt ?? null,
          lastError: subscription.lastError ?? null,
        }))
      : [];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function writePushSubscriptions(subscriptions) {
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  const temporaryFile = `${SUBSCRIPTIONS_FILE}.${process.pid}.tmp`;
  await writeFile(
    temporaryFile,
    `${JSON.stringify(subscriptions, null, 2)}\n`,
    "utf8",
  );
  await rename(temporaryFile, SUBSCRIPTIONS_FILE);
}

export function upsertPushSubscription(subscriptions, input, now = new Date()) {
  const normalized = normalizePushSubscription(input);
  const requestedId = input?.subscriptionId;
  const existingIndex = requestedId
    ? subscriptions.findIndex((item) => item.id === requestedId)
    : -1;
  const updatedAt = now.toISOString();

  if (requestedId && existingIndex < 0) {
    const error = new Error("Subscription was not found");
    error.statusCode = 404;
    throw error;
  }

  if (existingIndex >= 0) {
    const existing = subscriptions[existingIndex];
    if (!validSecret(input?.managementSecret, existing.secretHash)) {
      const error = new Error("Subscription credentials are invalid");
      error.statusCode = 403;
      throw error;
    }
    const updated = { ...existing, ...normalized, updatedAt };
    subscriptions[existingIndex] = updated;
    return { subscriptions, subscription: updated, managementSecret: null };
  }

  const managementSecret = randomBytes(32).toString("base64url");
  const subscription = {
    id: randomUUID(),
    secretHash: secretHash(managementSecret),
    ...normalized,
    createdAt: updatedAt,
    updatedAt,
    lastSnapshot: null,
    pendingEvents: [],
    lastCheckAt: null,
    lastDeliveryAt: null,
    lastError: null,
  };
  const recovered = subscriptions.filter(
    (item) =>
      !(
        item.installationId === normalized.installationId &&
        item.pushToken === normalized.pushToken &&
        item.place.id === normalized.place.id
      ),
  );
  if (recovered.length >= 10_000) {
    const error = new Error("Push subscription capacity has been reached");
    error.statusCode = 503;
    throw error;
  }
  return {
    subscriptions: [...recovered, subscription],
    subscription,
    managementSecret,
  };
}

export function removePushSubscription(subscriptions, id, managementSecret) {
  const existing = subscriptions.find((item) => item.id === id);
  if (!existing) return { subscriptions, removed: false };
  if (!validSecret(managementSecret, existing.secretHash)) {
    const error = new Error("Subscription credentials are invalid");
    error.statusCode = 403;
    throw error;
  }
  return {
    subscriptions: subscriptions.filter((item) => item.id !== id),
    removed: true,
  };
}

export function findAuthorizedSubscription(
  subscriptions,
  id,
  managementSecret,
) {
  const subscription = subscriptions.find((item) => item.id === id);
  return subscription && validSecret(managementSecret, subscription.secretHash)
    ? subscription
    : null;
}

export function publicSubscriptionStatus(subscription, deliveryEnabled) {
  return {
    id: subscription.id,
    placeId: subscription.place.id,
    deliveryEnabled,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    lastCheckAt: subscription.lastCheckAt,
    lastDeliveryAt: subscription.lastDeliveryAt,
    lastError: subscription.lastError,
    pendingCount: subscription.pendingEvents.length,
  };
}
