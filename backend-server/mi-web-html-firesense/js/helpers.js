// ── THEME STATE ────────────────────────────────────────────
function isLight(){return document.body.classList.contains('light');}
function tc(dark,light){return isLight()?light:dark;}

// ── COLOR HELPERS ──────────────────────────────────────────
function batColor(pct){return pct>50?'var(--green)':pct>20?'var(--amber)':'var(--red)';}
function txtColor(){return isLight()?'#0f172a':'#e0f7ff';}
function txt2Color(){return isLight()?'#475569':'rgba(0,229,255,.55)';}
function txt3Color(){return isLight()?'#94a3b8':'rgba(255,255,255,.4)';}
function offlineColor(){return isLight()?'#94a3b8':'rgba(255,255,255,.4)';}

// ── TIME HELPERS ───────────────────────────────────────────
function timeSince(iso){
  if(!iso)return null;
  var d=Date.now()-new Date(iso).getTime();
  if(d<60000)return 'fa <1 min';
  if(d<3600000)return 'fa '+Math.floor(d/60000)+' min';
  if(d<86400000)return 'fa '+Math.floor(d/3600000)+'h';
  return 'fa '+Math.floor(d/86400000)+'d';
}
function isOnline(iso){return iso&&(Date.now()-new Date(iso).getTime())<OFFLINE_MS;}
