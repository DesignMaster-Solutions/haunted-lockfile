// src/page/styles.ts — all CSS for the graveyard page

export const styles = `
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
  --display:"IM Fell English SC",Georgia,serif;
}
html{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100%}
body{min-height:100vh;display:flex;flex-direction:column}

/* ── Focus ─────────────────────────────────────────────────────────── */
:focus-visible{outline:2px solid var(--focus);outline-offset:3px}
:focus:not(:focus-visible){outline:none}

/* ── Header ────────────────────────────────────────────────────────── */
header{padding:2rem 1.5rem 1rem;text-align:center;position:relative;z-index:10}
header h1{font-size:clamp(1.8rem,5vw,3rem);font-family:var(--display);letter-spacing:-.01em;font-weight:400}
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
.drop-zone-actions{margin-top:.75rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
#analyze-btn,#demo-btn{
  padding:.6rem 1.8rem;border:none;border-radius:4px;cursor:pointer;
  font-size:.9rem;font-weight:600;letter-spacing:.03em;transition:opacity .2s
}
#analyze-btn{background:var(--danger);color:#fff}
#demo-btn{background:var(--ghost-blue);color:#fff}
#analyze-btn:hover,#demo-btn:hover{opacity:.85}
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

/* ── Graveyard scene ─────────────────────────────────────────────────── */
#graveyard-wrap{
  position:relative;overflow:hidden;
  min-height:500px;flex:1;display:flex;flex-direction:column
}
#graveyard-scene{
  position:relative;flex:1;min-height:400px;
  display:flex;flex-direction:column;justify-content:flex-end;
  padding:2rem 1rem 1rem
}

/* Night sky background */
#sky{
  position:absolute;top:0;left:0;right:0;bottom:0;z-index:1;
  background:linear-gradient(to bottom,#0a0d14 0%,#1a1f2e 100%)
}
#moon{
  position:absolute;top:3rem;right:3rem;width:60px;height:60px;
  border-radius:50%;background:#e8eaf6;box-shadow:0 0 30px rgba(232,234,246,.4);
  z-index:2
}

/* Fog layer */
#fog{
  position:absolute;inset:0;pointer-events:none;z-index:5;
  background:radial-gradient(ellipse 80% 40% at 50% 100%,var(--fog),transparent);
  opacity:0;transition:opacity 1.5s
}
@media (prefers-reduced-motion:reduce){
  #fog{transition:none}
}

/* Fog caption */
#fog-caption{
  position:absolute;bottom:1rem;left:50%;transform:translateX(-50%);
  font-size:.75rem;color:var(--muted);opacity:0;transition:opacity 1s;
  z-index:6;pointer-events:none;text-align:center
}
#fog-caption.visible{opacity:1}

/* Ground */
#ground{
  position:absolute;bottom:0;left:0;right:0;height:100px;z-index:3;
  background:linear-gradient(to top,var(--ground) 0%,var(--ground-top) 60%,transparent 100%)
}

/* Graves container */
#graveyard{
  position:relative;z-index:4;
  display:flex;flex-wrap:wrap;align-content:flex-end;align-items:flex-end;
  gap:1rem;justify-content:center;padding-bottom:2rem;
  min-height:200px
}

/* ── Graves ─────────────────────────────────────────────────────────── */
.grave{
  position:relative;cursor:pointer;display:flex;flex-direction:column;
  align-items:center;user-select:none;transition:transform .15s
}
.grave:hover,.grave:focus-visible{transform:translateY(-4px)}

/* Direct deps are bigger */
.direct .grave-stone{transform:scale(1.2)}
.transitive{opacity:.8}

/* Grave SVG stone */
.grave-stone{
  position:relative;transition:transform .15s
}
.stone-svg{display:block}

/* Grave label */
.grave-label{
  font-family:var(--mono);font-size:.65rem;color:var(--muted);
  text-align:center;margin-top:.35rem;max-width:90px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis
}
.grave-plot-label{
  font-size:.6rem;letter-spacing:.05em;text-transform:uppercase;font-weight:700;
  margin-top:.15rem
}

/* Plot colours */
.alive .grave-plot-label{color:#6aaa6a}
.ghost .grave-plot-label{color:var(--ghost-blue)}
.tombstone .grave-plot-label{color:#a080c0}
.zombie .grave-plot-label{color:var(--zombie-green)}

/* Advisory badge on grave */
.grave-advisory-badge{
  position:absolute;top:-8px;right:-8px;
  width:18px;height:18px;border-radius:50%;
  background:var(--danger);color:#fff;font-size:.7rem;
  display:flex;align-items:center;justify-content:center;
  font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.3);
  pointer-events:none
}

/* Ghost drift — disabled by prefers-reduced-motion */
@media (prefers-reduced-motion:no-preference){
  .ghost .grave-stone{
    animation:drift 3s ease-in-out infinite;
  }
  @keyframes drift{
    0%,100%{transform:translateY(0)}
    50%{transform:translateY(-8px)}
  }
  .ghost.direct .grave-stone{
    animation:drift-large 3s ease-in-out infinite;
  }
  @keyframes drift-large{
    0%,100%{transform:scale(1.2) translateY(0)}
    50%{transform:scale(1.2) translateY(-8px)}
  }
  
  /* Zombie rising hand */
  .zombie .grave-hand{
    animation:rise 2.5s ease-in-out infinite;
  }
  @keyframes rise{
    0%,100%{transform:translateY(40%);opacity:.6}
    50%{transform:translateY(0);opacity:1}
  }
}

/* Height scale legend */
#height-legend{
  position:absolute;top:2rem;left:1rem;
  font-size:.7rem;color:var(--muted);z-index:6;
  background:rgba(10,13,20,.8);padding:.5rem .75rem;border-radius:4px;
  border:1px solid var(--border)
}
#height-legend div{margin-top:.25rem}

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
.badge-advisory{background:rgba(192,57,43,.2);color:var(--danger);margin-left:.5rem}
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
.table-advisory-badge{
  display:inline-block;padding:.15rem .4rem;border-radius:3px;
  background:var(--danger);color:#fff;font-size:.7rem;font-weight:700;
  margin-left:.3rem
}

/* ── Footer ──────────────────────────────────────────────────────────── */
footer{text-align:center;padding:1.5rem;color:var(--muted);font-size:.78rem;z-index:10;position:relative}
footer a{color:var(--muted)}

/* ── Responsive ──────────────────────────────────────────────────────── */
@media(max-width:400px){
  .grave-stone{transform:scale(.9)}
  .direct .grave-stone{transform:scale(1.05)}
  .grave-label{max-width:70px;font-size:.58rem}
  header h1{font-size:1.5rem}
  #moon{width:40px;height:40px;top:2rem;right:2rem}
  #height-legend{font-size:.65rem;padding:.4rem .6rem}
}

@media(min-width:768px){
  #graveyard{gap:1.5rem}
}
`;
