// src/page/html.ts — HTML structure for the graveyard page

export const html = `
<header>
  <h1>&#x1F480; Haunted <span>Lockfile</span></h1>
  <p>Your dependencies, as a graveyard. Drop in a <code>package-lock.json</code>.</p>
</header>

<section id="drop-zone" role="region" aria-label="Upload package-lock.json">
  <input type="file" id="file-input" accept=".json" aria-label="Choose package-lock.json file">
  <strong>&#x1F4C1; Drop your package-lock.json here</strong>
  <p>or paste the contents below, then click Analyze</p>
  <textarea id="paste-area" placeholder='{"lockfileVersion": 3, "packages": {...}}' aria-label="Paste package-lock.json contents"></textarea>
  <div class="drop-zone-actions">
    <button id="analyze-btn" disabled>Analyze</button>
    <span class="demo-link-wrap">or <a href="#" id="demo-link">try the demo lockfile</a></span>
  </div>
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
  <!-- Scene will be inserted here by JavaScript -->
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
<aside id="panel" role="dialog" aria-modal="true" aria-hidden="true">
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
`;
