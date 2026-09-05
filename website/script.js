const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

if (typeof IntersectionObserver !== 'undefined') {
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
}

const translations = {
  en: {
    how:'How it works', premium:'Premium', join:'Join waitlist', eyebrow:'COMING SOON · GERMANY FIRST',
    hero:'Find nearby people who are up for the same thing. Beer, cocktails, coffee, wine or just hanging out.',
    rule:'Not dating. No awkward swiping. Just people, plans and CHEERS.', see:'See how it works ↓',
    notdating:'THIS IS NOT A DATING APP.', good:'JUST DRINKS. PEOPLE. GOOD TIMES.', howtitle:'From “one drink?” to CHEERS! in minutes.',
    nearby:'See who’s nearby', nearbycopy:'Discover active people around you and what they are currently up for.',
    send:'Send a Cheers', sendcopy:'No hearts, no dating mechanics. One tap says: “I’d grab a drink with you.”',
    mutual:'It’s a CHEERS!', mutualcopy:'If they send one back, you both unlock chat and can make the plan happen.',
    waittitle:'BE FIRST TO SAY CHEERS. 🍻', waitcopy:'Join the launch list and we’ll let you know when SipMate is ready.', placeholder:'you@email.com', success:'🍻 You’re in! We’ll let you know when SipMate launches.', already:'🍻 You’re already on the list. Cheers!', error:'Something went wrong. Please try again.'
  },
  de: {
    how:'So funktioniert’s', premium:'Premium', join:'Warteliste', eyebrow:'BALD VERFÜGBAR · ZUERST IN DEUTSCHLAND',
    hero:'Finde Leute in deiner Nähe, die gerade Lust auf dasselbe haben. Bier, Cocktails, Kaffee, Wein oder einfach zusammen abhängen.',
    rule:'Kein Dating. Kein peinliches Swipen. Nur Leute, Pläne und CHEERS.', see:'So funktioniert’s ↓',
    notdating:'DAS IST KEINE DATING-APP.', good:'DRINKS. LEUTE. GUTE ZEIT.', howtitle:'Von „ein Drink?“ zu CHEERS! in Minuten.',
    nearby:'Leute in der Nähe', nearbycopy:'Entdecke aktive Leute um dich herum und worauf sie gerade Lust haben.',
    send:'Cheers senden', sendcopy:'Keine Herzen, keine Dating-Mechanik. Ein Tap sagt: „Mit dir würde ich was trinken gehen.“',
    mutual:'CHEERS!', mutualcopy:'Kommt ein Cheers zurück, wird der Chat freigeschaltet und ihr könnt euch verabreden.',
    waittitle:'SAG ALS ERSTER CHEERS. 🍻', waitcopy:'Trag dich ein und erfahre als Erstes, wann SipMate startet.', placeholder:'du@email.de', success:'🍻 Du bist dabei! Wir melden uns zum SipMate-Start.', already:'🍻 Du bist schon auf der Liste. Cheers!', error:'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
  },
  hr: {
    how:'Kako radi', premium:'Premium', join:'Pridruži se', eyebrow:'USKORO · PRVO U NJEMAČKOJ',
    hero:'Pronađi ljude u blizini koji su raspoloženi za isto. Pivo, koktel, kavu, vino ili jednostavno druženje.',
    rule:'Nije dating. Nema neugodnog swipeanja. Samo ljudi, planovi i CHEERS.', see:'Pogledaj kako radi ↓',
    notdating:'OVO NIJE DATING APLIKACIJA.', good:'PIĆE. LJUDI. DOBRA ZABAVA.', howtitle:'Od „idemo na jedno?“ do CHEERS! za par minuta.',
    nearby:'Vidi tko je u blizini', nearbycopy:'Otkrij aktivne ljude oko sebe i za što su trenutno raspoloženi.',
    send:'Pošalji Cheers', sendcopy:'Bez srca i dating mehanike. Jedan dodir kaže: „S tobom bih otišao/la na piće.“',
    mutual:'CHEERS!', mutualcopy:'Ako ti uzvrate Cheers, otključava se chat i možete dogovoriti druženje.',
    waittitle:'BUDI PRVI KOJI ĆE REĆI CHEERS. 🍻', waitcopy:'Pridruži se listi i javljamo ti čim SipMate bude spreman.', placeholder:'ti@email.com', success:'🍻 Na listi si! Javljamo ti čim SipMate krene.', already:'🍻 Već si na listi. Cheers!', error:'Nešto nije uspjelo. Pokušaj ponovno.'
  }
};

const additionalTranslations = {
  "de": {
    "beer": "🍺 Bier",
    "bothUp": "Ihr habt beide Lust auf ein Treffen.",
    "chatHi": "Hey! 🍻",
    "chatInvite": "Heute Abend einen Drink?",
    "chatYes": "Auf jeden Fall 😄",
    "city": "Deine Stadt.",
    "cocktails": "🍸 Cocktails",
    "coffee": "☕ Kaffee",
    "currently": "Gerade Lust auf",
    "deleteAccount": "Konto löschen",
    "demoProfile": "Beispielprofil",
    "distance": "800 m entfernt",
    "emailLabel": "E-Mail-Adresse",
    "featureCheers": "✓ Sieh, wer dir 🍻 gesendet hat",
    "featureFilters": "✓ Erweiterte Filter",
    "featureLocation": "✓ Standort ändern",
    "featureMessages": "✓ Direkte Nachrichten",
    "featurePhotos": "✓ Mehr Profilfotos",
    "featureRewind": "✓ Übersprungene Profile erneut ansehen",
    "flowAccent": "Chat.",
    "flowCopy": "Entdecke Leute in deiner Nähe, tauscht Cheers aus und startet ein Gespräch. Diese Beispielprofile zeigen dir den Ablauf.",
    "flowEyebrow": "ENTDECKE SIPMATE",
    "flowLead": "In der Nähe. Cheers.",
    "hangingOut": "🍹 Zusammensitzen",
    "heroAccent": "EINEN DRINK?",
    "heroLead": "LUST AUF",
    "howEyebrow": "SO FUNKTIONIERT SIPMATE",
    "imprint": "Impressum",
    "instagramLabel": "SipMate auf Instagram",
    "languageLabel": "Sprache",
    "loading": "Wird gesendet…",
    "message": "Nachricht…",
    "metaDescription": "SipMate — finde Leute in deiner Nähe für einen Drink, Kaffee oder ein spontanes Treffen. Kein Dating. Einfach gute Gesellschaft.",
    "mutualLabel": "GEGENSEITIGER CHEERS",
    "mutualShort": "Es ist gegenseitig.",
    "nearbyDistance": "IN DER NÄHE · 800 m",
    "nearbyTab": "In der Nähe",
    "noSpam": "Kein Spam. Nur Neuigkeiten zum Start und ab und zu ein Anlass zum Anstoßen.",
    "pageTitle": "SipMate — Lust auf einen Drink?",
    "party": "🎉 Feiern",
    "people": "Deine Leute.",
    "portraitAlt": "Beispielfoto für das fiktive Demoprofil Laura",
    "premiumAccent": "Mehr Möglichkeiten, Leute kennenzulernen.",
    "premiumCopy": "Premium hält SipMate einfach und gibt dir dabei mehr Freiheit.",
    "premiumLead": "Mehr Kontrolle.",
    "privacy": "Datenschutz",
    "read": "GELESEN",
    "sendCheers": "🍻 Cheers senden",
    "startChat": "Chat starten",
    "terms": "Nutzungsbedingungen",
    "tiktokLabel": "SipMate auf TikTok",
    "vibe": "Deine Stimmung.",
    "vibesCopy": "Sei aktiv, wenn du Lust auf Gesellschaft hast. Bleib unsichtbar, wenn du Ruhe möchtest. Bei SipMate geht es um gemeinsame Zeit — nicht ums Sammeln von Matches.",
    "vibesEyebrow": "WORAUF DU AUCH LUST HAST",
    "waitEyebrow": "DIE NÄCHSTE RUNDE IST NÄHER, ALS DU DENKST.",
    "wine": "🥂 Wein",
    "online": "Jetzt online",
    "today": "HEUTE",
    "profileTab": "Profil",
    "chatsTab": "Chats",
    "demoNote": "Beispielansicht der App · Fiktive Profile und Gespräche",
    "profileBio": "Guter Kaffee, spontane Pläne und noch bessere Gesellschaft.",
    "chatTime": "Gerade eben",
    "markoAlt": "Beispielfoto für das fiktive Demoprofil Marko"
  },
  "en": {
    "beer": "🍺 Beer",
    "bothUp": "You both want to hang out.",
    "chatHi": "Hey! 🍻",
    "chatInvite": "One drink tonight?",
    "chatYes": "Absolutely 😄",
    "city": "Your city.",
    "cocktails": "🍸 Cocktails",
    "coffee": "☕ Coffee",
    "currently": "Currently up for",
    "deleteAccount": "Delete account",
    "demoProfile": "Demo profile",
    "distance": "800 m away",
    "emailLabel": "Email",
    "featureCheers": "✓ See who sent you 🍻",
    "featureFilters": "✓ Advanced filters",
    "featureLocation": "✓ Change your location",
    "featureMessages": "✓ Direct messaging features",
    "featurePhotos": "✓ More profile photos",
    "featureRewind": "✓ Rewind skipped profiles",
    "flowAccent": "Chat.",
    "flowCopy": "Discover people nearby, exchange Cheers and start a conversation. These profiles show how it works.",
    "flowEyebrow": "MEET SIPMATE",
    "flowLead": "Nearby. Cheers.",
    "hangingOut": "🍹 Hanging out",
    "heroAccent": "A DRINK?",
    "heroLead": "READY FOR",
    "howEyebrow": "HOW SIPMATE WORKS",
    "imprint": "Imprint",
    "instagramLabel": "SipMate on Instagram",
    "languageLabel": "Language",
    "loading": "Sending…",
    "message": "Message…",
    "metaDescription": "SipMate — find nearby people for a drink, coffee or a spontaneous hangout. Not dating. Just good company.",
    "mutualLabel": "MUTUAL CHEERS",
    "mutualShort": "It’s mutual.",
    "nearbyDistance": "NEARBY · 800 m",
    "nearbyTab": "Nearby",
    "noSpam": "No spam. Just launch news and the occasional reason to raise a glass.",
    "pageTitle": "SipMate — Ready for a drink?",
    "party": "🎉 Party",
    "people": "Your people.",
    "portraitAlt": "Illustrative photo for the fictional Laura demo profile",
    "premiumAccent": "More ways to connect.",
    "premiumCopy": "Premium keeps the SipMate idea simple while giving you more freedom.",
    "premiumLead": "More control.",
    "privacy": "Privacy",
    "read": "READ",
    "sendCheers": "🍻 Send Cheers",
    "startChat": "Start chat",
    "terms": "Terms",
    "tiktokLabel": "SipMate on TikTok",
    "vibe": "Your vibe.",
    "vibesCopy": "Go active when you feel social. Go invisible when you don’t. SipMate is about right now — not collecting matches.",
    "vibesEyebrow": "WHATEVER YOU’RE UP FOR",
    "waitEyebrow": "THE NEXT ROUND IS CLOSER THAN YOU THINK.",
    "wine": "🥂 Wine",
    "online": "Online now",
    "today": "TODAY",
    "profileTab": "Profile",
    "chatsTab": "Chats",
    "demoNote": "Illustrative app preview · Fictional profiles and conversations",
    "profileBio": "Good coffee, spontaneous plans and even better company.",
    "chatTime": "Just now",
    "markoAlt": "Illustrative photo for the fictional Marko demo profile"
  },
  "hr": {
    "beer": "🍺 Pivo",
    "bothUp": "Oboje ste za druženje.",
    "chatHi": "Bok! 🍻",
    "chatInvite": "Idemo večeras na piće?",
    "chatYes": "Naravno 😄",
    "city": "Tvoj grad.",
    "cocktails": "🍸 Koktele",
    "coffee": "☕ Kavu",
    "currently": "Trenutno za",
    "deleteAccount": "Brisanje računa",
    "demoProfile": "Primjer profila",
    "distance": "Udaljenost: 800 m",
    "emailLabel": "E-mail adresa",
    "featureCheers": "✓ Vidi tko ti je poslao 🍻",
    "featureFilters": "✓ Napredni filtri",
    "featureLocation": "✓ Promijeni lokaciju",
    "featureMessages": "✓ Izravno slanje poruka",
    "featurePhotos": "✓ Više profilnih fotografija",
    "featureRewind": "✓ Vrati preskočene profile",
    "flowAccent": "Razgovor.",
    "flowCopy": "Pronađi ljude u blizini, razmijenite Cheers i započnite razgovor. Ovi profili pokazuju kako to izgleda.",
    "flowEyebrow": "UPOZNAJ SIPMATE",
    "flowLead": "U blizini. Cheers.",
    "hangingOut": "🍹 Druženje",
    "heroAccent": "PIĆE?",
    "heroLead": "JESI ZA",
    "howEyebrow": "KAKO SIPMATE RADI",
    "imprint": "Podaci o vlasniku",
    "instagramLabel": "SipMate na Instagramu",
    "languageLabel": "Jezik",
    "loading": "Šaljem…",
    "message": "Poruka…",
    "metaDescription": "SipMate — pronađi ljude u blizini za piće, kavu ili spontano druženje. Nije dating. Samo dobro društvo.",
    "mutualLabel": "UZAJAMNI CHEERS",
    "mutualShort": "Obostrano je.",
    "nearbyDistance": "U BLIZINI · 800 m",
    "nearbyTab": "U blizini",
    "noSpam": "Bez spama. Samo novosti o pokretanju i poneki povod za zdravicu.",
    "pageTitle": "SipMate — Jesi za piće?",
    "party": "🎉 Izlazak",
    "people": "Tvoja ekipa.",
    "portraitAlt": "Ilustrativna fotografija za izmišljeni demo profil Laure",
    "premiumAccent": "Više načina za povezivanje.",
    "premiumCopy": "Premium zadržava jednostavnost SipMatea i daje ti više slobode.",
    "premiumLead": "Više kontrole.",
    "privacy": "Privatnost",
    "read": "PROČITANO",
    "sendCheers": "🍻 Pošalji Cheers",
    "startChat": "Započni razgovor",
    "terms": "Uvjeti korištenja",
    "tiktokLabel": "SipMate na TikToku",
    "vibe": "Tvoje raspoloženje.",
    "vibesCopy": "Uključi aktivnost kad si za društvo. Sakrij se kad želiš mir. SipMate je za druženje sada — ne za skupljanje spojeva.",
    "vibesEyebrow": "ZA ŠTO GOD SI RASPOLOŽEN/A",
    "waitEyebrow": "SLJEDEĆA RUNDA BLIŽE JE NEGO ŠTO MISLIŠ.",
    "wine": "🥂 Vino",
    "online": "Trenutno aktivan/na",
    "today": "DANAS",
    "profileTab": "Profil",
    "chatsTab": "Razgovori",
    "demoNote": "Ilustrativni prikaz aplikacije · Izmišljeni profili i razgovori",
    "profileBio": "Dobra kava, spontani planovi i još bolje društvo.",
    "chatTime": "Upravo sada",
    "markoAlt": "Ilustrativna fotografija za izmišljeni demo profil Marka"
  }
};
Object.keys(additionalTranslations).forEach(lang => Object.assign(translations[lang], additionalTranslations[lang]));

let savedLocale;
try { savedLocale = localStorage.getItem('sipmate-locale'); } catch (_) { /* Storage may be blocked. */ }
let locale = savedLocale || ((navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : (navigator.language || '').toLowerCase().startsWith('hr') ? 'hr' : 'en');
function applyLocale(lang) {
  locale = Object.prototype.hasOwnProperty.call(translations, lang) ? lang : 'en';
  try { localStorage.setItem('sipmate-locale', locale); } catch (_) { /* Keep this session usable. */ }
  document.documentElement.lang = locale;
  document.querySelectorAll('[data-i18n]').forEach(el => { const value = translations[locale][el.dataset.i18n]; if (value) el.textContent = value; });
  document.querySelectorAll('[data-lang]').forEach(el => {
    const active = el.dataset.lang === locale;
    el.classList.toggle('active', active);
    el.setAttribute('aria-pressed', String(active));
  });
  [['[data-i18n-aria]', 'i18nAria', 'aria-label'], ['[data-i18n-alt]', 'i18nAlt', 'alt'], ['[data-i18n-content]', 'i18nContent', 'content']].forEach(([selector, key, attribute]) => {
    document.querySelectorAll(selector).forEach(el => el.setAttribute(attribute, translations[locale][el.dataset[key]]));
  });
  const email = document.getElementById('email'); if (email) email.placeholder = translations[locale].placeholder;
}
document.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => applyLocale(btn.dataset.lang)));
applyLocale(locale);

const form = document.getElementById('waitlist-form');
const status = document.getElementById('form-status');
const endpoint = 'https://poatmbsfglhrcdbosinb.supabase.co/functions/v1/join-waitlist';
translations.en.timeout = 'The request took too long. Please try again.';
translations.de.timeout = 'Die Anfrage dauert zu lange. Bitte versuche es erneut.';
translations.hr.timeout = 'Zahtjev traje predugo. Pokušaj ponovno.';

let submitting = false;
if (form && status) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    const email = String(new FormData(form).get('email') || '').trim();
    if (!email) return;
    const button = form.querySelector('button');
    submitting = true; button.disabled = true;
    status.dataset.i18n = 'loading'; status.textContent = translations[locale].loading;
    form.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, { signal:controller.signal, method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, locale}) });
      const data = await response.json();
      if (!response.ok || data?.ok !== true) throw new Error('request_failed');
      status.dataset.i18n = data.already ? 'already' : 'success';
      status.textContent = translations[locale][status.dataset.i18n];
      form.reset();
    } catch (error) {
      status.dataset.i18n = error.name === 'AbortError' ? 'timeout' : 'error';
      status.textContent = translations[locale][status.dataset.i18n];
    } finally {
      clearTimeout(timer);
      submitting = false; button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}