# Hurricane Alley

Expo application plus a Node service that ingests and normalizes official NOAA
National Hurricane Center products.

Project direction and the phased data architecture are documented in
[`docs/MASTER-PLAN.md`](docs/MASTER-PLAN.md).

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
Selecting a storm opens one unified report with internal Summary, Track & Cone,
Models, and Alerts & Products views. The report mounts only the map required by
the selected view and combines live normalized storm summaries, official NHC
forecast points and cone geometry, public ATCF guidance, and linked official
products. Privacy-first location identification is planned for a later alert
phase.
before location-matched warnings and evacuation information.
