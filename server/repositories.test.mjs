import assert from "node:assert/strict";
import test from "node:test";
import { DualStormRepository } from "./repositories/dual-storm-repository.mjs";
import { FileStormRepository } from "./repositories/file-storm-repository.mjs";
import { createStormRepository } from "./repositories/index.mjs";
import { PostgresStormRepository } from "./repositories/postgres-storm-repository.mjs";

test("file storage remains the default repository", () => {
  const repository = createStormRepository({ env: {} });
  assert.ok(repository instanceof FileStormRepository);
  assert.equal(repository.mode, "file");
});

test("database modes require an explicit connection string", () => {
  assert.throws(
    () => createStormRepository({ env: { STORAGE_MODE: "postgres" } }),
    /DATABASE_URL/,
  );
  assert.throws(
    () => createStormRepository({ env: { STORAGE_MODE: "unknown" } }),
    /Unsupported STORAGE_MODE/,
  );
});

test("dual storage reads files and tolerates a non-strict shadow failure", async () => {
  const writes = [];
  const errors = [];
  const primary = {
    readCurrentSnapshot: async () => ({ source: "file" }),
    writeCurrentSnapshot: async (value) => writes.push(value),
    health: async () => ({ ok: true }),
    close: async () => {},
  };
  const shadow = {
    writeCurrentSnapshot: async () => {
      throw new Error("database unavailable");
    },
    health: async () => ({ ok: false }),
    close: async () => {},
  };
  const repository = new DualStormRepository(primary, shadow, {
    logger: { error: (value) => errors.push(value) },
  });
  assert.deepEqual(await repository.readCurrentSnapshot(), { source: "file" });
  await repository.writeCurrentSnapshot({ storms: [] });
  assert.equal(writes.length, 1);
  assert.match(repository.lastShadowError, /database unavailable/);
  assert.equal(errors.length, 1);
});

test("postgres snapshot writes commit the payload and advance the pointer", async () => {
  const queries = [];
  const client = {
    query: async (sql, values) => {
      queries.push({ sql: String(sql).trim(), values });
      if (String(sql).includes("INSERT INTO storm_feed_snapshots")) {
        return { rows: [{ id: 42 }] };
      }
      return { rows: [] };
    },
    release: () => {},
  };
  const repository = new PostgresStormRepository({
    connect: async () => client,
  });
  await repository.writeCurrentSnapshot({
    source: {
      name: "NOAA National Hurricane Center",
      url: "https://example.test/current",
      fetchedAt: "2026-07-31T12:00:00.000Z",
    },
    status: "live",
    stale: false,
    storms: [],
  });
  assert.equal(queries[0].sql, "BEGIN");
  assert.ok(queries.some((entry) => entry.sql.includes("current_feed_state")));
  assert.equal(queries.at(-1).sql, "COMMIT");
});

test("postgres snapshot writes roll back atomically on failure", async () => {
  const queries = [];
  const client = {
    query: async (sql) => {
      queries.push(String(sql).trim());
      if (String(sql).includes("INSERT INTO storm_feed_snapshots")) {
        throw new Error("write failed");
      }
      return { rows: [] };
    },
    release: () => {},
  };
  const repository = new PostgresStormRepository({ connect: async () => client });
  await assert.rejects(
    repository.writeCurrentSnapshot({ source: {}, storms: [] }),
    /write failed/,
  );
  assert.deepEqual(queries, ["BEGIN", queries[1], "ROLLBACK"]);
});
