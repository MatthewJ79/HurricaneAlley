import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_DIRECTORY = path.resolve("server", ".cache");
const CACHE_FILE = path.join(CACHE_DIRECTORY, "current-storms.json");

export async function readCache() {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function writeCache(value) {
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  const temporaryFile = `${CACHE_FILE}.${process.pid}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryFile, CACHE_FILE);
}
