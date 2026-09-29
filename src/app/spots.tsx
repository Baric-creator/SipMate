import * as Location from 'expo-location';
import { Camera, Map, Marker, UserLocation } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { PREMIUM_PLACE_CATEGORIES, PlaceCategory } from '../lib/places';
import { supabase } from '../lib/supabase';

const copy = {
  en: {
    eyebrow: 'PREMIUM FEATURE', title: 'SipMate Spots 🍻', subtitle: 'Find a good place for the next drink nearby.',
    loading: 'Checking Premium access…', lockedTitle: 'Premium required',
    lockedBody: 'SipMate Spots is reserved for Premium accounts. Your exact location is never shown to other users.',
    backPremium: 'BACK TO PREMIUM', permissionTitle: 'Location when you need it',
    permissionBody: 'Spots uses foreground location only while you are looking for nearby venues. No background tracking and no public user pin.',
    enable: 'ENABLE LOCATION', ready: 'LOCATION READY',
    readyBody: 'Drag the map freely, zoom in or out, and tap the target button to return to your location.',
    categories: 'FILTER SPOTS', radius: 'SEARCH RADIUS', nearbyList: 'NEAREST SPOTS',
    privacy: 'Your coordinates stay private. The map shows venues, never precise pins for other people.',
    denied: 'Location permission was not granted. You can try again whenever you want.', recenter: 'Return to my location',
    loadingPlaces: 'Finding nearby spots…', noPlaces: 'No matching spots found in this radius.', refresh: 'REFRESH SPOTS',
    navigate: 'NAVIGATE', website: 'WEBSITE', distance: 'away', source: 'Map & venue data © OpenStreetMap contributors', back: '← BACK',
    providerUnavailable: 'Nearby places are temporarily unavailable. Please try again in a moment.',
    genericError: 'Could not load nearby spots. Please try again.', searchArea: 'SEARCH THIS AREA',
    openNow: 'OPEN NOW', closedNow: 'CLOSED', hours: 'HOURS', topPick: 'NEARBY PICK',
  },
  de: {
    eyebrow: 'PREMIUM-FUNKTION', title: 'SipMate Spots 🍻', subtitle: 'Finde einen guten Ort für den nächsten Drink in deiner Nähe.',
    loading: 'Premium-Zugang wird geprüft…', lockedTitle: 'Premium erforderlich',
    lockedBody: 'SipMate Spots ist Premium-Konten vorbehalten. Dein genauer Standort wird anderen Nutzern niemals angezeigt.',
    backPremium: 'ZURÜCK ZU PREMIUM', permissionTitle: 'Standort nur wenn du ihn brauchst',
    permissionBody: 'Spots verwendet den Standort nur im Vordergrund, während du Orte in der Nähe suchst. Kein Hintergrund-Tracking und kein öffentlicher Nutzer-Pin.',
    enable: 'STANDORT AKTIVIEREN', ready: 'STANDORT BEREIT',
    readyBody: 'Verschiebe die Karte frei, zoome hinein oder heraus und tippe auf den Zielknopf, um zu deinem Standort zurückzukehren.',
    categories: 'SPOTS FILTERN', radius: 'SUCHRADIUS', nearbyList: 'NÄCHSTE SPOTS',
    privacy: 'Deine Koordinaten bleiben privat. Die Karte zeigt Orte, niemals genaue Pins anderer Personen.',
    denied: 'Die Standortfreigabe wurde nicht erteilt. Du kannst es jederzeit erneut versuchen.', recenter: 'Zurück zu meinem Standort',
    loadingPlaces: 'Orte in der Nähe werden gesucht…', noPlaces: 'Keine passenden Orte in diesem Radius gefunden.', refresh: 'SPOTS AKTUALISIEREN',
    navigate: 'NAVIGIEREN', website: 'WEBSITE', distance: 'entfernt', source: 'Karte & Ortsdaten © OpenStreetMap-Mitwirkende', back: '← ZURÜCK',
    providerUnavailable: 'Orte in der Nähe sind vorübergehend nicht verfügbar. Versuch es gleich noch einmal.',
    genericError: 'Spots konnten nicht geladen werden. Bitte versuche es erneut.', searchArea: 'DIESEN BEREICH SUCHEN',
    openNow: 'JETZT OFFEN', closedNow: 'GESCHLOSSEN', hours: 'ÖFFNUNGSZEITEN', topPick: 'IN DER NÄHE',
  },
  hr: {
    eyebrow: 'PREMIUM FUNKCIJA', title: 'SipMate Spots 🍻', subtitle: 'Pronađi dobro mjesto za sljedeće piće u blizini.',
    loading: 'Provjeravamo Premium pristup…', lockedTitle: 'Potreban je Premium',
    lockedBody: 'SipMate Spots je rezerviran za Premium račune. Tvoja točna lokacija nikada se ne prikazuje drugim korisnicima.',
    backPremium: 'NATRAG NA PREMIUM', permissionTitle: 'Lokacija samo kada je trebaš',
    permissionBody: 'Spots koristi lokaciju samo dok tražiš mjesta u blizini. Nema praćenja u pozadini i nema javnog pina tvoje lokacije.',
    enable: 'OMOGUĆI LOKACIJU', ready: 'LOKACIJA SPREMNA',
    readyBody: 'Pomiči mapu slobodno, zumiraj i pritisni ciljnik za povratak na svoju lokaciju.',
    categories: 'FILTRIRAJ SPOTS', radius: 'RADIJUS PRETRAGE', nearbyList: 'NAJBLIŽI SPOTS',
    privacy: 'Tvoje koordinate ostaju privatne. Mapa prikazuje lokale, nikada precizne pinove drugih ljudi.',
    denied: 'Dozvola za lokaciju nije odobrena. Možeš pokušati ponovno kad god želiš.', recenter: 'Vrati na moju lokaciju',
    loadingPlaces: 'Tražimo lokale u blizini…', noPlaces: 'Nema odgovarajućih lokala u ovom radijusu.', refresh: 'OSVJEŽI SPOTS',
    navigate: 'NAVIGACIJA', website: 'WEB', distance: 'udaljeno', source: 'Mapa i podaci o lokalima © OpenStreetMap contributors', back: '← NATRAG',
    providerUnavailable: 'Lokali u blizini trenutačno nisu dostupni. Pokušaj ponovno za trenutak.',
    genericError: 'Nije moguće učitati lokale u blizini. Pokušaj ponovno.', searchArea: 'PRETRAŽI OVO PODRUČJE',
    openNow: 'OTVORENO', closedNow: 'ZATVORENO', hours: 'RADNO VRIJEME', topPick: 'U BLIZINI',
  },
} as const;

const categoryLabels: Record<'en' | 'de' | 'hr', Record<PlaceCategory, string>> = {
  en: { bar: 'Bar', pub: 'Pub', cafe: 'Café', nightclub: 'Club', biergarten: 'Beer garden', restaurant: 'Restaurant' },
  de: { bar: 'Bar', pub: 'Pub', cafe: 'Café', nightclub: 'Club', biergarten: 'Biergarten', restaurant: 'Restaurant' },
  hr: { bar: 'Bar', pub: 'Pub', cafe: 'Kafić', nightclub: 'Klub', biergarten: 'Pivski vrt', restaurant: 'Restoran' },
};

type Coordinate = [number, number];
type Spot = {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  address?: string | null;
  openingHours?: string | null;
  website?: string | null;
};

type OpenState = 'open' | 'closed' | 'unknown';

const categoryEmoji: Record<PlaceCategory, string> = {
  bar: '🍸', pub: '🍺', cafe: '☕', nightclub: '🎵', biergarten: '🍻', restaurant: '🍽️',
};
const radiusOptions = [1000, 3000, 5000] as const;
const osmDayIndex: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
const osmDayRulePattern = /^(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*$/;

function formatDistance(meters: number) {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

function coordinateDistanceMeters(a: Coordinate, b: Coordinate) {
  const toRad = (value: number) => value * Math.PI / 180;
  const r = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function minutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 24 || mins > 59 || (hours === 24 && mins !== 0)) return null;
  return hours * 60 + mins;
}

function ruleIncludesDay(dayRule: string, day: number) {
  return dayRule.split(',').some((part) => {
    const trimmed = part.trim();
    if (/^(Mo|Tu|We|Th|Fr|Sa|Su)$/.test(trimmed)) return osmDayIndex[trimmed] === day;
    const range = trimmed.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)$/);
    if (!range) return false;
    const start = osmDayIndex[range[1]];
    const end = osmDayIndex[range[2]];
    return start <= end ? day >= start && day <= end : day >= start || day <= end;
  });
}

function openingState(openingHours?: string | null, now = new Date()): OpenState {
  if (!openingHours) return 'unknown';
  const raw = openingHours.trim();
  if (raw === '24/7') return 'open';
  const day = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let matchedToday = false;

  for (const rule of raw.split(';')) {
    const normalized = rule.trim();
    const splitAt = normalized.indexOf(' ');
    if (splitAt <= 0) continue;
    const dayRule = normalized.slice(0, splitAt).trim();
    const timeRule = normalized.slice(splitAt + 1).trim();
    if (!osmDayRulePattern.test(dayRule) || !ruleIncludesDay(dayRule, day)) continue;
    matchedToday = true;
    if (/\boff\b/i.test(timeRule)) return 'closed';
    for (const timeRange of timeRule.split(',')) {
      const timeMatch = timeRange.trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
      if (!timeMatch) continue;
      const start = minutes(timeMatch[1]);
      const end = minutes(timeMatch[2]);
      if (start === null || end === null) continue;
      if (end >= start ? nowMinutes >= start && nowMinutes < end : nowMinutes >= start || nowMinutes < end) return 'open';
    }
  }
  return matchedToday ? 'closed' : 'unknown';
}

export default function SpotsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const rawLanguage = i18n.language?.split('-')[0];
  const language: 'en' | 'de' | 'hr' = rawLanguage === 'de' || rawLanguage === 'hr' ? rawLanguage : 'en';
  const text = copy[language];
  const labels = categoryLabels[language];
  const cameraRef = useRef<any>(null);
  const suppressRegionUntilRef = useRef(Date.now() + 1400);
  const placesRequestRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userCoordinate, setUserCoordinate] = useState<Coordinate | null>(null);
  const [placesCenter, setPlacesCenter] = useState<Coordinate | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinate | null>(null);
  const [searchAreaVisible, setSearchAreaVisible] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [places, setPlaces] = useState<Spot[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Spot | null>(null);
  const [radiusMeters, setRadiusMeters] = useState<(typeof radiusOptions)[number]>(3000);
  const [selectedCategories, setSelectedCategories] = useState<PlaceCategory[]>(PREMIUM_PLACE_CATEGORIES.map((item) => item.key));

  const loadCurrentLocation = async (): Promise<Coordinate> => {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return [position.coords.longitude, position.coords.latitude];
  };

  const friendlyPlacesError = (code?: string) => code === 'provider_unavailable' ? text.providerUnavailable : text.genericError;

  const loadPlaces = async (coordinate: Coordinate, categories = selectedCategories, radius = radiusMeters) => {
    const requestId = ++placesRequestRef.current;
    if (!categories.length) {
      setPlacesLoading(false);
      setPlacesError('');
      setPlaces([]);
      setSelectedPlace(null);
      return;
    }
    setPlacesLoading(true);
    setPlacesError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (requestId !== placesRequestRef.current) return;
      if (!session?.access_token) throw new Error('unauthorized');
      const { data, error } = await supabase.functions.invoke('nearby-places', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { latitude: coordinate[1], longitude: coordinate[0], radiusMeters: radius, categories },
      });
      if (requestId !== placesRequestRef.current) return;
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? 'places_failed');
      setPlaces((data.places ?? []) as Spot[]);
      setPlacesCenter(coordinate);
      setMapCenter(coordinate);
      setSearchAreaVisible(false);
      setSelectedPlace((current) => current && (data.places ?? []).some((place: Spot) => place.id === current.id) ? current : null);
    } catch (error: any) {
      if (requestId !== placesRequestRef.current) return;
      console.log('SPOTS LOAD ERROR:', error?.message ?? error);
      setPlacesError(friendlyPlacesError(error?.message));
    } finally {
      if (requestId === placesRequestRef.current) setPlacesLoading(false);
    }
  };

  const recenterMap = () => {
    if (!userCoordinate) return;
    suppressRegionUntilRef.current = Date.now() + 900;
    setMapCenter(userCoordinate);
    setSearchAreaVisible(false);
    cameraRef.current?.easeTo?.({ center: userCoordinate, zoom: 14, duration: 450 });
    void loadPlaces(userCoordinate, selectedCategories, radiusMeters);
  };

  const selectPlace = (place: Spot) => {
    setSelectedPlace(place);
    suppressRegionUntilRef.current = Date.now() + 800;
    cameraRef.current?.easeTo?.({ center: [place.longitude, place.latitude], zoom: 15, duration: 420 });
  };

  const handleRegionDidChange = (event: any) => {
    if (Date.now() < suppressRegionUntilRef.current) return;
    const center = event?.geometry?.coordinates;
    if (!Array.isArray(center) || center.length < 2) return;
    const next: Coordinate = [Number(center[0]), Number(center[1])];
    if (!Number.isFinite(next[0]) || !Number.isFinite(next[1])) return;
    setMapCenter(next);
    const base = placesCenter ?? userCoordinate;
    setSearchAreaVisible(Boolean(base && coordinateDistanceMeters(base, next) > 250));
  };

  const searchCurrentMapArea = () => {
    if (!mapCenter || placesLoading) return;
    void loadPlaces(mapCenter, selectedCategories, radiusMeters);
  };

  const toggleCategory = (category: PlaceCategory) => {
    setSelectedCategories((current) => {
      const next = current.includes(category) ? current.filter((item) => item !== category) : [...current, category];
      const center = placesCenter ?? userCoordinate;
      if (center) void loadPlaces(center, next, radiusMeters);
      return next;
    });
  };

  const changeRadius = (nextRadius: (typeof radiusOptions)[number]) => {
    setRadiusMeters(nextRadius);
    const center = placesCenter ?? userCoordinate;
    if (center) void loadPlaces(center, selectedCategories, nextRadius);
  };

  const navigateToPlace = (place: Spot) => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`);
  const openWebsite = (place: Spot) => {
    if (!place.website) return;
    void Linking.openURL(/^https?:\/\//i.test(place.website) ? place.website : `https://${place.website}`);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!sessionData.session?.user) { router.replace('/login'); return; }
      const { data: entitlementRows } = await supabase.rpc('get_my_premium_entitlement');
      if (!mounted) return;
      const entitlement = Array.isArray(entitlementRows) ? entitlementRows[0] : entitlementRows;
      const active = entitlement?.is_premium === true;
      setIsPremium(active);
      if (active) {
        const permission = await Location.getForegroundPermissionsAsync();
        const granted = permission.status === 'granted';
        if (mounted) setLocationGranted(granted);
        if (granted) {
          try {
            const coordinate = await loadCurrentLocation();
            if (mounted) {
              setUserCoordinate(coordinate);
              setMapCenter(coordinate);
              void loadPlaces(coordinate);
            }
          } catch {
            if (mounted) setPermissionMessage(text.denied);
          }
        }
      }
      if (mounted) setLoading(false);
    };
    void load();
    return () => { mounted = false; placesRequestRef.current += 1; };
  }, [router]);

  const requestLocation = async () => {
    if (!isPremium || requestingLocation) return;
    setRequestingLocation(true);
    setPermissionMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const granted = permission.status === 'granted';
      setLocationGranted(granted);
      if (!granted) { setPermissionMessage(text.denied); return; }
      const coordinate = await loadCurrentLocation();
      setUserCoordinate(coordinate);
      setMapCenter(coordinate);
      void loadPlaces(coordinate);
    } catch {
      setPermissionMessage(text.denied);
    } finally {
      setRequestingLocation(false);
    }
  };

  if (loading) return <SafeAreaView style={styles.screen}><View style={styles.loadingWrap}><ActivityIndicator size="small" color="#F5B942" /><Text style={styles.loadingText}>{text.loading}</Text></View></SafeAreaView>;

  if (!isPremium) {
    return <SafeAreaView style={styles.screen}><View style={styles.lockedWrap}><Text style={styles.lockIcon}>🔒</Text><Text style={styles.eyebrow}>{text.eyebrow}</Text><Text style={styles.title}>{text.lockedTitle}</Text><Text style={styles.bodyCentered}>{text.lockedBody}</Text><Pressable style={styles.primaryButton} onPress={() => router.replace('/premium' as never)}><Text style={styles.primaryButtonText}>{text.backPremium}</Text></Pressable><Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>{text.back}</Text></Pressable></View></SafeAreaView>;
  }

  const currentCenter = placesCenter ?? userCoordinate;
  const selectedOpenState = openingState(selectedPlace?.openingHours);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView nestedScrollEnabled disableScrollViewPanResponder contentContainerStyle={[styles.content, { paddingBottom: 190 + insets.bottom }]}>
        <Text style={styles.eyebrow}>{text.eyebrow}</Text><Text style={styles.title}>{text.title}</Text><Text style={styles.subtitle}>{text.subtitle}</Text>

        <View style={styles.mapCard}>
          {locationGranted && userCoordinate ? <>
            <Map style={styles.map} mapStyle="https://tiles.openfreemap.org/styles/dark" dragPan touchZoom doubleTapZoom doubleTapHoldZoom touchRotate={false} touchPitch={false} onRegionDidChange={handleRegionDidChange}>
              <Camera ref={cameraRef} initialViewState={{ center: userCoordinate, zoom: 14 }} />
              <UserLocation animated accuracy heading minDisplacement={5} />
              {places.map((place) => <Marker key={place.id} id={place.id} lngLat={[place.longitude, place.latitude]} onPress={() => selectPlace(place)}><View style={[styles.pin, selectedPlace?.id === place.id && styles.pinSelected]}><Text style={styles.pinEmoji}>{categoryEmoji[place.category]}</Text></View></Marker>)}
            </Map>
            {searchAreaVisible && <Pressable disabled={placesLoading} onPress={searchCurrentMapArea} style={[styles.searchAreaButton, placesLoading && styles.buttonDisabled]}><Text style={styles.searchAreaText}>{placesLoading ? '…' : text.searchArea}</Text></Pressable>}
            <Pressable accessibilityRole="button" accessibilityLabel={text.recenter} onPress={recenterMap} style={({ pressed }) => [styles.recenterButton, pressed && styles.recenterButtonPressed]}><Text style={styles.recenterIcon}>◎</Text></Pressable>
          </> : <View style={styles.mapPlaceholder}><View style={styles.previewHalo} /><Text style={styles.previewPin}>📍</Text><Text style={styles.previewLabel}>SipMate Spots</Text><Text style={styles.previewSmall}>{text.permissionTitle}</Text></View>}
        </View>

        {selectedPlace && <View style={styles.placeCard}>
          <View style={styles.premiumTag}><Text style={styles.premiumTagText}>✦ {text.topPick}</Text></View>
          <View style={styles.placeTitleRow}><View style={styles.placeEmojiWrap}><Text style={styles.placeEmoji}>{categoryEmoji[selectedPlace.category]}</Text></View><View style={styles.placeTitleCopy}><Text style={styles.placeName}>{selectedPlace.name}</Text><Text style={styles.placeMeta}>{labels[selectedPlace.category]} · {formatDistance(selectedPlace.distanceMeters)} {text.distance}</Text></View></View>
          <View style={styles.detailRow}>
            {selectedOpenState !== 'unknown' && <View style={[styles.openBadge, selectedOpenState === 'closed' && styles.closedBadge]}><Text style={[styles.openBadgeText, selectedOpenState === 'closed' && styles.closedBadgeText]}>{selectedOpenState === 'open' ? text.openNow : text.closedNow}</Text></View>}
            {!!selectedPlace.openingHours && <Text style={styles.hoursCompact}>{text.hours}: {selectedPlace.openingHours}</Text>}
          </View>
          {!!selectedPlace.address && <Text style={styles.placeAddress}>📍 {selectedPlace.address}</Text>}
          <View style={styles.placeActions}>{!!selectedPlace.website && <Pressable style={styles.secondaryActionButton} onPress={() => openWebsite(selectedPlace)}><Text style={styles.secondaryActionText}>{text.website}</Text></Pressable>}<Pressable style={styles.navigateButton} onPress={() => navigateToPlace(selectedPlace)}><Text style={styles.navigateButtonText}>{text.navigate}</Text></Pressable></View>
        </View>}

        <View style={styles.permissionCard}><Text style={styles.cardTitle}>{locationGranted && userCoordinate ? text.ready : text.permissionTitle}</Text><Text style={styles.cardBody}>{locationGranted && userCoordinate ? text.readyBody : text.permissionBody}</Text>{(!locationGranted || !userCoordinate) && <Pressable disabled={requestingLocation} style={[styles.primaryButton, requestingLocation && styles.buttonDisabled]} onPress={() => void requestLocation()}><Text style={styles.primaryButtonText}>{requestingLocation ? '…' : text.enable}</Text></Pressable>}{!!permissionMessage && <Text style={styles.warning}>{permissionMessage}</Text>}</View>

        <Text style={styles.sectionLabel}>{text.radius}</Text>
        <View style={styles.chips}>{radiusOptions.map((option) => { const active = radiusMeters === option; return <Pressable key={option} disabled={placesLoading} onPress={() => changeRadius(option)} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{option / 1000} km</Text></Pressable>; })}</View>

        <Text style={styles.sectionLabel}>{text.categories}</Text>
        <View style={styles.chips}>{PREMIUM_PLACE_CATEGORIES.map((category) => { const active = selectedCategories.includes(category.key); return <Pressable key={category.key} disabled={placesLoading} onPress={() => toggleCategory(category.key)} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{category.emoji} {labels[category.key]}</Text></Pressable>; })}</View>

        <View style={styles.placesStatus}>
          {placesLoading ? <><ActivityIndicator size="small" color="#F5B942" /><Text style={styles.statusText}>{text.loadingPlaces}</Text></> : placesError ? <Text style={styles.warning}>{placesError}</Text> : places.length === 0 && currentCenter ? <Text style={styles.statusText}>{text.noPlaces}</Text> : <Text style={styles.statusText}>{places.length} Spots · {radiusMeters / 1000} km</Text>}
          {currentCenter && <Pressable disabled={placesLoading} onPress={() => void loadPlaces(currentCenter, selectedCategories, radiusMeters)} style={[styles.refreshButton, placesLoading && styles.buttonDisabled]}><Text style={styles.refreshButtonText}>{text.refresh}</Text></Pressable>}
        </View>

        {!!places.length && <><Text style={styles.sectionLabel}>{text.nearbyList}</Text><View style={styles.nearbyList}>{places.slice(0, 8).map((place, index) => {
          const state = openingState(place.openingHours);
          return <Pressable key={place.id} onPress={() => selectPlace(place)} style={({ pressed }) => [styles.nearbyRow, selectedPlace?.id === place.id && styles.nearbyRowActive, pressed && styles.nearbyRowPressed]}>
            <View style={styles.rankBubble}><Text style={styles.rankText}>{index + 1}</Text></View><View style={styles.nearbyEmojiWrap}><Text style={styles.nearbyEmoji}>{categoryEmoji[place.category]}</Text></View><View style={styles.nearbyCopy}><View style={styles.nearbyTitleLine}><Text numberOfLines={1} style={styles.nearbyName}>{place.name}</Text>{state !== 'unknown' && <View style={[styles.miniStatus, state === 'closed' && styles.miniStatusClosed]}><Text style={[styles.miniStatusText, state === 'closed' && styles.miniStatusTextClosed]}>{state === 'open' ? text.openNow : text.closedNow}</Text></View>}</View><Text numberOfLines={1} style={styles.nearbyMeta}>{labels[place.category]} · {formatDistance(place.distanceMeters)}{place.address ? ` · ${place.address}` : ''}</Text></View><Text style={styles.nearbyArrow}>›</Text>
          </Pressable>;
        })}</View></>}

        <View style={styles.privacyCard}><Text style={styles.privacyIcon}>🛡️</Text><Text style={styles.privacyText}>{text.privacy}</Text></View>
        <Text style={styles.attribution}>{text.source}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>{text.back}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  content: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 34 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, loadingText: { color: '#A1A1AA', fontSize: 13, fontWeight: '700' }, lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }, lockIcon: { fontSize: 42, marginBottom: 16 },
  eyebrow: { color: '#F5B942', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' }, title: { color: '#FFFFFF', fontSize: 30, lineHeight: 36, fontWeight: '900', textAlign: 'center', marginTop: 8 }, subtitle: { color: '#A1A1AA', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 }, bodyCentered: { color: '#A1A1AA', maxWidth: 430, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  mapCard: { height: 350, borderRadius: 28, marginTop: 26, overflow: 'hidden', backgroundColor: '#111114', borderWidth: 1, borderColor: '#3C3020' }, map: { flex: 1 },
  pin: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(18,18,20,0.96)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.42)' }, pinSelected: { width: 42, height: 42, borderRadius: 21, borderColor: '#F5B942', borderWidth: 2 }, pinEmoji: { fontSize: 17 },
  searchAreaButton: { position: 'absolute', top: 14, left: 68, right: 68, minHeight: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: 'rgba(220,38,38,0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 7 }, searchAreaText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.35 },
  recenterButton: { position: 'absolute', right: 14, bottom: 14, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,12,15,0.94)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.55)', shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.32, shadowRadius: 10, elevation: 8 }, recenterButtonPressed: { transform: [{ scale: 0.94 }], opacity: 0.88 }, recenterIcon: { color: '#F5B942', fontSize: 25, fontWeight: '900', lineHeight: 28 },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, previewHalo: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(245,185,66,0.06)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.12)' }, previewPin: { fontSize: 40 }, previewLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 8 }, previewSmall: { color: '#71717A', fontSize: 10, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  placeCard: { marginTop: 14, borderRadius: 24, padding: 18, backgroundColor: '#17130D', borderWidth: 1, borderColor: '#755A26', shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.26, shadowRadius: 16, elevation: 7 }, premiumTag: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#2B2113', borderWidth: 1, borderColor: '#7A5B24', marginBottom: 13 }, premiumTagText: { color: '#F5D58A', fontSize: 9, fontWeight: '900', letterSpacing: 0.9 }, placeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, placeEmojiWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211B12', borderWidth: 1, borderColor: '#5A4725' }, placeEmoji: { fontSize: 26 }, placeTitleCopy: { flex: 1 }, placeName: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' }, placeMeta: { color: '#F5B942', fontSize: 11, fontWeight: '800', marginTop: 4 }, placeAddress: { color: '#D4D4D8', fontSize: 12, lineHeight: 18, marginTop: 12 }, detailRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 13 }, openBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: '#0D2818', borderWidth: 1, borderColor: '#28643D' }, closedBadge: { backgroundColor: '#2A1113', borderColor: '#6E2B30' }, openBadgeText: { color: '#86EFAC', fontSize: 9, fontWeight: '900', letterSpacing: 0.45 }, closedBadgeText: { color: '#FCA5A5' }, hoursCompact: { flexShrink: 1, color: '#A1A1AA', fontSize: 10, lineHeight: 15, fontWeight: '700' },
  placeActions: { flexDirection: 'row', gap: 10, marginTop: 15 }, navigateButton: { flex: 1, minHeight: 46, borderRadius: 15, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' }, navigateButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, secondaryActionButton: { flex: 1, minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: '#5A4725', backgroundColor: '#211B12', alignItems: 'center', justifyContent: 'center' }, secondaryActionText: { color: '#F5D58A', fontSize: 12, fontWeight: '900' },
  permissionCard: { marginTop: 16, borderRadius: 22, padding: 18, backgroundColor: '#121214', borderWidth: 1, borderColor: '#27272A' }, cardTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' }, cardBody: { color: '#A1A1AA', fontSize: 13, lineHeight: 20, marginTop: 7 }, primaryButton: { minHeight: 46, borderRadius: 16, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 16, alignSelf: 'stretch' }, primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }, buttonDisabled: { opacity: 0.55 }, warning: { color: '#FCA5A5', fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
  sectionLabel: { color: '#71717A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 24, marginBottom: 10 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderRadius: 999, backgroundColor: '#151518', borderWidth: 1, borderColor: '#2C2C31', paddingHorizontal: 12, paddingVertical: 9 }, chipActive: { backgroundColor: '#2B2113', borderColor: '#7A5B24' }, chipText: { color: '#8F8F97', fontSize: 11, fontWeight: '800' }, chipTextActive: { color: '#F5D58A' },
  placesStatus: { marginTop: 14, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 }, statusText: { color: '#A1A1AA', fontSize: 12, textAlign: 'center' }, refreshButton: { minHeight: 42, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: '#3F3F46', alignItems: 'center', justifyContent: 'center' }, refreshButtonText: { color: '#E4E4E7', fontSize: 11, fontWeight: '900' },
  nearbyList: { gap: 9 }, nearbyRow: { minHeight: 72, borderRadius: 18, borderWidth: 1, borderColor: '#2A2926', backgroundColor: '#121214', paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, nearbyRowActive: { borderColor: '#8A682A', backgroundColor: '#1D180F' }, nearbyRowPressed: { opacity: 0.82 }, rankBubble: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211B12', borderWidth: 1, borderColor: '#4A3B21' }, rankText: { color: '#D6B765', fontSize: 10, fontWeight: '900' }, nearbyEmojiWrap: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#19191C' }, nearbyEmoji: { fontSize: 20 }, nearbyCopy: { flex: 1, minWidth: 0 }, nearbyTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 7 }, nearbyName: { flexShrink: 1, color: '#F4F4F5', fontSize: 13, fontWeight: '900' }, nearbyMeta: { color: '#8F8F97', fontSize: 10, marginTop: 5 }, nearbyArrow: { color: '#F5B942', fontSize: 24, fontWeight: '700' }, miniStatus: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: '#10251A' }, miniStatusClosed: { backgroundColor: '#2A1113' }, miniStatusText: { color: '#86EFAC', fontSize: 7, fontWeight: '900' }, miniStatusTextClosed: { color: '#FCA5A5' },
  privacyCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 20, padding: 16, borderRadius: 18, backgroundColor: '#0D1812', borderWidth: 1, borderColor: '#234632' }, privacyIcon: { fontSize: 20 }, privacyText: { flex: 1, color: '#A7D7B9', fontSize: 12, lineHeight: 18 }, attribution: { color: '#71717A', fontSize: 9, textAlign: 'center', marginTop: 12 },
  backButton: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 14, marginTop: 20 }, backText: { color: '#EF4444', fontSize: 12, fontWeight: '900' },
});
