/* Starblast Desktop visual mods v1.1.5 */
window.__SB_DESKTOP_MODS_VERSION = "1.1.5";
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
    { id: 'black', label: 'Noir', bg: '#141414', filter: 'grayscale(1) brightness(0.32) contrast(1.15)', hue: 0 },
    { id: 'dgray', label: 'Gris fonce', bg: '#3a3a3a', filter: 'grayscale(1) brightness(0.5)', hue: 0 },
    { id: 'gray', label: 'Gris', bg: '#7a7a7a', filter: 'grayscale(1) brightness(0.72)', hue: 0 },
    { id: 'lgray', label: 'Gris clair', bg: '#b8b8b8', filter: 'grayscale(1) brightness(0.92)', hue: 0 },
    { id: 'white', label: 'Blanc', bg: '#f2f2f2', filter: 'grayscale(1) brightness(1.35) contrast(0.88)', hue: 48 }
  ];

  var HUES = [];
  for (var h = 0; h < 360; h += 12) HUES.push(h);

  var NEUTRAL_BY_ID = {};
  for (var n = 0; n < NEUTRALS.length; n++) NEUTRAL_BY_ID[NEUTRALS[n].id] = NEUTRALS[n];

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
      for (var i = 0; i < keys.length && i < 40; i++) {
        try {
          var child = obj[keys[i]];
          if (child && typeof child === 'object') stack.push(child);
        } catch (e) { /* ignore */ }
      }
    }
    return null;
  }

  function getCustomParts(host) {
    var finish = 'zinc';
    var laser = 0;
    if (host && host.lI1IO && host.lI1IO.I0OlO && host.lI1IO.I0OlO.custom) {
      finish = host.lI1IO.I0OlO.custom.finish;
      laser = host.lI1IO.I0OlO.custom.laser;
    }
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

  function refreshShipPreview() {
    var preview = document.querySelector('.modal .shippreview') ||
      document.querySelector('.modal td.shippreview');
    if (!preview || typeof window.lO1Ol === 'undefined' || !window.lO1Ol.exportThumbnail) return;

    var sel = readSelection();
    var parts = getCustomParts(findWelcomeHost());
    preview.innerHTML = '';
    var thumb = window.lO1Ol.exportThumbnail(101, sel.hue, parts.finish, parts.laser, 192);
    preview.appendChild(thumb);

    if (sel.neutral) {
      var neu = NEUTRAL_BY_ID[sel.neutral];
      if (neu) {
        var nodes = preview.querySelectorAll('canvas, img');
        for (var i = 0; i < nodes.length; i++) nodes[i].style.filter = neu.filter;
      }
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
    if (!host || typeof host.setColor !== 'function') return;

    var native = document.querySelector('#colors span[data-hue="' + hue + '"]');
    if (native) {
      host.setColor(hue);
      return;
    }

    localStorage.setItem('shipColor', String(hue));
    var spans = document.querySelectorAll('#colors span[data-hue]');
    for (var i = 0; i < spans.length; i++) {
      spans[i].classList.remove('selected');
    }
  }

  function applySelection(hue, neutralId) {
    hue = parseInt(hue, 10);
    if (isNaN(hue)) hue = 0;

    if (neutralId && NEUTRAL_BY_ID[neutralId]) {
      localStorage.setItem('sb_ship_neutral', neutralId);
      localStorage.setItem('shipColor', String(NEUTRAL_BY_ID[neutralId].hue));
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

  function ensureModalColorBar() {
    if (!window.__SB_DESKTOP_LAUNCHER_PATCH && !document.querySelector('.modal .gmodes')) return;

    var colors = document.getElementById('colors');
    if (colors) colors.style.display = 'none';

    var bar = document.getElementById('sb-ship-color-bar');
    if (!bar) {
      var anchor = document.querySelector('.modal .playbtn') ||
        document.querySelector('.modal #player') ||
        document.querySelector('.modal .shippreview') ||
        document.querySelector('.modal .gmodes');

      if (!anchor) return;

      bar = document.createElement('div');
      bar.id = 'sb-ship-color-bar';
      bar.setAttribute('data-sb-ship-colors', '2');

      var label = document.createElement('div');
      label.className = 'sb-ship-color-label';
      label.textContent = 'Couleur vaisseau';
      bar.appendChild(label);

      var grid = document.createElement('div');
      grid.className = 'sb-ship-color-grid';
      bar.appendChild(grid);

      var parent = anchor.parentElement;
      if (parent) {
        if (anchor.nextSibling) parent.insertBefore(bar, anchor.nextSibling);
        else parent.appendChild(bar);
      }
      buildPalette(grid);
    } else if (!bar.querySelector('.sb-ship-color-neutrals')) {
      var existingGrid = bar.querySelector('.sb-ship-color-grid');
      if (existingGrid) {
        existingGrid.__sbPaletteBuilt = false;
        buildPalette(existingGrid);
      }
    }

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
      '.modal #colors{display:none!important}';
    document.documentElement.appendChild(style);
  }

  function hookNeutralShipTint() {
    if (window.__sbShipNeutralHook || typeof window.ll0O1 === 'undefined' || !window.ll0O1.hsvToRgbHex) return;
    window.__sbShipNeutralHook = true;
    var orig = window.ll0O1.hsvToRgbHex.bind(window.ll0O1);
    window.ll0O1.hsvToRgbHex = function (h, s, l) {
      var id = localStorage.getItem('sb_ship_neutral');
      var neu = id && NEUTRAL_BY_ID[id];
      if (neu) {
        if (id === 'black') return orig(0, 0, 0.12);
        if (id === 'dgray') return orig(0, 0, 0.28);
        if (id === 'gray') return orig(0, 0, 0.48);
        if (id === 'lgray') return orig(0, 0, 0.68);
        if (id === 'white') return orig(0, 0, 0.92);
      }
      return orig(h, s, l);
    };
  }

  function watch() {
    injectStyles();
    hookNeutralShipTint();
    ensureModalColorBar();
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
    leaderboardColor: '#ff69b4',
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

  function readLauncherColor(exp, key, fallback) {
    try {
      var v = exp.check(key);
      if (v) return String(v);
    } catch (e) {
      // ignore
    }
    return fallback;
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
          gemWorldGlow: !!exp.check('sb_gem_world_glow'),
          gemBarNeon: !!exp.check('sb_gem_glow'),
          shieldColor: readLauncherColor(exp, 'sb_shield_color', DEFAULTS.shieldColor),
          shieldBarNeon: !!exp.check('sb_shield_neon'),
          energyColor: readLauncherColor(exp, 'sb_energy_color', DEFAULTS.energyColor),
          energyBarNeon: !!exp.check('sb_energy_neon'),
          leaderboardNeon: !!exp.check('sb_lb_neon'),
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

  function rgbaFromHex(hex, alpha) {
    var n = hexToInt(hex);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function neonRgbFromHex(hex) {
    var rgb = hexToRgb01(hexToInt(hex));
    return [
      Math.min(1, rgb[0] + 0.28),
      Math.min(1, rgb[1] + 0.28),
      Math.min(1, rgb[2] + 0.28)
    ];
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
    sharedMaterialScanDone = false;
    scorePanelHooked = false;
    refreshGemMaterials();
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
      mat.shininess = 130;
      if (mat.transparent) mat.opacity = Math.max(mat.opacity || 0.7, 0.94);
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

  function applyHudBarNeon(geom, figures, startIndex, enabled, fillHex) {
    if (!enabled) return;

    var colors = geom.attributes.color.array;
    var opac = geom.attributes.opac && geom.attributes.opac.array;
    var sizes = geom.attributes.Ol11I && geom.attributes.Ol11I.array;
    var glowRgb = neonRgbFromHex(fillHex);
    var end = startIndex + HUD_DISPLAY_SIZE;

    for (var i = startIndex; i < end; i++) {
      var fig = figures[i];
      if (fig === 16) {
        colors[3 * i] = glowRgb[0];
        colors[3 * i + 1] = glowRgb[1];
        colors[3 * i + 2] = glowRgb[2];
        if (opac) opac[i] = 1;
        if (sizes) sizes[i] = 0.026;
      } else if (fig === 0) {
        colors[3 * i] = 0;
        colors[3 * i + 1] = 0;
        colors[3 * i + 2] = 0;
      } else if (fig === 11) {
        colors[3 * i] = 1;
        colors[3 * i + 1] = 1;
        colors[3 * i + 2] = 1;
      }
    }
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
    if (!fig || fig.__sbBarHooked || typeof fig.setBarColor !== 'function') return;

    var originalSetBarColor = fig.setBarColor;
    fig.setBarColor = function (start, r, g, b) {
      var out = originalSetBarColor.apply(this, arguments);
      if (start === this.crystal_index || start === this.generator_index || start === this.shield_index) {
        patchFiguresInstance(this);
      }
      return out;
    };
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

    if (fig.geometry && isHudGeometry(fig.geometry)) {
      applyHudBarNeon(fig.geometry, fig.figure, fig.crystal_index, s.gemBarNeon !== false, s.gemColor);
      applyHudBarNeon(fig.geometry, fig.figure, fig.generator_index, s.energyBarNeon !== false, s.energyColor);
      applyHudBarNeon(fig.geometry, fig.figure, fig.shield_index, s.shieldBarNeon !== false, s.shieldColor);
      var colAttr = fig.geometry.getAttribute && fig.geometry.getAttribute('color');
      if (colAttr) colAttr.needsUpdate = true;
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


  function findGameClient() {
    var stack = [window];
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    while (stack.length) {
      var obj = stack.pop();
      if (!obj || typeof obj !== 'object') continue;
      if (seen) {
        if (seen.has(obj)) continue;
        seen.add(obj);
      }
      if (obj.lI1IO && obj.lI1IO.player_name) return obj.lI1IO;
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
    var inp = document.querySelector('#player input');
    if (inp && inp.value) return inp.value.trim();
    var client = findGameClient();
    if (client && client.player_name) return String(client.player_name).trim();
    return window.__sbDesktopPlayerName || '';
  }

  function syncPlayerName() {
    var name = getPlayerName();
    if (name) window.__sbDesktopPlayerName = name;
  }

  function isScoreboardCanvas(ctx) {
    var c = ctx && ctx.canvas;
    if (!c) return false;
    var ratio = c.width / Math.max(1, c.height);
    return c.width >= 180 && c.height >= 80 && ratio >= 0.65 && ratio <= 2.5;
  }

  function isPlayerScoreText(text) {
    var name = getPlayerName();
    if (!name || name.length < 1) return false;
    var str = String(text).trim();
    if (str.indexOf(name) < 0) return false;
    return /^\d+\.\s+/.test(str);
  }

  function galaxySeed(w, h) {
    var key = w + 'x' + h;
    if (galaxyPatternCache[key]) return galaxyPatternCache[key];

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var g = canvas.getContext('2d');

    g.fillStyle = '#080012';
    g.fillRect(0, 0, w, h);

    var blobs = [
      { x: 0.18 * w, y: 0.52 * h, r: 0.42 * w, inner: 'rgba(220,30,160,0.7)', outer: 'rgba(40,0,60,0)' },
      { x: 0.52 * w, y: 0.48 * h, r: 0.48 * w, inner: 'rgba(120,20,200,0.65)', outer: 'rgba(20,0,40,0)' },
      { x: 0.82 * w, y: 0.5 * h, r: 0.36 * w, inner: 'rgba(255,60,180,0.45)', outer: 'rgba(30,0,50,0)' },
      { x: 0.35 * w, y: 0.62 * h, r: 0.28 * w, inner: 'rgba(90,0,140,0.5)', outer: 'rgba(0,0,0,0)' }
    ];

    for (var b = 0; b < blobs.length; b++) {
      var blob = blobs[b];
      var grad = g.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
      grad.addColorStop(0, blob.inner);
      grad.addColorStop(0.55, 'rgba(80,0,120,0.25)');
      grad.addColorStop(1, blob.outer);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }

    var starCount = Math.max(40, Math.floor(w * h / 900));
    for (var i = 0; i < starCount; i++) {
      var sx = ((i * 97 + 13) % 1000) / 1000 * w;
      var sy = ((i * 53 + 7) % 1000) / 1000 * h;
      var alpha = 0.25 + ((i * 31) % 70) / 100;
      var radius = 0.4 + ((i * 17) % 15) / 10;
      g.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      g.beginPath();
      g.arc(sx, sy, radius, 0, Math.PI * 2);
      g.fill();
    }

    galaxyPatternCache[key] = canvas;
    return canvas;
  }

  function drawGalaxyRow(ctx, barTop, barH, origFillRect, accentHex) {
    var w = ctx.canvas.width;
    var h = Math.max(24, Math.ceil(barH));
    var pattern = galaxySeed(w, h);
    var accent = hexToCss(accentHex || DEFAULTS.leaderboardColor);

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(pattern, 0, 0, w, h, 0, barTop + 2, w, barH - 4);

    var edge = ctx.createLinearGradient(0, barTop, w, barTop);
    edge.addColorStop(0, rgbaFromHex(accent, 0.35));
    edge.addColorStop(0.5, rgbaFromHex(accent, 0.2));
    edge.addColorStop(1, rgbaFromHex(accent, 0.35));
    ctx.fillStyle = edge;
    origFillRect.call(ctx, 0, barTop + 2, w, barH - 4);
    ctx.restore();
  }

  function drawLeaderboardNeonName(ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText) {
    var s = getSettings();
    var canvasH = ctx.canvas && ctx.canvas.height ? ctx.canvas.height : 440;
    var rowH = canvasH / 11;
    var h = Math.max(16, rowH * 0.85);
    var neon = hexToCss(s.leaderboardColor || DEFAULTS.leaderboardColor);
    var neonHot = lightenHex(neon, 20);
    var neonSoft = lightenHex(neon, 80);
    var darkFill = '#0c0018';
    var barTop = y - rowH * 0.48;
    var barH = rowH * 0.96;

    var prev = {
      fill: ctx.fillStyle,
      stroke: ctx.strokeStyle,
      lineWidth: ctx.lineWidth,
      shadowBlur: ctx.shadowBlur,
      shadowColor: ctx.shadowColor,
      globalAlpha: ctx.globalAlpha,
      textAlign: ctx.textAlign
    };

    drawGalaxyRow(ctx, barTop, barH, origFillRect, neon);

    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.textAlign = prev.textAlign || 'left';

    ctx.lineWidth = Math.max(4.5, h * 0.16);
    ctx.strokeStyle = neonHot;
    ctx.shadowColor = neon;
    ctx.shadowBlur = 22;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    ctx.lineWidth = Math.max(2.2, h * 0.09);
    ctx.strokeStyle = neonSoft;
    ctx.shadowBlur = 12;
    origStrokeText.call(ctx, text, x, y, maxWidth);

    ctx.shadowBlur = 0;
    ctx.fillStyle = darkFill;
    var result = origFillText.call(ctx, text, x, y, maxWidth);

    ctx.fillStyle = prev.fill;
    ctx.strokeStyle = prev.stroke;
    ctx.lineWidth = prev.lineWidth;
    ctx.shadowBlur = prev.shadowBlur;
    ctx.shadowColor = prev.shadowColor;
    ctx.globalAlpha = prev.globalAlpha;
    ctx.textAlign = prev.textAlign;
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
        syncPlayerName();
        if (isPlayerScoreText(text)) {
          return drawLeaderboardNeonName(
            ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
          );
        }
        return origFillText.apply(ctx, arguments);
      };

      try {
        return originalDraw.call(this, ctx);
      } finally {
        ctx.fillText = origFillText;
      }
    };
    panel.__sbLbInstHooked = true;
    scorePanelHooked = true;
  }

  function hookScorePanelDraw() {
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
            syncPlayerName();
            if (isPlayerScoreText(text)) {
              return drawLeaderboardNeonName(
                ctx, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
              );
            }
            return origFillText.apply(ctx, arguments);
          };

          try {
            return originalDraw.call(this, ctx);
          } finally {
            ctx.fillText = origFillText;
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
      if (getSettings().leaderboardNeon && isScoreboardCanvas(this) && isPlayerScoreText(text)) {
        syncPlayerName();
        return drawLeaderboardNeonName(
          this, text, x, y, maxWidth, origFillText, origFillRect, origStrokeText
        );
      }
      return origFillText.apply(this, arguments);
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
      var result = originalRender.call(this, scene, camera);
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
