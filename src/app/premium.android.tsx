import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const copy = {
  en: { title: 'SipMate Premium', body: 'Premium activation on Android is being prepared for the Google Play release. It is temporarily unavailable in this Android build.', note: 'Existing Premium access remains available.', back: '← BACK' },
  de: { title: 'SipMate Premium', body: 'Die Premium-Aktivierung auf Android wird für die Google-Play-Veröffentlichung vorbereitet. Sie ist in diesem Android-Build vorübergehend nicht verfügbar.', note: 'Bestehender Premium-Zugang bleibt verfügbar.', back: '← ZURÜCK' },
  hr: { title: 'SipMate Premium', body: 'Premium aktivacija na Androidu priprema se za Google Play izdanje. Privremeno je nedostupna u ovoj Android verziji.', note: 'Postojeći Premium pristup ostaje dostupan.', back: '← NATRAG' },
} as const;

export default function PremiumAndroidScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>SipMate 🍻</Text>
        <Text style={styles.title}>{text.title}</Text>
        <View style={styles.card}>
          <Text style={styles.icon}>💎</Text>
          <Text style={styles.body}>{text.body}</Text>
          <Text style={styles.note}>{text.note}</Text>
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
  content: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', justifyContent: 'center', padding: 24 },
  logo: { color: '#EF4444', fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 24, padding: 24, alignItems: 'center' },
  icon: { fontSize: 44, marginBottom: 16 },
  body: { color: '#E4E4E7', fontSize: 15, lineHeight: 23, textAlign: 'center', fontWeight: '700' },
  note: { color: '#A1A1AA', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 14 },
  backButton: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 14, marginTop: 22 },
  backText: { color: '#EF4444', fontSize: 13, fontWeight: '900' },
});
