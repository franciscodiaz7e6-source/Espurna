// ── INIT ───────────────────────────────────────────────────
initMap();
fetchAllNodes().then(function(){schedulePoll();});
setInterval(updateNextTxCountdown,1000);
setInterval(function(){
  var el=document.getElementById('liveClock');
  if(el)el.textContent=new Date().toLocaleTimeString('ca-ES');
},1000);
