import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { showAlert } from '../lib/notify';
import { supabase } from '../lib/supabase';

const copy = {
  en: {
    title: 'Choose a new password',
    subtitle: 'Set a new password for your SipMate account.',
    password: 'NEW PASSWORD',
    confirm: 'CONFIRM PASSWORD',
    passwordPlaceholder: 'Enter a new password',
    confirmPlaceholder: 'Enter it again',
    save: 'SAVE NEW PASSWORD',
    saving: 'SAVING...',
    mismatch: 'The passwords do not match.',
    short: 'Use at least 8 characters.',
    invalidLink: 'This reset link is invalid or expired. Request a new one.',
    success: 'Password updated. You can now log in with your new password.',
    failed: 'Could not update your password. Please request a new reset link.',
    login: 'GO TO LOGIN',
  },
  de: {
    title: 'Neues Passwort wählen',
    subtitle: 'Lege ein neues Passwort für dein SipMate-Konto fest.',
    password: 'NEUES PASSWORT',
    confirm: 'PASSWORT BESTÄTIGEN',
    passwordPlaceholder: 'Neues Passwort eingeben',
    confirmPlaceholder: 'Noch einmal eingeben',
    save: 'NEUES PASSWORT SPEICHERN',
    saving: 'WIRD GESPEICHERT...',
    mismatch: 'Die Passwörter stimmen nicht überein.',
    short: 'Verwende mindestens 8 Zeichen.',
    invalidLink: 'Dieser Reset-Link ist ungültig oder abgelaufen. Fordere einen neuen an.',
    success: 'Passwort aktualisiert. Du kannst dich jetzt mit dem neuen Passwort anmelden.',
    failed: 'Das Passwort konnte nicht aktualisiert werden. Fordere bitte einen neuen Reset-Link an.',
    login: 'ZUM LOGIN',
  },
  hr: {
    title: 'Odaberi novu lozinku',
    subtitle: 'Postavi novu lozinku za svoj SipMate račun.',
    password: 'NOVA LOZINKA',
    confirm: 'POTVRDI LOZINKU',
    passwordPlaceholder: 'Unesi novu lozinku',
    confirmPlaceholder: 'Unesi je ponovno',
    save: 'SPREMI NOVU LOZINKU',
    saving: 'SPREMANJE...',
    mismatch: 'Lozinke se ne podudaraju.',
    short: 'Koristi najmanje 8 znakova.',
    invalidLink: 'Ovaj reset link nije važeći ili je istekao. Zatraži novi.',
    success: 'Lozinka je promijenjena. Sada se možeš prijaviti novom lozinkom.',
    failed: 'Lozinku nije moguće promijeniti. Zatraži novi reset link.',
    login: 'IDI NA PRIJAVU',
  },
} as const;

function readTokens(url: string) {
  const hash = url.split('#')[1] ?? '';
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  const params = new URLSearchParams(hash || query);

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    type: params.get('type'),
  };
}

export default function ResetPasswordScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState(false);

  useEffect(() => {
    let active = true;

    async function applyRecoveryUrl(url: string | null) {
      if (!url || !active) return;

      const { accessToken, refreshToken, type } = readTokens(url);
      if (!accessToken || !refreshToken || (type && type !== 'recovery')) {
        setLinkError(true);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!active) return;

      if (error) {
        console.log('PASSWORD RECOVERY SESSION ERROR:', error.message);
        setLinkError(true);
        return;
      }

      setLinkError(false);
      setReady(true);
    }

    Linking.getInitialURL().then(applyRecoveryUrl);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      applyRecoveryUrl(url);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setLinkError(false);
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });

    return () => {
      active = false;
      subscription.remove();
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function savePassword() {
    if (password.length < 8) {
      showAlert(text.short);
      return;
    }

    if (password !== confirmPassword) {
      showAlert(text.mismatch);
      return;
    }

    if (!ready) {
      showAlert(text.invalidLink);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.log('PASSWORD UPDATE ERROR:', error.message);
        showAlert(text.failed);
        return;
      }

      await supabase.auth.signOut();
      showAlert(text.success);
      router.replace('/login');
    } catch (error) {
      console.log('PASSWORD UPDATE CRASH:', error);
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
        <Text style={styles.subtitle}>{linkError ? text.invalidLink : text.subtitle}</Text>

        <Text style={styles.label}>{text.password}</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={text.passwordPlaceholder}
          placeholderTextColor="#52525B"
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
          editable={!linkError}
        />

        <Text style={styles.label}>{text.confirm}</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={text.confirmPlaceholder}
          placeholderTextColor="#52525B"
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
          editable={!linkError}
        />

        <Pressable
          style={[styles.button, (loading || linkError) && styles.disabled]}
          onPress={savePassword}
          disabled={loading || linkError}
        >
          <Text style={styles.buttonText}>{loading ? text.saving : text.save}</Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => router.replace('/login')}>
          <Text style={styles.backText}>{text.login}</Text>
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
  input: { backgroundColor: '#0B0B0E', color: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 15, marginBottom: 18, fontSize: 15, borderWidth: 1, borderColor: '#38383F' },
  button: { backgroundColor: '#DC2626', borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F87171', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4, marginTop: 4 },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  backButton: { borderWidth: 1, borderColor: '#52525B', borderRadius: 18, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  backText: { color: '#D4D4D8', fontWeight: '900', fontSize: 13 },
});
