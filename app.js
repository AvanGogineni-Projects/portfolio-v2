// Shared by every page variant. Each page defines `P` (its project list) before loading this file.
const BASE = document.currentScript.src; // resolve data/ relative to this file, so pages in subfolders work

const idx = document.getElementById('idx');
P.forEach((p, i) => {
  const li = document.createElement('li');
  const links = [p.a && `<a href="${p.a}" target="_blank" rel="noopener">live app ↗</a>`, p.s && `<a href="${p.s}" target="_blank" rel="noopener">source ↗</a>`].filter(Boolean).join('');
  li.innerHTML = `<button type="button" aria-expanded="false" aria-controls="d${i}" id="b${i}">
      <span class="name">${p.n}</span><span class="lead" aria-hidden="true"></span>
      <span class="kpi">${p.k}</span><span class="chev" aria-hidden="true">›</span></button>
    <div class="detail" id="d${i}" role="region" aria-labelledby="b${i}" hidden>
      <p>${p.d}</p>
      <div class="tags">${p.t.map(x => `<span>${x}</span>`).join('')}</div>
      <div class="links">${links || '<span style="color:var(--muted)">details under NDA</span>'}</div>
    </div>`;
  const b = li.querySelector('button'), d = li.querySelector('.detail');
  b.addEventListener('click', () => {
    const open = d.hidden; d.hidden = !open; b.setAttribute('aria-expanded', open);
    open ? li.setAttribute('data-open', '') : li.removeAttribute('data-open');
  });
  idx.appendChild(li);
});
idx.querySelector('button').click(); // first project open, so the index shows what a row holds

// Live board: data/live.json is refreshed by a scheduled GitHub Action (scripts/snapshot.py).
const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('en-US');
const day = iso => new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', timeZone: 'Europe/Stockholm'}).format(new Date(iso));
const hour = iso => new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm'}).format(new Date(iso));
function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${Math.max(m, 0)} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}
function setVal(id, html) { const el = $(id); el.innerHTML = html; el.classList.remove('wait'); }

fetch(new URL('data/live.json', BASE), {cache: 'no-cache'}).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(j => {
  const s = j.sources;
  if (s.busskoll) {
    const b = s.busskoll;
    setVal('v-bus', `−${b.pct_lower}%<em>${b.mae_busskoll} s vs ${b.mae_sl} s</em>`);
    $('v-bus').classList.add('good');
    $('m-bus').textContent = `beat SL on ${b.days_beat} of ${b.days_scored} days · LightGBM`;
  }
  if (s.elvarsel) {
    const e = s.elvarsel;
    $('w-elv').textContent = `${e.zone} price forecast for ${day(e.peak_time)}, daily average`;
    setVal('v-elv', `${e.avg}<em>€/MWh · peak ${e.peak} at ${hour(e.peak_time)}</em>`);
    $('m-elv').textContent = `80% range ${e.low}–${e.high} · 12 Nordic zones · retrained daily`;
  }
  if (s.tenderlens) setVal('v-ten', nf.format(s.tenderlens.expiring_12m));
  if (s.bolagsvakt) $('m-bol').textContent = `registry snapshot ${day(s.bolagsvakt.registry_snapshot)} · refreshed weekly`;
  $('updated').textContent = `updated ${ago(j.generated_at)}`;
}).catch(() => {
  ['v-bus', 'v-elv', 'v-ten'].forEach(id => setVal(id, '—'));
  $('updated').textContent = 'offline';
  $('live-err').hidden = false;
});

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
