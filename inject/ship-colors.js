/**
 * Compact ship color picker — lobby preview + neutrals (noir / blanc / gris).
 */
(function () {
  'use strict';

  if (window.__sbDesktopShipColors) return;
  window.__sbDesktopShipColors = true;

  var NEUTRALS = [
    { id: 'black', label: 'Noir', bg: '#050505', hex: '#050505', filter: 'grayscale(1) brightness(0.15) contrast(1.45) saturate(0)', hue: 160 },
    { id: 'dgray', label: 'Gris fonce', bg: '#3a3a3a', hex: '#3a3a3a', filter: 'grayscale(1) brightness(0.48)', hue: 160 },
    { id: 'gray', label: 'Gris', bg: '#7a7a7a', hex: '#787878', filter: 'grayscale(1) brightness(0.7)', hue: 160 },
    { id: 'lgray', label: 'Gris clair', bg: '#b8b8b8', hex: '#bcbcbc', filter: 'grayscale(1) brightness(0.9)', hue: 160 },
    { id: 'white', label: 'Blanc', bg: '#f2f2f2', hex: '#f5f5f5', filter: 'grayscale(1) brightness(1.4) contrast(0.85)', hue: 160 }
  ];

  var HUES = [];
  for (var h = 0; h < 360; h += 12) HUES.push(h);

  var NEUTRAL_BY_ID = {};
  for (var n = 0; n < NEUTRALS.length; n++) NEUTRAL_BY_ID[NEUTRALS[n].id] = NEUTRALS[n];

  var shipExporterCache = null;
  var badgeRendererCache = null;
  var hsvConverterCache = null;
  var shipExporterHooked = false;
  var ll0O1TrapInstalled = false;
  var lO1OlTrapInstalled = false;
  var shipModelCtorHooked = false;
  var cachedLocalShip = null;
  var neutralTextureCache = {};

  var NEON_ROSE_FINISH = 'neonrose';
  var NEON_ROSE_HUE_DEG = 322;
  var NEON_ROSE_HUE = NEON_ROSE_HUE_DEG / 360;

  function getLocalCustomFinish() {
    var host = findWelcomeHost();
    if (host && host.lI1IO && host.lI1IO.I0OlO && host.lI1IO.I0OlO.custom && host.lI1IO.I0OlO.custom.finish) {
      return host.lI1IO.I0OlO.custom.finish;
    }
    return localStorage.getItem('finish') || '';
  }

  function isNeonRoseFinish(finish) {
    return finish === NEON_ROSE_FINISH;
  }

  function injectCustomFinishOptions() {
    walkObjects(window, function (obj) {
      if (obj && obj.options && obj.options.finish && typeof obj.options.finish === 'object') {
        if (!obj.options.finish[NEON_ROSE_FINISH]) {
          obj.options.finish[NEON_ROSE_FINISH] = 'Rose Neon';
        }
      }
      return null;
    }, 12);
  }

  function applyNeonRoseEngine(shipmodel) {
    if (!shipmodel || !shipmodel.lO0O0) return;
    var conv = findHsvConverter();
    var rgb = conv && conv.hsvToRgb ? conv.hsvToRgb(NEON_ROSE_HUE, 0.65, 1) : { r: 255, g: 110, b: 230 };
    if (shipmodel.lO0O0.color && shipmodel.lO0O0.color.setRGB) {
      shipmodel.lO0O0.color.setRGB(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    }
    shipmodel.lO0O0.opacity = 0.9;
    shipmodel.lO0O0.needsUpdate = true;
  }

  function buildNeonRoseShipMaterial(shipmodel) {
    if (!shipmodel) return null;
    shipmodel.finish = NEON_ROSE_FINISH;
    shipmodel.hue = NEON_ROSE_HUE;
    if (typeof shipmodel.buildFullColorMaterial === 'function') {
      shipmodel.buildFullColorMaterial();
    } else if (typeof shipmodel.buildDefaultMaterial === 'function') {
      shipmodel.buildDefaultMaterial();
    }
    if (shipmodel.material) {
      var conv = findHsvConverter();
      var body = conv && conv.hsvToRgbHex
        ? conv.hsvToRgbHex(NEON_ROSE_HUE, 1, 1)
        : 0xff4fd8;
      var glow = conv && conv.hsvToRgbHex
        ? conv.hsvToRgbHex(NEON_ROSE_HUE, 0.55, 1)
        : 0xff8ae8;
      if (shipmodel.material.color && shipmodel.material.color.setHex) {
        shipmodel.material.color.setHex(body);
      }
      if (shipmodel.material.emissive != null) {
        if (typeof shipmodel.material.emissive === 'number') shipmodel.material.emissive = glow;
        else if (shipmodel.material.emissive.setHex) shipmodel.material.emissive.setHex(glow);
      }
      if (shipmodel.material.emissiveIntensity != null) shipmodel.material.emissiveIntensity = 0.75;
      if (shipmodel.material.emissiveMap !== undefined) shipmodel.material.emissiveMap = shipmodel.material.emissiveMap || null;
      shipmodel.material.needsUpdate = true;
      shipmodel.lOl01 = shipmodel.material;
      if (shipmodel.I1l0O) shipmodel.I1l0O.material = shipmodel.material;
    }
    applyNeonRoseEngine(shipmodel);
    return shipmodel.material;
  }

  function applyNeonRoseShipModel(shipmodel) {
    if (!shipmodel) return;
    if (!isNeonRoseFinish(shipmodel.finish || getLocalCustomFinish())) {
      shipmodel.__sbNeonRoseApplied = false;
      return;
    }
    if (shipmodel.__sbNeonRoseApplied === NEON_ROSE_FINISH) return;
    buildNeonRoseShipMaterial(shipmodel);
    shipmodel.__sbNeonRoseApplied = NEON_ROSE_FINISH;
  }

  function patchInGameLocalNeonRoseShip() {
    if (!isNeonRoseFinish(getLocalCustomFinish())) return;
    var entry = getLocalShipEntry();
    if (entry && entry.shipmodel) applyNeonRoseShipModel(entry.shipmodel);
  }

  function hookBadgeFinishPreview() {
    var Badge = findBadgeRenderer();
    if (!Badge || !Badge.prototype || Badge.prototype.__sbNeonRoseFinishHooked) return;
    if (typeof Badge.prototype.drawMaterial !== 'function') return;

    var original = Badge.prototype.drawMaterial;
    Badge.prototype.drawMaterial = function (ctx, width, height) {
      var finish = this.finish || (this.custom && this.custom.finish);
      if (isNeonRoseFinish(finish)) {
        var grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#ff5ce8');
        grad.addColorStop(0.45, '#ff9ef5');
        grad.addColorStop(1, '#d946ef');
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
        return;
      }
      return original.apply(this, arguments);
    };
    Badge.prototype.__sbNeonRoseFinishHooked = true;
    badgeRendererCache = Badge;
  }

  function hexToInt(hex) {
    var v = String(hex || '#ffffff').replace('#', '');
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    return parseInt(v, 16) || 0xffffff;
  }

  function darkenHex(hex, factor) {
    var n = hexToInt(hex);
    var r = Math.max(0, Math.floor(((n >> 16) & 255) * factor));
    var g = Math.max(0, Math.floor(((n >> 8) & 255) * factor));
    var b = Math.max(0, Math.floor((n & 255) * factor));
    return (r << 16) | (g << 8) | b;
  }

  function lightenHexInt(hexInt, amount) {
    var r = Math.min(255, ((hexInt >> 16) & 255) + amount);
    var g = Math.min(255, ((hexInt >> 8) & 255) + amount);
    var b = Math.min(255, (hexInt & 255) + amount);
    return (r << 16) | (g << 8) | b;
  }

  function intToCss(hexInt) {
    var r = (hexInt >> 16) & 255;
    var g = (hexInt >> 8) & 255;
    var b = hexInt & 255;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function isShipModelInstance(obj) {
    return !!(obj && typeof obj.O11IO === 'function' && obj.O10l1 && obj.I1l0O);
  }

  function getLocalPlayerId() {
    var client = getGameClient();
    if (!client || !client.Ol10l || !client.Ol10l.lO1O0 || !client.Ol10l.lO1O0.status) return null;
    return client.Ol10l.lO1O0.status.id;
  }

  function getLocalShipEntry() {
    var client = getGameClient();
    if (!client || !client.Ol10l || !client.Ol10l.lI11I || !client.Ol10l.lI11I.ships) return null;
    var localId = getLocalPlayerId();
    if (localId == null) return null;
    var ships = client.Ol10l.lI11I.ships;
    for (var i = 0; i < ships.length; i++) {
      var entry = ships[i];
      if (entry && entry.I0OI1 && entry.I0OI1.status && entry.I0OI1.status.id === localId) {
        return entry;
      }
    }
    return null;
  }

  function getNeutralTexturePack(neu) {
    if (!neu || !window.THREE) return null;
    if (neutralTextureCache[neu.id]) return neutralTextureCache[neu.id];

    var THREE = window.THREE;
    var size = 512;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = Math.floor(size / 2);
    var ctx = canvas.getContext('2d');
    var base = hexToInt(neu.hex);
    var dark = darkenHex(neu.hex, neu.id === 'white' ? 0.82 : 0.55);
    var light = lightenHexInt(base, neu.id === 'black' ? 8 : 18);
    var cols = 8;
    var rows = 4;
    var blockW = size / cols;
    var blockH = canvas.height / rows;

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var tone = ((row + col) % 3 === 0) ? light : ((row + col) % 2 === 0 ? base : dark);
        ctx.fillStyle = intToCss(tone);
        ctx.fillRect(col * blockW, row * blockH, blockW + 1, blockH + 1);
      }
    }

    ctx.strokeStyle = intToCss(darkenHex(neu.hex, 0.35));
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= cols; gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * blockW, 0);
      ctx.lineTo(gx * blockW, canvas.height);
      ctx.stroke();
    }
    for (var gy = 0; gy <= rows; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * blockH);
      ctx.lineTo(size, gy * blockH);
      ctx.stroke();
    }

    var map = new THREE.Texture(canvas);
    map.needsUpdate = true;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.minFilter = THREE.LinearFilter;
    map.magFilter = THREE.LinearFilter;

    var emissiveMap = null;
    if (neu.id !== 'black') {
      var emCanvas = document.createElement('canvas');
      emCanvas.width = 128;
      emCanvas.height = 64;
      var emCtx = emCanvas.getContext('2d');
      emCtx.fillStyle = intToCss(base);
      emCtx.fillRect(0, 0, emCanvas.width, emCanvas.height);
      emissiveMap = new THREE.Texture(emCanvas);
      emissiveMap.needsUpdate = true;
      emissiveMap.wrapS = THREE.RepeatWrapping;
      emissiveMap.wrapT = THREE.RepeatWrapping;
    }

    var pack = {
      map: map,
      emissiveMap: emissiveMap,
      color: 0xffffff,
      emissive: neu.id === 'black' ? 0x000000 : base,
      emissiveIntensity: neu.id === 'black' ? 0 : (neu.id === 'white' ? 0.12 : 0.22),
      engine: neu.id === 'black' ? 0x111111 : lightenHexInt(base, 10),
      engineOpacity: neu.id === 'black' ? 0.12 : 0.55
    };
    neutralTextureCache[neu.id] = pack;
    return pack;
  }

  function patchShipMaterialWithTextures(mat, pack, neu) {
    if (!mat || !pack || !neu) return;
    if (mat.__sbGemPatched || mat.__sbAsteroidPatched) return;
    if (mat.map) {
      mat.map = pack.map;
      if (mat.bumpMap) mat.bumpMap = pack.map;
      if (mat.specularMap) mat.specularMap = pack.map;
    }
    if (mat.color && mat.color.setHex) mat.color.setHex(pack.color);
    if (mat.emissive != null) {
      if (typeof mat.emissive === 'number') mat.emissive = pack.emissive;
      else if (mat.emissive.setHex) mat.emissive.setHex(pack.emissive);
    }
    if (mat.emissiveMap !== undefined) mat.emissiveMap = pack.emissiveMap;
    if (mat.emissiveIntensity != null) mat.emissiveIntensity = pack.emissiveIntensity;
    if (mat.specular && mat.specular.setHex) {
      mat.specular.setHex(neu.id === 'black' ? 0x050505 : darkenHex(neu.hex, 0.7));
    }
    if (mat.shininess != null) mat.shininess = neu.id === 'white' ? 24 : 10;
    mat.__sbNeutralTexId = neu.id;
    mat.needsUpdate = true;
  }

  function applyNeutralShipModelTextures(shipmodel, neu) {
    if (!shipmodel || !neu) return;
    var pack = getNeutralTexturePack(neu);
    if (!pack) return;

    shipmodel.__sbNeutralId = neu.id;
    shipmodel.hue = neu.hue / 360;

    var mats = [];
    if (shipmodel.material) mats.push(shipmodel.material);
    if (shipmodel.lOl01) mats.push(shipmodel.lOl01);
    if (shipmodel.I1l0O && shipmodel.I1l0O.material) mats.push(shipmodel.I1l0O.material);

    for (var m = 0; m < mats.length; m++) {
      patchShipMaterialWithTextures(mats[m], pack, neu);
    }

    if (shipmodel.O10l1 && shipmodel.O10l1.traverse) {
      shipmodel.O10l1.traverse(function (node) {
        if (node && node.material) patchShipMaterialWithTextures(node.material, pack, neu);
      });
    }

    if (shipmodel.lO0O0) {
      if (shipmodel.lO0O0.color && shipmodel.lO0O0.color.setHex) {
        shipmodel.lO0O0.color.setHex(pack.engine);
      }
      shipmodel.lO0O0.opacity = pack.engineOpacity;
      shipmodel.lO0O0.needsUpdate = true;
    }
  }

  function patchInGameLocalShipTextures() {
    patchInGameLocalNeonRoseShip();
    var neu = getActiveNeutral();
    if (!neu || isNeonRoseFinish(getLocalCustomFinish())) return;
    var entry = getLocalShipEntry();
    if (entry && entry.shipmodel) applyNeutralShipModelTextures(entry.shipmodel, neu);
  }

  function hookShipModelBuilder() {
    var Ctor = window.lO1Ol;
    if (!Ctor || !Ctor.prototype || shipModelCtorHooked) return;

    if (typeof Ctor.prototype.O11IO === 'function' && !Ctor.prototype.__sbO11IOWrapped) {
      var originalO11IO = Ctor.prototype.O11IO;
      Ctor.prototype.O11IO = function () {
        var mat;
        if (isNeonRoseFinish(this.finish)) {
          mat = buildNeonRoseShipMaterial(this);
          return mat;
        }
        mat = originalO11IO.apply(this, arguments);
        var neu = getActiveNeutral();
        if (neu && !isNeonRoseFinish(this.finish)) applyNeutralShipModelTextures(this, neu);
        return mat;
      };
      Ctor.prototype.__sbO11IOWrapped = true;
    }

    shipModelCtorHooked = true;
  }

  function installLO1OlTrap() {
    if (lO1OlTrapInstalled || typeof window === 'undefined') return;
    lO1OlTrapInstalled = true;
    var current = window.lO1Ol;
    try {
      Object.defineProperty(window, 'lO1Ol', {
        configurable: true,
        enumerable: true,
        get: function () { return current; },
        set: function (v) {
          current = v;
          shipModelCtorHooked = false;
          hookShipModelBuilder();
        }
      });
    } catch (e) { /* ignore */ }
    if (current) hookShipModelBuilder();
  }

  function walkObjects(root, visit, maxDepth) {
    var stack = [{ obj: root, depth: 0 }];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var item = stack.pop();
      var obj = item.obj;
      var depth = item.depth;
      if (!obj || depth > maxDepth) continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      var hit = visit(obj, depth);
      if (hit) return hit;

      if (typeof obj !== 'object' && typeof obj !== 'function') continue;
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 50; i++) {
        try {
          var child = obj[keys[i]];
          if (child && (typeof child === 'object' || typeof child === 'function')) {
            stack.push({ obj: child, depth: depth + 1 });
          }
        } catch (e) { /* ignore */ }
      }
    }
    return null;
  }

  function findWelcomeHost() {
    return walkObjects(window, function (obj) {
      if (typeof obj.setColor === 'function' && obj.game_modes) return obj;
      return null;
    }, 7);
  }

  function matchShipExporter(obj) {
    if (!obj) return null;
    if (typeof obj.exportThumbnail === 'function') return obj;
    return null;
  }

  function findShipExporter() {
    if (shipExporterCache && shipExporterCache.exportThumbnail) return shipExporterCache;

    var direct = matchShipExporter(typeof window !== 'undefined' ? window.lO1Ol : null);
    if (direct) {
      shipExporterCache = direct;
      return direct;
    }

    var host = findWelcomeHost();
    if (host && host.lI1IO) {
      var fromClient = walkObjects(host.lI1IO, matchShipExporter, 12);
      if (fromClient) {
        shipExporterCache = fromClient;
        return fromClient;
      }
    }

    var fromWindow = walkObjects(window, matchShipExporter, 12);
    if (fromWindow) {
      shipExporterCache = fromWindow;
      return fromWindow;
    }
    return null;
  }

  function findHsvConverter() {
    if (hsvConverterCache && hsvConverterCache.hsvToRgbHex) return hsvConverterCache;
    if (typeof window.ll0O1 !== 'undefined' && window.ll0O1 && window.ll0O1.hsvToRgbHex) {
      hsvConverterCache = window.ll0O1;
      return window.ll0O1;
    }
    var found = walkObjects(window, function (obj) {
      if (obj && typeof obj.hsvToRgbHex === 'function') return obj;
      return null;
    }, 14);
    if (found) hsvConverterCache = found;
    return found;
  }

  function getActiveNeutral() {
    var id = localStorage.getItem('sb_ship_neutral') || '';
    return id && NEUTRAL_BY_ID[id] ? NEUTRAL_BY_ID[id] : null;
  }

  function isWelcomeScreen() {
    return !!(document.getElementById('player') ||
      document.querySelector('.modal .gmodes') ||
      document.querySelector('.modal #player'));
  }

  function shouldForceNeutralColor() {
    var neu = getActiveNeutral();
    if (!neu) return false;
    if (window.__sbApplyingLocalShipColor) return true;
    if (window.__sbInGameShipTint) return true;
    if (isWelcomeScreen()) return true;
    return false;
  }

  function getGameClient() {
    var host = findWelcomeHost();
    return host && host.lI1IO ? host.lI1IO : null;
  }

  function isShipLikeObject(obj) {
    if (!obj || typeof obj.updateHue !== 'function') return false;
    if (typeof obj.ll1OO === 'function') return false;
    return typeof obj.traverse === 'function' || !!obj.material;
  }

  function isNearCamera(obj, camera, maxDist) {
    if (!obj || !obj.position || !camera || !camera.position) return false;
    var dx = obj.position.x - camera.position.x;
    var dy = obj.position.y - camera.position.y;
    var dz = (obj.position.z || 0) - (camera.position.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz) <= (maxDist || 160);
  }

  function shouldTintMeshMaterial(mat, neu) {
    if (!mat) return false;
    if (mat.__sbGemPatched || mat.__sbAsteroidPatched) return false;
    if (mat.transparent && mat.opacity != null && mat.opacity < 0.5) return false;
    if (neu && neu.id === 'black') return true;
    if (mat.transparent && mat.opacity != null && mat.opacity < 0.8) return false;
    return true;
  }

  function isLocalShipInstance(obj) {
    if (!obj) return false;
    if (cachedLocalShip && obj === cachedLocalShip) return true;
    var client = getGameClient();
    if (!client) return false;
    if (client.Ol10l != null && obj.Ol10l != null && obj.Ol10l === client.Ol10l) return true;
    if (obj.lI1IO === client) return true;
    if (obj.I0OlO && client.I0OlO && obj.I0OlO === client.I0OlO) return true;
    if (obj.I0OlO && client.I0OlO && obj.I0OlO.custom && obj.I0OlO.custom === client.I0OlO.custom) return true;
    return false;
  }

  function isLocalShipCandidate(obj, camera) {
    if (!isShipLikeObject(obj)) return false;
    if (isLocalShipInstance(obj)) return true;
    if (camera && isNearCamera(obj, camera, 100)) return true;
    return false;
  }

  function attachPerRenderTint(root) {
    if (!root || root.__sbPerRenderTint) return;
    root.__sbPerRenderTint = true;
    var visit = function (node) {
      if (!node || node.__sbPerRenderTintNode) return;
      node.__sbPerRenderTintNode = true;
      var prev = node.onBeforeRender;
      node.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
        if (prev) prev.call(this, renderer, scene, camera, geometry, material, group);
        var neu = getActiveNeutral();
        if (!neu) return;
        if (this.material) applyNeutralMaterial(this.material, neu);
      };
      if (node.children) {
        for (var i = 0; i < node.children.length; i++) visit(node.children[i]);
      }
    };
    if (root.traverse) {
      root.traverse(function (node) { visit(node); });
    } else {
      visit(root);
    }
  }

  function findLocalShipFromScene(scene, camera) {
    if (!scene || !scene.traverse) return cachedLocalShip;
    var best = null;
    var bestDist = Infinity;

    scene.traverse(function (node) {
      if (!isShipLikeObject(node)) return;
      if (isLocalShipInstance(node)) {
        best = node;
        bestDist = -1;
        return;
      }
      if (!camera || !node.position) return;
      var dx = node.position.x - camera.position.x;
      var dy = node.position.y - camera.position.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = node;
      }
    });

    if (best && (bestDist < 0 || bestDist < 120)) {
      cachedLocalShip = best;
      return best;
    }
    return cachedLocalShip;
  }

  function findAllShipRoots() {
    var ships = [];
    var host = findWelcomeHost();
    if (!host || !host.lI1IO) return ships;
    walkObjects(host.lI1IO, function (obj) {
      if (isShipLikeObject(obj)) ships.push(obj);
      return null;
    }, 14);
    return ships;
  }

  function neutralRgb(neu) {
    var n = hexToInt(neu.hex);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function wrapHsvConverter(conv) {
    if (!conv || conv.__sbNeutralWrapped) return false;
    var wrapped = false;

    if (typeof conv.hsvToRgbHex === 'function') {
      var originalHex = conv.hsvToRgbHex.bind(conv);
      conv.hsvToRgbHex = function (h, s, l) {
        var neu = getActiveNeutral();
        if (neu && neu.hex && shouldForceNeutralColor()) return neu.hex;
        return originalHex(h, s, l);
      };
      wrapped = true;
    }

    if (typeof conv.hsvToRgb === 'function') {
      var originalRgb = conv.hsvToRgb.bind(conv);
      conv.hsvToRgb = function (h, s, l) {
        var neu = getActiveNeutral();
        if (neu && neu.hex && shouldForceNeutralColor()) return neutralRgb(neu);
        return originalRgb(h, s, l);
      };
      wrapped = true;
    }

    if (!wrapped) return false;
    conv.__sbNeutralWrapped = true;
    hsvConverterCache = conv;
    return true;
  }

  function installLl0O1Trap() {
    if (ll0O1TrapInstalled || typeof window === 'undefined') return;
    ll0O1TrapInstalled = true;
    var current = window.ll0O1;
    try {
      Object.defineProperty(window, 'll0O1', {
        configurable: true,
        enumerable: true,
        get: function () { return current; },
        set: function (v) {
          current = v;
          if (v) wrapHsvConverter(v);
        }
      });
    } catch (e) {
      // ignore
    }
    if (current) wrapHsvConverter(current);
  }

  function hookAllHsvConverters() {
    installLl0O1Trap();
    var hooked = 0;
    if (typeof window.ll0O1 !== 'undefined' && window.ll0O1) {
      if (wrapHsvConverter(window.ll0O1)) hooked += 1;
    }
    walkObjects(window, function (obj) {
      if (wrapHsvConverter(obj)) hooked += 1;
      return null;
    }, 14);
    return hooked;
  }

  function isShipTintMaterial(mat) {
    if (!mat) return false;
    if (mat.__sbGemPatched || mat.__sbAsteroidPatched) return false;
    if (mat.color && mat.color.setHex) return true;
    if (mat.uniforms && (mat.uniforms.diffuse || mat.uniforms.color)) return true;
    return false;
  }

  function patchMaterialUniforms(mat, neu, target) {
    if (!mat || !mat.uniforms) return;
    var keys = Object.keys(mat.uniforms);
    for (var k = 0; k < keys.length; k++) {
      var uni = mat.uniforms[keys[k]];
      if (!uni) continue;
      var val = uni.value;
      if (/hue/i.test(keys[k]) && typeof val === 'number') {
        uni.value = neu.hue;
      }
      if (/sat/i.test(keys[k]) && typeof val === 'number') {
        uni.value = 0;
      }
      if (val && val.setHex) {
        if (/diffuse|color|tint/i.test(keys[k])) val.setHex(target);
        if (/emissive/i.test(keys[k])) val.setHex(neu.id === 'black' ? 0x000000 : target);
      }
    }
  }

  function applyNeutralMaterial(material, neu) {
    if (!material || !neu) return;
    var pack = getNeutralTexturePack(neu);
    var mats = Array.isArray(material) ? material : [material];
    var target = hexToInt(neu.hex);
    for (var i = 0; i < mats.length; i++) {
      var mat = mats[i];
      if (!shouldTintMeshMaterial(mat, neu) && !isShipTintMaterial(mat)) continue;
      if (pack && mat.map) {
        patchShipMaterialWithTextures(mat, pack, neu);
        continue;
      }
      if (mat.color && mat.color.setHex) {
        mat.color.setHex(target);
        if (neu.id === 'black' && mat.color.setRGB) mat.color.setRGB(0.02, 0.02, 0.02);
      }
      if (mat.emissive && mat.emissive.setHex) {
        mat.emissive.setHex(0x000000);
      }
      if (mat.emissiveMap !== undefined) mat.emissiveMap = null;
      if (mat.specular && mat.specular.setHex) {
        mat.specular.setHex(neu.id === 'black' ? 0x050505 : 0x333333);
      }
      if (mat.emissiveIntensity != null) mat.emissiveIntensity = 0;
      if (mat.shininess != null && neu.id === 'black') mat.shininess = 8;
      patchMaterialUniforms(mat, neu, target);
      mat.__sbNeutralTint = neu.id;
      mat.needsUpdate = true;
    }
  }

  function tintMeshesNearCamera(scene, camera, neu) {
    if (!scene || !scene.traverse || !camera || !neu) return;
    scene.traverse(function (node) {
      if (!node || !node.material || !node.position) return;
      if (!shouldTintMeshMaterial(Array.isArray(node.material) ? node.material[0] : node.material, neu)) return;
      if (!isNearCamera(node, camera, 180)) return;
      applyNeutralMaterial(node.material, neu);
      if (!node.__sbPerRenderTintNode) {
        var prev = node.onBeforeRender;
        node.onBeforeRender = function (renderer, scn, cam, geometry, material, group) {
          if (prev) prev.call(this, renderer, scn, cam, geometry, material, group);
          var n = getActiveNeutral();
          if (n && this.material) applyNeutralMaterial(this.material, n);
        };
        node.__sbPerRenderTintNode = true;
      }
    });
  }

  function tintObject3D(root, neu) {
    if (!root || !neu) return;
    if (typeof root.traverse === 'function') {
      root.traverse(function (node) {
        if (node && node.material) applyNeutralMaterial(node.material, neu);
      });
      return;
    }
    if (root.material) applyNeutralMaterial(root.material, neu);
  }

  function findLocalShipRoot() {
    var ships = findAllShipRoots();
    for (var i = 0; i < ships.length; i++) {
      if (isLocalShipInstance(ships[i])) return ships[i];
    }
    if (cachedLocalShip) return cachedLocalShip;
    return ships.length ? ships[0] : null;
  }

  function collectWelcomeScenes(host) {
    var scenes = [];
    host = host || findWelcomeHost();
    if (!host || !host.lI1IO) return scenes;
    walkObjects(host.lI1IO, function (obj) {
      if (obj && (obj.type === 'Scene' || obj.isScene === true)) scenes.push(obj);
      return null;
    }, 14);
    var display = host.lI1IO.display;
    if (display && display.scene) scenes.push(display.scene);
    return scenes;
  }

  function findWelcomeCanvases() {
    var list = [];
    var roots = [
      document.getElementById('player'),
      document.querySelector('.modal #player'),
      document.querySelector('.modal'),
      findShipPreviewNode()
    ];
    for (var r = 0; r < roots.length; r++) {
      if (!roots[r]) continue;
      var canvases = roots[r].querySelectorAll('canvas');
      for (var i = 0; i < canvases.length; i++) list.push(canvases[i]);
    }
    return list;
  }

  function syncWelcomeCanvasFilter(neu) {
    var filter = neu ? neu.filter : '';
    var canvases = findWelcomeCanvases();
    for (var i = 0; i < canvases.length; i++) {
      canvases[i].style.filter = filter;
    }
    var preview = findShipPreviewNode();
    if (preview) preview.style.filter = filter;
  }

  function tintWelcomeShip(host) {
    var neu = getActiveNeutral();
    var rose = isNeonRoseFinish(getLocalCustomFinish());
    if (!neu && !rose) {
      syncWelcomeCanvasFilter(null);
      return;
    }
    host = host || findWelcomeHost();
    if (rose && host && host.lI1IO) {
      walkObjects(host.lI1IO, function (obj) {
        if (isShipModelInstance(obj)) applyNeonRoseShipModel(obj);
        return null;
      }, 14);
    }
    if (!neu) return;
    if (!host || !host.lI1IO || !host.lI1IO.display) {
      syncWelcomeCanvasFilter(neu);
      return;
    }
    var display = host.lI1IO.display;
    if (display.screen) tintObject3D(display.screen, neu);
    if (display.scene) tintObject3D(display.scene, neu);
    var scenes = collectWelcomeScenes(host);
    for (var s = 0; s < scenes.length; s++) tintObject3D(scenes[s], neu);
    var ship = findLocalShipRoot();
    if (ship) tintObject3D(ship, neu);
    if (host && host.lI1IO) {
      walkObjects(host.lI1IO, function (obj) {
        if (isShipModelInstance(obj)) {
          if (isNeonRoseFinish(getLocalCustomFinish())) applyNeonRoseShipModel(obj);
          else applyNeutralShipModelTextures(obj, neu);
        }
        return null;
      }, 14);
    }
    syncWelcomeCanvasFilter(neu);
  }

  function applyLocalNeutralTint(scene, camera) {
    var neu = getActiveNeutral();
    var rose = isNeonRoseFinish(getLocalCustomFinish());
    if (!neu && !rose) return;
    window.__sbApplyingLocalShipColor = true;
    window.__sbInGameShipTint = !!(scene && camera);
    try {
      hookAllHsvConverters();
      tintWelcomeShip(findWelcomeHost());
      if (neu && scene && camera) tintMeshesNearCamera(scene, camera, neu);
      var ship = scene && camera ? findLocalShipFromScene(scene, camera) : findLocalShipRoot();
      if (!ship && scene && camera) ship = findLocalShipFromScene(scene, camera);
      if (ship) {
        cachedLocalShip = ship;
        if (neu) {
          tintObject3D(ship, neu);
          attachPerRenderTint(ship);
        }
        if (isShipModelInstance(ship)) {
          if (rose) applyNeonRoseShipModel(ship);
          else if (neu) applyNeutralShipModelTextures(ship, neu);
        }
      }
      patchInGameLocalShipTextures();
    } finally {
      window.__sbApplyingLocalShipColor = false;
      window.__sbInGameShipTint = false;
    }
  }

  function hookSetHueTargets() {
    walkObjects(window, function (obj) {
      if (!obj || typeof obj.setHue !== 'function' || obj.__sbSetHueHooked) return null;
      var original = obj.setHue.bind(obj);
      obj.setHue = function (hue) {
        hookAllHsvConverters();
        var neu = getActiveNeutral();
        window.__sbApplyingLocalShipColor = true;
        var out;
        try {
          out = original(neu ? neu.hue : hue);
          applyLocalNeutralTint();
        } finally {
          window.__sbApplyingLocalShipColor = false;
        }
        refreshShipPreview();
        return out;
      };
      obj.__sbSetHueHooked = true;
      return null;
    }, 12);
  }

  function hookShipUpdateHue() {
    walkObjects(window, function (obj) {
      if (typeof obj !== 'function' || !obj.prototype) return null;
      if (typeof obj.prototype.updateHue !== 'function' || obj.prototype.__sbShipHueWrapped) return null;
      if (typeof obj.prototype.updateScore === 'function' && typeof obj.prototype.ll1OO === 'function') return null;

      var original = obj.prototype.updateHue;
      obj.prototype.updateHue = function (hue) {
        hookAllHsvConverters();
        var neu = getActiveNeutral();
        var cam = window.__sbLastCamera;
        var isLocal = isLocalShipCandidate(this, cam);
        if (neu && isLocal) {
          cachedLocalShip = this;
          window.__sbApplyingLocalShipColor = true;
          window.__sbInGameShipTint = true;
          try {
            var out = original.call(this, neu.hue);
            if (isShipModelInstance(this)) applyNeutralShipModelTextures(this, neu);
            tintObject3D(this, neu);
            attachPerRenderTint(this);
            patchInGameLocalShipTextures();
            return out;
          } finally {
            window.__sbApplyingLocalShipColor = false;
            window.__sbInGameShipTint = false;
          }
        }
        return original.call(this, hue);
      };
      obj.prototype.__sbShipHueWrapped = true;
      return null;
    }, 12);
  }

  function applyNeutralCanvasFilter(node, neu) {
    if (!node || !neu) return node;

    var src = node;
    var canvas = node.tagName === 'CANVAS' ? node : null;

    if (!canvas && node.tagName === 'IMG' && node.complete && node.naturalWidth > 0) {
      canvas = document.createElement('canvas');
      canvas.width = node.naturalWidth;
      canvas.height = node.naturalHeight;
      var c0 = canvas.getContext('2d');
      c0.drawImage(node, 0, 0);
      node = canvas;
    }

    if (canvas) {
      var w = canvas.width;
      var h = canvas.height;
      if (w > 0 && h > 0) {
        var tmp = document.createElement('canvas');
        tmp.width = w;
        tmp.height = h;
        var tctx = tmp.getContext('2d');
        tctx.filter = neu.filter;
        tctx.drawImage(canvas, 0, 0);
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(tmp, 0, 0);
      }
      canvas.style.filter = neu.filter;
      return canvas;
    }

    if (src && src.style) src.style.filter = neu.filter;
    return src;
  }

  function hookShipExporter() {
    if (shipExporterHooked) return;
    var exporter = findShipExporter();
    if (!exporter || exporter.__sbShipColorWrapped) return;

    var original = exporter.exportThumbnail.bind(exporter);
    exporter.exportThumbnail = function (code, hue, finish, laser, size) {
      var neutralId = localStorage.getItem('sb_ship_neutral') || '';
      var neu = neutralId && NEUTRAL_BY_ID[neutralId];
      var shipHue = parseInt(hue, 10);
      if (isNaN(shipHue)) shipHue = 0;
      if (isNeonRoseFinish(finish || getLocalCustomFinish())) {
        finish = NEON_ROSE_FINISH;
        shipHue = NEON_ROSE_HUE_DEG;
      } else if (neu) {
        shipHue = neu.hue;
      }
      var thumb = original(code, shipHue, finish, laser, size);
      if (neu && !isNeonRoseFinish(finish) && thumb) thumb = applyNeutralCanvasFilter(thumb, neu);
      return thumb;
    };
    exporter.__sbShipColorWrapped = true;
    shipExporterCache = exporter;
    shipExporterHooked = true;
  }

  function findBadgeRenderer() {
    if (badgeRendererCache) return badgeRendererCache;

    var found = walkObjects(window, function (obj) {
      if (typeof obj !== 'function' || !obj.prototype) return null;
      if (typeof obj.prototype.toImage === 'function' && typeof obj.prototype.OO0IO === 'function') {
        return obj;
      }
      return null;
    }, 8);

    if (found) badgeRendererCache = found;
    return found;
  }

  function getCustomParts(host) {
    var finish = 'zinc';
    var laser = 0;
    if (host && host.lI1IO && host.lI1IO.I0OlO && host.lI1IO.I0OlO.custom) {
      finish = host.lI1IO.I0OlO.custom.finish;
      laser = host.lI1IO.I0OlO.custom.laser;
    }
    if (isNeonRoseFinish(finish)) finish = NEON_ROSE_FINISH;
    return { finish: finish, laser: laser };
  }

  function swatchKey(hue, neutralId) {
    return neutralId ? 'n:' + neutralId : 'h:' + hue;
  }

  function readSelection() {
    var neutral = localStorage.getItem('sb_ship_neutral') || '';
    var hue = parseInt(localStorage.getItem('shipColor') || '0', 10);
    if (isNaN(hue)) hue = 0;
    if (neutral && NEUTRAL_BY_ID[neutral]) {
      return { hue: NEUTRAL_BY_ID[neutral].hue, neutral: neutral };
    }
    return { hue: hue, neutral: '' };
  }

  function findShipPreviewNode() {
    return document.querySelector('.modal .shippreview') ||
      document.querySelector('.modal td.shippreview') ||
      document.querySelector('td.shippreview') ||
      document.querySelector('.shippreview');
  }

  function syncCustomHue(hue, host) {
    host = host || findWelcomeHost();
    if (!host || !host.lI1IO || !host.lI1IO.I0OlO) return;
    var neu = getActiveNeutral();
    var rose = isNeonRoseFinish(getLocalCustomFinish());
    var parsed = rose ? NEON_ROSE_HUE_DEG : (neu ? neu.hue : parseInt(hue, 10));
    if (isNaN(parsed)) parsed = 0;
    if (host.lI1IO.I0OlO.custom) {
      host.lI1IO.I0OlO.custom.hue = parsed;
      if (rose) {
        host.lI1IO.I0OlO.custom.finish = NEON_ROSE_FINISH;
        delete host.lI1IO.I0OlO.custom.sb_ship_neutral;
      } else if (neu) {
        host.lI1IO.I0OlO.custom.saturation = 0;
        host.lI1IO.I0OlO.custom.s = 0;
        host.lI1IO.I0OlO.custom.sb_ship_neutral = neu.id;
      } else {
        delete host.lI1IO.I0OlO.custom.sb_ship_neutral;
      }
    }
    if (host.lI1IO.I0OlO.hue !== undefined) host.lI1IO.I0OlO.hue = parsed;
    try {
      if (window.ClientStorage && typeof window.ClientStorage.setItem === 'function') {
        window.ClientStorage.setItem('shipColor', String(parsed));
        if (neu) window.ClientStorage.setItem('sb_ship_neutral', neu.id);
        else window.ClientStorage.removeItem('sb_ship_neutral');
      }
    } catch (e) { /* ignore */ }
  }

  function refreshWelcomeCanvasShip(hue, host) {
    host = host || findWelcomeHost();
    if (!host || !host.lI1IO || !host.lI1IO.display || !host.lI1IO.display.screen) return;
    var screen = host.lI1IO.display.screen;
    window.__sbApplyingLocalShipColor = true;
    try {
      if (typeof screen.setHue === 'function') screen.setHue(parseInt(hue, 10) || 0);
      applyLocalNeutralTint();
    } finally {
      window.__sbApplyingLocalShipColor = false;
    }
  }

  function refreshShipPreview() {
    hookShipExporter();
    injectCustomFinishOptions();
    hookBadgeFinishPreview();
    var exporter = findShipExporter();
    if (!exporter) return;

    var host = findWelcomeHost();
    var sel = readSelection();
    var parts = getCustomParts(host);
    var shipHue = parseInt(localStorage.getItem('shipColor') || String(sel.hue), 10);
    if (isNaN(shipHue)) shipHue = sel.hue;
    var neu = sel.neutral && NEUTRAL_BY_ID[sel.neutral];

    syncCustomHue(shipHue, host);
    refreshWelcomeCanvasShip(shipHue, host);

    var preview = findShipPreviewNode();
    if (preview) {
      var liveCanvas = preview.querySelector('canvas');
      if (!liveCanvas) {
        preview.innerHTML = '';
        var thumb = exporter.exportThumbnail(101, shipHue, parts.finish, parts.laser, 192);
        if (thumb) {
          if (neu) thumb = applyNeutralCanvasFilter(thumb, neu);
          preview.appendChild(thumb);
        }
      }
      if (neu) syncWelcomeCanvasFilter(neu);
    }

    var logo = document.querySelector('.ecpverifiedlogo');
    var Badge = findBadgeRenderer();
    if (logo && Badge && host && host.lI1IO && host.lI1IO.I0OlO && host.lI1IO.I0OlO.custom) {
      try {
        logo.innerHTML = '';
        var badge = new Badge(112, host.lI1IO.I0OlO.custom);
        if (badge.canvas) logo.appendChild(badge.canvas);
      } catch (e) { /* ignore */ }
    }
  }

  function updateSwatchUI(sel) {
    var key = swatchKey(sel.hue, sel.neutral);
    var spans = document.querySelectorAll('#sb-ship-color-bar span[data-sb-color], #colors span[data-sb-color]');
    for (var i = 0; i < spans.length; i++) {
      var el = spans[i];
      if (el.getAttribute('data-sb-color') === key) el.classList.add('selected');
      else el.classList.remove('selected');
    }
  }

  function updateAccentUI(hue, neutralId) {
    var neu = neutralId ? NEUTRAL_BY_ID[neutralId] : null;
    var chosen = document.querySelector('.colorchosen');
    if (chosen) {
      chosen.style.background = neu
        ? neu.bg
        : 'linear-gradient(135deg,hsl(' + hue + ',70%,60%) 0%,hsl(' + hue + ',70%,40%) 100%)';
    }

    var input = document.querySelector('#player input') ||
      document.querySelector('.modal input[type="text"]');
    if (input) {
      if (neu) {
        input.style.color = neu.id === 'black' ? 'rgba(220,220,220,.9)' : 'rgba(40,40,40,.95)';
        input.style.textShadow = '0 0 6px rgba(255,255,255,.35)';
      } else {
        input.style.color = 'hsla(' + hue + ',100%,90%,.9)';
        input.style.textShadow = '0 0 7px hsla(' + hue + ',80%,80%,1)';
      }
    }
  }

  function syncNativeColorSpan(hue) {
    var host = findWelcomeHost();
    localStorage.setItem('shipColor', String(hue));

    if (host && typeof host.setColor === 'function') {
      var native = document.querySelector('#colors span[data-hue="' + hue + '"]');
      if (native) {
        var spans = document.querySelectorAll('#colors span[data-hue]');
        for (var i = 0; i < spans.length; i++) {
          spans[i].classList.remove('selected');
        }
        native.classList.add('selected');
      }
      window.__sbApplyingLocalShipColor = true;
      try {
        host.setColor(hue);
        applyLocalNeutralTint();
      } finally {
        window.__sbApplyingLocalShipColor = false;
      }
    }
  }

  function hookSetColor(host) {
    if (!host || host.__sbSetColorHooked || typeof host.setColor !== 'function') return;
    host.__sbSetColorHooked = true;
    var original = host.setColor.bind(host);
    host.setColor = function (hue) {
      var result = original(hue);
      refreshShipPreview();
      return result;
    };
  }

  function applySelection(hue, neutralId) {
    hue = parseInt(hue, 10);
    if (isNaN(hue)) hue = 0;
    hookAllHsvConverters();
    hookSetHueTargets();

    if (neutralId && NEUTRAL_BY_ID[neutralId]) {
      var neu = NEUTRAL_BY_ID[neutralId];
      localStorage.setItem('sb_ship_neutral', neutralId);
      localStorage.setItem('shipColor', String(neu.hue));
      syncNativeColorSpan(neu.hue);
    } else {
      localStorage.removeItem('sb_ship_neutral');
      localStorage.setItem('shipColor', String(hue));
      syncNativeColorSpan(hue);
    }

    var sel = readSelection();
    updateSwatchUI(sel);
    updateAccentUI(sel.hue, sel.neutral);
    refreshShipPreview();
    window.dispatchEvent(new CustomEvent('sbDesktopShipHue', { detail: sel }));
  }

  function makeNeutralSwatch(neu) {
    var span = document.createElement('span');
    span.style.background = neu.bg;
    span.setAttribute('data-sb-color', swatchKey(neu.hue, neu.id));
    span.setAttribute('data-sb-neutral', neu.id);
    span.title = neu.label;
    span.className = 'sb-neutral-swatch';
    span.addEventListener('click', function (id) {
      return function () { applySelection(NEUTRAL_BY_ID[id].hue, id); };
    }(neu.id));
    return span;
  }

  function makeHueSwatch(hue) {
    var span = document.createElement('span');
    span.style.background = 'linear-gradient(135deg,hsl(' + hue + ',70%,60%) 0%,hsl(' + hue + ',70%,40%) 100%)';
    span.setAttribute('data-sb-color', swatchKey(hue, ''));
    span.setAttribute('data-hue', String(hue));
    span.title = 'Teinte ' + hue;
    span.addEventListener('click', function (h) {
      return function () { applySelection(h, ''); };
    }(hue));
    return span;
  }

  function buildPalette(container) {
    if (!container || container.__sbPaletteBuilt) return;
    container.innerHTML = '';

    var neutralsRow = document.createElement('div');
    neutralsRow.className = 'sb-ship-color-row sb-ship-color-neutrals';
    for (var i = 0; i < NEUTRALS.length; i++) neutralsRow.appendChild(makeNeutralSwatch(NEUTRALS[i]));
    container.appendChild(neutralsRow);

    var huesRow = document.createElement('div');
    huesRow.className = 'sb-ship-color-row sb-ship-color-hues';
    for (var j = 0; j < HUES.length; j++) huesRow.appendChild(makeHueSwatch(HUES[j]));
    container.appendChild(huesRow);

    container.__sbPaletteBuilt = true;
  }

  function findColorAnchor() {
    return document.getElementById('colors') ||
      document.querySelector('#player .playbtn') ||
      document.getElementById('player') ||
      document.querySelector('.colorwrapper') ||
      document.querySelector('.modal .playbtn') ||
      document.querySelector('.modal #player') ||
      document.querySelector('.modal .shippreview') ||
      document.querySelector('.modal .gmodes');
  }

  function ensureColorBar() {
    var onLauncher = !!window.__SB_DESKTOP_LAUNCHER_PATCH;
    var onWelcome = !!(document.getElementById('player') || document.querySelector('.modal .gmodes'));
    if (!onLauncher && !onWelcome) return;

    var bar = document.getElementById('sb-ship-color-bar');
    if (!bar) {
      var anchor = findColorAnchor();
      if (!anchor) return;

      bar = document.createElement('div');
      bar.id = 'sb-ship-color-bar';
      bar.setAttribute('data-sb-ship-colors', '4');

      var label = document.createElement('div');
      label.className = 'sb-ship-color-label';
      label.textContent = 'Couleur vaisseau';
      bar.appendChild(label);

      var grid = document.createElement('div');
      grid.className = 'sb-ship-color-grid';
      bar.appendChild(grid);

      if (anchor.id === 'colors') {
        anchor.parentElement.insertBefore(bar, anchor.nextSibling);
      } else if (anchor.parentElement) {
        if (anchor.nextSibling) anchor.parentElement.insertBefore(bar, anchor.nextSibling);
        else anchor.parentElement.appendChild(bar);
      }
      buildPalette(grid);
    } else if (!bar.querySelector('.sb-ship-color-neutrals')) {
      var existingGrid = bar.querySelector('.sb-ship-color-grid');
      if (existingGrid) {
        existingGrid.__sbPaletteBuilt = false;
        buildPalette(existingGrid);
      }
    }

    var colors = document.getElementById('colors');
    if (colors) colors.style.display = 'none';

    hookSetColor(findWelcomeHost());

    var sel = readSelection();
    updateSwatchUI(sel);
    updateAccentUI(sel.hue, sel.neutral);
    refreshShipPreview();
  }

  function injectStyles() {
    if (document.getElementById('sb-ship-colors-style')) return;
    var style = document.createElement('style');
    style.id = 'sb-ship-colors-style';
    style.textContent =
      '#sb-ship-color-bar{margin:6px auto 2px auto;max-width:min(520px,94vw);position:relative;z-index:2}' +
      '#sb-ship-color-bar .sb-ship-color-label{font-size:11px;opacity:.75;margin:0 0 4px 2px;text-align:center;letter-spacing:.03em}' +
      '#sb-ship-color-bar .sb-ship-color-grid{display:flex;flex-direction:column;gap:4px;padding:5px 6px;background:rgba(0,0,0,.45);border:1px solid rgba(120,200,255,.2);border-radius:6px}' +
      '#sb-ship-color-bar .sb-ship-color-row{display:flex;flex-wrap:nowrap;justify-content:center;gap:3px;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;max-width:100%}' +
      '#sb-ship-color-bar .sb-ship-color-neutrals{padding-bottom:3px;border-bottom:1px solid rgba(255,255,255,.12)}' +
      '#sb-ship-color-bar span{flex:0 0 auto;width:18px;height:18px;border:1px solid rgba(0,0,0,.5);cursor:pointer;opacity:.9;border-radius:3px;box-sizing:border-box}' +
      '#sb-ship-color-bar span.sb-neutral-swatch{border-color:rgba(255,255,255,.35)}' +
      '#sb-ship-color-bar span.selected,#colors span.selected{opacity:1;box-shadow:0 0 4px 1px #fff;transform:scale(1.15);z-index:1;position:relative}' +
      '#player #sb-ship-color-bar{margin:8px auto 4px auto}' +
      '.modal #colors{display:none!important}';
    document.documentElement.appendChild(style);
  }

  function hookNeutralShipTint() {
    hookAllHsvConverters();
    installLO1OlTrap();
    hookShipModelBuilder();
    injectCustomFinishOptions();
    hookBadgeFinishPreview();
    hookSetHueTargets();
    hookShipUpdateHue();
  }

  function watch() {
    injectStyles();
    hookNeutralShipTint();
    hookShipExporter();
    hookSetColor(findWelcomeHost());
    ensureColorBar();
    applyLocalNeutralTint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }

  var obs = new MutationObserver(function () {
    watch();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  window.__sbApplyShipNeutralTint = function (scene, camera) {
    hookNeutralShipTint();
    applyLocalNeutralTint(scene, camera);
    var neu = getActiveNeutral();
    if (neu && isWelcomeScreen()) syncWelcomeCanvasFilter(neu);
  };

  window.__sbTintLocalShipInScene = function (scene, camera) {
    window.__sbApplyShipNeutralTint(scene, camera);
  };

  window.__sbBeginShipNeutralFrame = function () {
    if (getActiveNeutral() && !isWelcomeScreen()) window.__sbInGameShipTint = true;
  };

  window.__sbEndShipNeutralFrame = function () {
    window.__sbInGameShipTint = false;
  };

  setInterval(function () {
    hookNeutralShipTint();
    var neu = getActiveNeutral();
    if (!neu) {
      if (isWelcomeScreen()) syncWelcomeCanvasFilter(null);
      return;
    }
    window.__sbApplyShipNeutralTint(null, window.__sbLastCamera || null);
  }, 120);
})();
