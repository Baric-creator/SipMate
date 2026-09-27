import * as Location from 'expo-location';
import { Camera, Map, Marker, UserLocation } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    categories: 'FILTER SPOTS', privacy: 'Your coordinates stay private. The map shows venues, never precise pins for other people.',
    denied: 'Location permission was not granted. You can try again whenever you want.', recenter: 'Return to my location',
    loadingPlaces: 'Finding nearby spots…', noPlaces: 'No matching spots found within 3 km.', refresh: 'REFRESH SPOTS',
    navigate: 'NAVIGATE', distance: 'away', source: 'Map & venue data © OpenStreetMap contributors', back: '← BACK',
  },
  de: {
    eyebrow: 'PREMIUM-FUNKTION', title: 'SipMate Spots 🍻', subtitle: 'Finde einen guten Ort für den nächsten Drink in deiner Nähe.',
    loading: 'Premium-Zugang wird geprüft…', lockedTitle: 'Premium erforderlich',
    lockedBody: 'SipMate Spots ist Premium-Konten vorbehalten. Dein genauer Standort wird anderen Nutzern niemals angezeigt.',
    backPremium: 'ZURÜCK ZU PREMIUM', permissionTitle: 'Standort nur wenn du ihn brauchst',
    permissionBody: 'Spots verwendet den Standort nur im Vordergrund, während du Orte in der Nähe suchst. Kein Hintergrund-Tracking und kein öffentlicher Nutzer-Pin.',
    enable: 'STANDORT AKTIVIEREN', ready: 'STANDORT BEREIT',
    readyBody: 'Verschiebe die Karte frei, zoome hinein oder heraus und tippe auf den Zielknopf, um zu deinem Standort zurückzukehren.',
    categories: 'SPOTS FILTERN', privacy: 'Deine Koordinaten bleiben privat. Die Karte zeigt Orte, niemals genaue Pins anderer Personen.',
    denied: 'Die Standortfreigabe wurde nicht erteilt. Du kannst es jederzeit erneut versuchen.', recenter: 'Zurück zu meinem Standort',
    loadingPlaces: 'Orte in der Nähe werden gesucht…', noPlaces: 'Keine passenden Orte im Umkreis von 3 km gefunden.', refresh: 'SPOTS AKTUALISIEREN',
    navigate: 'NAVIGIEREN', distance: 'entfernt', source: 'Karte & Ortsdaten © OpenStreetMap-Mitwirkende', back: '← ZURÜCK',
  },
  hr: {
    eyebrow: 'PREMIUM FUNKCIJA', title: 'SipMate Spots 🍻', subtitle: 'Pronađi dobro mjesto za sljedeće piće u blizini.',
    loading: 'Provjeravamo Premium pristup…', lockedTitle: 'Potreban je Premium',
    lockedBody: 'SipMate Spots je rezerviran za Premium račune. Tvoja točna lokacija nikada se ne prikazuje drugim korisnicima.',
    backPremium: 'NATRAG NA PREMIUM', permissionTitle: 'Lokacija samo kada je trebaš',
    permissionBody: 'Spots koristi lokaciju samo dok tražiš mjesta u blizini. Nema praćenja u pozadini i nema javnog pina tvoje lokacije.',
    enable: 'OMOGUĆI LOKACIJU', ready: 'LOKACIJA SPREMNA',
    readyBody: 'Pomiči mapu slobodno, zumiraj i pritisni ciljnik za povratak na svoju lokaciju.',
    categories: 'FILTRIRAJ SPOTS', privacy: 'Tvoje koordinate ostaju privatne. Mapa prikazuje lokale, nikada precizne pinove drugih ljudi.',
    denied: 'Dozvola za lokaciju nije odobrena. Možeš pokušati ponovno kad god želiš.', recenter: 'Vrati na moju lokaciju',
    loadingPlaces: 'Tražimo lokale u blizini…', noPlaces: 'Nema odgovarajućih lokala unutar 3 km.', refresh: 'OSVJEŽI SPOTS',
    navigate: 'NAVIGACIJA', distance: 'udaljeno', source: 'Mapa i podaci o lokalima © OpenStreetMap contributors', back: '← NATRAG',
  },
} as const;

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

const categoryEmoji: Record<PlaceCategory, string> = {
  bar: '🍸', pub: '🍺', cafe: '☕', nightclub: '🎵', biergarten: '🍻', restaurant: '🍽️',
};

function formatDistance(meters: number) {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

export default function SpotsScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;
  const cameraRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userCoordinate, setUserCoordinate] = useState<Coordinate | null>(null);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [places, setPlaces] = useState<Spot[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Spot | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<PlaceCategory[]>(
    PREMIUM_PLACE_CATEGORIES.map((item) => item.key),
  );

  const loadCurrentLocation = async (): Promise<Coordinate> => {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return [position.coords.longitude, position.coords.latitude];
  };

  const loadPlaces = async (coordinate: Coordinate, categories = selectedCategories) => {
    if (!categories.length) {
      setPlaces([]);
      setSelectedPlace(null);
      return;
    }
    setPlacesLoading(true);
    setPlacesError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const { data, error } = await supabase.functions.invoke('nearby-places', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          latitude: coordinate[1], longitude: coordinate[0], radiusMeters: 3000, categories,
        },
      });
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? 'places_failed');
      setPlaces((data.places ?? []) as Spot[]);
      setSelectedPlace((current) => current && (data.places ?? []).some((place: Spot) => place.id === current.id) ? current : null);
    } catch (error: any) {
      console.log('SPOTS LOAD ERROR:', error?.message ?? error);
      setPlacesError(error?.message ?? 'places_failed');
    } finally {
      setPlacesLoading(false);
    }
  };

  const recenterMap = () => {
    if (!userCoordinate) return;
    cameraRef.current?.easeTo?.({ center: userCoordinate, zoom: 14, duration: 450 });
  };

  const toggleCategory = (category: PlaceCategory) => {
    setSelectedCategories((current) => {
      const next = current.includes(category) ? current.filter((item) => item !== category) : [...current, category];
      if (userCoordinate) void loadPlaces(userCoordinate, next);
      return next;
    });
  };

  const navigateToPlace = (place: Spot) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    void Linking.openURL(url);
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
    return () => { mounted = false; };
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
      void loadPlaces(coordinate);
    } catch {
      setPermissionMessage(text.denied);
    } finally {
      setRequestingLocation(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.screen}><View style={styles.loadingWrap}><ActivityIndicator size="small" color="#F5B942" /><Text style={styles.loadingText}>{text.loading}</Text></View></SafeAreaView>;
  }

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.lockedWrap}>
          <Text style={styles.lockIcon}>🔒</Text><Text style={styles.eyebrow}>{text.eyebrow}</Text><Text style={styles.title}>{text.lockedTitle}</Text>
          <Text style={styles.bodyCentered}>{text.lockedBody}</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/premium' as never)}><Text style={styles.primaryButtonText}>{text.backPremium}</Text></Pressable>
          <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>{text.back}</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView nestedScrollEnabled disableScrollViewPanResponder contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{text.eyebrow}</Text><Text style={styles.title}>{text.title}</Text><Text style={styles.subtitle}>{text.subtitle}</Text>

        <View style={styles.mapCard}>
          {locationGranted && userCoordinate ? (
            <>
              <Map style={styles.map} mapStyle="https://tiles.openfreemap.org/styles/dark" dragPan touchZoom doubleTapZoom doubleTapHoldZoom touchRotate={false} touchPitch={false}>
                <Camera ref={cameraRef} initialViewState={{ center: userCoordinate, zoom: 14 }} />
                <UserLocation animated accuracy heading minDisplacement={5} />
                {places.map((place) => (
                  <Marker key={place.id} id={place.id} lngLat={[place.longitude, place.latitude]} onPress={() => setSelectedPlace(place)}>
                    <View style={[styles.pin, selectedPlace?.id === place.id && styles.pinSelected]}>
                      <Text style={styles.pinEmoji}>{categoryEmoji[place.category]}</Text>
                    </View>
                  </Marker>
                ))}
              </Map>
              <Pressable accessibilityRole="button" accessibilityLabel={text.recenter} onPress={recenterMap} style={({ pressed }) => [styles.recenterButton, pressed && styles.recenterButtonPressed]}>
                <Text style={styles.recenterIcon}>◎</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.mapPlaceholder}><View style={styles.previewHalo} /><Text style={styles.previewPin}>📍</Text><Text style={styles.previewLabel}>SipMate Spots</Text><Text style={styles.previewSmall}>{text.permissionTitle}</Text></View>
          )}
        </View>

        {selectedPlace && (
          <View style={styles.placeCard}>
            <View style={styles.placeTitleRow}><Text style={styles.placeEmoji}>{categoryEmoji[selectedPlace.category]}</Text><View style={styles.placeTitleCopy}><Text style={styles.placeName}>{selectedPlace.name}</Text><Text style={styles.placeMeta}>{formatDistance(selectedPlace.distanceMeters)} {text.distance}</Text></View></View>
            {!!selectedPlace.address && <Text style={styles.placeAddress}>{selectedPlace.address}</Text>}
            {!!selectedPlace.openingHours && <Text style={styles.placeHours}>{selectedPlace.openingHours}</Text>}
            <Pressable style={styles.navigateButton} onPress={() => navigateToPlace(selectedPlace)}><Text style={styles.navigateButtonText}>{text.navigate}</Text></Pressable>
          </View>
        )}

        <View style={styles.permissionCard}>
          <Text style={styles.cardTitle}>{locationGranted && userCoordinate ? text.ready : text.permissionTitle}</Text>
          <Text style={styles.cardBody}>{locationGranted && userCoordinate ? text.readyBody : text.permissionBody}</Text>
          {(!locationGranted || !userCoordinate) && <Pressable disabled={requestingLocation} style={[styles.primaryButton, requestingLocation && styles.buttonDisabled]} onPress={() => void requestLocation()}><Text style={styles.primaryButtonText}>{requestingLocation ? '…' : text.enable}</Text></Pressable>}
          {!!permissionMessage && <Text style={styles.warning}>{permissionMessage}</Text>}
        </View>

        <Text style={styles.sectionLabel}>{text.categories}</Text>
        <View style={styles.chips}>
          {PREMIUM_PLACE_CATEGORIES.map((category) => {
            const active = selectedCategories.includes(category.key);
            return <Pressable key={category.key} onPress={() => toggleCategory(category.key)} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{category.emoji} {category.label}</Text></Pressable>;
          })}
        </View>

        <View style={styles.placesStatus}>
          {placesLoading ? <><ActivityIndicator size="small" color="#F5B942" /><Text style={styles.statusText}>{text.loadingPlaces}</Text></> : placesError ? <Text style={styles.warning}>{placesError}</Text> : places.length === 0 && userCoordinate ? <Text style={styles.statusText}>{text.noPlaces}</Text> : <Text style={styles.statusText}>{places.length} Spots · 3 km</Text>}
          {userCoordinate && <Pressable disabled={placesLoading} onPress={() => void loadPlaces(userCoordinate)} style={[styles.refreshButton, placesLoading && styles.buttonDisabled]}><Text style={styles.refreshButtonText}>{text.refresh}</Text></Pressable>}
        </View>

        <View style={styles.privacyCard}><Text style={styles.privacyIcon}>🛡️</Text><Text style={styles.privacyText}>{text.privacy}</Text></View>
        <Text style={styles.attribution}>{text.source}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>{text.back}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' }, content: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 34, paddingBottom: 120 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, loadingText: { color: '#A1A1AA', fontSize: 13, fontWeight: '700' }, lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }, lockIcon: { fontSize: 42, marginBottom: 16 },
  eyebrow: { color: '#F5B942', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' }, title: { color: '#FFFFFF', fontSize: 30, lineHeight: 36, fontWeight: '900', textAlign: 'center', marginTop: 8 }, subtitle: { color: '#A1A1AA', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 }, bodyCentered: { color: '#A1A1AA', maxWidth: 430, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  mapCard: { height: 350, borderRadius: 28, marginTop: 26, overflow: 'hidden', backgroundColor: '#111114', borderWidth: 1, borderColor: '#3C3020' }, map: { flex: 1 },
  pin: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(18,18,20,0.96)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.42)' }, pinSelected: { width: 42, height: 42, borderRadius: 21, borderColor: '#F5B942', borderWidth: 2 }, pinEmoji: { fontSize: 17 },
  recenterButton: { position: 'absolute', right: 14, bottom: 14, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,12,15,0.94)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.55)', shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.32, shadowRadius: 10, elevation: 8 }, recenterButtonPressed: { transform: [{ scale: 0.94 }], opacity: 0.88 }, recenterIcon: { color: '#F5B942', fontSize: 25, fontWeight: '900', lineHeight: 28 },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, previewHalo: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(245,185,66,0.06)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.12)' }, previewPin: { fontSize: 40 }, previewLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 8 }, previewSmall: { color: '#71717A', fontSize: 10, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  placeCard: { marginTop: 14, borderRadius: 22, padding: 17, backgroundColor: '#171310', borderWidth: 1, borderColor: '#5A4725' }, placeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, placeEmoji: { fontSize: 28 }, placeTitleCopy: { flex: 1 }, placeName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' }, placeMeta: { color: '#F5B942', fontSize: 11, fontWeight: '800', marginTop: 3 }, placeAddress: { color: '#D4D4D8', fontSize: 12, marginTop: 10 }, placeHours: { color: '#A1A1AA', fontSize: 11, marginTop: 5 }, navigateButton: { minHeight: 44, borderRadius: 14, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', marginTop: 14 }, navigateButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  permissionCard: { marginTop: 16, borderRadius: 22, padding: 18, backgroundColor: '#121214', borderWidth: 1, borderColor: '#27272A' }, cardTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' }, cardBody: { color: '#A1A1AA', fontSize: 13, lineHeight: 20, marginTop: 7 }, primaryButton: { minHeight: 46, borderRadius: 16, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 16, alignSelf: 'stretch' }, primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }, buttonDisabled: { opacity: 0.55 }, warning: { color: '#FCA5A5', fontSize: 12, lineHeight: 18, marginTop: 10 },
  sectionLabel: { color: '#71717A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 24, marginBottom: 10 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderRadius: 999, backgroundColor: '#151518', borderWidth: 1, borderColor: '#2C2C31', paddingHorizontal: 12, paddingVertical: 9 }, chipActive: { backgroundColor: '#2B2113', borderColor: '#7A5B24' }, chipText: { color: '#8F8F97', fontSize: 11, fontWeight: '800' }, chipTextActive: { color: '#F5D58A' },
  placesStatus: { marginTop: 14, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 }, statusText: { color: '#A1A1AA', fontSize: 12, textAlign: 'center' }, refreshButton: { minHeight: 42, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: '#3F3F46', alignItems: 'center', justifyContent: 'center' }, refreshButtonText: { color: '#E4E4E7', fontSize: 11, fontWeight: '900' },
  privacyCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 20, padding: 16, borderRadius: 18, backgroundColor: '#0D1812', borderWidth: 1, borderColor: '#234632' }, privacyIcon: { fontSize: 20 }, privacyText: { flex: 1, color: '#A7D7B9', fontSize: 12, lineHeight: 18 }, attribution: { color: '#71717A', fontSize: 9, textAlign: 'center', marginTop: 12 },
  backButton: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 14, marginTop: 20 }, backText: { color: '#EF4444', fontSize: 12, fontWeight: '900' },
});
