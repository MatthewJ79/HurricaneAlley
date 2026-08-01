CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE providers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE source_fetches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider_id BIGINT REFERENCES providers(id),
  request_url TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  http_status INTEGER,
  etag TEXT,
  last_modified TEXT,
  content_checksum TEXT,
  raw_object_key TEXT,
  parse_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (parse_status IN ('pending', 'accepted', 'rejected', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX source_fetches_provider_requested_idx
  ON source_fetches (provider_id, requested_at DESC);
CREATE INDEX source_fetches_checksum_idx
  ON source_fetches (content_checksum)
  WHERE content_checksum IS NOT NULL;

CREATE TABLE storms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider_storm_id TEXT NOT NULL UNIQUE,
  basin TEXT NOT NULL,
  storm_year INTEGER NOT NULL,
  storm_number INTEGER,
  official_name TEXT,
  lifecycle_state TEXT NOT NULL DEFAULT 'active'
    CHECK (lifecycle_state IN ('active', 'inactive', 'completed')),
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX storms_active_idx
  ON storms (last_seen_at DESC)
  WHERE lifecycle_state = 'active';

CREATE TABLE storm_products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  storm_id BIGINT NOT NULL REFERENCES storms(id),
  provider_id BIGINT REFERENCES providers(id),
  source_fetch_id BIGINT REFERENCES source_fetches(id),
  provider_product_id TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT '',
  product_type TEXT NOT NULL,
  advisory_number TEXT,
  issued_at TIMESTAMPTZ,
  valid_at TIMESTAMPTZ,
  source_url TEXT,
  normalized_checksum TEXT NOT NULL,
  normalized_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_product_id, revision),
  UNIQUE (storm_id, product_type, advisory_number, issued_at)
);

CREATE INDEX storm_products_current_lookup_idx
  ON storm_products (storm_id, product_type, issued_at DESC);

CREATE TABLE advisories (
  product_id BIGINT PRIMARY KEY REFERENCES storm_products(id) ON DELETE CASCADE,
  advisory_kind TEXT NOT NULL,
  headline TEXT,
  summary TEXT,
  official_text TEXT,
  structured_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE official_updates (
  product_id BIGINT PRIMARY KEY REFERENCES storm_products(id) ON DELETE CASCADE,
  update_kind TEXT NOT NULL,
  headline TEXT,
  official_text TEXT,
  structured_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE forecast_points (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES storm_products(id) ON DELETE CASCADE,
  point_type TEXT NOT NULL DEFAULT 'forecast',
  valid_at TIMESTAMPTZ NOT NULL,
  forecast_hour INTEGER,
  position GEOGRAPHY(POINT, 4326) NOT NULL,
  wind_knots INTEGER,
  pressure_mb INTEGER,
  status TEXT,
  UNIQUE (product_id, valid_at, point_type)
);

CREATE INDEX forecast_points_position_gix
  ON forecast_points USING GIST (position);
CREATE INDEX forecast_points_valid_idx
  ON forecast_points (product_id, valid_at);

CREATE TABLE storm_geometries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES storm_products(id) ON DELETE CASCADE,
  geometry_type TEXT NOT NULL,
  threshold_value NUMERIC,
  threshold_unit TEXT,
  valid_at TIMESTAMPTZ,
  geometry GEOMETRY(GEOMETRY, 4326) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX storm_geometries_geometry_gix
  ON storm_geometries USING GIST (geometry);
CREATE INDEX storm_geometries_product_idx
  ON storm_geometries (product_id, geometry_type, valid_at);

CREATE TABLE model_cycles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  storm_id BIGINT NOT NULL REFERENCES storms(id),
  source_fetch_id BIGINT REFERENCES source_fetches(id),
  model_source TEXT NOT NULL,
  cycle_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (storm_id, model_source, cycle_at)
);

CREATE TABLE model_points (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  model_cycle_id BIGINT NOT NULL REFERENCES model_cycles(id) ON DELETE CASCADE,
  aid TEXT NOT NULL,
  forecast_hour INTEGER NOT NULL,
  valid_at TIMESTAMPTZ,
  position GEOGRAPHY(POINT, 4326) NOT NULL,
  wind_knots INTEGER,
  pressure_mb INTEGER,
  UNIQUE (model_cycle_id, aid, forecast_hour)
);

CREATE INDEX model_points_position_gix
  ON model_points USING GIST (position);

CREATE TABLE storm_report_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  storm_id BIGINT NOT NULL REFERENCES storms(id),
  snapshot_version BIGINT NOT NULL,
  content_checksum TEXT NOT NULL,
  official_issued_at TIMESTAMPTZ,
  assembled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_successful_fetch_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('live', 'cached', 'stale')),
  etag TEXT NOT NULL,
  payload JSONB NOT NULL,
  UNIQUE (storm_id, snapshot_version),
  UNIQUE (storm_id, content_checksum)
);

CREATE TABLE current_storm_state (
  storm_id BIGINT PRIMARY KEY REFERENCES storms(id),
  full_advisory_product_id BIGINT REFERENCES storm_products(id),
  intermediate_advisory_product_id BIGINT REFERENCES storm_products(id),
  latest_update_product_id BIGINT REFERENCES storm_products(id),
  current_snapshot_id BIGINT REFERENCES storm_report_snapshots(id),
  next_expected_product_at TIMESTAMPTZ,
  last_successful_ingestion_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX storm_report_snapshots_current_idx
  ON storm_report_snapshots (storm_id, snapshot_version DESC);

CREATE TABLE current_basin_snapshots (
  basin TEXT PRIMARY KEY,
  snapshot_version BIGINT NOT NULL,
  content_checksum TEXT NOT NULL,
  source_fetched_at TIMESTAMPTZ,
  assembled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('live', 'cached', 'stale')),
  payload JSONB NOT NULL
);

-- Transitional whole-feed snapshot used by the DB-0 repository boundary.
CREATE TABLE storm_feed_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content_checksum TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_fetched_at TIMESTAMPTZ,
  assembled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('live', 'cached', 'stale')),
  stale BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB NOT NULL
);

CREATE TABLE current_feed_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  snapshot_id BIGINT NOT NULL REFERENCES storm_feed_snapshots(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE official_alerts (
  id TEXT PRIMARY KEY,
  source_fetch_id BIGINT REFERENCES source_fetches(id),
  message_type TEXT,
  event TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  severity TEXT,
  urgency TEXT,
  certainty TEXT,
  sent_at TIMESTAMPTZ,
  effective_at TIMESTAMPTZ,
  onset_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  area_description TEXT,
  headline TEXT,
  description TEXT,
  instruction TEXT,
  source_url TEXT,
  references_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  coverage GEOMETRY(GEOMETRY, 4326),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX official_alerts_expiration_idx
  ON official_alerts (expires_at, severity);
CREATE INDEX official_alerts_coverage_gix
  ON official_alerts USING GIST (coverage);

CREATE TABLE ingestion_jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_key TEXT NOT NULL UNIQUE,
  provider_id BIGINT REFERENCES providers(id),
  product_type TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'leased', 'completed', 'failed')),
  next_run_at TIMESTAMPTZ NOT NULL,
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ingestion_jobs_pending_idx
  ON ingestion_jobs (next_run_at)
  WHERE state IN ('pending', 'failed');

CREATE TABLE ingestion_outbox (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX ingestion_outbox_pending_idx
  ON ingestion_outbox (available_at, id)
  WHERE processed_at IS NULL;

CREATE TABLE saved_place_subscriptions (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  encrypted_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  place_name TEXT NOT NULL,
  place GEOGRAPHY(POINT, 4326) NOT NULL,
  preferences JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'active'
    CHECK (state IN ('active', 'disabled', 'invalid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX saved_place_subscriptions_place_gix
  ON saved_place_subscriptions USING GIST (place);
CREATE INDEX saved_place_subscriptions_active_idx
  ON saved_place_subscriptions (updated_at)
  WHERE state = 'active';

CREATE TABLE notification_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES official_alerts(id),
  lifecycle_kind TEXT NOT NULL
    CHECK (lifecycle_kind IN ('new', 'updated', 'cancelled', 'expired')),
  event_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_deliveries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES notification_events(id),
  subscription_id TEXT NOT NULL REFERENCES saved_place_subscriptions(id),
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'submitted', 'delivered', 'retry', 'failed', 'invalid_token')),
  provider_ticket_id TEXT,
  provider_receipt JSONB,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, subscription_id)
);

CREATE INDEX notification_deliveries_pending_idx
  ON notification_deliveries (next_attempt_at, id)
  WHERE state IN ('pending', 'retry', 'submitted');

INSERT INTO providers (code, name, base_url)
VALUES
  ('NOAA_NHC', 'NOAA National Hurricane Center', 'https://www.nhc.noaa.gov'),
  ('NOAA_NWS', 'NOAA National Weather Service', 'https://api.weather.gov')
ON CONFLICT (code) DO NOTHING;
