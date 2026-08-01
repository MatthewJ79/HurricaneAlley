# Hurricane Alley Master Plan

## 1. Product objective

Hurricane Alley will provide a resilient, clearly attributed information layer
over official hurricane, weather, warning, evacuation, shelter, and model
guidance sources.

Hurricane Alley is not a forecasting authority. Official information, model
guidance, and app-derived calculations must remain distinct throughout the data
pipeline and user interface.

## 2. Current priority: route the data correctly

The immediate goal is to get every required data source to the correct screen
and domain model before introducing the production database architecture.

During this phase:

- Build a separate adapter for each upstream provider and product type.
- Normalize provider responses into stable Hurricane Alley domain models.
- Keep official forecasts, observations, advisories, warnings, model guidance,
  evacuation orders, and shelter information separate.
- Preserve source URL, issuing authority, advisory or product identifier, issue
  time, valid time, and retrieval time.
- Connect normalized information to the correct screens and reusable
  components.
- Use the existing file-backed server cache for development and degraded
  connectivity.
- Do not allow UI components to depend directly on an upstream provider's
  response shape.

The purpose of this phase is to prove the complete data flow:

```text
Official/public provider
  -> provider adapter
  -> normalized Hurricane Alley model
  -> freshness and provenance policy
  -> screen view model
  -> user interface
```

Database design will follow these proven domain models rather than forcing the
early data-routing work into a premature schema.

## 3. Production data architecture

Once data is reaching the correct destinations, replace the development cache
with a production ingestion and distribution pipeline:

```text
NOAA/NHC/NWS and other official providers
  -> single Hurricane Alley ingestion service
  -> short-lived raw storage
  -> provider adapters and normalization
  -> PostgreSQL/PostGIS operational database
  -> Hurricane Alley API
  -> cache/CDN
  -> mobile and web clients
```

The governing rule is:

> Fetch once, convert once, and distribute many times.

Customer devices will never query NOAA or another weather provider directly.
Only Hurricane Alley's backend ingestion service communicates with upstream
sources. All customers receive normalized information from Hurricane Alley's
API, database, and distribution cache.

This design ensures that an advisory is downloaded and converted once whether
the product has ten users or ten million users.

The detailed schema, transactional snapshot, API read path, and staged cutover
are defined in [`DATABASE-PLAN.md`](DATABASE-PLAN.md). The central read-model
decision is that a customer report request reads a preassembled, versioned
`storm_report_snapshots` row. It never fans out to upstream provider APIs or
rebuilds the complete report during the request.

## 4. Advisory-aware and adaptive ingestion

The ingestion service will schedule work around official product schedules
instead of repeatedly downloading unchanged products.

For NHC tropical cyclones:

- Full forecast/advisory packages are normally issued every six hours at 0300,
  0900, 1500, and 2100 UTC.
- Intermediate public advisories are generally issued every three hours when
  coastal watches or warnings are active.
- Tropical Cyclone Updates can provide hourly position updates when a center is
  trackable by radar.
- Special advisories and updates can be issued at any time when conditions or
  warnings change significantly.

All internal scheduling will use UTC. Local issue times may be displayed to the
user but will not control backend scheduling.

### Adaptive monitoring states

| Operational state | Ingestion behavior |
| --- | --- |
| No active storms | Check the small active-storm index every 30-60 minutes |
| Active storm away from land | Wake around the regular six-hour advisory windows |
| Coastal watches or warnings active | Add three-hour intermediate windows and lightweight 10-15-minute index checks |
| Radar-tracked or near landfall | Use lightweight checks approximately every five minutes for updates |
| Special advisory detected | Download immediately, process it, and recalculate the next schedule |
| Storm ended | Stop live monitoring and begin the retention lifecycle |

Heightened monitoring should be activated primarily by official product state,
including watches, warnings, intermediate advisories, and Tropical Cyclone
Updates. App-calculated proximity to land can be a secondary safety signal but
must not replace the official state.

### Change detection

At a scheduled check, compare:

- Storm identifier
- Advisory number
- Product type
- Product issue or update timestamp
- HTTP `ETag`
- HTTP `Last-Modified`
- Source-content checksum when necessary

If none of these changed, do not download or convert the full product. If the
expected product has not appeared yet, retry after short increasing delays,
such as 5, 10, and 20 minutes.

The ingestion operation must be idempotent. A unique identity such as
`(storm_id, advisory_number, product_type)` will prevent retries from creating
duplicates.

## 5. Separate product streams

Not every update represents a complete new forecast. Store and process each
official product according to its meaning:

```text
Storm
  -> current full advisory
  -> latest intermediate public advisory
  -> latest Tropical Cyclone Update
  -> forecast track and cone
  -> watches and warnings
  -> storm-surge products
  -> model guidance
  -> current normalized Hurricane Alley snapshot
```

An hourly position update may update the current center without replacing the
six-hour forecast track. A new full or special advisory may replace the
forecast, intensity guidance, cone, and related advisory products.

## 6. Storage responsibilities

Use a hybrid storage design:

- **PostgreSQL/PostGIS:** storms, advisories, forecast points, tracks, warning
  polygons, hazard areas, source metadata, and geographic queries.
- **Object storage:** large or source-native ZIP, KMZ, GeoJSON, GeoTIFF, radar,
  satellite, and other binary products.
- **Redis or equivalent:** optional hot cache for current-storm responses,
  scheduling locks, and cache invalidation.
- **CDN:** public current-storm responses and map-ready artifacts that can be
  safely reused across customers.

Large imagery and GIS rasters should not be stored directly in PostgreSQL.
Their metadata and object-storage location belong in the database.

### Initial logical database entities

The final schema will be derived from the completed normalized models, but the
expected entities are:

- `storms`
- `advisories`
- `forecast_points`
- `official_updates`
- `watches_warnings`
- `hazard_areas`
- `source_fetches`
- `current_storm_snapshots`
- `ingestion_schedules`

Each current storm should identify its current full advisory, latest
intermediate advisory, latest update, operational state, next expected product
time, and last successful ingestion time.

## 7. Distribution and resilience

The Hurricane Alley API will serve database-backed, app-owned response formats,
for example:

```text
GET /v1/storms/current
GET /v1/storms/:stormId
GET /v1/storms/:stormId/advisories/latest
GET /v1/storms/:stormId/updates/latest
GET /v1/storms/:stormId/changes
```

Cache current summaries briefly and invalidate them whenever a new official
product is committed. Advisory-numbered resources are immutable and can be
cached much longer.

During an upstream outage, continue serving the last successfully stored
product while prominently exposing:

- Official issue time
- Product or advisory number
- Hurricane Alley retrieval time
- Last successful upstream check
- Current freshness or stale status

An upstream failure must never erase a last-known-good product or cause an
empty response to be interpreted as the end of a storm.

## 8. Storm lifecycle and retention

Do not immediately delete a storm when it first disappears from an active
feed. A missing result could be temporary or caused by an upstream failure.

Use the following lifecycle:

```text
ACTIVE
  -> missing from multiple successful source checks
INACTIVE
  -> 24-72 hour verification and grace period
COMPLETED
  -> retention cleanup
```

Suggested retention policy:

- Keep current normalized data while the storm is active.
- Keep raw provider payloads for 7-30 days.
- Keep large GIS, radar, satellite, and imagery artifacts for 7-30 days unless
  a product requirement calls for a different window.
- Remove redundant high-frequency operational snapshots after the storm is
  completed.
- Retain a compact final storm summary, final official track, advisory index,
  and provenance when historical functionality is desired.
- Permit complete deletion after the configured retention period if no
  historical product requires the data.

NOAA remains the long-term authoritative archive. Hurricane Alley does not need
to retain every source artifact permanently.

## 9. Attribution and derived information

Hurricane Alley may reformat official public information, prepare map-ready
data, combine related products, and calculate comparisons. It must always
preserve the distinction between:

- Official NOAA/NHC/NWS information
- Third-party model guidance
- Hurricane Alley formatting
- Hurricane Alley-derived calculations

Modified, interpolated, summarized, or calculated information must not be
presented as an unmodified official government product.

## 10. Delivery phases

### Phase 1: Provider and screen integration — current

- Inventory the data required by every screen.
- Implement provider adapters.
- Complete normalized domain models.
- Route each product to its correct screen.
- Verify provenance, freshness, stale behavior, and product classification.
- Continue using the development snapshot cache.

### Phase 2: Ingestion orchestration

- Separate scheduled ingestion from the customer-facing API.
- Add advisory-aware schedules and adaptive monitoring states.
- Add product identity, conditional requests, checksums, retries, and
  idempotency.
- Ensure only one ingestion worker owns a scheduled product check.

### Phase 3: Operational database

- Add a storage repository boundary so ingestion and API code are not coupled
  to either JSON files or PostgreSQL.
- Implement the PostgreSQL/PostGIS schema and versioned migrations described in
  `DATABASE-PLAN.md`.
- Store immutable advisory, update, warning, forecast, model, provenance, and
  hazard streams with idempotency constraints.
- Build a preassembled `storm_report_snapshots` read model in the same
  transaction that advances current storm state.
- Dual-write and shadow-read before switching customer responses from the file
  cache to database snapshots.
- Add lifecycle, retention, backup, recovery, and transactional-outbox jobs.

### Phase 4: Scalable distribution

- Introduce appropriate API cache headers and CDN caching.
- Remove client-side cache-busting for reusable current-storm responses.
- Invalidate current resources after a successful ingestion transaction.
- Precompute common changes and map-ready results once per product.

### Phase 5: Production resilience

- Add ingestion health monitoring and stale-data alerts.
- Test delayed, malformed, missing, and out-of-order provider products.
- Test NOAA outages and recovery without losing last-known-good data.
- Load-test the Hurricane Alley API independently of upstream providers.
- Document source-specific fallback and retention policies.

## 11. Architecture decisions

The following decisions are approved for planning:

1. Customers will depend on Hurricane Alley's API, not directly on weather
   provider APIs.
2. Official data will be downloaded once per changed product and temporarily
   stored in Hurricane Alley's infrastructure.
3. Regular ingestion will follow known advisory schedules.
4. Monitoring frequency will increase automatically for watches, warnings,
   intermediate advisories, radar-tracked storms, landfall conditions, and
   special updates.
5. The database will be introduced after the current data-routing and
   normalization work defines the correct domain models.
6. Active-storm operational data will be temporary and governed by an
   automatic retention lifecycle.
7. A compact historical record may be retained without retaining all raw or
   bulky source artifacts.
8. Source provenance, freshness, and the distinction between official and
   derived information are mandatory at every layer.
9. Customer report requests will read preassembled, versioned database
   snapshots and will never trigger upstream provider calls.
10. Normalized immutable products remain the auditable source for rebuilding a
    current report; JSONB report snapshots are optimized read models, not the
    only stored copy of official data.
11. Database cutover will use dual writes, shadow comparisons, and a feature
    flag so the current file snapshot remains an available rollback source
    until database behavior is verified.
