// src/page/scene.ts — SVG scene rendering for the graveyard

export const sceneRenderer = `
// ── Scene SVG builder ────────────────────────────────────────────────────
function buildGraveyardScene(results, groundY) {
  const sceneWidth = 1000;
  const sceneHeight = 460;
  const groundHeight = sceneHeight - groundY;
  
  // Sort: direct first, then by plot severity, then alphabetical
  const order = { zombie:0, ghost:1, tombstone:2, alive:3 };
  const sorted = [...results].sort((a,b) => {
    if (a.isDirect !== b.isDirect) return a.isDirect ? -1 : 1;
    if (order[a.plot] !== order[b.plot]) return order[a.plot] - order[b.plot];
    return a.name.localeCompare(b.name);
  });
  
  const graveSpacing = 80;
  const graveStartY = groundY - 20;
  
  let graveElements = '';
  sorted.forEach((r, i) => {
    const x = 60 + (i % 10) * graveSpacing;
    const y = graveStartY - Math.floor(i / 10) * 140;
    graveElements += buildGraveSVGElement(r, x, y, i);
  });
  
  // Count risky packages for fog
  const counts = { zombie:0, ghost:0, tombstone:0, alive:0 };
  for (const r of results) counts[r.plot]++;
  const risky = counts.zombie + counts.ghost + counts.tombstone;
  const ratio = results.length > 0 ? risky / results.length : 0;
  const fogOpacity = (ratio * 0.65).toFixed(2);
  
  return \`
<section class="graveyard-container">
  <svg viewBox="0 0 \${sceneWidth} \${sceneHeight}" xmlns="http://www.w3.org/2000/svg" class="graveyard-svg" role="img" aria-label="Graveyard scene with \${results.length} packages">
    <defs>
      <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#e8eaf6" stop-opacity="1"/>
        <stop offset="60%" stop-color="#e8eaf6" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#e8eaf6" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="fog-gradient" cx="50%" cy="100%" r="80%" fx="50%" fy="100%">
        <stop offset="0%" stop-color="#b0c8e8" stop-opacity="\${fogOpacity}"/>
        <stop offset="100%" stop-color="#b0c8e8" stop-opacity="0"/>
      </radialGradient>
      <filter id="crater-shadow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
        <feOffset dx="0" dy="1" result="offsetblur"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <!-- Sky background -->
    <rect width="\${sceneWidth}" height="\${sceneHeight}" fill="url(#sky-gradient)"/>
    <linearGradient id="sky-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0a0d14"/>
      <stop offset="100%" stop-color="#1a1f2e"/>
    </linearGradient>
    
    <!-- Stars -->
    <g class="stars" aria-hidden="true">
      <circle cx="120" cy="40" r="1.5" fill="#e8eaf6" opacity="0.8"/>
      <circle cx="280" cy="70" r="1" fill="#e8eaf6" opacity="0.6"/>
      <circle cx="450" cy="50" r="1.2" fill="#e8eaf6" opacity="0.7"/>
      <circle cx="680" cy="90" r="1" fill="#e8eaf6" opacity="0.5"/>
      <circle cx="820" cy="60" r="1.3" fill="#e8eaf6" opacity="0.75"/>
      <circle cx="200" cy="120" r="0.8" fill="#e8eaf6" opacity="0.4"/>
      <circle cx="550" cy="100" r="1.1" fill="#e8eaf6" opacity="0.65"/>
    </g>
    
    <!-- Moon with craters -->
    <g transform="translate(850, 80)">
      <circle cx="0" cy="0" r="50" fill="url(#moon-glow)" opacity="0.3"/>
      <circle cx="0" cy="0" r="35" fill="#e8eaf6"/>
      <ellipse cx="-8" cy="-10" rx="6" ry="5" fill="#d0d2e0" opacity="0.5" filter="url(#crater-shadow)"/>
      <ellipse cx="10" cy="8" rx="8" ry="7" fill="#d0d2e0" opacity="0.4" filter="url(#crater-shadow)"/>
      <ellipse cx="-12" cy="12" rx="4" ry="3" fill="#d0d2e0" opacity="0.6" filter="url(#crater-shadow)"/>
    </g>
    
    <!-- Ground -->
    <rect x="0" y="\${groundY}" width="\${sceneWidth}" height="\${groundHeight}" fill="url(#ground-gradient)"/>
    <linearGradient id="ground-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#232840"/>
      <stop offset="40%" stop-color="#1a1f2e"/>
      <stop offset="100%" stop-color="#0f1219"/>
    </linearGradient>
    
    <!-- Grass edge -->
    <path d="M 0 \${groundY} Q 50 \${groundY-3} 100 \${groundY} T 200 \${groundY} T 300 \${groundY} T 400 \${groundY} T 500 \${groundY} T 600 \${groundY} T 700 \${groundY} T 800 \${groundY} T 900 \${groundY} T 1000 \${groundY}" 
          stroke="#2a4a20" stroke-width="2" fill="none" opacity="0.4"/>
    
    <!-- Fog overlay -->
    <ellipse cx="\${sceneWidth/2}" cy="\${sceneHeight}" rx="\${sceneWidth*0.5}" ry="\${sceneHeight*0.3}" fill="url(#fog-gradient)" class="fog-layer"/>
    
    <!-- Graves -->
    <g class="graves-group">
      \${graveElements}
    </g>
    
    <!-- Fog caption inside scene -->
    <text x="20" y="30" fill="#8090b0" font-size="11" font-family="system-ui, sans-serif">
      Fog \${Math.round(ratio * 100)}% — \${risky} of \${results.length} packages at risk
    </text>
    
    <!-- Height legend inside scene -->
    <g transform="translate(20, 80)">
      <rect x="0" y="0" width="180" height="70" fill="rgba(10,13,20,0.85)" stroke="#2a304a" stroke-width="1" rx="4"/>
      <text x="8" y="18" fill="#e8eaf6" font-size="10" font-weight="700" font-family="system-ui, sans-serif">Years since last release:</text>
      <text x="8" y="35" fill="#8090b0" font-size="9" font-family="system-ui, sans-serif">2 years: ~28px</text>
      <text x="8" y="50" fill="#8090b0" font-size="9" font-family="system-ui, sans-serif">5 years: ~70px</text>
      <text x="8" y="65" fill="#8090b0" font-size="9" font-family="system-ui, sans-serif">10 years: ~140px (max)</text>
    </g>
  </svg>
</section>
\`;
}

function buildGraveSVGElement(r, x, y, index) {
  const years = r.daysSinceRelease != null ? r.daysSinceRelease / 365 : 0;
  let stoneHeight = Math.round(years * 14);
  stoneHeight = Math.min(140, Math.max(r.plot === 'alive' ? 40 : 50, stoneHeight));
  
  const stoneWidth = r.isDirect ? 65 : 54;
  const scale = r.isDirect ? 1.2 : 1;
  const stoneY = y - stoneHeight;
  
  const plotColors = {
    alive: '#2a5c3a',
    ghost: 'rgba(255,255,255,0.7)',
    tombstone: '#6a6a8a',
    zombie: '#8a6a6a'
  };
  const color = plotColors[r.plot];
  
  let stoneShape = '';
  let extraElements = '';
  
  if (r.plot === 'alive') {
    // Green sprout
    stoneShape = \`
      <circle cx="\${x}" cy="\${y-15}" r="8" fill="\${color}"/>
      <rect x="\${x-2}" y="\${y-30}" width="4" height="15" fill="\${color}"/>
      <ellipse cx="\${x-6}" cy="\${y-25}" rx="5" ry="8" fill="\${color}" opacity="0.7"/>
      <ellipse cx="\${x+6}" cy="\${y-25}" rx="5" ry="8" fill="\${color}" opacity="0.7"/>
    \`;
  } else if (r.plot === 'ghost') {
    // White translucent ghost floating above stone
    const ghostX = x;
    const ghostY = stoneY - 30;
    stoneShape = \`
      <rect x="\${x - stoneWidth/2}" y="\${stoneY}" width="\${stoneWidth}" height="\${stoneHeight}" rx="8" ry="8" fill="#6a6a8a"/>
      <text x="\${x}" y="\${y-15}" text-anchor="middle" font-size="11" fill="#e8eaf6" font-weight="700" font-family="system-ui, sans-serif">\${Math.round(years)}y</text>
    \`;
    extraElements = \`
      <g class="ghost-float" style="animation: ghost-drift 3s ease-in-out infinite; transform-origin: \${ghostX}px \${ghostY}px;">
        <ellipse cx="\${ghostX}" cy="\${ghostY}" rx="18" ry="22" fill="\${color}"/>
        <path d="M \${ghostX-18} \${ghostY+10} Q \${ghostX-12} \${ghostY+18} \${ghostX-6} \${ghostY+10} Q \${ghostX} \${ghostY+18} \${ghostX+6} \${ghostY+10} Q \${ghostX+12} \${ghostY+18} \${ghostX+18} \${ghostY+10} L \${ghostX+18} \${ghostY-10} Q \${ghostX+18} \${ghostY-22} \${ghostX} \${ghostY-22} Q \${ghostX-18} \${ghostY-22} \${ghostX-18} \${ghostY-10} Z" fill="\${color}"/>
        <circle cx="\${ghostX-6}" cy="\${ghostY-5}" r="2.5" fill="#0a0d14"/>
        <circle cx="\${ghostX+6}" cy="\${ghostY-5}" r="2.5" fill="#0a0d14"/>
      </g>
    \`;
  } else if (r.plot === 'zombie') {
    // Red-tinted tombstone + rising zombie hand
    const handY = y + 5;
    stoneShape = \`
      <rect x="\${x - stoneWidth/2}" y="\${stoneY}" width="\${stoneWidth}" height="\${stoneHeight}" rx="8" ry="8" fill="#8a6a6a" stroke="#c0392b" stroke-width="2"/>
      <text x="\${x}" y="\${y-15}" text-anchor="middle" font-size="11" fill="#e8eaf6" font-weight="700" font-family="system-ui, sans-serif">\${Math.round(years)}y</text>
    \`;
    extraElements = \`
      <g class="zombie-hand" style="animation: zombie-rise 2.5s ease-in-out infinite; transform-origin: \${x}px \${handY}px;">
        <!-- Palm -->
        <ellipse cx="\${x}" cy="\${handY+12}" rx="12" ry="8" fill="#4a9a3a" opacity="0.9"/>
        <!-- Forearm -->
        <rect x="\${x-3}" y="\${handY}" width="6" height="14" rx="3" fill="#4a9a3a"/>
        <!-- Fingers -->
        <rect x="\${x-10}" y="\${handY+6}" width="4" height="10" rx="2" fill="#4a9a3a"/>
        <rect x="\${x-4}" y="\${handY+4}" width="4" height="12" rx="2" fill="#4a9a3a"/>
        <rect x="\${x+2}" y="\${handY+4}" width="4" height="12" rx="2" fill="#4a9a3a"/>
        <rect x="\${x+8}" y="\${handY+6}" width="4" height="10" rx="2" fill="#4a9a3a"/>
        <!-- Thumb -->
        <ellipse cx="\${x+12}" cy="\${handY+10}" rx="3" ry="5" fill="#4a9a3a" transform="rotate(25 \${x+12} \${handY+10})"/>
      </g>
    \`;
  } else {
    // Tombstone
    stoneShape = \`
      <rect x="\${x - stoneWidth/2}" y="\${stoneY}" width="\${stoneWidth}" height="\${stoneHeight}" rx="8" ry="8" fill="\${color}"/>
      <text x="\${x}" y="\${y-15}" text-anchor="middle" font-size="11" fill="#e8eaf6" font-weight="700" font-family="system-ui, sans-serif">\${Math.round(years)}y</text>
    \`;
  }
  
  // Advisory badge
  let badge = '';
  if (r.advisories && r.advisories.length > 0) {
    badge = \`
      <circle cx="\${x + stoneWidth/2 - 5}" cy="\${stoneY + 10}" r="9" fill="#c0392b"/>
      <text x="\${x + stoneWidth/2 - 5}" y="\${stoneY + 14}" text-anchor="middle" font-size="10" fill="#fff" font-weight="700" font-family="system-ui, sans-serif">!</text>
    \`;
  }
  
  // Label on ground
  const labelY = y + 18;
  const plotLabel = { zombie:'Zombie', ghost:'Ghost', tombstone:'Tombstone', alive:'Alive' }[r.plot];
  const plotColorText = { zombie:'#4a9a3a', ghost:'#8090d0', tombstone:'#a080c0', alive:'#6aaa6a' }[r.plot];
  
  const truncName = r.name.length > 12 ? r.name.slice(0,11) + '…' : r.name;
  
  return \`
    <g class="grave-item" data-index="\${index}" role="button" tabindex="0" aria-label="\${escHtml(r.name)}@\${escHtml(r.version)} — \${plotLabel}\${r.advisories && r.advisories.length > 0 ? ' — has advisory' : ''}" style="cursor:pointer;">
      <title>\${escHtml(r.name)}@\${escHtml(r.version)}</title>
      \${stoneShape}
      \${extraElements}
      \${badge}
      <text x="\${x}" y="\${labelY}" text-anchor="middle" font-size="12" fill="#8090b0" font-family="SF Mono, Fira Code, monospace">\${escHtml(truncName)}</text>
      <text x="\${x}" y="\${labelY + 14}" text-anchor="middle" font-size="10" fill="\${plotColorText}" font-weight="700" font-family="system-ui, sans-serif" style="text-transform:uppercase;letter-spacing:0.05em;">\${plotLabel}</text>
    </g>
  \`;
}
`;
