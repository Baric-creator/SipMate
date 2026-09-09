import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { showAlert } from '../lib/notify';
import { supabase } from '../lib/supabase';

const copy = {
  en: {
    title: 'Reset password',
    subtitle: 'Enter your email and we’ll send you a secure reset link.',
    email: 'EMAIL',
    send: 'SEND RESET LINK',
    sending: 'SENDING...',
    sent: 'Check your email for the SipMate password reset link.',
    invalid: 'Please enter your email address.',
    failed: 'Could not send the reset email. Please try again.',
    back: 'BACK TO LOGIN',
  },
  de: {
    title: 'Passwort zurücksetzen',
    subtitle: 'Gib deine E-Mail ein und wir senden dir einen sicheren Reset-Link.',
    email: 'E-MAIL',
    send: 'RESET-LINK SENDEN',
    sending: 'WIRD GESENDET...',
    sent: 'Prüfe deine E-Mails auf den SipMate-Link zum Zurücksetzen des Passworts.',
    invalid: 'Bitte gib deine E-Mail-Adresse ein.',
    failed: 'Die Reset-E-Mail konnte nicht gesendet werden. Bitte versuche es erneut.',
    back: 'ZURÜCK ZUM LOGIN',
  },
  hr: {
    title: 'Resetiraj lozinku',
    subtitle: 'Unesi svoj e-mail i poslat ćemo ti siguran link za promjenu lozinke.',
    email: 'E-MAIL',
    send: 'POŠALJI RESET LINK',
    sending: 'SLANJE...',
    sent: 'Provjeri e-mail. Poslali smo ti SipMate link za promjenu lozinke.',
    invalid: 'Unesi svoju e-mail adresu.',
    failed: 'Reset e-mail nije moguće poslati. Pokušaj ponovno.',
    back: 'NATRAG NA PRIJAVU',
  },
} as const;

export default function ForgotPasswordScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendReset() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      showAlert(text.invalid);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: 'sipmate://reset-password',
      });

      if (error) {
        console.log('PASSWORD RESET EMAIL ERROR:', error.message);
        showAlert(text.failed);
        return;
      }

      showAlert(text.sent);
    } catch (error) {
      console.log('PASSWORD RESET EMAIL CRASH:', error);
      showAlert(text.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbTop]} />
      <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbBottom]} />
      <View style={styles.card}>
        <Text style={styles.logo}>SipMate 🍻</Text>
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

        <Pressable style={[styles.button, loading && styles.disabled]} onPress={sendReset} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? text.sending : text.send}</Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => router.replace('/login')} disabled={loading}>
          <Text style={styles.backText}>{text.back}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08090B', justifyContent: 'center', alignItems: 'center', padding: 20 },
  ambientOrb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(220,38,38,0.10)', shadowColor: '#EF4444', shadowOpacity: 0.18, shadowRadius: 46, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  ambientOrbTop: { width: 240, height: 240, top: -90, right: -120 },
  ambientOrbBottom: { width: 210, height: 210, bottom: -100, left: -120, backgroundColor: 'rgba(127,29,29,0.07)' },
  card: { width: '100%', maxWidth: 470, backgroundColor: '#111114', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#342326', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.08, shadowRadius: 28, elevation: 4 },
  logo: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 24 },
  subtitle: { color: '#A1A1AA', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 28 },
  label: { color: '#71717A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 8 },
  input: { backgroundColor: '#0B0B0E', color: '#FFFFFF', borderRadius: 17, paddingHorizontal: 16, paddingVertical: 15, fontSize: 15, borderWidth: 1, borderColor: '#27272A' },
  button: { backgroundColor: '#DC2626', borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F87171', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4, marginTop: 20 },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  backButton: { borderWidth: 1, borderColor: '#52525B', borderRadius: 20, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  backText: { color: '#D4D4D8', fontWeight: '900', fontSize: 13 },
});
