(() => {
  const CONFIG = Object.assign({
    apiUrl: '',
    thingspeakChannelId: '',
    deviceId: 'ijsberen-dulcopool-01',
    refreshMs: 90 * 1000,
    staleAfterMin: 45
  }, window.IJSBEREN_CONFIG || {});

  // Publiek ThingSpeak-kanaal: field1 = watertemperatuur (zie README §6.4)
  if (!CONFIG.apiUrl && CONFIG.thingspeakChannelId) {
    CONFIG.apiUrl = `https://api.thingspeak.com/channels/${encodeURIComponent(CONFIG.thingspeakChannelId)}/feeds/last.json`;
  }

  const TZ = 'Europe/Brussels';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ---------- Kalender 2026–2027 (bron: clubaffiches) ----------
  const EVENTS = {
    club: [
      { start: '2026-11-08', title: 'Maatjes' },
      { start: '2026-11-11', end: '2026-11-15', title: 'Afhalen ledenbandjes', note: 'woe 11, vrij 13, za 14 en zo 15 nov' },
      { start: '2026-11-21', end: '2026-11-22', title: 'Wellnessweekend' },
      { start: '2026-11-28', title: 'Putteke Winter', note: 'De Schorre, Boom', href: '#putteke-winter' },
      { start: '2026-12-13', title: 'Algemene ledenvergadering' },
      { start: '2026-12-19', title: 'Beregezellige' },
      { start: '2026-12-25', title: 'Kerstduik' },
      { start: '2027-01-01', title: 'Nieuwjaarsduik' },
      { start: '2027-01-13', title: 'Appelbollen & worstenbroden' },
      { start: '2027-01-24', title: 'Oesters & bubbels' },
      { start: '2027-01-31', title: 'Winterzwemfeest' },
      { start: '2027-02-27', title: 'Pannenkoeken' },
      { start: '2027-03-21', title: 'IJsberendoop' },
      { start: '2027-07-03', title: 'Dauwduik' },
      { start: '2027-08-28', title: 'Dauwduik' },
      { start: '2027-09-11', end: '2027-09-12', title: 'Opendeurweekend' }
    ],
    extern: [
      { start: '2026-11-08', title: 'SWEM Puyenbroek' },
      { start: '2026-11-29', title: 'Opendeur Mol', note: 'Aflossingswedstrijd & recreatief' },
      { start: '2026-12-06', title: 'Theux', note: 'Swimrun & recreatief' },
      { start: '2026-12-19', title: 'Feest Brugse IJsberen', note: 'Wedstrijd & recreatief' },
      { start: '2027-01-17', title: 'Deurnese IJsberen', note: 'Recreatief' },
      { start: '2027-02-14', title: 'VCool Huy – oversteek Maas', note: 'Wedstrijd & recreatief' },
      { start: '2027-02-28', title: 'Dendermondse IJsberen', note: 'Wedstrijd & recreatief' }
    ]
  };

  // Lokale "wandklok" in Brussel, ongeacht de tijdzone van de bezoeker.
  const brusselsNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);

  const fmtWd = new Intl.DateTimeFormat('nl-BE', { weekday: 'short' });
  const fmtMonth = new Intl.DateTimeFormat('nl-BE', { month: 'short' });
  const fmtWeekdayLong = new Intl.DateTimeFormat('nl-BE', { weekday: 'long' });
  const clean = (s) => s.replace('.', '');

  function renderEvents() {
    const today = startOfDay(brusselsNow());
    for (const [key, list] of Object.entries(EVENTS)) {
      const ol = $(`[data-events="${key}"]`);
      if (!ol) continue;
      let nextMarked = false;
      ol.innerHTML = '';
      for (const ev of list) {
        const start = parseDay(ev.start);
        const end = ev.end ? parseDay(ev.end) : start;
        const past = end < today;
        const isNext = !past && !nextMarked;
        if (isNext) nextMarked = true;

        const days = ev.end ? `${start.getDate()}–${end.getDate()}` : start.getDate();
        const wd = ev.end ? `${clean(fmtWd.format(start))}–${clean(fmtWd.format(end))}` : clean(fmtWd.format(start));
        const until = daysBetween(today, start);
        let when = '';
        if (!past) {
          if (start <= today) when = 'Nu bezig';
          else if (until === 1) when = 'Morgen';
          else if (until < 60) when = `over ${until} dagen`;
        }

        const li = document.createElement('li');
        li.className = 'event' + (past ? ' past' : '') + (isNext ? ' next' : '');
        li.innerHTML = `
          <div class="event-date"><span class="wd">${wd}</span><span class="d">${days}</span><span class="m">${clean(fmtMonth.format(start))}</span></div>
          <div>
            <h3>${ev.href ? `<a href="${ev.href}">${ev.title}</a>` : ev.title}${isNext ? '<span class="badge">Eerstvolgende</span>' : ''}</h3>
            ${ev.note ? `<p>${ev.note}</p>` : ''}
          </div>
          <span class="small">${when}</span>`;
        ol.appendChild(li);
      }
    }

    const next = EVENTS.club.find((ev) => parseDay(ev.end || ev.start) >= today);
    const slot = $('[data-next-event]');
    if (slot) {
      if (next) {
        const d = parseDay(next.start);
        slot.textContent = `${next.title} · ${d.getDate()} ${clean(fmtMonth.format(d))}`;
      } else {
        slot.textContent = 'Nieuwe kalender volgt';
      }
    }
  }

  function initTabs() {
    $$('.tabs [role="tab"]').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.tabs [role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
        $$('[data-events]').forEach((ol) => { ol.hidden = ol.dataset.events !== tab.dataset.tab; });
      });
    });
  }

  // ---------- Openingsuren ----------
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  function isHoliday(date) {
    const y = date.getFullYear();
    const key = (d) => `${d.getMonth() + 1}-${d.getDate()}`;
    const fixed = ['1-1', '5-1', '7-21', '8-15', '11-1', '11-11', '12-25'];
    const e = easter(y);
    const offset = (n) => key(new Date(y, e.getMonth(), e.getDate() + n));
    return [...fixed, offset(1), offset(39), offset(50)].includes(key(date));
  }
  function sessionOn(date) {
    if (isHoliday(date) || date.getDay() === 0 || date.getDay() === 6) return [10 * 60 + 30, 12 * 60 + 30];
    if (date.getDay() === 3 || date.getDay() === 5) return [18 * 60 + 30, 20 * 60 + 30];
    return null;
  }
  const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  function renderOpenStatus() {
    const now = brusselsNow();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const slot = $('[data-open-status]');

    const todayIdx = isHoliday(now) ? null : now.getDay();
    $$('.schedule .day').forEach((el) => el.classList.toggle('today', el.dataset.day === String(todayIdx) || (todayIdx === null && el.classList.contains('day-note'))));

    if (!slot) return;
    for (let i = 0; i < 8; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const s = sessionOn(day);
      if (!s) continue;
      if (i === 0 && nowMin >= s[0] && nowMin < s[1]) {
        slot.innerHTML = `<span class="open">Nu open</span> tot ${hhmm(s[1])}`;
        return;
      }
      if (i === 0 && nowMin >= s[1]) continue;
      const label = i === 0 ? 'Vandaag' : i === 1 ? 'Morgen' : fmtWeekdayLong.format(day).replace(/^./, (c) => c.toUpperCase());
      slot.textContent = `${label} om ${hhmm(s[0])}`;
      return;
    }
  }

  // ---------- Watertemperatuur (IJsberen-module) ----------
  const tempEls = {
    value: $('[data-temp-value]'),
    meta: $('[data-temp-meta]'),
    dot: $('[data-temp-dot]'),
    label: $('[data-temp-label]'),
    bar: $('[data-temp-bar]')
  };
  const fmtTime = new Intl.DateTimeFormat('nl-BE', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  const fmtDay = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', timeZone: TZ });

  function feel(t) {
    if (t < 4) return 'Echt ijsberenweer';
    if (t < 8) return 'Stevig fris';
    if (t < 12) return 'Fris en verkwikkend';
    if (t < 17) return 'Lekker verfrissend';
    return 'Zomers zacht';
  }

  function showTemp(t, { state, meta }) {
    tempEls.value.textContent = t == null ? '–' : t.toLocaleString('nl-BE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    tempEls.meta.textContent = meta;
    tempEls.dot.className = 'live-dot ' + state;
    tempEls.label.textContent = state === 'demo' ? 'Watertemperatuur · voorbeeld' : 'Watertemperatuur';
    const pct = t == null ? 0 : Math.min(100, Math.max(0, ((t + 2) / 27) * 100));
    tempEls.bar.style.left = pct + '%';
    tempEls.bar.style.opacity = t == null ? 0 : 1;
  }

  async function loadTemp() {
    if (!tempEls.value) return;
    if (!CONFIG.apiUrl) {
      showTemp(7.4, { state: 'demo', meta: 'Voorbeeldwaarde. De live meting verschijnt zodra de IJsberen-module gekoppeld is.' });
      return;
    }
    try {
      const url = new URL(CONFIG.apiUrl, location.href);
      if (!CONFIG.thingspeakChannelId) url.searchParams.set('device_id', CONFIG.deviceId);
      const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const row = await res.json();
      // ThingSpeak antwoordt -1 zolang het kanaal leeg is
      if (!row || typeof row !== 'object') {
        showTemp(null, { state: '', meta: 'Nog geen metingen ontvangen' });
        return;
      }
      const payload = row.payload || row;
      const t = typeof row.temperature_c === 'number' ? row.temperature_c
        : Number.isFinite(parseFloat(row.field1)) ? parseFloat(row.field1) : null;
      const at = new Date(row.received_at || row.created_at);
      const ageMin = (Date.now() - at) / 6e4;
      const sameDay = fmtDay.format(at) === fmtDay.format(new Date());
      const when = `${sameDay ? '' : fmtDay.format(at) + ', '}${fmtTime.format(at)}`;

      if (t == null || payload.modbus_ok === false) {
        showTemp(null, { state: '', meta: `Sensor of communicatie offline (laatste bericht ${when})` });
      } else if (!(ageMin <= CONFIG.staleAfterMin)) {
        showTemp(t, { state: '', meta: `Offline · laatste meting ${when}` });
      } else {
        showTemp(t, { state: 'live', meta: `${feel(t)} · gemeten om ${fmtTime.format(at)}` });
      }
    } catch (err) {
      showTemp(null, { state: '', meta: 'Watertemperatuur tijdelijk niet beschikbaar' });
    }
  }

  // ---------- Navigatie & effecten ----------
  function initNav() {
    const header = $('.site-header');
    const toggle = $('.nav-toggle');
    const nav = $('#nav');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
      header.classList.toggle('menu-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    const targets = $$('.section-head, .schedule, .steps > li, .event, .price, .join, .person, .sponsors li, .trooper, .timeline li, .facts-list div, .feature-grid > div:first-child, .contact-grid > *');
    targets.forEach((el) => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  $('[data-year]').textContent = brusselsNow().getFullYear();
  renderEvents();
  initTabs();
  renderOpenStatus();
  loadTemp();
  initNav();
  initReveal();
  setInterval(renderOpenStatus, 60 * 1000);
  if (CONFIG.apiUrl) setInterval(loadTemp, CONFIG.refreshMs);
})();
