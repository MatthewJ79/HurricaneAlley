import { createHash } from "node:crypto";

function snapshotChecksum(snapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export class PostgresStormRepository {
  mode = "postgres";

  constructor(pool) {
    this.pool = pool;
  }

  async readCurrentSnapshot() {
    const result = await this.pool.query(`
      SELECT snapshots.payload
      FROM current_feed_state AS current
      JOIN storm_feed_snapshots AS snapshots
        ON snapshots.id = current.snapshot_id
      WHERE current.singleton = TRUE
    `);
    return result.rows[0]?.payload ?? null;
  }

  async writeCurrentSnapshot(snapshot) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `
          INSERT INTO storm_feed_snapshots (
            content_checksum,
            source_name,
            source_url,
            source_fetched_at,
            assembled_at,
            status,
            stale,
            payload
          )
          VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7::jsonb)
          ON CONFLICT (content_checksum) DO UPDATE
            SET last_seen_at = NOW()
          RETURNING id
        `,
        [
          snapshotChecksum(snapshot),
          snapshot.source?.name ?? "Unknown provider",
          snapshot.source?.url ?? null,
          snapshot.source?.fetchedAt ?? null,
          snapshot.status ?? "live",
          Boolean(snapshot.stale),
          JSON.stringify(snapshot),
        ],
      );
      await client.query(
        `
          INSERT INTO current_feed_state (singleton, snapshot_id, updated_at)
          VALUES (TRUE, $1, NOW())
          ON CONFLICT (singleton) DO UPDATE
            SET snapshot_id = EXCLUDED.snapshot_id,
                updated_at = EXCLUDED.updated_at
        `,
        [inserted.rows[0].id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async health() {
    try {
      const result = await this.pool.query(
        "SELECT NOW() AS checked_at, postgis_version() AS postgis_version",
      );
      return {
        mode: this.mode,
        ok: true,
        checkedAt: result.rows[0].checked_at,
        postgisVersion: result.rows[0].postgis_version,
      };
    } catch (error) {
      return { mode: this.mode, ok: false, error: error.message };
    }
  }

  async close() {
    await this.pool.end();
  }
}

