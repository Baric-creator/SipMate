(() => {
  const copy = {
    en: {
      nav: 'Giveaway',
      eyebrow: 'SIPMATE GIVEAWAY',
      title: 'BRING 25. GET 1 YEAR.',
      text: 'Invite 25 real new Discord members and unlock 12 months of SipMate Premium.',
      button: 'Join the Giveaway',
      rules: 'No bots. No alts. Real people only.'
    },
    de: {
      nav: 'Giveaway',
      eyebrow: 'SIPMATE GIVEAWAY',
      title: 'BRING 25. GET 1 YEAR.',
      text: 'Bringe 25 echte neue Discord-Mitglieder und erhalte 12 Monate SipMate Premium.',
      button: 'Zum Giveaway',
      rules: 'Keine Bots. Keine Alt-Accounts. Nur echte Menschen.'
    },
    hr: {
      nav: 'Giveaway',
      eyebrow: 'SIPMATE GIVEAWAY',
      title: 'BRING 25. GET 1 YEAR.',
      text: 'Dovedi 25 stvarnih novih Discord članova i osvoji 12 mjeseci SipMate Premiuma.',
      button: 'Pridruži se Giveawayu',
      rules: 'Bez botova. Bez alt računa. Samo stvarni ljudi.'
    }
  };

  const targetUrl = './discord-giveaway.html';

  function locale() {
    try {
      const saved = localStorage.getItem('sipmate-locale');
      if (saved && copy[saved]) return saved;
    } catch (_) {}
    const lang = (document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase();
    return copy[lang] ? lang : 'en';
  }

  function injectStyle() {
    if (document.getElementById('giveaway-promo-style')) return;
    const style = document.createElement('style');
    style.id = 'giveaway-promo-style';
    style.textContent = `
      .nav-giveaway{position:relative;color:#fff!important;text-decoration:none;font-weight:800;padding:10px 14px;border:1px solid rgba(255,59,48,.5);border-radius:999px;background:linear-gradient(180deg,rgba(255,59,48,.14),rgba(255,59,48,.05));box-shadow:0 0 0 1px rgba(255,59,48,.05) inset;transition:.2s ease}
      .nav-giveaway:hover{transform:translateY(-1px);border-color:#ff3b30;box-shadow:0 0 22px rgba(255,59,48,.22)}
      .nav-giveaway::after{content:'NEW';position:absolute;top:-9px;right:-7px;font-size:8px;letter-spacing:.7px;color:#fff;background:#ff3b30;border-radius:999px;padding:2px 5px;box-shadow:0 0 12px rgba(255,59,48,.45)}
      .giveaway-home{width:min(1180px,calc(100% - 40px));margin:0 auto 38px}
      .giveaway-home-card{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:30px;align-items:center;padding:34px;border-radius:28px;border:1px solid rgba(255,59,48,.36);background:radial-gradient(circle at 85% 20%,rgba(255,59,48,.18),transparent 34%),linear-gradient(145deg,#17100f,#0b0b0d 70%);box-shadow:0 22px 70px rgba(0,0,0,.28)}
      .giveaway-home-card::before{content:'';position:absolute;width:230px;height:230px;border-radius:50%;right:-85px;bottom:-130px;background:rgba(255,59,48,.14);filter:blur(8px)}
      .giveaway-home-copy{position:relative;z-index:1}
      .giveaway-home-eyebrow{margin:0 0 10px;color:#ff655c;font-size:11px;font-weight:900;letter-spacing:2px}
      .giveaway-home-title{margin:0 0 13px;font-size:clamp(34px,5vw,62px);line-height:.94;letter-spacing:-2.5px}
      .giveaway-home-text{margin:0;max-width:720px;color:#b7b3b1;line-height:1.65;font-size:16px}
      .giveaway-home-rules{display:block;margin-top:11px;color:#777;font-size:12px;font-weight:700;letter-spacing:.2px}
      .giveaway-home-action{position:relative;z-index:1;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 22px;border-radius:14px;background:#ff3b30;color:#fff;text-decoration:none;font-weight:900;box-shadow:0 12px 35px rgba(255,59,48,.22);transition:.2s ease}
      .giveaway-home-action:hover{transform:translateY(-2px);box-shadow:0 16px 42px rgba(255,59,48,.32)}
      @media(max-width:900px){.giveaway-home-card{grid-template-columns:1fr}.giveaway-home-action{justify-self:start}.nav-giveaway{width:max-content}}
      @media(max-width:560px){.giveaway-home{width:min(100% - 28px,1180px)}.giveaway-home-card{padding:25px 20px}.giveaway-home-title{letter-spacing:-1.8px}.giveaway-home-action{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureNav() {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;
    let link = nav.querySelector('.nav-giveaway');
    if (!link) {
      link = document.createElement('a');
      link.className = 'nav-giveaway';
      link.href = targetUrl;
      const community = nav.querySelector('a[href="#community"]');
      if (community) community.insertAdjacentElement('afterend', link);
      else nav.prepend(link);
    }
    link.textContent = copy[locale()].nav;
    link.setAttribute('aria-label', copy[locale()].nav);
  }

  function ensureBanner() {
    let section = document.querySelector('.giveaway-home');
    if (!section) {
      section = document.createElement('section');
      section.className = 'giveaway-home reveal visible';
      section.innerHTML = `
        <div class="giveaway-home-card">
          <div class="giveaway-home-copy">
            <p class="giveaway-home-eyebrow"></p>
            <h2 class="giveaway-home-title"></h2>
            <p class="giveaway-home-text"></p>
            <span class="giveaway-home-rules"></span>
          </div>
          <a class="giveaway-home-action" href="${targetUrl}"></a>
        </div>`;
      const hero = document.querySelector('.hero');
      const polish = document.querySelector('.polish-strip');
      if (polish) polish.insertAdjacentElement('beforebegin', section);
      else if (hero) hero.insertAdjacentElement('afterend', section);
      else document.querySelector('main')?.prepend(section);
    }
    const c = copy[locale()];
    section.querySelector('.giveaway-home-eyebrow').textContent = c.eyebrow;
    section.querySelector('.giveaway-home-title').textContent = c.title;
    section.querySelector('.giveaway-home-text').textContent = c.text;
    section.querySelector('.giveaway-home-rules').textContent = c.rules;
    section.querySelector('.giveaway-home-action').textContent = c.button;
  }

  function render() {
    injectStyle();
    ensureNav();
    ensureBanner();
  }

  render();
  window.addEventListener('load', render, { once: true });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-lang]')) setTimeout(render, 0);
  });
  window.addEventListener('storage', (event) => {
    if (event.key === 'sipmate-locale') render();
  });
})();
