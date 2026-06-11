/**
 * Extra ship hue swatches on the welcome / lobby color picker.
 */
(function () {
  'use strict';

  if (window.__sbDesktopShipColors) return;
  window.__sbDesktopShipColors = true;

  var EXTRA_HUES = [];
  for (var h = 0; h < 360; h += 2) EXTRA_HUES.push(h);

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

  function applyHue(hue) {
    hue = parseInt(hue, 10);
    if (isNaN(hue)) return;

    var host = findWelcomeHost();
    if (host) {
      host.setColor(hue);
      return;
    }

    localStorage.setItem('shipColor', String(hue));

    var spans = document.querySelectorAll('#colors span[data-hue], #sb-ship-color-bar span[data-hue]');
    for (var i = 0; i < spans.length; i++) {
      var el = spans[i];
      if (parseInt(el.getAttribute('data-hue'), 10) === hue) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    }

    var chosen = document.querySelector('.colorchosen');
    if (chosen) {
      chosen.style.background = 'linear-gradient(135deg,hsl(' + hue + ',70%,60%) 0%,hsl(' + hue + ',70%,40%) 100%)';
    }

    var input = document.querySelector('#player input');
    if (input) {
      input.style.color = 'hsla(' + hue + ',100%,90%,.9)';
      input.style.textShadow = '0 0 7px hsla(' + hue + ',80%,80%,1)';
    }

    window.dispatchEvent(new CustomEvent('sbDesktopShipHue', { detail: hue }));
  }

  function makeSwatch(hue) {
    var span = document.createElement('span');
    span.style.background = 'linear-gradient(135deg,hsl(' + hue + ',70%,60%) 0%,hsl(' + hue + ',70%,40%) 100%)';
    span.setAttribute('data-hue', String(hue));
    span.title = 'Hue ' + hue;
    span.addEventListener('click', function (h) {
      return function () { applyHue(h); };
    }(hue));
    return span;
  }

  function fillContainer(container) {
    if (!container || container.__sbExtraColors) return 0;

    var existing = {};
    var spans = container.querySelectorAll('span[data-hue]');
    for (var i = 0; i < spans.length; i++) {
      existing[parseInt(spans[i].getAttribute('data-hue'), 10)] = true;
    }

    var added = 0;
    for (var j = 0; j < EXTRA_HUES.length; j++) {
      var hue = EXTRA_HUES[j];
      if (existing[hue]) continue;
      container.appendChild(makeSwatch(hue));
      added++;
    }

    if (added > 0) container.__sbExtraColors = true;
    return added;
  }

  function ensureModalColorBar() {
    if (document.getElementById('sb-ship-color-bar')) return;

    var anchor = document.querySelector('.modal .shippreview') ||
      document.querySelector('.modal td.shippreview') ||
      document.querySelector('.modal .gmodes');

    if (!anchor) return;

    var bar = document.createElement('div');
    bar.id = 'sb-ship-color-bar';
    bar.setAttribute('data-sb-ship-colors', '1');

    var label = document.createElement('div');
    label.className = 'sb-ship-color-label';
    label.textContent = 'Couleurs vaisseau';
    bar.appendChild(label);

    var grid = document.createElement('div');
    grid.className = 'sb-ship-color-grid';
    bar.appendChild(grid);

    var parent = anchor.closest('td') || anchor.parentElement;
    if (parent && parent.parentElement) {
      var row = document.createElement('tr');
      var cell = document.createElement('td');
      cell.colSpan = 2;
      cell.appendChild(bar);
      row.appendChild(cell);
      parent.parentElement.insertBefore(row, parent.nextSibling);
    } else {
      anchor.parentElement.insertBefore(bar, anchor.nextSibling);
    }

    fillContainer(grid);

    var saved = parseInt(localStorage.getItem('shipColor') || '0', 10);
    if (!isNaN(saved)) applyHue(saved);
  }

  function injectStyles() {
    if (document.getElementById('sb-ship-colors-style')) return;
    var style = document.createElement('style');
    style.id = 'sb-ship-colors-style';
    style.textContent =
      '#sb-ship-color-bar{margin:8px auto 4px auto;max-width:min(680px,96vw)}' +
      '#sb-ship-color-bar .sb-ship-color-label{font-size:12px;opacity:.85;margin:0 0 6px 2px;text-align:center}' +
      '#sb-ship-color-bar .sb-ship-color-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:3px;max-height:120px;overflow-y:auto;padding:4px;background:rgba(0,0,0,.35);border:1px solid rgba(120,200,255,.25);border-radius:6px}' +
      '#sb-ship-color-bar span{width:22px;height:22px;border:1px solid rgba(0,0,0,.45);cursor:pointer;opacity:.88;border-radius:3px}' +
      '#sb-ship-color-bar span.selected,#colors span.selected{opacity:1;box-shadow:0 0 5px 2px #fff;transform:scale(1.12)}' +
      '.modal #colors{display:flex!important;flex-wrap:wrap;justify-content:center;gap:4px;max-width:min(680px,96vw)!important;margin:8px auto!important;padding:6px;background:rgba(0,0,0,.35);border-radius:6px}' +
      '#colors span{width:24px;height:24px}';
    document.documentElement.appendChild(style);
  }

  function addSwatches() {
    injectStyles();

    var container = document.getElementById('colors');
    if (container) {
      fillContainer(container);
      if (window.__SB_DESKTOP_LAUNCHER_PATCH && document.querySelector('.modal .gmodes')) {
        container.style.display = 'flex';
      }
    }

    if (window.__SB_DESKTOP_LAUNCHER_PATCH || document.querySelector('.modal .gmodes')) {
      ensureModalColorBar();
    }
  }

  function watch() {
    addSwatches();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }

  var obs = new MutationObserver(watch);
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
