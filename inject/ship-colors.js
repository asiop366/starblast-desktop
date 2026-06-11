/**
 * Extra ship hue swatches on the welcome / lobby color picker.
 */
(function () {
  'use strict';

  if (window.__sbDesktopShipColors) return;
  window.__sbDesktopShipColors = true;

  var EXTRA_HUES = [
    3, 6, 9, 15, 18, 21, 27, 33, 39, 45, 51, 57, 63, 69, 75, 81, 87, 93, 99,
    105, 111, 117, 123, 129, 135, 141, 147, 153, 159, 165, 171, 177, 183, 189,
    195, 201, 207, 213, 219, 225, 231, 237, 243, 249, 255, 261, 267, 273, 279,
    285, 291, 297, 303, 309, 315, 321, 327, 333, 339, 345, 351, 357
  ];

  function applyHue(hue) {
    hue = parseInt(hue, 10);
    localStorage.setItem('shipColor', hue);

    var spans = document.querySelectorAll('#colors span[data-hue]');
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

    var colorsBox = document.getElementById('colors');
    if (colorsBox) colorsBox.style.display = 'none';

    window.dispatchEvent(new CustomEvent('sbDesktopShipHue', { detail: hue }));
  }

  function addSwatches() {
    var container = document.getElementById('colors');
    if (!container || container.__sbExtraColors) return;
    if (window.__SB_DESKTOP_LAUNCHER_PATCH) {
      if (container.closest('.modal')) return;
      if (!document.getElementById('home') && !document.getElementById('player')) return;
    }

    var existing = {};
    var spans = container.querySelectorAll('span[data-hue]');
    for (var i = 0; i < spans.length; i++) {
      existing[parseInt(spans[i].getAttribute('data-hue'), 10)] = true;
    }

    var added = 0;
    for (var j = 0; j < EXTRA_HUES.length; j++) {
      var hue = EXTRA_HUES[j];
      if (existing[hue]) continue;

      var span = document.createElement('span');
      span.style.background = 'linear-gradient(135deg,hsl(' + hue + ',70%,60%) 0%,hsl(' + hue + ',70%,40%) 100%)';
      span.setAttribute('data-hue', String(hue));
      span.title = 'Hue ' + hue;
      span.addEventListener('click', function (h) {
        return function () { applyHue(h); };
      }(hue));

      container.appendChild(span);
      added++;
    }

    if (added > 0) {
      container.__sbExtraColors = true;
      if (!window.__SB_DESKTOP_LAUNCHER_PATCH) {
        container.style.maxWidth = '720px';
      }
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
