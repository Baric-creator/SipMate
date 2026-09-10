import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const copy = {
  en: {
    title: 'Terms of Use',
    subtitle: 'The basic rules for using SipMate.',
    back: 'BACK',
    sections: [
      ['18+ only', 'SipMate is intended only for adults aged 18 and over. By creating an account, you confirm that you meet this requirement.'],
      ['Social app, not a dating service', 'SipMate helps people discover others nearby for social activities such as drinks, coffee and casual hangouts.'],
      ['Your account', 'You are responsible for the information you provide, for keeping your login credentials secure and for activity performed through your account.'],
      ['Respectful use', 'Do not use SipMate for harassment, threats, hate, stalking, scams, spam, impersonation or illegal activity.'],
      ['User content', 'You are responsible for photos, profile information and messages you submit. Only share content you have the right to use and that follows the Community Guidelines.'],
      ['Meet responsibly', 'A Cheers does not create any obligation to meet or drink alcohol. Users are responsible for their own decisions, safety, transport and conduct when meeting in person.'],
      ['Blocking and reporting', 'SipMate provides Block and Report tools. We may review reports and restrict, suspend or remove accounts that violate these terms or create a safety risk.'],
      ['Service availability', 'Features may change, be improved, limited or temporarily unavailable as SipMate develops.'],
      ['Account deletion', 'You can request deletion of your account through the in-app Delete Account feature. Some information may be retained when required for legal, security or abuse-prevention purposes.'],
    ],
  },
  de: {
    title: 'Nutzungsbedingungen',
    subtitle: 'Die grundlegenden Regeln für die Nutzung von SipMate.',
    back: 'ZURÜCK',
    sections: [
      ['Nur ab 18', 'SipMate ist ausschließlich für Erwachsene ab 18 Jahren bestimmt. Mit der Erstellung eines Kontos bestätigst du, dass du diese Voraussetzung erfüllst.'],
      ['Social-App, kein Dating-Dienst', 'SipMate hilft Menschen dabei, andere Personen in ihrer Nähe für soziale Aktivitäten wie Drinks, Kaffee und spontane Treffen zu entdecken.'],
      ['Dein Konto', 'Du bist für die von dir angegebenen Informationen, die Sicherheit deiner Zugangsdaten und die Aktivitäten über dein Konto verantwortlich.'],
      ['Respektvolle Nutzung', 'Nutze SipMate nicht für Belästigung, Drohungen, Hass, Stalking, Betrug, Spam, Identitätstäuschung oder illegale Aktivitäten.'],
      ['Nutzerinhalte', 'Du bist für Fotos, Profilangaben und Nachrichten verantwortlich, die du bereitstellst. Teile nur Inhalte, zu deren Nutzung du berechtigt bist und die den Community-Richtlinien entsprechen.'],
      ['Verantwortungsvolle Treffen', 'Ein Cheers verpflichtet weder zu einem Treffen noch zum Konsum von Alkohol. Nutzer sind selbst für ihre Entscheidungen, Sicherheit, Anreise und ihr Verhalten bei persönlichen Treffen verantwortlich.'],
      ['Blockieren und melden', 'SipMate stellt Funktionen zum Blockieren und Melden bereit. Wir können Meldungen prüfen und Konten einschränken, sperren oder entfernen, wenn diese Bedingungen verletzt werden oder ein Sicherheitsrisiko besteht.'],
      ['Verfügbarkeit des Dienstes', 'Funktionen können sich ändern, verbessert, eingeschränkt oder vorübergehend nicht verfügbar sein, während SipMate weiterentwickelt wird.'],
      ['Kontolöschung', 'Du kannst die Löschung deines Kontos über die Funktion „Konto löschen“ in der App beantragen. Bestimmte Informationen können aufbewahrt werden, wenn dies aus rechtlichen, Sicherheits- oder Missbrauchspräventionsgründen erforderlich ist.'],
    ],
  },
  hr: {
    title: 'Uvjeti korištenja',
    subtitle: 'Osnovna pravila za korištenje SipMatea.',
    back: 'NATRAG',
    sections: [
      ['Samo 18+', 'SipMate je namijenjen isključivo osobama od 18 godina nadalje. Kreiranjem računa potvrđuješ da ispunjavaš taj uvjet.'],
      ['Društvena aplikacija, ne dating servis', 'SipMate pomaže ljudima pronaći druge osobe u blizini za društvene aktivnosti poput pića, kave i spontanog druženja.'],
      ['Tvoj račun', 'Odgovoran si za podatke koje uneseš, sigurnost svojih podataka za prijavu i aktivnosti koje se odvijaju putem tvog računa.'],
      ['Korištenje uz poštovanje', 'Nemoj koristiti SipMate za uznemiravanje, prijetnje, govor mržnje, uhođenje, prijevare, spam, lažno predstavljanje ili nezakonite aktivnosti.'],
      ['Korisnički sadržaj', 'Odgovoran si za fotografije, podatke profila i poruke koje objavljuješ. Dijeli samo sadržaj koji imaš pravo koristiti i koji je u skladu s Pravilima zajednice.'],
      ['Odgovorno druženje', 'Cheers ne stvara obvezu susreta niti konzumiranja alkohola. Korisnici su sami odgovorni za svoje odluke, sigurnost, prijevoz i ponašanje pri susretima uživo.'],
      ['Blokiranje i prijava', 'SipMate ima alate Block i Report. Možemo pregledati prijave te ograničiti, suspendirati ili ukloniti račune koji krše ova pravila ili predstavljaju sigurnosni rizik.'],
      ['Dostupnost usluge', 'Funkcije se mogu mijenjati, poboljšavati, ograničiti ili privremeno biti nedostupne tijekom razvoja SipMatea.'],
      ['Brisanje računa', 'Brisanje računa možeš zatražiti kroz opciju Delete Account u aplikaciji. Određeni podaci mogu se zadržati kada je to potrebno zbog zakonskih, sigurnosnih ili razloga sprječavanja zlouporabe.'],
    ],
  },
} as const;

export default function TermsScreen() {
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
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#A1A1AA', fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 22 },
  card: { backgroundColor: '#141417', borderWidth: 1, borderColor: '#242428', borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginBottom: 8 },
  body: { color: '#A1A1AA', fontSize: 13, lineHeight: 20 },
  backButton: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 14, marginTop: 12 },
  backText: { color: '#EF4444', fontSize: 13, fontWeight: '900' },
});
