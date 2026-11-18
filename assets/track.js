/* TMB Magic Box · contador de visitas propio (Supabase public.page_views).
   No guarda IPs. Nunca rompe la página: todo va en try/catch y en segundo plano.
   No cuenta: a Diego (localStorage tmb_admin=1, se pone al entrar al CRM o con ?tmb_admin=1),
   bots/navegadores headless, ni copias fuera de tmbmagicbox.studio. */
(function () {
  try {
    var SB = 'https://sykmmqnevygujsdsyynw.supabase.co';
    var SK = 'sb_publishable_NGxuPwPjbplZ28MVp1jKAQ_9NC4sf_T';
    var w = window, d = document, n = navigator || {}, L = location;
    var ua = String(n.userAgent || '');
    var qs = {};
    try { new URLSearchParams(L.search).forEach(function (v, k) { qs[k.toLowerCase()] = v; }); } catch (e) {}

    function ls(k, v) { try { if (v === undefined) return w.localStorage.getItem(k); w.localStorage.setItem(k, v); } catch (e) { return null; } }
    function ss(k, v) { try { if (v === undefined) return w.sessionStorage.getItem(k); w.sessionStorage.setItem(k, v); } catch (e) { return null; } }
    function cut(s, max) { s = s == null ? '' : String(s).trim(); return s ? s.slice(0, max) : null; }

    if (qs.tmb_admin === '1') ls('tmb_admin', '1');
    if (qs.tmb_admin === '0') { try { w.localStorage.removeItem('tmb_admin'); } catch (e) {} }
    if (ls('tmb_admin') === '1') return;
    if (!/(^|\.)tmbmagicbox\.studio$/i.test(L.hostname)) return;
    if (n.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|phantom|puppeteer|playwright|selenium|preview|facebookexternalhit|embedly|vercel|curl|wget|python|axios|node-fetch/i.test(ua)) return;
    if (d.visibilityState === 'prerender') return;

    // Página normalizada: "/", "/arknag/", "/p/sweet-ice/"
    var page = String(L.pathname || '/').toLowerCase().replace(/\/index\.html?$/, '/').replace(/\.html?$/, '/').replace(/\/{2,}/g, '/');
    if (page.charAt(page.length - 1) !== '/') page += '/';
    page = page.slice(0, 120);

    // Origen
    var ref = '', host = L.hostname.replace(/^www\./, '');
    try { ref = d.referrer ? new URL(d.referrer).hostname.toLowerCase().replace(/^www\./, '') : ''; } catch (e) {}
    var internal = ref && ref === host;
    function fromName(s) {
      s = String(s || '').toLowerCase();
      if (!s) return null;
      if (/google|gclid|gmb|gbp|maps/.test(s)) return 'google';
      if (/^ig$|insta/.test(s)) return 'instagram';
      if (/^fb$|facebook|messenger|meta/.test(s)) return 'facebook';
      if (/^wa$|whats|wa\.me/.test(s)) return 'whatsapp';
      if (/^tt$|tiktok/.test(s)) return 'tiktok';
      if (/direct|directo|none/.test(s)) return 'directo';
      return 'otro';
    }
    function fromHost(h) {
      if (!h) return null;
      if (/(^|\.)google\.|(^|\.)googleusercontent\.com$|android-app:\/\/com\.google/.test(h)) return 'google';
      if (/(^|\.)instagram\.com$|(^|\.)ig\.me$/.test(h)) return 'instagram';
      if (/(^|\.)facebook\.com$|(^|\.)fb\.(com|me)$|(^|\.)messenger\.com$/.test(h)) return 'facebook';
      if (/(^|\.)whatsapp\.(com|net)$|(^|\.)wa\.me$/.test(h)) return 'whatsapp';
      if (/(^|\.)tiktok\.com$|(^|\.)tiktokv\.com$/.test(h)) return 'tiktok';
      return 'otro';
    }
    function fromApp() {
      if (/Instagram/i.test(ua)) return 'instagram';
      if (/FBAN|FBAV|FB_IAB|FBIOS|\bFB4A\b|Messenger/i.test(ua)) return 'facebook';
      if (/musical_ly|BytedanceWebview|TikTok|trill/i.test(ua)) return 'tiktok';
      if (/WhatsApp/i.test(ua)) return 'whatsapp';
      return null;
    }
    var source = fromName(qs.utm_source) || (qs.gclid ? 'google' : null) || (qs.fbclid ? 'facebook' : null);
    var refHost = internal ? null : cut(ref, 120);
    if (!source && internal) source = ss('tmb_src'); // navegación dentro del sitio: hereda el origen de la sesión
    if (!source) source = refHost ? fromHost(refHost) : (fromApp() || 'directo');
    if (!ss('tmb_src') || !internal) ss('tmb_src', source);

    // Dispositivo
    var device = /iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && (n.maxTouchPoints || 0) > 1)
      ? 'tablet' : (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua) ? 'movil' : 'compu');

    // Sesión (se reinicia al cerrar la pestaña)
    var sid = ss('tmb_sid');
    if (!sid || sid.length < 8) {
      try { sid = (w.crypto && crypto.randomUUID) ? crypto.randomUUID() : null; } catch (e) { sid = null; }
      if (!sid) sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      ss('tmb_sid', sid);
    }

    var row = {
      page: page, referrer_host: refHost, source: source, device: device,
      country: null, city: null, lang: cut(n.language || (n.languages && n.languages[0]), 20), session_id: sid.slice(0, 64)
    };

    var sent = false;
    function send() {
      if (sent) return; sent = true;
      try {
        fetch(SB + '/rest/v1/page_views', {
          method: 'POST', keepalive: true, credentials: 'omit',
          headers: { apikey: SK, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(row)
        }).catch(function () {});
      } catch (e) {}
    }

    function geo(done) {
      var c = ss('tmb_geo');
      if (c) { try { var g = JSON.parse(c); row.country = g[0]; row.city = g[1]; } catch (e) {} return done(); }
      if (!w.fetch) return done();
      var finished = false, ctl = null;
      function fin() { if (finished) return; finished = true; done(); }
      try { ctl = new AbortController(); } catch (e) {}
      var t = setTimeout(function () { try { ctl && ctl.abort(); } catch (e) {} fin(); }, 2500);
      fetch('https://get.geojs.io/v1/ip/geo.json', { credentials: 'omit', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (g) {
          if (g) {
            row.country = cut(g.country, 60); row.city = cut(g.city, 80);
            ss('tmb_geo', JSON.stringify([row.country, row.city]));
          }
        })
        .catch(function () {})
        .then(function () { clearTimeout(t); fin(); });
    }

    function go() { try { geo(send); } catch (e) { send(); } }
    if (d.readyState === 'complete') setTimeout(go, 300);
    else w.addEventListener('load', function () { setTimeout(go, 300); });
  } catch (e) { /* nunca romper la página */ }
})();
