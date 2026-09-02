import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

const resources = {
  en: {
    translation: {
      appName: 'SipMate',

      blockedUsers: {
        title: 'Blocked Users',
        subtitle: 'Manage people you have blocked on SipMate.',
        loading: 'Loading...',
        emptyTitle: 'No blocked users',
        emptyText: 'People you block will appear here.',
        locationNotSet: 'Location not set',
        unblock: 'UNBLOCK',
        back: 'BACK',
      },

      languageScreen: {
        title: 'Language',
        subtitle: 'Choose your SipMate language.',
        english: 'English',
        german: 'German',
        croatian: 'Croatian',
        back: 'BACK',
      },

      profileScreen: {
        active: 'ACTIVE — Ready for a drink',
        inactive: 'INACTIVE',
        currentlyUpFor: 'CURRENTLY UP FOR',
        about: 'ABOUT',
        premium: 'SIPMATE PREMIUM',
        editProfile: 'EDIT PROFILE',
        blockedUsers: 'BLOCKED USERS',
        language: 'LANGUAGE',
        logout: 'LOG OUT',
        readyForDrink: '🍻 Ready for a drink',
        noBioYet: 'No bio yet.',
      },

editProfileScreen: {
  locationPermissionRequired:
    'Location permission is required for Nearby.',
  nameRequired: 'Name is required.',

  title: 'Edit Profile',
  subtitle:
    "Keep your profile fresh so people nearby know what you're up for.",

  profileGallery: 'PROFILE GALLERY',
  addPhoto: 'ADD PHOTO',
  addMorePhotos: 'ADD MORE PHOTOS',
  uploading: 'Uploading...',
  changeProfilePhoto: 'Change profile photo',

  profileDetails: 'PROFILE DETAILS',
  name: 'NAME',
  namePlaceholder: 'Your name',
  age: 'AGE',
  agePlaceholder: 'Your age',
  gender: 'GENDER',
  male: 'Male',
  female: 'Female',
  other: 'Other',
  city: 'CITY',
  cityPlaceholder: 'Your city',
  aboutMe: 'ABOUT ME',
  bioPlaceholder:
    'Tell people a little about yourself...',

  currentlyUpFor: 'CURRENTLY UP FOR',
  currentlyUpForDescription:
    'What sounds good right now?',
  beer: 'Beer',
  cocktail: 'Cocktail',
  wine: 'Wine',
  whisky: 'Whisky',
  coffee: 'Coffee',

  discoverStatus: 'DISCOVER STATUS',
  discoverStatusDescription:
    'Control whether people can find you in Nearby.',
  active: 'ACTIVE — Ready for a drink',
  inactive: 'INACTIVE — Hidden from Nearby',

  saving: 'SAVING...',
  saveProfile: 'SAVE PROFILE',
  cancel: 'Cancel',
  loadingProfile: 'Loading profile...',

  imageReadError: 'Could not read selected image.',
  imageLoaded: 'Image loaded. Starting upload...',
  uploadSuccessful: 'Upload successful!',
  uploadError: 'UPLOAD ERROR',
  profileError: 'PROFILE ERROR',
  galleryLimit:
    'Premium allows up to 6 gallery photos.',
  galleryUploadError: 'Could not upload photo.',
  gallerySaveError: 'Could not save photo.',
  galleryAddError: 'Could not add photo.',

  footer: 'Find someone. Grab a drink. CHEERS! 🍻',
},
tabs: {
  discover: 'Discover',
  nearby: 'Nearby',
  cheers: 'Cheers',
  chat: 'Chat',
  profile: 'Profile',
},
nearbyScreen: {
  subtitle: "Ready for a drink? See who's nearby.",

  all: 'All',
  beer: 'Beer',
  cocktail: 'Cocktail',
  coffee: 'Coffee',
  drinks: 'Drinks',
  hangout: 'Hangout',

  advancedFilters: 'ADVANCED FILTERS',
  advancedPremium: 'Age, gender & more',
  advancedLocked:
    'Unlock more discovery options with Premium',
  premiumFilters: 'PREMIUM FILTERS',

  age: 'AGE',
  gender: 'GENDER',
  men: 'Men',
  women: 'Women',
  other: 'Other',

  location: 'LOCATION',
  changeLocation: 'CHANGE LOCATION',
  changeLocationSubtitle:
    'Discover people in another city',
  city: 'CITY',
  cityPlaceholder: 'e.g. Nürnberg',
  findingLocation: 'FINDING LOCATION...',
  useThisLocation: 'USE THIS LOCATION',
  locationNotFound: 'Location not found.',
  locationError:
    'Could not find this location.',
  locationFound: 'Location found:',
  searchingAround: 'Searching around',
  useMyLocationAgain:
    'USE MY LOCATION AGAIN',

  skippedProfiles: 'SKIPPED PROFILES',
  skippedProfilesSubtitle:
    'See people you skipped earlier',
  loadingSkipped:
    'Loading skipped profiles...',
  noSkippedProfiles:
    'No skipped profiles yet.',
  restore: 'RESTORE',

  resetFilters: 'RESET FILTERS',

  findingPeople:
    'Finding people nearby...',
  nobodyNearby:
    'No one nearby right now.',

  userFallback: 'SipMate User',
  active: 'ACTIVE',
  currentlyUpFor: 'CURRENTLY UP FOR',
  readyForDrink: '🍻 Ready for a drink',
  viewProfile: 'View profile →',
  skip: 'SKIP',

  metersAway: 'm away',
  kilometersAway: 'km away',
},
discoverScreen: {
  loading: 'Loading SipMate...',
  locationNotSet: 'Location not set',

  active: 'ACTIVE',
  inactive: 'INACTIVE',

  heroTitle: "Who's up for a drink?",
  heroSubtitle:
    'Find people nearby who are ready to grab a drink right now.',

  currentlyUpFor: "YOU'RE CURRENTLY UP FOR",
  findPeopleNearby: 'FIND PEOPLE NEARBY',

  activeTitle: "You're active",
  inactiveTitle: "You're inactive",
  activeDescription:
    'People nearby can discover your profile.',
  inactiveDescription:
    'Activate your profile to appear in Nearby.',

  quickAccess: 'QUICK ACCESS',
  chats: 'Chats',
  chatsDescription:
    'Continue your conversations',
  myProfile: 'My Profile',
  profileDescription:
    'Profile & availability',
  open: 'Open →',

  sendCheers: 'Send a Cheers.',
  cheersDescription:
    "Get one back and it's CHEERS! Then start chatting.",

  beer: 'Beer',
  cocktail: 'Cocktail',
  wine: 'Wine',
  whisky: 'Whisky',
  coffee: 'Coffee',
  drinks: 'Drinks',
  hangout: 'Hangout',
  readyForDrink: '🍻 Ready for a drink',

  footer:
    'Find someone. Grab a drink. CHEERS! 🍻',
},
cheersScreen: {
  title: 'Cheers',
  subtitle:
    'Your drink connections, incoming Cheers and people waiting for your reply.',

  loading: 'Loading Cheers...',
  noCheers: 'No Cheers yet',
  noCheersDescription:
    'Find someone nearby and send your first Cheers.',
  findPeopleNearby: 'FIND PEOPLE NEARBY',

  mutual: 'CHEERS!',
  received: 'RECEIVED',
  sent: 'SENT',

  mutualDescription:
    'You both sent a Cheers. Time to start chatting.',
  receivedDescription:
    "These people sent you a Cheers. Open their profile and see who's up for a drink.",
  sentDescription:
    'Waiting for them to send a Cheers back.',

  bothSent: 'Both of you sent 🍻',
  waitingFor: 'Waiting for',
  toSendBack: 'to send 🍻 back',
  sentYou: 'sent you 🍻',

  someone: 'Someone',
  thisUser: 'this user',
  userFallback: 'SipMate User',

  lockedName: 'Someone likes your vibe 👀',
  premiumReveal:
    '💎 Upgrade to Premium to reveal who sent you Cheers.',

  openChat: 'OPEN CHAT',
  unlock: 'UNLOCK',
  refresh: 'REFRESH CHEERS',

  footer:
    'Send a Cheers. Get one back. Start talking. 🍻',
},
    },
  },

  de: {
    translation: {
      appName: 'SipMate',

      blockedUsers: {
        title: 'Blockierte Nutzer',
        subtitle:
          'Verwalte Personen, die du auf SipMate blockiert hast.',
        loading: 'Wird geladen...',
        emptyTitle: 'Keine blockierten Nutzer',
        emptyText:
          'Personen, die du blockierst, erscheinen hier.',
        locationNotSet: 'Standort nicht festgelegt',
        unblock: 'ENTBLOCKIEREN',
        back: 'ZURÜCK',
      },

      languageScreen: {
        title: 'Sprache',
        subtitle: 'Wähle deine SipMate-Sprache.',
        english: 'Englisch',
        german: 'Deutsch',
        croatian: 'Kroatisch',
        back: 'ZURÜCK',
      },

      profileScreen: {
        active: 'AKTIV — Bereit für einen Drink',
        inactive: 'INAKTIV',
        currentlyUpFor: 'DERZEIT VERFÜGBAR FÜR',
        about: 'ÜBER MICH',
        premium: 'SIPMATE PREMIUM',
        editProfile: 'PROFIL BEARBEITEN',
        blockedUsers: 'GESPERRTE BENUTZER',
        language: 'SPRACHE',
        logout: 'ABMELDEN',
        readyForDrink: '🍻 Bereit für einen Drink',
        noBioYet: 'Noch keine Beschreibung.',
      },

    editProfileScreen: {
  locationPermissionRequired:
    'Für Nearby ist die Standortberechtigung erforderlich.',
  nameRequired: 'Name ist erforderlich.',

  title: 'Profil bearbeiten',
  subtitle:
    'Halte dein Profil aktuell, damit Leute in deiner Nähe wissen, worauf du Lust hast.',

  profileGallery: 'PROFILGALERIE',
  addPhoto: 'FOTO HINZUFÜGEN',
  addMorePhotos: 'MEHR FOTOS HINZUFÜGEN',
  uploading: 'Wird hochgeladen...',
  changeProfilePhoto: 'Profilfoto ändern',

  profileDetails: 'PROFILDETAILS',
  name: 'NAME',
  namePlaceholder: 'Dein Name',
  age: 'ALTER',
  agePlaceholder: 'Dein Alter',
  gender: 'GESCHLECHT',
  male: 'Männlich',
  female: 'Weiblich',
  other: 'Andere',
  city: 'STADT',
  cityPlaceholder: 'Deine Stadt',
  aboutMe: 'ÜBER MICH',
  bioPlaceholder:
    'Erzähl ein wenig über dich...',

  currentlyUpFor: 'DERZEIT LUST AUF',
  currentlyUpForDescription:
    'Worauf hast du gerade Lust?',
  beer: 'Bier',
  cocktail: 'Cocktail',
  wine: 'Wein',
  whisky: 'Whisky',
  coffee: 'Kaffee',

  discoverStatus: 'SICHTBARKEIT',
  discoverStatusDescription:
    'Bestimme, ob andere dich in Nearby finden können.',
  active: 'AKTIV — Bereit für einen Drink',
  inactive: 'INAKTIV — In Nearby verborgen',

  saving: 'WIRD GESPEICHERT...',
  saveProfile: 'PROFIL SPEICHERN',
  cancel: 'Abbrechen',
  loadingProfile: 'Profil wird geladen...',

  imageReadError:
    'Das ausgewählte Bild konnte nicht gelesen werden.',
  imageLoaded:
    'Bild geladen. Upload wird gestartet...',
  uploadSuccessful: 'Upload erfolgreich!',
  uploadError: 'UPLOAD-FEHLER',
  profileError: 'PROFIL-FEHLER',
  galleryLimit:
    'Premium erlaubt bis zu 6 Galeriefotos.',
  galleryUploadError:
    'Foto konnte nicht hochgeladen werden.',
  gallerySaveError:
    'Foto konnte nicht gespeichert werden.',
  galleryAddError:
    'Foto konnte nicht hinzugefügt werden.',

  footer: 'Finde jemanden. Trink etwas. CHEERS! 🍻',
},
tabs: {
  discover: 'Entdecken',
  nearby: 'In der Nähe',
  cheers: 'Cheers',
  chat: 'Chat',
  profile: 'Profil',
},
nearbyScreen: {
  subtitle:
    'Bereit für einen Drink? Sieh, wer in deiner Nähe ist.',

  all: 'Alle',
  beer: 'Bier',
  cocktail: 'Cocktail',
  coffee: 'Kaffee',
  drinks: 'Drinks',
  hangout: 'Treffen',

  advancedFilters: 'ERWEITERTE FILTER',
  advancedPremium:
    'Alter, Geschlecht & mehr',
  advancedLocked:
    'Schalte mit Premium weitere Suchoptionen frei',
  premiumFilters: 'PREMIUM-FILTER',

  age: 'ALTER',
  gender: 'GESCHLECHT',
  men: 'Männer',
  women: 'Frauen',
  other: 'Andere',

  location: 'STANDORT',
  changeLocation: 'STANDORT ÄNDERN',
  changeLocationSubtitle:
    'Entdecke Menschen in einer anderen Stadt',
  city: 'STADT',
  cityPlaceholder: 'z. B. Nürnberg',
  findingLocation:
    'STANDORT WIRD GESUCHT...',
  useThisLocation:
    'DIESEN STANDORT VERWENDEN',
  locationNotFound:
    'Standort nicht gefunden.',
  locationError:
    'Dieser Standort konnte nicht gefunden werden.',
  locationFound: 'Standort gefunden:',
  searchingAround: 'Suche rund um',
  useMyLocationAgain:
    'MEINEN STANDORT WIEDER VERWENDEN',

  skippedProfiles:
    'ÜBERSPRUNGENE PROFILE',
  skippedProfilesSubtitle:
    'Sieh Personen, die du zuvor übersprungen hast',
  loadingSkipped:
    'Übersprungene Profile werden geladen...',
  noSkippedProfiles:
    'Noch keine übersprungenen Profile.',
  restore: 'WIEDERHERSTELLEN',

  resetFilters: 'FILTER ZURÜCKSETZEN',

  findingPeople:
    'Personen in deiner Nähe werden gesucht...',
  nobodyNearby:
    'Im Moment ist niemand in deiner Nähe.',

  userFallback: 'SipMate-Nutzer',
  active: 'AKTIV',
  currentlyUpFor: 'DERZEIT LUST AUF',
  readyForDrink:
    '🍻 Bereit für einen Drink',
  viewProfile: 'Profil ansehen →',
  skip: 'ÜBERSPRINGEN',

  metersAway: 'm entfernt',
  kilometersAway: 'km entfernt',
},
discoverScreen: {
  loading: 'SipMate wird geladen...',
  locationNotSet:
    'Standort nicht festgelegt',

  active: 'AKTIV',
  inactive: 'INAKTIV',

  heroTitle:
    'Wer hat Lust auf einen Drink?',
  heroSubtitle:
    'Finde Leute in deiner Nähe, die jetzt etwas trinken gehen möchten.',

  currentlyUpFor:
    'DU HAST GERADE LUST AUF',
  findPeopleNearby:
    'LEUTE IN DER NÄHE FINDEN',

  activeTitle: 'Du bist aktiv',
  inactiveTitle: 'Du bist inaktiv',
  activeDescription:
    'Leute in deiner Nähe können dein Profil entdecken.',
  inactiveDescription:
    'Aktiviere dein Profil, um in Nearby angezeigt zu werden.',

  quickAccess: 'SCHNELLZUGRIFF',
  chats: 'Chats',
  chatsDescription:
    'Setze deine Unterhaltungen fort',
  myProfile: 'Mein Profil',
  profileDescription:
    'Profil & Verfügbarkeit',
  open: 'Öffnen →',

  sendCheers: 'Sende ein Cheers.',
  cheersDescription:
    'Bekommst du eins zurück, heißt es CHEERS! Danach könnt ihr chatten.',

  beer: 'Bier',
  cocktail: 'Cocktail',
  wine: 'Wein',
  whisky: 'Whisky',
  coffee: 'Kaffee',
  drinks: 'Drinks',
  hangout: 'Treffen',
  readyForDrink:
    '🍻 Bereit für einen Drink',

  footer:
    'Finde jemanden. Trink etwas. CHEERS! 🍻',
},
cheersScreen: {
  title: 'Cheers',
  subtitle:
    'Deine Drink-Kontakte, erhaltene Cheers und Personen, die auf deine Antwort warten.',

  loading: 'Cheers werden geladen...',
  noCheers: 'Noch keine Cheers',
  noCheersDescription:
    'Finde jemanden in deiner Nähe und sende dein erstes Cheers.',
  findPeopleNearby:
    'LEUTE IN DER NÄHE FINDEN',

  mutual: 'CHEERS!',
  received: 'ERHALTEN',
  sent: 'GESENDET',

  mutualDescription:
    'Ihr habt euch beide ein Cheers gesendet. Zeit zu chatten.',
  receivedDescription:
    'Diese Personen haben dir ein Cheers gesendet. Öffne ihr Profil und sieh, wer Lust auf einen Drink hat.',
  sentDescription:
    'Warte darauf, dass sie dir ein Cheers zurücksenden.',

  bothSent:
    'Ihr habt euch beide 🍻 gesendet',
  waitingFor: 'Warte darauf, dass',
  toSendBack: '🍻 zurücksendet',
  sentYou: 'hat dir 🍻 gesendet',

  someone: 'Jemand',
  thisUser: 'dieser Nutzer',
  userFallback: 'SipMate-Nutzer',

  lockedName:
    'Jemand mag deinen Vibe 👀',
  premiumReveal:
    '💎 Hol dir Premium, um zu sehen, wer dir ein Cheers gesendet hat.',

  openChat: 'CHAT ÖFFNEN',
  unlock: 'FREISCHALTEN',
  refresh: 'CHEERS AKTUALISIEREN',

  footer:
    'Sende ein Cheers. Bekomm eins zurück. Fangt an zu chatten. 🍻',
},
    },
  },

  hr: {
    translation: {
      appName: 'SipMate',

      blockedUsers: {
        title: 'Blokirani korisnici',
        subtitle:
          'Upravljaj osobama koje si blokirao na SipMateu.',
        loading: 'Učitavanje...',
        emptyTitle: 'Nema blokiranih korisnika',
        emptyText:
          'Osobe koje blokiraš pojavit će se ovdje.',
        locationNotSet: 'Lokacija nije postavljena',
        unblock: 'ODBLOKIRAJ',
        back: 'NATRAG',
      },

      languageScreen: {
        title: 'Jezik',
        subtitle: 'Odaberi jezik za SipMate.',
        english: 'Engleski',
        german: 'Njemački',
        croatian: 'Hrvatski',
        back: 'NATRAG',
      },

      profileScreen: {
        active: 'AKTIVAN — Spreman za piće',
        inactive: 'NEAKTIVAN',
        currentlyUpFor: 'TRENUTNO ZA',
        about: 'O MENI',
        premium: 'SIPMATE PREMIUM',
        editProfile: 'UREDI PROFIL',
        blockedUsers: 'BLOKIRANI KORISNICI',
        language: 'JEZIK',
        logout: 'ODJAVA',
        readyForDrink: '🍻 Spreman za piće',
        noBioYet: 'Još nema opisa.',
      },

editProfileScreen: {
  locationPermissionRequired:
    'Za Nearby je potrebna dozvola za lokaciju.',
  nameRequired: 'Ime je obavezno.',

  title: 'Uredi profil',
  subtitle:
    'Održavaj svoj profil ažurnim kako bi ljudi u blizini znali za što si trenutno raspoložen.',

  profileGallery: 'GALERIJA PROFILA',
  addPhoto: 'DODAJ FOTOGRAFIJU',
  addMorePhotos: 'DODAJ JOŠ FOTOGRAFIJA',
  uploading: 'Učitavanje...',
  changeProfilePhoto:
    'Promijeni profilnu fotografiju',

  profileDetails: 'PODACI PROFILA',
  name: 'IME',
  namePlaceholder: 'Tvoje ime',
  age: 'GODINE',
  agePlaceholder: 'Tvoje godine',
  gender: 'SPOL',
  male: 'Muško',
  female: 'Žensko',
  other: 'Ostalo',
  city: 'GRAD',
  cityPlaceholder: 'Tvoj grad',
  aboutMe: 'O MENI',
  bioPlaceholder:
    'Napiši nešto kratko o sebi...',

  currentlyUpFor: 'TRENUTNO ZA',
  currentlyUpForDescription:
    'Za što si trenutno raspoložen?',
  beer: 'Pivo',
  cocktail: 'Koktel',
  wine: 'Vino',
  whisky: 'Viski',
  coffee: 'Kava',

  discoverStatus: 'STATUS VIDLJIVOSTI',
  discoverStatusDescription:
    'Odredi mogu li te drugi pronaći u Nearby.',
  active: 'AKTIVAN — Spreman za piće',
  inactive: 'NEAKTIVAN — Skriven u Nearby',

  saving: 'SPREMANJE...',
  saveProfile: 'SPREMI PROFIL',
  cancel: 'Odustani',
  loadingProfile: 'Učitavanje profila...',

  imageReadError:
    'Odabranu fotografiju nije moguće učitati.',
  imageLoaded:
    'Fotografija učitana. Počinje prijenos...',
  uploadSuccessful: 'Fotografija uspješno učitana!',
  uploadError: 'GREŠKA PRI UČITAVANJU',
  profileError: 'GREŠKA PROFILA',
  galleryLimit:
    'Premium omogućuje najviše 6 fotografija u galeriji.',
  galleryUploadError:
    'Fotografiju nije moguće učitati.',
  gallerySaveError:
    'Fotografiju nije moguće spremiti.',
  galleryAddError:
    'Fotografiju nije moguće dodati.',

  footer: 'Pronađi nekoga. Popij nešto. CHEERS! 🍻',
},
tabs: {
  discover: 'Istraži',
  nearby: 'U blizini',
  cheers: 'Cheers',
  chat: 'Chat',
  profile: 'Profil',
},
nearbyScreen: {
  subtitle:
    'Spreman za piće? Pogledaj tko je u blizini.',

  all: 'Sve',
  beer: 'Pivo',
  cocktail: 'Koktel',
  coffee: 'Kava',
  drinks: 'Piće',
  hangout: 'Druženje',

  advancedFilters: 'NAPREDNI FILTERI',
  advancedPremium:
    'Godine, spol i još mnogo toga',
  advancedLocked:
    'Otključaj dodatne opcije pretrage uz Premium',
  premiumFilters: 'PREMIUM FILTERI',

  age: 'GODINE',
  gender: 'SPOL',
  men: 'Muškarci',
  women: 'Žene',
  other: 'Ostalo',

  location: 'LOKACIJA',
  changeLocation: 'PROMIJENI LOKACIJU',
  changeLocationSubtitle:
    'Pronađi ljude u drugom gradu',
  city: 'GRAD',
  cityPlaceholder: 'npr. Nürnberg',
  findingLocation:
    'TRAŽENJE LOKACIJE...',
  useThisLocation:
    'KORISTI OVU LOKACIJU',
  locationNotFound:
    'Lokacija nije pronađena.',
  locationError:
    'Nije moguće pronaći ovu lokaciju.',
  locationFound:
    'Lokacija pronađena:',
  searchingAround: 'Pretraživanje oko',
  useMyLocationAgain:
    'PONOVNO KORISTI MOJU LOKACIJU',

  skippedProfiles:
    'PRESKOČENI PROFILI',
  skippedProfilesSubtitle:
    'Pogledaj osobe koje si ranije preskočio',
  loadingSkipped:
    'Učitavanje preskočenih profila...',
  noSkippedProfiles:
    'Još nema preskočenih profila.',
  restore: 'VRATI',

  resetFilters:
    'PONIŠTI FILTERE',

  findingPeople:
    'Traženje ljudi u blizini...',
  nobodyNearby:
    'Trenutno nema nikoga u blizini.',

  userFallback: 'SipMate korisnik',
  active: 'AKTIVAN',
  currentlyUpFor: 'TRENUTNO ZA',
  readyForDrink:
    '🍻 Spreman za piće',
  viewProfile: 'Pogledaj profil →',
  skip: 'PRESKOČI',

  metersAway: 'm udaljen',
  kilometersAway: 'km udaljen',
},
discoverScreen: {
  loading: 'Učitavanje SipMatea...',
  locationNotSet:
    'Lokacija nije postavljena',

  active: 'AKTIVAN',
  inactive: 'NEAKTIVAN',

  heroTitle:
    'Tko je za piće?',
  heroSubtitle:
    'Pronađi ljude u blizini koji su upravo sada spremni otići na piće.',

  currentlyUpFor:
    'TRENUTNO SI ZA',
  findPeopleNearby:
    'PRONAĐI LJUDE U BLIZINI',

  activeTitle: 'Aktivan si',
  inactiveTitle: 'Neaktivan si',
  activeDescription:
    'Ljudi u blizini mogu pronaći tvoj profil.',
  inactiveDescription:
    'Aktiviraj profil kako bi se pojavio u Nearby.',

  quickAccess: 'BRZI PRISTUP',
  chats: 'Chatovi',
  chatsDescription:
    'Nastavi svoje razgovore',
  myProfile: 'Moj profil',
  profileDescription:
    'Profil i dostupnost',
  open: 'Otvori →',

  sendCheers: 'Pošalji Cheers.',
  cheersDescription:
    'Ako ga dobiješ natrag — CHEERS! Nakon toga možete početi razgovor.',

  beer: 'Pivo',
  cocktail: 'Koktel',
  wine: 'Vino',
  whisky: 'Viski',
  coffee: 'Kava',
  drinks: 'Piće',
  hangout: 'Druženje',
  readyForDrink:
    '🍻 Spreman za piće',

  footer:
    'Pronađi nekoga. Popij nešto. CHEERS! 🍻',
},
cheersScreen: {
  title: 'Cheers',
  subtitle:
    'Tvoja povezivanja uz piće, primljeni Cheers i osobe koje čekaju tvoj odgovor.',

  loading: 'Učitavanje Cheers...',
  noCheers: 'Još nema Cheers',
  noCheersDescription:
    'Pronađi nekoga u blizini i pošalji svoj prvi Cheers.',
  findPeopleNearby:
    'PRONAĐI LJUDE U BLIZINI',

  mutual: 'CHEERS!',
  received: 'PRIMLJENO',
  sent: 'POSLANO',

  mutualDescription:
    'Oboje ste poslali Cheers. Vrijeme je za razgovor.',
  receivedDescription:
    'Ove osobe su ti poslale Cheers. Otvori njihov profil i pogledaj tko je za piće.',
  sentDescription:
    'Čekamo da ti pošalju Cheers natrag.',

  bothSent: 'Oboje ste poslali 🍻',
  waitingFor: 'Čekamo da',
  toSendBack: 'pošalje 🍻 natrag',
  sentYou: 'ti je poslao/la 🍻',

  someone: 'Netko',
  thisUser: 'ova osoba',
  userFallback: 'SipMate korisnik',

  lockedName:
    'Nekome se sviđa tvoj vibe 👀',
  premiumReveal:
    '💎 Nadogradi na Premium kako bi vidio tko ti je poslao Cheers.',

  openChat: 'OTVORI CHAT',
  unlock: 'OTKLJUČAJ',
  refresh: 'OSVJEŽI CHEERS',

  footer:
    'Pošalji Cheers. Dobij jedan natrag. Započni razgovor. 🍻',
},
    },
  },
};

const deviceLanguage =
  Localization.getLocales()[0]?.languageCode ?? 'en';

const supportedLanguages = ['en', 'de', 'hr'];

const language =
  supportedLanguages.includes(deviceLanguage)
    ? deviceLanguage
    : 'en';
async function loadSavedLanguage() {
  let savedLanguage: string | null = null;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      savedLanguage =
        window.localStorage.getItem(
          'sipmate-language'
        );
    }
  } else {
    savedLanguage =
      await SecureStore.getItemAsync(
        'sipmate-language'
      );
  }

  if (
    savedLanguage &&
    supportedLanguages.includes(savedLanguage)
  ) {
    await i18n.changeLanguage(savedLanguage);
  }
}
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
loadSavedLanguage();
export default i18n;
export async function changeLanguage(
  language: 'en' | 'de' | 'hr'
) {
  await i18n.changeLanguage(language);

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'sipmate-language',
        language
      );
    }

    return;
  }

  await SecureStore.setItemAsync(
    'sipmate-language',
    language
  );
}