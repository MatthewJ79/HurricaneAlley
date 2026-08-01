# Hurricane Alley database implementation plan

## Goal

Official provider data is fetched and normalized once by Hurricane Alley.
Users request a ready-to-serve Hurricane Alley report from the database and do
not trigger NOAA, NHC, NWS, model, or GIS requests.

The customer read path will be:

```text
Mobile or web client
  -> Hurricane Alley API
  -> current report snapshot in PostgreSQL
  -> optional response cache/CDN
  -> one normalized response
```

The ingestion path is separate:

```text
Official providers
  -> scheduled ingestion worker
  -> provider adapters and validation
  -> immutable normalized products + PostGIS geometry
  -> transactional current report snapshot
  -> cache invalidation and notification outbox
```

No customer request may wait for an upstream weather provider. If upstream data
is delayed or unavailable, the API serves the last-known-good database snapshot
with explicit freshness metadata.

## Storage choices

- **PostgreSQL:** storm identity, advisories, official updates, alert lifecycle,
  forecasts, model-cycle metadata, source provenance, schedules, report
  snapshots, push subscriptions, and delivery state.
- **PostGIS:** forecast tracks, cones, wind fields, warning polygons, hazard
  areas, and saved-place intersection queries.
- **Object storage:** original or large KMZ, ZIP, GeoJSON, GeoTIFF, radar,
  satellite, and other binary artifacts. PostgreSQL stores their checksums,
  metadata, and object keys rather than the files themselves.
- **Redis or equivalent, optional after database cutover:** short-lived current
  report cache, distributed scheduler locks, and cache invalidation signals.
- **CDN:** versioned public report responses and reusable map-ready artifacts.

PostgreSQL/PostGIS remains the source of operational truth. Redis and the CDN
are disposable caches and must never be the only copy of a warning or report.

## Logical schema

### Provenance and ingestion

- `providers`: issuing organizations and provider configuration.
- `source_fetches`: request URL, request time, response time, status, ETag,
  Last-Modified value, checksum, parse result, error, and raw-object key.
- `ingestion_jobs`: scheduled product checks, lease owner, attempts, next run,
  and terminal state.
- `ingestion_outbox`: committed cache-invalidation and notification work that
  must happen after the database transaction succeeds.

### Storm identity and immutable products

- `storms`: stable basin/year/number identity, official name, lifecycle state,
  and current-state pointer.
- `storm_products`: immutable provider product versions with product type,
  official identifier, advisory number, issue/valid times, source fetch, and
  normalized checksum.
- `advisories`: full and intermediate advisory content and structured fields.
- `official_updates`: Tropical Cyclone Updates and special updates that do not
  necessarily replace the full forecast.
- `forecast_points`: official forecast position, valid time, intensity,
  pressure, and status for an immutable product version.
- `storm_geometries`: PostGIS geometry for the official cone, track, wind
  radii, watches/warnings, surge, and other hazard layers.
- `model_cycles` and `model_points`: model guidance kept separate from official
  forecasts and identified by model, aid, cycle, and forecast hour.

Recommended uniqueness rules include:

- `(provider_id, provider_product_id, revision)` for source products.
- `(storm_id, advisory_number, product_type, issued_at)` for NHC products.
- `(product_id, valid_at, point_type)` for official forecast points.
- `(model_cycle_id, aid, forecast_hour)` for model points.
- Source-content checksum uniqueness where upstream identifiers are incomplete.

### Current read models

- `current_storm_state`: pointers to the latest full advisory, intermediate
  advisory, update, alert set, model cycle, and hazard products for one storm.
- `storm_report_snapshots`: a versioned JSONB report already shaped for the
  public API, plus official issue time, assembled time, source-fetch times,
  stale state, ETag, and snapshot version.
- `current_basin_snapshots`: the preassembled current-storm list and Tropical
  Weather Outlook summary for each basin.

The application should read current reports from these snapshots rather than
joining every normalized table on every customer request. Normalized tables
remain queryable for history, auditing, rebuilding snapshots, and changes.

### Location alerts and delivery

- `official_alerts`: immutable CAP messages, identifiers, references, lifecycle
  type, timing, authority, instruction, and geometry/zone coverage.
- `saved_place_subscriptions`: encrypted or otherwise protected device token,
  saved-point geometry, preferences, status, and deletion time.
- `notification_events`: deduplicated new/update/cancel/expire events.
- `notification_deliveries`: queued attempts, provider ticket, receipt status,
  retry time, terminal error, and invalid-token state.

Saved-place data is private operational data and must be isolated from public
storm/report tables. Precise points and device tokens must never appear in
public API responses, analytics logs, or CDN keys.

## Transactional ingestion rule

Network fetching and large-file preparation occur before the database write
transaction. Once a changed product is validated, one transaction will:

1. Insert the `source_fetches` record and immutable normalized product.
2. Insert forecast points, alerts, and PostGIS geometry using idempotent keys.
3. Update `current_storm_state` only if the product is newer and valid for that
   stream. Out-of-order products remain historical and cannot replace current
   state.
4. Assemble and insert a new `storm_report_snapshots` version.
5. Atomically move the storm's current snapshot pointer to the new version.
6. Insert cache-invalidation and notification work into `ingestion_outbox`.
7. Commit.

If any required write or snapshot build fails, the transaction rolls back and
the prior current snapshot remains available. Cache invalidation and push work
are processed only after commit.

## Database-backed API behavior

Initial endpoints:

```text
GET /v1/storms/current
GET /v1/storms/:stormId
GET /v1/storms/:stormId/report
GET /v1/storms/:stormId/changes?since=:snapshotVersion
GET /v1/alerts?lat=:latitude&lon=:longitude
```

`GET /v1/storms/:stormId/report` should normally execute one indexed lookup of
the current report snapshot. It must not fetch an upstream product or rebuild
the report synchronously. Responses include:

- Snapshot version and ETag.
- Official advisory/update identifiers and issue times.
- Snapshot assembly time.
- Last successful upstream check and retrieval time.
- `live`, `cached`, or `stale` status.
- Links and attribution for every contributing source.

Advisory-numbered and snapshot-versioned resources are immutable and receive
long cache lifetimes. Current aliases receive short cache lifetimes and are
invalidated after a new snapshot transaction commits.

## Retention and recovery

- Keep current state and recent snapshot versions while a storm is active.
- Retain raw provider objects for approximately 7-30 days, configurable by
  source and storage cost.
- Retain normalized advisory indexes, final official track, final alert
  lifecycle, and compact final report when storm history is enabled.
- Compact or delete redundant operational snapshots after completion.
- Soft-delete push subscriptions immediately when disabled and permanently
  purge their point/token data according to the privacy retention policy.
- Run automated backups with point-in-time recovery. Before public warning
  launch, target an operational recovery point of no more than five minutes and
  document/test the recovery-time objective.

NOAA remains the authoritative long-term archive. Hurricane Alley keeps enough
history for resilience, auditing, changes, and its stated historical features.

## Migration from the current file cache

### DB-0: repository boundary and local environment

- [Implemented] Add a repository interface between the API/ingestion code and
  storage.
- [Implemented] Preserve the current JSON files behind a development
  repository adapter.
- [Implemented] Add PostgreSQL/PostGIS local configuration, checksum-protected
  migrations, and health checks.
- [Implemented] Add `file`, `dual`, and `postgres` modes. `dual` keeps file
  reads while shadow-writing the transitional whole-feed database snapshot.
- Keep secrets in environment configuration; never commit credentials.

### DB-1: core schema and database writes

- Create provenance, storm, product, geometry, current-state, and snapshot
  tables with constraints and indexes.
- Write new ingested products to PostgreSQL while the file cache remains the
  public read source.
- Compare database-built snapshots with the existing normalized responses.

### DB-2: shadow reads and backfill

- Backfill the current file snapshot into database product/snapshot records.
- Run database reads in shadow mode and compare identity, advisory, geometry,
  freshness, and response checksums without returning them to customers.
- Resolve every unexplained difference before cutover.

### DB-3: controlled read cutover

- Enable database-backed reads behind a server feature flag.
- Start with health/internal traffic, then a percentage of public traffic.
- Keep the file snapshot as a rollback source during the observation window.
- Verify that customer requests produce no upstream weather-provider calls.

### DB-4: database authority

- Make PostgreSQL/PostGIS the operational source of truth.
- Move scheduled ingestion and outbox processing into dedicated workers.
- Add CDN/current-response invalidation after committed snapshot changes.
- Retire file-backed production reads after backup and rollback drills pass.

### DB-5: scale and history

- Partition high-volume product, alert, and delivery tables by time or storm
  lifecycle when measured load requires it.
- Add read replicas only after query metrics justify them.
- Add historical report and advisory endpoints from immutable records.

## Required indexes

At minimum:

- Unique indexes for every provider/product idempotency key.
- B-tree indexes on storm lifecycle, issue time, valid time, and current
  snapshot pointers.
- GiST indexes on alert, warning, track, cone, wind-field, hazard, and saved
  point geometries used for spatial matching.
- Partial indexes for active storms, active alerts, pending ingestion jobs,
  pending outbox work, and pending notification deliveries.

Indexes will be validated against real query plans. Do not add speculative
indexes that materially slow ingestion without supporting a measured read.

## Verification and launch gates

- Reprocessing the same provider product creates no duplicate records.
- A malformed or out-of-order product cannot replace current state.
- A transaction failure leaves the previous report snapshot readable.
- Database report responses match the approved normalized API contract.
- API report requests make zero upstream provider calls.
- Spatial alert matching covers polygon-, county-, and zone-based alerts.
- Stale state survives NOAA/NWS outage and application restart.
- Backup restoration and point-in-time recovery are exercised successfully.
- Snapshot lookup and current-storm listing meet the production latency target
  under projected peak traffic.
- Push/outbox work cannot run before its associated report transaction commits.
