(() => {
  function load(src, done) {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    if (done) s.onload = done;
    document.head.appendChild(s);
  }
  load('./script-core.js', () => load('./launch-cta.js'));
})();
