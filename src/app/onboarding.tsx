import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ONBOARDING_KEY = 'sipmate:onboarding:v1';

const copy = {
  en: {
    skip: 'Skip',
    next: 'Next',
    start: 'Start SipMate',
    slides: [
      {
        emoji: '📍',
        eyebrow: 'DISCOVER',
        title: 'See who is up for a drink nearby.',
        body: 'Go active when you feel social and discover people around you who are ready for a real-life hangout.',
      },
      {
        emoji: '🍻',
        eyebrow: 'CHEERS',
        title: 'One tap. No dating pressure.',
        body: 'Send a Cheers. If they send one back, it becomes a mutual CHEERS! and chat unlocks.',
      },
      {
        emoji: '👻',
        eyebrow: 'YOU CONTROL IT',
        title: 'Be visible only when you want to.',
        body: 'Switch Active on when you are ready to meet people, then go inactive whenever you want your privacy back.',
      },
    ],
  },
  de: {
    skip: 'Überspringen',
    next: 'Weiter',
    start: 'SipMate starten',
    slides: [
      {
        emoji: '📍',
        eyebrow: 'ENTDECKEN',
        title: 'Sieh, wer in deiner Nähe Lust auf einen Drink hat.',
        body: 'Aktiviere dich, wenn du Gesellschaft willst, und entdecke Leute in deiner Nähe für ein echtes Treffen.',
      },
      {
        emoji: '🍻',
        eyebrow: 'CHEERS',
        title: 'Ein Tap. Kein Dating-Druck.',
        body: 'Sende einen Cheers. Kommt einer zurück, wird daraus ein gemeinsames CHEERS! und der Chat wird freigeschaltet.',
      },
      {
        emoji: '👻',
        eyebrow: 'DU ENTSCHEIDEST',
        title: 'Sei nur sichtbar, wenn du es willst.',
        body: 'Schalte Aktiv ein, wenn du Leute treffen willst, und jederzeit wieder aus, wenn du deine Ruhe möchtest.',
      },
    ],
  },
  hr: {
    skip: 'Preskoči',
    next: 'Dalje',
    start: 'Pokreni SipMate',
    slides: [
      {
        emoji: '📍',
        eyebrow: 'OTKRIJ',
        title: 'Vidi tko je u blizini za piće.',
        body: 'Uključi Active kad si za društvo i pronađi ljude oko sebe koji su spremni za pravo druženje.',
      },
      {
        emoji: '🍻',
        eyebrow: 'CHEERS',
        title: 'Jedan dodir. Bez dating pritiska.',
        body: 'Pošalji Cheers. Ako ga druga osoba pošalje natrag, dobivate uzajamni CHEERS! i otključava se chat.',
      },
      {
        emoji: '👻',
        eyebrow: 'TI ODLUČUJEŠ',
        title: 'Budi vidljiv samo kad ti želiš.',
        body: 'Uključi Active kada želiš upoznati ljude, a ugasi ga kad želiš mir i privatnost.',
      },
    ],
  },
} as const;

export default function OnboardingScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;
  const [page, setPage] = useState(0);
  const slide = text.slides[page];
  const isLast = page === text.slides.length - 1;

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'done');
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>SipMate 🍻</Text>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>{text.skip}</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{slide.emoji}</Text>
        </View>

        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>

        <View style={styles.dots}>
          {text.slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === page && styles.dotActive]}
            />
          ))}
        </View>
      </View>

      <Pressable
        style={styles.button}
        onPress={() => {
          if (isLast) finish();
          else setPage((current) => current + 1);
        }}
      >
        <Text style={styles.buttonText}>
          {isLast ? text.start : text.next}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  topBar: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  skip: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
  },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#2A2A2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  icon: {
    fontSize: 50,
  },
  eyebrow: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: 10,
    maxWidth: 420,
  },
  body: {
    color: '#A1A1AA',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 390,
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 32,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34343A',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#EF4444',
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
