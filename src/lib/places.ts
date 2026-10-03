export type PlaceCategory = 'bar' | 'pub' | 'cafe' | 'nightclub' | 'biergarten' | 'restaurant';

export type PlaceLocation = {
  latitude: number;
  longitude: number;
};

export type NearbyPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  location: PlaceLocation;
  distanceMeters?: number;
  address?: string | null;
  openingHours?: string | null;
  website?: string | null;
  source: 'openstreetmap';
};

export type NearbyPlacesRequest = {
  center: PlaceLocation;
  radiusMeters?: number;
  categories?: PlaceCategory[];
};

export interface PlacesProvider {
  getNearbyPlaces(request: NearbyPlacesRequest): Promise<NearbyPlace[]>;
}

export const DEFAULT_PLACES_RADIUS_METERS = 3000;
export const MAX_PLACES_RADIUS_METERS = 5000;

export const PREMIUM_PLACE_CATEGORIES: Array<{ key: PlaceCategory; emoji: string; label: string }> = [
  { key: 'bar', emoji: '🍸', label: 'Bar' },
  { key: 'pub', emoji: '🍺', label: 'Pub' },
  { key: 'cafe', emoji: '☕', label: 'Café' },
  { key: 'nightclub', emoji: '🎵', label: 'Club' },
  { key: 'biergarten', emoji: '🍻', label: 'Biergarten' },
  { key: 'restaurant', emoji: '🍽️', label: 'Restaurant' },
];

export function clampPlacesRadius(radiusMeters?: number) {
  const requested = Number.isFinite(radiusMeters) ? Number(radiusMeters) : DEFAULT_PLACES_RADIUS_METERS;
  return Math.max(500, Math.min(MAX_PLACES_RADIUS_METERS, Math.round(requested)));
}

export function distanceMeters(a: PlaceLocation, b: PlaceLocation) {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitude1 = toRadians(a.latitude);
  const latitude2 = toRadians(b.latitude);
  const sinLat = Math.sin(latitudeDelta / 2);
  const sinLon = Math.sin(longitudeDelta / 2);
  const value = sinLat * sinLat + Math.cos(latitude1) * Math.cos(latitude2) * sinLon * sinLon;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
}

export function sortPlacesByDistance(places: NearbyPlace[], center: PlaceLocation) {
  return places
    .map((place) => ({ ...place, distanceMeters: place.distanceMeters ?? distanceMeters(center, place.location) }))
    .sort((left, right) => (left.distanceMeters ?? Infinity) - (right.distanceMeters ?? Infinity));
}
