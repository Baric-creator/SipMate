import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '../lib/supabase';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

async function handleRegister() {
  console.log('HANDLE REGISTER START');

  if (
    !name.trim() ||
    !age.trim() ||
    !email.trim() ||
    !password.trim()
  ) {
    if (typeof window !== 'undefined') {
      window.alert('Please fill in all fields.');
    }
    return;
  }

  try {
    setLoading(true);

    console.log('CALLING SUPABASE...');

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          age: Number(age),
        },
      },
    });

    console.log('SUPABASE FINISHED');
    console.log('USER CREATED:', !!data.user);
    console.log('ERROR:', error?.message ?? 'none');

    if (error) {
      if (typeof window !== 'undefined') {
        window.alert(error.message);
      }
      return;
    }

    console.log('ACCOUNT CREATED - PROFILE CREATED BY DATABASE TRIGGER');

    if (typeof window !== 'undefined') {
      window.alert(
        'Welcome to SipMate 🍻 Your account and profile have been created!'
      );
    }

    router.replace('/login');
  } catch (error) {
    console.log('REGISTER CATCH ERROR:', error);

    if (typeof window !== 'undefined') {
      window.alert('Registration failed.');
    }
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

          <Text style={styles.tagline}>
            Find someone. Grab a drink. CHEERS!
          </Text>

          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>🍻</Text>
          </View>

          <Text style={styles.title}>
            Create account
          </Text>

          <Text style={styles.subtitle}>
            Join SipMate and find people nearby who are ready for a drink.
          </Text>

          <Text style={styles.label}>
            NAME
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#52525B"
            autoCapitalize="words"
            style={styles.input}
          />

          <Text style={styles.label}>
            AGE
          </Text>

          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="Your age"
            placeholderTextColor="#52525B"
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.label}>
            EMAIL
          </Text>

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

          <Text style={styles.label}>
            PASSWORD
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            placeholderTextColor="#52525B"
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
          />

          <Pressable
            style={[
              styles.button,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading
                ? 'CREATING ACCOUNT...'
                : '🍻 CREATE ACCOUNT'}
            </Text>
          </Pressable>

          <Text style={styles.note}>
            By creating an account, you agree to the SipMate terms
            and community rules.
          </Text>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />

            <Text style={styles.dividerText}>
              ALREADY A MEMBER?
            </Text>

            <View style={styles.divider} />
          </View>

          <Pressable
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>
              LOG IN
            </Text>
          </Pressable>

          <Text style={styles.footer}>
            Ready for a drink? Your next Cheers could be nearby.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },

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

  heroEmoji: {
    fontSize: 38,
  },

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

    shadowColor: '#DC2626',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

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

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272A',
  },

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