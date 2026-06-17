/* Starblast Desktop visual mods v1.1.20 */
window.__SB_DESKTOP_MODS_VERSION = "1.1.20";
window.__SB_DESKTOP_CLIENT = true;
/**
 * Fullscreen display — window resize patch only (no custom background).
 */
(function () {
  'use strict';

  if (window.__SB_DESKTOP_LAUNCHER_PATCH) return;
  if (window.__sbDesktopDisplayFix) return;
  window.__sbDesktopDisplayFix = true;

  function applyCanvasStyle() {
    if (document.getElementById('sb-desktop-canvas-style')) return;

    var style = document.createElement('style');
    style.id = 'sb-desktop-canvas-style';
    style.textContent =
      'html,body{margin:0!important;padding:0!important;overflow:hidden!important;width:100%!important;height:100%!important;background:#000!important}' +
      '#content,#home,#home_mobile,#overlay{background:transparent!important}' +
      'canvas{position:fixed!important;top:0!important;left:0!important;' +
      'width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;' +
      'display:block!important;touch-action:none}';

    var oldWallpaper = document.getElementById('sb-desktop-wallpaper');
    if (oldWallpaper) oldWallpaper.remove();

    document.documentElement.appendChild(style);
  }

  function patchDisplayResize() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (obj.O10ll && typeof obj.resize === 'function' && !obj.__sbResizePatched) {
        obj.resize = function () {
          this.width = window.innerWidth;
          this.height = window.innerHeight;
          this.rotated = this.width < this.height;
          this.O10ll.setSize(this.width, this.height);
          if (this.screen && this.screen.setSize) {
            this.screen.setSize(this.width, this.height, this.llO0I);
          }
          this.fixed = false;
        };
        obj.__sbResizePatched = true;
        obj.resize();
        return true;
      }

      var keys;
      try {
        keys = Object.keys(obj);
      } catch (e) {
        continue;
      }

      for (var i = 0; i < keys.length && i < 50; i++) {
        var key = keys[i];
        if (key === 'parent' || key === 'window' || key === 'top' || key === 'document') continue;
        try {
          var child = obj[key];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) {
          // ignore
        }
      }
    }

    return false;
  }

  applyCanvasStyle();
  patchDisplayResize();

  window.addEventListener('resize', patchDisplayResize);

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    if (patchDisplayResize() || tries > 160) clearInterval(timer);
  }, 250);
})();

/**
 * Pre-game settings overlay — gem color & desktop mod options.
 */
(function () {
  'use strict';

  if (window.__sbDesktopSettingsUI) return;
  window.__sbDesktopSettingsUI = true;

  if (window.__SB_DESKTOP_LAUNCHER_PATCH) {
    window.__sbDesktopSettings = window.__sbDesktopSettings || {
      gemColor: '#ffffff',
      gemWorldGlow: true,
      gemBarNeon: true,
      shieldColor: '#00ffff',
      shieldBarNeon: true,
      energyColor: '#ff69b4',
      energyBarNeon: true,
      leaderboardNeon: true,
      leaderboardColor: '#ff69b4',
      fovMultiplier: 1.2
    };
    return;
  }

  var STORAGE_KEY = 'sbDesktopSettings';

  var DEFAULTS = {
    gemColor: '#ffffff',
    gemWorldGlow: true,
    gemBarNeon: true,
    shieldColor: '#00ffff',
    shieldBarNeon: true,
    energyColor: '#ff69b4',
    energyBarNeon: true,
    leaderboardNeon: true,
    leaderboardColor: '#ff69b4',
    fovMultiplier: 1.2
  };

  function normalizeSettings(raw) {
    var s = Object.assign({}, DEFAULTS, raw || {});
    if (s.gemBarNeon == null && s.gemGlow != null) s.gemBarNeon = !!s.gemGlow;
    delete s.backgroundImage;
    delete s.backgroundColor;
    delete s.gemGlow;
    return s;
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return normalizeSettings({});
      return normalizeSettings(JSON.parse(raw));
    } catch (e) {
      return normalizeSettings({});
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
    } catch (e) {
      alert('Impossible de sauvegarder les réglages.');
      return false;
    }
    window.__sbDesktopSettings = normalizeSettings(settings);
    window.dispatchEvent(new CustomEvent('sbDesktopSettingsChanged', { detail: window.__sbDesktopSettings }));
    return true;
  }

  window.__sbDesktopSettings = loadSettings();

  try {
    var legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      var parsed = JSON.parse(legacy);
      if (parsed.backgroundColor || parsed.backgroundImage || parsed.gemGlow != null) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(parsed)));
      }
    }
  } catch (e) {
    // ignore
  }

  function chk(id, on) {
    return '<input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '>';
  }

  function colorField(id, label, value) {
    return '<label class="sb-desk-field"><span>' + label + '</span>' +
      '<input type="color" id="' + id + '" value="' + value + '"></label>';
  }

  function checkField(id, label, on) {
    return '<label class="sb-desk-field sb-desk-check">' + chk(id, on) + '<span>' + label + '</span></label>';
  }

  function createOverlay() {
    if (document.getElementById('sb-desktop-settings')) return;

    var settings = loadSettings();

    var root = document.createElement('div');
    root.id = 'sb-desktop-settings';
    root.innerHTML =
      '<div class="sb-desk-backdrop">' +
        '<div class="sb-desk-panel">' +
          '<h2>Starblast Desktop</h2>' +
          '<p class="sb-desk-sub">Réglages visuels avant de jouer</p>' +
          colorField('sb-gem-color', 'Couleur des gemmes', settings.gemColor) +
          checkField('sb-gem-world-glow', 'Glow des gemmes (monde)', settings.gemWorldGlow !== false) +
          checkField('sb-gem-bar-neon', 'Néon barre gemmes', settings.gemBarNeon !== false) +
          colorField('sb-shield-color', 'Couleur barre bouclier', settings.shieldColor) +
          checkField('sb-shield-neon', 'Néon barre bouclier', settings.shieldBarNeon !== false) +
          colorField('sb-energy-color', 'Couleur barre énergie', settings.energyColor) +
          checkField('sb-energy-neon', 'Néon barre énergie', settings.energyBarNeon !== false) +
          checkField('sb-lb-neon', 'Galaxie + néon sur ton pseudo (TAB)', settings.leaderboardNeon !== false) +
          colorField('sb-lb-color', 'Couleur néon pseudo (leaderboard)', settings.leaderboardColor) +
          '<p class="sb-desk-hint">Molette souris en jeu : zoom FOV + / −</p>' +
          '<div class="sb-desk-actions">' +
            '<button type="button" id="sb-desk-apply">Appliquer et jouer</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent =
      '#sb-desktop-settings{position:fixed;inset:0;z-index:2147483646;font-family:Segoe UI,system-ui,sans-serif}' +
      '#sb-desktop-settings .sb-desk-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center}' +
      '#sb-desktop-settings .sb-desk-panel{width:min(420px,92vw);max-height:90vh;overflow:auto;background:#0a0a0a;border:2px solid #00ffff;border-radius:12px;padding:24px;color:#fff;box-shadow:0 0 24px rgba(0,255,255,.35)}' +
      '#sb-desktop-settings h2{margin:0 0 4px;font-size:22px;color:#00ffff;text-shadow:0 0 8px rgba(0,255,255,.8)}' +
      '#sb-desktop-settings .sb-desk-sub{margin:0 0 18px;opacity:.75;font-size:13px}' +
      '#sb-desktop-settings .sb-desk-field{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0;font-size:14px}' +
      '#sb-desktop-settings .sb-desk-check{justify-content:flex-start;flex-wrap:wrap}' +
      '#sb-desktop-settings input[type=color]{width:56px;height:36px;border:1px solid #444;background:#111;cursor:pointer}' +
      '#sb-desktop-settings .sb-desk-hint{margin:8px 0 0;font-size:12px;opacity:.6}' +
      '#sb-desktop-settings .sb-desk-actions{margin-top:20px;display:flex;justify-content:flex-end}' +
      '#sb-desktop-settings #sb-desk-apply{background:linear-gradient(180deg,#00ffff,#00aacc);color:#000;border:none;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer;box-shadow:0 0 12px rgba(0,255,255,.5)}' +
      '#sb-desktop-settings #sb-desk-apply:hover{filter:brightness(1.1)}' +
      '#sb-desktop-gear{position:fixed;bottom:16px;left:16px;z-index:2147483645;width:40px;height:40px;border-radius:50%;border:2px solid #00ffff;background:#111;color:#00ffff;font-size:18px;cursor:pointer;box-shadow:0 0 10px rgba(0,255,255,.4)}';

    document.documentElement.appendChild(style);
    document.documentElement.appendChild(root);

    var gear = document.createElement('button');
    gear.id = 'sb-desktop-gear';
    gear.type = 'button';
    gear.title = 'Réglages Starblast Desktop';
    gear.textContent = '⚙';
    gear.style.display = 'none';
    document.documentElement.appendChild(gear);

    function hidePanel() {
      root.style.display = 'none';
      gear.style.display = 'block';
    }

    function showPanel() {
      root.style.display = 'block';
      var s = loadSettings();
      document.getElementById('sb-gem-color').value = s.gemColor;
      document.getElementById('sb-gem-world-glow').checked = s.gemWorldGlow !== false;
      document.getElementById('sb-gem-bar-neon').checked = s.gemBarNeon !== false;
      document.getElementById('sb-shield-color').value = s.shieldColor;
      document.getElementById('sb-shield-neon').checked = s.shieldBarNeon !== false;
      document.getElementById('sb-energy-color').value = s.energyColor;
      document.getElementById('sb-energy-neon').checked = s.energyBarNeon !== false;
      document.getElementById('sb-lb-neon').checked = s.leaderboardNeon !== false;
      document.getElementById('sb-lb-color').value = s.leaderboardColor;
    }

    document.getElementById('sb-desk-apply').addEventListener('click', function () {
      var ok = saveSettings({
        gemColor: document.getElementById('sb-gem-color').value,
        gemWorldGlow: document.getElementById('sb-gem-world-glow').checked,
        gemBarNeon: document.getElementById('sb-gem-bar-neon').checked,
        shieldColor: document.getElementById('sb-shield-color').value,
        shieldBarNeon: document.getElementById('sb-shield-neon').checked,
        energyColor: document.getElementById('sb-energy-color').value,
        energyBarNeon: document.getElementById('sb-energy-neon').checked,
        leaderboardNeon: document.getElementById('sb-lb-neon').checked,
        leaderboardColor: document.getElementById('sb-lb-color').value,
        fovMultiplier: loadSettings().fovMultiplier || DEFAULTS.fovMultiplier
      });
      if (!ok) return;
      localStorage.setItem('sbDesktopSettingsDismissed', '1');
      hidePanel();
    });

    gear.addEventListener('click', showPanel);

    if (localStorage.getItem('sbDesktopSettingsDismissed') === '1') {
      hidePanel();
    } else {
      showPanel();
    }
  }

  if (document.documentElement) createOverlay();
  else document.addEventListener('DOMContentLoaded', createOverlay);
})();

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

/**
 * Starblast.io visual overrides — performance-safe desktop mod pack.
 */
(function () {
  'use strict';

  if (window.__sbDesktopPatchLoaded) return;
  window.__sbDesktopPatchLoaded = true;

  var STORAGE_KEY = 'sbDesktopSettings';
  var VIEW_MAX_FOV = 95;
  var RADAR_DEZOOM = 2.0;

  var HUD_DISPLAY_SIZE = 13;
  var HUD_SHIELD_INDEX = 14;
  var HUD_GENERATOR_INDEX = 27;
  var HUD_CRYSTAL_INDEX = 40;

  var DEFAULTS = {
    gemColor: '#ffffff',
    gemWorldGlow: true,
    gemBarNeon: true,
    shieldColor: '#00ffff',
    shieldBarNeon: true,
    energyColor: '#ff69b4',
    energyBarNeon: true,
    leaderboardNeon: true,
    leaderboardColor: '#ff33cc',
    fovMultiplier: 1.2
  };

  var galaxyPatternCache = {};

  var COLORS = {
    black: 0x000000,
    white: 0xffffff,
    pink: 0xff69b4,
    cyan: 0x00ffff,
    asteroidBody: 0x000000,
    asteroidEmissive: 0xffffff,
    asteroidSpecular: 0xaaaaaa,
    crystalEmissive: 0xffffff
  };

  var canvasHooksInstalled = false;
  var wheelHookInstalled = false;
  var liveFovMultiplier = null;
  var cachedHudGeom = null;
  var cachedFigures = null;
  var scannedScenes = typeof WeakSet === 'function' ? new WeakSet() : null;
  var hookedGameMode = null;
  var radarBackgrounds = [];
  var radarTextures = [];
  var fieldAsteroidMaterial = null;
  var meteoriteMaterials = [];
  var asteroidMeshes = [];
  var sharedMaterialScanDone = false;
  var scorePanelHooked = false;
  var gemMaterials = [];

  function normalizeSettings(raw) {
    var s = Object.assign({}, DEFAULTS, raw || {});
    if (s.gemBarNeon == null && s.gemGlow != null) s.gemBarNeon = !!s.gemGlow;
    delete s.backgroundImage;
    delete s.backgroundColor;
    delete s.gemGlow;
    return s;
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return normalizeSettings({});
      return normalizeSettings(JSON.parse(raw));
    } catch (e) {
      return normalizeSettings({});
    }
  }

  function readSbParam(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      try {
        var parsed = JSON.parse(raw);
        if (parsed !== null && parsed !== undefined) return parsed;
      } catch (e) {
        return raw;
      }
    } catch (e) {
      // ignore
    }
    return fallback;
  }

  function normalizeColorString(value, fallback) {
    var v = String(value == null ? '' : value).trim();
    if (!v) {
      v = String(fallback || '#ffffff').trim();
      if (v.charAt(0) !== '#') v = '#' + v;
    }
    if (v.charAt(0) !== '#') v = '#' + v.replace(/^#/, '');
    if (v.length === 4) {
      v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    return v.toLowerCase();
  }

  function readLauncherColor(exp, key, fallback) {
    var input = document.getElementById(key);
    if (input && input.type === 'color' && input.value) {
      return normalizeColorString(input.value, fallback);
    }
    if (exp && exp.parameters && exp.parameters[key] && exp.parameters[key].value != null) {
      return normalizeColorString(exp.parameters[key].value, fallback);
    }
    try {
      var checked = exp && exp.check ? exp.check(key) : null;
      if (checked != null && checked !== false) {
        return normalizeColorString(String(checked), fallback);
      }
    } catch (e) {
      // ignore
    }
    var fromStore = readSbParam(key, undefined);
    if (fromStore !== undefined) return normalizeColorString(String(fromStore), fallback);
    return normalizeColorString(fallback, fallback);
  }

  function readLauncherBool(exp, key, fallback) {
    var fromStore = readSbParam(key, undefined);
    if (fromStore !== undefined) return !!fromStore;
    try {
      return !!exp.check(key);
    } catch (e) {
      return fallback;
    }
  }

  function getSettings() {
    if (window.__SB_DESKTOP_LAUNCHER_PATCH && window.module && window.module.exports && window.module.exports.settings) {
      var exp = window.module.exports.settings;
      if (exp.parameters && exp.parameters.sb_gem_glow) {
        var gem = '#ffffff';
        try {
          if (exp.check('gemcolor1')) gem = String(exp.check('gemcolor1'));
          else if (exp.check('gemindeed')) gem = String(exp.check('gemindeed'));
          else if (window.ClientStorage && window.ClientStorage.getGemColor1) gem = String(window.ClientStorage.getGemColor1());
        } catch (e) {
          // ignore
        }
        return normalizeSettings({
          gemColor: gem,
          gemWorldGlow: readLauncherBool(exp, 'sb_gem_world_glow', true),
          gemBarNeon: readLauncherBool(exp, 'sb_gem_glow', true),
          shieldColor: readLauncherColor(exp, 'sb_shield_color', DEFAULTS.shieldColor),
          shieldBarNeon: readLauncherBool(exp, 'sb_shield_neon', true),
          energyColor: readLauncherColor(exp, 'sb_energy_color', DEFAULTS.energyColor),
          energyBarNeon: readLauncherBool(exp, 'sb_energy_neon', true),
          leaderboardNeon: readLauncherBool(exp, 'sb_lb_neon', true),
          leaderboardColor: readLauncherColor(exp, 'sb_lb_color', DEFAULTS.leaderboardColor),
          fovMultiplier: (window.__sbDesktopSettings && window.__sbDesktopSettings.fovMultiplier) || DEFAULTS.fovMultiplier
        });
      }
    }
    var cached = window.__sbDesktopSettings || loadSettings();
    return normalizeSettings(cached);
  }

  function applyColorsFromSettings() {
    var s = getSettings();
    var gemHex = hexToInt(s.gemColor);
    COLORS.white = gemHex;
    COLORS.crystalEmissive = gemHex;
    COLORS.pink = hexToInt(s.energyColor);
    COLORS.cyan = hexToInt(s.shieldColor);
  }

  function getFovMultiplier() {
    if (liveFovMultiplier != null) return liveFovMultiplier;
    return getSettings().fovMultiplier || DEFAULTS.fovMultiplier;
  }

  function hexToInt(hex) {
    var v = String(hex || '#ffffff').replace('#', '');
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    return parseInt(v, 16) || 0xffffff;
  }

  function hexToCss(hex) {
    var h = String(hex || '#ffffff');
    return h.charAt(0) === '#' ? h : '#' + h;
  }

  function lightenHex(hex, amount) {
    var n = hexToInt(hex);
    var r = Math.min(255, ((n >> 16) & 255) + amount);
    var g = Math.min(255, ((n >> 8) & 255) + amount);
    var b = Math.min(255, (n & 255) + amount);
    return '#' + ('000000' + ((r << 16) | (g << 8) | b).toString(16)).slice(-6);
  }

  function darkenHex(hex, amount) {
    var n = hexToInt(hex);
    var r = Math.max(0, ((n >> 16) & 255) - amount);
    var g = Math.max(0, ((n >> 8) & 255) - amount);
    var b = Math.max(0, (n & 255) - amount);
    return '#' + ('000000' + ((r << 16) | (g << 8) | b).toString(16)).slice(-6);
  }

  function getLeaderboardAccent() {
    var input = document.getElementById('sb_lb_color');
    if (input && input.type === 'color' && input.value) {
      return normalizeColorString(input.value, DEFAULTS.leaderboardColor);
    }
    var fromKey = readSbParam('sb_lb_color', undefined);
    if (fromKey !== undefined && fromKey !== null && fromKey !== '') {
      return normalizeColorString(String(fromKey), DEFAULTS.leaderboardColor);
    }
    try {
      var desk = JSON.parse(localStorage.getItem('sbDesktopSettings') || '{}');
      if (desk.leaderboardColor) {
        return normalizeColorString(desk.leaderboardColor, DEFAULTS.leaderboardColor);
      }
    } catch (e) { /* ignore */ }
    if (window.__sbDesktopSettings && window.__sbDesktopSettings.leaderboardColor) {
      return normalizeColorString(window.__sbDesktopSettings.leaderboardColor, DEFAULTS.leaderboardColor);
    }
    var exp = window.module && window.module.exports && window.module.exports.settings;
    return readLauncherColor(exp, 'sb_lb_color', DEFAULTS.leaderboardColor);
  }

  function darkFillFromAccent(accent) {
    var n = hexToInt(accent);
    var r = Math.max(0, Math.floor(((n >> 16) & 255) * 0.06));
    var g = Math.max(0, Math.floor(((n >> 8) & 255) * 0.06));
    var b = Math.max(0, Math.floor((n & 255) * 0.06));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function rgbaFromHex(hex, alpha) {
    var n = hexToInt(hex);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function neonRgbFromHex(hex) {
    var rgb = hexToRgb01(hexToInt(hex));
    return [
      Math.min(1, rgb[0] * 1.55 + 0.55),
      Math.min(1, rgb[1] * 1.55 + 0.55),
      Math.min(1, rgb[2] * 1.55 + 0.55)
    ];
  }

  function neonPulse() {
    var t = Date.now() * 0.001;
    return 0.5 + 0.5 * Math.sin(t * 7.5);
  }

  function neonFlash() {
    var t = Date.now() * 0.001;
    return 0.65 + 0.35 * Math.abs(Math.sin(t * 13));
  }

  function shouldApplyGameplayVisuals() {
    if (!window.__SB_DESKTOP_LAUNCHER_PATCH) return true;
    if (typeof window.__sbDesktopIsInActiveGame === 'function') {
      return window.__sbDesktopIsInActiveGame();
    }
    return true;
  }

  applyColorsFromSettings();
  window.addEventListener('sbDesktopSettingsChanged', function () {
    applyColorsFromSettings();
    galaxyPatternCache = {};
    sharedMaterialScanDone = false;
    scorePanelHooked = false;
    refreshGemMaterials();
    if (cachedFigures) patchFiguresInstance(cachedFigures);
    else if (cachedHudGeom) patchHudGeometry(cachedHudGeom);
  });

  window.addEventListener('storage', function (e) {
    if (!e || !e.key) return;
    if (e.key === 'sb_lb_color' || e.key === 'sbDesktopSettings') {
      galaxyPatternCache = {};
    }
  });

  function isPhong(mat) {
    return mat && mat.type === 'MeshPhongMaterial';
  }

  function isLambert(mat) {
    return mat && mat.type === 'MeshLambertMaterial';
  }

  function isPerspectiveCamera(cam) {
    return cam && cam.type === 'PerspectiveCamera';
  }

  function hexToRgb01(hex) {
    return [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];
  }

  function setHex(color, value) {
    if (color && color.setHex) color.setHex(value);
  }

  function hasVertexColors(mat) {
    return mat.vertexColors === 2 || mat.vertexColors === true;
  }

  function isFieldAsteroidMaterial(mat) {
    if (!isLambert(mat) || !hasVertexColors(mat) || mat.map || mat.emissiveMap) return false;
    return true;
  }

  function isWorldGemMaterial(mat) {
    if (!isPhong(mat) || !mat.transparent) return false;
    if (mat.depthWrite === false) return true;
    var hex = mat.color && mat.color.getHex ? mat.color.getHex() : 0;
    return hex === 0xff0000 || hex === 0xffa000 || hex === 0xff8800 || hex === 0xff4400;
  }

  function isDiamondMaterial(mat) {
    return isPhong(mat) && mat.transparent && mat.bumpMap &&
      mat.side === 2 && mat.opacity <= 0.65;
  }

  function isSnowballAsteroid(mat) {
    return isPhong(mat) && mat.map && mat.emissiveMap && mat.specularMap &&
      mat.color && mat.color.getHex() === 0xffffff;
  }

  function isRockAsteroid(mat) {
    if (!isPhong(mat) || !mat.bumpMap || mat.transparent) return false;
    if (isWorldGemMaterial(mat) || isDiamondMaterial(mat) || isSnowballAsteroid(mat)) return false;
    if (mat.emissiveMap && mat.specularMap) return false;
    if (mat.__sbAsteroidPatched) return true;
    var hex = mat.color && mat.color.getHex ? mat.color.getHex() : 0xffffff;
    return hex === 0x000000 || hex === 0x507800 || hex === 0xa0a0a0 || hex === 0x606060 ||
      hex === 0x805030 || hex === 0xa09070 || hex === 0x808080 ||
      (hex >= 0x404040 && hex <= 0xc0c0c0);
  }

  function isMeteoriteMaterial(mat) {
    return isFieldAsteroidMaterial(mat) || isRockAsteroid(mat) || isSnowballAsteroid(mat);
  }

  function trackMeteoriteMaterial(mat) {
    if (!mat || meteoriteMaterials.indexOf(mat) >= 0) return;
    meteoriteMaterials.push(mat);
  }

  function ensureAsteroidEmissive(mat) {
    if (!mat) return;
    if (!mat.emissive && window.THREE && window.THREE.Color) {
      mat.emissive = new window.THREE.Color(COLORS.asteroidEmissive);
    }
    if (mat.emissive) setHex(mat.emissive, COLORS.asteroidEmissive);
  }

  function patchAsteroidMaterial(mat) {
    if (!mat) return;
    setHex(mat.color, COLORS.asteroidBody);
    if (isFieldAsteroidMaterial(mat)) {
      ensureAsteroidEmissive(mat);
      mat.vertexColors = 2;
    } else {
      ensureAsteroidEmissive(mat);
      if (mat.specular) setHex(mat.specular, COLORS.asteroidSpecular);
      if (mat.shininess != null) mat.shininess = Math.max(mat.shininess, 120);
      if (mat.emissiveIntensity != null) mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 0.85);
    }
    mat.__sbAsteroidPatched = true;
    trackMeteoriteMaterial(mat);
    if (isFieldAsteroidMaterial(mat)) fieldAsteroidMaterial = mat;
  }

  function refreshMeteoriteMaterials() {
    for (var i = 0; i < meteoriteMaterials.length; i++) {
      var mat = meteoriteMaterials[i];
      setHex(mat.color, COLORS.asteroidBody);
      if (mat.emissive) setHex(mat.emissive, COLORS.asteroidEmissive);
    }
    if (fieldAsteroidMaterial) {
      setHex(fieldAsteroidMaterial.color, COLORS.asteroidBody);
      if (fieldAsteroidMaterial.emissive) {
        setHex(fieldAsteroidMaterial.emissive, COLORS.asteroidEmissive);
      }
    }
  }

  function trackGemMaterial(mat) {
    if (!mat || gemMaterials.indexOf(mat) >= 0) return;
    gemMaterials.push(mat);
  }

  function refreshGemMaterials() {
    for (var i = 0; i < gemMaterials.length; i++) {
      gemMaterials[i].__sbGemPatched = false;
      patchGemMaterial(gemMaterials[i]);
    }
  }

  function patchGemMaterial(mat) {
    if (!mat || mat.__sbGemPatched) return;
    trackGemMaterial(mat);
    applyColorsFromSettings();
    var s = getSettings();
    setHex(mat.color, COLORS.white);
    if (mat.specular) setHex(mat.specular, COLORS.white);
    if (s.gemWorldGlow !== false) {
      if (mat.emissive) setHex(mat.emissive, COLORS.crystalEmissive);
      mat.shininess = s.gemBarNeon !== false ? 180 : 130;
      if (mat.emissiveIntensity != null) mat.emissiveIntensity = s.gemBarNeon !== false ? 1.2 : 0.6;
      if (mat.transparent) mat.opacity = Math.max(mat.opacity || 0.7, s.gemBarNeon !== false ? 0.98 : 0.94);
    } else {
      if (mat.emissive) setHex(mat.emissive, 0x111111);
      mat.shininess = 48;
      if (mat.transparent) mat.opacity = Math.min(mat.opacity || 0.7, 0.82);
    }
    mat.__sbGemPatched = true;
  }

  function geometryNeedsAsteroidFaces(geom) {
    if (!geom || !geom.faces || !geom.faces.length) return false;
    var face = geom.faces[0];
    if (!face.vertexColors || !face.vertexColors[0] || !face.vertexColors[0].getHex) return true;
    return face.vertexColors[0].getHex() !== COLORS.asteroidBody;
  }

  function patchFieldAsteroidGeometry(geom) {
    if (!geom || !geom.faces || !geom.faces.length) return;
    if (!geometryNeedsAsteroidFaces(geom)) return;

    for (var i = 0; i < geom.faces.length; i++) {
      var face = geom.faces[i];
      if (!face.vertexColors) continue;
      for (var j = 0; j < face.vertexColors.length; j++) {
        setHex(face.vertexColors[j], COLORS.asteroidBody);
      }
    }
    geom.colorsNeedUpdate = true;
  }

  function findSharedFieldMaterial() {
    if (sharedMaterialScanDone && fieldAsteroidMaterial) return fieldAsteroidMaterial;

    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    var steps = 0;

    while (stack.length && steps < 8000) {
      steps += 1;
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (obj.lIOII && isFieldAsteroidMaterial(obj.lIOII)) {
        fieldAsteroidMaterial = obj.lIOII;
        patchAsteroidMaterial(obj.lIOII);
        sharedMaterialScanDone = true;
        return obj.lIOII;
      }

      var keys;
      try {
        keys = Object.keys(obj);
      } catch (e) {
        continue;
      }

      for (var i = 0; i < keys.length && i < 40; i++) {
        var key = keys[i];
        if (key === 'parent' || key === 'window' || key === 'top' || key === 'document') continue;
        try {
          var child = obj[key];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) {
          // ignore
        }
      }
    }

    sharedMaterialScanDone = true;
    return fieldAsteroidMaterial;
  }

  function patchRadarShaderMaterial(mat) {
    if (!mat || mat.__sbRadarShaderPatched || !mat.vertexShader) return;
    if (mat.vertexShader.indexOf('l0111.xy') < 0) return;

    mat.vertexShader = mat.vertexShader.replace(
      /l0111\.xy \*= ([\d.]+)/,
      function (match, zoom) {
        return 'l0111.xy *= ' + (parseFloat(zoom) / RADAR_DEZOOM);
      }
    );
    mat.__sbRadarShaderPatched = true;
    mat.needsUpdate = true;
  }

  function patchMaterial(mat) {
    if (!mat) return;
    patchRadarShaderMaterial(mat);
    if (isMeteoriteMaterial(mat)) {
      patchAsteroidMaterial(mat);
      return;
    }
    if (!isPhong(mat)) return;
    if (isWorldGemMaterial(mat) || isDiamondMaterial(mat)) {
      patchGemMaterial(mat);
    }
  }

  function isHudGeometry(geom) {
    if (!geom || !geom.attributes) return false;
    var fig = geom.attributes.figure;
    var col = geom.attributes.color;
    var fill = geom.attributes.fill;
    if (!fig || !col || !fill || !fig.array || !col.array) return false;
    return fig.array.length >= 53 && col.array.length === fig.array.length * 3;
  }

  function paintHudBar(colors, figures, start, fillHex, bgHex, iconRgb) {
    var fill = hexToRgb01(fillHex);
    var bg = hexToRgb01(bgHex);
    var end = start + HUD_DISPLAY_SIZE;

    for (var i = start; i < end; i++) {
      var f = figures[i];
      var rgb = f === 16 ? fill : (f === 0 ? bg : (iconRgb || [1, 1, 1]));
      colors[3 * i] = rgb[0];
      colors[3 * i + 1] = rgb[1];
      colors[3 * i + 2] = rgb[2];
    }
  }

  function hudColorBuffer(target) {
    if (!target) return null;
    if (target.attributes && target.attributes.color && target.attributes.color.array) {
      return target.attributes.color.array;
    }
    if (target.color) return target.color;
    return null;
  }

  function hudAttrArray(target, name, fallbackKey) {
    if (!target) return null;
    if (target.attributes && target.attributes[name] && target.attributes[name].array) {
      return target.attributes[name].array;
    }
    if (fallbackKey && target[fallbackKey]) return target[fallbackKey];
    return null;
  }

  function applyHudBarNeon(geom, figures, startIndex, enabled, fillHex) {
    if (!enabled) return;

    var colors = hudColorBuffer(geom);
    if (!colors) return;
    var opac = hudAttrArray(geom, 'opac', 'opac');
    var sizes = hudAttrArray(geom, 'Ol11I', 'Ol11I');
    var verts = hudAttrArray(geom, 'position', 'vertices');
    var pulse = neonPulse();
    var flash = neonFlash();
    var glowRgb = neonRgbFromHex(fillHex);
    var hotRgb = [
      Math.min(1, (glowRgb[0] * 1.65 + 0.45) * flash),
      Math.min(1, (glowRgb[1] * 1.65 + 0.45) * flash),
      Math.min(1, (glowRgb[2] * 1.65 + 0.45) * flash)
    ];
    var coreRgb = [
      Math.min(1, hotRgb[0] * (0.85 + pulse * 0.3)),
      Math.min(1, hotRgb[1] * (0.85 + pulse * 0.3)),
      Math.min(1, hotRgb[2] * (0.85 + pulse * 0.3))
    ];
    var end = startIndex + HUD_DISPLAY_SIZE;

    for (var i = startIndex; i < end; i++) {
      var fig = figures[i];
      if (fig === 16) {
        colors[3 * i] = coreRgb[0];
        colors[3 * i + 1] = coreRgb[1];
        colors[3 * i + 2] = coreRgb[2];
        if (opac) opac[i] = 1;
        if (sizes) sizes[i] = 0.11 + pulse * 0.04;
        if (verts) verts[3 * i + 2] = 0;
      } else if (fig === 0) {
        colors[3 * i] = Math.min(1, glowRgb[0] * (0.75 + pulse * 0.25) + 0.15);
        colors[3 * i + 1] = Math.min(1, glowRgb[1] * (0.75 + pulse * 0.25) + 0.15);
        colors[3 * i + 2] = Math.min(1, glowRgb[2] * (0.75 + pulse * 0.25) + 0.15);
        if (opac) opac[i] = 1;
        if (sizes) sizes[i] = 0.085 + pulse * 0.025;
        if (verts) verts[3 * i + 2] = 0;
      } else if (fig === 11 || fig === 12 || fig === 13) {
        colors[3 * i] = hotRgb[0];
        colors[3 * i + 1] = hotRgb[1];
        colors[3 * i + 2] = hotRgb[2];
        if (sizes) sizes[i] = Math.max(sizes[i] || 0.02, 0.065 + pulse * 0.02);
        if (opac) opac[i] = 1;
      } else if (fig > 0 && fig !== 16) {
        colors[3 * i] = Math.min(1, glowRgb[0] * 1.1 + 0.35);
        colors[3 * i + 1] = Math.min(1, glowRgb[1] * 1.1 + 0.35);
        colors[3 * i + 2] = Math.min(1, glowRgb[2] * 1.1 + 0.35);
        if (sizes) sizes[i] = Math.max(sizes[i] || 0.015, 0.05 + pulse * 0.015);
        if (opac) opac[i] = 1;
      }
    }
  }

  function isScoreboardRowRect(ctx, rw, rh) {
    if (!ctx || !ctx.canvas) return false;
    var cw = ctx.canvas.width;
    var ch = ctx.canvas.height;
    if (rw >= cw * 0.35 && rh >= 5 && rh <= Math.max(48, ch / 2)) return true;
    return rw >= 48 && rh >= 5 && rh <= Math.max(40, ch / 2.5);
  }

  function patchHudGeometry(geom) {
    if (!isHudGeometry(geom)) return;

    var s = getSettings();
    var colors = geom.attributes.color.array;
    var figures = geom.attributes.figure.array;

    paintHudBar(colors, figures, HUD_CRYSTAL_INDEX, COLORS.white, COLORS.black, [1, 1, 1]);
    paintHudBar(colors, figures, HUD_GENERATOR_INDEX, COLORS.pink, COLORS.black);
    paintHudBar(colors, figures, HUD_SHIELD_INDEX, COLORS.cyan, COLORS.black);
    applyHudBarNeon(geom, figures, HUD_CRYSTAL_INDEX, s.gemBarNeon !== false, s.gemColor);
    applyHudBarNeon(geom, figures, HUD_GENERATOR_INDEX, s.energyBarNeon !== false, s.energyColor);
    applyHudBarNeon(geom, figures, HUD_SHIELD_INDEX, s.shieldBarNeon !== false, s.shieldColor);

    geom.attributes.color.needsUpdate = true;
    if (geom.attributes.opac) geom.attributes.opac.needsUpdate = true;
    if (geom.attributes.Ol11I) geom.attributes.Ol11I.needsUpdate = true;
  }

  function hookFiguresInstance(fig) {
    if (!fig || fig.__sbBarHooked) return;

    if (typeof fig.setBarColor === 'function') {
      var originalSetBarColor = fig.setBarColor;
      fig.setBarColor = function (start, r, g, b) {
        var out = originalSetBarColor.apply(this, arguments);
        if (start === this.crystal_index || start === this.generator_index || start === this.shield_index) {
          patchFiguresInstance(this);
        }
        return out;
      };
    }

    if (typeof fig.setBar === 'function') {
      var originalSetBar = fig.setBar;
      fig.setBar = function (start, value, max) {
        var out = originalSetBar.apply(this, arguments);
        if (start === this.crystal_index || start === this.generator_index || start === this.shield_index) {
          patchFiguresInstance(this);
        }
        return out;
      };
    }

    fig.__sbBarHooked = true;
  }

  function patchFiguresInstance(fig) {
    if (!fig || typeof fig.crystal_index !== 'number' || !fig.color || !fig.figure) return;

    var s = getSettings();
    hookFiguresInstance(fig);
    applyColorsFromSettings();
    paintHudBar(fig.color, fig.figure, fig.crystal_index, COLORS.white, COLORS.black, [1, 1, 1]);
    paintHudBar(fig.color, fig.figure, fig.generator_index, COLORS.pink, COLORS.black);
    paintHudBar(fig.color, fig.figure, fig.shield_index, COLORS.cyan, COLORS.black);

    applyHudBarNeon(fig, fig.figure, fig.crystal_index, s.gemBarNeon !== false, s.gemColor);
    applyHudBarNeon(fig, fig.figure, fig.generator_index, s.energyBarNeon !== false, s.energyColor);
    applyHudBarNeon(fig, fig.figure, fig.shield_index, s.shieldBarNeon !== false, s.shieldColor);

    if (fig.geometry && isHudGeometry(fig.geometry)) {
      applyHudBarNeon(fig.geometry, fig.figure, fig.crystal_index, s.gemBarNeon !== false, s.gemColor);
      applyHudBarNeon(fig.geometry, fig.figure, fig.generator_index, s.energyBarNeon !== false, s.energyColor);
      applyHudBarNeon(fig.geometry, fig.figure, fig.shield_index, s.shieldBarNeon !== false, s.shieldColor);
      var colAttr = fig.geometry.getAttribute && fig.geometry.getAttribute('color');
      if (colAttr) colAttr.needsUpdate = true;
      var opAttr = fig.geometry.getAttribute && fig.geometry.getAttribute('opac');
      if (opAttr) opAttr.needsUpdate = true;
      var sizeAttr = fig.geometry.getAttribute && fig.geometry.getAttribute('Ol11I');
      if (sizeAttr) sizeAttr.needsUpdate = true;
      var posAttr = fig.geometry.getAttribute && fig.geometry.getAttribute('position');
      if (posAttr) posAttr.needsUpdate = true;
    }
  }

  function getBaseRadarZoom() {
    if (hookedGameMode && hookedGameMode.__sbBaseRadarZoom != null) {
      return hookedGameMode.__sbBaseRadarZoom;
    }
    return 2;
  }

  function getEffectiveRadarZoom() {
    return getBaseRadarZoom() / RADAR_DEZOOM;
  }

  function hookGameModeRadarZoom() {
    if (hookedGameMode) return hookedGameMode;

    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    var steps = 0;

    while (stack.length && steps < 6000) {
      steps += 1;
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (obj.lI1IO && obj.lI1IO.mode && typeof obj.lI1IO.mode.radar_zoom === 'number') {
        var mode = obj.lI1IO.mode;
        if (!mode.__sbRadarHooked) {
          var storedZoom = mode.radar_zoom || 2;
          mode.__sbBaseRadarZoom = storedZoom;
          try {
            Object.defineProperty(mode, 'radar_zoom', {
              configurable: true,
              enumerable: true,
              get: function () {
                return (mode.__sbBaseRadarZoom || storedZoom) / RADAR_DEZOOM;
              },
              set: function (v) {
                mode.__sbBaseRadarZoom = v;
              }
            });
          } catch (e) {
            mode.radar_zoom = storedZoom / RADAR_DEZOOM;
          }
          mode.__sbRadarHooked = true;
        }
        hookedGameMode = mode;
        return mode;
      }

      var keys;
      try {
        keys = Object.keys(obj);
      } catch (e) {
        continue;
      }

      for (var i = 0; i < keys.length && i < 40; i++) {
        var key = keys[i];
        if (key === 'parent' || key === 'window' || key === 'top' || key === 'document') continue;
        try {
          var child = obj[key];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) {
          // ignore
        }
      }
    }

    return null;
  }

  function rememberRadarBackground(obj) {
    if (!obj || typeof obj.llII0 !== 'function' || !obj.texture || !obj.texture.repeat) return;
    if (radarBackgrounds.indexOf(obj) >= 0) return;
    radarBackgrounds.push(obj);
    if (radarTextures.indexOf(obj.texture) < 0) radarTextures.push(obj.texture);
  }

  function rememberRadarTexture(map) {
    if (!map || !map.repeat || radarTextures.indexOf(map) >= 0) return;
    radarTextures.push(map);
  }

  function refreshRadarPerFrame() {
    hookGameModeRadarZoom();
    var zoom = getEffectiveRadarZoom();
    if (zoom <= 0) return;

    var repeat = 1 / zoom;
    for (var i = 0; i < radarTextures.length; i++) {
      var map = radarTextures[i];
      if (map && map.repeat) map.repeat.set(repeat, repeat);
    }
  }

  function patchCamera(camera) {
    if (!shouldApplyGameplayVisuals()) return;
    if (!isPerspectiveCamera(camera)) return;
    if (camera.fov < 38 || camera.fov > 58) return;

    var target = Math.min(camera.fov * getFovMultiplier(), VIEW_MAX_FOV);
    if (Math.abs(camera.fov - target) > 0.05) {
      camera.fov = target;
      camera.updateProjectionMatrix();
    }
  }

  function rememberHud(obj) {
    if (obj.geometry && isHudGeometry(obj.geometry)) cachedHudGeom = obj.geometry;
    if (typeof obj.crystal_index === 'number') cachedFigures = obj;
  }

  function isAsteroidMesh(obj) {
    if (!obj || !obj.geometry || !obj.material) return false;
    var mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    if (obj.geometry.type === 'IcosahedronGeometry' && isLambert(mat) && hasVertexColors(mat)) return true;
    if (isMeteoriteMaterial(mat)) return true;
    return false;
  }

  function rememberAsteroid(obj) {
    if (!isAsteroidMesh(obj)) return;
    if (asteroidMeshes.indexOf(obj) >= 0) return;
    asteroidMeshes.push(obj);
    var mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    patchAsteroidMaterial(mat);
    patchFieldAsteroidGeometry(obj.geometry);
  }

  function refreshAsteroidMeshes() {
    findSharedFieldMaterial();

    if (fieldAsteroidMaterial) {
      setHex(fieldAsteroidMaterial.color, COLORS.asteroidBody);
      if (fieldAsteroidMaterial.emissive) {
        setHex(fieldAsteroidMaterial.emissive, COLORS.asteroidEmissive);
      }
    }

    for (var i = 0; i < asteroidMeshes.length; i++) {
      var obj = asteroidMeshes[i];
      if (!obj) continue;
      var mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      setHex(mat.color, COLORS.asteroidBody);
      if (mat.emissive) setHex(mat.emissive, COLORS.asteroidEmissive);
      if (obj.geometry) patchFieldAsteroidGeometry(obj.geometry);
    }
  }

  function patchObject(obj) {
    if (!obj) return;
    rememberHud(obj);
    rememberRadarBackground(obj);
    rememberAsteroid(obj);

    if (obj.material && obj.material.map) rememberRadarTexture(obj.material.map);

    var material = obj.material;
    if (!material) return;
    if (Array.isArray(material)) material.forEach(patchMaterial);
    else patchMaterial(material);
  }

  function scanSceneOnce(scene) {
    if (!scene || !scene.traverse) return;
    if (scannedScenes && scannedScenes.has(scene)) return;
    scene.traverse(patchObject);
    if (scannedScenes) scannedScenes.add(scene);
  }

  function patchHudPerFrame() {
    if (cachedFigures) patchFiguresInstance(cachedFigures);
    else if (cachedHudGeom) patchHudGeometry(cachedHudGeom);
  }


  function findWelcomeHost() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }
      if (typeof obj.setColor === 'function' && obj.game_modes) return obj;
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 35; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
    return null;
  }

  function findGameClient() {
    var host = findWelcomeHost();
    if (host && host.lI1IO) return host.lI1IO;

    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }
      if (obj.player_name !== undefined && obj.names && obj.Ol10l) return obj;
      if (obj.lI1IO && obj.lI1IO.Ol10l) return obj.lI1IO;
      if (obj.lI1IO && obj.lI1IO.player_name !== undefined && obj.lI1IO.names) return obj.lI1IO;
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 30; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
    return null;
  }

  function getPlayerName() {
    var client = findGameClient();
    if (client) {
      if (client.player_name && String(client.player_name).trim()) {
        return String(client.player_name).trim();
      }
      if (client.I0OlO && client.I0OlO.custom && client.I0OlO.custom.name) {
        return String(client.I0OlO.custom.name).trim();
      }
      if (client.names && typeof client.names.get === 'function') {
        try {
          var selfId = client.Ol10l;
          if (selfId != null) {
            var n = client.names.get(selfId);
            if (n && String(n).trim()) return String(n).trim();
          }
        } catch (e) { /* ignore */ }
      }
    }

    var inp = document.querySelector('#player input') ||
      document.querySelector('.modal input[type="text"]') ||
      document.querySelector('input[name="player_name"]');
    if (inp && inp.value && inp.value.trim()) return inp.value.trim();

    try {
      var stored = localStorage.getItem('player_name') || localStorage.getItem('playerName');
      if (stored && String(stored).trim()) return String(stored).trim();
    } catch (e) { /* ignore */ }

    if (window.__sbDesktopPlayerName) return String(window.__sbDesktopPlayerName).trim();
    return '';
  }

  function textContainsPlayerName(text) {
    var name = getPlayerName();
    if (!name) return false;
    var str = String(text || '');
    if (!str) return false;
    if (str.indexOf(name) >= 0) return true;
    return namesMatch(extractScoreRowName(str), name);
  }

  function normalizePlayerName(name) {
    return String(name || '').trim().toLowerCase();
  }

  function namesMatch(rowName, playerName) {
    var a = normalizePlayerName(rowName);
    var b = normalizePlayerName(playerName);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return true;
    return a.replace(/\s+/g, '') === b.replace(/\s+/g, '');
  }

  function syncPlayerName() {
    var name = getPlayerName();
    if (name) window.__sbDesktopPlayerName = name;
  }

  function isScoreboardCanvas(ctx) {
    var c = ctx && ctx.canvas;
    if (!c) return false;
    var ratio = c.width / Math.max(1, c.height);
    return c.width >= 120 && c.height >= 60 && ratio >= 0.45 && ratio <= 3.5;
  }

  function extractScoreRowName(text) {
    var str = String(text || '').trim();
    if (!str) return '';
    if (/^\d+[\.\):\-]\s*/.test(str)) {
      str = str.replace(/^\d+[\.\):\-]\s*/, '').trim();
    }
    return str.replace(/^\[[^\]]+\]\s*/, '').trim();
  }

  function isPlayerScoreText(text, ctx) {
    var name = getPlayerName();
    if (!name || name.length < 1) return false;
    var str = String(text).trim();
    if (!str) return false;

    var rowName = extractScoreRowName(str);
    if (rowName && namesMatch(rowName, name)) return true;

    if (ctx && isScoreboardCanvas(ctx)) {
      if (namesMatch(str, name)) return true;
      if (str.indexOf(name) >= 0) return true;
      if (rowName && rowName.indexOf(name) >= 0) return true;
    }

    return false;
  }

  function shouldDrawLeaderboardFx(ctx, text) {
    if (!getSettings().leaderboardNeon) return false;
    if (!ctx || !ctx.fillText) return false;
    syncPlayerName();
    if (textContainsPlayerName(text)) return true;
    if (isPlayerScoreText(text, ctx)) return true;
    if (ctx.__sbScoreboardDraw && textContainsPlayerName(text)) return true;
    if (isScoreboardCanvas(ctx) && textContainsPlayerName(text)) return true;
    return false;
  }

  function galaxySeed(w, h, accentHex) {
    var accent = hexToCss(accentHex || getLeaderboardAccent());
    var key = w + 'x' + h + ':' + accent;
    if (galaxyPatternCache[key]) return galaxyPatternCache[key];

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var g = canvas.getContext('2d');
    var n = hexToInt(accent);

    g.fillStyle = 'rgb(' +
      Math.max(0, Math.floor(((n >> 16) & 255) * 0.07)) + ',' +
      Math.max(0, Math.floor(((n >> 8) & 255) * 0.07)) + ',' +
      Math.max(0, Math.floor((n & 255) * 0.07)) + ')';
    g.fillRect(0, 0, w, h);

    var blobs = [
      { x: 0.12, y: 0.48, r: 0.58, hot: 25, a0: 0.88, a1: 0.40 },
      { x: 0.40, y: 0.42, r: 0.52, hot: 10, a0: 0.76, a1: 0.32 },
      { x: 0.70, y: 0.52, r: 0.48, hot: 18, a0: 0.70, a1: 0.28 },
      { x: 0.28, y: 0.62, r: 0.36, hot: 5, a0: 0.58, a1: 0.22 },
      { x: 0.55, y: 0.58, r: 0.30, hot: 35, a0: 0.48, a1: 0.18 }
    ];

    for (var b = 0; b < blobs.length; b++) {
      var blob = blobs[b];
      var bx = blob.x * w;
      var by = blob.y * h;
      var br = blob.r * w;
      var grad = g.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, rgbaFromHex(lightenHex(accent, blob.hot), blob.a0));
      grad.addColorStop(0.45, rgbaFromHex(accent, blob.a1));
      grad.addColorStop(1, rgbaFromHex(darkenHex(accent, 60), 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }

    var wash = g.createLinearGradient(0, 0, w, 0);
    wash.addColorStop(0, rgbaFromHex(accent, 0.22));
    wash.addColorStop(0.5, rgbaFromHex(accent, 0.10));
    wash.addColorStop(1, rgbaFromHex(accent, 0.22));
    g.fillStyle = wash;
    g.fillRect(0, 0, w, h);

    var starCount = Math.max(55, Math.floor(w * h / 650));
    for (var i = 0; i < starCount; i++) {
      var sx = ((i * 97 + 13) % 1000) / 1000 * w;
      var sy = ((i * 53 + 7) % 1000) / 1000 * h;
      var alpha = 0.35 + ((i * 31) % 65) / 100;
      var radius = 0.35 + ((i * 17) % 18) / 10;
      g.fillStyle = rgbaFromHex(lightenHex(accent, 85), alpha);
      g.beginPath();
      g.arc(sx, sy, radius, 0, Math.PI * 2);
      g.fill();
    }

    galaxyPatternCache[key] = canvas;
    return canvas;
  }

  function drawGalaxyRow(ctx, barTop, barH, origFillRect, accentHex) {
    var w = ctx.canvas.width;
    var h = Math.max(28, Math.ceil(barH));
    var accent = hexToCss(accentHex || getLeaderboardAccent());
    var pattern = galaxySeed(w, h, accent);
    var rowY = Math.max(0, barTop);
    var rowH = Math.max(18, barH);
    var pulse = neonPulse();

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 22 + pulse * 18;
    ctx.drawImage(pattern, 0, 0, w, h, 0, rowY, w, rowH);
    ctx.shadowBlur = 0;

    var edge = ctx.createLinearGradient(0, rowY, w, rowY);
    edge.addColorStop(0, rgbaFromHex(accent, 0.75 + pulse * 0.2));
    edge.addColorStop(0.12, rgbaFromHex(accent, 0.22));
    edge.addColorStop(0.88, rgbaFromHex(accent, 0.22));
    edge.addColorStop(1, rgbaFromHex(accent, 0.75 + pulse * 0.2));
    ctx.fillStyle = edge;
    origFillRect.call(ctx, 0, rowY, w, rowH);

    ctx.strokeStyle = rgbaFromHex(lightenHex(accent, 40), 0.65 + pulse * 0.25);
    ctx.lineWidth = 1.5;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12 + pulse * 10;
    ctx.strokeRect(0.5, rowY + 0.5, w - 1, rowH - 1);
    ctx.restore();
  }

  function drawLeaderboardNeonName(ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText) {
    if (!getSettings().leaderboardNeon) {
      return origFillText.call(ctx, text, x, y, maxWidth);
    }

    var canvasH = ctx.canvas && ctx.canvas.height ? ctx.canvas.height : 440;
    var rowH = canvasH / 11;
    var h = Math.max(16, rowH * 0.85);
    var pulse = neonPulse();
    var flash = neonFlash();
    var neon = getLeaderboardAccent();
    var neonCore = lightenHex(neon, 55);
    var neonHot = lightenHex(neon, 35);
    var neonBloom = lightenHex(neon, 85);
    var neonFlashColor = lightenHex(neon, 95);
    var darkFill = darkFillFromAccent(neon);
    var barTop;
    var barH;
    if (ctx.__sbPlayerRowRect) {
      barTop = ctx.__sbPlayerRowRect.y;
      barH = ctx.__sbPlayerRowRect.h;
    } else {
      barTop = y - rowH * 0.48;
      barH = rowH * 0.96;
    }

    var prev = {
      fill: ctx.fillStyle,
      stroke: ctx.strokeStyle,
      lineWidth: ctx.lineWidth,
      shadowBlur: ctx.shadowBlur,
      shadowColor: ctx.shadowColor,
      globalAlpha: ctx.globalAlpha,
      textAlign: ctx.textAlign,
      textBaseline: ctx.textBaseline
    };

    drawGalaxyRow(ctx, barTop, barH, origFillRect, neon);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.miterLimit = 2;
    ctx.textAlign = prev.textAlign || 'left';
    ctx.textBaseline = prev.textBaseline || 'middle';

    // Couche 1 — halo externe (flash LED)
    ctx.lineWidth = Math.max(12, h * 0.48) * (0.85 + pulse * 0.3);
    ctx.strokeStyle = rgbaFromHex(neon, 0.42 + pulse * 0.28);
    ctx.shadowColor = neon;
    ctx.shadowBlur = 72 + pulse * 48;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    // Couche 2 — glow moyen
    ctx.lineWidth = Math.max(8, h * 0.32) * flash;
    ctx.strokeStyle = rgbaFromHex(neonHot, 0.88);
    ctx.shadowColor = neonHot;
    ctx.shadowBlur = 48 + pulse * 28;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    // Couche 3 — contour vif
    ctx.lineWidth = Math.max(5, h * 0.18);
    ctx.strokeStyle = neonCore;
    ctx.shadowColor = neonBloom;
    ctx.shadowBlur = 28 + pulse * 16;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    // Couche 4 — trait blanc flash
    ctx.lineWidth = Math.max(2.2, h * 0.08);
    ctx.strokeStyle = neonFlashColor;
    ctx.shadowBlur = 14 + flash * 12;
    ctx.shadowColor = '#ffffff';
    origStrokeText.call(ctx, text, x, y, maxWidth);

    // Remplissage visible dans la couleur choisie (pas seulement le halo)
    ctx.shadowBlur = 12 + pulse * 8;
    ctx.shadowColor = neon;
    ctx.fillStyle = neonHot;
    var result = origFillText.call(ctx, text, x, y, maxWidth);
    ctx.shadowBlur = 6;
    ctx.fillStyle = neonCore;
    origFillText.call(ctx, text, x, y, maxWidth);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = neon;
    origFillText.call(ctx, text, x, y, maxWidth);

    ctx.fillStyle = prev.fill;
    ctx.strokeStyle = prev.stroke;
    ctx.lineWidth = prev.lineWidth;
    ctx.shadowBlur = prev.shadowBlur;
    ctx.shadowColor = prev.shadowColor;
    ctx.globalAlpha = prev.globalAlpha;
    ctx.textAlign = prev.textAlign;
    ctx.textBaseline = prev.textBaseline;
    return result;
  }

  function wrapScorePanelDraw(panel) {
    if (!panel || panel.__sbLbInstHooked || typeof panel.ll1OO !== 'function') return;

    var originalDraw = panel.ll1OO;
    panel.ll1OO = function (ctx) {
      if (!getSettings().leaderboardNeon || !ctx || !ctx.fillText) {
        return originalDraw.call(this, ctx);
      }

      var origFillText = ctx.fillText;
      var origFillRect = ctx.fillRect;
      var origStrokeText = ctx.strokeText;

      ctx.fillText = function (text, x, y, maxWidth) {
        if (shouldDrawLeaderboardFx(ctx, text)) {
          return drawLeaderboardNeonName(
            ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
          );
        }
        return origFillText.apply(ctx, arguments);
      };

      ctx.fillRect = function (rx, ry, rw, rh) {
        if (getSettings().leaderboardNeon && isScoreboardRowRect(ctx, rw, rh)) {
          ctx.__sbPlayerRowRect = { x: rx, y: ry, w: rw, h: rh };
        }
        return origFillRect.apply(ctx, arguments);
      };

      try {
        ctx.__sbScoreboardDraw = true;
        return originalDraw.call(this, ctx);
      } finally {
        ctx.fillText = origFillText;
        ctx.fillRect = origFillRect;
        ctx.__sbScoreboardDraw = false;
        ctx.__sbPlayerRowRect = null;
      }
    };
    panel.__sbLbInstHooked = true;
    scorePanelHooked = true;
  }

  function hookScorePanelPrototype() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (typeof obj === 'function' && obj.prototype &&
          typeof obj.prototype.ll1OO === 'function' &&
          typeof obj.prototype.updateScore === 'function' &&
          !obj.prototype.__sbLbProtoHooked) {
        var src = obj.prototype.ll1OO.toString();
        if (src.indexOf('getUint8(1)') >= 0 && (src.indexOf('player_name') >= 0 || src.indexOf('names.get') >= 0)) {
          var originalDraw = obj.prototype.ll1OO;
          obj.prototype.ll1OO = function (ctx) {
            if (!getSettings().leaderboardNeon || !ctx || !ctx.fillText) {
              return originalDraw.call(this, ctx);
            }

            var origFillText = ctx.fillText;
            var origFillRect = ctx.fillRect;
            var origStrokeText = ctx.strokeText;

            ctx.fillText = function (text, x, y, maxWidth) {
              if (shouldDrawLeaderboardFx(ctx, text)) {
                return drawLeaderboardNeonName(
                  ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
                );
              }
              return origFillText.apply(ctx, arguments);
            };

            ctx.fillRect = function (rx, ry, rw, rh) {
              if (getSettings().leaderboardNeon && isScoreboardRowRect(ctx, rw, rh)) {
                ctx.__sbPlayerRowRect = { x: rx, y: ry, w: rw, h: rh };
              }
              return origFillRect.apply(ctx, arguments);
            };

            try {
              ctx.__sbScoreboardDraw = true;
              return originalDraw.call(this, ctx);
            } finally {
              ctx.fillText = origFillText;
              ctx.fillRect = origFillRect;
              ctx.__sbScoreboardDraw = false;
              ctx.__sbPlayerRowRect = null;
            }
          };
          obj.prototype.__sbLbProtoHooked = true;
          window.__sbScoreProtoHooked = true;
          scorePanelHooked = true;
        }
      }

      if (typeof obj === 'function' && obj.prototype) stack.push(obj.prototype);
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 35; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
          if (typeof child === 'function') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
  }

  function hookScoreboardFromClient() {
    var client = findGameClient();
    if (!client || !client.display || !client.display.screen) return;

    var stack = [client.display.screen];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (typeof obj.ll1OO === 'function' && obj.view && obj.lI1IO) {
        wrapScorePanelDraw(obj);
      }

      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 40; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
  }

  function hookFiguresPrototype() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (typeof obj === 'function' && obj.prototype &&
          typeof obj.prototype.setBar === 'function' &&
          typeof obj.prototype.setBarColor === 'function' &&
          typeof obj.prototype.initBar === 'function' &&
          !obj.prototype.__sbFiguresProtoHooked) {
        var proto = obj.prototype;
        var origSetBar = proto.setBar;
        proto.setBar = function (start, value, max) {
          var out = origSetBar.apply(this, arguments);
          if (start === this.crystal_index || start === this.generator_index || start === this.shield_index) {
            patchFiguresInstance(this);
          }
          return out;
        };
        var origSetBarColor = proto.setBarColor;
        proto.setBarColor = function (start, r, g, b) {
          var out = origSetBarColor.apply(this, arguments);
          if (start === this.crystal_index || start === this.generator_index || start === this.shield_index) {
            patchFiguresInstance(this);
          }
          return out;
        };
        proto.__sbFiguresProtoHooked = true;
      }

      if (typeof obj === 'function' && obj.prototype) stack.push(obj.prototype);
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 35; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
          if (typeof child === 'function') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
  }

  function hookScorePanelDraw() {
    hookScoreboardFromClient();
    hookScorePanelPrototype();
    hookFiguresPrototype();
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }

      if (obj && typeof obj === 'object' &&
          obj.lI1IO && typeof obj.updateScore === 'function' &&
          typeof obj.ll1OO === 'function' && typeof obj.updateHue === 'function') {
        wrapScorePanelDraw(obj);
      }

      if (typeof obj === 'function' && obj.prototype &&
          typeof obj.prototype.updateHue === 'function' &&
          typeof obj.prototype.updateScore === 'function' &&
          typeof obj.prototype.ll1OO === 'function' &&
          !obj.prototype.__sbLbHooked) {

        var proto = obj.prototype;
        var originalDraw = proto.ll1OO;
        proto.ll1OO = function (ctx) {
          if (!getSettings().leaderboardNeon || !ctx || !ctx.fillText) {
            return originalDraw.call(this, ctx);
          }

          var origFillText = ctx.fillText;
          var origFillRect = ctx.fillRect;
          var origStrokeText = ctx.strokeText;

          ctx.fillText = function (text, x, y, maxWidth) {
            if (shouldDrawLeaderboardFx(ctx, text)) {
              return drawLeaderboardNeonName(
                ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
              );
            }
            return origFillText.apply(ctx, arguments);
          };

          ctx.fillRect = function (rx, ry, rw, rh) {
            if (getSettings().leaderboardNeon && isScoreboardRowRect(ctx, rw, rh)) {
              ctx.__sbPlayerRowRect = { x: rx, y: ry, w: rw, h: rh };
            }
            return origFillRect.apply(ctx, arguments);
          };

          try {
            ctx.__sbScoreboardDraw = true;
            return originalDraw.call(this, ctx);
          } finally {
            ctx.fillText = origFillText;
            ctx.fillRect = origFillRect;
            ctx.__sbScoreboardDraw = false;
            ctx.__sbPlayerRowRect = null;
          }
        };
        proto.__sbLbHooked = true;
        scorePanelHooked = true;
      }

      if (typeof obj === 'function' && obj.prototype) stack.push(obj.prototype);
      var keys;
      try { keys = Object.keys(obj); } catch (e) { continue; }
      for (var i = 0; i < keys.length && i < 35; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
          if (typeof child === 'function') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
  }

  function installCanvasHooks() {
    if (canvasHooksInstalled) return;
    canvasHooksInstalled = true;

    var origFillText = CanvasRenderingContext2D.prototype.fillText;
    var origFillRect = CanvasRenderingContext2D.prototype.fillRect;
    var origStrokeText = CanvasRenderingContext2D.prototype.strokeText;

    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (shouldDrawLeaderboardFx(this, text)) {
        return drawLeaderboardNeonName(
          this, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
        );
      }
      return origFillText.apply(this, arguments);
    };

    CanvasRenderingContext2D.prototype.fillRect = function (rx, ry, rw, rh) {
      if (getSettings().leaderboardNeon && isScoreboardRowRect(this, rw, rh) &&
          (this.__sbScoreboardDraw || isScoreboardCanvas(this))) {
        this.__sbPlayerRowRect = { x: rx, y: ry, w: rw, h: rh };
      }
      return origFillRect.apply(this, arguments);
    };

    CanvasRenderingContext2D.prototype.strokeText = function (text, x, y, maxWidth) {
      if (shouldDrawLeaderboardFx(this, text)) {
        return drawLeaderboardNeonName(
          this, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
        );
      }
      return origStrokeText.apply(this, arguments);
    };
  }

  function installWheelFov() {
    if (wheelHookInstalled) return;
    wheelHookInstalled = true;
    liveFovMultiplier = getSettings().fovMultiplier || DEFAULTS.fovMultiplier;

    window.addEventListener('wheel', function (e) {
      if (!shouldApplyGameplayVisuals()) return;
      if (e.ctrlKey || e.metaKey) return;
      var delta = (e.deltaY || 0) > 0 ? -0.05 : 0.05;
      liveFovMultiplier = Math.max(0.85, Math.min(2.0, getFovMultiplier() + delta));
      var s = getSettings();
      s.fovMultiplier = liveFovMultiplier;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      window.__sbDesktopSettings = s;
      e.preventDefault();
    }, { passive: false, capture: true });
  }

  function applyRendererClearColor(renderer) {
    if (!renderer || !renderer.setClearColor) return;
    renderer.setClearColor(0x000000, 1);
  }

  function patchRendererInstance(renderer) {
    if (!renderer || typeof renderer.render !== 'function' || renderer.render.__sbWrapped) return;

    applyRendererClearColor(renderer);

    var originalRender = renderer.render;
    renderer.render = function (scene, camera) {
      hookScorePanelDraw();
      scanSceneOnce(scene);
      patchCamera(camera);
      refreshRadarPerFrame();
      patchHudPerFrame();
      refreshMeteoriteMaterials();
      refreshAsteroidMeshes();
      window.__sbLastCamera = camera;
      if (typeof window.__sbBeginShipNeutralFrame === 'function') {
        window.__sbBeginShipNeutralFrame();
      }
      if (typeof window.__sbTintLocalShipInScene === 'function') {
        window.__sbTintLocalShipInScene(scene, camera);
      }
      var result = originalRender.call(this, scene, camera);
      if (typeof window.__sbEndShipNeutralFrame === 'function') {
        window.__sbEndShipNeutralFrame();
      }
      refreshRadarPerFrame();
      patchHudPerFrame();
      return result;
    };
    renderer.render.__sbWrapped = true;
  }

  function wrapShaderMaterial(THREE) {
    var Original = THREE.ShaderMaterial;
    if (!Original || Original.__sbWrapped) return;

    function WrappedShader(params) {
      params = params || {};
      if (params.vertexShader && params.vertexShader.indexOf('l0111.xy') >= 0) {
        params.vertexShader = params.vertexShader.replace(
          /l0111\.xy \*= ([\d.]+)/,
          function (match, zoom) {
            var effective = parseFloat(zoom) / RADAR_DEZOOM;
            return 'l0111.xy *= ' + effective;
          }
        );
      }
      return new Original(params);
    }

    WrappedShader.prototype = Original.prototype;
    WrappedShader.__sbWrapped = true;
    THREE.ShaderMaterial = WrappedShader;
  }

  function wrapMaterialCtor(THREE, name) {
    var Original = THREE[name];
    if (!Original || Original.__sbWrapped) return;

    function Wrapped(params) {
      var mat = new Original(params || {});
      patchMaterial(mat);
      return mat;
    }

    Wrapped.prototype = Original.prototype;
    Wrapped.__sbWrapped = true;
    THREE[name] = Wrapped;
  }

  function wrapObject3DAdd(THREE) {
    if (!THREE.Object3D || THREE.Object3D.prototype.__sbAddWrapped) return;

    var originalAdd = THREE.Object3D.prototype.add;
    THREE.Object3D.prototype.add = function () {
      var obj = originalAdd.apply(this, arguments);
      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i]) {
          patchObject(arguments[i]);
          if (arguments[i].traverse) arguments[i].traverse(patchObject);
        }
      }
      return obj;
    };
    THREE.Object3D.prototype.__sbAddWrapped = true;
  }

  function wrapRendererCtor(THREE) {
    var Original = THREE.WebGLRenderer;
    if (!Original || Original.__sbWrapped) return;

    function WrappedRenderer(params) {
      Original.apply(this, arguments);
      applyRendererClearColor(this);
      patchRendererInstance(this);
    }

    WrappedRenderer.prototype = Original.prototype;
    WrappedRenderer.__sbWrapped = true;
    THREE.WebGLRenderer = WrappedRenderer;
  }

  function threeReady(THREE) {
    return THREE && THREE.WebGLRenderer && THREE.MeshPhongMaterial && THREE.MeshLambertMaterial;
  }

  function installHooks(THREE) {
    if (!threeReady(THREE) || THREE.__sbDesktopHooked) return false;

    try {
      wrapMaterialCtor(THREE, 'MeshPhongMaterial');
      wrapMaterialCtor(THREE, 'MeshLambertMaterial');
      wrapShaderMaterial(THREE);
      wrapObject3DAdd(THREE);
      wrapRendererCtor(THREE);
      installCanvasHooks();
      installWheelFov();
      THREE.__sbDesktopHooked = true;
      return true;
    } catch (err) {
      return false;
    }
  }

  function bootstrap() {
    if (window.THREE) installHooks(window.THREE);
  }

  var storedThree = window.THREE;
  try {
    Object.defineProperty(window, 'THREE', {
      configurable: true,
      enumerable: true,
      get: function () { return storedThree; },
      set: function (v) {
        storedThree = v;
        setTimeout(bootstrap, 0);
      }
    });
  } catch (e) {
    // ignore
  }

  bootstrap();
  installCanvasHooks();
  installWheelFov();

  setInterval(function () {
    syncPlayerName();
    hookScorePanelDraw();
  }, 1000);

  document.addEventListener('input', function (e) {
    if (e.target && e.target.closest && e.target.closest('#player')) syncPlayerName();
  }, true);

  try {
    var nameInput = document.querySelector('#player input');
    if (nameInput) {
      nameInput.addEventListener('input', syncPlayerName);
      nameInput.addEventListener('change', syncPlayerName);
      syncPlayerName();
    }
  } catch (e) { /* ignore */ }

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    bootstrap();
    hookScorePanelDraw();
    if ((window.THREE && window.THREE.__sbDesktopHooked) || tries > 200) {
      clearInterval(timer);
    }
  }, 50);

  window.blockAdBlock = { on: function () {}, off: function () {}, setOption: function () {} };
})();
