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
      document.querySelector('.modal td.shippreview') ||
      document.querySelector('td.shippreview') ||
      document.querySelector('.shippreview');
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
      bar.setAttribute('data-sb-ship-colors', '3');

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
    ensureColorBar();
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
