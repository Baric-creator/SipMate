import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

async function handleLogin() {
  try {
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      console.log('LOGIN ERROR:', error.message);

      if (typeof window !== 'undefined') {
        window.alert(error.message);
      }

      return;
    }

    console.log('LOGIN SUCCESS');
    console.log('LOGGED USER:', data.user?.email);
    console.log('SESSION EXISTS:', !!data.session);

    if (data.session) {
      router.replace('/');
    }
  } catch (error) {
    console.log('LOGIN CRASH:', error);
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
            Welcome back
          </Text>

          <Text style={styles.subtitle}>
            Log in and see who's ready for a drink nearby.
          </Text>

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
            placeholder="Enter your password"
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
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading
                ? 'LOGGING IN...'
                : '🍻 LOG IN'}
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>
              NEW HERE?
            </Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            style={styles.registerButton}
            onPress={() =>
              router.push('/register')
            }
          >
            <Text style={styles.registerButtonText}>
              CREATE ACCOUNT
            </Text>
          </Pressable>

          <Text style={styles.footer}>
            Ready for a drink? SipMate helps you find
            people nearby who are too.
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
    letterSpacing: 1.2,
    marginHorizontal: 12,
  },

  registerButton: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },

  registerButtonText: {
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