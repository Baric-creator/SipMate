(() => {
  function load(src, done) {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    if (done) s.onload = done;
    document.head.appendChild(s);
  }
  load('./waitlist-reminder.js', () => load('./script-core.js', () => load('./seo-polish.js', () => load('./launch-cta.js'))));
})();
