import { normalizeCurrentStorms } from "./normalize.mjs";
import { NHC_CURRENT_STORMS_URL } from "./shared.mjs";

export async function fetchCurrentStorms({
  fetchImpl = fetch,
  signal,
  etag,
  lastModified,
} = {}) {
  const headers = {
    Accept: "application/json",
    "User-Agent": "HurricaneAlley/0.1 contact=local-development",
  };
  if (etag) headers["If-None-Match"] = etag;
  if (lastModified) headers["If-Modified-Since"] = lastModified;
  const response = await fetchImpl(NHC_CURRENT_STORMS_URL, { headers, signal });
  if (response.status === 304) return { notModified: true };
  if (!response.ok) throw new Error(`NHC returned HTTP ${response.status}`);
  const payload = await response.json();
  return {
    notModified: false,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    data: normalizeCurrentStorms(payload),
    raw: payload,
  };
}

