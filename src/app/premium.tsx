import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

export default function PremiumScreen() {
  const router = useRouter();
  const params =
  useLocalSearchParams<{
    checkout?: string;
  }>();

  const [offers, setOffers] = useState<PremiumOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] =
  useState(false);
const [premiumPlan, setPremiumPlan] =
  useState<string | null>(null);

const [premiumUntil, setPremiumUntil] =
  useState<string | null>(null);

const [premiumPrice, setPremiumPrice] =
  useState<number | null>(null);
  const [
  hasStripeSubscription,
  setHasStripeSubscription,
] = useState(false);
const [
  cancelAtPeriodEnd,
  setCancelAtPeriodEnd,
] = useState(false);
  const [showPremiumSuccess, setShowPremiumSuccess] =
  useState(false);

  const [
  showCheckoutCancelled,
  setShowCheckoutCancelled,
] = useState(false);
useEffect(() => {
  loadOffers();
  loadPremiumStatus();
}, []);
useEffect(() => {
  if (params.checkout !== 'success') {
    return;
  }

  loadPremiumStatus();

  const timer1 = setTimeout(() => {
    loadPremiumStatus();
  }, 2000);

  const timer2 = setTimeout(() => {
    loadPremiumStatus();
  }, 5000);

  const timer3 = setTimeout(() => {
    loadPremiumStatus();
  }, 8000);

  return () => {
    clearTimeout(timer1);
    clearTimeout(timer2);
    clearTimeout(timer3);
  };
}, [params.checkout]);
useEffect(() => {
  if (params.checkout !== 'cancelled') {
    return;
  }

  setShowCheckoutCancelled(true);
}, [params.checkout]);
  async function loadOffers() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('premium_offers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', {
          ascending: true,
        });

      if (error) {
        console.log(
          'PREMIUM OFFERS ERROR:',
          error.message
        );
        return;
      }

      setOffers((data ?? []) as PremiumOffer[]);
    } finally {
      setLoading(false);
    }
  }
async function handleManageSubscription() {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      console.log(
        'SESSION ERROR:',
        sessionError
      );

      if (typeof window !== 'undefined') {
        window.alert(
          'Please sign in again.'
        );
      }

      return;
    }

const { data, error } =
  await supabase.functions.invoke(
    'create-customer-portal',
    {
      body: {
        accessToken:
          session.access_token,
      },
    }
  );

    if (error) {
      console.log(
        'CUSTOMER PORTAL ERROR:',
        error
      );

      if (typeof window !== 'undefined') {
        window.alert(
          'Could not open subscription management.'
        );
      }

      return;
    }

    if (!data?.url) {
      console.log(
        'CUSTOMER PORTAL URL MISSING:',
        data
      );

      if (typeof window !== 'undefined') {
        window.alert(
          'Stripe portal URL was not returned.'
        );
      }

      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = data.url;
    }
  } catch (error) {
    console.log(
      'MANAGE SUBSCRIPTION ERROR:',
      error
    );

    if (typeof window !== 'undefined') {
      window.alert(
        'Could not open subscription management.'
      );
    }
  }
}
async function loadPremiumStatus() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setIsPremium(false);
    setPremiumPlan(null);
    setPremiumUntil(null);
    setPremiumPrice(null);
    return;
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('is_premium, premium_until')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.log(
      'PREMIUM STATUS ERROR:',
      profileError.message
    );
    return;
  }

  const premiumActive =
    profile?.is_premium === true;

  setIsPremium(premiumActive);
  if (
  premiumActive &&
  params.checkout === 'success'
) {
  setShowPremiumSuccess(true);
}
  setPremiumUntil(
    profile?.premium_until ?? null
  );

if (!premiumActive) {
  setPremiumPlan(null);
  setPremiumPrice(null);
  setHasStripeSubscription(false);
  setCancelAtPeriodEnd(false);
  return;
}

const {
  data: subscription,
  error: subscriptionError,
} = await supabase
.from('premium_subscriptions')
.select(
  'offer_code, expires_at, stripe_subscription_id, cancel_at_period_end'
)
  .eq('user_id', user.id)
  .eq('status', 'active')
  .order('created_at', {
    ascending: false,
  })
  .limit(1)
  .maybeSingle();

  if (subscriptionError) {
    console.log(
      'PREMIUM SUBSCRIPTION ERROR:',
      subscriptionError.message
    );
    return;
  }

  if (!subscription) {
    return;
  }
setHasStripeSubscription(
  !!subscription.stripe_subscription_id
);

setCancelAtPeriodEnd(
  subscription.cancel_at_period_end === true
);

  setPremiumPlan(
    subscription.offer_code
  );

  setPremiumUntil(
    subscription.expires_at ??
      profile?.premium_until ??
      null
  );

  const {
    data: offer,
    error: offerError,
  } = await supabase
    .from('premium_offers')
    .select('price_cents')
    .eq(
      'code',
      subscription.offer_code
    )
    .maybeSingle();

  if (offerError) {
    console.log(
      'PREMIUM PRICE ERROR:',
      offerError.message
    );
    return;
  }

  setPremiumPrice(
    offer?.price_cents ?? null
  );
}

async function handleSelectOffer(
  offer: PremiumOffer
) {
  try {
    const plan =
      offer.billing_period === 'monthly'
        ? 'monthly'
        : 'yearly';

    const { data, error } =
      await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            plan,
          },
        }
      );

    if (error) {
      console.log(
        'CHECKOUT FUNCTION ERROR:',
        error
      );

      if (typeof window !== 'undefined') {
        window.alert(
          'Could not start payment. Please try again.'
        );
      }

      return;
    }

    if (!data?.url) {
      console.log(
        'CHECKOUT URL MISSING:',
        data
      );

      if (typeof window !== 'undefined') {
        window.alert(
          'Stripe Checkout URL was not returned.'
        );
      }

      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = data.url;
    }
  } catch (error) {
    console.log(
      'CHECKOUT ERROR:',
      error
    );

    if (typeof window !== 'undefined') {
      window.alert(
        'Could not start payment.'
      );
    }
  }
}
function formatPrice(priceCents: number) {
  return (priceCents / 100)
    .toFixed(2)
    .replace('.', ',');
}

function getPeriodLabel(
  billingPeriod: 'monthly' | 'yearly'
) {
  return billingPeriod === 'monthly'
    ? '/ month'
    : '/ first year';
}

function getOfferBadge(code: string) {
  if (code === 'founders_yearly') {
    return '🔥 FOUNDERS OFFER';
  }

  if (code === 'early_yearly') {
    return '⚡ EARLY ACCESS';
  }

  if (code === 'standard_yearly') {
    return '💎 PREMIUM YEARLY';
  }

  return '💎 PREMIUM';
}
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.content
        }
      >
        {showPremiumSuccess && (
  <View style={styles.successCard}>
    <Text style={styles.successIcon}>
      🎉
    </Text>

    <Text style={styles.successTitle}>
      PREMIUM UNLOCKED!
    </Text>

    <Text style={styles.successSubtitle}>
      Welcome to SipMate Premium 💎
    </Text>

    <Text style={styles.successText}>
      Your Premium features are now active.
    </Text>

    <Pressable
      style={styles.successButton}
onPress={() => {
  setShowPremiumSuccess(false);

  router.replace('/premium');
}}
    >
      <Text style={styles.successButtonText}>
        LET&apos;S GO 🍻
      </Text>
    </Pressable>
  </View>
)}

{showCheckoutCancelled && (
  <View style={styles.cancelledCheckoutCard}>
    <Text style={styles.cancelledCheckoutTitle}>
      PAYMENT CANCELLED
    </Text>

    <Text style={styles.cancelledCheckoutText}>
      No payment was made. You can choose
      a Premium plan whenever you&apos;re ready.
    </Text>

    <Pressable
      style={styles.cancelledCheckoutButton}
      onPress={() => {
        setShowCheckoutCancelled(false);
        router.replace('/premium');
      }}
    >
      <Text
        style={styles.cancelledCheckoutButtonText}
      >
        GOT IT
      </Text>
    </Pressable>
  </View>
)}

<View style={styles.header}>
          <Text style={styles.logo}>
            SipMate 🍻
          </Text>

          <Text style={styles.title}>
            Go Premium
          </Text>

          <Text style={styles.subtitle}>
            More freedom. More people.
            More Cheers.
          </Text>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroIcon}>
            💎
          </Text>

          <Text style={styles.heroTitle}>
            SIPMATE PREMIUM
          </Text>

          <Text style={styles.heroText}>
            Unlock more ways to discover,
            connect and meet people nearby.
          </Text>
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.sectionTitle}>
            PREMIUM INCLUDES
          </Text>

          <FeatureRow
            icon="💬"
            text="Direct messaging"
          />

          <FeatureRow
            icon="👀"
            text="See who sent you Cheers"
          />

          <FeatureRow
            icon="🎯"
            text="Advanced discovery filters"
          />

          <FeatureRow
            icon="📍"
            text="Change your location"
          />

          <FeatureRow
            icon="↩️"
            text="Find skipped profiles again"
          />

          <FeatureRow
            icon="📸"
            text="More profile photos"
          />
        </View>
{isPremium && (
  <View style={styles.activePremiumCard}>
    <Text style={styles.activePremiumBadge}>
      💎 PREMIUM ACTIVE
    </Text>

    <Text style={styles.activePremiumPlan}>
      {premiumPlan === 'founders_yearly'
        ? 'Founders Premium Yearly'
        : premiumPlan === 'early_yearly'
        ? 'Early Access Premium Yearly'
        : premiumPlan === 'standard_yearly'
        ? 'SipMate Premium Yearly'
        : premiumPlan === 'monthly'
        ? 'SipMate Premium Monthly'
        : 'SipMate Premium'}
    </Text>

    {premiumPrice != null && (
      <Text style={styles.activePremiumPrice}>
        {formatPrice(premiumPrice)} €
        {premiumPlan === 'monthly'
          ? ' / month'
          : ' / year'}
      </Text>
    )}

    {premiumUntil && (
      <Text style={styles.activePremiumUntil}>
        Current period ends:{' '}
        {new Date(
          premiumUntil
        ).toLocaleDateString()}
      </Text>
    )}
{cancelAtPeriodEnd && (
  <View style={styles.cancelNotice}>
<Text style={styles.cancelNoticeTitle}>
  ⚠️ CANCELLATION SCHEDULED
</Text>

<Text style={styles.cancelNoticeText}>
  Your Premium stays active until{' '}
  {premiumUntil
    ? new Date(
        premiumUntil
      ).toLocaleDateString()
    : 'the end of your billing period'}
  {' '}and will not renew.
</Text>
  </View>
)}
    <Text style={styles.activePremiumUnlocked}>
      ✅ Premium benefits unlocked
    </Text>
  </View>
)}
{!isPremium && (
  <Text style={styles.chooseTitle}>
    Choose your plan
  </Text>
)}

{!isPremium && (
  loading ? (
             <Text style={styles.loadingText}>
            Loading Premium offers...
          </Text>
        ) : offers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No Premium offers are
              available right now.
            </Text>
          </View>
        ) : (
          offers.map((offer) => {
            const isFounders =
              offer.code ===
              'founders_yearly';

            const spotsLeft =
              offer.max_subscribers != null
                ? Math.max(
                    offer.max_subscribers -
                      offer.subscriber_count,
                    0
                  )
                : null;

            return (
              <View
                key={offer.id}
                style={[
                  styles.offerCard,
                  isFounders &&
                    styles.offerCardFeatured,
                ]}
              >
                <View
                  style={
                    styles.offerTopRow
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.offerBadge
                      }
                    >
                      {getOfferBadge(
                        offer.code
                      )}
                    </Text>

                    <Text
                      style={
                        styles.offerName
                      }
                    >
                      {offer.name}
                    </Text>
                  </View>

                  {isFounders && (
                    <View
                      style={
                        styles.bestValueBadge
                      }
                    >
                      <Text
                        style={
                          styles.bestValueText
                        }
                      >
                        BEST VALUE
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={
                    styles.priceRow
                  }
                >
                  <Text
                    style={styles.price}
                  >
                    {formatPrice(
                      offer.price_cents
                    )}{' '}
                    €
                  </Text>

                  <Text
                    style={
                      styles.period
                    }
                  >
                    {getPeriodLabel(
                      offer.billing_period
                    )}
                  </Text>
                </View>

                {isFounders && (
                  <>
<Text
  style={
    styles.originalPrice
  }
>
  Next offer: 17,99 € / year
  {' • '}
  Standard later: 19,99 €
</Text>

                    {spotsLeft != null && (
                      <View
                        style={
                          styles.spotsBox
                        }
                      >
                        <Text
                          style={
                            styles.spotsText
                          }
                        >
                          🔥 {spotsLeft} of{' '}
                          {
                            offer.max_subscribers
                          }{' '}
                          Founder spots left
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {offer.billing_period ===
                  'monthly' && (
                  <Text
                    style={
                      styles.offerDescription
                    }
                  >
                    Cancel anytime.
                    Perfect if you want to
                    try Premium first.
                  </Text>
                )}

{offer.billing_period ===
  'yearly' && (
  <Text
    style={
      styles.offerDescription
    }
  >
    {offer.code ===
    'standard_yearly'
      ? 'Standard yearly Premium plan.'
      : 'Introductory price for your first year.'}
  </Text>
)}
<Pressable
  style={[
    styles.selectButton,
    isFounders &&
      styles.selectButtonFeatured,
  ]}
  onPress={() =>
    handleSelectOffer(
      offer
    )
  }
>
<Text
  style={
    styles.selectButtonText
  }
>
  {offer.code === 'founders_yearly'
    ? 'GET FOUNDERS PREMIUM'
    : offer.code === 'early_yearly'
      ? 'GET EARLY ACCESS'
      : 'GET PREMIUM'}
</Text>
</Pressable>
              </View>
            );
          })
        )
      )}
{isPremium && hasStripeSubscription && (
            <Pressable
            style={styles.manageSubscriptionButton}
            onPress={
              handleManageSubscription
            }
          >
            <Text
              style={
                styles.manageSubscriptionText
              }
            >
              MANAGE SUBSCRIPTION
            </Text>
          </Pressable>
        )}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>
            🍻 Founders pricing
          </Text>
                  

<Text style={styles.noteText}>
  The first 100 confirmed yearly
  Premium subscribers get the
  Founders price of 14,99 € for
  their first year. After all
  Founder spots are taken, the
  Early Access offer starts at
  17,99 € for the first year.
  Standard yearly pricing is
  19,99 €.
</Text>
        </View>

        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.backText}>
            ← BACK
          </Text>
        </Pressable>

        <Text style={styles.footer}>
          SipMate Premium 💎
        </Text>
      </ScrollView>
    </View>
  );
}

function FeatureRow({
  icon,
  text,
}: {
  icon: string;
  text: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Text
          style={
            styles.featureIconText
          }
        >
          {icon}
        </Text>
      </View>

      <Text style={styles.featureText}>
        {text}
      </Text>

      <Text style={styles.check}>
        ✓
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },

  scroll: {
    flex: 1,
  },

  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
  },

  header: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logo: {
    color: '#EF4444',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 14,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    color: '#A1A1AA',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  heroCard: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    marginBottom: 20,
  },

  heroIcon: {
    fontSize: 44,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
    letterSpacing: 0.8,
  },

  heroText: {
    color: '#A1A1AA',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 9,
    maxWidth: 460,
  },

  featuresCard: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 28,
  },

  sectionTitle: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 14,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },

  featureIcon: {
    width: 34,
    alignItems: 'center',
  },

  featureIconText: {
    fontSize: 17,
  },

  featureText: {
    flex: 1,
    color: '#E4E4E7',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
  },

  check: {
    color: '#22C55E',
    fontSize: 17,
    fontWeight: '900',
  },

  chooseTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 14,
  },

  loadingText: {
    color: '#A1A1AA',
    textAlign: 'center',
    paddingVertical: 30,
  },

  emptyCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 20,
  },

  emptyText: {
    color: '#A1A1AA',
    textAlign: 'center',
  },

  offerCard: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 25,
    padding: 22,
    marginBottom: 16,
  },

  offerCardFeatured: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    backgroundColor: '#1C1917',
  },

  offerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  offerBadge: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  offerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
  },

  bestValueBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },

  bestValueText: {
    color: '#09090B',
    fontSize: 9,
    fontWeight: '900',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 20,
  },

  price: {
    color: '#FFFFFF',
    fontSize: 35,
    fontWeight: '900',
  },

  period: {
    color: '#A1A1AA',
    fontSize: 12,
    marginLeft: 7,
    marginBottom: 6,
  },

  originalPrice: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 4,
  },

  spotsBox: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: '#450A0A',
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },

  spotsText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '900',
  },

  offerDescription: {
    color: '#A1A1AA',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 15,
  },

  selectButton: {
    width: '100%',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 20,
  },

  selectButtonFeatured: {
    backgroundColor: '#F59E0B',
  },

  selectButtonText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  noteCard: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
  },

  noteTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  noteText: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  backButton: {
    alignSelf: 'center',
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  backText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '900',
  },

  footer: {
    color: '#52525B',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 10,
  },
  successCard: {
  marginBottom: 22,
  padding: 24,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#F59E0B',
  backgroundColor: '#18181B',
  alignItems: 'center',
},

successIcon: {
  fontSize: 42,
  marginBottom: 10,
},

successTitle: {
  color: '#FBBF24',
  fontSize: 24,
  fontWeight: '900',
  letterSpacing: 1,
  textAlign: 'center',
  marginBottom: 8,
},

successSubtitle: {
  color: '#FFFFFF',
  fontSize: 18,
  fontWeight: '800',
  textAlign: 'center',
  marginBottom: 8,
},

successText: {
  color: '#A1A1AA',
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
  marginBottom: 20,
},

successButton: {
  width: '100%',
  backgroundColor: '#DC2626',
  borderRadius: 14,
  paddingVertical: 15,
  alignItems: 'center',
  justifyContent: 'center',
},

successButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '900',
  letterSpacing: 0.8,
},
cancelledCheckoutCard: {
  marginBottom: 22,
  padding: 20,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#52525B',
  backgroundColor: '#18181B',
  alignItems: 'center',
},

cancelledCheckoutTitle: {
  color: '#FFFFFF',
  fontSize: 18,
  fontWeight: '900',
  letterSpacing: 0.8,
  textAlign: 'center',
  marginBottom: 8,
},

cancelledCheckoutText: {
  color: '#A1A1AA',
  fontSize: 14,
  fontWeight: '600',
  lineHeight: 20,
  textAlign: 'center',
  marginBottom: 16,
},

cancelledCheckoutButton: {
  width: '100%',
  backgroundColor: '#27272A',
  borderRadius: 12,
  paddingVertical: 13,
  alignItems: 'center',
  justifyContent: 'center',
},

cancelledCheckoutButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '900',
  letterSpacing: 0.7,
},
  activePremiumCard: {
  marginTop: 22,
  marginBottom: 22,
  padding: 22,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#F59E0B',
  backgroundColor: '#18181B',
  alignItems: 'center',
},

activePremiumBadge: {
  color: '#FBBF24',
  fontSize: 14,
  fontWeight: '900',
  letterSpacing: 1.2,
  marginBottom: 12,
},

activePremiumPlan: {
  color: '#FFFFFF',
  fontSize: 22,
  fontWeight: '900',
  textAlign: 'center',
  marginBottom: 8,
},

activePremiumPrice: {
  color: '#FBBF24',
  fontSize: 18,
  fontWeight: '800',
  marginBottom: 10,
},

activePremiumUntil: {
  color: '#A1A1AA',
  fontSize: 13,
  fontWeight: '600',
  textAlign: 'center',
  marginBottom: 14,
},
cancelNotice: {
  width: '100%',
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#DC2626',
  backgroundColor: '#2A1111',
  alignItems: 'center',
},

cancelNoticeTitle: {
  color: '#EF4444',
  fontSize: 14,
  fontWeight: '900',
  letterSpacing: 0.7,
  textAlign: 'center',
  marginBottom: 6,
},

cancelNoticeText: {
  color: '#E4E4E7',
  fontSize: 13,
  fontWeight: '600',
  textAlign: 'center',
  lineHeight: 19,
},

activePremiumUnlocked: {
  color: '#22C55E',
  fontSize: 14,
  fontWeight: '800',
},
    manageSubscriptionButton: {
    marginTop: 8,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
  },

  manageSubscriptionText: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});