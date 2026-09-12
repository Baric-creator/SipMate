import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';

const copy = {
  en: {
    title: 'SipMate Premium', subtitle: 'Premium account benefits',
    body: 'This Android version does not sell digital subscriptions inside the app. If Premium is active on your SipMate account, your Premium features unlock automatically after you sign in.',
    active: '💎 PREMIUM ACTIVE', activeNote: 'Premium is active on this SipMate account.',
    monthly: 'Monthly', founders: 'Founders Premium', foundersBadge: 'FIRST 100 MEMBERS', early: 'Early Access', standard: 'Standard Yearly', firstYear: '/ first year', month: '/ month', year: '/ year', foundersNote: 'Exclusive for the first 100 confirmed yearly Premium members.', earlyNote: 'Starts after the first 100 Founder spots are taken.', standardNote: 'Standard yearly price after the Early Access period.', back: '← BACK',
  },
  de: {
    title: 'SipMate Premium', subtitle: 'Premium-Kontovorteile',
    body: 'Diese Android-Version verkauft keine digitalen Abos innerhalb der App. Wenn Premium auf deinem SipMate-Konto aktiv ist, werden deine Premium-Funktionen nach der Anmeldung automatisch freigeschaltet.',
    active: '💎 PREMIUM AKTIV', activeNote: 'Premium ist auf diesem SipMate-Konto aktiv.',
    monthly: 'Monatlich', founders: 'Founders Premium', foundersBadge: 'DIE ERSTEN 100 MITGLIEDER', early: 'Early Access', standard: 'Standard jährlich', firstYear: '/ erstes Jahr', month: '/ Monat', year: '/ Jahr', foundersNote: 'Exklusiv für die ersten 100 bestätigten jährlichen Premium-Mitglieder.', earlyNote: 'Startet, sobald die ersten 100 Founder-Plätze vergeben sind.', standardNote: 'Regulärer Jahrespreis nach der Early-Access-Phase.', back: '← ZURÜCK',
  },
  hr: {
    title: 'SipMate Premium', subtitle: 'Premium pogodnosti računa',
    body: 'Ova Android verzija ne prodaje digitalne pretplate unutar aplikacije. Ako je Premium aktivan na tvom SipMate računu, Premium mogućnosti se automatski otključavaju nakon prijave.',
    active: '💎 PREMIUM AKTIVAN', activeNote: 'Premium je aktivan na ovom SipMate računu.',
    monthly: 'Mjesečno', founders: 'Founders Premium', foundersBadge: 'PRVIH 100 ČLANOVA', early: 'Early Access', standard: 'Standard godišnje', firstYear: '/ prva godina', month: '/ mjesec', year: '/ godina', foundersNote: 'Ekskluzivno za prvih 100 potvrđenih godišnjih Premium članova.', earlyNote: 'Počinje nakon što se popuni prvih 100 Founder mjesta.', standardNote: 'Standardna godišnja cijena nakon Early Access razdoblja.', back: '← NATRAG',
  },
} as const;

export default function PremiumAndroidScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;
  const shine = useRef(new Animated.Value(0)).current;
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(shine, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [shine]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted || !data.user) return;
      const { data: profile } = await supabase.from('profiles').select('is_premium, premium_until').eq('id', data.user.id).maybeSingle();
      const active = profile?.is_premium === true && (!profile.premium_until || new Date(profile.premium_until) > new Date());
      if (mounted) setIsPremium(active);
    });
    return () => { mounted = false; };
  }, []);

  const translateX = shine.interpolate({ inputRange: [0, 1], outputRange: [-170, 700] });
  const tiers = [
    { key: 'monthly', title: text.monthly, badge: 'FLEXIBLE', price: '1,99 €', period: text.month, border: '#EF4444', glow: 'rgba(239,68,68,0.30)', bg: '#1D1214', note: '' },
    { key: 'founders', title: text.founders, badge: text.foundersBadge, price: '14,99 €', period: text.firstYear, border: '#F5B942', glow: 'rgba(245,185,66,0.32)', bg: '#1C1810', note: text.foundersNote },
    { key: 'early', title: text.early, badge: 'EARLY ACCESS', price: '17,99 €', period: text.firstYear, border: '#3B82F6', glow: 'rgba(59,130,246,0.30)', bg: '#101724', note: text.earlyNote },
    { key: 'standard', title: text.standard, badge: 'STANDARD', price: '19,99 €', period: text.year, border: '#FB5A58', glow: 'rgba(251,90,88,0.28)', bg: '#1D1214', note: text.standardNote },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>SipMate 🍻</Text>
        <Text style={styles.title}>{text.title}</Text>
        <Text style={styles.subtitle}>{text.subtitle}</Text>
        {isPremium && <View style={styles.activeCard}><Text style={styles.activeTitle}>{text.active}</Text><Text style={styles.activeText}>{text.activeNote}</Text></View>}
        <Text style={styles.body}>{text.body}</Text>
        <View style={styles.tierList}>
          {tiers.map((tier) => (
            <View key={tier.key} style={[styles.tierCard, { borderColor: tier.border, backgroundColor: tier.bg }]}>
              <Animated.View pointerEvents="none" style={[styles.shine, { backgroundColor: tier.glow, transform: [{ translateX }, { rotate: '18deg' }] }]} />
              <Text style={[styles.tierBadge, { color: tier.border }]}>{tier.badge}</Text>
              <Text style={styles.tierTitle}>{tier.title}</Text>
              <View style={styles.priceRow}><Text style={styles.price}>{tier.price}</Text><Text style={styles.period}>{tier.period}</Text></View>
              {!!tier.note && <Text style={styles.tierNote}>{tier.note}</Text>}
            </View>
          ))}
        </View>
        <Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.backText}>{text.back}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  content: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 36 },
  logo: { color: '#EF4444', fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  title: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#A1A1AA', fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textAlign: 'center', marginTop: 8 },
  activeCard: { marginTop: 18, backgroundColor: '#0D1812', borderWidth: 1, borderColor: '#285A3B', borderRadius: 18, padding: 16 },
  activeTitle: { color: '#67DC98', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  activeText: { color: '#A7D7B9', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  body: { color: '#A1A1AA', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 14, marginBottom: 22 },
  tierList: { gap: 12 },
  tierCard: { position: 'relative', overflow: 'hidden', borderWidth: 1.5, borderRadius: 22, padding: 20, minHeight: 150 },
  shine: { position: 'absolute', top: -80, bottom: -80, left: -80, width: 78, opacity: 0.95 },
  tierBadge: { fontSize: 9, fontWeight: '900', letterSpacing: 1.0 },
  tierTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 7 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 18 },
  price: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  period: { color: '#A1A1AA', fontSize: 11, marginLeft: 7, marginBottom: 5 },
  tierNote: { color: '#A1A1AA', fontSize: 12, lineHeight: 18, marginTop: 14 },
  backButton: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 14, marginTop: 22 },
  backText: { color: '#EF4444', fontSize: 13, fontWeight: '900' },
});
