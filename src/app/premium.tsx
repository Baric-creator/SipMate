import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { showAlert } from '../lib/notify';
import { isPremiumActive } from '../lib/premium-status';
import { supabase } from '../lib/supabase';

type PremiumOffer = {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  billing_period: 'monthly' | 'yearly';
  max_subscribers: number | null;
  subscriber_count: number;
  is_active: boolean;
  sort_order: number;
};

const copy = {
  en: {
    signInAgain: 'Please sign in again.', portalError: 'Could not open subscription management.', portalMissing: 'Stripe portal URL was not returned.', paymentStartError: 'Could not start payment. Please try again.', checkoutMissing: 'Stripe Checkout URL was not returned.', paymentError: 'Could not start payment.', month: '/ month', firstYear: '/ first year', year: '/ year', foundersBadge: '🔥 FOUNDERS OFFER', earlyBadge: '⚡ EARLY ACCESS', yearlyBadge: '💎 PREMIUM YEARLY', premiumBadge: '💎 PREMIUM', successTitle: 'PREMIUM UNLOCKED!', successSubtitle: 'Welcome to SipMate Premium 💎', successText: 'Your Premium features are now active.', letsGo: "LET'S GO 🍻", paymentCancelled: 'PAYMENT CANCELLED', paymentCancelledText: 'No payment was made. You can choose a Premium plan whenever you are ready.', gotIt: 'GOT IT', title: 'Go Premium', subtitle: 'More freedom. More people. More Cheers.', heroText: 'Unlock more ways to discover, connect and meet people nearby.', includes: 'PREMIUM INCLUDES', directMessaging: 'Direct messaging', seeCheers: 'See who sent you Cheers', filters: 'Advanced discovery filters', changeLocation: 'Change your location', skipped: 'Find skipped profiles again', photos: 'More profile photos', active: '💎 PREMIUM ACTIVE', foundersPlan: 'Founders Premium Yearly', earlyPlan: 'Early Access Premium Yearly', yearlyPlan: 'SipMate Premium Yearly', monthlyPlan: 'SipMate Premium Monthly', currentEnds: 'Current period ends:', cancellationScheduled: '⚠️ CANCELLATION SCHEDULED', staysActiveUntil: 'Your Premium stays active until', billingEnd: 'the end of your billing period', willNotRenew: 'and will not renew.', unlocked: '✅ Premium benefits unlocked', choose: 'Choose your plan', loading: 'Loading Premium offers...', none: 'No Premium offers are available right now.', bestValue: 'BEST VALUE', nextOffer: 'Next offer: 17,99 € / year', standardLater: 'Standard later: 19,99 €', founderSpots: 'Founder spots left', cancelAnytime: 'Cancel anytime. Perfect if you want to try Premium first.', standardYearly: 'Standard yearly Premium plan.', introYearly: 'Introductory price for your first year.', getFounders: 'GET FOUNDERS PREMIUM', getEarly: 'GET EARLY ACCESS', getPremium: 'GET PREMIUM', manage: 'MANAGE SUBSCRIPTION', foundersPricing: '🍻 Founders pricing', foundersNote: 'The first 100 confirmed yearly Premium subscribers get the Founders price of 14,99 € for their first year. After all Founder spots are taken, the Early Access offer starts at 17,99 € for the first year. Standard yearly pricing is 19,99 €.', back: '← BACK',
  },
  de: {
    signInAgain: 'Bitte melde dich erneut an.', portalError: 'Abo-Verwaltung konnte nicht geöffnet werden.', portalMissing: 'Die Stripe-Portal-URL wurde nicht zurückgegeben.', paymentStartError: 'Zahlung konnte nicht gestartet werden. Bitte versuche es erneut.', checkoutMissing: 'Stripe-Checkout-URL wurde nicht zurückgegeben.', paymentError: 'Zahlung konnte nicht gestartet werden.', month: '/ Monat', firstYear: '/ erstes Jahr', year: '/ Jahr', foundersBadge: '🔥 FOUNDERS-ANGEBOT', earlyBadge: '⚡ EARLY ACCESS', yearlyBadge: '💎 PREMIUM JÄHRLICH', premiumBadge: '💎 PREMIUM', successTitle: 'PREMIUM FREIGESCHALTET!', successSubtitle: 'Willkommen bei SipMate Premium 💎', successText: 'Deine Premium-Funktionen sind jetzt aktiv.', letsGo: 'LOS GEHT’S 🍻', paymentCancelled: 'ZAHLUNG ABGEBROCHEN', paymentCancelledText: 'Es wurde nichts bezahlt. Du kannst jederzeit einen Premium-Plan auswählen.', gotIt: 'VERSTANDEN', title: 'Premium holen', subtitle: 'Mehr Freiheit. Mehr Leute. Mehr Cheers.', heroText: 'Schalte mehr Möglichkeiten frei, Menschen in deiner Nähe zu entdecken und kennenzulernen.', includes: 'PREMIUM ENTHÄLT', directMessaging: 'Direkte Nachrichten', seeCheers: 'Sieh, wer dir Cheers gesendet hat', filters: 'Erweiterte Entdeckungsfilter', changeLocation: 'Standort ändern', skipped: 'Übersprungene Profile wiederfinden', photos: 'Mehr Profilfotos', active: '💎 PREMIUM AKTIV', foundersPlan: 'Founders Premium jährlich', earlyPlan: 'Early Access Premium jährlich', yearlyPlan: 'SipMate Premium jährlich', monthlyPlan: 'SipMate Premium monatlich', currentEnds: 'Aktueller Zeitraum endet:', cancellationScheduled: '⚠️ KÜNDIGUNG VORGEMERKT', staysActiveUntil: 'Dein Premium bleibt aktiv bis', billingEnd: 'zum Ende deines Abrechnungszeitraums', willNotRenew: 'und verlängert sich danach nicht.', unlocked: '✅ Premium-Vorteile freigeschaltet', choose: 'Wähle deinen Plan', loading: 'Premium-Angebote werden geladen...', none: 'Derzeit sind keine Premium-Angebote verfügbar.', bestValue: 'BESTER PREIS', nextOffer: 'Nächstes Angebot: 17,99 € / Jahr', standardLater: 'Später Standard: 19,99 €', founderSpots: 'Founder-Plätze übrig', cancelAnytime: 'Jederzeit kündbar. Perfekt, wenn du Premium zuerst testen möchtest.', standardYearly: 'Standard-Premiumplan für ein Jahr.', introYearly: 'Einführungspreis für dein erstes Jahr.', getFounders: 'FOUNDERS PREMIUM HOLEN', getEarly: 'EARLY ACCESS HOLEN', getPremium: 'PREMIUM HOLEN', manage: 'ABO VERWALTEN', foundersPricing: '🍻 Founders-Preis', foundersNote: 'Die ersten 100 bestätigten jährlichen Premium-Abonnenten erhalten den Founders-Preis von 14,99 € für ihr erstes Jahr. Danach startet Early Access mit 17,99 € für das erste Jahr. Der reguläre Jahrespreis beträgt 19,99 €.', back: '← ZURÜCK',
  },
  hr: {
    signInAgain: 'Prijavi se ponovno.', portalError: 'Nije moguće otvoriti upravljanje pretplatom.', portalMissing: 'Stripe portal URL nije vraćen.', paymentStartError: 'Plaćanje nije moguće pokrenuti. Pokušaj ponovno.', checkoutMissing: 'Stripe Checkout URL nije vraćen.', paymentError: 'Plaćanje nije moguće pokrenuti.', month: '/ mjesec', firstYear: '/ prva godina', year: '/ godina', foundersBadge: '🔥 FOUNDERS PONUDA', earlyBadge: '⚡ EARLY ACCESS', yearlyBadge: '💎 PREMIUM GODIŠNJE', premiumBadge: '💎 PREMIUM', successTitle: 'PREMIUM OTKLJUČAN!', successSubtitle: 'Dobrodošao u SipMate Premium 💎', successText: 'Tvoje Premium mogućnosti sada su aktivne.', letsGo: 'IDEMO 🍻', paymentCancelled: 'PLAĆANJE OTKAZANO', paymentCancelledText: 'Plaćanje nije izvršeno. Premium plan možeš odabrati kada god želiš.', gotIt: 'RAZUMIJEM', title: 'Uzmi Premium', subtitle: 'Više slobode. Više ljudi. Više Cheers-a.', heroText: 'Otključaj više načina za pronalazak, povezivanje i upoznavanje ljudi u blizini.', includes: 'PREMIUM UKLJUČUJE', directMessaging: 'Direktne poruke', seeCheers: 'Vidi tko ti je poslao Cheers', filters: 'Napredni filteri pretrage', changeLocation: 'Promijeni lokaciju', skipped: 'Ponovno pronađi preskočene profile', photos: 'Više fotografija profila', active: '💎 PREMIUM AKTIVAN', foundersPlan: 'Founders Premium godišnje', earlyPlan: 'Early Access Premium godišnje', yearlyPlan: 'SipMate Premium godišnje', monthlyPlan: 'SipMate Premium mjesečno', currentEnds: 'Trenutno razdoblje završava:', cancellationScheduled: '⚠️ OTKAZIVANJE ZAKAZANO', staysActiveUntil: 'Tvoj Premium ostaje aktivan do', billingEnd: 'kraja obračunskog razdoblja', willNotRenew: 'i nakon toga se neće obnoviti.', unlocked: '✅ Premium pogodnosti otključane', choose: 'Odaberi plan', loading: 'Učitavanje Premium ponuda...', none: 'Trenutno nema dostupnih Premium ponuda.', bestValue: 'NAJBOLJA PONUDA', nextOffer: 'Sljedeća ponuda: 17,99 € / godina', standardLater: 'Kasnije standardno: 19,99 €', founderSpots: 'Founder mjesta preostalo', cancelAnytime: 'Otkaži bilo kada. Idealno ako prvo želiš isprobati Premium.', standardYearly: 'Standardni godišnji Premium plan.', introYearly: 'Uvodna cijena za tvoju prvu godinu.', getFounders: 'UZMI FOUNDERS PREMIUM', getEarly: 'UZMI EARLY ACCESS', getPremium: 'UZMI PREMIUM', manage: 'UPRAVLJAJ PRETPLATOM', foundersPricing: '🍻 Founders cijena', foundersNote: 'Prvih 100 potvrđenih godišnjih Premium pretplatnika dobiva Founders cijenu od 14,99 € za prvu godinu. Nakon što se Founder mjesta popune, Early Access kreće s 17,99 € za prvu godinu. Standardna godišnja cijena je 19,99 €.', back: '← NATRAG',
  },
} as const;

export default function PremiumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string }>();
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  const [offers, setOffers] = useState<PremiumOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [premiumPrice, setPremiumPrice] = useState<number | null>(null);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);
  const [showCheckoutCancelled, setShowCheckoutCancelled] = useState(false);

  useEffect(() => { loadOffers(); loadPremiumStatus(); }, []);

  useEffect(() => {
    if (params.checkout !== 'success') return;
    loadPremiumStatus();
    const timer1 = setTimeout(loadPremiumStatus, 2000);
    const timer2 = setTimeout(loadPremiumStatus, 5000);
    const timer3 = setTimeout(loadPremiumStatus, 8000);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, [params.checkout]);

  useEffect(() => { if (params.checkout === 'cancelled') setShowCheckoutCancelled(true); }, [params.checkout]);

  async function openExternalUrl(url: string, fallbackMessage: string) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) { showAlert(fallbackMessage); return; }
      await Linking.openURL(url);
    } catch (error) {
      console.log('OPEN EXTERNAL URL ERROR:', error);
      showAlert(fallbackMessage);
    }
  }

  async function loadOffers() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('premium_offers').select('*').eq('is_active', true).order('sort_order', { ascending: true });
      if (error) { console.log('PREMIUM OFFERS ERROR:', error.message); return; }
      setOffers((data ?? []) as PremiumOffer[]);
    } finally { setLoading(false); }
  }

  async function handleManageSubscription() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) { showAlert(text.signInAgain); return; }
      const { data, error } = await supabase.functions.invoke('create-customer-portal', { body: { accessToken: session.access_token } });
      if (error) { console.log('CUSTOMER PORTAL ERROR:', error); showAlert(text.portalError); return; }
      if (!data?.url) { showAlert(text.portalMissing); return; }
      await openExternalUrl(data.url, text.portalError);
    } catch (error) { console.log('MANAGE SUBSCRIPTION ERROR:', error); showAlert(text.portalError); }
  }

  async function loadPremiumStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsPremium(false); setPremiumPlan(null); setPremiumUntil(null); setPremiumPrice(null); return; }
    const { data: profile, error: profileError } = await supabase.from('profiles').select('is_premium, premium_until').eq('id', user.id).single();
    if (profileError) { console.log('PREMIUM STATUS ERROR:', profileError.message); return; }
    const premiumActive = isPremiumActive(profile?.is_premium, profile?.premium_until);
    setIsPremium(premiumActive);
    if (premiumActive && params.checkout === 'success') setShowPremiumSuccess(true);
    setPremiumUntil(profile?.premium_until ?? null);
    if (!premiumActive) { setPremiumPlan(null); setPremiumPrice(null); setHasStripeSubscription(false); setCancelAtPeriodEnd(false); return; }
    const { data: subscription, error: subscriptionError } = await supabase.from('premium_subscriptions').select('offer_code, expires_at, stripe_subscription_id, cancel_at_period_end').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (subscriptionError) { console.log('PREMIUM SUBSCRIPTION ERROR:', subscriptionError.message); return; }
    if (!subscription) return;
    setHasStripeSubscription(!!subscription.stripe_subscription_id);
    setCancelAtPeriodEnd(subscription.cancel_at_period_end === true);
    setPremiumPlan(subscription.offer_code);
    setPremiumUntil(subscription.expires_at ?? profile?.premium_until ?? null);
    const { data: offer, error: offerError } = await supabase.from('premium_offers').select('price_cents').eq('code', subscription.offer_code).maybeSingle();
    if (offerError) { console.log('PREMIUM PRICE ERROR:', offerError.message); return; }
    setPremiumPrice(offer?.price_cents ?? null);
  }

  async function handleSelectOffer(offer: PremiumOffer) {
    try {
      const plan = offer.billing_period === 'monthly' ? 'monthly' : 'yearly';
      const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: { plan } });
      if (error) { console.log('CHECKOUT FUNCTION ERROR:', error); showAlert(text.paymentStartError); return; }
      if (!data?.url) { showAlert(text.checkoutMissing); return; }
      await openExternalUrl(data.url, text.paymentError);
    } catch (error) { console.log('CHECKOUT ERROR:', error); showAlert(text.paymentError); }
  }

  function formatPrice(priceCents: number) { return (priceCents / 100).toFixed(2).replace('.', ','); }
  function getPeriodLabel(billingPeriod: 'monthly' | 'yearly') { return billingPeriod === 'monthly' ? text.month : text.firstYear; }
  function getOfferBadge(code: string) { if (code === 'founders_yearly') return text.foundersBadge; if (code === 'early_yearly') return text.earlyBadge; if (code === 'standard_yearly') return text.yearlyBadge; return text.premiumBadge; }
  function getOfferName(offer: PremiumOffer) { if (offer.code === 'founders_yearly') return text.foundersPlan; if (offer.code === 'early_yearly') return text.earlyPlan; if (offer.code === 'standard_yearly') return text.yearlyPlan; if (offer.billing_period === 'monthly') return text.monthlyPlan; return offer.name; }
  function getPlanName() { if (premiumPlan === 'founders_yearly') return text.foundersPlan; if (premiumPlan === 'early_yearly') return text.earlyPlan; if (premiumPlan === 'standard_yearly') return text.yearlyPlan; if (premiumPlan === 'monthly') return text.monthlyPlan; return 'SipMate Premium'; }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {showPremiumSuccess && <View style={styles.successCard}><Text style={styles.successIcon}>🎉</Text><Text style={styles.successTitle}>{text.successTitle}</Text><Text style={styles.successSubtitle}>{text.successSubtitle}</Text><Text style={styles.successText}>{text.successText}</Text><Pressable style={styles.successButton} onPress={() => { setShowPremiumSuccess(false); router.replace('/premium'); }}><Text style={styles.successButtonText}>{text.letsGo}</Text></Pressable></View>}
        {showCheckoutCancelled && <View style={styles.cancelledCheckoutCard}><Text style={styles.cancelledCheckoutTitle}>{text.paymentCancelled}</Text><Text style={styles.cancelledCheckoutText}>{text.paymentCancelledText}</Text><Pressable style={styles.cancelledCheckoutButton} onPress={() => { setShowCheckoutCancelled(false); router.replace('/premium'); }}><Text style={styles.cancelledCheckoutButtonText}>{text.gotIt}</Text></Pressable></View>}
        <View style={styles.header}><Text style={styles.logo}>SipMate 🍻</Text><Text style={styles.title}>{text.title}</Text><Text style={styles.subtitle}>{text.subtitle}</Text></View>
        <View style={styles.heroCard}><Text style={styles.heroIcon}>💎</Text><Text style={styles.heroTitle}>SIPMATE PREMIUM</Text><Text style={styles.heroText}>{text.heroText}</Text></View>
        <View style={styles.featuresCard}><Text style={styles.sectionTitle}>{text.includes}</Text><FeatureRow icon="💬" text={text.directMessaging} /><FeatureRow icon="👀" text={text.seeCheers} /><FeatureRow icon="🎯" text={text.filters} /><FeatureRow icon="📍" text={text.changeLocation} /><FeatureRow icon="↩️" text={text.skipped} /><FeatureRow icon="📸" text={text.photos} /></View>
        {isPremium && <View style={styles.activePremiumCard}><Text style={styles.activePremiumBadge}>{text.active}</Text><Text style={styles.activePremiumPlan}>{getPlanName()}</Text>{premiumPrice != null && <Text style={styles.activePremiumPrice}>{formatPrice(premiumPrice)} €{premiumPlan === 'monthly' ? ` ${text.month}` : ` ${text.year}`}</Text>}{premiumUntil && <Text style={styles.activePremiumUntil}>{text.currentEnds} {new Date(premiumUntil).toLocaleDateString()}</Text>}{cancelAtPeriodEnd && <View style={styles.cancelNotice}><Text style={styles.cancelNoticeTitle}>{text.cancellationScheduled}</Text><Text style={styles.cancelNoticeText}>{text.staysActiveUntil} {premiumUntil ? new Date(premiumUntil).toLocaleDateString() : text.billingEnd} {text.willNotRenew}</Text></View>}<Text style={styles.activePremiumUnlocked}>{text.unlocked}</Text></View>}
        {!isPremium && <Text style={styles.chooseTitle}>{text.choose}</Text>}
        {!isPremium && (loading ? <Text style={styles.loadingText}>{text.loading}</Text> : offers.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyText}>{text.none}</Text></View> : offers.map((offer) => {
          const isFounders = offer.code === 'founders_yearly';
          const spotsLeft = offer.max_subscribers != null ? Math.max(offer.max_subscribers - offer.subscriber_count, 0) : null;
          return <View key={offer.id} style={[styles.offerCard, isFounders && styles.offerCardFeatured]}><View style={styles.offerTopRow}><View style={styles.offerHeading}><Text style={styles.offerBadge}>{getOfferBadge(offer.code)}</Text><Text style={styles.offerName}>{getOfferName(offer)}</Text></View>{isFounders && <View style={styles.bestValueBadge}><Text style={styles.bestValueText}>{text.bestValue}</Text></View>}</View><View style={styles.priceRow}><Text style={styles.price}>{formatPrice(offer.price_cents)} €</Text><Text style={styles.period}>{getPeriodLabel(offer.billing_period)}</Text></View>{isFounders && <><Text style={styles.originalPrice}>{text.nextOffer} • {text.standardLater}</Text>{spotsLeft != null && <View style={styles.spotsBox}><Text style={styles.spotsText}>🔥 {spotsLeft} / {offer.max_subscribers} {text.founderSpots}</Text></View>}</>}{offer.billing_period === 'monthly' && <Text style={styles.offerDescription}>{text.cancelAnytime}</Text>}{offer.billing_period === 'yearly' && <Text style={styles.offerDescription}>{offer.code === 'standard_yearly' ? text.standardYearly : text.introYearly}</Text>}<Pressable style={[styles.selectButton, isFounders && styles.selectButtonFeatured]} onPress={() => handleSelectOffer(offer)}><Text style={styles.selectButtonText}>{offer.code === 'founders_yearly' ? text.getFounders : offer.code === 'early_yearly' ? text.getEarly : text.getPremium}</Text></Pressable></View>;
        }))}
        {isPremium && hasStripeSubscription && <Pressable style={styles.manageSubscriptionButton} onPress={handleManageSubscription}><Text style={styles.manageSubscriptionText}>{text.manage}</Text></Pressable>}
        <View style={styles.noteCard}><Text style={styles.noteTitle}>{text.foundersPricing}</Text><Text style={styles.noteText}>{text.foundersNote}</Text></View>
        <Pressable style={styles.backButton} onPress={() => router.back()}><Text style={styles.backText}>{text.back}</Text></Pressable>
        <Text style={styles.footer}>SipMate Premium 💎</Text>
      </ScrollView>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) { return <View style={styles.featureRow}><View style={styles.featureIcon}><Text style={styles.featureIconText}>{icon}</Text></View><Text style={styles.featureText}>{text}</Text><Text style={styles.check}>✓</Text></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' }, scroll: { flex: 1 }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 50 }, header: { alignItems: 'center', marginBottom: 24 }, logo: { color: '#EF4444', fontSize: 17, fontWeight: '900', marginBottom: 14 }, title: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', textAlign: 'center' }, subtitle: { color: '#A1A1AA', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  heroCard: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#DC2626', borderRadius: 28, padding: 26, alignItems: 'center', marginBottom: 20 }, heroIcon: { fontSize: 44 }, heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 12, letterSpacing: 0.8 }, heroText: { color: '#A1A1AA', fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 9, maxWidth: 460 },
  featuresCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#27272A', marginBottom: 28 }, sectionTitle: { color: '#71717A', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 14 }, featureRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderBottomColor: '#27272A' }, featureIcon: { width: 34, alignItems: 'center' }, featureIconText: { fontSize: 17 }, featureText: { flex: 1, color: '#E4E4E7', fontSize: 14, fontWeight: '700', paddingHorizontal: 8 }, check: { color: '#22C55E', fontSize: 17, fontWeight: '900' }, chooseTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginBottom: 14 }, loadingText: { color: '#A1A1AA', textAlign: 'center', paddingVertical: 30 }, emptyCard: { backgroundColor: '#18181B', borderRadius: 20, padding: 20 }, emptyText: { color: '#A1A1AA', textAlign: 'center' },
  offerCard: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 25, padding: 22, marginBottom: 16 }, offerCardFeatured: { borderWidth: 2, borderColor: '#F59E0B', backgroundColor: '#1C1917' }, offerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, offerHeading: { flex: 1, paddingRight: 10 }, offerBadge: { color: '#F59E0B', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 }, offerName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 5 }, bestValueBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }, bestValueText: { color: '#09090B', fontSize: 9, fontWeight: '900' }, priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 20 }, price: { color: '#FFFFFF', fontSize: 35, fontWeight: '900' }, period: { color: '#A1A1AA', fontSize: 12, marginLeft: 7, marginBottom: 6 }, originalPrice: { color: '#71717A', fontSize: 12, marginTop: 4 }, spotsBox: { alignSelf: 'flex-start', marginTop: 14, backgroundColor: '#450A0A', borderWidth: 1, borderColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }, spotsText: { color: '#FCA5A5', fontSize: 12, fontWeight: '900' }, offerDescription: { color: '#A1A1AA', fontSize: 13, lineHeight: 19, marginTop: 15 }, selectButton: { width: '100%', backgroundColor: '#DC2626', paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 20 }, selectButtonFeatured: { backgroundColor: '#F59E0B' }, selectButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.6 },
  noteCard: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderRadius: 20, padding: 18, marginTop: 8 }, noteTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, noteText: { color: '#A1A1AA', fontSize: 12, lineHeight: 19, marginTop: 7 }, backButton: { alignSelf: 'center', marginTop: 28, paddingHorizontal: 20, paddingVertical: 12 }, backText: { color: '#EF4444', fontSize: 13, fontWeight: '900' }, footer: { color: '#52525B', textAlign: 'center', fontSize: 11, marginTop: 10 },
  successCard: { marginBottom: 22, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#F59E0B', backgroundColor: '#18181B', alignItems: 'center' }, successIcon: { fontSize: 42, marginBottom: 10 }, successTitle: { color: '#FBBF24', fontSize: 24, fontWeight: '900', letterSpacing: 1, textAlign: 'center', marginBottom: 8 }, successSubtitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 }, successText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 20 }, successButton: { width: '100%', backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }, successButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  cancelledCheckoutCard: { marginBottom: 22, padding: 20, borderRadius: 18, borderWidth: 1, borderColor: '#52525B', backgroundColor: '#18181B', alignItems: 'center' }, cancelledCheckoutTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center', marginBottom: 8 }, cancelledCheckoutText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center', marginBottom: 16 }, cancelledCheckoutButton: { width: '100%', backgroundColor: '#27272A', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }, cancelledCheckoutButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.7 },
  activePremiumCard: { marginTop: 22, marginBottom: 22, padding: 22, borderRadius: 18, borderWidth: 1, borderColor: '#F59E0B', backgroundColor: '#18181B', alignItems: 'center' }, activePremiumBadge: { color: '#FBBF24', fontSize: 14, fontWeight: '900', letterSpacing: 1.2, marginBottom: 12 }, activePremiumPlan: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 8 }, activePremiumPrice: { color: '#FBBF24', fontSize: 18, fontWeight: '800', marginBottom: 10 }, activePremiumUntil: { color: '#A1A1AA', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 14 }, cancelNotice: { width: '100%', marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DC2626', backgroundColor: '#2A1111', alignItems: 'center' }, cancelNoticeTitle: { color: '#EF4444', fontSize: 14, fontWeight: '900', letterSpacing: 0.7, textAlign: 'center', marginBottom: 6 }, cancelNoticeText: { color: '#E4E4E7', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 }, activePremiumUnlocked: { color: '#22C55E', fontSize: 14, fontWeight: '800', marginTop: 14 }, manageSubscriptionButton: { marginTop: 8, marginBottom: 30, borderWidth: 1, borderColor: '#F59E0B', borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: '#18181B' }, manageSubscriptionText: { color: '#FBBF24', fontSize: 14, fontWeight: '800', letterSpacing: 0.8 },
});
