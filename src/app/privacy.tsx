import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const copy = {
  en: {
    title: 'Privacy Policy', updated: 'Last updated: September 2026', back: 'BACK',
    sections: [
      ['Your privacy matters', 'SipMate uses account, profile, location, photo, messaging and subscription information to provide nearby discovery, Cheers, chat, safety and Premium features.'],
      ['Location', 'Location is used to calculate nearby people and update your city. SipMate only requests foreground location permission for these features.'],
      ['Photos and profile information', 'Profile details and photos you choose to publish can be visible to other SipMate users. Premium users can add additional profile photos.'],
      ['Messages, Cheers and safety', 'SipMate processes Cheers, conversations, messages, blocks and reports so social and safety features work correctly.'],
      ['Payments', 'Subscription information may be processed by the payment provider used for the platform. SipMate does not need to store your full payment-card details.'],
      ['Account deletion', 'You can start permanent account deletion from your SipMate profile. Associated account data must be deleted except information that may need to be retained for legitimate legal, security, fraud-prevention or regulatory reasons.'],
      ['Age requirement', 'SipMate is intended for adults aged 18 and over.'],
      ['Full policy', 'This in-app summary is provided for easy access. The public web version of the Privacy Policy will be the authoritative policy used for the Google Play listing before release.'],
    ],
  },
  de: {
    title: 'Datenschutzerklärung', updated: 'Zuletzt aktualisiert: September 2026', back: 'ZURÜCK',
    sections: [
      ['Deine Privatsphäre ist wichtig', 'SipMate verwendet Konto-, Profil-, Standort-, Foto-, Nachrichten- und Abonnementinformationen, um Nearby, Cheers, Chat, Sicherheitsfunktionen und Premium bereitzustellen.'],
      ['Standort', 'Der Standort wird verwendet, um Personen in deiner Nähe zu berechnen und deine Stadt zu aktualisieren. SipMate fordert dafür nur die Berechtigung für den Standort während der Nutzung der App an.'],
      ['Fotos und Profilinformationen', 'Profildaten und Fotos, die du veröffentlichst, können für andere SipMate-Nutzer sichtbar sein. Premium-Nutzer können zusätzliche Profilfotos hinzufügen.'],
      ['Nachrichten, Cheers und Sicherheit', 'SipMate verarbeitet Cheers, Unterhaltungen, Nachrichten, Blockierungen und Meldungen, damit soziale Funktionen und Sicherheitsfunktionen korrekt funktionieren.'],
      ['Zahlungen', 'Abonnementinformationen können vom Zahlungsanbieter der jeweiligen Plattform verarbeitet werden. SipMate muss deine vollständigen Zahlungskartendaten nicht speichern.'],
      ['Konto löschen', 'Du kannst die dauerhafte Löschung deines Kontos in deinem SipMate-Profil starten. Zugehörige Kontodaten müssen gelöscht werden, außer Informationen, die aus legitimen rechtlichen, sicherheitsbezogenen, betrugspräventiven oder regulatorischen Gründen aufbewahrt werden müssen.'],
      ['Altersanforderung', 'SipMate ist ausschließlich für Erwachsene ab 18 Jahren bestimmt.'],
      ['Vollständige Richtlinie', 'Diese Zusammenfassung in der App dient dem einfachen Zugriff. Vor der Veröffentlichung wird die öffentliche Webversion der Datenschutzerklärung die maßgebliche Richtlinie für den Google-Play-Eintrag sein.'],
    ],
  },
  hr: {
    title: 'Pravila privatnosti', updated: 'Posljednje ažuriranje: rujan 2026.', back: 'NATRAG',
    sections: [
      ['Tvoja privatnost je važna', 'SipMate koristi podatke o računu, profilu, lokaciji, fotografijama, porukama i pretplati kako bi omogućio Nearby, Cheers, chat, sigurnosne i Premium značajke.'],
      ['Lokacija', 'Lokacija se koristi za izračun ljudi u blizini i ažuriranje tvog grada. SipMate za te značajke traži samo dopuštenje za lokaciju dok koristiš aplikaciju.'],
      ['Fotografije i podaci profila', 'Podaci profila i fotografije koje odlučiš objaviti mogu biti vidljivi drugim SipMate korisnicima. Premium korisnici mogu dodati dodatne fotografije profila.'],
      ['Poruke, Cheers i sigurnost', 'SipMate obrađuje Cheers, razgovore, poruke, blokiranja i prijave kako bi društvene i sigurnosne značajke ispravno radile.'],
      ['Plaćanja', 'Podatke o pretplati može obrađivati pružatelj plaćanja koji se koristi na određenoj platformi. SipMate ne mora pohranjivati potpune podatke tvoje platne kartice.'],
      ['Brisanje računa', 'Trajno brisanje računa možeš pokrenuti iz svog SipMate profila. Povezani podaci računa moraju se izbrisati osim podataka koje je potrebno zadržati zbog legitimnih pravnih, sigurnosnih, regulatornih razloga ili sprječavanja prijevara.'],
      ['Dobno ograničenje', 'SipMate je namijenjen isključivo odraslim osobama od 18 godina nadalje.'],
      ['Potpuna pravila', 'Ovaj sažetak unutar aplikacije služi za jednostavan pristup. Prije objave javna web-verzija Pravila privatnosti bit će mjerodavna verzija koja se koristi za Google Play unos.'],
    ],
  },
} as const;

export default function PrivacyScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.logo}>SipMate 🍻</Text>
        <Text style={styles.title}>{text.title}</Text>
        <Text style={styles.updated}>{text.updated}</Text>

        {text.sections.map(([title, body]) => (
          <Section key={title} title={title} body={body} />
        ))}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← {text.back}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 60 },
  logo: { color: '#EF4444', fontSize: 17, fontWeight: '900', marginBottom: 20 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  updated: { color: '#71717A', fontSize: 12, marginTop: 6, marginBottom: 22 },
  card: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderRadius: 20, padding: 18, marginBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginBottom: 8 },
  body: { color: '#A1A1AA', fontSize: 13, lineHeight: 20 },
  backButton: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 14, marginTop: 12 },
  backText: { color: '#EF4444', fontSize: 13, fontWeight: '900' },
});
