// src/page.ts — returns the full HTML for the Haunted Lockfile graveyard page

export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Haunted Lockfile — your dependencies, as a graveyard</title>
<meta name="description" content="Drop in a package-lock.json and see which packages are dead, which are ghosts and which are zombies.">
<style>
/* ── Reset & custom properties ─────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0d14;
  --ground:#1a1f2e;
  --ground-top:#232840;
  --stone:#3a4060;
  --stone-alive:#2a5c3a;
  --stone-ghost:#5c6ca0;
  --stone-zombie:#2a4a20;
  --stone-tombstone:#4a3060;
  --danger:#c0392b;
  --zombie-green:#4a9a3a;
  --ghost-blue:#8090d0;
  --fog:#b0c8e8;
  --text:#e8eaf6;
  --muted:#8090b0;
  --accent:#c0392b;
  --panel-bg:#12172a;
  --border:#2a304a;
  --focus:#e8eaf6;
  --font:system-ui,-apple-system,sans-serif;
  --mono:"SF Mono","Fira Code","Fira Mono","Roboto Mono",monospace;
}
html{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100%}
body{min-height:100vh;display:flex;flex-direction:column}

/* ── Focus ─────────────────────────────────────────────────────────── */
:focus-visible{outline:2px solid var(--focus);outline-offset:3px}
:focus:not(:focus-visible){outline:none}

/* ── Header ────────────────────────────────────────────────────────── */
header{padding:2rem 1.5rem 1rem;text-align:center;position:relative;z-index:10}
header h1{font-size:clamp(1.8rem,5vw,3rem);letter-spacing:-.02em;font-weight:700}
header h1 span{color:var(--danger)}
header p{color:var(--muted);margin-top:.5rem;font-size:.95rem}

/* ── Drop zone ─────────────────────────────────────────────────────── */
#drop-zone{
  margin:1.5rem auto;max-width:640px;width:calc(100% - 2rem);
  border:2px dashed var(--border);border-radius:8px;padding:2rem;
  text-align:center;cursor:pointer;transition:border-color .2s,background .2s;
  position:relative;z-index:10;background:rgba(255,255,255,.02)
}
#drop-zone:hover,#drop-zone.drag-over{border-color:var(--ghost-blue);background:rgba(128,144,208,.07)}
#drop-zone p{color:var(--muted);font-size:.9rem;margin-top:.5rem}
#drop-zone strong{color:var(--text)}
#file-input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
textarea#paste-area{
  width:100%;margin-top:1rem;height:6rem;background:var(--panel-bg);
  border:1px solid var(--border);border-radius:4px;color:var(--text);
  font-family:var(--mono);font-size:.78rem;padding:.5rem;resize:vertical
}
#analyze-btn{
  margin-top:.75rem;padding:.6rem 1.8rem;background:var(--danger);color:#fff;
  border:none;border-radius:4px;cursor:pointer;font-size:.9rem;font-weight:600;
  letter-spacing:.03em;transition:opacity .2s
}
#analyze-btn:hover{opacity:.85}
#analyze-btn:disabled{opacity:.4;cursor:not-allowed}

/* ── Progress ──────────────────────────────────────────────────────── */
#progress{
  display:none;text-align:center;color:var(--muted);padding:1rem;
  font-size:.9rem;position:relative;z-index:10
}
#progress.active{display:block}

/* ── Error banner ──────────────────────────────────────────────────── */
#error-banner{
  display:none;margin:0 auto 1rem;max-width:640px;width:calc(100% - 2rem);
  background:rgba(192,57,43,.15);border:1px solid var(--danger);
  border-radius:6px;padding:.75rem 1rem;font-size:.88rem;color:#e88;
  position:relative;z-index:10
}
#error-banner.visible{display:block}

/* ── View toggle ────────────────────────────────────────────────────── */
#view-controls{
  display:none;justify-content:center;gap:1rem;padding:.5rem;
  position:relative;z-index:10
}
#view-controls.visible{display:flex}
.view-btn{
  padding:.4rem 1.2rem;background:transparent;border:1px solid var(--border);
  border-radius:4px;color:var(--muted);cursor:pointer;font-size:.85rem;
  transition:border-color .2s,color .2s
}
.view-btn.active{border-color:var(--ghost-blue);color:var(--text)}

/* ── Report button ──────────────────────────────────────────────────── */
#report-btn{
  display:none;margin:.5rem auto;padding:.4rem 1.2rem;
  background:transparent;border:1px solid var(--border);
  border-radius:4px;color:var(--muted);cursor:pointer;font-size:.85rem;
  transition:border-color .2s,color .2s;position:relative;z-index:10
}
#report-btn:hover{border-color:var(--ghost-blue);color:var(--text)}
#report-btn.visible{display:block}

/* ── Stats bar ──────────────────────────────────────────────────────── */
#stats{
  display:none;text-align:center;padding:.75rem;font-size:.82rem;
  color:var(--muted);position:relative;z-index:10;
  flex-wrap:wrap;gap:.5rem;justify-content:center
}
#stats.visible{display:flex}
.stat{padding:.25rem .75rem;border-radius:3px;background:rgba(255,255,255,.04);font-weight:600}
.stat-zombie{color:var(--zombie-green)}
.stat-ghost{color:var(--ghost-blue)}
.stat-tombstone{color:#a080c0}
.stat-alive{color:#6aaa6a}

/* ── Graveyard ──────────────────────────────────────────────────────── */
#graveyard-wrap{
  position:relative;overflow:hidden;
  min-height:360px;flex:1
}
#fog{
  position:absolute;inset:0;pointer-events:none;z-index:2;
  background:radial-gradient(ellipse 80% 40% at 50% 100%, var(--fog), transparent);
  opacity:0;transition:opacity 1.5s
}
#graveyard{
  position:relative;z-index:3;
  padding:2rem 1rem 4rem;
  display:flex;flex-wrap:wrap;align-content:flex-start;
  gap:1rem;justify-content:center;
  min-height:200px
}

/* ── Graves ─────────────────────────────────────────────────────────── */
.grave{
  position:relative;cursor:pointer;display:flex;flex-direction:column;
  align-items:center;user-select:none;
  transition:transform .15s
}
.grave:hover,.grave:focus-visible{transform:translateY(-4px)}
.grave-label{
  font-family:var(--mono);font-size:.65rem;color:var(--muted);
  text-align:center;margin-top:.35rem;max-width:80px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis
}
.grave-plot-label{
  font-size:.6rem;letter-spacing:.05em;text-transform:uppercase;font-weight:700;
  margin-top:.15rem
}

/* Stone shapes */
.stone{
  width:54px;border-radius:6px 6px 2px 2px;
  display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;
  position:relative;transition:background .3s
}
.stone-icon{font-size:1.1rem;line-height:1}

/* direct deps bigger */
.direct .stone{width:64px}

/* plot colours */
.alive .stone{background:var(--stone-alive);min-height:60px}
.ghost .stone{background:var(--stone-ghost);min-height:64px}
.tombstone .stone{background:var(--stone-tombstone)}
.zombie .stone{background:var(--stone-zombie);border:1px solid var(--zombie-green)}

.alive .grave-plot-label{color:#6aaa6a}
.ghost .grave-plot-label{color:var(--ghost-blue)}
.tombstone .grave-plot-label{color:#a080c0}
.zombie .grave-plot-label{color:var(--zombie-green)}

/* Ghost drift — disabled by prefers-reduced-motion */
@media (prefers-reduced-motion:no-preference){
  .ghost .stone{animation:drift 3s ease-in-out infinite}
  @keyframes drift{
    0%,100%{transform:translateX(0)}
    50%{transform:translateX(6px)}
  }
  /* Zombie rising hand */
  .zombie .stone::after{
    content:"🫴";position:absolute;bottom:100%;left:50%;
    transform:translateX(-50%) translateY(60%);font-size:.9rem;
    animation:rise 2.5s ease-in-out infinite;
    pointer-events:none
  }
  @keyframes rise{
    0%,100%{transform:translateX(-50%) translateY(60%);opacity:.6}
    50%{transform:translateX(-50%) translateY(0%);opacity:1}
  }
}

/* Ground strip */
#graveyard::after{
  content:"";position:absolute;bottom:0;left:0;right:0;height:3rem;
  background:linear-gradient(to top,var(--ground),var(--ground-top),transparent);
  pointer-events:none;z-index:1
}

/* Transitive row opacity */
.transitive .stone{opacity:.75}
.transitive .grave-label,.transitive .grave-plot-label{opacity:.7}

/* ── Evidence panel ──────────────────────────────────────────────────── */
#panel-backdrop{
  display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:50
}
#panel-backdrop.open{display:block}
#panel{
  position:fixed;bottom:0;left:0;right:0;max-height:70vh;
  background:var(--panel-bg);border-top:1px solid var(--border);
  border-radius:12px 12px 0 0;z-index:51;overflow-y:auto;
  transform:translateY(100%);transition:transform .25s ease
}
#panel.open{transform:translateY(0)}
#panel-inner{padding:1.5rem}
#panel-close{
  position:absolute;top:1rem;right:1rem;background:transparent;
  border:1px solid var(--border);border-radius:4px;color:var(--muted);
  cursor:pointer;padding:.25rem .6rem;font-size:.85rem
}
#panel h2{font-size:1rem;font-family:var(--mono);word-break:break-all}
#panel .panel-badge{
  display:inline-block;margin:.5rem 0;padding:.2rem .6rem;
  border-radius:3px;font-size:.75rem;font-weight:700;letter-spacing:.05em
}
.badge-alive{background:rgba(106,170,106,.2);color:#6aaa6a}
.badge-ghost{background:rgba(128,144,208,.2);color:var(--ghost-blue)}
.badge-tombstone{background:rgba(160,128,192,.2);color:#a080c0}
.badge-zombie{background:rgba(74,154,58,.2);color:var(--zombie-green)}
#panel dl{margin-top:.75rem;display:grid;grid-template-columns:auto 1fr;gap:.4rem .75rem;font-size:.85rem}
#panel dt{color:var(--muted);white-space:nowrap}
#panel dd{color:var(--text);word-break:break-word}
#panel .advisory-list{margin-top:.5rem;display:flex;flex-direction:column;gap:.3rem}
#panel .advisory-item a{color:var(--danger);font-family:var(--mono);font-size:.82rem}
#panel .next-step{
  margin-top:1rem;padding:.75rem;background:rgba(255,255,255,.04);
  border-left:3px solid var(--accent);border-radius:0 4px 4px 0;
  font-size:.88rem
}
#panel .sources{margin-top:.75rem;font-size:.75rem;color:var(--muted)}

/* ── Table view ──────────────────────────────────────────────────────── */
#table-view{display:none;overflow-x:auto;padding:1rem;max-width:100%}
#table-view.active{display:block}
#table-view table{
  width:100%;border-collapse:collapse;font-size:.83rem;
  min-width:500px
}
#table-view th{
  text-align:left;padding:.5rem .75rem;border-bottom:1px solid var(--border);
  color:var(--muted);font-weight:600;font-size:.78rem;letter-spacing:.04em;
  text-transform:uppercase;white-space:nowrap
}
#table-view td{
  padding:.5rem .75rem;border-bottom:1px solid rgba(42,48,74,.6);
  vertical-align:top
}
#table-view tr:hover td{background:rgba(255,255,255,.025)}
.td-name{font-family:var(--mono);word-break:break-all}
.td-plot{white-space:nowrap;font-weight:600;font-size:.8rem}
.plot-alive{color:#6aaa6a}.plot-ghost{color:var(--ghost-blue)}
.plot-tombstone{color:#a080c0}.plot-zombie{color:var(--zombie-green)}
.td-days,.td-direct{color:var(--muted)}
.td-advisories a{color:var(--danger);font-family:var(--mono);font-size:.78rem;display:block}

/* ── Footer ──────────────────────────────────────────────────────────── */
footer{text-align:center;padding:1.5rem;color:var(--muted);font-size:.78rem;z-index:10;position:relative}
footer a{color:var(--muted)}

/* ── Responsive ──────────────────────────────────────────────────────── */
@media(max-width:400px){
  .stone{width:44px}
  .direct .stone{width:52px}
  .grave-label{max-width:60px;font-size:.58rem}
  header h1{font-size:1.5rem}
}
</style>
</head>
<body>

<header>
  <h1>&#x1F480; Haunted <span>Lockfile</span></h1>
  <p>Your dependencies, as a graveyard. Drop in a <code>package-lock.json</code>.</p>
</header>

<section id="drop-zone" role="region" aria-label="Upload package-lock.json">
  <input type="file" id="file-input" accept=".json" aria-label="Choose package-lock.json file">
  <strong>&#x1F4C1; Drop your package-lock.json here</strong>
  <p>or paste the contents below, then click Analyze</p>
  <textarea id="paste-area" placeholder='{"lockfileVersion": 3, "packages": {...}}' aria-label="Paste package-lock.json contents"></textarea>
  <br>
  <button id="analyze-btn" disabled>Analyze</button>
</section>

<div id="error-banner" role="alert" aria-live="assertive"></div>
<div id="progress" aria-live="polite" role="status"></div>

<div id="view-controls" role="group" aria-label="View selector">
  <button class="view-btn active" id="btn-graveyard" aria-pressed="true">&#x26B0;&#xFE0F; Graveyard</button>
  <button class="view-btn" id="btn-table" aria-pressed="false">&#x1F4CB; Table</button>
</div>

<div id="stats" role="region" aria-label="Summary statistics"></div>
<button id="report-btn" aria-label="Export findings as Markdown">&#x1F4C4; Export Report</button>

<main id="graveyard-wrap" role="main" aria-label="Graveyard">
  <div id="fog" aria-hidden="true"></div>
  <div id="graveyard" role="list" aria-label="Packages"></div>
</main>

<section id="table-view" aria-label="Packages table">
  <table>
    <thead>
      <tr>
        <th scope="col">Package</th>
        <th scope="col">Version</th>
        <th scope="col">Plot</th>
        <th scope="col">Days since release</th>
        <th scope="col">Direct</th>
        <th scope="col">Advisories</th>
      </tr>
    </thead>
    <tbody id="table-body"></tbody>
  </table>
</section>

<!-- Evidence panel -->
<div id="panel-backdrop" aria-hidden="true"></div>
<aside id="panel" role="complementary" aria-label="Package evidence" aria-modal="true">
  <button id="panel-close" aria-label="Close panel">&#x2715; Close</button>
  <div id="panel-inner"></div>
</aside>

<footer>
  Built for <a href="https://kiro.dev" target="_blank" rel="noopener">Kiroween 2026</a> &mdash;
  data from <a href="https://deps.dev" target="_blank" rel="noopener">deps.dev</a>,
  <a href="https://osv.dev" target="_blank" rel="noopener">OSV</a>,
  <a href="https://registry.npmjs.org" target="_blank" rel="noopener">npm registry</a>.
  Nothing about your project is stored.
</footer>

<script>
(function(){
  'use strict';

  // ── State ────────────────────────────────────────────────────────────────
  let allResults = [];
  let currentView = 'graveyard';

  // ── Elements ─────────────────────────────────────────────────────────────
  const dropZone    = document.getElementById('drop-zone');
  const fileInput   = document.getElementById('file-input');
  const pasteArea   = document.getElementById('paste-area');
  const analyzeBtn  = document.getElementById('analyze-btn');
  const progress    = document.getElementById('progress');
  const errBanner   = document.getElementById('error-banner');
  const viewControls= document.getElementById('view-controls');
  const btnGraveyard= document.getElementById('btn-graveyard');
  const btnTable    = document.getElementById('btn-table');
  const statsEl     = document.getElementById('stats');
  const reportBtn   = document.getElementById('report-btn');
  const fog         = document.getElementById('fog');
  const graveyard   = document.getElementById('graveyard');
  const tableView   = document.getElementById('table-view');
  const tableBody   = document.getElementById('table-body');
  const panel       = document.getElementById('panel');
  const panelInner  = document.getElementById('panel-inner');
  const panelClose  = document.getElementById('panel-close');
  const panelBackdrop = document.getElementById('panel-backdrop');

  // ── Enable analyze when there's content ─────────────────────────────────
  pasteArea.addEventListener('input', () => {
    analyzeBtn.disabled = pasteArea.value.trim().length === 0;
  });

  // ── File input ───────────────────────────────────────────────────────────
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      pasteArea.value = e.target.result;
      analyzeBtn.disabled = false;
    };
    reader.readAsText(file);
  });

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      pasteArea.value = ev.target.result;
      analyzeBtn.disabled = false;
    };
    reader.readAsText(file);
  });

  // ── Analyze ───────────────────────────────────────────────────────────────
  analyzeBtn.addEventListener('click', doAnalyze);
  pasteArea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') doAnalyze();
  });

  async function doAnalyze() {
    const raw = pasteArea.value.trim();
    if (!raw) return;

    showError('');
    showProgress('Parsing lockfile…');
    analyzeBtn.disabled = true;

    // Parse in browser
    let parsed;
    try {
      parsed = parseLockfile(raw);
    } catch(err) {
      showError('Failed to parse: ' + err.message);
      hideProgress();
      analyzeBtn.disabled = false;
      return;
    }

    if (parsed.errors.length > 0 && parsed.packages.length === 0) {
      showError(parsed.errors.join(' '));
      hideProgress();
      analyzeBtn.disabled = false;
      return;
    }

    showProgress('Haunting ' + parsed.packages.length + ' packages…');

    // Send to API
    let results;
    try {
      const res = await fetch('/api/haunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packages: parsed.packages.map(p => ({
            name: p.name,
            version: p.version,
            isDirect: p.isDirect
          }))
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || ('HTTP ' + res.status));
      }
      const data = await res.json();
      results = data.results;
    } catch(err) {
      showError('API error: ' + err.message);
      hideProgress();
      analyzeBtn.disabled = false;
      return;
    }

    allResults = results;
    hideProgress();
    analyzeBtn.disabled = false;

    if (parsed.errors.length > 0) {
      showError('Warnings: ' + parsed.errors.join(' '));
    }

    renderAll();
  }

  // ── parseLockfile (browser version) ──────────────────────────────────────
  function parseLockfile(input) {
    const packages = [];
    const errors = [];
    let json;
    try { json = JSON.parse(input); } catch(e) {
      errors.push('Not valid JSON: ' + e.message);
      return { packages, errors };
    }
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      errors.push('Not a JSON object.');
      return { packages, errors };
    }
    const lv = json.lockfileVersion;
    if (lv !== 2 && lv !== 3) {
      errors.push('Warning: lockfileVersion ' + lv + ' — expected 2 or 3.');
    }
    // v3 / v2 packages map
    if (json.packages && typeof json.packages === 'object') {
      const map = json.packages;
      const root = map[''];
      const directNames = new Set();
      if (root) {
        for (const field of ['dependencies','devDependencies','optionalDependencies','peerDependencies']) {
          if (root[field]) Object.keys(root[field]).forEach(n => directNames.add(n));
        }
      }
      const seen = new Set();
      for (const [key, val] of Object.entries(map)) {
        if (key === '') continue;
        if (!val || typeof val !== 'object') continue;
        const marker = 'node_modules/';
        const idx = key.lastIndexOf(marker);
        if (idx === -1) continue;
        const name = key.slice(idx + marker.length);
        if (!name || !val.version) continue;
        const id = name + '@' + val.version;
        if (seen.has(id)) continue;
        seen.add(id);
        packages.push({ name, version: val.version, isDirect: directNames.has(name) });
      }
      return { packages, errors };
    }
    // v2 dependencies map
    if (json.dependencies && typeof json.dependencies === 'object') {
      const directNames = new Set(Object.keys(json.dependencies));
      const seen = new Set();
      function walk(deps, direct) {
        for (const [name, val] of Object.entries(deps)) {
          if (!val || typeof val !== 'object') continue;
          if (!val.version) continue;
          const id = name + '@' + val.version;
          if (!seen.has(id)) {
            seen.add(id);
            packages.push({ name, version: val.version, isDirect: direct && directNames.has(name) });
          }
          if (val.dependencies) walk(val.dependencies, false);
        }
      }
      walk(json.dependencies, true);
      return { packages, errors };
    }
    errors.push('No packages or dependencies field found.');
    return { packages, errors };
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderAll() {
    renderStats();
    renderGraveyard();
    renderTable();
    viewControls.classList.add('visible');
    statsEl.classList.add('visible');
    reportBtn.classList.add('visible');
    setView(currentView);
  }

  function renderStats() {
    const counts = { zombie:0, ghost:0, tombstone:0, alive:0 };
    for (const r of allResults) counts[r.plot]++;
    statsEl.innerHTML =
      '<span class="stat stat-zombie">&#x1F9DF; Zombie: ' + counts.zombie + '</span>' +
      '<span class="stat stat-ghost">&#x1F47B; Ghost: ' + counts.ghost + '</span>' +
      '<span class="stat stat-tombstone">&#x1FA¦6; Tombstone: ' + counts.tombstone + '</span>' +
      '<span class="stat stat-alive">&#x1F331; Alive: ' + counts.alive + '</span>';

    const risky = counts.zombie + counts.ghost + counts.tombstone;
    const ratio = allResults.length > 0 ? risky / allResults.length : 0;
    fog.style.opacity = (ratio * 0.65).toFixed(2);
  }

  const PLOT_ICON = { zombie:'🧟', ghost:'👻', tombstone:'🪦', alive:'🌱' };
  const PLOT_LABEL = { zombie:'Zombie', ghost:'Ghost', tombstone:'Tombstone', alive:'Alive' };

  function renderGraveyard() {
    graveyard.innerHTML = '';
    // Sort: direct first, then by plot severity, then alphabetical
    const order = { zombie:0, ghost:1, tombstone:2, alive:3 };
    const sorted = [...allResults].sort((a,b) => {
      if (a.isDirect !== b.isDirect) return a.isDirect ? -1 : 1;
      if (order[a.plot] !== order[b.plot]) return order[a.plot] - order[b.plot];
      return a.name.localeCompare(b.name);
    });

    for (const r of sorted) {
      const el = document.createElement('div');
      el.className = 'grave ' + r.plot + (r.isDirect ? ' direct' : ' transitive');
      el.setAttribute('role','listitem');
      el.setAttribute('tabindex','0');
      el.setAttribute('aria-label', r.name + '@' + r.version + ' — ' + PLOT_LABEL[r.plot]);

      // Stone height for tombstones: years × 30px, clamped 60–200px
      let stoneStyle = '';
      if (r.plot === 'tombstone' || r.plot === 'zombie') {
        const years = r.daysSinceRelease != null ? r.daysSinceRelease / 365 : 2;
        const h = Math.min(200, Math.max(60, Math.round(years * 30)));
        stoneStyle = 'min-height:' + h + 'px;';
      }

      el.innerHTML =
        '<div class="stone" style="' + stoneStyle + '" aria-hidden="true">' +
          '<span class="stone-icon">' + PLOT_ICON[r.plot] + '</span>' +
        '</div>' +
        '<div class="grave-label">' + escHtml(r.name) + '</div>' +
        '<div class="grave-plot-label" aria-hidden="true">' + PLOT_LABEL[r.plot] + '</div>';

      el.addEventListener('click', () => openPanel(r));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(r); }
      });

      graveyard.appendChild(el);
    }
  }

  function renderTable() {
    tableBody.innerHTML = '';
    const order = { zombie:0, ghost:1, tombstone:2, alive:3 };
    const sorted = [...allResults].sort((a,b) => {
      if (order[a.plot] !== order[b.plot]) return order[a.plot] - order[b.plot];
      return a.name.localeCompare(b.name);
    });
    for (const r of sorted) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="td-name">' + escHtml(r.name) + '</td>' +
        '<td class="td-name">' + escHtml(r.version) + '</td>' +
        '<td class="td-plot plot-' + r.plot + '">' + PLOT_ICON[r.plot] + ' ' + PLOT_LABEL[r.plot] + '</td>' +
        '<td class="td-days">' + (r.daysSinceRelease != null ? r.daysSinceRelease : '—') + '</td>' +
        '<td class="td-direct">' + (r.isDirect ? 'Yes' : 'No') + '</td>' +
        '<td class="td-advisories">' +
          (r.advisories.length > 0
            ? r.advisories.map(a =>
                '<a href="' + escHtml(a.url || '#') + '" target="_blank" rel="noopener">' + escHtml(a.id) + '</a>'
              ).join('')
            : '—') +
        '</td>';
      tableBody.appendChild(tr);
    }
  }

  // ── Panel ─────────────────────────────────────────────────────────────────
  function openPanel(r) {
    const advisoriesHtml = r.advisories.length > 0
      ? '<div class="advisory-list">' +
          r.advisories.map(a =>
            '<div class="advisory-item"><a href="' + escHtml(a.url||'#') + '" target="_blank" rel="noopener">' +
            escHtml(a.id) + '</a>' +
            (a.severity ? ' (' + escHtml(a.severity) + ')' : '') +
            (a.summary ? ' — ' + escHtml(a.summary) : '') +
            '</div>'
          ).join('') +
        '</div>'
      : '<span>None</span>';

    const sourcesText = [
      r.sources.depsdev ? 'deps.dev ✓' : 'deps.dev ✗',
      r.sources.osv     ? 'OSV ✓'     : 'OSV ✗',
      r.sources.npm     ? 'npm ✓'     : 'npm ✗',
    ].join(' · ');

    panelInner.innerHTML =
      '<h2>' + escHtml(r.name + '@' + r.version) + '</h2>' +
      '<span class="panel-badge badge-' + r.plot + '">' + PLOT_ICON[r.plot] + ' ' + PLOT_LABEL[r.plot] + '</span>' +
      '<dl>' +
        '<dt>Dependency type</dt><dd>' + (r.isDirect ? 'Direct' : 'Transitive') + '</dd>' +
        (r.deprecationMessage ? '<dt>Deprecation</dt><dd>' + escHtml(r.deprecationMessage) + '</dd>' : '') +
        (r.lastPublishedAt ? '<dt>Last release</dt><dd>' + escHtml(r.lastPublishedAt.slice(0,10)) +
          (r.daysSinceRelease != null ? ' (' + r.daysSinceRelease + ' days ago)' : '') + '</dd>' : '') +
        '<dt>Advisories</dt><dd>' + advisoriesHtml + '</dd>' +
      '</dl>' +
      '<div class="next-step"><strong>Next step:</strong> ' + escHtml(r.nextStep) + '</div>' +
      '<div class="sources">Sources: ' + escHtml(sourcesText) + '</div>';

    panel.classList.add('open');
    panelBackdrop.classList.add('open');
    panel.setAttribute('aria-hidden','false');
    panelBackdrop.setAttribute('aria-hidden','false');
    panelClose.focus();
  }

  function closePanel() {
    panel.classList.remove('open');
    panelBackdrop.classList.remove('open');
    panel.setAttribute('aria-hidden','true');
    panelBackdrop.setAttribute('aria-hidden','true');
  }

  panelClose.addEventListener('click', closePanel);
  panelBackdrop.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });

  // ── View toggle ────────────────────────────────────────────────────────────
  btnGraveyard.addEventListener('click', () => setView('graveyard'));
  btnTable.addEventListener('click', () => setView('table'));

  function setView(v) {
    currentView = v;
    const isGraveyard = v === 'graveyard';
    document.getElementById('graveyard-wrap').style.display = isGraveyard ? '' : 'none';
    tableView.classList.toggle('active', !isGraveyard);
    btnGraveyard.classList.toggle('active', isGraveyard);
    btnTable.classList.toggle('active', !isGraveyard);
    btnGraveyard.setAttribute('aria-pressed', isGraveyard ? 'true' : 'false');
    btnTable.setAttribute('aria-pressed', isGraveyard ? 'false' : 'true');
  }

  // ── Report export ──────────────────────────────────────────────────────────
  reportBtn.addEventListener('click', exportReport);

  function exportReport() {
    const lines = ['# Haunted Lockfile Report\n'];
    const order = { zombie:0, ghost:1, tombstone:2, alive:3 };
    const sorted = [...allResults].sort((a,b) => order[a.plot] - order[b.plot] || a.name.localeCompare(b.name));
    const counts = { zombie:0, ghost:0, tombstone:0, alive:0 };
    for (const r of sorted) counts[r.plot]++;
    lines.push('## Summary\n');
    lines.push('| Plot | Count |');
    lines.push('|---|---|');
    lines.push('| 🧟 Zombie | ' + counts.zombie + ' |');
    lines.push('| 👻 Ghost | ' + counts.ghost + ' |');
    lines.push('| 🪦 Tombstone | ' + counts.tombstone + ' |');
    lines.push('| 🌱 Alive | ' + counts.alive + ' |\n');
    lines.push('## Packages\n');
    lines.push('| Package | Version | Plot | Days since release | Advisories |');
    lines.push('|---|---|---|---|---|');
    for (const r of sorted) {
      const advs = r.advisories.map(a => '[' + a.id + '](' + (a.url||'#') + ')').join(', ') || '—';
      lines.push('| \`' + r.name + '\` | ' + r.version + ' | ' + PLOT_LABEL[r.plot] +
        ' | ' + (r.daysSinceRelease != null ? r.daysSinceRelease : '—') +
        ' | ' + advs + ' |');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'haunted-lockfile-report.md'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  function showError(msg) {
    if (msg) {
      errBanner.textContent = msg;
      errBanner.classList.add('visible');
    } else {
      errBanner.textContent = '';
      errBanner.classList.remove('visible');
    }
  }

  function showProgress(msg) {
    progress.textContent = msg;
    progress.classList.add('active');
  }

  function hideProgress() {
    progress.textContent = '';
    progress.classList.remove('active');
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
})();
</script>
</body>
</html>`;
}
