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

let savedLocale;
try { savedLocale = localStorage.getItem('sipmate-locale'); } catch (_) { /* Storage may be blocked. */ }
let locale = savedLocale || ((navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : (navigator.language || '').toLowerCase().startsWith('hr') ? 'hr' : 'en');
function applyLocale(lang) {
  locale = Object.prototype.hasOwnProperty.call(translations, lang) ? lang : 'en';
  try { localStorage.setItem('sipmate-locale', locale); } catch (_) { /* Keep this session usable. */ }
  document.documentElement.lang = locale;
  document.querySelectorAll('[data-i18n]').forEach(el => { const value = translations[locale][el.dataset.i18n]; if (value) el.textContent = value; });
  document.querySelectorAll('[data-lang]').forEach(el => el.classList.toggle('active', el.dataset.lang === locale));
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
    submitting = true; button.disabled = true; status.textContent = '…';
    form.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, { signal:controller.signal, method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, locale}) });
      const data = await response.json();
      if (!response.ok || data?.ok !== true) throw new Error('request_failed');
      status.textContent = data.already ? translations[locale].already : translations[locale].success;
      form.reset();
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? translations[locale].timeout : translations[locale].error;
    } finally {
      clearTimeout(timer);
      submitting = false; button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}