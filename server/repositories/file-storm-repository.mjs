import { readCache, writeCache } from "../store.mjs";

export class FileStormRepository {
  mode = "file";

  async readCurrentSnapshot() {
    return readCache();
  }

  async writeCurrentSnapshot(snapshot) {
    await writeCache(snapshot);
  }

  async health() {
    return { mode: this.mode, ok: true };
  }

  async close() {}
}

