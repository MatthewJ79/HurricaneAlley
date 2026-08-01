# Hurricane Alley

Expo application plus a Node service that ingests and normalizes official NOAA
National Hurricane Center products.

Project direction and the phased data architecture are documented in
[`docs/MASTER-PLAN.md`](docs/MASTER-PLAN.md).
The detailed PostgreSQL/PostGIS schema, report-snapshot read path, and migration
strategy are documented in [`docs/DATABASE-PLAN.md`](docs/DATABASE-PLAN.md).

## Run locally

Open two terminals in the project directory.

Start the data API:

```powershell
npm.cmd run api
```

Start Expo:

```powershell
npm.cmd start
```

The web preview is available at `http://127.0.0.1:8081`.

The API listens on `http://localhost:8787` and exposes:

- `GET /health`
- `GET /v1/storms`
- `GET /v1/storms/:id`
- `GET /v1/alerts?lat=:latitude&lon=:longitude`
- `POST /v1/push/subscriptions`
- `GET /v1/push/subscriptions/:id`
- `DELETE /v1/push/subscriptions/:id`

Web and the iOS simulator use `localhost` by default. The Android emulator uses
`10.0.2.2`. For a physical device, set the computer's LAN address before
starting Expo:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://YOUR_COMPUTER_IP:8787"
npm.cmd start
```

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run api:test
```

## Database development

The API defaults to `STORAGE_MODE=file`, which preserves the existing JSON
snapshot behavior. Database development supports three modes:

- `file`: read and write only the development JSON snapshot.
- `dual`: read the JSON snapshot and shadow-write PostgreSQL. A shadow failure
  is reported but does not interrupt the proven file read path unless
  `DATABASE_SHADOW_STRICT=true`.
- `postgres`: read and write the current snapshot only through PostgreSQL.

A local PostGIS service is defined in `compose.database.yml`. After installing
Docker Desktop or another Docker Compose provider, start and migrate it from
PowerShell:

```powershell
$env:HURRICANE_ALLEY_DB_PASSWORD = "choose-a-local-password"
docker compose -f compose.database.yml up -d
$env:DATABASE_URL = "postgresql://hurricane_alley:choose-a-local-password@127.0.0.1:5433/hurricane_alley"
npm.cmd run database:migrate
$env:STORAGE_MODE = "dual"
npm.cmd run api
```

The API `/health` response includes the active repository mode and database
health. Do not use the file-backed repository or the example credentials in
production. See [`docs/DATABASE-PLAN.md`](docs/DATABASE-PLAN.md) for the schema,
cutover, retention, and recovery plan.

The API polls NHC every two minutes, uses HTTP cache validators when available,
and retains the latest successful response in `server/.cache`. If NOAA is
temporarily unreachable, the response is marked `cached` and `stale` rather
than presented as current.

## Official storm geometry

For each active storm, the API downloads the official NHC forecast advisory and
cone KMZ. The published cone polygon is converted to GeoJSON without estimating
or recalculating it. Hurricane Alley displays the NHC forecast unchanged and
does not create its own forecast.

## Maps

- Web uses Leaflet with raster tiles and SVG storm overlays so it works without
  requiring WebGL.
- iOS and Android use MapLibre Native.
- The default vector basemap comes from OpenFreeMap.
- The optional satellite layer comes from NASA EOSDIS GIBS.
- The observed radar layer uses NOAA/NWS MRMS quality-controlled base
  reflectivity mosaics for CONUS, the Caribbean, and Hawaii.
- The wind layer displays the official NHC 34-, 50-, and 64-knot advisory and
  forecast wind-radii polygons at each published forecast position.
- Track lines, cone geometry, and forecast positions come from NOAA/NHC.

The web street-tile URL and attribution can be changed without a code release
using `EXPO_PUBLIC_MAP_TILE_URL` and `EXPO_PUBLIC_MAP_ATTRIBUTION`. The local
default uses the OpenStreetMap standard tile service and must continue to follow
its attribution, caching, and fair-use policy. A public production launch should
set these variables to a self-hosted or contracted tile service sized for the
expected traffic.

MapLibre Native requires a custom Expo development build and is not available
inside Expo Go. After installing native dependencies:

```powershell
npx.cmd expo prebuild
npx.cmd expo run:android
```

## Current scope

Home lists active NHC storms without mounting a separate map for every card.
My Area lets a user save manually entered or one-time device coordinates and
checks Hurricane Alley's backend for official NWS alerts affecting that point.
Saved places, notification preferences, and last-known-good alert snapshots
persist locally on web, iOS, and Android. The client compares each successful
official retrieval with the stored snapshot so new, updated, cancelled, and
expired alert events can be classified without treating a failed refresh as an
all-clear. Push delivery is implemented but disabled by default.
The mobile app can request notification permission and register an Expo push
token after the project has an EAS project ID. The development server stores
subscriptions in its ignored `server/.cache` directory. It continuously
monitors and delivers only when explicitly started with:

```powershell
$env:PUSH_DELIVERY_ENABLED = "true"
npm.cmd run api
```

Keep delivery disabled during ordinary development and automated testing. The
file-backed subscription store is for development only; production requires a
database, authenticated administration, rate limiting, delivery-receipt
processing, and operational monitoring.

Selecting a storm opens one unified report with internal Summary, Track & Cone,
Models, and Alerts & Products views. The report mounts only the map required by
the selected view and combines live normalized storm summaries, official NHC
forecast points and cone geometry, public ATCF guidance, and linked official
products. Location remains opt-in, and manual saved places provide the same
core alert lookup without continuous tracking.
