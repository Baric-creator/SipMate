import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { showAlert } from '../lib/notify';
import { supabase } from '../lib/supabase';

const copy = {
  en: {
    tagline: 'Find someone. Grab a drink. CHEERS!',
    title: 'Welcome back',
    subtitle: "Log in and see who's ready for a drink nearby.",
    email: 'EMAIL',
    password: 'PASSWORD',
    passwordPlaceholder: 'Enter your password',
    forgotPassword: 'Forgot password?',
    loggingIn: 'LOGGING IN...',
    login: 'LOG IN',
    newHere: 'NEW HERE?',
    createAccount: 'CREATE ACCOUNT',
    footer: 'Ready for a drink? SipMate helps you find people nearby who are too.',
    unexpectedError: 'Something went wrong while logging in. Please try again.',
  },
  de: {
    tagline: 'Finde jemanden. Trink etwas. CHEERS!',
    title: 'Willkommen zurück',
    subtitle: 'Melde dich an und sieh, wer in deiner Nähe bereit für einen Drink ist.',
    email: 'E-MAIL',
    password: 'PASSWORT',
    passwordPlaceholder: 'Passwort eingeben',
    forgotPassword: 'Passwort vergessen?',
    loggingIn: 'ANMELDUNG...',
    login: 'ANMELDEN',
    newHere: 'NEU HIER?',
    createAccount: 'KONTO ERSTELLEN',
    footer: 'Bereit für einen Drink? SipMate hilft dir, Leute in deiner Nähe zu finden, die es auch sind.',
    unexpectedError: 'Beim Anmelden ist etwas schiefgelaufen. Bitte versuche es erneut.',
  },
  hr: {
    tagline: 'Pronađi nekoga. Popij nešto. CHEERS!',
    title: 'Dobrodošao natrag',
    subtitle: 'Prijavi se i vidi tko je u blizini spreman za piće.',
    email: 'E-MAIL',
    password: 'LOZINKA',
    passwordPlaceholder: 'Unesi lozinku',
    forgotPassword: 'Zaboravljena lozinka?',
    loggingIn: 'PRIJAVA...',
    login: 'PRIJAVI SE',
    newHere: 'NOVI OVDJE?',
    createAccount: 'KREIRAJ RAČUN',
    footer: 'Spreman za piće? SipMate ti pomaže pronaći ljude u blizini koji su također spremni.',
    unexpectedError: 'Dogodila se greška pri prijavi. Pokušaj ponovno.',
  },
} as const;

export default function LoginScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.log('LOGIN ERROR:', error.message);
        showAlert(error.message);
        return;
      }

      if (data.session) router.replace('/');
    } catch (error) {
      console.log('LOGIN CRASH:', error);
      showAlert(text.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbTop]} />
      <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbBottom]} />
      <View pointerEvents="none" style={styles.scanAccent} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.logo}>SipMate 🍻</Text>
          <Text style={styles.tagline}>{text.tagline}</Text>

          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>🍻</Text>
          </View>

          <Text style={styles.title}>{text.title}</Text>
          <Text style={styles.subtitle}>{text.subtitle}</Text>

          <Text style={styles.label}>{text.email}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#52525B"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.label}>{text.password}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={text.passwordPlaceholder}
            placeholderTextColor="#52525B"
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
          />

          <Pressable style={styles.forgotButton} onPress={() => router.push('/forgot-password')}>
            <Text style={styles.forgotText}>{text.forgotPassword}</Text>
          </Pressable>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.buttonText}>{text.loggingIn}</Text>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonEmoji}>🍻</Text>
                <Text style={styles.buttonText}>{text.login}</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>{text.newHere}</Text>
            <View style={styles.divider} />
          </View>

          <Pressable style={styles.registerButton} onPress={() => router.push('/register')}>
            <Text style={styles.registerButtonText}>{text.createAccount}</Text>
          </Pressable>

          <Text style={styles.footer}>{text.footer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08090B' },
  ambientOrb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(220,38,38,0.10)', shadowColor: '#EF4444', shadowOpacity: 0.18, shadowRadius: 48, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  ambientOrbTop: { width: 260, height: 260, top: -100, right: -125 },
  ambientOrbBottom: { width: 220, height: 220, bottom: -110, left: -125, backgroundColor: 'rgba(127,29,29,0.07)' },
  scanAccent: { position: 'absolute', top: 112, left: 24, width: 58, height: 1, backgroundColor: 'rgba(248,113,113,0.34)' },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 60 },
  card: { width: '100%', maxWidth: 470, backgroundColor: '#111114', borderRadius: 28, paddingHorizontal: 24, paddingVertical: 30, borderWidth: 1, borderColor: '#342326', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.08, shadowRadius: 28, elevation: 4 },
  logo: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', textAlign: 'center', letterSpacing: -0.6 },
  tagline: { color: '#71717A', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1A1416', borderWidth: 1, borderColor: '#5A2A2F', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 24, shadowColor: '#EF4444', shadowOpacity: 0.18, shadowRadius: 16, elevation: 3 },
  heroEmoji: { fontSize: 32 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 22 },
  subtitle: { color: '#A1A1AA', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 28 },
  label: { color: '#71717A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 8 },
  input: { backgroundColor: '#0B0B0E', color: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 15, marginBottom: 18, fontSize: 15, borderWidth: 1, borderColor: '#38383F', shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 1 },
  forgotButton: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 18, paddingVertical: 4 },
  forgotText: { color: '#EF4444', fontSize: 12, fontWeight: '800' },
  button: { backgroundColor: '#DC2626', paddingVertical: 17, borderRadius: 18, alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: '#F87171', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4 },
  buttonDisabled: { opacity: 0.5 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonEmoji: { fontSize: 17 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28, marginBottom: 18 },
  divider: { flex: 1, height: 1, backgroundColor: '#27272A' },
  dividerText: { color: '#52525B', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginHorizontal: 12 },
  registerButton: { borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#151113', borderRadius: 20, paddingVertical: 15, alignItems: 'center' },
  registerButtonText: { color: '#EF4444', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  footer: { color: '#52525B', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 24 },
});
