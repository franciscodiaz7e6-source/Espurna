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

async function fetchNode(i){
  if(!NODES[i].deployed){nodeData[i].status='waiting';return false;}
  try{
    var devEUI=NODES[i].devEUI;
    var stopTs=new Date(Date.now()+5*60*1000).toISOString();
    var _rangeMap={'24h':'-26h','7d':'-8d','30d':'-31d','1y':'-366d'};
    var _rangeStr=typeof _dbRange!=='undefined'?(_rangeMap[_dbRange]||'-26h'):'-26h';
    var _limitMap={'24h':24,'7d':168,'30d':720,'1y':8760};
    var _limitN=typeof _dbRange!=='undefined'?(_limitMap[_dbRange]||24):24;
    //
    var rng='start:'+_rangeStr+',stop:'+stopTs;
    var results=await Promise.all([
      influxQuery('from(bucket:"'+INFLUX_BUCKET+'")|>range('+rng+')|>filter(fn:(r)=>r["_measurement"]=="espurna_sensors")|>filter(fn:(r)=>r["dev_eui"]=="'+devEUI+'")|>filter(fn:(r)=>r["_field"]=="temperatura")|>last()'),
      influxQuery('from(bucket:"'+INFLUX_BUCKET+'")|>range('+rng+')|>filter(fn:(r)=>r["_measurement"]=="espurna_sensors")|>filter(fn:(r)=>r["dev_eui"]=="'+devEUI+'")|>filter(fn:(r)=>r["_field"]=="humedad_aire")|>last()'),
      influxQuery('from(bucket:"'+INFLUX_BUCKET+'")|>range('+rng+')|>filter(fn:(r)=>r["_measurement"]=="espurna_sensors")|>filter(fn:(r)=>r["dev_eui"]=="'+devEUI+'")|>filter(fn:(r)=>r["_field"]=="humedad_suelo")|>last()'),
      influxQuery('from(bucket:"'+INFLUX_BUCKET+'")|>range('+rng+')|>filter(fn:(r)=>r["_measurement"]=="espurna_sensors")|>filter(fn:(r)=>r["dev_eui"]=="'+devEUI+'")|>filter(fn:(r)=>r["_field"]=="rssi" or r["_field"]=="snr" or r["_field"]=="fcnt" or r["_field"]=="bateria_mv" or r["_field"]=="bateria_pct")|>last()'),
      influxQuery('from(bucket:"'+INFLUX_BUCKET+'")|>range('+rng+')|>filter(fn:(r)=>r["_measurement"]=="espurna_sensors")|>filter(fn:(r)=>r["dev_eui"]=="'+devEUI+'")|>filter(fn:(r)=>r["_field"]=="temperatura")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
      influxQuery('from(bucket:"'+INFLUX_BUCKET+'")|>range('+rng+')|>filter(fn:(r)=>r["_measurement"]=="espurna_sensors")|>filter(fn:(r)=>r["dev_eui"]=="'+devEUI+'")|>filter(fn:(r)=>r["_field"]=="bateria_mv")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
      influxQuery('from(bucket:"'+INFLUX_BUCKET+'")|>range('+rng+')|>filter(fn:(r)=>r["_measurement"]=="espurna_sensors")|>filter(fn:(r)=>r["dev_eui"]=="'+devEUI+'")|>filter(fn:(r)=>r["_field"]=="humedad_aire")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
      influxQuery('from(bucket:"'+INFLUX_BUCKET+'")|>range('+rng+')|>filter(fn:(r)=>r["_measurement"]=="espurna_sensors")|>filter(fn:(r)=>r["dev_eui"]=="'+devEUI+'")|>filter(fn:(r)=>r["_field"]=="humedad_suelo")|>sort(columns:["_time"],desc:true)|>limit(n:'+_limitN+')'),
    ]);
    var rT=parseInfluxCSV(results[0]),rH=parseInfluxCSV(results[1]),rS=parseInfluxCSV(results[2]),rU=parseInfluxCSV(results[3]);
    var gv=function(rows){var r=rows.find(function(r){return r.value&&r.value!=='';});return r?parseFloat(r.value):null;};
    var temp=gv(rT),hum=gv(rH),soil=gv(rS);
    var rawT=(rT[0]||rH[0]||rS[0]||rU[0])?((rT[0]||rH[0]||rS[0]||rU[0]).time||null):null;
    var fCnt=null,rssi=null,snr=null,bat_mv=null,bat_pct=null;
    rU.forEach(function(r){
      if(r.field==='fcnt')fCnt=parseInt(r.value);
      if(r.field==='rssi')rssi=parseInt(r.value);
      if(r.field==='snr')snr=parseFloat(r.value);
      if(r.field==='bateria_mv')bat_mv=parseInt(r.value);
      if(r.field==='bateria_pct')bat_pct=parseInt(r.value);
    });
    if(temp!==null||fCnt!==null){
      var isNewData=rawT!==lastKnownRawTime[i];
      if(isNewData){
        var wasKnown=lastKnownRawTime[i]!==null;
        lastKnownRawTime[i]=rawT;
        if(wasKnown){
          packetBurst[i]=8000;
          burstTriggered[i]=false;
          packets.filter(function(p){return p.nodeIdx===i;}).forEach(function(p,idx){p.t=idx/3;p.trail=[];});
        }
        var histRows=parseInfluxCSV(results[4]);
        var batHistRows=parseInfluxCSV(results[5]);
        var humHistRows=parseInfluxCSV(results[6]);
        var soilHistRows=parseInfluxCSV(results[7]);
        var freshHist=histRows.filter(function(r){return r.value&&r.value!==''&&r.time;}).map(function(r){
          var tMs=new Date(r.time).getTime();
          var batMatch=batHistRows.find(function(b){return Math.abs(new Date(b.time).getTime()-tMs)<120000;});
          var humMatch=humHistRows.find(function(b){return Math.abs(new Date(b.time).getTime()-tMs)<120000;});
          var soilMatch=soilHistRows.find(function(b){return Math.abs(new Date(b.time).getTime()-tMs)<120000;});
          var hBatMv=batMatch?parseInt(batMatch.value):null;
          var hBatPct=hBatMv!=null?(hBatMv>=4200?100:hBatMv<=3200?0:Math.round((hBatMv-3200)/10)):null;
          var hHum=humMatch?parseFloat(humMatch.value):null;
          var hSoil=soilMatch?Math.round(parseFloat(soilMatch.value)):null;
          var dt=new Date(r.time);
          return {time:dt.toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'}),date:dt.toLocaleDateString('ca-ES',{day:'2-digit',month:'2-digit'}),ts:dt.getTime(),temp:parseFloat(r.value),hum:hHum,soil:hSoil,bat_mv:hBatMv,bat_pct:hBatPct};
        });
        var prevHist=freshHist.length>0?freshHist:(nodeData[i].history||[]);
        if(temp!==null&&freshHist.length===0){
          var _dt=new Date(rawT);
          prevHist.unshift({time:_dt.toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'}),date:_dt.toLocaleDateString('ca-ES',{day:'2-digit',month:'2-digit'}),ts:_dt.getTime(),temp:temp,hum:hum,soil:soil!==null?Math.round(soil):null,bat_mv:bat_mv,bat_pct:bat_pct});
          if(prevHist.length>6)prevHist.pop();
        }
        nodeData[i]={
          temp:temp!==null?temp:nodeData[i].temp,
          hum:hum!==null?hum:nodeData[i].hum,
          soil:soil!==null?Math.round(soil):nodeData[i].soil,
          fCnt:fCnt!==null?fCnt:nodeData[i].fCnt,
          rssi:rssi!==null?rssi:nodeData[i].rssi,
          snr:snr!==null?snr:nodeData[i].snr,
          bat_mv:bat_mv!==null?bat_mv:nodeData[i].bat_mv,
          bat_pct:bat_pct!==null?bat_pct:nodeData[i].bat_pct,
          time:new Date(rawT).toLocaleTimeString('ca-ES'),rawTime:rawT,
          status:isOnline(rawT)?'online':'offline',history:prevHist
        };
      } else {
        nodeData[i]=Object.assign({},nodeData[i],{status:isOnline(rawT)?'online':'offline'});
      }
      return true;
    }
    nodeData[i].status=nodeData[i].status||'waiting';
    return false;
  }catch(e){
    nodeData[i].status='offline';
    return false;
  }
}

async function fetchGatewayStatus(){
  try{
    var r=await fetch(CS+'/api/gateways?limit=1&tenantId=9b1ad276-5f3e-441d-a1e3-3b8e45836bb9',{headers:HDR});
    if(!r.ok)return null;
    var j=await r.json();
    var gw=(j.result||[])[0];
    if(!gw||!gw.lastSeenAt)return false;
    var diff=Date.now()-new Date(gw.lastSeenAt).getTime();
    var online=diff<60*60*1000;
    document.getElementById('csJoin').textContent=new Date(gw.lastSeenAt).toLocaleString('ca-ES');
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
      Promise.all(NODES.map(function(_,i){return fetchNode(i);})),
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
    var onlineCount=nodeData.filter(function(d){return d&&d.status==='online';}).length;
    document.getElementById('csNodes').textContent=onlineCount+' online';
    document.getElementById('nodeStatus').textContent=onlineCount+' online / 5 desplegats';
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
      var hBatPct = hBatMv!=null?(hBatMv>=4200?100:hBatMv<=3200?0:Math.round((hBatMv-3200)/10)):null;
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
