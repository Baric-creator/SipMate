import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { supabase } from '../lib/supabase';

type Category = 'bug' | 'performance' | 'ui' | 'account' | 'other';

const copy = {
  en: {
    title: 'Report a problem', subtitle: 'Tell us what went wrong. Your report includes only basic app diagnostics — never message content or precise location.',
    category: 'Category', details: 'What happened?', detailsHint: 'Describe what you did, what you expected, and what happened instead.', screen: 'Where did it happen? (optional)', screenHint: 'e.g. Chat, Nearby, Profile',
    send: 'Send report', sending: 'Sending…', sent: 'Thanks — your report was sent.', short: 'Please enter at least 10 characters.', login: 'Please sign in again and retry.', failed: 'Could not send the report. Please try again.', back: 'BACK',
    categories: { bug: 'Bug', performance: 'Performance', ui: 'Layout / text', account: 'Account', other: 'Other' },
  },
  de: {
    title: 'Problem melden', subtitle: 'Sag uns, was nicht funktioniert hat. Der Bericht enthält nur grundlegende App-Diagnosedaten — niemals Nachrichteninhalte oder einen genauen Standort.',
    category: 'Kategorie', details: 'Was ist passiert?', detailsHint: 'Beschreibe, was du gemacht hast, was du erwartet hast und was stattdessen passiert ist.', screen: 'Wo ist es passiert? (optional)', screenHint: 'z. B. Chat, Nearby, Profil',
    send: 'Bericht senden', sending: 'Wird gesendet…', sent: 'Danke — dein Bericht wurde gesendet.', short: 'Bitte mindestens 10 Zeichen eingeben.', login: 'Bitte erneut anmelden und noch einmal versuchen.', failed: 'Der Bericht konnte nicht gesendet werden. Bitte erneut versuchen.', back: 'ZURÜCK',
    categories: { bug: 'Fehler', performance: 'Performance', ui: 'Layout / Text', account: 'Konto', other: 'Sonstiges' },
  },
  hr: {
    title: 'Prijavi problem', subtitle: 'Opiši što nije radilo. Izvještaj uključuje samo osnovne podatke o aplikaciji — nikad sadržaj poruka ni preciznu lokaciju.',
    category: 'Kategorija', details: 'Što se dogodilo?', detailsHint: 'Opiši što si radio, što si očekivao i što se dogodilo umjesto toga.', screen: 'Gdje se dogodilo? (opcionalno)', screenHint: 'npr. Chat, Nearby, Profil',
    send: 'Pošalji prijavu', sending: 'Šaljem…', sent: 'Hvala — prijava je poslana.', short: 'Upiši najmanje 10 znakova.', login: 'Prijavi se ponovno i pokušaj opet.', failed: 'Prijavu nije moguće poslati. Pokušaj ponovno.', back: 'NATRAG',
    categories: { bug: 'Greška', performance: 'Performanse', ui: 'Izgled / tekst', account: 'Račun', other: 'Ostalo' },
  },
} as const;

export default function ReportProblemScreen() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] as keyof typeof copy;
  const t = copy[lang] ?? copy.en;
  const categories = useMemo(() => Object.keys(t.categories) as Category[], [t]);
  const [category, setCategory] = useState<Category>('bug');
  const [details, setDetails] = useState('');
  const [screen, setScreen] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [ok, setOk] = useState(false);

  async function submit() {
    const clean = details.trim();
    if (clean.length < 10) { setOk(false); setMessage(t.short); return; }
    setBusy(true); setMessage(''); setOk(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setMessage(t.login); return; }
      const { error } = await supabase.from('app_feedback').insert({
        user_id: session.user.id,
        category,
        details: clean.slice(0, 2000),
        screen: screen.trim().slice(0, 100) || null,
        app_version: String(Constants.expoConfig?.version ?? 'unknown').slice(0, 30),
        build_number: String(Constants.nativeBuildVersion ?? 'unknown').slice(0, 30),
        platform: Platform.OS.slice(0, 30),
      });
      if (error) throw error;
      setDetails(''); setScreen(''); setOk(true); setMessage(t.sent);
    } catch {
      setOk(false); setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return <View style={s.screen}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Text style={s.logo}>SipMate 🍻</Text><Text style={s.title}>{t.title}</Text><Text style={s.subtitle}>{t.subtitle}</Text>
    <Text style={s.sectionLabel}>{t.category}</Text>
    <View style={s.categories}>{categories.map(key => <Pressable key={key} onPress={() => setCategory(key)} style={[s.chip, category === key && s.chipActive]}><Text style={[s.chipText, category === key && s.chipTextActive]}>{t.categories[key]}</Text></Pressable>)}</View>
    <Text style={s.label}>{t.details}</Text>
    <TextInput value={details} onChangeText={setDetails} placeholder={t.detailsHint} placeholderTextColor="#71717A" multiline maxLength={2000} style={[s.input, s.details]} textAlignVertical="top" />
    <Text style={s.counter}>{details.length}/2000</Text>
    <Text style={s.label}>{t.screen}</Text>
    <TextInput value={screen} onChangeText={setScreen} placeholder={t.screenHint} placeholderTextColor="#71717A" maxLength={100} style={s.input} />
    <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [s.send, (pressed || busy) && s.sendPressed]}>{busy ? <ActivityIndicator color="#FFF" /> : <Text style={s.sendText}>{t.send}</Text>}</Pressable>
    {!!message && <Text style={[s.message, ok ? s.ok : s.error]}>{message}</Text>}
    <Pressable style={s.back} onPress={() => router.back()}><Text style={s.backText}>← {t.back}</Text></Pressable>
  </ScrollView></View>;
}

const s = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#09090B'},content:{width:'100%',maxWidth:720,alignSelf:'center',padding:24,paddingTop:40,paddingBottom:80},
  logo:{color:'#EF4444',fontSize:17,fontWeight:'900'},title:{color:'#FFF',fontSize:29,fontWeight:'900',marginTop:22},subtitle:{color:'#A1A1AA',fontSize:14,lineHeight:21,marginTop:8,marginBottom:24},
  sectionLabel:{color:'#D4D4D8',fontSize:13,fontWeight:'900',marginBottom:10},categories:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:22},chip:{borderWidth:1,borderColor:'#3F3F46',backgroundColor:'#141417',borderRadius:999,paddingVertical:9,paddingHorizontal:13},chipActive:{borderColor:'#EF4444',backgroundColor:'#2A1111'},chipText:{color:'#A1A1AA',fontSize:12,fontWeight:'800'},chipTextActive:{color:'#FFF'},
  label:{color:'#D4D4D8',fontSize:13,fontWeight:'900',marginBottom:8,marginTop:4},input:{minHeight:52,borderWidth:1,borderColor:'#3F3F46',borderRadius:15,backgroundColor:'#141417',color:'#FFF',paddingHorizontal:14,paddingVertical:13,fontSize:14},details:{minHeight:150},counter:{color:'#71717A',fontSize:11,textAlign:'right',marginTop:6,marginBottom:14},
  send:{minHeight:52,borderRadius:15,backgroundColor:'#DC2626',alignItems:'center',justifyContent:'center',marginTop:22},sendPressed:{opacity:.72},sendText:{color:'#FFF',fontWeight:'900',fontSize:14},message:{fontSize:13,fontWeight:'800',lineHeight:19,marginTop:14,textAlign:'center'},ok:{color:'#4ADE80'},error:{color:'#F87171'},back:{marginTop:18,paddingVertical:14,alignItems:'center'},backText:{color:'#A1A1AA',fontWeight:'900'}
});
