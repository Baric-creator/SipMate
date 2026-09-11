(() => {
  const ENDPOINT = "https://poatmbsfglhrcdbosinb.supabase.co/functions/v1/public-launch-status";
  const labels = {
    en: { preregister: "Pre-register on Google Play", live: "Download on Google Play", preregStatus: "PRE-REGISTRATION", liveStatus: "LIVE NOW" },
    de: { preregister: "Bei Google Play vorregistrieren", live: "Bei Google Play herunterladen", preregStatus: "VORREGISTRIERUNG", liveStatus: "JETZT LIVE" },
    hr: { preregister: "Predregistriraj se na Google Playu", live: "Preuzmi na Google Playu", preregStatus: "PREDREGISTRACIJA", liveStatus: "APLIKACIJA JE VANi" }
  };

  function getLocale() {
    try {
      const saved = localStorage.getItem("sipmate-locale");
      if (saved && labels[saved]) return saved;
    } catch {}
    const browser = (document.documentElement.lang || navigator.language || "en").slice(0, 2).toLowerCase();
    return labels[browser] ? browser : "en";
  }

  function setCtaText(anchor, text) {
    const span = anchor.querySelector("[data-i18n='join']");
    if (span) span.textContent = text;
    else anchor.textContent = `▶ ${text}`;
  }

  function applyLaunchState(data) {
    const phase = String(data?.launch?.phase || data?.launch_phase || "waitlist").toLowerCase();
    const playUrl = data?.launch?.play_store_url || data?.play_store_url || "";
    if (!playUrl || !["preregister", "live"].includes(phase)) return;

    const locale = getLocale();
    const copy = labels[locale] || labels.en;
    const text = phase === "live" ? copy.live : copy.preregister;

    document.querySelectorAll('a[href="#waitlist"]').forEach(anchor => {
      anchor.href = "./download.html";
      anchor.dataset.launchCta = phase;
      setCtaText(anchor, text);
      anchor.setAttribute("aria-label", text);
    });

    const status = document.querySelector(".launch-status span[data-i18n='launchStatus'], .launch-status span:last-child");
    if (status) status.textContent = phase === "live" ? copy.liveStatus : copy.preregStatus;

    document.body.dataset.launchPhase = phase;
  }

  async function refreshLaunchCtas() {
    try {
      const response = await fetch(ENDPOINT, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (data?.ok !== true) return;
      applyLaunchState(data);
    } catch {}
  }

  refreshLaunchCtas();
  setInterval(refreshLaunchCtas, 60000);
  window.addEventListener("storage", event => {
    if (event.key === "sipmate-locale") refreshLaunchCtas();
  });
})();
