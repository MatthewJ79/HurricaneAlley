# Hurricane Alley warning-system roadmap

## Product position

Hurricane Alley redistributes and explains official forecasts, alerts, and
emergency instructions. It does not originate forecasts, watches, warnings, or
evacuation orders.

An alert shown by Hurricane Alley must remain attributable to its issuing
authority. App-derived summaries, location matching, sorting, and change
descriptions must be labeled as Hurricane Alley presentation rather than as a
new official product.

## Safety rules

1. Match saved places to official alert geometry, county, or forecast-zone
   coverage. Never use the forecast cone or distance from a storm as a proxy
   for whether a warning applies.
2. Preserve the official alert identifier, sender, event, issue time, onset,
   expiration, severity, urgency, certainty, description, instruction, source
   URL, and update references.
3. Treat alert updates, cancellations, and expirations as lifecycle events.
   Never leave an expired or replaced warning looking current.
4. A failed refresh is not an all-clear. Keep the last-known-good response,
   mark it stale, and display its retrieval time.
5. Do not infer evacuation orders, shelter availability, road safety, or an
   all-clear. Display only information from the responsible authority.
6. Device location is opt-in. Manual saved places must provide the same core
   warning experience without continuous tracking.

## Delivery phases

The shared storage and database cutover for storm reports, official alerts,
saved-place matching, and notification delivery is defined in
[`DATABASE-PLAN.md`](DATABASE-PLAN.md). Database work begins behind a repository
boundary and uses dual writes and shadow reads before becoming authoritative.

### Phase A - location-aware official alerts

- Add a normalized NWS CAP/alerts adapter to the Hurricane Alley backend.
- Add a backend endpoint for alerts affecting a latitude/longitude.
- Add saved places and a My Area screen.
- Show action, authority, timing, severity, and freshness before technical
  storm information.
- Support loading, empty, error, and stale states without implying safety.

### Phase B - alert lifecycle and notifications

- [Implemented locally] Store alert identifiers, references, and the latest
  successfully retrieved snapshot for each saved place.
- [Implemented locally] Classify new, updated, cancelled, and expired alerts
  without treating a failed refresh as a cancellation.
- [Implemented locally] Persist per-place severity and update preferences in
  preparation for push delivery.
- [Implemented in development] Register and remove authenticated device push
  subscriptions for saved places.
- [Implemented in development] Monitor shared coordinates once per interval,
  deduplicate lifecycle events, retain failed deliveries for retry, and avoid
  replaying old instructions in cancellation or expiration messages.
- [Implemented in development] Send through Expo Push when the server's
  explicit delivery flag is enabled; delivery remains disabled by default.
- Add delivery monitoring, retry policy, rate controls, and an audit trail.
- Add Expo delivery-receipt processing and remove invalid device tokens.
- Replace the development file store with a production database and worker.

### Phase C - offline and low-bandwidth operation

- Persist last-known-good alerts and preparedness content on each device.
- Add a text-only low-bandwidth mode.
- Display last successful check and alert expiration prominently.
- Cache emergency contacts and user-entered household plans locally.

### Phase D - complete hurricane hazard picture

- Add the official 2-day and 7-day Tropical Weather Outlooks.
- Add local NWS flash-flood, tornado, extreme-wind, flood, and hurricane-local
  products to My Area.
- Present surge, rainfall/flood, wind, tornado, and arrival-time hazards
  separately from the forecast cone.
- Integrate verified evacuation, shelter, and transportation sources one
  jurisdiction at a time.

### Phase E - public launch readiness

- Complete screen-reader, keyboard, contrast, and dynamic-type testing.
- Provide plain-language English and Spanish warning surfaces.
- Publish privacy, data-source, correction, and service-status information.
- Exercise delayed, duplicated, malformed, cancelled, and out-of-order alerts.
- Load-test ingestion, API distribution, and push delivery independently.
- Establish operational monitoring and an escalation/on-call procedure.

## Initial launch gates

Hurricane Alley should not market itself as a dependable warning service until
all of the following are verified in production:

- Location matching correctly includes polygon-, county-, and zone-based NWS
  alerts.
- Alert updates, cancellations, and expirations are handled without duplicates.
- Push delivery is monitored but is not presented as the user's only warning
  channel.
- Last-known-good data remains available through provider outages.
- Every urgent surface includes issuing authority, issue time, expiration,
  affected location, and official instructions.
- Accessibility and language reviews cover the complete alert workflow.
