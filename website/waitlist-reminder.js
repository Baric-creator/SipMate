(() => {
  const JOIN_ENDPOINT = 'https://poatmbsfglhrcdbosinb.supabase.co/functions/v1/join-waitlist';

  const copy = {
    en: {
      preTitle: 'Remember to confirm your email',
      preBody: 'After you join the waitlist, we’ll send you a confirmation link. Check your inbox and confirm it to secure your SipMate spot.',
      sentTitle: 'Confirm your email',
      sentBody: 'We sent you a confirmation link. Check your inbox and confirm your email to secure your SipMate spot.',
      note: 'Just a quick reminder — this disappears automatically.'
    },
    de: {
      preTitle: 'E-Mail-Bestätigung nicht vergessen',
      preBody: 'Nach deiner Anmeldung senden wir dir einen Bestätigungslink. Prüfe dein Postfach und bestätige deine E-Mail, um deinen SipMate-Platz zu sichern.',
      sentTitle: 'Bestätige deine E-Mail',
      sentBody: 'Wir haben dir einen Bestätigungslink geschickt. Prüfe dein Postfach und bestätige deine E-Mail, um deinen SipMate-Platz zu sichern.',
      note: 'Nur eine kurze Erinnerung — sie verschwindet automatisch.'
    },
    hr: {
      preTitle: 'Ne zaboravi potvrditi e-mail',
      preBody: 'Nakon prijave poslat ćemo ti link za potvrdu. Provjeri inbox i potvrdi e-mail kako bi osigurao/la svoje mjesto na SipMate waitlisti.',
      sentTitle: 'Potvrdi svoj e-mail',
      sentBody: 'Poslali smo ti link za potvrdu. Provjeri inbox i potvrdi e-mail kako bi osigurao/la svoje mjesto na SipMate waitlisti.',
      note: 'Samo kratki podsjetnik — nestat će automatski.'
    }
  };

  let hideTimer = null;
  let typingReminderShown = false;

  function getLocale() {
    const lang = (document.documentElement.lang || 'en').toLowerCase().split('-')[0];
    return copy[lang] ? lang : 'en';
  }

  function ensureStyles() {
    if (document.getElementById('sipmate-confirm-reminder-style')) return;
    const style = document.createElement('style');
    style.id = 'sipmate-confirm-reminder-style';
    style.textContent = `
      .sipmate-confirm-reminder{position:fixed;z-index:9999;left:50%;top:24px;transform:translate(-50%,-18px) scale(.98);width:min(520px,calc(100% - 28px));opacity:0;pointer-events:none;transition:opacity .24s ease,transform .24s ease}
      .sipmate-confirm-reminder.show{opacity:1;transform:translate(-50%,0) scale(1);pointer-events:auto}
      .sipmate-confirm-card{position:relative;display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:start;padding:18px 18px 16px;border:1px solid rgba(255,74,64,.42);border-radius:20px;background:linear-gradient(145deg,rgba(27,18,18,.98),rgba(12,12,13,.98));box-shadow:0 24px 70px rgba(0,0,0,.52),0 0 35px rgba(255,59,48,.10);backdrop-filter:blur(16px);color:#fff;font-family:Inter,Arial,sans-serif}
      .sipmate-confirm-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:rgba(255,59,48,.12);border:1px solid rgba(255,59,48,.24);font-size:22px}
      .sipmate-confirm-copy strong{display:block;font-size:15px;line-height:1.25;margin:1px 0 5px}
      .sipmate-confirm-copy p{margin:0;color:#b8b8bf;font-size:12px;line-height:1.55}
      .sipmate-confirm-copy small{display:block;margin-top:7px;color:#707078;font-size:10px;line-height:1.4}
      .sipmate-confirm-close{width:30px;height:30px;border:0;border-radius:10px;background:transparent;color:#85858c;font-size:18px;line-height:1;cursor:pointer;transition:.18s ease}
      .sipmate-confirm-close:hover{background:#1d1d20;color:#fff}
      .sipmate-confirm-progress{position:absolute;left:14px;right:14px;bottom:0;height:2px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.05)}
      .sipmate-confirm-progress i{display:block;height:100%;width:100%;transform-origin:left;background:#ff3b30;animation:sipmate-reminder-countdown 6s linear forwards}
      @keyframes sipmate-reminder-countdown{to{transform:scaleX(0)}}
      @media(max-width:640px){.sipmate-confirm-reminder{top:14px}.sipmate-confirm-card{grid-template-columns:auto 1fr;padding:15px 14px 14px}.sipmate-confirm-close{position:absolute;right:8px;top:8px}.sipmate-confirm-copy{padding-right:22px}}
      @media(prefers-reduced-motion:reduce){.sipmate-confirm-reminder{transition:none}.sipmate-confirm-progress i{animation:none}}
    `;
    document.head.appendChild(style);
  }

  function hideReminder() {
    const el = document.getElementById('sipmate-confirm-reminder');
    if (!el) return;
    el.classList.remove('show');
    clearTimeout(hideTimer);
    setTimeout(() => el.remove(), 260);
  }

  function showReminder(mode = 'pre') {
    ensureStyles();
    document.getElementById('sipmate-confirm-reminder')?.remove();
    clearTimeout(hideTimer);

    const t = copy[getLocale()];
    const isSent = mode === 'sent';
    const title = isSent ? t.sentTitle : t.preTitle;
    const body = isSent ? t.sentBody : t.preBody;
    const wrap = document.createElement('div');
    wrap.id = 'sipmate-confirm-reminder';
    wrap.className = 'sipmate-confirm-reminder';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    wrap.innerHTML = `
      <div class="sipmate-confirm-card">
        <div class="sipmate-confirm-icon" aria-hidden="true">📩</div>
        <div class="sipmate-confirm-copy">
          <strong>${title}</strong>
          <p>${body}</p>
          <small>${t.note}</small>
        </div>
        <button type="button" class="sipmate-confirm-close" aria-label="Close">×</button>
        <div class="sipmate-confirm-progress" aria-hidden="true"><i></i></div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('.sipmate-confirm-close')?.addEventListener('click', hideReminder);
    requestAnimationFrame(() => wrap.classList.add('show'));
    hideTimer = setTimeout(hideReminder, 6000);
  }

  function attachTypingReminder() {
    const form = document.getElementById('waitlist-form');
    if (!form) return;
    const fields = form.querySelectorAll('input, textarea, select');
    const trigger = () => {
      if (typingReminderShown) return;
      typingReminderShown = true;
      showReminder('pre');
    };
    fields.forEach(field => {
      field.addEventListener('input', trigger, { once: false });
      field.addEventListener('change', trigger, { once: false });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachTypingReminder, { once: true });
  } else {
    attachTypingReminder();
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const input = args[0];
      const url = typeof input === 'string' ? input : input?.url;
      if (url === JOIN_ENDPOINT && response.ok) {
        const data = await response.clone().json();
        if (data?.ok === true && data?.email_sent === true && data?.confirmed !== true) {
          showReminder('sent');
        }
      }
    } catch {}
    return response;
  };
})();
