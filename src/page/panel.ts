// src/page/panel.ts — Evidence panel (dialog) for package details

export const panelHandler = `
// ── Panel (Evidence Dialog) ──────────────────────────────────────────────
function openPanel(r, triggerElement) {
  const PLOT_ICON = { zombie:'🧟', ghost:'👻', tombstone:'🪦', alive:'🌱' };
  const PLOT_LABEL = { zombie:'Zombie', ghost:'Ghost', tombstone:'Tombstone', alive:'Alive' };
  
  const advisoriesHtml = r.advisories && r.advisories.length > 0
    ? '<div class="advisory-list">' +
        r.advisories.map(a =>
          '<div class="advisory-item">' +
          '<a href="' + escHtml(a.url||'#') + '" target="_blank" rel="noopener">' +
          escHtml(a.id) + '</a>' +
          (a.severity ? ' <span class="severity-badge">' + escHtml(a.severity) + '</span>' : '') +
          (a.summary ? '<div class="advisory-summary">' + escHtml(a.summary) + '</div>' : '') +
          '</div>'
        ).join('') +
      '</div>'
    : '<span>None</span>';

  const sourcesText = [
    r.sources.depsdev ? 'deps.dev ✓' : 'deps.dev ✗',
    r.sources.osv     ? 'OSV ✓'     : 'OSV ✗',
    r.sources.npm == null ? 'npm (not needed)' : r.sources.npm ? 'npm ✓' : 'npm ✗',
  ].join(' · ');

  const advBadge = (r.advisories && r.advisories.length > 0) 
    ? '<span class="panel-badge badge-advisory">! Advisory</span>' 
    : '';

  const panelInner = document.getElementById('panel-inner');
  const panel = document.getElementById('panel');
  const panelBackdrop = document.getElementById('panel-backdrop');
  
  panelInner.innerHTML =
    '<h2 id="panel-title">' + escHtml(r.name + '@' + r.version) + '</h2>' +
    '<div class="panel-badges">' +
      '<span class="panel-badge badge-' + r.plot + '">' + PLOT_ICON[r.plot] + ' ' + PLOT_LABEL[r.plot] + '</span>' +
      advBadge +
    '</div>' +
    '<dl>' +
      '<dt>Dependency type</dt><dd>' + (r.isDirect ? 'Direct' : 'Transitive') + '</dd>' +
      '<dt>Locked version</dt><dd>' + escHtml(r.version) + '</dd>' +
      (r.lastPublishedAt ? 
        '<dt>Last release</dt><dd><a href="https://deps.dev/npm/' + encodeURIComponent(r.name) + '" target="_blank" rel="noopener">' + 
        escHtml(r.lastPublishedAt.slice(0,10)) + '</a>' +
        (r.daysSinceRelease != null ? ' (' + Math.round(r.daysSinceRelease / 365 * 10) / 10 + ' years ago)' : '') + '</dd>' 
        : '') +
      (r.deprecationMessage ? '<dt>Deprecation</dt><dd class="deprecation-msg">' + escHtml(r.deprecationMessage) + '</dd>' : '') +
      '<dt>Advisories</dt><dd>' + advisoriesHtml + '</dd>' +
    '</dl>' +
    '<div class="next-step"><strong>Next step:</strong> ' + escHtml(r.nextStep) + '</div>' +
    '<div class="sources">Data sources: ' + escHtml(sourcesText) + '</div>';

  panel.classList.add('open');
  panelBackdrop.classList.add('open');
  panel.setAttribute('aria-hidden','false');
  panel.setAttribute('aria-labelledby','panel-title');
  panelBackdrop.setAttribute('aria-hidden','false');
  
  // Store the trigger element to return focus on close
  panel.dataset.triggerElementIndex = triggerElement?.dataset?.index || '';
  
  // Move focus to close button
  const panelClose = document.getElementById('panel-close');
  panelClose.focus();
}

function closePanel() {
  const panel = document.getElementById('panel');
  const panelBackdrop = document.getElementById('panel-backdrop');
  
  panel.classList.remove('open');
  panelBackdrop.classList.remove('open');
  panel.setAttribute('aria-hidden','true');
  panelBackdrop.setAttribute('aria-hidden','true');
  
  // Return focus to the grave that opened the panel
  const triggerIndex = panel.dataset.triggerElementIndex;
  if (triggerIndex) {
    const grave = document.querySelector('[data-index="' + triggerIndex + '"]');
    if (grave) {
      grave.focus();
    }
  }
}

function setupPanelHandlers() {
  const panelClose = document.getElementById('panel-close');
  const panelBackdrop = document.getElementById('panel-backdrop');
  const panel = document.getElementById('panel');
  
  panelClose.addEventListener('click', closePanel);
  panelBackdrop.addEventListener('click', closePanel);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      closePanel();
    }
  });
}
`;
