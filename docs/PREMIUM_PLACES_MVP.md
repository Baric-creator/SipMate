# SipMate Premium — Nearby Places MVP

Status: design + implementation scaffold

Goal: add a subtle Premium-only nearby places map that helps users answer the natural question after discovery or CHEERS: **where should we meet?**

## Product rule

Nearby Places is a Premium feature. It must never expose another user's precise location. The map shows venues only. User-to-user discovery keeps the existing privacy model and distance-only behavior.

## MVP scope

First release should stay intentionally small:

- current user's own location as the search center;
- venues within 3 km by default, hard-capped at 5 km;
- categories: Bar, Pub, Café, Club, Biergarten, Restaurant;
- venue name, category, distance and address when available;
- opening-hours text only when source data supplies it;
- external navigation action;
- visible OpenStreetMap attribution where OSM-derived map/data is displayed;
- Premium entitlement check before venue data is loaded.

Not in the first release:

- user pins;
- live check-ins;
- reviews/ratings;
- venue photos;
- background location;
- offline maps;
- bulk map/POI downloads;
- paid partner placement;
- Meet Here / CHEERS venue proposals. That is phase 2 after the basic map proves stable.

## Low-cost architecture

1. **Map UI:** MapLibre React Native on the V9+ native build.
2. **Base map:** use a replaceable OSM-derived tile/style provider. Do not hard-code a community tile endpoint into the product architecture.
3. **Venue data:** OSM-derived POIs via a server-side provider adapter. The mobile app does not directly scrape OSM services.
4. **Cache:** Supabase cache by rounded area/category with a conservative TTL to avoid repeated upstream calls.
5. **Entitlement:** reuse `get_my_premium_entitlement`; non-Premium users see the Premium upsell instead of map/venue results.

MapLibre requires native code and therefore a fresh EAS build; it is not an Expo Go feature. Keep this work off the current Play v8 baseline until the feature branch is complete and tested.

## Privacy rules

- request foreground location only;
- no background location;
- do not persist a user's precise coordinates for the Places feature unless a later requirement explicitly needs it;
- never publish or return another user's exact coordinates to the Places screen;
- venue coordinates are public place data and may be shown;
- diagnostics may record feature success/failure, but not precise coordinates.

## Cost controls

- default radius: 3,000 m;
- maximum radius: 5,000 m;
- limit results per refresh;
- cache venue lookups server-side;
- refresh only on explicit user action or meaningful map-area change;
- no prefetching whole cities;
- no offline tile downloading;
- provider endpoints must remain configurable so we can move providers without shipping a new client architecture.

## UX direction

Working name: **SipMate Spots 🍻**

The design should stay dark and premium, matching SipMate rather than looking like a generic map app.

Suggested first screen:

- compact header: `SipMate Spots` + `PREMIUM` badge;
- map as the main surface;
- subtle category chips at the top;
- selected venue card slides above bottom navigation;
- card shows name, category, distance, optional open-hours text, and `NAVIGATE`;
- map pins use understated category icons, not bright multi-color Google-style pins.

## Rollout gates

Before merge to master:

- Premium gate verified with Premium and non-Premium accounts;
- location denied/granted flows verified;
- no user precise-location exposure;
- provider requests are bounded and cached;
- map attribution is visible;
- Android physical-device test passes;
- app startup and existing Nearby remain unaffected;
- `npm run check` passes on the exact merge candidate;
- fresh V9+ EAS build is required because MapLibre is native code.
