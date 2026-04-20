(function(window){
'use strict';

var RFMulti = window.RFMulti = {};

// Colores por nodo (hasta 6 nodos)
RFMulti.NODE_COLORS = [
  { name:'A', hue:'cyan',    strong:[0.0,1.0,0.9], mid:[0.0,0.6,0.8], weak:[0.0,0.3,0.6] },
  { name:'B', hue:'lime',    strong:[0.2,1.0,0.1], mid:[0.4,0.8,0.0], weak:[0.5,0.5,0.0] },
  { name:'C', hue:'magenta', strong:[1.0,0.0,1.0], mid:[0.8,0.0,0.7], weak:[0.5,0.0,0.4] },
  { name:'D', hue:'orange',  strong:[1.0,0.7,0.0], mid:[1.0,0.4,0.0], weak:[0.7,0.2,0.0] },
  { name:'E', hue:'white',   strong:[1.0,1.0,1.0], mid:[0.7,0.7,0.7], weak:[0.4,0.4,0.4] },
  { name:'F', hue:'yellow',  strong:[1.0,1.0,0.0], mid:[0.8,0.8,0.0], weak:[0.5,0.5,0.0] },
];

RFMulti.nodes = [];
RFMulti.linkEntities = []; // líneas de enlace entre nodos
RFMulti.nextId = 0;

// Añadir nodo nuevo
RFMulti.addNode = function(lat, lng, elev, params) {
  var id = RFMulti.nextId++;
  var colorDef = RFMulti.NODE_COLORS[id % RFMulti.NODE_COLORS.length];
  var node = {
    id: id,
    label: colorDef.name,
    lat: lat, lng: lng, elev: elev,
    params: Object.assign({}, params),
    colorDef: colorDef,
    results: null,
    pointColl: null,
    entity: null
  };
  RFMulti.nodes.push(node);
  RFMulti.updateNodeList();
  return node;
};

// Calcular cobertura para un nodo
RFMulti.calculate = async function(node, cesiumViewer) {
  var hint = document.getElementById('los-hint');
  hint.style.display = 'block';
  hint.textContent = '📡 Calculant node ' + node.label + '...';

  // Descargar buildings si no hay cache
  var buildings = [];
  if(typeof RFBuildings !== 'undefined') {
    buildings = await RFBuildings.fetch(node.lat, node.lng, node.params.radius);
  }

  var results = await RFCoverage.calculateForNode(node.lat, node.lng, node.elev, node.params, buildings, hint);
  node.results = results;

  // Renderizar con color del nodo
  if(cesiumViewer) RFMulti.renderNode(node, cesiumViewer);
  // Amagar capes individuals i mostrar vista combinada
  if(typeof map !== 'undefined' && map) {
    // Ocultar capa individual anterior d'aquest node si n'hi havia
    RFMulti.clearNode2D(node, map);
    // Redibuixar tots els nodes combinats (millor RSSI per punt)
    RFMulti.renderCombined2D(map);
  }

  // Recalcular enlaces entre todos los nodos
  if(cesiumViewer) RFMulti.updateLinks(cesiumViewer);

  hint.textContent = '✓ Node ' + node.label + ' calculat — ' + results.length + ' punts';
  setTimeout(function(){ hint.style.display='none'; }, 3000);

  RFMulti.updateNodeList();
  // Mostrar llegenda quan hi ha nodes
  var leg = document.getElementById('rf-legend');
  if(leg) leg.style.display = 'flex';
};

// Renderizar puntos de un nodo con su color




RFMulti.renderNode = function(node, cv) {
  // Limpiar render anterior de este nodo
  if(node.pointColl && cv) {
    try{ cv.scene.primitives.remove(node.pointColl); }catch(e){}
  }
  if(node.entity && cv) {
    try{ cv.entities.remove(node.entity); }catch(e){}
  }

  var c = node.colorDef;
  var p = node.params;
  node.pointColl = new Cesium.PointPrimitiveCollection();

  // Rango real de rxPower del nodo
  var powers = node.results.map(function(r){return r.rxPower;});
  var maxP = Math.max.apply(null, powers);
  var minP = Math.min.apply(null, powers);
  var rangeP = maxP - minP || 1;

  node.results.forEach(function(r) {
    if(r.rxPower < p.rxSens) return;
    // Mateixos colors que en 2D per threshold de senyal
    var color;
    if(r.rxPower >= -82){
      color = new Cesium.Color(0.12, 0.86, 0.24, 0.80); // verd fort
    } else if(r.rxPower >= -92){
      color = new Cesium.Color(0.55, 0.86, 0.12, 0.75); // verd-groc
    } else if(r.rxPower >= -102){
      color = new Cesium.Color(0.90, 0.71, 0.08, 0.70); // taronja
    } else if(r.rxPower >= -115){
      color = new Cesium.Color(0.90, 0.39, 0.08, 0.65); // taronja-vermell
    } else {
      color = new Cesium.Color(0.78, 0.16, 0.16, 0.55); // vermell
    }
    var cart = Cesium.Cartesian3.fromDegrees(r.lng, r.lat, 2);
    node.pointColl.add({position:cart, color:color, pixelSize:6, disableDepthTestDistance:Number.POSITIVE_INFINITY});
  });

  if(cv) cv.scene.primitives.add(node.pointColl);

  // Marcador de antena con letra del nodo
  node.entity = cv.entities.add({
    position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat, node.elev + p.txHeight + 5),
    point: {
      pixelSize: 18,
      color: new Cesium.Color(c.strong[0], c.strong[1], c.strong[2], 1.0),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: ' ' + node.label + ' ',
      font: 'bold 14px Share Tech Mono',
      fillColor: Cesium.Color.BLACK,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      showBackground: true,
      backgroundColor: Cesium.Color.WHITE,
      backgroundPadding: new Cesium.Cartesian2(6, 4),
      pixelOffset: new Cesium.Cartesian2(0, -36),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });
};

// Calcular y dibujar enlaces entre nodos
RFMulti.updateLinks = function(cv) {
  // Limpiar enlaces anteriores
  RFMulti.linkEntities.forEach(function(e){ try{ cv.entities.remove(e); }catch(x){} });
  RFMulti.linkEntities = [];

  var nodes = RFMulti.nodes.filter(function(n){ return n.results; });
  if(nodes.length < 2) return;

  for(var i = 0; i < nodes.length; i++) {
    for(var j = i+1; j < nodes.length; j++) {
      var a = nodes[i], b = nodes[j];
      var link = RFMulti.checkLink(a, b);

      var color = link.connected
        ? new Cesium.Color(0.0, 1.0, 0.4, 0.9)   // verde = enlace OK
        : new Cesium.Color(1.0, 0.2, 0.0, 0.7);   // rojo = sin enlace

      var posA = Cesium.Cartesian3.fromDegrees(a.lng, a.lat, a.elev + a.params.txHeight + 5);
      var posB = Cesium.Cartesian3.fromDegrees(b.lng, b.lat, b.elev + b.params.txHeight + 5);

      // Línea entre nodos
      var lineEnt = cv.entities.add({
        polyline: {
          positions: [posA, posB],
          width: link.connected ? 3 : 1.5,
          material: new Cesium.ColorMaterialProperty(color),
          clampToGround: false,
          arcType: Cesium.ArcType.NONE
        }
      });
      RFMulti.linkEntities.push(lineEnt);

      // Etiqueta en el centro del enlace
      var midLat = (a.lat + b.lat) / 2;
      var midLng = (a.lng + b.lng) / 2;
      var midH   = (a.elev + b.elev) / 2 + 20;
      var labelEnt = cv.entities.add({
        position: Cesium.Cartesian3.fromDegrees(midLng, midLat, midH),
        label: {
          text: (link.connected ? '✓ ' : '✗ ') + a.label + '↔' + b.label + '\n' + link.rxPower.toFixed(1) + ' dBm',
          font: 'bold 10px Share Tech Mono',
          fillColor: color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          pixelOffset: new Cesium.Cartesian2(0, 0)
        }
      });
      RFMulti.linkEntities.push(labelEnt);
    }
  }
};

// Calcular si dos nodos se pueden ver entre sí
RFMulti.checkLink = function(nodeA, nodeB) {
  // Buscar en los resultados de A si el punto más cercano a B tiene señal
  var best = -999;
  if(nodeA.results) {
    nodeA.results.forEach(function(r) {
      var dlat = r.lat - nodeB.lat, dlng = r.lng - nodeB.lng;
      var d = Math.sqrt(dlat*dlat + dlng*dlng);
      if(d < 0.001 && r.rxPower > best) best = r.rxPower; // ~100m
    });
  }
  // También buscar desde B hacia A
  if(nodeB.results) {
    nodeB.results.forEach(function(r) {
      var dlat = r.lat - nodeA.lat, dlng = r.lng - nodeA.lng;
      var d = Math.sqrt(dlat*dlat + dlng*dlng);
      if(d < 0.001 && r.rxPower > best) best = r.rxPower;
    });
  }
  // Si no encontramos punto cercano, calcular con FSPL directo
  if(best === -999) {
    var dist = RFCoverage.haversine ? RFCoverage.haversine(nodeA.lat,nodeA.lng,nodeB.lat,nodeB.lng) :
      6371000*2*Math.atan2(Math.sqrt(Math.pow(Math.sin((nodeB.lat-nodeA.lat)*Math.PI/360),2)),1);
    var p = nodeA.params;
    var fspl = 32.45 + 20*Math.log10(p.freq) + 20*Math.log10(dist/1000);
    best = p.txPower + p.txGain + nodeB.params.rxGain - fspl;
  }
  return {
    connected: best >= nodeA.params.rxSens,
    rxPower: best
  };
};

// Limpiar nodo individual
RFMulti.removeNode = function(id, cv) {
  var idx = RFMulti.nodes.findIndex(function(n){ return n.id===id; });
  if(idx === -1) return;
  var node = RFMulti.nodes[idx];
  if(node.pointColl && cv) try{ cv.scene.primitives.remove(node.pointColl); }catch(e){}
  if(node.entity && cv)    try{ cv.entities.remove(node.entity); }catch(e){}
  RFMulti.nodes.splice(idx, 1);
  RFMulti.updateLinks(cv);
  RFMulti.updateNodeList();
  if(RFMulti.nodes.length === 0){
    document.getElementById('rf-legend').style.display = 'none';
    RFMulti.nextId = 0;
    RFMulti.waitingForClick = false;
    var hint=document.getElementById('los-hint');
    if(hint){hint.textContent='📡 Clica per col·locar el node al mapa';hint.style.display='block';}
  }
};

// Limpiar todo
RFMulti.clearAll = function(cv) {
  RFMulti.nodes.forEach(function(node){
    if(node.pointColl && cv) try{ cv.scene.primitives.remove(node.pointColl); }catch(e){}
    if(node.entity && cv)    try{ cv.entities.remove(node.entity); }catch(e){}
  });
  RFMulti.linkEntities.forEach(function(e){ try{ cv.entities.remove(e); }catch(x){} });
  RFMulti.nodes = [];
  RFMulti.linkEntities = [];
  RFMulti.nextId = 0;
  RFMulti.updateNodeList();
  document.getElementById('rf-legend').style.display = 'none';
};

// Actualizar lista de nodos en el panel Y en la leyenda del mapa
RFMulti.updateNodeList = function() {
  // Actualizar leyenda del mapa
  var legNodes = document.getElementById('rf-legend-nodes');
  if(legNodes) {
    if(RFMulti.nodes.length === 0) {
      legNodes.innerHTML = '';
    } else {
      legNodes.innerHTML = RFMulti.nodes.map(function(n){
        var c = n.colorDef;
        var rgb = 'rgb('+Math.round(c.strong[0]*255)+','+Math.round(c.strong[1]*255)+','+Math.round(c.strong[2]*255)+')';
        var powers = n.results ? n.results.map(function(r){return r.rxPower;}) : [];
        var maxP = powers.length ? Math.max.apply(null,powers).toFixed(0) : '?';
        var minP = powers.length ? Math.min.apply(null,powers).toFixed(0) : '?';
        return '<div style="display:flex;align-items:center;gap:6px;">'+
          '<div style="width:12px;height:12px;border-radius:50%;background:'+rgb+';flex-shrink:0;"></div>'+
          '<span style="color:'+rgb+';font-weight:bold;">'+n.label+'</span>'+
          '<span style="color:rgba(0,229,255,.4);font-size:8px;margin-left:2px;">'+minP+'→'+maxP+' dBm</span>'+
        '</div>';
      }).join('');
    }
  }

  var el = document.getElementById('rf-node-list');
  if(!el) return;
  if(RFMulti.nodes.length === 0) {
    el.innerHTML = '<div style="color:rgba(0,229,255,.3);font-size:9px;text-align:center;padding:8px;">Cap node calculat</div>';
    return;
  }
  // Estadístiques combinades
  var cStats = RFMulti.calcStatsCombined();
  var combinedHtml = '';
  if(cStats && RFMulti.nodes.length > 1) {
    combinedHtml = '<div style="margin-bottom:8px;padding:6px;background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.2);border-radius:4px;">' +
      '<div style="color:#00e5ff;font-size:9px;font-weight:bold;letter-spacing:.1em;margin-bottom:4px;">▸ COBERTURA COMBINADA</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        _statBadge('TOTAL', cStats.pctCovered+'%', '#00e5ff') +
        _statBadge('BONA', cStats.pctGood+'%', '#00ff66') +
      '</div>' +
    '</div>';
  }

  function _statBadge(label, val, color) {
    return '<div style="flex:1;min-width:60px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08);border-radius:4px;padding:5px 4px;text-align:center;">' +
      '<div style="color:'+color+';font-size:16px;font-weight:bold;line-height:1.2;">'+val+'</div>' +
      '<div style="color:rgba(255,255,255,.4);font-size:8px;letter-spacing:.08em;margin-top:2px;">'+label+'</div>' +
    '</div>';
  }

  el.innerHTML = combinedHtml + RFMulti.nodes.map(function(n) {
    var c = n.colorDef;
    var rgb = 'rgb('+Math.round(c.strong[0]*255)+','+Math.round(c.strong[1]*255)+','+Math.round(c.strong[2]*255)+')';
    var s = RFMulti.calcStats(n);
    var statsHtml = s ? (
      '<div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">' +
        _statBadge('COBERT', s.pctCovered+'%', rgb) +
        _statBadge('BONA', s.pctGood+'%', '#00ff66') +
        _statBadge('MITJA', s.pctMedium+'%', '#ffcc00') +
        _statBadge('FEBLE', s.pctWeak+'%', '#ff6600') +
        _statBadge('AVG', s.avgPower+' dBm', 'rgba(255,255,255,.6)') +
      '</div>'
    ) : '';
    return '<div style="padding:5px 0;border-bottom:1px solid rgba(0,229,255,.08);">' +
      '<div style="display:flex;align-items:center;gap:6px;">' +
        '<span style="width:12px;height:12px;border-radius:50%;background:'+rgb+';flex-shrink:0;"></span>' +
        '<span style="color:'+rgb+';font-weight:bold;font-size:13px;">NODE '+n.label+'</span>' +
        '<span style="color:rgba(0,229,255,.4);font-size:8px;flex:1;">'+n.lat.toFixed(4)+', '+n.lng.toFixed(4)+'</span>' +
        '<button onclick="RFMulti.removeNode('+n.id+',null,map)" style="background:rgba(255,50,50,.15);border:1px solid rgba(255,50,50,.3);color:#ff5555;padding:2px 5px;font-size:8px;cursor:pointer;font-family:inherit;">✕</button>' +
      '</div>' +
      statsHtml +
    '</div>';
  }).join('');
};

RFMulti._leafletLayers = [];

RFMulti.renderNode2D = function(node, map) {
  // Eliminar capa anterior d'aquest node
  if(node.leafletLayer) {
    try{ map.removeLayer(node.leafletLayer); }catch(e){}
    node.leafletLayer = null;
  }
  if(!node.results || !node.results.length) return;
  var c = RFMulti.NODE_COLORS[node.colorIdx] || RFMulti.NODE_COLORS[0];
  var rxSens = node.params.rxSens || -137;
  var rxMax = -60;

  // Crear canvas layer
  var layer = L.canvasLayer ? L.canvasLayer() : null;

  // Usar CircleMarker per cada punt
  var markers = [];
  node.results.forEach(function(r) {
    if(r.rxPower < rxSens) return;
    var ratio = Math.min(1, Math.max(0, (r.rxPower - rxSens) / (rxMax - rxSens)));
    // Paleta: verd (bona) -> groc -> taronja -> vermell (dolenta)
    var R, G, B, alpha;
    if(ratio > 0.66) {
      // Verd fort
      R=30; G=220; B=60; alpha=0.6;
    } else if(ratio > 0.45) {
      // Verd-groc
      R=140; G=220; B=30; alpha=0.55;
    } else if(ratio > 0.28) {
      // Groc-taronja
      R=230; G=180; B=20; alpha=0.55;
    } else if(ratio > 0.12) {
      // Taronja
      R=230; G=100; B=20; alpha=0.5;
    } else {
      // Vermell suau
      R=200; G=40; B=40; alpha=0.45;
    }
    var color = 'rgba('+R+','+G+','+B+','+alpha+')';
    var m = L.circleMarker([r.lat, r.lng], {
      radius: 6,
      fillColor: color,
      fillOpacity: alpha,
      stroke: false
    });
    markers.push(m);
  });

  // Marcador antena
  var antMarker = L.circleMarker([node.lat, node.lng], {
    radius: 10,
    fillColor: 'rgba(' + Math.round(c.strong[0]*255) + ',' + Math.round(c.strong[1]*255) + ',' + Math.round(c.strong[2]*255) + ',1)',
    fillOpacity: 1,
    color: '#fff',
    weight: 2
  }).bindTooltip(node.label, {permanent:true, className:'rf-node-label', offset:[0,-5]});
  markers.push(antMarker);

  node.leafletLayer = L.layerGroup(markers).addTo(map);
};

RFMulti.clearNode2D = function(node, map) {
  if(node.leafletLayer) {
    try{ map.removeLayer(node.leafletLayer); }catch(e){}
    node.leafletLayer = null;
  }
};

RFMulti.clearAll2D = function(map) {
  RFMulti.nodes.forEach(function(n){ RFMulti.clearNode2D(n, map); });
};


RFMulti.renderCombined2D = function(map) {
  // Eliminar capa combinada anterior
  if(RFMulti._combinedLayer) {
    try{ map.removeLayer(RFMulti._combinedLayer); }catch(e){}
    RFMulti._combinedLayer = null;
  }

  var nodes = RFMulti.nodes.filter(function(n){ return n.results && n.results.length; });
  if(!nodes.length) return;

  // Construir mapa de punts: clau "lat,lng" -> millor rxPower
  // Estratègia: usar el grid del node 0 com a referència
  // Per cada punt del grid de referència, buscar el millor rxPower de TOTS els nodes
  var refNode = nodes[0];
  var rxSensGlobal = nodes[0].params.rxSens || -137;
  var MATCH_DEG = 0.0005; // ~55m radi de cerca

  // Construir índex espacial simple per cada node (quadrícula de 0.001 graus)
  var IDX_GRID = 0.001;
  var nodeIndexes = nodes.map(function(node) {
    var idx = {};
    node.results.forEach(function(r) {
      if(r.rxPower < (node.params.rxSens || -137)) return;
      var kLat = Math.round(r.lat / IDX_GRID) * IDX_GRID;
      var kLng = Math.round(r.lng / IDX_GRID) * IDX_GRID;
      // Guardar en les 4 cel·les veïnes per no perdre punts de frontera
      for(var dLat=-1;dLat<=1;dLat++) for(var dLng=-1;dLng<=1;dLng++) {
        var key = (kLat+dLat*IDX_GRID).toFixed(3)+','+(kLng+dLng*IDX_GRID).toFixed(3);
        if(!idx[key]) idx[key]=[];
        idx[key].push(r);
      }
    });
    return idx;
  });

  // Per cada punt del grid de referència, agafar el millor de tots els nodes
  var bestMap = {};
  refNode.results.forEach(function(ref) {
    var best = ref.rxPower;
    var kLat = Math.round(ref.lat / IDX_GRID) * IDX_GRID;
    var kLng = Math.round(ref.lng / IDX_GRID) * IDX_GRID;
    var cellKey = kLat.toFixed(3)+','+kLng.toFixed(3);

    // Buscar en tots els nodes el punt més proper dins MATCH_DEG
    for(var ni=1; ni<nodes.length; ni++) {
      var candidates = nodeIndexes[ni][cellKey] || [];
      candidates.forEach(function(c) {
        var dlat = c.lat - ref.lat, dlng = c.lng - ref.lng;
        if(Math.abs(dlat) < MATCH_DEG && Math.abs(dlng) < MATCH_DEG) {
          if(c.rxPower > best) best = c.rxPower;
        }
      });
    }

    if(best >= rxSensGlobal) {
      var key = ref.lat.toFixed(5)+','+ref.lng.toFixed(5);
      bestMap[key] = { lat: ref.lat, lng: ref.lng, rxPower: best };
    }
  });

  // Afegir punts dels altres nodes que no cobreix el node de referència
  for(var ni=1; ni<nodes.length; ni++) {
    nodes[ni].results.forEach(function(r) {
      if(r.rxPower < (nodes[ni].params.rxSens||-137)) return;
      var key = r.lat.toFixed(5)+','+r.lng.toFixed(5);
      if(!bestMap[key]) bestMap[key] = { lat: r.lat, lng: r.lng, rxPower: r.rxPower };
    });
  }

  var rxSens = nodes[0].params.rxSens || -137;
  var rxMax = -48;
  var markers = [];

  Object.values(bestMap).forEach(function(r) {
    var ratio = Math.min(1, Math.max(0, (r.rxPower - rxSens) / (rxMax - rxSens)));
    var R, G, B, alpha;
    // Umbrals ajustats al rang real LoRa urba ITU-R: -75..-120 dBm
    if(r.rxPower >= -82)       { R=30;  G=220; B=60;  alpha=0.80; }  // BONA
    else if(r.rxPower >= -92)  { R=140; G=220; B=30;  alpha=0.75; }  // ACCEPTABLE
    else if(r.rxPower >= -102) { R=230; G=180; B=20;  alpha=0.70; }  // FEBLE
    else if(r.rxPower >= -115) { R=230; G=100; B=20;  alpha=0.65; }  // MOLT FEBLE
    else                       { R=200; G=40;  B=40;  alpha=0.55; }  // LIMIT
    markers.push(L.circleMarker([r.lat, r.lng], {
      radius: 6,
      fillColor: 'rgba('+R+','+G+','+B+','+alpha+')',
      fillOpacity: alpha,
      stroke: false
    }));
  });

  // Afegir marcadors d'antena de cada node
  nodes.forEach(function(node) {
    var c = node.colorDef;
    var rgb = Math.round(c.strong[0]*255)+','+Math.round(c.strong[1]*255)+','+Math.round(c.strong[2]*255);
    markers.push(L.circleMarker([node.lat, node.lng], {
      radius: 10,
      fillColor: 'rgba('+rgb+',1)',
      fillOpacity: 1,
      color: '#fff',
      weight: 2
    }).bindTooltip(node.label, {permanent:true, className:'rf-node-label', offset:[0,-5]}));
  });

  RFMulti._combinedLayer = L.layerGroup(markers).addTo(map);
};


RFMulti.calcStats = function(node) {
  if(!node.results) return null;
  var rxSens = node.params.rxSens || -137;
  var total = node.results.length;
  var covered = node.results.filter(function(r){ return r.rxPower >= rxSens; }).length;
  var good    = node.results.filter(function(r){ return r.rxPower >= -85; }).length;
  var medium  = node.results.filter(function(r){ return r.rxPower >= -100 && r.rxPower < -85; }).length;
  var weak    = node.results.filter(function(r){ return r.rxPower >= rxSens && r.rxPower < -100; }).length;
  var powers  = node.results.filter(function(r){ return r.rxPower >= rxSens; }).map(function(r){ return r.rxPower; });
  var avgP    = powers.length ? (powers.reduce(function(a,b){return a+b;},0)/powers.length).toFixed(1) : '?';
  return {
    total: total,
    covered: covered,
    pctCovered: ((covered/total)*100).toFixed(1),
    pctGood:    ((good/total)*100).toFixed(1),
    pctMedium:  ((medium/total)*100).toFixed(1),
    pctWeak:    ((weak/total)*100).toFixed(1),
    avgPower:   avgP
  };
};

RFMulti.calcStatsCombined = function() {
  var nodes = RFMulti.nodes.filter(function(n){ return n.results; });
  if(!nodes.length) return null;
  // Millor RSSI per punt (mateix snap que renderCombined2D)
  var SNAP = 0.0006;
  var bestMap = {};
  nodes.forEach(function(node) {
    var rxSens = node.params.rxSens || -137;
    node.results.forEach(function(r) {
      if(r.rxPower < rxSens) return;
      var kLat = Math.round(r.lat/SNAP)*SNAP;
      var kLng = Math.round(r.lng/SNAP)*SNAP;
      var key = kLat.toFixed(4)+','+kLng.toFixed(4);
      if(bestMap[key]===undefined || r.rxPower > bestMap[key]) bestMap[key] = r.rxPower;
    });
  });
  var vals = Object.values(bestMap);
  var rxSens = nodes[0].params.rxSens || -137;
  var total = vals.length;
  var covered = vals.filter(function(v){ return v >= rxSens; }).length;
  var good    = vals.filter(function(v){ return v >= -85; }).length;
  return {
    total: total,
    pctCovered: ((covered/total)*100).toFixed(1),
    pctGood:    ((good/total)*100).toFixed(1)
  };
};

})(window);