import * as Location from 'expo-location';
import { Camera, Map, UserLocation } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { supabase } from '../lib/supabase';

const copy = {
  en: {
    eyebrow: 'PREMIUM FEATURE',
    title: 'SipMate Spots 🍻',
    subtitle: 'Find a good place for the next drink nearby.',
    loading: 'Checking Premium access…',
    lockedTitle: 'Premium required',
    lockedBody: 'SipMate Spots is reserved for Premium accounts. Your exact location is never shown to other users.',
    backPremium: 'BACK TO PREMIUM',
    permissionTitle: 'Location when you need it',
    permissionBody: 'Spots uses foreground location only while you are looking for nearby venues. No background tracking and no public user pin.',
    enable: 'ENABLE LOCATION',
    ready: 'LOCATION READY',
    readyBody: 'Your map is centered on your current location. Nearby places will be added in a later step.',
    categories: 'COMING TO THE MAP',
    privacy: 'Your coordinates stay private. Venues will be shown around you; people are not shown as precise pins.',
    denied: 'Location permission was not granted. You can try again whenever you want.',
    back: '← BACK',
  },
  de: {
    eyebrow: 'PREMIUM-FUNKTION',
    title: 'SipMate Spots 🍻',
    subtitle: 'Finde einen guten Ort für den nächsten Drink in deiner Nähe.',
    loading: 'Premium-Zugang wird geprüft…',
    lockedTitle: 'Premium erforderlich',
    lockedBody: 'SipMate Spots ist Premium-Konten vorbehalten. Dein genauer Standort wird anderen Nutzern niemals angezeigt.',
    backPremium: 'ZURÜCK ZU PREMIUM',
    permissionTitle: 'Standort nur wenn du ihn brauchst',
    permissionBody: 'Spots verwendet den Standort nur im Vordergrund, während du Orte in der Nähe suchst. Kein Hintergrund-Tracking und kein öffentlicher Nutzer-Pin.',
    enable: 'STANDORT AKTIVIEREN',
    ready: 'STANDORT BEREIT',
    readyBody: 'Die Karte ist auf deinen aktuellen Standort zentriert. Orte in der Nähe folgen in einem späteren Schritt.',
    categories: 'BALD AUF DER KARTE',
    privacy: 'Deine Koordinaten bleiben privat. Orte werden später um dich herum angezeigt; Personen erscheinen nicht als genaue Pins.',
    denied: 'Die Standortfreigabe wurde nicht erteilt. Du kannst es jederzeit erneut versuchen.',
    back: '← ZURÜCK',
  },
  hr: {
    eyebrow: 'PREMIUM FUNKCIJA',
    title: 'SipMate Spots 🍻',
    subtitle: 'Pronađi dobro mjesto za sljedeće piće u blizini.',
    loading: 'Provjeravamo Premium pristup…',
    lockedTitle: 'Potreban je Premium',
    lockedBody: 'SipMate Spots je rezerviran za Premium račune. Tvoja točna lokacija nikada se ne prikazuje drugim korisnicima.',
    backPremium: 'NATRAG NA PREMIUM',
    permissionTitle: 'Lokacija samo kada je trebaš',
    permissionBody: 'Spots koristi lokaciju samo dok tražiš mjesta u blizini. Nema praćenja u pozadini i nema javnog pina tvoje lokacije.',
    enable: 'OMOGUĆI LOKACIJU',
    ready: 'LOKACIJA SPREMNA',
    readyBody: 'Mapa je centrirana na tvoju trenutačnu lokaciju. Mjesta u blizini dodat ćemo u sljedećem koraku.',
    categories: 'USKORO NA MAPI',
    privacy: 'Tvoje koordinate ostaju privatne. Lokale ćemo prikazivati oko tebe, a ljude ne prikazujemo kao precizne pinove.',
    denied: 'Dozvola za lokaciju nije odobrena. Možeš pokušati ponovno kad god želiš.',
    back: '← NATRAG',
  },
} as const;

const categoryChips = ['🍺 Bar', '🍻 Pub', '☕ Café', '🍸 Cocktail', '🎵 Club', '🌿 Biergarten'];

type Coordinate = [number, number];

export default function SpotsScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userCoordinate, setUserCoordinate] = useState<Coordinate | null>(null);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [requestingLocation, setRequestingLocation] = useState(false);

  const loadCurrentLocation = async (): Promise<Coordinate> => {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return [position.coords.longitude, position.coords.latitude];
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!sessionData.session?.user) {
        router.replace('/login');
        return;
      }

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
            if (mounted) setUserCoordinate(coordinate);
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
      if (!granted) {
        setPermissionMessage(text.denied);
        return;
      }
      const coordinate = await loadCurrentLocation();
      setUserCoordinate(coordinate);
    } catch {
      setPermissionMessage(text.denied);
    } finally {
      setRequestingLocation(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#F5B942" />
          <Text style={styles.loadingText}>{text.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.lockedWrap}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.eyebrow}>{text.eyebrow}</Text>
          <Text style={styles.title}>{text.lockedTitle}</Text>
          <Text style={styles.bodyCentered}>{text.lockedBody}</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/premium' as never)}>
            <Text style={styles.primaryButtonText}>{text.backPremium}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>{text.back}</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{text.eyebrow}</Text>
        <Text style={styles.title}>{text.title}</Text>
        <Text style={styles.subtitle}>{text.subtitle}</Text>

        <View style={styles.mapCard}>
          {locationGranted && userCoordinate ? (
            <Map style={styles.map} mapStyle="https://tiles.openfreemap.org/styles/dark">
              <Camera centerCoordinate={userCoordinate} zoomLevel={14} />
              <UserLocation animated accuracy heading minDisplacement={5} />
            </Map>
          ) : (
            <View style={styles.mapPlaceholder}>
              <View style={styles.previewHalo} />
              <Text style={styles.previewPin}>📍</Text>
              <Text style={styles.previewLabel}>SipMate Spots</Text>
              <Text style={styles.previewSmall}>{text.permissionTitle}</Text>
            </View>
          )}
        </View>

        <View style={styles.permissionCard}>
          <Text style={styles.cardTitle}>{locationGranted && userCoordinate ? text.ready : text.permissionTitle}</Text>
          <Text style={styles.cardBody}>{locationGranted && userCoordinate ? text.readyBody : text.permissionBody}</Text>
          {(!locationGranted || !userCoordinate) && (
            <Pressable disabled={requestingLocation} style={[styles.primaryButton, requestingLocation && styles.buttonDisabled]} onPress={() => void requestLocation()}>
              <Text style={styles.primaryButtonText}>{requestingLocation ? '…' : text.enable}</Text>
            </Pressable>
          )}
          {!!permissionMessage && <Text style={styles.warning}>{permissionMessage}</Text>}
        </View>

        <Text style={styles.sectionLabel}>{text.categories}</Text>
        <View style={styles.chips}>
          {categoryChips.map((category) => <View key={category} style={styles.chip}><Text style={styles.chipText}>{category}</Text></View>)}
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyIcon}>🛡️</Text>
          <Text style={styles.privacyText}>{text.privacy}</Text>
        </View>

        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>{text.back}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  content: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 34, paddingBottom: 120 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#A1A1AA', fontSize: 13, fontWeight: '700' },
  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  lockIcon: { fontSize: 42, marginBottom: 16 },
  eyebrow: { color: '#F5B942', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 36, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  subtitle: { color: '#A1A1AA', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  bodyCentered: { color: '#A1A1AA', maxWidth: 430, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  mapCard: { height: 300, borderRadius: 28, marginTop: 26, overflow: 'hidden', backgroundColor: '#111114', borderWidth: 1, borderColor: '#3C3020' },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  previewHalo: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(245,185,66,0.06)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.12)' },
  previewPin: { fontSize: 40 },
  previewLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 8 },
  previewSmall: { color: '#71717A', fontSize: 10, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  permissionCard: { marginTop: 16, borderRadius: 22, padding: 18, backgroundColor: '#121214', borderWidth: 1, borderColor: '#27272A' },
  cardTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  cardBody: { color: '#A1A1AA', fontSize: 13, lineHeight: 20, marginTop: 7 },
  primaryButton: { minHeight: 46, borderRadius: 16, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 16, alignSelf: 'stretch' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  buttonDisabled: { opacity: 0.55 },
  warning: { color: '#FCA5A5', fontSize: 12, lineHeight: 18, marginTop: 10 },
  sectionLabel: { color: '#71717A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 24, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, backgroundColor: '#151518', borderWidth: 1, borderColor: '#2C2C31', paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { color: '#D4D4D8', fontSize: 11, fontWeight: '800' },
  privacyCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 20, padding: 16, borderRadius: 18, backgroundColor: '#0D1812', borderWidth: 1, borderColor: '#234632' },
  privacyIcon: { fontSize: 20 },
  privacyText: { flex: 1, color: '#A7D7B9', fontSize: 12, lineHeight: 18 },
  backButton: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 14, marginTop: 20 },
  backText: { color: '#EF4444', fontSize: 12, fontWeight: '900' },
});
