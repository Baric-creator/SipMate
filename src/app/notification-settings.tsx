import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { showAlert } from '../lib/notify';
import { supabase } from '../lib/supabase';

type Prefs = {
  notify_messages: boolean;
  notify_cheers: boolean;
  notify_photos: boolean;
  notify_marketing: boolean;
};

const copy = {
  en: {
    title: 'Notifications',
    subtitle: 'Choose which SipMate notifications you want to receive.',
    messages: 'Messages',
    messagesSub: 'New chat messages',
    cheers: 'Cheers',
    cheersSub: 'New and mutual Cheers',
    photos: 'Verified photos',
    photosSub: 'Photo messages in Premium chats',
    marketing: 'SipMate news',
    marketingSub: 'Product and launch updates',
    back: 'BACK',
    failed: 'Could not save notification settings.',
  },
  de: {
    title: 'Benachrichtigungen',
    subtitle: 'Wähle, welche SipMate-Benachrichtigungen du erhalten möchtest.',
    messages: 'Nachrichten',
    messagesSub: 'Neue Chat-Nachrichten',
    cheers: 'Cheers',
    cheersSub: 'Neue und gegenseitige Cheers',
    photos: 'Verifizierte Fotos',
    photosSub: 'Foto-Nachrichten in Premium-Chats',
    marketing: 'SipMate News',
    marketingSub: 'Produkt- und Launch-Updates',
    back: 'ZURÜCK',
    failed: 'Benachrichtigungseinstellungen konnten nicht gespeichert werden.',
  },
  hr: {
    title: 'Obavijesti',
    subtitle: 'Odaberi koje SipMate obavijesti želiš primati.',
    messages: 'Poruke',
    messagesSub: 'Nove chat poruke',
    cheers: 'Cheers',
    cheersSub: 'Novi i uzajamni Cheers',
    photos: 'Verificirane fotografije',
    photosSub: 'Foto poruke u Premium chatovima',
    marketing: 'SipMate novosti',
    marketingSub: 'Novosti o proizvodu i launchu',
    back: 'NATRAG',
    failed: 'Nije moguće spremiti postavke obavijesti.',
  },
} as const;

const defaults: Prefs = {
  notify_messages: true,
  notify_cheers: true,
  notify_photos: true,
  notify_marketing: false,
};

export default function NotificationSettingsScreen() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[lang] ?? copy.en;
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('notify_messages, notify_cheers, notify_photos, notify_marketing')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!active) return;
      if (!error && data) setPrefs({ ...defaults, ...data });
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  async function setPreference(key: keyof Prefs, value: boolean) {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setPrefs(previous);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ [key]: value })
      .eq('id', session.user.id);

    if (error) {
      setPrefs(previous);
      showAlert(text.failed);
    }
  }

  const rows: Array<{ key: keyof Prefs; icon: string; title: string; subtitle: string }> = [
    { key: 'notify_messages', icon: '💬', title: text.messages, subtitle: text.messagesSub },
    { key: 'notify_cheers', icon: '🍻', title: text.cheers, subtitle: text.cheersSub },
    { key: 'notify_photos', icon: '📷', title: text.photos, subtitle: text.photosSub },
    { key: 'notify_marketing', icon: '📣', title: text.marketing, subtitle: text.marketingSub },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🔔 {text.title}</Text>
        <Text style={styles.subtitle}>{text.subtitle}</Text>

        <View style={styles.card}>
          {rows.map((row, index) => (
            <View key={row.key} style={[styles.row, index === rows.length - 1 && styles.rowLast]}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{row.icon} {row.title}</Text>
                <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
              </View>
              <Switch
                value={prefs[row.key]}
                disabled={loading}
                onValueChange={(value) => void setPreference(row.key, value)}
                trackColor={{ false: '#3F3F46', true: '#7F1D1D' }}
                thumbColor={prefs[row.key] ? '#EF4444' : '#D4D4D8'}
              />
            </View>
          ))}
        </View>

        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← {text.back}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 24, paddingTop: 40, paddingBottom: 80 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#A1A1AA', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 24 },
  card: { backgroundColor: '#141417', borderWidth: 1, borderColor: '#27272A', borderRadius: 22, overflow: 'hidden' },
  row: { minHeight: 82, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottomWidth: 1, borderBottomColor: '#27272A' },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1 },
  rowTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  rowSubtitle: { color: '#71717A', fontSize: 12, marginTop: 4 },
  back: { marginTop: 18, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: '#3F3F46', borderRadius: 16 },
  backText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});
