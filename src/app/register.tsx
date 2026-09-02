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

import { supabase } from '../lib/supabase';

const copy = {
  en: {
    fillAll: 'Please fill in all fields.',
    welcome: 'Welcome to SipMate 🍻 Your account and profile have been created!',
    failed: 'Registration failed.',
    tagline: 'Find someone. Grab a drink. CHEERS!',
    title: 'Create account',
    subtitle: 'Join SipMate and find people nearby who are ready for a drink.',
    name: 'NAME',
    namePlaceholder: 'Your name',
    age: 'AGE',
    agePlaceholder: 'Your age',
    email: 'EMAIL',
    password: 'PASSWORD',
    passwordPlaceholder: 'Create a password',
    creating: 'CREATING ACCOUNT...',
    create: 'CREATE ACCOUNT',
    note: 'By creating an account, you agree to the SipMate terms and community rules.',
    member: 'ALREADY A MEMBER?',
    login: 'LOG IN',
    footer: 'Ready for a drink? Your next Cheers could be nearby.',
  },
  de: {
    fillAll: 'Bitte fülle alle Felder aus.',
    welcome: 'Willkommen bei SipMate 🍻 Dein Konto und Profil wurden erstellt!',
    failed: 'Registrierung fehlgeschlagen.',
    tagline: 'Finde jemanden. Trink etwas. CHEERS!',
    title: 'Konto erstellen',
    subtitle: 'Komm zu SipMate und finde Leute in deiner Nähe, die bereit für einen Drink sind.',
    name: 'NAME',
    namePlaceholder: 'Dein Name',
    age: 'ALTER',
    agePlaceholder: 'Dein Alter',
    email: 'E-MAIL',
    password: 'PASSWORT',
    passwordPlaceholder: 'Passwort erstellen',
    creating: 'KONTO WIRD ERSTELLT...',
    create: 'KONTO ERSTELLEN',
    note: 'Mit der Kontoerstellung stimmst du den SipMate-Bedingungen und Community-Regeln zu.',
    member: 'SCHON DABEI?',
    login: 'ANMELDEN',
    footer: 'Bereit für einen Drink? Dein nächstes Cheers könnte ganz in der Nähe sein.',
  },
  hr: {
    fillAll: 'Molimo ispuni sva polja.',
    welcome: 'Dobrodošao u SipMate 🍻 Tvoj račun i profil su kreirani!',
    failed: 'Registracija nije uspjela.',
    tagline: 'Pronađi nekoga. Popij nešto. CHEERS!',
    title: 'Kreiraj račun',
    subtitle: 'Pridruži se SipMateu i pronađi ljude u blizini koji su spremni za piće.',
    name: 'IME',
    namePlaceholder: 'Tvoje ime',
    age: 'DOB',
    agePlaceholder: 'Tvoja dob',
    email: 'E-MAIL',
    password: 'LOZINKA',
    passwordPlaceholder: 'Kreiraj lozinku',
    creating: 'KREIRANJE RAČUNA...',
    create: 'KREIRAJ RAČUN',
    note: 'Kreiranjem računa prihvaćaš SipMate uvjete i pravila zajednice.',
    member: 'VEĆ IMAŠ RAČUN?',
    login: 'PRIJAVI SE',
    footer: 'Spreman za piće? Tvoj sljedeći Cheers možda je baš u blizini.',
  },
} as const;

export default function RegisterScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !age.trim() || !email.trim() || !password.trim()) {
      if (typeof window !== 'undefined') window.alert(text.fillAll);
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            age: Number(age),
          },
        },
      });

      if (error) {
        if (typeof window !== 'undefined') window.alert(error.message);
        return;
      }

      if (typeof window !== 'undefined') window.alert(text.welcome);
      router.replace('/login');
    } catch (error) {
      console.log('REGISTER CATCH ERROR:', error);
      if (typeof window !== 'undefined') window.alert(text.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.logo}>SipMate 🍻</Text>
          <Text style={styles.tagline}>{text.tagline}</Text>

          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>🍻</Text>
          </View>

          <Text style={styles.title}>{text.title}</Text>
          <Text style={styles.subtitle}>{text.subtitle}</Text>

          <Text style={styles.label}>{text.name}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={text.namePlaceholder}
            placeholderTextColor="#52525B"
            autoCapitalize="words"
            style={styles.input}
          />

          <Text style={styles.label}>{text.age}</Text>
          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder={text.agePlaceholder}
            placeholderTextColor="#52525B"
            keyboardType="numeric"
            style={styles.input}
          />

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

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? text.creating : `🍻 ${text.create}`}
            </Text>
          </Pressable>

          <Text style={styles.note}>{text.note}</Text>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>{text.member}</Text>
            <View style={styles.divider} />
          </View>

          <Pressable style={styles.loginButton} onPress={() => router.push('/login')}>
            <Text style={styles.loginButtonText}>{text.login}</Text>
          </Pressable>

          <Text style={styles.footer}>{text.footer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  card: {
    width: '100%',
    maxWidth: 470,
    backgroundColor: '#18181B',
    borderRadius: 30,
    paddingHorizontal: 26,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  tagline: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  heroIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#202023',
    borderWidth: 1,
    borderColor: '#3F1D1D',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 30,
  },
  heroEmoji: { fontSize: 38 },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 22,
  },
  subtitle: {
    color: '#A1A1AA',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  label: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#09090B',
    color: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 18,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  button: {
    backgroundColor: '#DC2626',
    paddingVertical: 17,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  note: {
    color: '#52525B',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 18,
  },
  divider: { flex: 1, height: 1, backgroundColor: '#27272A' },
  dividerText: {
    color: '#52525B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginHorizontal: 12,
  },
  loginButton: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footer: {
    color: '#52525B',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 24,
  },
});