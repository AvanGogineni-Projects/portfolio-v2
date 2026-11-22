// Shared by every page variant. Each page defines `P` (its project list) before loading this file.
// Project fields: n name, k key fact, d description, t tags, a live app, s source, v film name in media/, f flow (no film)
const BASE = document.currentScript.src; // resolve data/ and media/ relative to this file, so pages in subfolders work
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = matchMedia('(hover: hover)').matches;

// ---- project film cards ----
const cards = $('idx');
P.forEach((p, i) => {
  const el = document.createElement('article');
  el.className = 'card' + (i === 0 ? ' feature' : '');
  const links = [p.a && `<a href="${p.a}" target="_blank" rel="noopener">live app ↗</a>`,
                 p.s && `<a href="${p.s}" target="_blank" rel="noopener">source ↗</a>`].filter(Boolean).join('');
  const media = p.v
    ? `<div class="film"><video src="${new URL(`media/${p.v}.mp4`, BASE)}" poster="${new URL(`media/${p.v}.jpg`, BASE)}"
         muted loop playsinline preload="none" aria-label="${esc(p.n)} demo film"></video>
       <div class="ctl"><button type="button" class="play">▶ play demo</button><button type="button" class="snd" aria-pressed="false">sound off</button></div></div>`
    : `<div class="diagram" aria-label="${esc(p.n)} architecture"><div class="flow">${p.f.map((x, j) =>
         (j ? '<i>→</i>' : '') + `<span class="${x.startsWith('*') ? 'hot' : ''}">${esc(x.replace(/^\*/, ''))}</span>`).join('')}</div></div>`;
  el.innerHTML = `${media}
    <div class="body">
      <div class="title"><h3>${esc(p.n)}</h3><span class="lead" aria-hidden="true"></span><span class="kpi">${esc(p.k)}</span></div>
      <p>${esc(p.d)}</p>
      <div class="tags">${p.t.map(x => `<span>${esc(x)}</span>`).join('')}</div>
      <div class="links">${links || '<span class="muted">details under NDA</span>'}</div>
    </div>`;
  cards.appendChild(el);
  if (p.v) wireFilm(el.querySelector('.film'));
});

function wireFilm(film) {
  const v = film.querySelector('video'), play = film.querySelector('.play'), snd = film.querySelector('.snd');
  const sync = () => {
    film.classList.toggle('playing', !v.paused);
    play.textContent = v.paused ? '▶ play demo' : '❚❚ pause';
    snd.textContent = v.muted ? 'sound off' : 'sound on';
    snd.setAttribute('aria-pressed', String(!v.muted));
  };
  const toggle = () => { v.paused ? v.play().catch(() => {}) : v.pause(); };
  v.addEventListener('play', sync); v.addEventListener('pause', sync); v.addEventListener('volumechange', sync);
  play.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  snd.addEventListener('click', e => { e.stopPropagation(); v.muted = !v.muted; if (v.paused) v.play().catch(() => {}); });
  film.addEventListener('click', toggle);
  if (canHover && !reduceMotion) { // preview silently on hover; a click keeps it playing
    let clicked = false;
    film.addEventListener('click', () => { clicked = true; });
    film.addEventListener('mouseenter', () => { if (v.paused) { clicked = false; v.play().catch(() => {}); } });
    film.addEventListener('mouseleave', () => { if (!clicked && v.muted) v.pause(); });
  }
}

// ---- live board: data/live.json is refreshed by a scheduled GitHub Action (scripts/snapshot.py) ----
const nf = new Intl.NumberFormat('en-US');
const tz = {timeZone: 'Europe/Stockholm'};
const day = iso => new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', ...tz}).format(new Date(iso));
const hour = iso => new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', ...tz}).format(new Date(iso));
function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${Math.max(m, 0)} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}
function setVal(id, html) { const el = $(id); el.innerHTML = html; el.classList.remove('wait'); }

// Forecast curve with its 80% range; one scale for band, line, peak and hour labels.
function drawChart(series) {
  const W = 600, H = 110, pad = 14, n = series.length;
  const lo = Math.min(...series.map(s => s[2])), hi = Math.max(...series.map(s => s[3]));
  const x = i => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = v => 8 + (1 - (v - lo) / (hi - lo || 1)) * (H - 30);
  const line = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[1]).toFixed(1)}`).join('');
  const band = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[3]).toFixed(1)}`).join('') +
    series.slice().reverse().map((s, i) => `L${x(n - 1 - i).toFixed(1)},${y(s[2]).toFixed(1)}`).join('') + 'Z';
  const pk = series.reduce((b, s, i) => s[1] > series[b][1] ? i : b, 0);
  const ticks = series.map((s, i) => [i, hour(s[0])]).filter(([, h]) => /^(00|06|12|18):00$/.test(h));
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hourly price forecast with 80% range; peak ${series[pk][1]} €/MWh at ${hour(series[pk][0])}">
    <path class="band" d="${band}"/><path class="line draw" d="${line}"/>
    <circle class="peak" cx="${x(pk)}" cy="${y(series[pk][1])}" r="4.5"/>
    ${ticks.map(([i, h]) => `<text x="${x(i)}" y="${H - 4}" text-anchor="middle">${h.slice(0, 2)}</text>`).join('')}
  </svg>`;
}

fetch(new URL('data/live.json', BASE), {cache: 'no-cache'}).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(j => {
  const s = j.sources;
  if (s.busskoll) {
    const b = s.busskoll;
    setVal('v-bus', `−${b.pct_lower}%<em>${b.mae_busskoll} s vs SL ${b.mae_sl} s</em>`);
    $('v-bus').classList.add('good');
    $('m-bus').textContent = `beat SL on ${b.days_beat} of ${b.days_scored} days · LightGBM`;
  }
  if (s.elvarsel) {
    const e = s.elvarsel;
    $('w-elv').textContent = `${e.zone} electricity price forecast for ${day(e.peak_time)}`;
    setVal('v-elv', `${e.avg}<em>€/MWh avg · peak ${e.peak} at ${hour(e.peak_time)}</em>`);
    $('m-elv').textContent = `shaded: 80% range · 12 Nordic zones · retrained daily`;
    if (e.series && e.series.length > 1) $('c-elv').innerHTML = drawChart(e.series);
  }
  if (s.tenderlens) setVal('v-ten', nf.format(s.tenderlens.expiring_12m));
  if (s.bolagsvakt) $('m-bol').textContent = `registry snapshot ${day(s.bolagsvakt.registry_snapshot)} · weekly`;
  $('updated').textContent = `updated ${ago(j.generated_at)}`;
}).catch(() => {
  ['v-bus', 'v-elv', 'v-ten'].forEach(id => setVal(id, '—'));
  $('updated').textContent = 'offline';
  $('live-err').hidden = false;
});

// ---- copy email, theme toggle ----
document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', () => {
  const v = btn.dataset.copy, orig = btn.textContent;
  const done = t => { btn.textContent = t; setTimeout(() => btn.textContent = orig, 1600); };
  try { navigator.clipboard.writeText(v).then(() => done('copied ✓'), () => done(v)); } catch (e) { done(v); }
}));

const root = document.documentElement;
try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch (e) {}
$('theme').addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
});
