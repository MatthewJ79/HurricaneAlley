import pg from "pg";
import { DualStormRepository } from "./dual-storm-repository.mjs";
import { FileStormRepository } from "./file-storm-repository.mjs";
import { PostgresStormRepository } from "./postgres-storm-repository.mjs";

const { Pool } = pg;

function postgresRepository(env) {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for PostgreSQL storage");
  }
  const ssl = env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined;
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl,
    max: Number(env.DATABASE_POOL_MAX ?? 10),
    connectionTimeoutMillis: Number(env.DATABASE_CONNECT_TIMEOUT_MS ?? 5_000),
    idleTimeoutMillis: Number(env.DATABASE_IDLE_TIMEOUT_MS ?? 30_000),
    application_name: "hurricane-alley-api",
  });
  return new PostgresStormRepository(pool);
}

export function createStormRepository({ env = process.env, logger = console } = {}) {
  const mode = (env.STORAGE_MODE ?? "file").toLowerCase();
  if (mode === "file") return new FileStormRepository();
  if (mode === "postgres") return postgresRepository(env);
  if (mode === "dual") {
    return new DualStormRepository(
      new FileStormRepository(),
      postgresRepository(env),
      { strict: env.DATABASE_SHADOW_STRICT === "true", logger },
    );
  }
  throw new Error(`Unsupported STORAGE_MODE: ${mode}`);
}

