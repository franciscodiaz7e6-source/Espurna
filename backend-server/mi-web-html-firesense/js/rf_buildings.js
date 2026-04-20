(function(window){
'use strict';
var RFBuildings = window.RFBuildings = {};
RFBuildings.cache = null;
RFBuildings.cacheKey = null;

RFBuildings.fetch = async function(lat, lng, radiusM) {
  var key = lat.toFixed(3)+','+lng.toFixed(3)+','+radiusM;
  if(RFBuildings.cache && RFBuildings.cacheKey === key) {
    console.log('[Buildings] Cache:', RFBuildings.cache.length, 'edificios');
    return RFBuildings.cache;
  }
  console.log('[Buildings] Descargando OSM...');
  var query = '[out:json][timeout:60];(way["building"](around:'+radiusM+','+lat+','+lng+'););out body geom;';
  try {
    // Intentar varios servidores Overpass
    var servers = [
      '/overpass/',
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter',
      'https://overpass.openstreetmap.fr/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];
    var r = null;
    for(var si=0; si<servers.length; si++){
      try{
        var controller = new AbortController();
        var tid = setTimeout(function(){controller.abort();},6000);
        r = await fetch(servers[si],{method:'POST',body:'data='+encodeURIComponent(query),signal:controller.signal});
        clearTimeout(tid);
        if(r.ok) break;
      }catch(e2){ console.warn('[Buildings] Server '+si+' failed'); }
    }
    if(!r||!r.ok) throw new Error('Todos los servidores fallaron');
    var data = await r.json();
    var buildings = [];
    data.elements.forEach(function(el){
      if(!el.geometry||el.geometry.length<3) return;
      var h = parseFloat(el.tags['height']||0)||
              parseFloat(el.tags['building:levels']||el.tags['levels']||0)*3||
              10;
      var lats=el.geometry.map(function(g){return g.lat;});
      var lngs=el.geometry.map(function(g){return g.lon;});
      buildings.push({
        geom: el.geometry,
        height: h,
        minLat:Math.min.apply(null,lats), maxLat:Math.max.apply(null,lats),
        minLng:Math.min.apply(null,lngs), maxLng:Math.max.apply(null,lngs)
      });
    });
    RFBuildings.cache = buildings;
    RFBuildings.cacheKey = key;
    console.log('[Buildings] Cargados:', buildings.length);
    return buildings;
  } catch(e) {
    console.error('[Buildings] Error:', e);
    return [];
  }
};

// Punto dentro de polígono (ray casting)
RFBuildings.pip = function(lat, lng, geom){
  var inside=false, n=geom.length;
  for(var i=0,j=n-1;i<n;j=i++){
    var xi=geom[i].lon,yi=geom[i].lat,xj=geom[j].lon,yj=geom[j].lat;
    if(((yi>lat)!==(yj>lat))&&(lng<(xj-xi)*(lat-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
};

// Calcular pérdida por edificios en la trayectoria antena→receptor
// antH y rxH son alturas ABSOLUTAS (elevación terreno + altura dispositivo)
RFBuildings.lossPenalty = function(antLat, antLng, antH, rxLat, rxLng, rxH, buildings){
  if(!buildings||buildings.length===0) return 0;

  var totalLoss = 0;
  var NCHECK = 10;
  var dLat = rxLat - antLat;
  var dLng = rxLng - antLng;

  // Bbox del segmento con margen
  var segMinLat = Math.min(antLat,rxLat)-0.0002;
  var segMaxLat = Math.max(antLat,rxLat)+0.0002;
  var segMinLng = Math.min(antLng,rxLng)-0.0002;
  var segMaxLng = Math.max(antLng,rxLng)+0.0002;

  for(var i=0;i<buildings.length;i++){
    var b = buildings[i];
    // Filtro bbox rápido
    if(b.maxLat<segMinLat||b.minLat>segMaxLat||
       b.maxLng<segMinLng||b.minLng>segMaxLng) continue;

    // Comprobar puntos a lo largo del rayo
    for(var s=1;s<NCHECK;s++){
      var f = s/NCHECK;
      var pLat = antLat + dLat*f;
      var pLng = antLng + dLng*f;

      if(!RFBuildings.pip(pLat, pLng, b.geom)) continue;

      // El rayo pasa sobre este edificio en este punto
      // Altura absoluta del rayo aquí
      var rayH = antH + (rxH - antH)*f;
      // Tope del edificio: necesitamos elevación del terreno en ese punto
      // Como no la tenemos exacta, usamos interpolación entre antH base y rxH base
      // Restando las alturas de dispositivos para obtener solo terreno
      var terrainH = (antH - 10) + ((rxH - 1.5) - (antH - 10))*f; // aprox
      var buildingTop = terrainH + b.height;

      if(rayH < buildingTop){
        // El rayo está bloqueado por este edificio
        // Pérdida proporcional a cuánto está bloqueado
        var penetration = buildingTop - rayH; // metros de penetración
        var loss = Math.min(20, 3 + penetration * 0.8);
        totalLoss += loss;
        break; // un hit por edificio es suficiente
      }
    }

    if(totalLoss >= 35) break; // cap total
  }

  return totalLoss;
};

})(window);
