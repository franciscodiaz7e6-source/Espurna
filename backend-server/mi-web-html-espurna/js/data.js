// ── INFLUX ─────────────────────────────────────────────────
async function influxQuery(flux){
  var bust=Date.now();
  var r=await fetch(INFLUX_URL+'/api/v2/query?org='+encodeURIComponent(INFLUX_ORG)+'&_t='+bust,{
    method:'POST',cache:'no-store',
    headers:{'Authorization':'Token '+INFLUX_TOKEN,'Content-Type':'application/vnd.flux','Accept':'application/csv','Cache-Control':'no-store, no-cache','Pragma':'no-cache'},
    body:flux
  });
  if(!r.ok)throw new Error('InfluxDB HTTP '+r.status);
  return r.text();
}
function parseInfluxCSV(csv){
  var lines=csv.trim().split('\n').filter(function(l){return l&&!l.startsWith('#');});
  if(lines.length<2)return [];
  var hdrs=lines[0].split(',');
  var fi={field:hdrs.indexOf('_field'),value:hdrs.indexOf('_value'),time:hdrs.indexOf('_time')};
  return lines.slice(1).map(function(l){
    var cols=l.split(',');
    return {field:cols[fi.field],value:cols[fi.value],time:cols[fi.time]};
  }).filter(function(r){return r.field&&r.value;});
}

// ── HELPERS MODE ───────────────────────────────────────────
function isMeshcoreMode(){return typeof _currentDataSource!=='undefined'&&_currentDataSource==='meshcore';}
function activeNodes(){return isMeshcoreMode()?MESHCORE_NODES:NODES;}
function activeNodeData(){return isMeshcoreMode()?nodeDataMeshcoreExtra:nodeDataLorawan;}
function activeLastKnown(){return isMeshcoreMode()?lastKnownRawTimeMeshcore:lastKnownRawTimeLorawan;}

async function fetchNode(i){
  var _nodeCfg=isMeshcoreMode()?(MESHCORE_NODES[i]||null):NODES[i];
  if(!_nodeCfg||!_nodeCfg.deployed){if(activeNodeData()[i])activeNodeData()[i].status='waiting';return false;}
  // Nodos sense nodeTag (GW, repetidors): només mostrar estat 'relay', sense query InfluxDB
  if(isMeshcoreMode()&&!_nodeCfg.nodeTag){
    if(_nodeCfg.type==='gateway'||_nodeCfg.type==='repeater'){
      if(activeNodeData()[i])activeNodeData()[i].status='relay';
      return true;
    }
    if(activeNodeData()[i])activeNodeData()[i].status='waiting';
    return true;
  }
  try{
    var devEUI=_nodeCfg.devEUI||'';
    var nodeTag=_nodeCfg.nodeTag||'';
    var stopTs=new Date(Date.now()+5*60*1000).toISOString();
    var _rangeMap={'24h':'-26h','7d':'-8d','30d':'-31d','1y':'-366d'};
    var _rangeStr=typeof _dbRange!=='undefined'?(_rangeMap[_dbRange]||'-8d'):'-8d';
    var _limitMap={'24h':24,'7d':168,'30d':720,'1y':8760};
    var _limitN=typeof _dbRange!=='undefined'?(_limitMap[_dbRange]||24):24;
    //
    var rng='start:'+_rangeStr+',stop:'+stopTs;
    var isMeshcore=typeof _currentDataSource!=="undefined"&&_currentDataSource==="meshcore";
    var meas=isMeshcore?"meshcore_sensor":"espurna_sensors";
    var nodeFilter=isMeshcore?'|>filter(fn:(r)=>r["node"]=="'+nodeTag+'")':'|>filter(fn:(r)=>r["dev_eui"]=="'+devEUI+'")';
    var _base='from(bucket:"'+INFLUX_BUCKET+'")|>range('+rng+')|>filter(fn:(r)=>r["_measurement"]=="'+meas+'")'+nodeFilter;
    var results=await Promise.all(isMeshcore?[
      // MESHCORE queries
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="temperatura")|>last()'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="humedad_aire")|>last()'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="humedad_suelo")|>last()'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="rssi" or r["_field"]=="snr" or r["_field"]=="fcnt" or r["_field"]=="bateria_mv" or r["_field"]=="temp_suelo")|>last()'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="temperatura")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="bateria_mv")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="humedad_aire")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="humedad_suelo")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="temp_suelo")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
    ]:[
      // LORAWAN queries
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="temperatura")|>last()'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="humedad_aire")|>last()'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="humedad_suelo")|>last()'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="rssi" or r["_field"]=="snr" or r["_field"]=="fcnt" or r["_field"]=="bateria_mv" or r["_field"]=="bateria_pct")|>last()'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="temperatura")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="bateria_mv")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="humedad_aire")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
      influxQuery(_base+'|>filter(fn:(r)=>r["_field"]=="humedad_suelo")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
    ]);
    var rT=parseInfluxCSV(results[0]),rH=parseInfluxCSV(results[1]),rS=parseInfluxCSV(results[2]),rU=parseInfluxCSV(results[3]);
    var gv=function(rows){var r=rows.find(function(r){return r.value&&r.value!=='';});return r?parseFloat(r.value):null;};
    var temp=gv(rT),hum=gv(rH),soil=gv(rS);
    var rawT=(rT[0]||rH[0]||rS[0]||rU[0])?((rT[0]||rH[0]||rS[0]||rU[0]).time||null):null;
    var fCnt=null,rssi=null,snr=null,bat_mv=null,bat_pct=null;
    var temp_suelo=null;
    rU.forEach(function(r){
      if(r.field==='fcnt')fCnt=parseInt(r.value);
      if(r.field==='rssi')rssi=parseInt(r.value);
      if(r.field==='snr')snr=parseFloat(r.value);
      if(r.field==='bateria_mv')bat_mv=parseInt(r.value);
      if(r.field==='temp_suelo')temp_suelo=parseFloat(r.value);
      // bateria_pct calculat des de mv al final
    });
    bat_pct=bat_mv!=null?(bat_mv<=3500?0:bat_mv>=4850?100:Math.round((bat_mv-3500)/13.5)):null;
    if(temp!==null||fCnt!==null){
      var isNewData=rawT!==activeLastKnown()[i];
      if(isNewData){
        var wasKnown=activeLastKnown()[i]!==null;
        activeLastKnown()[i]=rawT;
        if(wasKnown){
          packetBurst[i]=8000;
          burstTriggered[i]=false;
          packets.filter(function(p){return p.nodeIdx===i;}).forEach(function(p,idx){p.t=idx/3;p.trail=[];});
        }
        var histRows=parseInfluxCSV(results[4]);
        var batHistRows=parseInfluxCSV(results[5]);
        var humHistRows=parseInfluxCSV(results[6]);
        var soilHistRows=parseInfluxCSV(results[7]);
        var tsolHistRows=isMeshcore?parseInfluxCSV(results[8]):[];
        var freshHist=histRows.filter(function(r){return r.value&&r.value!==''&&r.time;}).map(function(r){
          var tMs=new Date(r.time).getTime();
          var batMatch=batHistRows.find(function(b){return Math.abs(new Date(b.time).getTime()-tMs)<120000;});
          var humMatch=humHistRows.find(function(b){return Math.abs(new Date(b.time).getTime()-tMs)<120000;});
          var soilMatch=soilHistRows.find(function(b){return Math.abs(new Date(b.time).getTime()-tMs)<120000;});
          var hBatMv=batMatch?parseInt(batMatch.value):null;
          var hBatPct=hBatMv!=null?(hBatMv>=4200?100:hBatMv<=3200?0:hBatMv>=4200?100:Math.round((hBatMv-3200)/10)):null;
          var hHum=humMatch?parseFloat(humMatch.value):null;
          var hSoil=soilMatch?Math.round(parseFloat(soilMatch.value)):null;
          var tsolMatch=tsolHistRows.find(function(b){return Math.abs(new Date(b.time).getTime()-tMs)<120000;});
          var hTsol=tsolMatch?parseFloat(tsolMatch.value):null;
          var dt=new Date(r.time);
          return {time:dt.toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'}),date:dt.toLocaleDateString('ca-ES',{day:'2-digit',month:'2-digit',year:'2-digit'}),ts:dt.getTime(),temp:parseFloat(r.value),hum:hHum,soil:hSoil,temp_suelo:hTsol,bat_mv:hBatMv,bat_pct:hBatPct};
        });
        var prevHist=freshHist.length>0?freshHist:(activeNodeData()[i].history||[]);
        if(temp!==null&&freshHist.length===0){
          var _dt=new Date(rawT);
          prevHist.unshift({time:_dt.toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'}),date:_dt.toLocaleDateString('ca-ES',{day:'2-digit',month:'2-digit'}),ts:_dt.getTime(),temp:temp,hum:hum,soil:soil!==null?Math.round(soil):null,temp_suelo:temp_suelo,bat_mv:bat_mv,bat_pct:bat_pct});
          if(prevHist.length>6)prevHist.pop();
        }
        activeNodeData()[i]={
          temp:temp!==null?temp:activeNodeData()[i].temp,
          hum:hum!==null?hum:activeNodeData()[i].hum,
          soil:soil!==null?Math.round(soil):activeNodeData()[i].soil,
          fCnt:fCnt!==null?fCnt:activeNodeData()[i].fCnt,
          rssi:rssi!==null?rssi:activeNodeData()[i].rssi,
          snr:snr!==null?snr:activeNodeData()[i].snr,
          bat_mv:bat_mv!==null?bat_mv:activeNodeData()[i].bat_mv,
          bat_pct:bat_pct!==null?bat_pct:activeNodeData()[i].bat_pct,
          temp_suelo:temp_suelo!==null?temp_suelo:activeNodeData()[i].temp_suelo,
          time:new Date(rawT).toLocaleTimeString('ca-ES'),rawTime:rawT,
          status:isOnline(rawT)?'online':'offline',history:prevHist
        };
      } else {
        activeNodeData()[i]=Object.assign({},activeNodeData()[i],{status:isOnline(rawT)?'online':'offline'});
      }
      return true;
    }
    activeNodeData()[i].status=activeNodeData()[i].status||'waiting';
    return false;
  }catch(e){
    activeNodeData()[i].status='offline';
    return false;
  }
}

async function fetchGatewayStatus(){
  try{
    var r=await fetch(CS+'/api/gateways?limit=1&tenantId=d0abf091-3e1b-4fc2-b067-c7a0137d3bb9',{headers:HDR});
    if(!r.ok)return null;
    var j=await r.json();
    var gw=(j.result||[])[0];
    if(!gw||!gw.lastSeenAt)return false;
    var diff=Date.now()-new Date(gw.lastSeenAt).getTime();
    var online=diff<60*60*1000;
    if(!isMeshcoreMode())document.getElementById('csJoin').textContent=new Date(gw.lastSeenAt).toLocaleString('ca-ES');
    return online;
  }catch(e){return null;}
}

var fetchLock=false;
async function fetchAllNodes(){
  if(fetchLock)return;
  fetchLock=true;
  document.getElementById('apiSt').textContent='API: carregant... ⟳';
  try{
    var results=await Promise.all([
      Promise.all(activeNodes().map(function(_,i){return fetchNode(i);})),
      fetchGatewayStatus()
    ]);
    var res=results[0],gwOnline=results[1];
    var anyReal=res.some(Boolean);
    if(anyReal||gwOnline!==null){
      document.getElementById('nodeDot').className='sdot dot-g';
      document.getElementById('apiSt').textContent='API: connectada ✓';
    } else {
      document.getElementById('apiSt').textContent='API: no accessible';
      document.getElementById('nodeDot').className='sdot dot-r';
    }
    var gwEl=document.getElementById('csGwSt'),gwBar=document.getElementById('gwStatusBar');
    var gwDot=document.getElementById('gwDot'),gwPop=document.getElementById('gwPopupSt');
    if(!isMeshcoreMode()){
      if(gwOnline===true){
        gwEl.textContent='ONLINE ●';gwEl.className='dval g';
        if(gwBar)gwBar.textContent='ONLINE';
        if(gwDot)gwDot.className='sdot dot-g';
        if(gwPop){gwPop.textContent='● ONLINE';gwPop.style.color='var(--green)';}
        var csEl=document.getElementById('csStatus');if(csEl){csEl.textContent='ONLINE';csEl.parentElement.previousElementSibling.className='sdot dot-g';}
      } else {
        gwEl.textContent='OFFLINE';gwEl.className='dval r';
        if(gwBar)gwBar.textContent='OFFLINE';
        if(gwDot)gwDot.className='sdot dot-r';
        if(gwPop){gwPop.textContent='○ OFFLINE';gwPop.style.color='#555';}
        var csEl=document.getElementById('csStatus');if(csEl){csEl.textContent='OFFLINE';csEl.parentElement.previousElementSibling.className='sdot dot-r';}
      }
      var onlineCount=activeNodeData().filter(function(d){return d&&d.status==='online';}).length;
      document.getElementById('csNodes').textContent=onlineCount+' online';
    }
    var _onlineTotal=activeNodeData().filter(function(d){return d&&(d.status==='online'||d.status==='relay');}).length;
    document.getElementById('nodeStatus').textContent=_onlineTotal+' online / '+activeNodes().filter(function(n){return n.deployed;}).length+' desplegats';
    updateMapMarkers();updateNodeButtons();selNode(selIdx);checkAlerts();renderGrid();
  }finally{fetchLock=false;}
}

// ── FETCH HISTORIAL PER RANG (dashboard) ───────────────────────
async function fetchHistRange(nodeIdx, rangeStr, dateStr){
  if(!NODES[nodeIdx] || !NODES[nodeIdx].deployed) return [];
  var devEUI = NODES[nodeIdx].devEUI;
  var stopTs  = new Date(Date.now()+5*60*1000).toISOString();
  var rng, nPts;
  if(dateStr){
    // Dia exacte: start=00:00, stop=23:59 del dia seleccionat
    var d = new Date(dateStr);
    var start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
    var stop  = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
    rng = 'start:'+start+',stop:'+stop;
    nPts = 288; // cada 5min
  } else {
    var rngMap = {'24h':'start:-24h','7d':'start:-7d','30d':'start:-30d','1y':'start:-365d'};
    var ptsMap = {'24h':24,'7d':168,'30d':240,'1y':365};
    rng  = (rngMap[rangeStr]||'start:-24h')+',stop:'+stopTs;
    nPts = ptsMap[rangeStr]||24;
  }
  var base = 'from(bucket:"'+INFLUX_BUCKET+'")|>range('+rng+')|>filter(fn:(r)=>r["_measurement"]=="espurna_sensors")|>filter(fn:(r)=>r["dev_eui"]=="'+devEUI+'")';
  try {
    var results = await Promise.all([
      influxQuery(base+'|>filter(fn:(r)=>r["_field"]=="temperatura")|>sort(columns:["_time"],desc:true)|>limit(n:'+nPts+')'),
      influxQuery(base+'|>filter(fn:(r)=>r["_field"]=="bateria_mv")|>sort(columns:["_time"],desc:true)|>limit(n:'+nPts+')'),
      influxQuery(base+'|>filter(fn:(r)=>r["_field"]=="humedad_aire")|>sort(columns:["_time"],desc:true)|>limit(n:'+nPts+')'),
      influxQuery(base+'|>filter(fn:(r)=>r["_field"]=="humedad_suelo")|>sort(columns:["_time"],desc:true)|>limit(n:'+nPts+')')
    ]);
    var tempRows = parseInfluxCSV(results[0]);
    var batRows  = parseInfluxCSV(results[1]);
    var humRows  = parseInfluxCSV(results[2]);
    var soilRows = parseInfluxCSV(results[3]);
    return tempRows.filter(function(r){return r.value&&r.time;}).map(function(r){
      var tMs = new Date(r.time).getTime();
      var batM  = batRows.find(function(b){return Math.abs(new Date(b.time).getTime()-tMs)<300000;});
      var humM  = humRows.find(function(b){return Math.abs(new Date(b.time).getTime()-tMs)<300000;});
      var soilM = soilRows.find(function(b){return Math.abs(new Date(b.time).getTime()-tMs)<300000;});
      var hBatMv  = batM  ? parseInt(batM.value)           : null;
      var hBatPct = hBatMv!=null?(hBatMv>=4200?100:hBatMv<=3200?0:hBatMv>=4200?100:Math.round((hBatMv-3200)/10)):null;
      var fmt = dateStr
        ? new Date(r.time).toLocaleString('ca-ES',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
        : new Date(r.time).toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'});
      return {
        time:    fmt,
        ts:      tMs,
        temp:    parseFloat(r.value),
        hum:     humM  ? parseFloat(humM.value)            : null,
        soil:    soilM ? Math.round(parseFloat(soilM.value)): null,
        bat_mv:  hBatMv,
        bat_pct: hBatPct
      };
    });
  } catch(e){ console.error('fetchHistRange error',e); return []; }
}

// Toggle LoRaWAN / MeshCore
var _currentDataSource = 'lorawan';
function toggleDataSource() {
  _currentDataSource = _currentDataSource === 'lorawan' ? 'meshcore' : 'lorawan';
  var isLora = _currentDataSource === 'lorawan';
  ['techToggleBtn','techToggleBtnMobile'].forEach(function(id){
    var b = document.getElementById(id);
    if(!b) return;
    b.innerHTML = isLora
      ? '<span style="color:#fff">●</span> <span class="btn-animated-text">LORAWAN</span>'
      : '<span style="color:#fff">●</span> <span class="btn-animated-text">MESHCORE</span>';
    b.style.borderColor = isLora ? 'rgba(168,85,247,.5)' : 'rgba(255,20,147,.6)';
    b.style.background  = isLora ? 'rgba(168,85,247,.08)' : 'rgba(255,20,147,.08)';
    b.style.boxShadow   = isLora ? '0 0 10px rgba(168,85,247,.3)' : '0 0 10px rgba(255,20,147,.3)';
  });
  // Actualitzar textos estàtics segons mode
  var _isLora = _currentDataSource === 'lorawan';
  // Panell superior dret: ChirpStack (LoRa) o RPi (MeshCore)
  var _cardTitle = document.querySelector('.card-l-cyan .card-title');
  var _rowServidor = document.getElementById('_rowServidor');
  var _rowEstat = document.getElementById('csGwSt');
  var _rowServei = document.getElementById('_rowServei');
  var _rowUptime = document.getElementById('csNodes');
  var _rowDarrer = document.getElementById('csJoin');
  if(_cardTitle) _cardTitle.textContent = _isLora ? '◈ ChirpStack v4' : '◈ Raspberry Pi';
  var _lbl1=document.getElementById('_rowServidorLbl');
  var _lbl2=document.getElementById('_rowServeiLbl');
  var _lbl3=document.getElementById('_rowUptimeLbl');
  var _lbl4=document.getElementById('_rowDarrerLbl');
  if(_isLora){
    if(_rowServidor){_rowServidor.textContent='isard.nuvulet.itb.cat';_rowServidor.className='dval';}
    if(_rowEstat){_rowEstat.textContent='OFFLINE';_rowEstat.style.color='var(--red)';}
    if(_rowServei){_rowServei.textContent='OTAA · JOINED';_rowServei.className='dval g';}
    if(_rowUptime)_rowUptime.textContent='0 online';
    if(_rowDarrer)_rowDarrer.textContent='7/5/2026 12:53:36';
    if(_lbl1)_lbl1.textContent='SERVIDOR';
    if(_lbl2)_lbl2.textContent='ACTIVACIÓ';
    if(_lbl3)_lbl3.textContent='NODES ONLINE';
    if(_lbl4)_lbl4.textContent='LAST JOIN';
  } else {
    if(_rowServidor){_rowServidor.textContent='100.89.52.39';_rowServidor.className='dval';}
    if(_rowEstat){_rowEstat.textContent='CHECKING...';_rowEstat.style.color='#555';}
    if(_rowServei){_rowServei.textContent='rpi-ping · port 5051';_rowServei.className='dval';}
    if(_rowUptime)_rowUptime.textContent='—';
    if(_rowDarrer)_rowDarrer.textContent='—';
    if(_lbl1)_lbl1.textContent='HOST';
    if(_lbl2)_lbl2.textContent='SERVEI';
    if(_lbl3)_lbl3.textContent='UPTIME';
    if(_lbl4)_lbl4.textContent='DARRER PING';
    checkRPi();
  }
  var _hdr = document.getElementById('hdrSub');
  if(_hdr) _hdr.textContent = _isLora
    ? 'LoRaWAN EU868 · ChirpStack v4 · OTAA · AES-128 · Sensor Nodes'
    : 'MeshCore · LoRa EU868 · Bridge RPi · MQTT · InfluxDB';
  var _sec = document.getElementById('secSub');
  if(_sec) _sec.textContent = _isLora ? '— EU868 / ACTUALITZACIÓ: 1h' : '— MESHCORE / ACTUALITZACIÓ: 1h';
  var _freq = document.getElementById('specFreq');
  if(_freq) _freq.style.display = _isLora ? '' : 'none';
  var _meshExtra = document.getElementById('specMeshExtra');
  if(_meshExtra) _meshExtra.style.display = _isLora ? 'none' : '';
  var _proto = document.getElementById('specProtoVal');
  if(_proto) _proto.textContent = _isLora ? 'LoRaWAN' : 'MeshCore';
  var _activ = document.getElementById('specActiv');
  if(_activ) _activ.querySelector('.spec-lbl').textContent = _isLora ? 'Activació' : 'Topologia';
  var _activVal = document.getElementById('specActivVal');
  if(_activVal) _activVal.textContent = _isLora ? 'OTAA' : 'Mesh';
  var _envVal = document.getElementById('specEnvVal');
  if(_envVal) _envVal.innerHTML = _isLora ? '1h <span class="spec-unit">int</span>' : '1h <span class="spec-unit">int</span>';
  var _payVal = document.getElementById('specPayloadVal');
  if(_payVal) _payVal.innerHTML = _isLora ? '7 <span class="spec-unit">bytes</span>' : 'Variable';

  // Al canviar a meshcore, seleccionar el primer sensor automàticament
  if(!_isLora){
    var _firstSensor=activeNodes().findIndex(function(n){return n.type==='sensor'&&n.deployed;});
    if(_firstSensor>=0)selIdx=_firstSensor;
  } else {
    selIdx=0;
  }
  selNode(selIdx);
  renderGrid();
  Promise.all(activeNodes().map(function(_,i){return fetchNode(i);})).then(function(){
    updateMapMarkers();updateNodeButtons();updateCoordsBar();selNode(selIdx);checkAlerts();renderGrid();
    var oc=activeNodeData().filter(function(d){return d&&d.status==='online';}).length;
    document.getElementById('csNodes').textContent=oc+' online';
    var _ocTotal=activeNodeData().filter(function(d){return d&&(d.status==='online'||d.status==='relay');}).length;
    document.getElementById('nodeStatus').textContent=_ocTotal+' online / '+activeNodes().filter(function(n){return n.deployed;}).length+' desplegats';
  });
}
