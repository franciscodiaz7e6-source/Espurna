// ── SMART POLL ─────────────────────────────────────────────
var SLOW_MS=10000,FAST_MS=2000,FAST_WINDOW_MS=3*60*1000,OVERDUE_MS=5*60*1000;
var pollTimer=null;
function msToNextTx(){
  var min=Infinity;
  nodeData.forEach(function(d){
    if(!d||!d.rawTime)return;
    var rem=OFFLINE_MS-(Date.now()-new Date(d.rawTime).getTime());
    if(rem<min)min=rem;
  });
  return min;
}
function schedulePoll(){
  clearTimeout(pollTimer);
  var remaining=msToNextTx();
  var isFastZone=remaining<=FAST_WINDOW_MS&&remaining>-OVERDUE_MS;
  var delay=isFastZone?FAST_MS:SLOW_MS;
  if(isFastZone){
    nodeData.forEach(function(d,i){
      if(d&&d.rawTime&&!burstTriggered[i]){
        var rem=OFFLINE_MS-(Date.now()-new Date(d.rawTime).getTime());
        if(rem<=BURST_BEFORE_MS){
          burstTriggered[i]=true;
          packetBurst[i]=8000;
          packets.filter(function(p){return p.nodeIdx===i;}).forEach(function(p,idx){p.t=idx/3;p.trail=[];});
        }
      }
    });
  } else {
    burstTriggered.fill(false);
  }
  pollTimer=setTimeout(async function(){
    await fetchAllNodes();
    schedulePoll();
  },delay);
}
