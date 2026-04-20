// ── CANVAS / PACKETS ───────────────────────────────────────
function initCanvas(){
  var lc=map.getContainer();
  canvas=document.createElement('canvas');
  canvas.id='pktCanvas';
  canvas.style.cssText='position:absolute;top:0;left:0;pointer-events:none;z-index:650;';
  lc.appendChild(canvas);ctx=canvas.getContext('2d');syncCanvas();
}
function syncCanvas(){
  if(!canvas||!map)return;
  var lc=map.getContainer(),w=lc.offsetWidth,h=lc.offsetHeight;
  if(!w||!h||(_cW===w&&_cH===h))return;
  _cW=w;_cH=h;
  var dpr=window.devicePixelRatio||1;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
function hexAlpha(hex,a){
  var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+Math.max(0,Math.min(1,a)).toFixed(3)+')';
}
function eio(t){return t<.5?2*t*t:-1+(4-2*t)*t;}
function spawnPackets(){
  packets=[];
  NODES.forEach(function(cfg,i){
    if(!cfg.deployed)return;
    for(var p=0;p<3;p++) packets.push({nodeIdx:i,t:p/3,speed:.0025,color:NEON_COLORS[(i*3+p)%NEON_COLORS.length],radius:3.5+p*.4,trail:[]});
  });
}
function rafLoop(ts){
  rafId=requestAnimationFrame(rafLoop);
  if(ts-lastRaf<32)return;
  var dt=Math.min(ts-lastRaf,64);lastRaf=ts;
  syncCanvas();
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.clearRect(0,0,_cW,_cH);
  for(var i=0;i<packetBurst.length;i++) if(packetBurst[i]>0) packetBurst[i]=Math.max(0,packetBurst[i]-dt);
  packets.forEach(function(pkt){
    var cfg=NODES[pkt.nodeIdx],d=nodeData[pkt.nodeIdx];
    var online=d&&d.status==='online'&&isOnline(d.rawTime);
    var burstRem=packetBurst[pkt.nodeIdx];
    var active=online&&burstRem>0;
    if(!active){pkt.trail=[];return;}
    var fadeOut=burstRem<2000?burstRem/2000:1;
    pkt.t+=pkt.speed*(dt/16);
    if(pkt.t>=1){pkt.t-=1;pkt.trail=[];}
    var e=eio(pkt.t);
    var gw=map.latLngToContainerPoint([GW.lat,GW.lng]);
    var nd=map.latLngToContainerPoint([cfg.lat,cfg.lng]);
    var x=nd.x+(gw.x-nd.x)*e,y=nd.y+(gw.y-nd.y)*e;
    var alpha=pkt.t<.08?pkt.t/.08:pkt.t>.72?Math.max(0,1-(pkt.t-.72)/.28):1;
    var fa=alpha*fadeOut;
    pkt.trail.push({x:x,y:y});if(pkt.trail.length>22)pkt.trail.shift();
    if(pkt.trail.length>1){
      for(var k=1;k<pkt.trail.length;k++){
        var ta=(k/pkt.trail.length)*alpha;
        ctx.beginPath();ctx.moveTo(pkt.trail[k-1].x,pkt.trail[k-1].y);
        ctx.lineTo(pkt.trail[k].x,pkt.trail[k].y);
        ctx.strokeStyle=hexAlpha(pkt.color,ta*.55*fadeOut);ctx.lineWidth=pkt.radius*.5;ctx.lineCap='round';ctx.stroke();
      }
    }
    [{r:pkt.radius*3.5,a:.08},{r:pkt.radius*2,a:.20},{r:pkt.radius*1.2,a:.55},{r:pkt.radius*.6,a:.95}].forEach(function(g){
      ctx.beginPath();ctx.arc(x,y,g.r,0,Math.PI*2);
      ctx.fillStyle=hexAlpha(pkt.color,g.a*fa);ctx.fill();
    });
    ctx.beginPath();ctx.arc(x,y,pkt.radius*.3,0,Math.PI*2);
    ctx.fillStyle=hexAlpha('#ffffff',.95*fa);ctx.fill();
  });
}
function startRaf(){if(!rafId){lastRaf=0;rafId=requestAnimationFrame(rafLoop);}}
function stopRaf(){if(rafId){cancelAnimationFrame(rafId);rafId=null;}}
