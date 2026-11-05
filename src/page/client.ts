// src/page/client.ts — client-side JavaScript (will be inlined as a string)

export const clientScript = `
(function(){
  'use strict';

  const MAX_LOCKFILE_PACKAGES = 2000;
  const CHUNK_SIZE = 10; // Must match MAX_PACKAGES_PER_REQUEST in haunt.ts
  const MAX_CONCURRENT_CHUNKS = 4;

  // ── State ────────────────────────────────────────────────────────────────
  let allResults = [];
  let currentView = 'graveyard';
  let parseLockfile, keyToPackageName;

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

  // ── Load parser from /parse.js ───────────────────────────────────────────
  (async function loadParser() {
    try {
      const res = await fetch('/parse.js');
      if (!res.ok) throw new Error('Failed to load parser');
      const code = await res.text();
      const fn = new Function(code + '; return { parseLockfile, keyToPackageName };');
      const exports = fn();
      parseLockfile = exports.parseLockfile;
      keyToPackageName = exports.keyToPackageName;
    } catch (err) {
      console.error('Failed to load parser:', err);
      showError('Failed to load parser functions. Please refresh.');
    }
  })();

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
    if (!parseLockfile) {
      showError('Parser not loaded yet. Please wait or refresh.');
      return;
    }

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

    // Check lockfile size
    if (parsed.packages.length > MAX_LOCKFILE_PACKAGES) {
      showError('Lockfile too large: ' + parsed.packages.length + ' packages (max ' + MAX_LOCKFILE_PACKAGES + ')');
      hideProgress();
      analyzeBtn.disabled = false;
      return;
    }

    // Split into chunks and haunt progressively
    allResults = [];
    const chunks = [];
    for (let i = 0; i < parsed.packages.length; i += CHUNK_SIZE) {
      chunks.push(parsed.packages.slice(i, i + CHUNK_SIZE));
    }

    let completed = 0;
    const packageCount = parsed.packages.length;
    const results = new Array(packageCount);

    showProgress('Haunting 0 of ' + packageCount + ' packages…');

    // Process chunks with max concurrency
    const runChunk = async (chunk, startIdx) => {
      try {
        const res = await fetch('/api/haunt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packages: chunk.map(p => ({
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
        
        // Insert results at the correct position
        for (let i = 0; i < data.results.length; i++) {
          results[startIdx + i] = data.results[i];
        }
        
        completed += chunk.length;
        showProgress('Haunted ' + completed + ' of ' + packageCount + ' packages…');
        
        // Render progressively
        allResults = results.filter(r => r !== undefined);
        if (allResults.length > 0) {
          renderAll();
        }
        
        return true;
      } catch (err) {
        console.error('Chunk error:', err);
        
        // Mark failed packages as unknown
        for (let i = 0; i < chunk.length; i++) {
          const pkg = chunk[i];
          results[startIdx + i] = {
            name: pkg.name,
            version: pkg.version,
            isDirect: pkg.isDirect,
            plot: 'alive',
            nextStep: 'Sources did not answer — check manually: https://deps.dev/npm/' + encodeURIComponent(pkg.name),
            advisories: [],
            sources: { depsdev: false, osv: false, npm: false }
          };
        }
        
        completed += chunk.length;
        showProgress('Haunted ' + completed + ' of ' + packageCount + ' packages… (some sources failed)');
        
        allResults = results.filter(r => r !== undefined);
        if (allResults.length > 0) {
          renderAll();
        }
        
        return false;
      }
    };

    // Run chunks with max concurrency
    const promises = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const startIdx = i * CHUNK_SIZE;
      
      promises.push(runChunk(chunk, startIdx));
      
      // Wait if we hit concurrency limit
      if (promises.length >= MAX_CONCURRENT_CHUNKS) {
        await Promise.race(promises);
        promises.splice(promises.findIndex(p => p.settled), 1);
      }
    }

    // Wait for all chunks
    await Promise.all(promises);

    hideProgress();
    analyzeBtn.disabled = false;

    if (parsed.errors.length > 0) {
      showError('Warnings: ' + parsed.errors.join(' '));
    }

    allResults = results.filter(r => r !== undefined);
    renderAll();
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
      '<span class="stat stat-tombstone">&#x1FAA6; Tombstone: ' + counts.tombstone + '</span>' +
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
          (r.advisories && r.advisories.length > 0
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
    const advisoriesHtml = r.advisories && r.advisories.length > 0
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
    const lines = ['# Haunted Lockfile Report\\n'];
    const order = { zombie:0, ghost:1, tombstone:2, alive:3 };
    const sorted = [...allResults].sort((a,b) => order[a.plot] - order[b.plot] || a.name.localeCompare(b.name));
    const counts = { zombie:0, ghost:0, tombstone:0, alive:0 };
    for (const r of sorted) counts[r.plot]++;
    lines.push('## Summary\\n');
    lines.push('| Plot | Count |');
    lines.push('|---|---|');
    lines.push('| 🧟 Zombie | ' + counts.zombie + ' |');
    lines.push('| 👻 Ghost | ' + counts.ghost + ' |');
    lines.push('| 🪦 Tombstone | ' + counts.tombstone + ' |');
    lines.push('| 🌱 Alive | ' + counts.alive + ' |\\n');
    lines.push('## Packages\\n');
    lines.push('| Package | Version | Plot | Days since release | Advisories |');
    lines.push('|---|---|---|---|---|');
    for (const r of sorted) {
      const advs = r.advisories && r.advisories.length > 0
        ? r.advisories.map(a => '[' + a.id + '](' + (a.url||'#') + ')').join(', ')
        : '—';
      lines.push('| \`' + r.name + '\` | ' + r.version + ' | ' + PLOT_LABEL[r.plot] +
        ' | ' + (r.daysSinceRelease != null ? r.daysSinceRelease : '—') +
        ' | ' + advs + ' |');
    }
    const blob = new Blob([lines.join('\\n')], { type: 'text/markdown' });
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
`;
