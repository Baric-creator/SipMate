import { router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>SipMate 🍻</Text>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: September 2026</Text>

        <Section title="Your privacy matters">
          SipMate uses account, profile, location, photo, messaging and subscription information to provide nearby discovery, Cheers, chat, safety and Premium features.
        </Section>
        <Section title="Location">
          Location is used to calculate nearby people and update your city. SipMate only requests foreground location permission for these features.
        </Section>
        <Section title="Photos and profile information">
          Profile details and photos you choose to publish can be visible to other SipMate users. Premium users can add additional profile photos.
        </Section>
        <Section title="Messages, Cheers and safety">
          SipMate processes Cheers, conversations, messages, blocks and reports so social and safety features work correctly.
        </Section>
        <Section title="Payments">
          Subscription information may be processed by the payment provider used for the platform. SipMate does not need to store your full payment-card details.
        </Section>
        <Section title="Account deletion">
          You can start permanent account deletion from your SipMate profile. Associated account data must be deleted except information that may need to be retained for legitimate legal, security, fraud-prevention or regulatory reasons.
        </Section>
        <Section title="Age requirement">
          SipMate is intended for adults aged 18 and over.
        </Section>
        <Section title="Full policy">
          This in-app summary is provided for easy access. The public web version of the Privacy Policy will be the authoritative policy used for the Google Play listing before release.
        </Section>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 60 },
  logo: { color: '#EF4444', fontSize: 17, fontWeight: '900', marginBottom: 20 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  updated: { color: '#71717A', fontSize: 12, marginTop: 6, marginBottom: 22 },
  card: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderRadius: 20, padding: 18, marginBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginBottom: 8 },
  body: { color: '#A1A1AA', fontSize: 13, lineHeight: 20 },
  backButton: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 14, marginTop: 12 },
  backText: { color: '#EF4444', fontSize: 13, fontWeight: '900' },
});
