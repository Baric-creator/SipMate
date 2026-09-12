(() => {
  const SEO_COPY = {
    en: {
      title: 'SipMate — Meet Nearby People for Drinks & Hangouts',
      description: "SipMate helps you meet nearby people for drinks, coffee and spontaneous hangouts. Discover who's active, send a Cheers and chat when it's mutual."
    },
    de: {
      title: 'SipMate — Leute für Drinks & spontane Treffen finden',
      description: 'SipMate bringt dich mit Leuten in deiner Nähe für Drinks, Kaffee und spontane Treffen zusammen. Entdecken, Cheers senden und bei gegenseitigem Interesse chatten.'
    },
    hr: {
      title: 'SipMate — Pronađi ekipu za piće i druženje u blizini',
      description: 'SipMate ti pomaže pronaći ljude u blizini za piće, kavu i spontano druženje. Otkrij aktivne korisnike, pošalji Cheers i razgovaraj kad je obostrano.'
    }
  };

  function currentLocale() {
    const lang = (document.documentElement.lang || 'en').toLowerCase().split('-')[0];
    return SEO_COPY[lang] ? lang : 'en';
  }

  function applySeoCopy() {
    const copy = SEO_COPY[currentLocale()];
    document.title = copy.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', copy.description);
  }

  function addImageAlts() {
    document.querySelectorAll('img').forEach((img) => {
      if ((img.getAttribute('alt') || '').trim()) return;
      if (img.classList.contains('chat-avatar')) {
        img.alt = 'Illustrative photo for fictional Laura demo profile';
      } else if (img.classList.contains('face-photo')) {
        img.alt = 'Illustrative SipMate demo profile photo';
      } else {
        img.alt = 'SipMate visual';
      }
    });
  }

  function addOrganizationLogo() {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '{}');
        const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
        const org = graph.find((item) => item && item['@type'] === 'Organization');
        if (!org) continue;
        if (!org.logo) {
          org.logo = {
            '@type': 'ImageObject',
            url: 'https://officialsipmate.com/social-card.svg'
          };
          script.textContent = JSON.stringify(data);
        }
        break;
      } catch (_) {}
    }
  }

  function applyAll() {
    applySeoCopy();
    addImageAlts();
    addOrganizationLogo();
  }

  applyAll();
  window.addEventListener('load', applyAll, { once: true });
  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => setTimeout(applySeoCopy, 0));
  });
})();
