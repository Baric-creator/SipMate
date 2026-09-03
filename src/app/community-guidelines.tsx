import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const copy = {
  en: {
    title: 'Community Guidelines', subtitle: 'Keep SipMate social, safe and respectful.', back: 'BACK',
    sections: [
      ['18+ only', 'SipMate is for adults aged 18 and over. Do not create an account if you are under 18.'],
      ['Respect other people', 'Harassment, threats, hate, bullying, stalking and unwanted sexual behavior are not welcome on SipMate.'],
      ['No pressure to drink', 'A Cheers is an invitation to connect, not an obligation to drink alcohol or meet in person. Respect every no and every boundary.'],
      ['Meet safely', 'For a first meeting, choose a public place, tell someone you trust where you are going and arrange your own transport. Never drive after drinking.'],
      ['Be authentic', 'Do not impersonate other people, deceive users about who you are or use SipMate for scams, spam or fraudulent activity.'],
      ['Photos and messages', 'Only share content you have the right to share. Do not post illegal, exploitative, violent or non-consensual intimate content.'],
      ['Block and report', 'Use Block when you do not want contact from another user. Use Report when behavior may violate these guidelines or put someone at risk.'],
      ['Enforcement', 'SipMate may restrict or remove accounts that violate these guidelines or create a safety risk. Serious or repeated violations may result in permanent removal.'],
    ],
  },
  de: {
    title: 'Community-Richtlinien', subtitle: 'Halte SipMate sozial, sicher und respektvoll.', back: 'ZURÜCK',
    sections: [
      ['Nur ab 18', 'SipMate ist ausschließlich für Erwachsene ab 18 Jahren. Erstelle kein Konto, wenn du unter 18 bist.'],
      ['Respektiere andere', 'Belästigung, Drohungen, Hass, Mobbing, Stalking und unerwünschtes sexuelles Verhalten sind bei SipMate nicht willkommen.'],
      ['Kein Druck zu trinken', 'Ein Cheers ist eine Einladung zum Kontakt, keine Verpflichtung Alkohol zu trinken oder sich persönlich zu treffen. Respektiere jedes Nein und jede Grenze.'],
      ['Triff dich sicher', 'Wähle für ein erstes Treffen einen öffentlichen Ort, informiere eine Vertrauensperson und organisiere deinen eigenen Transport. Fahre niemals nach Alkoholkonsum.'],
      ['Sei authentisch', 'Gib dich nicht als eine andere Person aus, täusche andere nicht über deine Identität und nutze SipMate nicht für Betrug oder Spam.'],
      ['Fotos und Nachrichten', 'Teile nur Inhalte, die du teilen darfst. Illegale, ausbeuterische, gewalttätige oder nicht einvernehmliche intime Inhalte sind verboten.'],
      ['Blockieren und melden', 'Nutze Blockieren, wenn du keinen Kontakt mit einem Nutzer möchtest. Nutze Melden, wenn Verhalten gegen diese Richtlinien verstoßen oder jemanden gefährden könnte.'],
      ['Durchsetzung', 'SipMate kann Konten einschränken oder entfernen, die gegen diese Richtlinien verstoßen oder ein Sicherheitsrisiko darstellen. Schwere oder wiederholte Verstöße können zur dauerhaften Entfernung führen.'],
    ],
  },
  hr: {
    title: 'Pravila zajednice', subtitle: 'Neka SipMate ostane društven, siguran i pun poštovanja.', back: 'NATRAG',
    sections: [
      ['Samo 18+', 'SipMate je namijenjen isključivo odraslim osobama od 18 godina nadalje. Nemoj izrađivati račun ako imaš manje od 18 godina.'],
      ['Poštuj druge', 'Uznemiravanje, prijetnje, govor mržnje, maltretiranje, uhođenje i neželjeno seksualno ponašanje nisu dopušteni na SipMateu.'],
      ['Bez pritiska na piće', 'Cheers je poziv za povezivanje, a ne obveza na konzumiranje alkohola ili susret uživo. Poštuj svako ne i svaku granicu.'],
      ['Nalazi se sigurno', 'Za prvi susret odaberi javno mjesto, reci osobi kojoj vjeruješ kamo ideš i organiziraj vlastiti prijevoz. Nikada nemoj voziti nakon konzumiranja alkohola.'],
      ['Budi autentičan', 'Nemoj se predstavljati kao druga osoba, obmanjivati korisnike o svom identitetu niti koristiti SipMate za prijevare ili spam.'],
      ['Fotografije i poruke', 'Dijeli samo sadržaj koji imaš pravo dijeliti. Zabranjen je ilegalan, iskorištavajući, nasilan ili intiman sadržaj bez pristanka.'],
      ['Blokiraj i prijavi', 'Koristi Block kada ne želiš kontakt s drugim korisnikom. Koristi Report kada ponašanje može kršiti ova pravila ili ugroziti nekoga.'],
      ['Provođenje pravila', 'SipMate može ograničiti ili ukloniti račune koji krše ova pravila ili predstavljaju sigurnosni rizik. Ozbiljna ili ponovljena kršenja mogu dovesti do trajnog uklanjanja.'],
    ],
  },
} as const;

export default function CommunityGuidelinesScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.logo}>SipMate 🍻</Text>
        <Text style={styles.title}>{text.title}</Text>
        <Text style={styles.subtitle}>{text.subtitle}</Text>
        {text.sections.map(([title, body]) => (
          <View key={title} style={styles.card}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← {text.back}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 60 },
  logo: { color: '#EF4444', fontSize: 17, fontWeight: '900', marginBottom: 20 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#A1A1AA', fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 22 },
  card: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A', borderRadius: 20, padding: 18, marginBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginBottom: 8 },
  body: { color: '#A1A1AA', fontSize: 13, lineHeight: 20 },
  backButton: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 14, marginTop: 12 },
  backText: { color: '#EF4444', fontSize: 13, fontWeight: '900' },
});
