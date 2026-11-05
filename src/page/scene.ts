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
  
  let graveElements = '';
  sorted.forEach((r, i) => {
    const x = 60 + (i % 10) * graveSpacing;
    const rowDepth = Math.floor(i / 10);
    const y = groundY - rowDepth * 140;
    graveElements += buildGraveSVGElement(r, x, y, groundY, rowDepth, i);
  });
  
  // Count risky packages for fog
  const counts = { zombie:0, ghost:0, tombstone:0, alive:0 };
  for (const r of results) counts[r.plot]++;
  const risky = counts.zombie + counts.ghost + counts.tombstone;
  const ratio = results.length > 0 ? risky / results.length : 0;
  
  // Fog: only render if there are risky packages
  let fogElements = '';
  if (risky > 0) {
    const baseOpacity = 0.35 * ratio;
    fogElements = \`
      <defs>
        <filter id="fog-blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="18"/>
        </filter>
      </defs>
      <ellipse cx="200" cy="\${groundY - 20}" rx="280" ry="60" fill="white" opacity="\${baseOpacity.toFixed(2)}" filter="url(#fog-blur)" class="fog-drift-1"/>
      <ellipse cx="600" cy="\${groundY}" rx="320" ry="70" fill="white" opacity="\${(baseOpacity * 0.9).toFixed(2)}" filter="url(#fog-blur)" class="fog-drift-2"/>
      <ellipse cx="400" cy="\${groundY + 10}" rx="300" ry="65" fill="white" opacity="\${(baseOpacity * 0.85).toFixed(2)}" filter="url(#fog-blur)" class="fog-drift-3"/>
    \`;
  }
  
  // Stars: 30 random stars with varying opacity
  let starElements = '';
  const starPositions = [
    {cx:120,cy:40,r:1.5,op:0.8}, {cx:280,cy:70,r:1,op:0.6}, {cx:450,cy:50,r:1.2,op:0.7},
    {cx:680,cy:90,r:1,op:0.5}, {cx:820,cy:60,r:1.3,op:0.75}, {cx:200,cy:120,r:0.8,op:0.4},
    {cx:550,cy:100,r:1.1,op:0.65}, {cx:350,cy:80,r:1,op:0.7}, {cx:750,cy:45,r:1.2,op:0.85},
    {cx:90,cy:110,r:0.9,op:0.5}, {cx:920,cy:100,r:1,op:0.6}, {cx:500,cy:30,r:1.1,op:0.75},
    {cx:160,cy:85,r:0.8,op:0.55}, {cx:640,cy:120,r:1,op:0.65}, {cx:380,cy:40,r:1.2,op:0.8},
    {cx:880,cy:85,r:1,op:0.7}, {cx:240,cy:55,r:0.9,op:0.6}, {cx:720,cy:70,r:1.1,op:0.75},
    {cx:420,cy:115,r:0.8,op:0.5}, {cx:580,cy:65,r:1,op:0.85}, {cx:300,cy:95,r:1.2,op:0.7},
    {cx:780,cy:110,r:0.9,op:0.55}, {cx:140,cy:60,r:1,op:0.65}, {cx:520,cy:85,r:1.1,op:0.75},
    {cx:860,cy:50,r:1,op:0.8}, {cx:190,cy:100,r:0.8,op:0.6}, {cx:660,cy:55,r:1.2,op:0.7},
    {cx:400,cy:75,r:1,op:0.65}, {cx:810,cy:95,r:1.1,op:0.75}, {cx:260,cy:110,r:0.9,op:0.55}
  ];
  starElements = starPositions.map((s, i) => {
    const twinkleClass = i % 3 === 0 ? ' class="star-twinkle"' : '';
    return \`<circle cx="\${s.cx}" cy="\${s.cy}" r="\${s.r}" fill="#e8eaf6" opacity="\${s.op}"\${twinkleClass}/>\`;
  }).join('');
  
  return \`
<section class="graveyard-container">
  <svg viewBox="0 0 \${sceneWidth} \${sceneHeight}" xmlns="http://www.w3.org/2000/svg" class="graveyard-svg" role="img" aria-label="Graveyard scene with \${results.length} packages">
    <defs>
      <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#e8eaf6" stop-opacity="1"/>
        <stop offset="60%" stop-color="#e8eaf6" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#e8eaf6" stop-opacity="0"/>
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
      \${starElements}
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
    \${fogElements}
    
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

function buildGraveSVGElement(r, x, baseGroundY, groundY, rowDepth, index) {
  const years = r.daysSinceRelease != null ? r.daysSinceRelease / 365 : 0;
  let stoneHeight = Math.round(years * 14);
  stoneHeight = Math.min(140, Math.max(r.plot === 'alive' ? 40 : 50, stoneHeight));
  
  const stoneWidth = r.isDirect ? 65 : 54;
  const isTransitive = !r.isDirect;
  const scale = isTransitive ? 0.7 : 1;
  const opacity = isTransitive ? 0.8 : 1;
  
  // Stone bottom sits exactly at groundY
  const stoneY = groundY - stoneHeight;
  
  let stoneShape = '';
  let extraElements = '';
  
  if (r.plot === 'alive') {
    // Green sprout sits on ground
    stoneShape = \`
      <g opacity="\${opacity}">
        <circle cx="\${x}" cy="\${groundY - 10}" r="8" fill="#2a5c3a"/>
        <rect x="\${x-2}" y="\${groundY - 25}" width="4" height="15" fill="#2a5c3a"/>
        <ellipse cx="\${x-6}" cy="\${groundY - 20}" rx="5" ry="8" fill="#2a5c3a" opacity="0.7"/>
        <ellipse cx="\${x+6}" cy="\${groundY - 20}" rx="5" ry="8" fill="#2a5c3a" opacity="0.7"/>
      </g>
    \`;
  } else if (r.plot === 'ghost') {
    // Stone with rounded top, ghost floating above
    const ghostX = x;
    const ghostY = stoneY - 30;
    const rx = stoneWidth / 2;
    stoneShape = \`
      <g opacity="\${opacity}">
        <defs>
          <linearGradient id="stone-grad-\${index}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#7a7a9a"/>
            <stop offset="100%" stop-color="#6a6a8a"/>
          </linearGradient>
        </defs>
        <path d="M \${x - rx} \${groundY} L \${x - rx} \${stoneY + rx} Q \${x - rx} \${stoneY} \${x} \${stoneY} Q \${x + rx} \${stoneY} \${x + rx} \${stoneY + rx} L \${x + rx} \${groundY} Z" fill="url(#stone-grad-\${index})" stroke="#5a5a7a" stroke-width="1"/>
        <text x="\${x}" y="\${stoneY + 20}" text-anchor="middle" font-size="11" fill="#e8eaf6" font-weight="700" font-family="system-ui, sans-serif">\${Math.round(years)}y</text>
      </g>
    \`;
    extraElements = \`
      <g class="ghost-float" style="animation: ghost-drift 3s ease-in-out infinite; transform-origin: \${ghostX}px \${ghostY}px;" opacity="\${opacity}">
        <ellipse cx="\${ghostX}" cy="\${ghostY}" rx="18" ry="22" fill="rgba(220,225,255,0.8)"/>
        <path d="M \${ghostX-18} \${ghostY+10} Q \${ghostX-12} \${ghostY+18} \${ghostX-6} \${ghostY+10} Q \${ghostX} \${ghostY+18} \${ghostX+6} \${ghostY+10} Q \${ghostX+12} \${ghostY+18} \${ghostX+18} \${ghostY+10} L \${ghostX+18} \${ghostY-10} Q \${ghostX+18} \${ghostY-22} \${ghostX} \${ghostY-22} Q \${ghostX-18} \${ghostY-22} \${ghostX-18} \${ghostY-10} Z" fill="rgba(220,225,255,0.8)"/>
        <circle cx="\${ghostX-6}" cy="\${ghostY-5}" r="2.5" fill="#0a0d14"/>
        <circle cx="\${ghostX+6}" cy="\${ghostY-5}" r="2.5" fill="#0a0d14"/>
      </g>
    \`;
  } else if (r.plot === 'zombie') {
    // Red-tinted stone with rounded top + zombie hand rising from ground
    const rx = stoneWidth / 2;
    const handX = x - stoneWidth / 4; // front-left of stone
    const handWristY = groundY + 6; // partially buried
    const handTipY = groundY - 32; // ~38px above ground
    stoneShape = \`
      <g opacity="\${opacity}">
        <defs>
          <linearGradient id="zombie-stone-grad-\${index}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#9a7a7a"/>
            <stop offset="100%" stop-color="#8a6a6a"/>
          </linearGradient>
        </defs>
        <path d="M \${x - rx} \${groundY} L \${x - rx} \${stoneY + rx} Q \${x - rx} \${stoneY} \${x} \${stoneY} Q \${x + rx} \${stoneY} \${x + rx} \${stoneY + rx} L \${x + rx} \${groundY} Z" fill="url(#zombie-stone-grad-\${index})" stroke="#c0392b" stroke-width="2"/>
        <text x="\${x}" y="\${stoneY + 20}" text-anchor="middle" font-size="11" fill="#e8eaf6" font-weight="700" font-family="system-ui, sans-serif">\${Math.round(years)}y</text>
      </g>
    \`;
    // Zombie hand: desaturated grey-green skin with dark outline
    extraElements = \`
      <g class="zombie-hand" style="animation: zombie-rise 2.5s ease-in-out infinite; transform-origin: \${handX}px \${handWristY}px;" opacity="\${opacity}">
        <!-- Forearm (partially buried) -->
        <rect x="\${handX-3}" y="\${handWristY}" width="6" height="14" rx="3" fill="#6b7a65" stroke="#2a2a2a" stroke-width="0.5"/>
        <!-- Palm -->
        <ellipse cx="\${handX}" cy="\${handWristY + 14}" rx="10" ry="6" fill="#6b7a65" stroke="#2a2a2a" stroke-width="0.5"/>
        <!-- Index finger (longest) -->
        <rect x="\${handX-2}" y="\${handTipY}" width="3" height="24" rx="1.5" fill="#6b7a65" stroke="#2a2a2a" stroke-width="0.5"/>
        <!-- Middle finger -->
        <rect x="\${handX+2}" y="\${handTipY + 2}" width="3" height="22" rx="1.5" fill="#6b7a65" stroke="#2a2a2a" stroke-width="0.5"/>
        <!-- Ring finger -->
        <rect x="\${handX-6}" y="\${handTipY + 4}" width="3" height="20" rx="1.5" fill="#6b7a65" stroke="#2a2a2a" stroke-width="0.5"/>
        <!-- Pinky -->
        <rect x="\${handX-10}" y="\${handTipY + 8}" width="2.5" height="16" rx="1.25" fill="#6b7a65" stroke="#2a2a2a" stroke-width="0.5"/>
        <!-- Thumb -->
        <ellipse cx="\${handX+9}" cy="\${handWristY + 16}" rx="2.5" ry="4" fill="#6b7a65" stroke="#2a2a2a" stroke-width="0.5" transform="rotate(35 \${handX+9} \${handWristY + 16})"/>
      </g>
    \`;
  } else {
    // Tombstone with rounded top
    const rx = stoneWidth / 2;
    stoneShape = \`
      <g opacity="\${opacity}">
        <defs>
          <linearGradient id="tomb-grad-\${index}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#7a7a9a"/>
            <stop offset="100%" stop-color="#6a6a8a"/>
          </linearGradient>
        </defs>
        <path d="M \${x - rx} \${groundY} L \${x - rx} \${stoneY + rx} Q \${x - rx} \${stoneY} \${x} \${stoneY} Q \${x + rx} \${stoneY} \${x + rx} \${stoneY + rx} L \${x + rx} \${groundY} Z" fill="url(#tomb-grad-\${index})" stroke="#5a5a7a" stroke-width="1"/>
        <text x="\${x}" y="\${stoneY + 20}" text-anchor="middle" font-size="11" fill="#e8eaf6" font-weight="700" font-family="system-ui, sans-serif">\${Math.round(years)}y</text>
      </g>
    \`;
  }
  
  // Advisory badge
  let badge = '';
  if (r.advisories && r.advisories.length > 0) {
    badge = \`
      <g opacity="\${opacity}">
        <circle cx="\${x + stoneWidth/2 - 5}" cy="\${stoneY + 10}" r="9" fill="#c0392b"/>
        <text x="\${x + stoneWidth/2 - 5}" y="\${stoneY + 14}" text-anchor="middle" font-size="10" fill="#fff" font-weight="700" font-family="system-ui, sans-serif">!</text>
      </g>
    \`;
  }
  
  // Labels: name at groundY + 18, plot word at groundY + 34, both inside the soil
  const labelNameY = groundY + 18;
  const labelPlotY = groundY + 34;
  const plotLabel = { zombie:'ZOMBIE', ghost:'GHOST', tombstone:'TOMBSTONE', alive:'ALIVE' }[r.plot];
  const plotColorText = { zombie:'#c0392b', ghost:'#d0daf0', tombstone:'#9090a0', alive:'#4a9a4a' }[r.plot];
  
  const truncName = r.name.length > 12 ? r.name.slice(0,11) + '…' : r.name;
  
  return \`
    <g class="grave-item" data-index="\${index}" role="button" tabindex="0" aria-label="\${escHtml(r.name)}@\${escHtml(r.version)} — \${plotLabel}\${r.advisories && r.advisories.length > 0 ? ' — has advisory' : ''}" style="cursor:pointer;" opacity="\${opacity}">
      <title>\${escHtml(r.name)}@\${escHtml(r.version)}</title>
      \${stoneShape}
      \${badge}
      <text x="\${x}" y="\${labelNameY}" text-anchor="middle" font-size="11" fill="#8090b0" font-family="SF Mono, Fira Code, monospace">\${escHtml(truncName)}</text>
      <text x="\${x}" y="\${labelPlotY}" text-anchor="middle" font-size="9" fill="\${plotColorText}" font-weight="700" font-family="system-ui, sans-serif" style="text-transform:uppercase;letter-spacing:0.08em;">\${plotLabel}</text>
      \${extraElements}
    </g>
  \`;
}
`;
