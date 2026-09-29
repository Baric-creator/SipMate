(() => {
  const copy = {
    en: { photos: '✓ Up to 10 profile photos', spots: '✓ SipMate Spots — nearby bars, cafés, pubs & restaurants' },
    de: { photos: '✓ Bis zu 10 Profilfotos', spots: '✓ SipMate Spots — Bars, Cafés, Pubs & Restaurants in deiner Nähe' },
    hr: { photos: '✓ Do 10 profilnih fotografija', spots: '✓ SipMate Spots — barovi, kafići, pubovi i restorani u blizini' },
  };

  function locale() {
    const lang = (document.documentElement.lang || 'en').split('-')[0].toLowerCase();
    return copy[lang] ? lang : 'en';
  }

  function syncHomePremium() {
    const list = document.querySelector('.premium-benefits');
    if (!list) return;
    const text = copy[locale()];
    const photos = list.querySelector('[data-i18n="featurePhotos"]');
    if (photos) photos.textContent = text.photos;
    let spots = list.querySelector('[data-premium-spots]');
    if (!spots) {
      spots = document.createElement('div');
      spots.dataset.premiumSpots = 'true';
      list.appendChild(spots);
    }
    spots.textContent = text.spots;
  }

  function syncPremiumAccountPage() {
    const list = document.querySelector('.features');
    if (!list || !location.pathname.endsWith('/premium.html')) return;
    const text = copy[locale()];
    const items = [...list.querySelectorAll('.feature')];
    const photos = items.find((el) => /profile photos|profilfotos|profilnih fotografija/i.test(el.textContent || ''));
    if (photos) photos.textContent = text.photos;
    let spots = list.querySelector('[data-premium-spots]');
    if (!spots) {
      spots = document.createElement('div');
      spots.className = 'feature';
      spots.dataset.premiumSpots = 'true';
      list.appendChild(spots);
    }
    spots.textContent = text.spots;
  }

  function sync() {
    syncHomePremium();
    syncPremiumAccountPage();
  }

  sync();
  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => setTimeout(sync, 0));
  });
})();
