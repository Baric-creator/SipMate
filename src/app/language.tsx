import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
    changeLanguage,
} from '../lib/i18n';

export default function LanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const currentLanguage =
    i18n.language?.split('-')[0] ?? 'en';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
        🌍 {t('languageScreen.title')}
</Text>

        <Text style={styles.subtitle}>
          {t('languageScreen.subtitle')}
        </Text>

        <Pressable
          style={[
            styles.languageCard,
            currentLanguage === 'en' &&
              styles.languageCardActive,
          ]}
          onPress={() =>
            changeLanguage('en')
          }
        >
          <View>
            <Text style={styles.languageName}>
              🇬🇧 English
            </Text>

            <Text style={styles.languageCode}>
              {t('languageScreen.english')}
            </Text>
          </View>

          {currentLanguage === 'en' && (
            <Text style={styles.check}>
              ✓
            </Text>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.languageCard,
            currentLanguage === 'de' &&
              styles.languageCardActive,
          ]}
          onPress={() =>
            changeLanguage('de')
          }
        >
          <View>
            <Text style={styles.languageName}>
              🇩🇪 Deutsch
            </Text>

            <Text style={styles.languageCode}>
              {t('languageScreen.german')}
            </Text>
          </View>

          {currentLanguage === 'de' && (
            <Text style={styles.check}>
              ✓
            </Text>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.languageCard,
            currentLanguage === 'hr' &&
              styles.languageCardActive,
          ]}
          onPress={() =>
            changeLanguage('hr')
          }
        >
          <View>
            <Text style={styles.languageName}>
              🇭🇷 Hrvatski
            </Text>

            <Text style={styles.languageCode}>
              {t('languageScreen.croatian')}
            </Text>
          </View>

          {currentLanguage === 'hr' && (
            <Text style={styles.check}>
              ✓
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            ← {t('languageScreen.back')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    alignItems: 'center',
  },

  content: {
    width: '100%',
    maxWidth: 760,
    paddingHorizontal: 24,
    paddingTop: 48,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },

  subtitle: {
    color: '#A1A1AA',
    fontSize: 14,
    marginBottom: 28,
  },

  languageCard: {
    width: '100%',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  languageCardActive: {
    borderColor: '#DC2626',
  },

  languageName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },

  languageCode: {
    color: '#71717A',
    fontSize: 13,
  },

  check: {
    color: '#EF4444',
    fontSize: 22,
    fontWeight: '900',
  },

  backButton: {
    width: '100%',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});