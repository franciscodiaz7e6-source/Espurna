// ── UI / DOM UPDATES ───────────────────────────────────────
function updateNodeButtons(){
  for(var j=0;j<5;j++){
    var btn=document.getElementById('nb'+j);if(!btn)continue;
    btn.className='nbtn'+(j===selIdx?' active':NODES[j].deployed?'':' off');
  }
}

function selNode(i){
  selIdx=i;updateNodeButtons();updateNextTxCountdown();
  var d=nodeData[i],cfg=NODES[i];
  var titleEl=document.getElementById('liveCardTitle');
  var cardBorder=document.getElementById('liveCardBorder');
  var rEl=document.getElementById('riskSt');
  document.getElementById('histLbl').textContent=cfg.id;
  document.getElementById('nodeCoords').textContent=cfg.lat.toFixed(6)+', '+cfg.lng.toFixed(6);

  if(!d||d.temp===null||d.status==='waiting'){
    document.getElementById('mainT').textContent='—';
    document.getElementById('mainH').textContent='—';
    document.getElementById('mainS').textContent='—';
    rEl.textContent='—';rEl.style.color=txtColor();rEl.style.textShadow='none';
    document.getElementById('fCnt').textContent='—';
    var batEl2=document.getElementById('batPct');
    batEl2.textContent='—';batEl2.style.color=txtColor();
    document.getElementById('lastSeen').textContent='—';
    document.getElementById('histList').innerHTML='<div class="hrow" style="font-style:italic;"><span>'+(cfg.deployed?'Esperant primera dada...':'Pendent desplegament')+'</span></div>';
    titleEl.innerHTML='<div class="stale-dot"></div>DADES EN ESPERA';
    titleEl.className='card-title ct-s';
    cardBorder.className='card card-l-stale stale-card';
    return;
  }

  var tEl=document.getElementById('mainT');
  tEl.textContent=d.temp.toFixed(1);tEl.className='mbig-val vt'+(d.temp>40?' hot':'');
  document.getElementById('mainH').textContent=d.hum!==null?d.hum.toFixed(1):'—';
  var sEl=document.getElementById('mainS');
  sEl.textContent=d.soil!==null?d.soil:'—';
  sEl.className='mmini-val vs'+(d.soil!==null&&d.soil<15?' dry':'');
  document.getElementById('fCnt').textContent=d.fCnt||'—';
  document.getElementById('lastSeen').textContent=timeSince(d.rawTime)||d.time||'—';

  var batEl=document.getElementById('batPct');
  if(d.bat_pct!==null){
    var batV=(d.bat_mv?(d.bat_mv/1000).toFixed(2)+'V':'—');
    batEl.textContent=d.bat_pct+'% ('+batV+')';
    batEl.style.color=batColor(d.bat_pct);
  } else {
    batEl.textContent='—';batEl.style.color=txtColor();
  }

  if(d.status==='offline'){
    rEl.textContent='○ OFFLINE (MEMÒRIA)';rEl.style.color=offlineColor();rEl.style.textShadow='none';
    titleEl.innerHTML='<div class="stale-dot"></div>DADES RETARDADES';
    titleEl.className='card-title ct-s';
    cardBorder.className='card card-l-stale stale-card';
  } else {
    if(d.temp>40){
      var _motCrit=[];
      if(d.temp>40)_motCrit.push('Temp. crítica');
      if(d.soil!==null&&d.soil<15)_motCrit.push('Sòl sec');
      if(d.soil!==null&&d.soil>80)_motCrit.push('Sòl molt humit');
      if(d.temp!==null&&d.temp<5)_motCrit.push('Temp. baixa');
      if(d.hum!==null&&d.hum<30)_motCrit.push('Hum. baixa');
      if(d.hum!==null&&d.hum>80)_motCrit.push('Hum. alta');
      rEl.innerHTML='⚠ RISC CRÍTIC'+(_motCrit.length?' <span style="color:var(--amber);font-size:11px;">('+_motCrit.join(', ')+')</span>':'');rEl.style.color='var(--red)';
      cardBorder.className='card card-l-red';
    } else if(d.temp>35||(d.soil!==null&&d.soil<15)){
      var _motMod=[];
      if(d.temp>35)_motMod.push('Temp. elevada');
      if(d.soil!==null&&d.soil<15)_motMod.push('Sòl sec');
      if(d.soil!==null&&d.soil>80)_motMod.push('Sòl molt humit');
      if(d.temp!==null&&d.temp<5)_motMod.push('Temp. baixa');
      if(d.hum!==null&&d.hum<30)_motMod.push('Hum. baixa');
      if(d.hum!==null&&d.hum>80)_motMod.push('Hum. alta');
      rEl.innerHTML='⚠ RISC MODERAT'+(_motMod.length?' <span style="color:var(--red);font-size:11px;">('+_motMod.join(', ')+')</span>':'');rEl.style.color='var(--amber)';
      cardBorder.className='card card-l-amber';
    } else {
      rEl.textContent='✓ NORMAL';rEl.style.color='var(--green)';
      cardBorder.className='card card-l-green';
    }
    rEl.style.textShadow='';
    titleEl.innerHTML='<div class="live-dot"></div>DADES EN VIU';
    titleEl.className='card-title ct-g';
  }

  var h=d.history||[];
  document.getElementById('histList').innerHTML=h.length
    ?h.slice(0,24).map(function(r){
      var batStr=r.bat_pct!=null?(r.bat_pct+'% ('+(r.bat_mv?(r.bat_mv/1000).toFixed(2)+'V':'—')+')'):'—';
      var batCol=r.bat_pct!=null?(r.bat_pct>50?'var(--green)':r.bat_pct>20?'var(--amber)':'var(--red)'):'var(--txt3)';
      return '<div class="hrow" style="justify-content:space-between;">'+
        '<span style="color:var(--cyan);font-size:11px;font-weight:600;min-width:36px;">'+r.time+'</span>'+
        '<div style="display:flex;gap:6px;justify-content:center;align-items:center;">'+
        '<span class="ht">'+(r.temp!==null?r.temp.toFixed(1):'—')+'°C</span>'+
        '<span class="hh">'+(r.hum!==null?(typeof r.hum==='number'?r.hum.toFixed(0):r.hum):'—')+'%</span>'+
        '<span class="hs">'+(r.soil!==null?r.soil:'—')+'%</span>'+
        '</div>'+
        '<span style="color:'+batCol+';font-size:10.5px;min-width:80px;text-align:right;">'+batStr+'</span>'+
        '</div>';
    }).join('')
    :'<div class="hrow"><span style="color:var(--txt3);">Sense historial</span></div>';
}

function checkAlerts(){
  var crit=nodeData.filter(function(d){return d&&d.temp>40&&d.status==='online';});
  var warn=nodeData.filter(function(d){return d&&d.temp>35&&d.temp<=40&&d.status==='online';});
  var box=document.getElementById('alertBox');
  box.classList.remove('on');
}

function renderGrid(){
  document.getElementById('sgrid').innerHTML=NODES.map(function(cfg,i){
    var d=nodeData[i];
    var hasData=d&&d.temp!==null;
    var online=d&&d.status==='online'&&isOnline(d.rawTime);
    if(!hasData)return '<div class="scard card-l-stale stale-card">'+
      '<div class="sacc" style="background:rgba(128,128,128,.2);box-shadow:none;"></div>'+
      '<div class="shdr"><span class="sid" style="color:var(--txt2)">'+cfg.id+'</span>'+
      '<span class="sst" style="color:var(--txt3)"><span class="sdot stale-dot"></span>'+(cfg.deployed?'SENSE DADES':'PENDENT')+'</span></div>'+
      '<div class="svals">'+['Temp','Hum.Aire','Hum.Sòl'].map(function(l){
        return '<div class="sv"><div class="svl">'+l+'</div><div class="svn" style="color:var(--txt3);font-size:1.6rem;">—</div></div>';
      }).join('')+'</div>'+
      '<div class="sftr"><span>'+(cfg.deployed?'Esperant paquets...':'Pendent desplegament')+'</span></div></div>';

    var isCrit=d.temp>40,isWarn=d.temp>35||(d.soil!==null&&d.soil<15);
    var acc=isCrit?'var(--red)':isWarn?'var(--amber)':'var(--green)';
    var accHex=isCrit?'#ff1744':isWarn?'#ffab40':'#00ff88';
    var cardClass=online?'':'stale-card';
    return '<div class="scard '+cardClass+'">'+
      '<div class="sacc" style="background:'+(online?acc:'rgba(128,128,128,.2)')+';box-shadow:'+(online?(isCrit?'0 0 4px #ff1744,0 0 12px #ff1744,0 0 28px rgba(255,23,68,.5)':isWarn?'0 0 4px #ffab40,0 0 12px #ffab40,0 0 28px rgba(255,171,64,.5)':'0 0 4px #00ff88,0 0 12px #00ff88,0 0 28px rgba(0,255,136,.5)'):'none')+'"></div>'+
      '<div class="shdr">'+
      '<span class="sid" style="color:'+(online?acc:'var(--txt2)')+'">'+cfg.id+'</span>'+
      '<span class="sst" style="color:'+(online?acc:'var(--txt3)')+'"><span class="sdot" style="background:'+(online?accHex:'rgba(128,128,128,.3)')+';box-shadow:'+(online?(isCrit?'0 0 4px #ff1744,0 0 12px #ff1744,0 0 24px rgba(255,23,68,.5)':isWarn?'0 0 4px #ffab40,0 0 12px #ffab40,0 0 24px rgba(255,171,64,.5)':'0 0 4px #00ff88,0 0 12px #00ff88,0 0 24px rgba(0,255,136,.5)'):'none')+';animation:'+(online?'blink 1.4s ease-in-out infinite':'none')+'"></span>'+(online?'ONLINE':'OFFLINE')+'</span></div>'+
      '<div class="svals">'+
      '<div class="sv"><div class="svl">Temp</div><div class="svn '+(isCrit?'vt hot':'vt')+'">'+d.temp.toFixed(1)+'</div><div class="svu">°C</div></div>'+
      '<div class="sv"><div class="svl">Hum.Aire</div><div class="svn vh">'+(d.hum!==null?d.hum.toFixed(0):'—')+'</div><div class="svu">%</div></div>'+
      '<div class="sv"><div class="svl">Hum.Sòl</div><div class="svn '+(d.soil!==null&&d.soil<15?'vs dry':'vs')+'">'+(d.soil!==null?d.soil:'—')+'</div><div class="svu">%</div></div>'+
      '</div>'+
      '<div class="sftr">'+
      '<span class="srisk" style="color:'+(online?acc:'var(--txt3)')+'">'+(online?'':'○ MEMÒRIA · ')+(isCrit?'⚠ CRÍTIC':isWarn?'⚠ MODERAT':'✓ NORMAL')+'</span>'+
      '<span>'+timeSince(d.rawTime)+'</span>'+
      '<span>FC:'+(d.fCnt||'—')+'</span>'+
      '</div></div>';
  }).join('');
}

function updateNextTxCountdown(){
  var d=nodeData[selIdx],el=document.getElementById('nextTx');if(!el)return;
  if(!d||d.temp===null||!d.rawTime){el.textContent='—';el.style.color=txtColor();el.style.textShadow='';return;}
  var remaining=OFFLINE_MS-(Date.now()-new Date(d.rawTime).getTime());
  if(remaining<=0){
    el.textContent='○ DESCONNECTAT / RETARDAT';el.style.color=offlineColor();el.style.textShadow='none';return;
  }
  el.style.textShadow='';
  var mins=Math.floor(remaining/60000),secs=Math.floor((remaining%60000)/1000);
  el.textContent='en '+mins+'m '+secs.toString().padStart(2,'0')+'s';
  el.style.color=mins<2?'var(--amber)':mins<10?'var(--cyan)':'var(--txt3)';
}

function updateAllColors(){
  selNode(selIdx);
  updateMapMarkers();
  updateNextTxCountdown();
  NODES.forEach(function(_,i){updateNodePopup(i);});
  renderGrid();
}

function showToolInfo(data){}


// ── STATS + EXPORT ─────────────────────────────────────────────
function _updateStats(hist){
  if(!hist||!Array.isArray(hist))return;
  function calcStats(arr){
    var v=arr.filter(function(x){return x!==null&&x!==undefined;});
    if(!v.length) return '— / — / —';
    var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v);
    var avg=v.reduce(function(a,b){return a+b;},0)/v.length;
    return mn.toFixed(1)+' / '+mx.toFixed(1)+' / '+avg.toFixed(1);
  }
  var el=function(id){return document.getElementById(id);};
  if(el('db-stat-temp')) el('db-stat-temp').style.color='#f0c040'; if(el('db-stat-temp')) el('db-stat-temp').textContent = calcStats(hist.map(function(r){return r.temp;}));
  if(el('db-stat-hum'))  el('db-stat-hum').style.color='#4aa8d8'; if(el('db-stat-hum'))  el('db-stat-hum').textContent  = calcStats(hist.map(function(r){return r.hum;}));
  if(el('db-stat-bat'))  el('db-stat-bat').style.color='#5bbf7a'; if(el('db-stat-bat'))  el('db-stat-bat').textContent  = calcStats(hist.map(function(r){return r.bat_pct;}));
  // Tendència bateria
  if(el('db-bat-trend')&&hist.length>=2){
    var bats=hist.map(function(r){return r.bat_pct;}).filter(function(x){return x!==null;});
    if(bats.length>=2){
      var first=bats[bats.length-1];var last=bats[0];
      var diff=last-first;
      // Calcular hores reals segons rang
      var hoursMap={'24h':24,'7d':168,'30d':720,'1y':8760};
      var hoursTotal=hoursMap[_dbRange]||24;
      var ratePerHour=hoursTotal>0?diff/hoursTotal:0;
      var html='';
      // Prediccio esgotament: NOMES en 24h, basada en taxa neta real
      var hoursLeft=(_dbRange==='24h'&&Math.abs(ratePerHour)>0.001)?Math.abs(last/ratePerHour):null;
      if(Math.abs(diff)<1){
        html='<span style="color:#ffab40;font-weight:bold;">→ Estable</span>';
      } else if(diff>0){
        html='<span style="color:#00ff88;font-weight:bold;">↑ +'+diff.toFixed(1)+'%</span><span style="color:rgba(0,229,255,.7);font-size:9px;"> · velocitat càrrega ('+ratePerHour.toFixed(2)+'%/h)</span>';
      } else {
        html='<span style="color:#ff4444;font-weight:bold;">↓ '+diff.toFixed(1)+'%</span><span style="color:rgba(0,229,255,.7);font-size:9px;"> · velocitat descàrrega ('+Math.abs(ratePerHour).toFixed(2)+'%/h)</span>';
        if(diff<-10) html+='<span style="color:#ff6b35;font-size:9px;"> · Descàrrega ràpida!</span>';
      }
      if(hoursLeft){
        var daysLeft=hoursLeft/24;
        var timeStr=daysLeft>=1?Math.round(daysLeft)+' dies':Math.round(hoursLeft)+'h';
        var urgCol=hoursLeft<24?'#ff4444':hoursLeft<48?'#ffa94d':'#ffe066';
        html+='<span style="color:'+urgCol+';font-size:9px;"> · Esgotament en '+timeStr+'</span>';
      }
      el('db-bat-trend').style.cssText='font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;';
      el('db-bat-trend').innerHTML=html;
    }
  }
  if(el('db-stat-count')){
    var idx=(typeof selIdx!=='undefined')?selIdx:0;
    var d=nodeData&&nodeData[idx];
    var status=d?d.status:'—';
    var statusCol=status==='online'?'#00ff88':status==='offline'?'#ff1744':'#ffab40';
    el('db-stat-count').innerHTML=hist.length+' mostres &nbsp;<span style="color:'+statusCol+';text-transform:uppercase;">● '+status+'</span>';
  }
}

function exportDashboardCSV(){
  var idx=(typeof selIdx!=='undefined')?selIdx:0;
  var cfg=NODES&&NODES[idx];
  var hist=nodeData&&nodeData[idx]&&nodeData[idx].history||[];
  if(!hist.length){alert('Sense dades per exportar');return;}
  var rows=['HORA,TEMP(°C),HUM_AIRE(%),HUM_SOL(%),BAT_PCT(%),BAT_MV(mV)'];
  hist.forEach(function(r){
    rows.push([r.time,r.temp!==null?r.temp:'',r.hum!==null?r.hum:'',r.soil!==null?r.soil:'',r.bat_pct!==null?r.bat_pct:'',r.bat_mv!==null?r.bat_mv:''].join(','));
  });
  var blob=new Blob([rows.join('\n')],{type:'text/csv'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=(cfg?cfg.id:'node')+'_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
}

// ── NODE DASHBOARD ─────────────────────────────────────────────
var _dbCharts = {};
var _dbRange = '24h';
var _dbRangeLabels={'24h':'Últimes 24 hores','7d':'Últims 7 dies','30d':'Últims 30 dies','1y':'Últim any'};

function openNodeDashboard(){
  document.getElementById('node-dashboard').style.display = 'block';
  ['elev-panel','firms-panel','ndvi-panel','power-panel','eonet-panel','burned-panel','aq-panel','aemet-panel'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.zIndex='1';
  });
  var cp=document.getElementById('coords-panel');if(cp)cp.style.display='none';
  if(typeof ndviLayer!=='undefined'&&ndviLayer){try{map.removeLayer(ndviLayer);}catch(e){}ndviVisible=false;}
  if(typeof closeHMenu==="function") closeHMenu();
  document.body.classList.add('dashboard-open');
  document.querySelectorAll('#tool-info,#los-hint,#los-dots-wrap,#rf-dots-wrap,#pn-dots-wrap,#pn-panel,#pn-modal,#rf-legend,#rf-overlay').forEach(function(el){ if(el) el.style.setProperty('display','none','important'); });
  var _pm=document.getElementById('pn-modal');if(_pm){_pm.style.display='none';}_pnPending=null;
  _renderDashboard();
}

function closeNodeDashboard(){
  document.getElementById('node-dashboard').style.display = 'none';
  var _ep=document.getElementById('elev-panel');if(_ep)_ep.style.zIndex='';
  ['elev-panel','firms-panel','ndvi-panel','power-panel','eonet-panel','burned-panel','aq-panel','aemet-panel'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.zIndex='1500';});
  var cp=document.getElementById('coords-panel');if(cp)cp.style.display='block';
  if(typeof closeHMenu==="function") closeHMenu();
  document.body.classList.remove('dashboard-open');
  var lw=document.getElementById('los-dots-wrap');if(lw)lw.style.display=(typeof losMode!=='undefined'&&losMode)?'block':'none';
  var rw=document.getElementById('rf-dots-wrap');if(rw)rw.style.display=(typeof covMode!=='undefined'&&covMode)?'block':'none';
  var pw=document.getElementById('pn-dots-wrap');if(pw)pw.style.display=(typeof pnMode!=='undefined'&&pnMode)?'block':'none';
  var pp=document.getElementById('pn-panel');if(pp)pp.style.display=(typeof pnMode!=='undefined'&&pnMode)?'block':'none';
  losMenuOpen=false;rfMenuOpen=false;
  var ld=document.getElementById('los-dots-menu');if(ld)ld.classList.remove('open');
  var rd=document.getElementById('rf-dots-menu');if(rd)rd.classList.remove('open');
}

function setDbRange(r){
  _dbRange = r;
  if(typeof fetchAllNodes==='function') fetchAllNodes();
  var rangeLabels={'24h':'Últimes 24 hores','7d':'Últims 7 dies','30d':'Últims 30 dies','1y':'Últim any'};
  var rl=rangeLabels[r]||r;
  var titles={'db-title-temp':'TEMPERATURA (°C) — '+rl,'db-title-hum':'HUMITAT AIRE (%) — '+rl,'db-title-bat':'BATERIA (%) — '+rl,'db-title-soil':'HUMITAT SÒL (%) — '+rl};
  Object.keys(titles).forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=titles[id];});
  _dbCustomDate = null;
  document.getElementById('db-date-picker').value = '';
  document.querySelectorAll('.db-range-btn').forEach(function(b){
    b.style.background  = b.dataset.r === r ? 'rgba(0,229,255,.15)' : 'transparent';
    b.style.color       = b.dataset.r === r ? '#00e5ff' : 'rgba(0,229,255,.4)';
    b.style.borderColor = b.dataset.r === r ? 'rgba(0,229,255,.4)' : 'rgba(0,229,255,.12)';
  });
  if(r === '24h'){
    _renderDashboard(); // usa historial en memoria
  } else {
    _fetchAndRender(r, null);
  }
}


function setDbDate(dateStr){
  if(!dateStr) return;
  document.querySelectorAll('.db-range-btn').forEach(function(b){
    b.style.background  = 'transparent';
    b.style.color       = 'rgba(0,229,255,.4)';
    b.style.borderColor = 'rgba(0,229,255,.12)';
  });
  _dbRange = 'custom';
  _dbCustomDate = dateStr;
  _fetchAndRender(null, dateStr);
}

var _dbCustomDate = null;


async function _fetchAndRender(rangeStr, dateStr){
  var idx = (typeof selIdx !== "undefined") ? selIdx : 0;
  var _rl=(_dbRangeLabels&&_dbRangeLabels[_dbRange])||'Últimes 24 hores';
  ['temp','hum','bat','soil'].forEach(function(k){
    var names={temp:'TEMPERATURA (°C)',hum:'HUMITAT AIRE (%)',bat:'BATERIA (%)',soil:'HUMITAT SÒL (%)'};
    var el=document.getElementById('db-title-'+k);
    if(el){el.textContent=names[k]+' — '+_rl;el.style.fontSize='10px';}
  });
  // Mostrar loading en charts
  ['db-chart-temp','db-chart-hum','db-chart-bat','db-chart-soil'].forEach(function(id){
    if(_dbCharts[id]){ _dbCharts[id].destroy(); delete _dbCharts[id]; }
  });
  var hist = await fetchHistRange(idx, rangeStr, dateStr);
  // Renderizar con datos del rango
  var labels = hist.map(function(r){ return r.ts || r.time; }).reverse();
  var temps  = hist.map(function(r){ return r.temp; }).reverse();
  var hums   = hist.map(function(r){ return r.hum;  }).reverse();
  var bats   = hist.map(function(r){ return r.bat_pct; }).reverse();
  var soils  = hist.map(function(r){ return r.soil; }).reverse();
  var _rangeMs={'24h':86400000,'7d':604800000,'30d':2592000000,'1y':31536000000}[rangeStr]||86400000;
  _dbChart('db-chart-temp', labels, temps, '#f0c040', '°C', _rangeMs);
  _dbChart('db-chart-hum',  labels, hums,  '#4aa8d8', '%',  _rangeMs);
  _dbChart('db-chart-bat',  labels, bats,  '#5bbf7a', '%',  _rangeMs);
  _dbChart('db-chart-soil', labels, soils, '#d4854a', '%',  _rangeMs);
  // Taula
  var tbl = document.getElementById('db-hist-table');
  if(tbl){
    if(!hist.length){
      tbl.innerHTML='<div style="color:rgba(0,229,255,.3);font-size:10px;padding:8px;">Sense dades per aquest rang</div>';
    } else {
      var rows='<div class="db-hist-row db-hist-hdr"><span>HORA</span><span>TEMP</span><span>HUM AIRE</span><span>HUM SOL</span><span>BATERIA</span></div>';
      hist.forEach(function(r){
        var batCol=r.bat_pct!=null?(r.bat_pct>50?'#5bbf7a':r.bat_pct>20?'#d4a843':'#c05050'):'rgba(100,130,150,.5)';
        rows+='<div class="db-hist-row">'
          +'<span style="color:rgba(0,229,255,.55);">'+r.time+'</span>'
          +'<span style="color:#00e5ff;">'+(r.temp!=null?r.temp.toFixed(1)+'°C':'—')+'</span>'
          +'<span style="color:#00ff88;">'+(r.hum!=null?r.hum.toFixed(1)+'%':'—')+'</span>'
          +'<span style="color:#d4854a;">'+(r.soil!=null?r.soil+'%':'—')+'</span>'
          +'<span style="color:'+batCol+';">'+(r.bat_pct!=null?r.bat_pct+'% ('+(r.bat_mv?(r.bat_mv/1000).toFixed(2)+'V':'—')+')':'—')+'</span>'
          +'</div>';
      });
      tbl.innerHTML=rows;
    }
  }
  _updateStats(hist);
  document.getElementById('db-last-update').textContent='Actualitzat: '+new Date().toLocaleTimeString('ca-ES');
}

function _renderDashboard(){
  var idx = (typeof selIdx !== "undefined") ? selIdx : 0;
  var _rl=(_dbRangeLabels&&_dbRangeLabels[_dbRange])||'Últimes 24 hores';
  ['temp','hum','bat','soil'].forEach(function(k){
    var names={temp:'TEMPERATURA (°C)',hum:'HUMITAT AIRE (%)',bat:'BATERIA (%)',soil:'HUMITAT SÒL (%)'};
    var el=document.getElementById('db-title-'+k);
    if(el){el.textContent=names[k]+' — '+_rl;el.style.fontSize='10px';}
  });
  var d   = nodeData && nodeData[idx];
  var cfg = NODES && NODES[idx];
  if(!d) return;

  // Títol
  document.getElementById('db-node-title').textContent = (cfg && cfg.name) || ('RAK-NODO-0'+(idx+1));

  // KPIs
  function setVal(id, val, dec){ var e=document.getElementById(id); if(e) e.textContent = val!==null&&val!==undefined ? parseFloat(val).toFixed(dec||0) : '—'; }
  setVal('db-temp',    d.temp,    1);
  setVal('db-hum',     d.hum,     0);
  setVal('db-soil',    d.soil,    0);
  setVal('db-fcnt',    d.fCnt,    0);
  var batEl = document.getElementById('db-bat-pct');
  var mvEl  = document.getElementById('db-bat-mv');
  if(batEl) batEl.textContent = d.bat_pct !== null && d.bat_pct !== undefined ? d.bat_pct : '—';
  if(mvEl)  mvEl.textContent  = d.bat_mv  ? (d.bat_mv/1000).toFixed(2) : '—';

  // Color RSSI / SNR si existeixen
  var rssiEl = document.getElementById('db-rssi');
  var snrEl  = document.getElementById('db-snr');
  if(rssiEl) rssiEl.textContent = d.rssi !== null && d.rssi !== undefined ? d.rssi+' dBm' : '—';
  if(snrEl)  snrEl.textContent  = d.snr  !== null && d.snr  !== undefined ? d.snr+' dB'  : '—';

  // Color bateria KPI
  var kpiBat = document.getElementById('db-kpi-bat');
  if(kpiBat && d.bat_pct !== null && d.bat_pct !== undefined){
    var bc = d.bat_pct > 50 ? '#00ff88' : d.bat_pct > 20 ? '#ffab40' : '#ff1744';
    kpiBat.querySelector('.db-kpi-val').style.color = bc;
  }

  // Filtrar historial per rang
  // (updateStats es crida després de sliced)
  var hist = (d.history || []).slice();
  var now  = Date.now();
  var msMap = { '24h': 86400000, '7d': 604800000, '30d': 2592000000, '1y': 31536000000 };
  var ms   = msMap[_dbRange] || 86400000;
  // El historial té objectes {time(string HH:MM), temp, hum, soil, bat_mv, bat_pct}
  // Agafem els últims N punts segons rang
  var sliced;
  if(_dbRange === 'custom' && _dbCustomDate){
    // Filtrar entradas que coincidan con la fecha seleccionada (tiempo HH:MM del historial)
    // El historial guarda .time como HH:MM, necesitamos filtrar por fecha
    // Como no tenemos fecha completa en hist, tomamos todos los puntos del día actual
    sliced = hist.slice(0, 24).reverse();
  } else {
    var maxPts = { '24h': 24, '7d': 168, '30d': 720, '1y': 99999 };
    sliced = hist.slice(0, maxPts[_dbRange] || 24).reverse();
  }

  // Nombre màxim de punts per rang
  var _maxPtsPerChart={'24h':24,'7d':84,'30d':120,'1y':180}[_dbRange]||24;
  var _padCount=Math.max(0,_maxPtsPerChart-sliced.length);
  var _emptyPts=Array(_padCount).fill(null);
  var labels=_emptyPts.map(function(){return null;}).concat(sliced.map(function(r){
    return r.ts || r.time || '—';
  }));
  var _padData=_emptyPts;
  var temps  = _padData.concat(sliced.map(function(r){ return r.temp !== null ? r.temp : null; }));
  var hums   = _padData.concat(sliced.map(function(r){ return r.hum  !== null ? r.hum  : null; }));
  var bats   = _padData.concat(sliced.map(function(r){ return r.bat_pct !== null ? r.bat_pct : null; }));
  var soils  = _padData.concat(sliced.map(function(r){ return r.soil !== null ? r.soil : null; }));

  _updateStats(sliced);
  var _rMs={'24h':86400000,'7d':604800000,'30d':2592000000,'1y':31536000000}[_dbRange]||86400000;
  _dbChart('db-chart-temp', labels, temps, '#f0c040', '°C', _rMs);
  _dbChart('db-chart-hum',  labels, hums,  '#4aa8d8', '%',  _rMs);
  _dbChart('db-chart-bat',  labels, bats,  '#5bbf7a', '%',  _rMs);
  _dbChart('db-chart-soil', labels, soils, '#d4854a', '%',  _rMs);

  // Taula historial
  var tbl = document.getElementById('db-hist-table');
  if(tbl){
    if(!hist.length){
      tbl.innerHTML = '<div style="color:rgba(0,229,255,.3);font-size:10px;padding:8px;">Sense historial disponible</div>';
    } else {
      var rows = '<div class="db-hist-row db-hist-hdr"><span>HORA</span><span>TEMP</span><span>HUM AIRE</span><span>HUM SÒL</span><span>BATERIA</span></div>';
      hist.forEach(function(r){
        var batCol = r.bat_pct!=null?(r.bat_pct>50?'#5bbf7a':r.bat_pct>20?'#d4a843':'#c05050'):'rgba(100,130,150,.5)';
        rows += '<div class="db-hist-row">'
          +'<span style="color:rgba(0,229,255,.55);">'+r.time+'</span>'
          +'<span style="color:#f0c040;">'+(r.temp!=null?r.temp+'°C':'—')+'</span>'
          +'<span style="color:#4aa8d8;">'+(r.hum!=null?r.hum+'%':'—')+'</span>'
          +'<span style="color:#d4854a;">'+(r.soil!=null?r.soil+'%':'—')+'</span>'
          +'<span style="color:'+batCol+';">'+(r.bat_pct!=null?r.bat_pct+'% ('+(r.bat_mv?(r.bat_mv/1000).toFixed(2)+'V':'—')+')':'—')+'</span>'
          +'</div>';
      });
      tbl.innerHTML = rows;
    }
  }
}

function _dbChart(canvasId, labels, data, color, unit, rangeMs){
  var ctx = document.getElementById(canvasId);
  if(!ctx) return;
  if(_dbCharts[canvasId]){ _dbCharts[canvasId].destroy(); delete _dbCharts[canvasId]; }
  var hasData = data.some(function(v){ return v !== null; });
  _dbCharts[canvasId] = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: hasData ? labels : ['—'],
      datasets: [{
        data: hasData ? data : [null],
        borderColor: color,
        backgroundColor: (function(){
          var c = ctx.getContext('2d');
          var g = c.createLinearGradient(0,0,0,120);
          g.addColorStop(0, color+'33');
          g.addColorStop(1, color+'00');
          return g;
        })(),
        borderWidth: 1.5,
        pointRadius: data.length < 10 ? 3 : 0,
        pointBackgroundColor: color,
        tension: 0.4,
        fill: true,
        spanGaps: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(4,14,30,.97)',
          borderColor: 'rgba(0,229,255,.2)', borderWidth: 1,
          titleColor: 'rgba(0,229,255,.6)', bodyColor: color,
          titleFont: {family:'Share Tech Mono',size:9},
          bodyFont:  {family:'Share Tech Mono',size:11},
          callbacks: { label: function(i){ return i.raw !== null ? i.raw + unit : '—'; } }
        }
      },
      scales: {
        x: {
          type: rangeMs ? 'time' : 'category',
          min: rangeMs ? Date.now() - rangeMs : undefined,
          max: rangeMs ? Date.now() : undefined,
          time: {
            unit: !rangeMs ? undefined :
                  rangeMs >= 31536000000 ? 'month' :
                  rangeMs >= 2592000000  ? 'week'  :
                  rangeMs >= 604800000   ? 'day'   : 'hour',
            displayFormats: {hour:'HH:mm',day:'dd/MM',week:'dd/MM',month:'MMM yy'}
          },
          grid: {color:'rgba(0,229,255,.04)', drawBorder:false},
          ticks: {color:'rgba(0,229,255,.35)',font:{family:'Share Tech Mono',size:8},maxTicksLimit:8,maxRotation:0}
        },
        y: {
          grid: {color:'rgba(0,229,255,.04)', drawBorder:false},
          ticks: {color:'rgba(0,229,255,.35)',font:{family:'Share Tech Mono',size:8},
            callback: function(v){ return parseFloat(v.toFixed(1))+unit; }
          }
        }
      }
    }
  });
}
