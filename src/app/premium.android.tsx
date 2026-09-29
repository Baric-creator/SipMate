import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIAP } from 'expo-iap';

import { supabase } from '../lib/supabase';

const PREMIUM_PRODUCT_ID = 'sipmate_premium';
const PREMIUM_BASE_PLAN_ID = 'monthly';

const copy = {
  en: {
    title: 'SipMate Premium', subtitle: 'Premium account benefits',
    body: 'Subscribe securely through Google Play. Premium is linked to your SipMate account and unlocks automatically after your purchase is verified.',
    active: '💎 PREMIUM ACTIVE', activeNote: 'Premium is active on this SipMate account.',
    spotsTitle: 'SipMate Spots 🍻', spotsBadge: 'PREMIUM FEATURE', spotsBody: 'Discover bars, cafés, pubs, clubs and other places for a drink around you on a clean, privacy-first map.', spotsOpen: 'OPEN SPOTS →', spotsLocked: 'Available with Premium',
    monthly: 'Monthly', founders: 'Founders Premium', foundersBadge: 'FIRST 100 MEMBERS', early: 'Early Access', standard: 'Standard Yearly', firstYear: '/ first year', month: '/ month', year: '/ year', foundersNote: 'Exclusive for the first 100 confirmed yearly Premium members.', earlyNote: 'Starts after the first 100 Founder spots are taken.', standardNote: 'Standard yearly price after the Early Access period.', back: '← BACK',
    purchaseVerified: 'Premium activated successfully. 🍻', verificationMissing: 'Google Play completed the purchase, but SipMate could not verify it. Please try again.', verificationPending: 'Your purchase could not be verified yet. You will not need to buy it again. Please try again shortly.', purchaseFailed: 'The purchase could not be completed. Please try again.', subscriptionUnavailable: 'Google Play subscription is not available yet. Please try again.', monthlyUnavailable: 'Monthly Google Play plan is not available.', purchaseStartFailed: 'The purchase could not be started. Please try again.',
  },
  de: {
    title: 'SipMate Premium', subtitle: 'Premium-Kontovorteile',
    body: 'Abonniere sicher über Google Play. Premium wird mit deinem SipMate-Konto verknüpft und nach erfolgreicher Bestätigung automatisch freigeschaltet.',
    active: '💎 PREMIUM AKTIV', activeNote: 'Premium ist auf deinem SipMate-Konto aktiv.',
    spotsTitle: 'SipMate Spots 🍻', spotsBadge: 'PREMIUM-FUNKTION', spotsBody: 'Entdecke Bars, Cafés, Pubs, Clubs und weitere Orte für einen Drink in deiner Nähe auf einer klaren, datenschutzfreundlichen Karte.', spotsOpen: 'SPOTS ÖFFNEN →', spotsLocked: 'Mit Premium verfügbar',
    monthly: 'Monatlich', founders: 'Founders Premium', foundersBadge: 'DIE ERSTEN 100 MITGLIEDER', early: 'Early Access', standard: 'Standard jährlich', firstYear: '/ erstes Jahr', month: '/ Monat', year: '/ Jahr', foundersNote: 'Exklusiv für die ersten 100 bestätigten jährlichen Premium-Mitglieder.', earlyNote: 'Startet, sobald die ersten 100 Founder-Plätze vergeben sind.', standardNote: 'Regulärer Jahrespreis nach der Early-Access-Phase.', back: '← ZURÜCK',
    purchaseVerified: 'Premium wurde erfolgreich aktiviert. 🍻', verificationMissing: 'Google Play hat den Kauf abgeschlossen, aber SipMate konnte ihn noch nicht bestätigen. Bitte versuche es erneut.', verificationPending: 'Dein Kauf konnte noch nicht bestätigt werden. Du musst ihn nicht erneut kaufen. Bitte versuche es in Kürze erneut.', purchaseFailed: 'Der Kauf konnte nicht abgeschlossen werden. Bitte versuche es erneut.', subscriptionUnavailable: 'Das Google-Play-Abo ist derzeit nicht verfügbar. Bitte versuche es erneut.', monthlyUnavailable: 'Der monatliche Google-Play-Tarif ist nicht verfügbar.', purchaseStartFailed: 'Der Kauf konnte nicht gestartet werden. Bitte versuche es erneut.',
  },
  hr: {
    title: 'SipMate Premium', subtitle: 'Premium pogodnosti računa',
    body: 'Pretplati se sigurno putem Google Playa. Premium se povezuje s tvojim SipMate računom i automatski se aktivira nakon potvrde kupnje.',
    active: '💎 PREMIUM AKTIVAN', activeNote: 'Premium je aktivan na tvom SipMate računu.',
    spotsTitle: 'SipMate Spots 🍻', spotsBadge: 'PREMIUM FUNKCIJA', spotsBody: 'Otkrij barove, kafiće, pubove, klubove i druga mjesta za piće u blizini na čistoj karti koja čuva privatnost korisnika.', spotsOpen: 'OTVORI SPOTS →', spotsLocked: 'Dostupno uz Premium',
    monthly: 'Mjesečno', founders: 'Founders Premium', foundersBadge: 'PRVIH 100 ČLANOVA', early: 'Early Access', standard: 'Standard godišnje', firstYear: '/ prva godina', month: '/ mjesec', year: '/ godina', foundersNote: 'Ekskluzivno za prvih 100 potvrđenih godišnjih Premium članova.', earlyNote: 'Počinje nakon što se popuni prvih 100 Founder mjesta.', standardNote: 'Standardna godišnja cijena nakon Early Access razdoblja.', back: '← NATRAG',
    purchaseVerified: 'Premium je uspješno aktiviran. 🍻', verificationMissing: 'Google Play je završio kupnju, ali SipMate je još nije uspio potvrditi. Pokušaj ponovno.', verificationPending: 'Kupnja još nije potvrđena. Ne moraš je kupovati ponovno. Pokušaj ponovno za koji trenutak.', purchaseFailed: 'Kupnju nije bilo moguće dovršiti. Pokušaj ponovno.', subscriptionUnavailable: 'Google Play pretplata trenutačno nije dostupna. Pokušaj ponovno.', monthlyUnavailable: 'Mjesečni Google Play paket trenutačno nije dostupan.', purchaseStartFailed: 'Kupnju nije bilo moguće pokrenuti. Pokušaj ponovno.',
  },
} as const;

export default function PremiumAndroidScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;
  const shine = useRef(new Animated.Value(0)).current;
  const [isPremium, setIsPremium] = useState(false);
  const [googlePlayPrice, setGooglePlayPrice] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const processingTokenRef = useRef<string | null>(null);
  const recoveredTokensRef = useRef<Set<string>>(new Set());

  const verifyPurchaseOnServer = async (purchaseToken: string) => {
    const { data, error } = await supabase.functions.invoke('google-play-verify', {
      body: { purchase_token: purchaseToken },
    });

    if (error) {
      console.warn('Premium verification failed:', error);
      throw new Error('verification_failed');
    }

    if (!data?.ok || data?.premium !== true) {
      console.warn('Premium verification rejected:', data);
      throw new Error(data?.error || 'verification_rejected');
    }

    return data;
  };

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    availablePurchases,
    getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      const purchaseToken = purchase.purchaseToken;

      if (!purchaseToken) {
        setIsPurchasing(false);
        Alert.alert('SipMate Premium', text.verificationMissing);
        return;
      }

      if (processingTokenRef.current === purchaseToken) return;
      processingTokenRef.current = purchaseToken;

      try {
        await verifyPurchaseOnServer(purchaseToken);
        await finishTransaction({ purchase, isConsumable: false });

        const { data: entitlementRows, error: entitlementError } =
          await supabase.rpc('get_my_premium_entitlement');

        if (entitlementError) {
          console.warn('Premium entitlement refresh failed:', entitlementError);
        }

        const entitlement = Array.isArray(entitlementRows)
          ? entitlementRows[0]
          : entitlementRows;

        setIsPremium(entitlement?.is_premium === true);
        Alert.alert('SipMate Premium', text.purchaseVerified);
      } catch (error) {
        console.warn('Google Play verification failed:', error);
        Alert.alert('SipMate Premium', text.verificationPending);
      } finally {
        processingTokenRef.current = null;
        setIsPurchasing(false);
      }
    },

    onPurchaseError: (error) => {
      console.warn('Google Play purchase error:', error);
      processingTokenRef.current = null;
      setIsPurchasing(false);

      const code = String(error?.code ?? '').toLowerCase();
      if (
        code.includes('cancel') ||
        code.includes('user-cancelled') ||
        code.includes('user_cancelled')
      ) {
        return;
      }

      Alert.alert('SipMate Premium', text.purchaseFailed);
    },
  });

  useEffect(() => {
    if (!connected) return;

    getAvailablePurchases().catch((error) => {
      console.warn('Failed to load existing Google Play purchases:', error);
    });

    fetchProducts({
      skus: [PREMIUM_PRODUCT_ID],
      type: 'subs',
    }).catch((error) => {
      console.warn('Failed to load Google Play subscription:', error);
    });
  }, [connected, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    const recoverPremiumPurchase = async () => {
      const purchase = availablePurchases.find(
        (item) =>
          item.productId === PREMIUM_PRODUCT_ID && Boolean(item.purchaseToken)
      );

      if (!purchase?.purchaseToken) return;

      const purchaseToken = purchase.purchaseToken;
      if (recoveredTokensRef.current.has(purchaseToken)) return;
      if (processingTokenRef.current === purchaseToken) return;

      recoveredTokensRef.current.add(purchaseToken);
      processingTokenRef.current = purchaseToken;

      try {
        await verifyPurchaseOnServer(purchaseToken);
        await finishTransaction({ purchase, isConsumable: false });

        const { data: entitlementRows, error: entitlementError } =
          await supabase.rpc('get_my_premium_entitlement');

        if (entitlementError) {
          console.warn('Recovered Premium entitlement refresh failed:', entitlementError);
        } else {
          const entitlement = Array.isArray(entitlementRows)
            ? entitlementRows[0]
            : entitlementRows;
          setIsPremium(entitlement?.is_premium === true);
        }
      } catch (error) {
        recoveredTokensRef.current.delete(purchaseToken);
        console.warn('Existing Google Play purchase recovery failed:', error);
      } finally {
        processingTokenRef.current = null;
      }
    };

    void recoverPremiumPurchase();
  }, [availablePurchases, finishTransaction]);

  useEffect(() => {
    const product = subscriptions.find((item) => item.id === PREMIUM_PRODUCT_ID);
    if (!product || product.platform !== 'android') return;

    const monthlyOffer = product.subscriptionOffers.find(
      (offer) => offer.basePlanIdAndroid === PREMIUM_BASE_PLAN_ID
    );

    if (monthlyOffer?.displayPrice) {
      setGooglePlayPrice(monthlyOffer.displayPrice);
    } else if (product.displayPrice) {
      setGooglePlayPrice(product.displayPrice);
    }
  }, [subscriptions]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shine, {
        toValue: 1,
        duration: 3200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shine]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted || !data.user) return;
      const { data: entitlementRows } = await supabase.rpc('get_my_premium_entitlement');
      const entitlement = Array.isArray(entitlementRows)
        ? entitlementRows[0]
        : entitlementRows;
      if (mounted) setIsPremium(entitlement?.is_premium === true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubscribe = async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);

    try {
      const product = subscriptions.find((item) => item.id === PREMIUM_PRODUCT_ID);

      if (!product || product.platform !== 'android') {
        setIsPurchasing(false);
        Alert.alert('SipMate Premium', text.subscriptionUnavailable);
        return;
      }

      const monthlyOffer = product.subscriptionOffers.find(
        (offer) => offer.basePlanIdAndroid === PREMIUM_BASE_PLAN_ID
      );

      if (!monthlyOffer?.offerTokenAndroid) {
        setIsPurchasing(false);
        Alert.alert('SipMate Premium', text.monthlyUnavailable);
        return;
      }

      await requestPurchase({
        request: {
          google: {
            skus: [PREMIUM_PRODUCT_ID],
            subscriptionOffers: [
              {
                sku: PREMIUM_PRODUCT_ID,
                offerToken: monthlyOffer.offerTokenAndroid,
              },
            ],
          },
        },
        type: 'subs',
      });
    } catch (error) {
      console.warn('Google Play purchase failed:', error);
      setIsPurchasing(false);
      Alert.alert('SipMate Premium', text.purchaseStartFailed);
    }
  };

  const translateX = shine.interpolate({ inputRange: [0, 1], outputRange: [-170, 700] });
  const tiers = [
    { key: 'monthly', title: text.monthly, badge: 'FLEXIBLE', price: googlePlayPrice ?? '—', period: text.month, border: '#EF4444', glow: 'rgba(239,68,68,0.30)', bg: '#1D1214', note: '' },
    { key: 'founders', title: text.founders, badge: text.foundersBadge, price: '14,99 €', period: text.firstYear, border: '#F5B942', glow: 'rgba(245,185,66,0.32)', bg: '#1C1810', note: text.foundersNote },
    { key: 'early', title: text.early, badge: 'EARLY ACCESS', price: '17,99 €', period: text.firstYear, border: '#3B82F6', glow: 'rgba(59,130,246,0.30)', bg: '#101724', note: text.earlyNote },
    { key: 'standard', title: text.standard, badge: 'STANDARD', price: '19,99 €', period: text.year, border: '#FB5A58', glow: 'rgba(251,90,88,0.28)', bg: '#1D1214', note: text.standardNote },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 36 + insets.bottom }]}>
        <Text style={styles.logo}>SipMate 🍻</Text>
        <Text style={styles.title}>{text.title}</Text>
        <Text style={styles.subtitle}>{text.subtitle}</Text>
        {isPremium && (
          <View style={styles.activeCard}>
            <Text style={styles.activeTitle}>{text.active}</Text>
            <Text style={styles.activeText}>{text.activeNote}</Text>
          </View>
        )}
        <Text style={styles.body}>{text.body}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !isPremium }}
          disabled={!isPremium}
          onPress={() => router.push('/spots' as never)}
          style={({ pressed }) => [
            styles.spotsCard,
            pressed && isPremium && styles.spotsPressed,
            !isPremium && styles.spotsLocked,
          ]}
        >
          <View style={styles.spotsTopRow}>
            <Text style={styles.spotsBadge}>{text.spotsBadge}</Text>
            <Text style={styles.spotsIcon}>🗺️</Text>
          </View>
          <Text style={styles.spotsTitle}>{text.spotsTitle}</Text>
          <Text style={styles.spotsBody}>{text.spotsBody}</Text>
          <View style={styles.spotsDivider} />
          <Text style={[styles.spotsAction, !isPremium && styles.spotsActionLocked]}>
            {isPremium ? text.spotsOpen : `🔒 ${text.spotsLocked}`}
          </Text>
        </Pressable>

        <View style={styles.tierList}>
          {tiers.map((tier) => {
            const disabled = tier.key !== 'monthly' || !googlePlayPrice || isPremium || isPurchasing;
            return (
              <Pressable
                key={tier.key}
                accessibilityRole={tier.key === 'monthly' ? 'button' : undefined}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={tier.key === 'monthly' ? handleSubscribe : undefined}
                style={({ pressed }) => [
                  styles.tierCard,
                  {
                    borderColor: tier.border,
                    backgroundColor: tier.bg,
                    opacity: disabled && tier.key === 'monthly' ? 0.68 : pressed ? 0.82 : 1,
                  },
                ]}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.shine,
                    {
                      backgroundColor: tier.glow,
                      transform: [{ translateX }, { rotate: '18deg' }],
                    },
                  ]}
                />
                <Text style={[styles.tierBadge, { color: tier.border }]}>{tier.badge}</Text>
                <Text style={styles.tierTitle}>{tier.title}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{tier.price}</Text>
                  <Text style={styles.period}>{tier.period}</Text>
                </View>
                {!!tier.note && <Text style={styles.tierNote}>{tier.note}</Text>}
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>{text.back}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  content: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 36 },
  logo: { color: '#EF4444', fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  title: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#A1A1AA', fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textAlign: 'center', marginTop: 8 },
  activeCard: { marginTop: 18, backgroundColor: '#0D1812', borderWidth: 1, borderColor: '#285A3B', borderRadius: 18, padding: 16 },
  activeTitle: { color: '#67DC98', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  activeText: { color: '#A7D7B9', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  body: { color: '#A1A1AA', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 14, marginBottom: 18 },
  spotsCard: { borderWidth: 1, borderColor: '#5A3B17', backgroundColor: '#15120D', borderRadius: 22, padding: 18, marginBottom: 22, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
  spotsPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  spotsLocked: { opacity: 0.72 },
  spotsTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spotsBadge: { color: '#F5B942', fontSize: 9, fontWeight: '900', letterSpacing: 1.0 },
  spotsIcon: { fontSize: 20 },
  spotsTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 9 },
  spotsBody: { color: '#D4D4D8', fontSize: 13, lineHeight: 20, marginTop: 8 },
  spotsDivider: { height: 1, backgroundColor: '#3A2A18', marginVertical: 13 },
  spotsAction: { color: '#F5B942', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  spotsActionLocked: { color: '#A1A1AA' },
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