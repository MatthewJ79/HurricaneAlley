# Hurricane Alley UX/UI principles

## 1. Official information, clearly attributed

Hurricane Alley is an information layer, not a forecasting authority.

- Show the issuing authority, advisory number, issue time, retrieval time, and
  valid time wherever the distinction matters.
- Label official forecasts, model guidance, warnings, and app-calculated
  comparisons as different information classes.
- Never present app-generated storm predictions, evacuation inferences, or
  unlabeled synthetic values.
- Emergency orders must link back to the responsible public agency.

## 2. Calm hierarchy under pressure

The interface should answer four questions in order:

1. Is there an active threat?
2. Does it affect my saved area?
3. What changed since the last official update?
4. What official action should I take next?

Red is reserved for immediate danger and official emergency states. Teal is for
navigation, selected controls, and primary informational actions. Amber marks
hazards, interpolation, and historical-demo framing.

## 3. Change-first communication

People returning to the app should not have to reread an entire advisory.

- Summarize track, intensity, hazard, warning, and model-guidance changes.
- Always give the comparison basis and matching valid time.
- Put official changes above model-guidance changes.
- Treat uncertainty as information, not as an error to hide.

## 4. Semantic themes, not color inversion

Light and dark themes share roles, spacing, typography, and state behavior.
They do not share literal surface colors.

- `background`: app canvas
- `surface`: standard cards and controls
- `surfaceRaised`: high-emphasis information
- `surfaceMuted`: icon wells and secondary controls
- `text`, `textMuted`, `textFaint`: content hierarchy
- `border`: structure and grouping
- `cyan`: active navigation and verified actions
- `emergency`: official high-severity warning surfaces
- `demo`: historical/non-current information banner
- `mapCard` and `mapStat`: map-specific contrast roles

Maps remain dark in both themes because track, cone, and model colors require a
stable high-contrast plotting surface.

## 5. Modular composition

Screens are assemblies of reusable primitives, not isolated mockups.

- App chrome: demo banner, screen header, bottom tabs
- Navigation controls: segmented control and icon actions
- Information primitives: eyebrow, section title, info action, primary button
- Weather visuals: shared storm/model map
- Domain cards: storm summary, change card, model aid, evacuation order,
  checklist row

New screens should compose these pieces before introducing a new visual pattern.

## 6. Native-mobile behavior

- Design for one-handed portrait use first.
- Keep persistent navigation in the safe area.
- Use large press targets and visible selected states.
- Support dynamic system light/dark preference from the first render.
- Keep scrollable content independent from fixed emergency actions and tabs.
- Avoid web-only interaction assumptions such as hover.

## 7. Accessibility and resilience

- Every icon-only control needs an accessible label.
- Never communicate category, warning, or active state through color alone.
- Use tabular numerals for wind, pressure, distance, and valid-time tables.
- Preserve readable contrast over map imagery.
- Show a clear stale/unavailable state rather than silently retaining old data.
- Cache the most recent official advisory for degraded connectivity, with a
  prominent age indicator.

## 8. Future data architecture

External data should enter through typed provider adapters and normalize into
stable app-owned domain models. UI components must never depend directly on a
vendor response shape.

Recommended layers:

```text
Official/public provider → provider adapter → normalized domain model
→ freshness/provenance policy → screen view model → reusable UI component
```

Provider adapters should keep official forecasts, observations, watches and
warnings, evacuation sources, shelter links, and model guidance separate. Any
derived comparison—such as “shifted 35 miles east”—must identify its inputs and
method.
