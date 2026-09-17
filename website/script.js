(() => {
  function load(src, done) {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    if (done) s.onload = done;
    document.head.appendChild(s);
  }
  load('./analytics.js', () => load('./waitlist-reminder.js', () => load('./script-core.js', () => load('./giveaway-promo.js', () => load('./seo-polish.js', () => load('./launch-cta.js'))))));
})();
